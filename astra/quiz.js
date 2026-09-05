// Shared source banks remain read-only. No locally authored fallback questions.
export function shuffled(values, random = Math.random) {
  const result = [...values];
  for (let end = result.length - 1; end > 0; end--) {
    const index = Math.floor(random() * (end + 1));
    [result[end], result[index]] = [result[index], result[end]];
  }
  return result;
}
export const storage = {
  get(name, fallback) {
    try { const value = localStorage.getItem(`astra_${name}`); return value === null ? fallback : JSON.parse(value); }
    catch { return fallback; }
  },
  set(name, value) {
    try { localStorage.setItem(`astra_${name}`, JSON.stringify(value)); return true; }
    catch { return false; }
  },
};
export class QuizBank {
  constructor() {
    this.sets = { masld: [], obesity: [] };
    this.mix = [0, 30, 50, 70, 100].includes(storage.get('mix', 70)) ? storage.get('mix', 70) : 70;
    this.drug = storage.get('drug', false) === true;
    const history = storage.get('recent', []);
    this.recent = Array.isArray(history) ? history.filter(id => typeof id === 'string').slice(-24) : [];
    this.schedule = [];
    this.used = new Set();
    this.ready = false;
    this.version = 0;
  }
  async load(language) {
    const request = ++this.version;
    this.ready = false;
    const entries = await Promise.all(['masld', 'obesity'].map(async set => {
      const file = set === 'masld' ? 'aasld' : 'obesity';
      const response = await fetch(`../assets/quiz_${file}_${language}.json`);
      if (!response.ok) throw new Error(`Quiz HTTP ${response.status}`);
      const rows = await response.json();
      if (!Array.isArray(rows)) throw new Error('Invalid quiz bank');
      const valid = rows.map((row, index) => ({ ...row, set, id: `${set}:${index}` })).filter(row =>
        typeof row.q === 'string' && Array.isArray(row.a) && row.a.length === 4 && row.a.every(a => typeof a === 'string') &&
        Number.isInteger(row.correct) && row.correct >= 0 && row.correct < 4 && ['easy', 'mid', 'hard'].includes(row.diff));
      if (!valid.length) throw new Error('Empty quiz bank');
      return [set, valid];
    }));
    if (request !== this.version) return false;
    this.sets = Object.fromEntries(entries);
    this.ready = true;
    this.reset();
    return true;
  }
  configure(mix, drug) {
    this.mix = [0, 30, 50, 70, 100].includes(Number(mix)) ? Number(mix) : 70;
    this.drug = drug === true;
    const savedMix = storage.set('mix', this.mix);
    const savedDrug = storage.set('drug', this.drug);
    this.reset();
    return savedMix && savedDrug;
  }
  reset() { this.used.clear(); this.schedule = []; }
  visible(set) { return this.sets[set].filter(row => this.drug || row.drug !== true); }
  draw(difficulty) {
    if (!this.ready) throw new Error('Quiz bank is not ready');
    // Exact ratios over every ten draws, including single-set 0/100 configurations.
    if (!this.schedule.length) this.schedule = shuffled(Array.from({ length: 10 }, (_, i) => i < this.mix / 10 ? 'masld' : 'obesity'));
    const set = this.schedule.pop();
    const all = this.visible(set);
    if (!all.length) throw new Error('Selected quiz bank has no eligible questions');
    let candidates = all.filter(row => !this.recent.includes(row.id) && !this.used.has(row.id));
    if (!candidates.length) candidates = all.filter(row => !this.used.has(row.id));
    if (!candidates.length) {
      all.forEach(row => this.used.delete(row.id));
      // Prefer the least recently asked question when a small pool is exhausted.
      const oldest = Math.min(...all.map(row => this.recent.indexOf(row.id)));
      candidates = all.filter(row => this.recent.indexOf(row.id) === oldest);
    }
    const matching = candidates.filter(row => row.diff === difficulty);
    const question = shuffled(matching.length ? matching : candidates)[0];
    this.used.add(question.id);
    this.recent = [...this.recent.filter(id => id !== question.id), question.id].slice(-24);
    storage.set('recent', this.recent);
    return question;
  }
}
