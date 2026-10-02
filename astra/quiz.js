// ICDM2026: 당뇨-Empa only 문제은행(quiz_dm_empa) 하나만 출제한다. 문제은행 파일은 읽기만 한다.
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
    try { const value = localStorage.getItem(`icdm_${name}`); return value === null ? fallback : JSON.parse(value); }
    catch { return fallback; }
  },
  set(name, value) {
    try { localStorage.setItem(`icdm_${name}`, JSON.stringify(value)); return true; }
    catch { return false; }
  },
};
export class QuizBank {
  constructor() {
    this.sets = { empa: [] };
    const history = storage.get('recent', []);
    this.recent = Array.isArray(history) ? history.filter(id => typeof id === 'string').slice(-24) : [];
    this.used = new Set();
    this.ready = false;
    this.version = 0;
  }
  async load(language) {
    const request = ++this.version;
    this.ready = false;
    const response = await fetch(`../assets/quiz_dm_empa_${language}.json`);
    if (!response.ok) throw new Error(`Quiz HTTP ${response.status}`);
    const rows = await response.json();
    if (!Array.isArray(rows)) throw new Error('Invalid quiz bank');
    const valid = rows.map((row, index) => ({ ...row, set: 'empa', id: `empa:${index}` })).filter(row =>
      typeof row.q === 'string' && Array.isArray(row.a) && row.a.length === 4 && row.a.every(a => typeof a === 'string') &&
      Number.isInteger(row.correct) && row.correct >= 0 && row.correct < 4 && ['easy', 'mid', 'hard'].includes(row.diff));
    if (!valid.length) throw new Error('Empty quiz bank');
    if (request !== this.version) return false;
    this.sets = { empa: valid };
    this.ready = true;
    this.reset();
    return true;
  }
  reset() { this.used.clear(); }
  draw(difficulty) {
    if (!this.ready) throw new Error('Quiz bank is not ready');
    const all = this.sets.empa;
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
