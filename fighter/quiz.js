// 문제은행은 갈아끼울 수 있다. 주소에 ?bank=파일이름(언어 접미사 제외)을 주면 ../assets/<이름>_<언어>.json을 읽는다.
// 한 문항 형식: { q, a: [보기 4개], correct: 정답 번호(0~3), exp?: 해설 }
const shuffled = values => { const out = [...values]; for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; } return out; };

export class QuizBank {
  constructor() { this.rows = []; this.pile = []; }
  async load(name, language) {
    const response = await fetch(`../assets/${name}_${language}.json`);
    if (!response.ok) throw new Error(`Quiz HTTP ${response.status}`);
    const rows = await response.json();
    this.rows = rows.filter(row => typeof row.q === 'string' && Array.isArray(row.a) && row.a.length === 4 && Number.isInteger(row.correct));
    if (!this.rows.length) throw new Error('Empty quiz bank');
  }
  // 같은 문제가 다 돌기 전에는 다시 나오지 않는다. 보기 순서는 매번 섞는다.
  draw() {
    if (!this.pile.length) this.pile = shuffled(this.rows);
    const row = this.pile.pop(), order = shuffled([0, 1, 2, 3]);
    return { q: row.q, choices: order.map(index => row.a[index]), correct: order.indexOf(row.correct), exp: row.exp || '' };
  }
}
