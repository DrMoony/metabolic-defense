// 메타볼릭 점프 — 대사건강 사이드스크롤 플랫포머 (슈퍼마리오 컨셉)
// 같은 레포의 ../assets 퀴즈 문제은행을 공유한다. 캔버스 2D, 빌드 없음.

const $ = (id) => document.getElementById(id);
const canvas = $('game');
const ctx = canvas.getContext('2d');

const TILE = 36;
const VIEW_W = canvas.width;    // 960
const VIEW_H = canvas.height;   // 540
const ROWS = VIEW_H / TILE;     // 15
const GROUND_TOP = 12;          // 지면은 12~14행

// ---------- 16:9 레터박스 (부스 TV 기준, 다른 게임과 동일한 규칙) ----------
function layout() {
  const st = $('stage');
  const w = window.innerWidth, h = window.innerHeight;
  const r = 16 / 9;
  let sw = w, sh = w / r;
  if (sh > h) { sh = h; sw = h * r; }
  st.style.width = sw + 'px';
  st.style.height = sh + 'px';
  st.style.left = ((w - sw) / 2) + 'px';
  st.style.top = ((h - sh) / 2) + 'px';
}
window.addEventListener('resize', layout);
layout();

// ---------- 오디오 ----------
let AC = null;
function audio() { if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)(); return AC; }
function beep(freq, dur = 0.08, type = 'square', gain = 0.05, slide = 0) {
  try {
    const c = audio(), o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, c.currentTime);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), c.currentTime + dur);
    g.gain.setValueAtTime(gain, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.connect(g).connect(c.destination); o.start(); o.stop(c.currentTime + dur + 0.02);
  } catch (e) { /* 무시 */ }
}
const sfx = {
  jump: () => beep(420, 0.1, 'square', 0.05, 260),
  stomp: () => { beep(300, 0.06, 'square', 0.06, -140); setTimeout(() => beep(560, 0.07, 'triangle', 0.05), 40); },
  coin: () => { beep(980, 0.05, 'triangle', 0.05); setTimeout(() => beep(1320, 0.09, 'triangle', 0.05), 45); },
  block: () => beep(200, 0.07, 'square', 0.05, -60),
  power: () => { [660, 880, 1180].forEach((f, i) => setTimeout(() => beep(f, 0.1, 'triangle', 0.06), i * 80)); },
  hurt: () => beep(160, 0.3, 'sawtooth', 0.07, -90),
  die: () => { [520, 400, 300, 180].forEach((f, i) => setTimeout(() => beep(f, 0.18, 'square', 0.07), i * 110)); },
  ok: () => { [660, 880].forEach((f, i) => setTimeout(() => beep(f, 0.14, 'sine', 0.07), i * 90)); },
  no: () => beep(170, 0.26, 'sawtooth', 0.06, -70),
  clear: () => { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, 0.16, 'triangle', 0.07), i * 130)); },
};

// ---------- 상태 ----------
const G = {
  state: 'TITLE',          // TITLE | GUIDE | PLAY | QUIZ | DEAD | RESULT
  lang: 'ko',
  diff: 'mid',
  stage: 0,
  lives: 3,
  coins: 0,
  score: 0,
  quizTotal: 0,
  quizCorrect: 0,
  timeLeft: 0,
  currentQuiz: null,
  quizSel: -1,
  quizT: 0,
  quizAnswered: false,
  quizBlock: null,
  quizDeck: [],
};

const DIFF = {
  easy: { time: 260, enemySpd: 0.75, lives: 5, quizSec: 22 },
  mid:  { time: 220, enemySpd: 1.0,  lives: 3, quizSec: 17 },
  hard: { time: 175, enemySpd: 1.25, lives: 2, quizSec: 13 },
};
function DT() { return DIFF[G.diff] || DIFF.mid; }

// ---------- 다국어 ----------
const STR = {
  ko: {
    sub: '간을 구하러 가는 대사건강 어드벤처',
    lang: '언어', diff: '난이도', press: '아무 키나 누르거나 화면을 터치하세요',
    press2: '시작하려면 누르세요', press3: '다시 하려면 누르세요',
    guideTitle: '플레이 방법', life: '생명', coin: '브로콜리', quiz: '퀴즈', stage: '스테이지',
    submit: '제출', quizHead: '❓ 퀴즈 블록',
    stageStart: (n) => `${n}  시작!`,
    got1up: '🥦 브로콜리 파워! 한 대는 버텨요',
    gotWater: '💧 수분 충전! 잠깐 무적이에요',
    gotShoe: '👟 운동화! 더 빠르고 높게',
    quizOk: (c) => `정답! 브로콜리 +${c} · 파워업 등장`,
    quizNo: (a) => `아쉬워요. 정답은 "${a}"`,
    hurt: '앗! 대사가 흔들려요',
    clearStage: '스테이지 클리어!',
    gameover: 'GAME OVER',
    allclear: 'ALL CLEAR!',
    timeup: '시간 초과!',
    resCoin: '브로콜리', resQuiz: '퀴즈 정답률', resScore: '점수', resStage: '도달 스테이지',
    bossHit: '플라크가 흔들려요!',
    bossDown: '플라크 왕 격파! 간이 숨을 쉬어요',
    goal: '깃발 도착!',
  },
  en: {
    sub: 'A metabolic-health adventure to save the liver',
    lang: 'LANGUAGE', diff: 'DIFFICULTY', press: 'Press any key or tap to start',
    press2: 'Press to begin', press3: 'Press to play again',
    guideTitle: 'HOW TO PLAY', life: 'LIVES', coin: 'BROCCOLI', quiz: 'QUIZ', stage: 'STAGE',
    submit: 'SUBMIT', quizHead: '❓ QUIZ BLOCK',
    stageStart: (n) => `${n}  START!`,
    got1up: '🥦 Broccoli Power! You can take one hit',
    gotWater: '💧 Hydrated! Briefly invincible',
    gotShoe: '👟 Running shoes! Faster and higher',
    quizOk: (c) => `Correct! Broccoli +${c} · power-up appears`,
    quizNo: (a) => `Not quite. The answer is "${a}"`,
    hurt: 'Ouch! Your metabolism wobbles',
    clearStage: 'STAGE CLEAR!',
    gameover: 'GAME OVER',
    allclear: 'ALL CLEAR!',
    timeup: 'TIME UP!',
    resCoin: 'Broccoli', resQuiz: 'Quiz accuracy', resScore: 'Score', resStage: 'Reached stage',
    bossHit: 'The plaque shudders!',
    bossDown: 'Plaque King down! The liver breathes again',
    goal: 'Flag reached!',
  },
};
function T(k, ...a) { const v = (STR[G.lang] || STR.ko)[k]; return typeof v === 'function' ? v(...a) : v; }

const GUIDE = {
  ko: [
    ['⬅➡', '이동', '방향키 또는 A/D · 화면 버튼도 됩니다'],
    ['⬆', '점프', '스페이스·↑·W · 길게 누르면 더 높이'],
    ['🍔', '밟아서 처치', '정크푸드 머리를 밟으면 처치돼요. 옆으로 닿으면 다쳐요'],
    ['❓', '퀴즈 블록', '아래에서 치면 문제가 나와요. 맞히면 파워업이 튀어나와요'],
    ['🥦', '브로콜리', '모으면 점수 · 파워업을 먹으면 한 대는 버텨요'],
    ['💧', '수분', '잠깐 무적이 돼요'],
    ['👟', '운동화', '이동과 점프가 좋아져요'],
    ['🚩', '목표', '깃발까지 달려서 간을 구해주세요'],
  ],
  en: [
    ['⬅➡', 'Move', 'Arrow keys or A/D · on-screen buttons work too'],
    ['⬆', 'Jump', 'Space / ↑ / W · hold longer to jump higher'],
    ['🍔', 'Stomp', 'Land on junk food to defeat it. Side contact hurts you'],
    ['❓', 'Quiz block', 'Hit it from below for a question. Answer right for a power-up'],
    ['🥦', 'Broccoli', 'Collect for points · the power-up lets you take one hit'],
    ['💧', 'Water', 'Brief invincibility'],
    ['👟', 'Shoes', 'Better speed and jump'],
    ['🚩', 'Goal', 'Reach the flag and save the liver'],
  ],
};

// ---------- 퀴즈 문제은행 (다른 게임과 공유 · 특정 약물 문항은 기본 숨김) ----------
const QUIZ_POOL = [];
const QUIZ_SETS = { masld: [], obesity: [] };
function drugOn() { return localStorage.getItem('mj_quizdrug') === '1'; }
function readMix() {
  const v = parseInt(localStorage.getItem('mj_quizmix') ?? '70', 10);
  return Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 70;
}
function shuffled(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function rebuildPool() {
  const vis = (l) => (drugOn() ? l : l.filter((q) => !q.drug));
  const m = vis(QUIZ_SETS.masld), o = vis(QUIZ_SETS.obesity);
  const mix = readMix();
  QUIZ_POOL.length = 0;
  if (!m.length && !o.length) return;
  if (!o.length || mix >= 100) QUIZ_POOL.push(...m);
  else if (!m.length || mix <= 0) QUIZ_POOL.push(...o);
  else {
    const tot = m.length + o.length;
    QUIZ_POOL.push(...shuffled(m).slice(0, Math.max(1, Math.round(tot * mix / 100))));
    QUIZ_POOL.push(...shuffled(o).slice(0, Math.max(1, Math.round(tot * (1 - mix / 100)))));
  }
  G.quizDeck = shuffled(QUIZ_POOL);
}
function loadQuiz(lang) {
  const files = { masld: 'quiz_aasld', obesity: 'quiz_obesity' };
  Promise.all(Object.entries(files).map(([k, f]) =>
    fetch(`../assets/${f}_${lang}.json`).then((r) => r.json())
      .then((qs) => {
        QUIZ_SETS[k] = qs.filter((q) => q.q && Array.isArray(q.a) && q.a.length === 4)
          .map((q) => ({ q: q.q, a: q.a, correct: q.correct || 0, diff: q.diff || 'mid', drug: !!q.drug }));
      }).catch(() => { QUIZ_SETS[k] = []; })
  )).then(rebuildPool);
}
function loadRecentQ() { try { return JSON.parse(localStorage.getItem('mj_recentq') || '[]'); } catch (e) { return []; } }
function pushRecentQ(q) {
  const r = loadRecentQ(); r.push(q);
  while (r.length > 20) r.shift();
  try { localStorage.setItem('mj_recentq', JSON.stringify(r)); } catch (e) { /* 무시 */ }
}
function drawQuizQ() {
  if (!G.quizDeck.length) G.quizDeck = shuffled(QUIZ_POOL);
  const W = { easy: { easy: 5, mid: 2, hard: 0.4 }, mid: { easy: 1.6, mid: 5, hard: 1.6 }, hard: { easy: 0.4, mid: 2, hard: 5 } }[G.diff]
    || { easy: 1.6, mid: 5, hard: 1.6 };
  const recent = loadRecentQ();
  const all = G.quizDeck.map((q, i) => ({ i, w: W[q.diff] || 1, fresh: !recent.includes(q.q) }));
  const fresh = all.filter((c) => c.fresh);
  const pool = fresh.length ? fresh : all;
  if (pool.length) {
    const total = pool.reduce((a, c) => a + c.w, 0);
    let r = Math.random() * total, pick = pool[pool.length - 1].i;
    for (const c of pool) { r -= c.w; if (r <= 0) { pick = c.i; break; } }
    const q = G.quizDeck.splice(pick, 1)[0];
    pushRecentQ(q.q);
    return q;
  }
  return { q: 'MASLD의 예후를 가장 크게 좌우하는 요소는 무엇일까요?', a: ['간 섬유화의 정도', '간 지방의 양', '키', '혈액형'], correct: 0 };
}

// ---------- 레벨 데이터 ----------
// 지면은 12~14행에 깔리고 gaps 구간만 비운다. plats=[x,y,w] 공중 발판, blocks={x,y,t}
// t: 'Q' 퀴즈블록 · 'C' 코인블록 · 'B' 벽돌 · 'H' 단단한 블록
const LEVELS = [
  {
    id: '1-1', name: { ko: '위장 들판', en: 'Stomach Meadow' },
    sky: ['#f7b7c9', '#f2d6a0'], far: '#e08fa8', near: '#c96f8e', groundTop: '#8fd66a', groundBody: '#a9682f',
    len: 190, goal: 182,
    gaps: [[36, 40], [68, 72], [110, 114], [146, 149]],
    plats: [[20, 9, 4], [30, 7, 3], [48, 9, 5], [58, 6, 3], [80, 9, 4], [90, 7, 5], [122, 8, 4], [132, 6, 3], [156, 9, 5], [166, 7, 3]],
    blocks: [
      { x: 14, y: 9, t: 'Q' }, { x: 25, y: 6, t: 'C' }, { x: 26, y: 6, t: 'B' }, { x: 27, y: 6, t: 'Q' },
      { x: 44, y: 9, t: 'B' }, { x: 45, y: 9, t: 'Q' }, { x: 46, y: 9, t: 'B' },
      { x: 64, y: 6, t: 'C' }, { x: 76, y: 9, t: 'Q' }, { x: 96, y: 6, t: 'C' }, { x: 97, y: 6, t: 'Q' },
      { x: 118, y: 9, t: 'B' }, { x: 119, y: 9, t: 'Q' }, { x: 140, y: 6, t: 'C' }, { x: 152, y: 9, t: 'Q' },
      { x: 172, y: 8, t: 'C' }, { x: 173, y: 8, t: 'B' },
    ],
    coins: [[21, 8], [22, 8], [23, 8], [31, 6], [32, 6], [49, 8], [50, 8], [51, 8], [59, 5], [60, 5],
      [81, 8], [82, 8], [91, 6], [92, 6], [93, 6], [123, 7], [124, 7], [133, 5], [157, 8], [158, 8], [167, 6], [176, 11]],
    enemies: [{ x: 18, t: 'burger' }, { x: 34, t: 'burger' }, { x: 52, t: 'burger' }, { x: 62, t: 'burger' },
      { x: 84, t: 'burger' }, { x: 100, t: 'burger' }, { x: 104, t: 'burger' }, { x: 126, t: 'burger' },
      { x: 142, t: 'burger' }, { x: 160, t: 'burger' }, { x: 170, t: 'burger' }],
  },
  {
    id: '1-2', name: { ko: '간 동굴', en: 'Liver Cavern' },
    sky: ['#5a2c3a', '#8a4a3c'], far: '#7a3a44', near: '#5c2a34', groundTop: '#b4703c', groundBody: '#6b3a1e',
    len: 205, goal: 197,
    gaps: [[28, 32], [50, 54], [78, 82], [104, 108], [128, 132], [158, 162], [180, 184]],
    plats: [[24, 9, 3], [34, 8, 4], [44, 6, 3], [58, 9, 4], [68, 7, 3], [86, 9, 5], [96, 6, 4],
      [112, 8, 4], [122, 6, 3], [136, 9, 4], [146, 7, 4], [166, 9, 4], [176, 6, 3], [188, 9, 4]],
    blocks: [
      { x: 20, y: 9, t: 'Q' }, { x: 40, y: 6, t: 'C' }, { x: 41, y: 6, t: 'Q' },
      { x: 62, y: 9, t: 'B' }, { x: 63, y: 9, t: 'Q' }, { x: 74, y: 6, t: 'C' },
      { x: 92, y: 9, t: 'Q' }, { x: 100, y: 5, t: 'C' }, { x: 116, y: 8, t: 'Q' },
      { x: 140, y: 9, t: 'B' }, { x: 141, y: 9, t: 'Q' }, { x: 152, y: 6, t: 'C' },
      { x: 170, y: 9, t: 'Q' }, { x: 190, y: 8, t: 'C' },
    ],
    coins: [[25, 8], [26, 8], [35, 7], [36, 7], [37, 7], [45, 5], [59, 8], [60, 8], [69, 6], [70, 6],
      [87, 8], [88, 8], [89, 8], [97, 5], [98, 5], [113, 7], [114, 7], [123, 5], [137, 8], [138, 8],
      [147, 6], [148, 6], [167, 8], [177, 5], [189, 8]],
    enemies: [{ x: 22, t: 'burger' }, { x: 36, t: 'donut' }, { x: 46, t: 'fat' }, { x: 60, t: 'burger' },
      { x: 72, t: 'donut' }, { x: 88, t: 'fat' }, { x: 94, t: 'burger' }, { x: 110, t: 'donut' },
      { x: 118, t: 'burger' }, { x: 138, t: 'fat' }, { x: 150, t: 'donut' }, { x: 164, t: 'burger' },
      { x: 172, t: 'burger' }, { x: 186, t: 'donut' }],
  },
  {
    id: '1-3', name: { ko: '혈관 성채', en: 'Vascular Keep' },
    sky: ['#3a1020', '#7a1c2c'], far: '#6a1828', near: '#48101c', groundTop: '#d9485c', groundBody: '#6b1c26',
    len: 200, goal: 0, boss: true, bossX: 176, arena: [162, 198],
    gaps: [[26, 30], [46, 50], [70, 74], [92, 96], [116, 120], [140, 144]],
    plats: [[22, 9, 3], [32, 7, 3], [42, 9, 3], [54, 6, 4], [64, 9, 3], [78, 7, 4], [88, 9, 3],
      [100, 6, 4], [110, 9, 3], [124, 7, 4], [134, 9, 3], [148, 6, 4], [156, 9, 4]],
    blocks: [
      { x: 18, y: 9, t: 'Q' }, { x: 38, y: 6, t: 'C' }, { x: 39, y: 6, t: 'Q' },
      { x: 58, y: 9, t: 'Q' }, { x: 82, y: 6, t: 'C' }, { x: 83, y: 6, t: 'Q' },
      { x: 106, y: 9, t: 'Q' }, { x: 128, y: 6, t: 'C' }, { x: 129, y: 6, t: 'Q' },
      { x: 152, y: 9, t: 'Q' }, { x: 158, y: 8, t: 'C' },
    ],
    coins: [[23, 8], [33, 6], [43, 8], [55, 5], [56, 5], [65, 8], [79, 6], [80, 6], [89, 8],
      [101, 5], [102, 5], [111, 8], [125, 6], [126, 6], [135, 8], [149, 5], [150, 5], [157, 8]],
    enemies: [{ x: 20, t: 'soda' }, { x: 34, t: 'burger' }, { x: 44, t: 'soda' }, { x: 60, t: 'donut' },
      { x: 66, t: 'fat' }, { x: 80, t: 'soda' }, { x: 90, t: 'burger' }, { x: 104, t: 'donut' },
      { x: 112, t: 'soda' }, { x: 130, t: 'fat' }, { x: 136, t: 'burger' }, { x: 150, t: 'soda' }],
  },
];

// ---------- 레벨 빌드 ----------
let LV = null;         // 현재 레벨 스펙
let grid = null;       // Uint8Array
let gridW = 0;
const T_EMPTY = 0, T_GROUND = 1, T_BRICK = 2, T_QUIZ = 3, T_COINB = 4, T_USED = 5, T_HARD = 6;

function idx(tx, ty) { return ty * gridW + tx; }
function tileAt(tx, ty) {
  if (tx < 0 || tx >= gridW || ty < 0 || ty >= ROWS) return ty >= ROWS ? T_EMPTY : T_HARD;
  return grid[idx(tx, ty)];
}
function isSolid(v) { return v !== T_EMPTY; }
function solidAt(tx, ty) { return isSolid(tileAt(tx, ty)); }

let enemies = [], items = [], coins = [], parts = [], bumps = [], boss = null;
let player = null, camX = 0, shakeT = 0, shakeAmp = 0, stageT = 0, bossSpawned = false, goalReached = false;

function buildLevel(spec) {
  LV = spec;
  gridW = spec.len;
  grid = new Uint8Array(gridW * ROWS);
  const inGap = (x) => (spec.gaps || []).some(([a, b]) => x >= a && x < b);
  for (let x = 0; x < gridW; x++) {
    if (inGap(x)) continue;
    for (let y = GROUND_TOP; y < ROWS; y++) grid[idx(x, y)] = T_GROUND;
  }
  for (const [x, y, w] of (spec.plats || [])) {
    for (let i = 0; i < w; i++) if (x + i < gridW) grid[idx(x + i, y)] = T_HARD;
  }
  for (const b of (spec.blocks || [])) {
    grid[idx(b.x, b.y)] = b.t === 'Q' ? T_QUIZ : b.t === 'C' ? T_COINB : b.t === 'H' ? T_HARD : T_BRICK;
  }
  // 보스 아레나 벽
  if (spec.boss && spec.arena) {
    const [a, b] = spec.arena;
    for (let y = 4; y < GROUND_TOP; y++) { grid[idx(b, y)] = T_HARD; }
  }

  enemies = []; items = []; coins = []; parts = []; bumps = []; boss = null;
  bossSpawned = false; goalReached = false; stageT = 0; camX = 0;
  for (const c of (spec.coins || [])) coins.push({ x: c[0] * TILE + TILE / 2, y: c[1] * TILE + TILE / 2, t: 0, got: false });
  for (const e of (spec.enemies || [])) enemies.push(makeEnemy(e.t, e.x * TILE, (e.y !== undefined ? e.y : GROUND_TOP - 1) * TILE));
  player = makePlayer(3 * TILE, (GROUND_TOP - 2) * TILE);
  G.timeLeft = DT().time;
}

// ---------- 플레이어 ----------
const GRAV = 2150, MAX_FALL = 900;
function makePlayer(x, y) {
  return { x, y, vx: 0, vy: 0, w: 26, h: 34, big: false, face: 1,
    onGround: false, coyote: 0, jumpBuf: 0, jumpHeld: false,
    invuln: 0, waterT: 0, shoeT: 0, dead: false, deadT: 0, walkT: 0, squash: 0 };
}
function pw() { return player.big ? 32 : 26; }
function ph() { return player.big ? 48 : 34; }

// ---------- 적 ----------
function makeEnemy(t, x, y) {
  const base = { t, x, y, vx: 0, vy: 0, dead: false, deadT: 0, hp: 1, anim: Math.random() * 6, baseY: y };
  if (t === 'burger') return { ...base, w: 30, h: 30, vx: -62, hp: 1 };
  if (t === 'soda') return { ...base, w: 26, h: 36, vx: -40, hp: 1, hopT: Math.random() * 1.2 };
  if (t === 'donut') return { ...base, w: 30, h: 30, vx: -78, hp: 1, fly: true, y: y - TILE * 3, baseY: y - TILE * 3 };
  if (t === 'fat') return { ...base, w: 44, h: 42, vx: -38, hp: 2 };
  return { ...base, w: 30, h: 30, vx: -60 };
}
function makeBoss(x, y) {
  return { t: 'boss', x, y, vx: 96, vy: 0, w: 88, h: 82, hp: 3, dead: false, deadT: 0,
    anim: 0, slamT: 2.4, stunT: 0, phase: 0 };
}

// ---------- 아이템 ----------
function makeItem(t, x, y) {
  return { t, x, y, vx: t === 'broccoli' ? 70 : t === 'shoe' ? 90 : 0, vy: -180, w: 26, h: 26, t0: 0, born: 0.35 };
}

// ---------- 파티클 ----------
function burst(x, y, color, n = 8, spd = 180) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = spd * (0.4 + Math.random() * 0.8);
    parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, life: 0.5 + Math.random() * 0.4, t: 0,
      color, size: 3 + Math.random() * 4 });
  }
}
function popText(x, y, text, color) {
  parts.push({ x, y, vx: 0, vy: -70, life: 0.9, t: 0, color, text });
}
function shake(a, d) { shakeAmp = Math.max(shakeAmp, a); shakeT = Math.max(shakeT, d); }

// ---------- 입력 ----------
const keys = new Set();
const touchState = { left: false, right: false, jump: false };
function leftDown() { return keys.has('ArrowLeft') || keys.has('KeyA') || touchState.left; }
function rightDown() { return keys.has('ArrowRight') || keys.has('KeyD') || touchState.right; }
function jumpDown() { return keys.has('Space') || keys.has('ArrowUp') || keys.has('KeyW') || touchState.jump; }

window.addEventListener('keydown', (e) => {
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  const fresh = !keys.has(e.code);
  keys.add(e.code);
  audio();
  if (fresh) onAnyPress();
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => { keys.clear(); touchState.left = touchState.right = touchState.jump = false; });

function bindTouch(id, k) {
  const el = $(id);
  const on = (v) => (ev) => { ev.preventDefault(); touchState[k] = v; if (v) { audio(); onAnyPress(); } };
  el.addEventListener('pointerdown', on(true));
  el.addEventListener('pointerup', on(false));
  el.addEventListener('pointercancel', on(false));
  el.addEventListener('pointerleave', on(false));
}
bindTouch('t-left', 'left'); bindTouch('t-right', 'right'); bindTouch('t-jump', 'jump');
if ('ontouchstart' in window) $('touch').classList.add('on');

$('stage').addEventListener('pointerdown', (e) => {
  if (e.target.closest('.tbtn') || e.target.closest('#quiz') || e.target.closest('.opt-btn')) return;
  audio(); onAnyPress();
});

function onAnyPress() {
  if (G.state === 'TITLE') { showGuide(); return; }
  if (G.state === 'GUIDE') { startGame(); return; }
  if (G.state === 'RESULT') { backToTitle(); return; }
}

// ---------- 충돌 ----------
function resolveX(e, w, h) {
  const y0 = Math.floor(e.y / TILE), y1 = Math.floor((e.y + h - 1) / TILE);
  if (e.vx > 0) {
    const tx = Math.floor((e.x + w - 1) / TILE);
    for (let ty = y0; ty <= y1; ty++) if (solidAt(tx, ty)) { e.x = tx * TILE - w; e.vx = 0; return true; }
  } else if (e.vx < 0) {
    const tx = Math.floor(e.x / TILE);
    for (let ty = y0; ty <= y1; ty++) if (solidAt(tx, ty)) { e.x = (tx + 1) * TILE; e.vx = 0; return true; }
  }
  return false;
}
function resolveY(e, w, h, isPlayer) {
  const x0 = Math.floor((e.x + 2) / TILE), x1 = Math.floor((e.x + w - 3) / TILE);
  if (e.vy > 0) {
    const ty = Math.floor((e.y + h) / TILE);
    for (let tx = x0; tx <= x1; tx++) if (solidAt(tx, ty)) { e.y = ty * TILE - h; e.vy = 0; e.onGround = true; return 'floor'; }
  } else if (e.vy < 0) {
    const ty = Math.floor(e.y / TILE);
    for (let tx = x0; tx <= x1; tx++) if (solidAt(tx, ty)) {
      e.y = (ty + 1) * TILE; e.vy = 0;
      if (isPlayer) hitBlock(tx, ty);
      return 'ceil';
    }
  }
  return null;
}

// ---------- 블록 타격 ----------
function hitBlock(tx, ty) {
  const v = tileAt(tx, ty);
  if (v === T_QUIZ) {
    bumps.push({ tx, ty, t: 0 });
    G.quizBlock = { tx, ty };
    openQuiz();
    sfx.block();
  } else if (v === T_COINB) {
    grid[idx(tx, ty)] = T_USED;
    bumps.push({ tx, ty, t: 0 });
    gainCoin(1, tx * TILE + TILE / 2, ty * TILE);
    popText(tx * TILE + TILE / 2, ty * TILE - 6, '+1', '#7dffb0');
  } else if (v === T_BRICK) {
    if (player.big) {
      grid[idx(tx, ty)] = T_EMPTY;
      burst(tx * TILE + TILE / 2, ty * TILE + TILE / 2, '#c98a4a', 12, 220);
      sfx.block();
    } else { bumps.push({ tx, ty, t: 0 }); sfx.block(); }
  }
}
function gainCoin(n, x, y) {
  G.coins += n; G.score += n * 100;
  sfx.coin();
  if (x !== undefined) burst(x, y, '#8fd66a', 6, 140);
}

// ---------- 퀴즈 ----------
function openQuiz() {
  G.state = 'QUIZ';
  G.currentQuiz = drawQuizQ();
  G.quizSel = -1; G.quizAnswered = false;
  G.quizTotal += 1;
  G.quizT = DT().quizSec;
  const q = G.currentQuiz;
  $('quiz-head').textContent = T('quizHead');
  $('quiz-q').textContent = q.q;
  $('quiz-submit').textContent = T('submit');
  $('quiz-feedback').textContent = '';
  const wrap = $('quiz-answers');
  wrap.innerHTML = '';
  const order = shuffled(q.a.map((_, i) => i));
  order.forEach((oi) => {
    const b = document.createElement('button');
    b.className = 'quiz-btn';
    b.textContent = q.a[oi];
    b.dataset.i = oi;
    b.addEventListener('pointerdown', (ev) => {
      ev.stopPropagation();
      if (G.quizAnswered) return;
      wrap.querySelectorAll('.quiz-btn').forEach((x) => x.classList.remove('sel'));
      b.classList.add('sel');
      G.quizSel = oi;
      beep(700, 0.05, 'triangle', 0.04);
    });
    wrap.appendChild(b);
  });
  $('quiz').classList.remove('hidden');
}
$('quiz-submit').addEventListener('pointerdown', (ev) => { ev.stopPropagation(); submitQuiz(); });

function submitQuiz() {
  if (G.quizAnswered || G.state !== 'QUIZ') return;
  const q = G.currentQuiz;
  const chosen = G.quizSel;
  G.quizAnswered = true;
  const wrap = $('quiz-answers');
  wrap.querySelectorAll('.quiz-btn').forEach((b) => {
    const i = +b.dataset.i;
    if (i === q.correct) b.classList.add('correct');
    else if (i === chosen) b.classList.add('wrong');
  });
  const ok = chosen === q.correct;
  const blk = G.quizBlock;
  if (ok) {
    G.quizCorrect += 1; G.score += 1200;
    $('quiz-feedback').textContent = T('quizOk', 3);
    sfx.ok();
  } else {
    $('quiz-feedback').textContent = T('quizNo', q.a[q.correct]);
    sfx.no();
  }
  setTimeout(() => {
    $('quiz').classList.add('hidden');
    if (blk) {
      grid[idx(blk.tx, blk.ty)] = T_USED;
      const px = blk.tx * TILE + TILE / 2, py = blk.ty * TILE;
      if (ok) {
        gainCoin(3, px, py);
        const kinds = player.big ? ['water', 'shoe', 'water'] : ['broccoli', 'broccoli', 'shoe'];
        const kind = kinds[Math.floor(Math.random() * kinds.length)];
        items.push(makeItem(kind, px - 13, py - TILE + 6));
      } else {
        gainCoin(1, px, py);
      }
    }
    G.quizBlock = null;
    if (G.state === 'QUIZ') G.state = 'PLAY';
  }, ok ? 1500 : 2400);
}

// ---------- 업데이트: 플레이어 ----------
function updatePlayer(dt) {
  const p = player;
  if (p.dead) {
    p.deadT += dt;
    p.vy = Math.min(MAX_FALL, p.vy + GRAV * dt);
    p.y += p.vy * dt;
    if (p.deadT > 1.6) loseLife();
    return;
  }
  const shoe = p.shoeT > 0;
  const MAXRUN = shoe ? 330 : 262;
  const ACC = 2100, FRIC = 2400;

  let dir = 0;
  if (leftDown()) dir -= 1;
  if (rightDown()) dir += 1;
  if (dir !== 0) {
    p.vx += dir * ACC * dt;
    p.vx = Math.max(-MAXRUN, Math.min(MAXRUN, p.vx));
    p.face = dir;
  } else {
    const s = Math.sign(p.vx);
    p.vx -= s * FRIC * dt;
    if (Math.sign(p.vx) !== s) p.vx = 0;
  }

  // 점프 (코요테 타임 + 입력 버퍼 + 가변 높이)
  p.coyote = p.onGround ? 0.1 : Math.max(0, p.coyote - dt);
  if (jumpDown()) { if (!p.jumpHeld) p.jumpBuf = 0.13; p.jumpHeld = true; }
  else { p.jumpHeld = false; if (p.vy < 0) p.vy *= 0.55; }
  p.jumpBuf = Math.max(0, p.jumpBuf - dt);
  if (p.jumpBuf > 0 && p.coyote > 0) {
    p.vy = shoe ? -800 : -742;
    p.jumpBuf = 0; p.coyote = 0; p.onGround = false;
    p.squash = 0.28;
    sfx.jump();
  }

  p.vy = Math.min(MAX_FALL, p.vy + GRAV * dt);
  p.onGround = false;

  const w = pw(), h = ph();
  p.x += p.vx * dt; resolveX(p, w, h);
  p.y += p.vy * dt; resolveY(p, w, h, true);
  if (p.x < 0) { p.x = 0; p.vx = 0; }
  const maxX = (LV.boss && bossSpawned && LV.arena) ? LV.arena[1] * TILE - w : gridW * TILE - w;
  if (p.x > maxX) { p.x = maxX; p.vx = 0; }
  if (LV.boss && bossSpawned && LV.arena && p.x < LV.arena[0] * TILE) { p.x = LV.arena[0] * TILE; p.vx = 0; }

  p.walkT += Math.abs(p.vx) * dt * 0.045;
  p.squash = Math.max(0, p.squash - dt * 2.2);
  p.invuln = Math.max(0, p.invuln - dt);
  p.waterT = Math.max(0, p.waterT - dt);
  p.shoeT = Math.max(0, p.shoeT - dt);

  if (p.y > VIEW_H + 120) { p.dead = true; p.deadT = 1.2; }

  // 코인
  for (const c of coins) {
    if (c.got) continue;
    if (Math.abs((p.x + w / 2) - c.x) < 24 && Math.abs((p.y + h / 2) - c.y) < 28) {
      c.got = true; gainCoin(1, c.x, c.y);
    }
  }
  // 아이템
  for (const it of items) {
    if (it.dead || it.born > 0) continue;
    if (p.x < it.x + it.w && p.x + w > it.x && p.y < it.y + it.h && p.y + h > it.y) {
      it.dead = true;
      sfx.power();
      G.score += 800;
      if (it.t === 'broccoli') {
        if (!p.big) { p.big = true; p.y -= 14; }
        p.invuln = Math.max(p.invuln, 0.6);
        showMsg(T('got1up'));
      } else if (it.t === 'water') { p.waterT = 6.5; showMsg(T('gotWater')); }
      else { p.shoeT = 11; showMsg(T('gotShoe')); }
      burst(it.x + 13, it.y + 13, '#ffd166', 14, 240);
    }
  }
  // 목표 깃발
  if (!LV.boss && !goalReached && p.x + w / 2 > LV.goal * TILE) {
    goalReached = true;
    sfx.clear();
    showMsg(T('goal'), 1800);
    G.score += Math.round(G.timeLeft) * 40;
    setTimeout(() => nextStage(), 1700);
  }
}

function hurtPlayer() {
  const p = player;
  if (p.invuln > 0 || p.waterT > 0 || p.dead) return;
  if (p.big) {
    p.big = false; p.y += 14; p.invuln = 1.6;
    sfx.hurt(); showMsg(T('hurt')); shake(7, 0.25);
    burst(p.x + 13, p.y + 16, '#ff8fa3', 12, 200);
  } else {
    p.dead = true; p.deadT = 0; p.vy = -520; p.vx = 0;
    sfx.die(); shake(9, 0.4);
  }
}
function loseLife() {
  G.lives -= 1;
  if (G.lives <= 0) { endGame(false); return; }
  buildLevel(LEVELS[G.stage]);
  G.state = 'PLAY';
  showMsg(T('stageStart', LEVELS[G.stage].id), 1400);
}

// ---------- 업데이트: 적 ----------
function stompCheck(e) {
  const p = player, w = pw(), h = ph();
  if (p.dead || e.dead) return;
  if (!(p.x < e.x + e.w && p.x + w > e.x && p.y < e.y + e.h && p.y + h > e.y)) return;
  const feet = p.y + h;
  const fromAbove = p.vy > 60 && feet - e.y < e.h * 0.7;
  if (fromAbove) {
    e.hp -= 1;
    p.vy = jumpDown() ? -560 : -420;
    p.squash = 0.3;
    sfx.stomp();
    shake(4, 0.12);
    if (e.hp <= 0) {
      e.dead = true; e.deadT = 0;
      G.score += 300;
      popText(e.x + e.w / 2, e.y - 4, '+300', '#ffd166');
      burst(e.x + e.w / 2, e.y + e.h / 2, enemyColor(e), 12, 200);
    } else {
      burst(e.x + e.w / 2, e.y + 6, enemyColor(e), 7, 150);
      e.vx *= 1.35;
    }
  } else if (p.waterT > 0) {
    e.hp = 0; e.dead = true; e.deadT = 0; G.score += 300;
    burst(e.x + e.w / 2, e.y + e.h / 2, enemyColor(e), 12, 220);
    sfx.stomp();
  } else {
    hurtPlayer();
  }
}
function enemyColor(e) {
  return { burger: '#e8a95c', soda: '#ff8f4d', donut: '#ff9ec4', fat: '#ffd166', boss: '#ff5d73' }[e.t] || '#ffd166';
}

function updateEnemies(dt) {
  const spd = DT().enemySpd;
  for (const e of enemies) {
    if (e.dead) { e.deadT += dt; continue; }
    e.anim += dt;
    if (e.t === 'donut') {
      e.x += e.vx * spd * dt;
      e.y = e.baseY + Math.sin(e.anim * 2.4) * 34;
      if (e.x < 0 || e.x > gridW * TILE - e.w) e.vx *= -1;
      // 벽을 만나면 반사
      const tx = Math.floor((e.vx > 0 ? e.x + e.w : e.x) / TILE), ty = Math.floor((e.y + e.h / 2) / TILE);
      if (solidAt(tx, ty)) e.vx *= -1;
    } else {
      if (e.t === 'soda') {
        e.hopT -= dt;
        if (e.hopT <= 0 && e.onGround) { e.vy = -470; e.hopT = 1.5 + Math.random() * 0.6; }
      }
      e.vy = Math.min(MAX_FALL, e.vy + GRAV * dt);
      e.onGround = false;
      const oldVx = e.vx;
      e.x += e.vx * spd * dt;
      if (resolveX(e, e.w, e.h)) { e.vx = -oldVx; }
      e.y += e.vy * dt; resolveY(e, e.w, e.h);
      // 낭떠러지에서 돌아선다 (소다는 점프 중이면 예외)
      if (e.onGround && e.t !== 'soda') {
        const aheadX = e.vx > 0 ? e.x + e.w + 3 : e.x - 3;
        if (!solidAt(Math.floor(aheadX / TILE), Math.floor((e.y + e.h + 4) / TILE))) e.vx = -e.vx;
      }
      if (e.x < 0) { e.x = 0; e.vx = Math.abs(e.vx); }
      if (e.x > gridW * TILE - e.w) { e.x = gridW * TILE - e.w; e.vx = -Math.abs(e.vx); }
      if (e.y > VIEW_H + 200) e.dead = true;
    }
    stompCheck(e);
  }
  enemies = enemies.filter((e) => !e.dead || e.deadT < 0.6);
}

// ---------- 보스 ----------
function updateBoss(dt) {
  if (!LV.boss) return;
  if (!bossSpawned && player.x > (LV.bossX - 14) * TILE) {
    bossSpawned = true;
    boss = makeBoss(LV.bossX * TILE, (GROUND_TOP - 3) * TILE);
    showMsg(G.lang === 'en' ? '☠️ PLAQUE KING' : '☠️ 플라크 왕 등장!', 2600);
    shake(10, 0.6);
    beep(110, 0.5, 'sawtooth', 0.09, -40);
    setTimeout(() => beep(85, 0.6, 'sawtooth', 0.08, -30), 260);
  }
  if (!boss) return;
  const b = boss;
  b.anim += dt;
  if (b.dead) {
    b.deadT += dt;
    b.y += 90 * dt;
    if (b.deadT > 1.8 && !goalReached) {
      goalReached = true;
      G.score += Math.round(G.timeLeft) * 40;
      setTimeout(() => nextStage(), 400);
    }
    return;
  }
  b.stunT = Math.max(0, b.stunT - dt);
  const [aL, aR] = LV.arena;
  if (b.stunT <= 0) {
    b.x += b.vx * (1 + b.phase * 0.35) * DT().enemySpd * dt;
    if (b.x < aL * TILE + 8) { b.x = aL * TILE + 8; b.vx = Math.abs(b.vx); }
    if (b.x > aR * TILE - b.w - 8) { b.x = aR * TILE - b.w - 8; b.vx = -Math.abs(b.vx); }
    b.slamT -= dt;
    if (b.slamT <= 0 && b.onGround !== false) {
      b.slamT = 2.6 - b.phase * 0.5;
      b.vy = -430;
    }
  }
  b.vy = Math.min(MAX_FALL, b.vy + GRAV * dt);
  const prevVy = b.vy;
  b.y += b.vy * dt;
  const land = resolveY(b, b.w, b.h);
  if (land === 'floor' && prevVy > 300) {
    shake(9, 0.3);
    beep(70, 0.28, 'sawtooth', 0.09, -30);
    burst(b.x + b.w / 2, b.y + b.h, '#ff5d73', 16, 260);
    if (player.onGround && Math.abs((player.x + pw() / 2) - (b.x + b.w / 2)) < 220) player.vy = -300;
  }
  // 충돌 판정
  const p = player, w = pw(), h = ph();
  if (!p.dead && p.x < b.x + b.w && p.x + w > b.x && p.y < b.y + b.h && p.y + h > b.y) {
    const fromAbove = p.vy > 60 && (p.y + h) - b.y < b.h * 0.55;
    if (fromAbove && b.stunT <= 0) {
      b.hp -= 1; b.stunT = 1.1; b.phase += 1;
      p.vy = -520; sfx.stomp(); shake(8, 0.3);
      G.score += 1500;
      burst(b.x + b.w / 2, b.y + 10, '#ff5d73', 18, 250);
      if (b.hp <= 0) {
        b.dead = true; b.deadT = 0;
        G.score += 5000;
        sfx.clear(); shake(14, 0.8);
        showMsg(T('bossDown'), 3000);
        for (let i = 0; i < 4; i++) setTimeout(() => burst(b.x + b.w / 2, b.y + 30, '#ffd166', 20, 320), i * 160);
      } else {
        showMsg(T('bossHit'), 1400);
      }
    } else if (b.stunT <= 0 && p.waterT <= 0) {
      hurtPlayer();
    }
  }
}

// ---------- 업데이트: 아이템·파티클 ----------
function updateItems(dt) {
  for (const it of items) {
    if (it.dead) continue;
    if (it.born > 0) { it.born -= dt; it.y -= 42 * dt; continue; }
    if (it.t === 'water') { it.t0 = (it.t0 || 0) + dt; it.y += Math.sin(it.t0 * 3) * 12 * dt; continue; }
    it.vy = Math.min(MAX_FALL, it.vy + GRAV * dt);
    const oldVx = it.vx;
    it.x += it.vx * dt; if (resolveX(it, it.w, it.h)) it.vx = -oldVx;
    it.y += it.vy * dt; resolveY(it, it.w, it.h);
    if (it.y > VIEW_H + 200) it.dead = true;
  }
  items = items.filter((i) => !i.dead);

  for (const p of parts) { p.t += dt; if (!p.text) { p.vy += 900 * dt; } p.x += p.vx * dt; p.y += p.vy * dt; }
  parts = parts.filter((p) => p.t < p.life);
  for (const b of bumps) b.t += dt;
  bumps = bumps.filter((b) => b.t < 0.24);
}

// ---------- 스테이지 흐름 ----------
function showMsg(text, dur = 2200) {
  const el = $('hud-msg');
  el.textContent = text; el.classList.add('show');
  clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('show'), dur);
}
function startGame() {
  $('screen-guide').classList.add('hidden');
  $('screen-title').classList.add('hidden');
  $('screen-result').classList.add('hidden');
  $('hud').classList.remove('hidden');
  G.stage = 0; G.lives = DT().lives; G.coins = 0; G.score = 0;
  G.quizTotal = 0; G.quizCorrect = 0;
  buildLevel(LEVELS[0]);
  G.state = 'PLAY';
  showMsg(T('stageStart', LEVELS[0].id), 1600);
}
function nextStage() {
  G.stage += 1;
  if (G.stage >= LEVELS.length) { endGame(true); return; }
  buildLevel(LEVELS[G.stage]);
  G.state = 'PLAY';
  showMsg(T('stageStart', LEVELS[G.stage].id), 1600);
}
function endGame(cleared) {
  G.state = 'RESULT';
  $('hud').classList.add('hidden');
  $('res-title').textContent = cleared ? T('allclear') : T('gameover');
  const acc = G.quizTotal ? Math.round((G.quizCorrect / G.quizTotal) * 100) : 0;
  $('res-lines').innerHTML =
    `${T('resScore')} <b>${G.score.toLocaleString()}</b><br>` +
    `${T('resCoin')} <b>${G.coins}</b><br>` +
    `${T('resQuiz')} <b>${G.quizCorrect}/${G.quizTotal} (${acc}%)</b><br>` +
    `${T('resStage')} <b>${LEVELS[Math.min(G.stage, LEVELS.length - 1)].id}</b>`;
  $('press3').textContent = T('press3');
  $('screen-result').classList.remove('hidden');
  if (cleared) sfx.clear(); else sfx.die();
}
function backToTitle() {
  $('screen-result').classList.add('hidden');
  $('screen-title').classList.remove('hidden');
  G.state = 'TITLE';
}
function showGuide() {
  $('screen-title').classList.add('hidden');
  renderGuide();
  $('screen-guide').classList.remove('hidden');
  G.state = 'GUIDE';
}
function renderGuide() {
  $('gtitle').textContent = T('guideTitle');
  $('press2').textContent = T('press2');
  $('guide-grid').innerHTML = (GUIDE[G.lang] || GUIDE.ko)
    .map(([i, t, d]) => `<div class="gcard"><div class="gicon">${i}</div><div class="gtitle">${t}</div><div class="gdesc">${d}</div></div>`)
    .join('');
}

// ---------- HUD ----------
function updateHUD() {
  $('lb-life').textContent = T('life'); $('lb-coin').textContent = T('coin');
  $('lb-quiz').textContent = T('quiz'); $('lb-stage').textContent = T('stage');
  $('v-life').textContent = '♥'.repeat(Math.max(0, G.lives));
  $('v-coin').textContent = G.coins;
  $('v-quiz').textContent = `${G.quizCorrect}/${G.quizTotal}`;
  const lv = LEVELS[Math.min(G.stage, LEVELS.length - 1)];
  $('v-stage').textContent = `${lv.id} · ${Math.max(0, Math.ceil(G.timeLeft))}`;
}
function applyLang() {
  $('tsub').textContent = T('sub');
  $('lb-lang').textContent = T('lang'); $('lb-diff').textContent = T('diff');
  $('press1').textContent = T('press'); $('press2').textContent = T('press2');
  $('quiz-submit').textContent = T('submit');
  renderGuide(); updateHUD();
}
document.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  document.querySelectorAll('[data-lang]').forEach((x) => x.classList.remove('sel'));
  b.classList.add('sel'); G.lang = b.dataset.lang;
  loadQuiz(G.lang); applyLang(); beep(660, 0.06, 'triangle', 0.05);
}));
document.querySelectorAll('[data-diff]').forEach((b) => b.addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  document.querySelectorAll('[data-diff]').forEach((x) => x.classList.remove('sel'));
  b.classList.add('sel'); G.diff = b.dataset.diff; beep(660, 0.06, 'triangle', 0.05);
}));

// ---------- 그리기 헬퍼 ----------
function rr(x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else { ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
}
function fillRR(x, y, w, h, r, c) { ctx.fillStyle = c; rr(x, y, w, h, r); ctx.fill(); }
function circle(x, y, r, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
function eyes(cx, cy, s, look, angry) {
  circle(cx - s * 0.42, cy, s * 0.3, '#fff'); circle(cx + s * 0.42, cy, s * 0.3, '#fff');
  circle(cx - s * 0.42 + look * s * 0.09, cy + s * 0.03, s * 0.16, '#241018');
  circle(cx + s * 0.42 + look * s * 0.09, cy + s * 0.03, s * 0.16, '#241018');
  if (angry) {
    ctx.strokeStyle = '#3a1018'; ctx.lineWidth = Math.max(1.6, s * 0.11); ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.72, cy - s * 0.5); ctx.lineTo(cx - s * 0.16, cy - s * 0.3);
    ctx.moveTo(cx + s * 0.72, cy - s * 0.5); ctx.lineTo(cx + s * 0.16, cy - s * 0.3);
    ctx.stroke();
  }
}
function shadowEllipse(cx, y, rx) {
  ctx.fillStyle = 'rgba(0,0,0,.22)';
  ctx.beginPath(); ctx.ellipse(cx, y, rx, rx * 0.32, 0, 0, Math.PI * 2); ctx.fill();
}

// ---------- 배경 ----------
function drawBG() {
  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  g.addColorStop(0, LV.sky[0]); g.addColorStop(1, LV.sky[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // 먼 장기 실루엣
  ctx.fillStyle = LV.far;
  const f = camX * 0.18;
  for (let i = -1; i < 12; i++) {
    const x = i * 220 - (f % 220), h = 120 + ((i * 37) % 60);
    ctx.beginPath(); ctx.ellipse(x, VIEW_H - 150, 150, h, 0, Math.PI, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = LV.near;
  const n = camX * 0.42;
  for (let i = -1; i < 14; i++) {
    const x = i * 170 - (n % 170), h = 90 + ((i * 53) % 50);
    ctx.beginPath(); ctx.ellipse(x, VIEW_H - 96, 110, h, 0, Math.PI, Math.PI * 2); ctx.fill();
  }
}

// ---------- 타일 ----------
function drawTiles() {
  const x0 = Math.max(0, Math.floor(camX / TILE) - 1);
  const x1 = Math.min(gridW - 1, Math.ceil((camX + VIEW_W) / TILE) + 1);
  for (let tx = x0; tx <= x1; tx++) {
    for (let ty = 0; ty < ROWS; ty++) {
      const v = tileAt(tx, ty);
      if (v === T_EMPTY) continue;
      const bump = bumps.find((b) => b.tx === tx && b.ty === ty);
      const off = bump ? -Math.sin((bump.t / 0.24) * Math.PI) * 10 : 0;
      const x = tx * TILE, y = ty * TILE + off;
      if (v === T_GROUND) {
        const isTop = ty === GROUND_TOP || !isSolid(tileAt(tx, ty - 1));
        ctx.fillStyle = LV.groundBody; ctx.fillRect(x, y, TILE, TILE);
        if (isTop) { ctx.fillStyle = LV.groundTop; ctx.fillRect(x, y, TILE, 9); }
        ctx.fillStyle = 'rgba(0,0,0,.10)';
        ctx.fillRect(x + ((tx * 7) % 20) + 4, y + 16 + ((tx * 11) % 10), 6, 5);
        ctx.strokeStyle = 'rgba(0,0,0,.13)'; ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
      } else if (v === T_HARD) {
        fillRR(x + 1, y + 1, TILE - 2, TILE - 2, 6, '#6b5240');
        fillRR(x + 3, y + 3, TILE - 6, TILE - 9, 5, '#8a6a4e');
        ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.fillRect(x + 5, y + 5, TILE - 10, 3);
      } else if (v === T_BRICK) {
        fillRR(x + 1, y + 1, TILE - 2, TILE - 2, 4, '#a8552c');
        ctx.strokeStyle = 'rgba(0,0,0,.28)'; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 1, y + TILE / 2); ctx.lineTo(x + TILE - 1, y + TILE / 2);
        ctx.moveTo(x + TILE / 2, y + 1); ctx.lineTo(x + TILE / 2, y + TILE / 2);
        ctx.moveTo(x + TILE * 0.25, y + TILE / 2); ctx.lineTo(x + TILE * 0.25, y + TILE - 1);
        ctx.moveTo(x + TILE * 0.75, y + TILE / 2); ctx.lineTo(x + TILE * 0.75, y + TILE - 1);
        ctx.stroke();
      } else if (v === T_USED) {
        fillRR(x + 1, y + 1, TILE - 2, TILE - 2, 5, '#6a4a30');
        ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(x + 5, y + 5, TILE - 10, TILE - 10);
      } else {
        const pulse = 0.5 + 0.5 * Math.sin(stageT * 4 + tx);
        fillRR(x + 1, y + 1, TILE - 2, TILE - 2, 6, v === T_QUIZ ? '#e8a325' : '#3f9a4e');
        fillRR(x + 3, y + 3, TILE - 6, TILE - 6, 5, v === T_QUIZ ? `rgb(255,${190 + pulse * 40 | 0},90)` : '#5fc46a');
        ctx.fillStyle = 'rgba(255,255,255,.3)';
        [[6, 6], [TILE - 10, 6], [6, TILE - 10], [TILE - 10, TILE - 10]].forEach(([dx, dy]) => ctx.fillRect(x + dx, y + dy, 4, 4));
        if (v === T_QUIZ) {
          ctx.fillStyle = '#7a3c06'; ctx.font = 'bold 22px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('?', x + TILE / 2, y + TILE / 2 + 1);
        } else {
          drawBroccoli(x + TILE / 2, y + TILE / 2, 9);
        }
      }
    }
  }
}

function drawBroccoli(cx, cy, r) {
  ctx.fillStyle = '#4e8b3a'; ctx.fillRect(cx - r * 0.22, cy + r * 0.2, r * 0.44, r * 0.75);
  circle(cx, cy - r * 0.15, r * 0.62, '#6fc45a');
  circle(cx - r * 0.55, cy + r * 0.1, r * 0.45, '#5bb04a');
  circle(cx + r * 0.55, cy + r * 0.1, r * 0.45, '#5bb04a');
  circle(cx - r * 0.2, cy - r * 0.55, r * 0.36, '#8fd66a');
  circle(cx + r * 0.28, cy - r * 0.48, r * 0.32, '#8fd66a');
}

// ---------- 아이템·코인 ----------
function drawCoins() {
  for (const c of coins) {
    if (c.got) continue;
    const b = Math.sin(stageT * 3.4 + c.x * 0.02) * 3;
    shadowEllipse(c.x, c.y + 16, 9);
    drawBroccoli(c.x, c.y + b, 11);
  }
}
function drawItems() {
  for (const it of items) {
    const cx = it.x + it.w / 2, cy = it.y + it.h / 2;
    if (it.t === 'broccoli') { shadowEllipse(cx, it.y + it.h + 3, 12); drawBroccoli(cx, cy, 14); }
    else if (it.t === 'water') {
      circle(cx, cy, 13, 'rgba(120,205,255,.85)');
      circle(cx - 4, cy - 4, 4, 'rgba(255,255,255,.8)');
      ctx.fillStyle = '#0b4a6b'; ctx.font = 'bold 13px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('💧', cx, cy + 1);
    } else {
      shadowEllipse(cx, it.y + it.h + 3, 12);
      fillRR(it.x, it.y + 8, it.w, 16, 7, '#3f7bd6');
      fillRR(it.x + 2, it.y + 4, it.w - 8, 12, 6, '#6fa6ff');
      ctx.fillStyle = '#fff'; ctx.fillRect(it.x + 4, it.y + 20, it.w - 6, 4);
    }
  }
}

// ---------- 캐릭터 ----------
function drawPlayer() {
  const p = player, w = pw(), h = ph();
  if (p.invuln > 0 && Math.floor(p.invuln * 14) % 2 === 0) return;
  const cx = p.x + w / 2, top = p.y;
  const sq = 1 - p.squash * 0.35, st = 1 + p.squash * 0.3;
  shadowEllipse(cx, p.y + h + 2, w * 0.45);
  ctx.save();
  ctx.translate(cx, p.y + h);
  ctx.scale(sq, st);
  ctx.translate(-cx, -(p.y + h));
  if (p.waterT > 0) {
    ctx.save(); ctx.globalAlpha = 0.35 + 0.25 * Math.sin(stageT * 12);
    circle(cx, top + h * 0.5, w * 0.95, '#7bd0ff'); ctx.restore();
  }
  const legPhase = p.onGround ? Math.sin(p.walkT * 2.2) : 0.6;
  const legW = w * 0.26, legH = h * 0.22;
  ctx.fillStyle = '#2f3b52';
  ctx.fillRect(cx - w * 0.3, top + h - legH + legPhase * 3, legW, legH - legPhase * 3);
  ctx.fillRect(cx + w * 0.04, top + h - legH - legPhase * 3, legW, legH + legPhase * 3);
  ctx.fillStyle = p.shoeT > 0 ? '#ff8f4d' : '#1c2433';
  ctx.fillRect(cx - w * 0.33, top + h - 6, legW + 4, 6);
  ctx.fillRect(cx + w * 0.02, top + h - 6, legW + 4, 6);
  // 흰 가운
  fillRR(cx - w * 0.42, top + h * 0.36, w * 0.84, h * 0.46, 7, '#f4f7fb');
  ctx.fillStyle = '#dde6f2'; ctx.fillRect(cx - 1.5, top + h * 0.36, 3, h * 0.46);
  // 청진기
  ctx.strokeStyle = '#2f7bd6'; ctx.lineWidth = 2.4; ctx.beginPath();
  ctx.arc(cx, top + h * 0.42, w * 0.24, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
  circle(cx + w * 0.2, top + h * 0.58, 3.4, '#2f7bd6');
  // 머리
  circle(cx, top + h * 0.22, w * 0.36, '#ffd9b8');
  ctx.fillStyle = '#3a2a20';
  ctx.beginPath(); ctx.arc(cx, top + h * 0.2, w * 0.37, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
  eyes(cx, top + h * 0.23, w * 0.3, p.face, false);
  ctx.strokeStyle = '#c07a5a'; ctx.lineWidth = 1.6; ctx.beginPath();
  ctx.arc(cx, top + h * 0.3, w * 0.13, 0.2, Math.PI - 0.2); ctx.stroke();
  if (p.big) { drawBroccoli(cx - w * 0.28, top + h * 0.48, 6); }
  ctx.restore();
}

function drawEnemy(e) {
  const cx = e.x + e.w / 2, cy = e.y + e.h / 2, look = Math.sign(e.vx) || 1;
  if (e.dead) {
    ctx.save(); ctx.globalAlpha = Math.max(0, 1 - e.deadT / 0.6);
    ctx.translate(cx, cy); ctx.scale(1 + e.deadT, Math.max(0.1, 1 - e.deadT * 1.6)); ctx.translate(-cx, -cy);
  }
  const wob = Math.sin(e.anim * 7) * 1.6;
  if (e.t !== 'donut') shadowEllipse(cx, e.y + e.h + 2, e.w * 0.42);
  if (e.t === 'burger') {
    ctx.fillStyle = '#5a3a22';
    ctx.fillRect(cx - e.w * 0.3, e.y + e.h - 5, 8, 5); ctx.fillRect(cx + e.w * 0.1, e.y + e.h - 5, 8, 5);
    fillRR(e.x, e.y + e.h * 0.62, e.w, e.h * 0.3, 5, '#e0a256');
    fillRR(e.x + 1, e.y + e.h * 0.46, e.w - 2, e.h * 0.2, 4, '#6b8f3a');
    fillRR(e.x + 1, e.y + e.h * 0.3, e.w - 2, e.h * 0.22, 4, '#7a4a2a');
    ctx.fillStyle = '#f0b96a';
    ctx.beginPath(); ctx.ellipse(cx, e.y + e.h * 0.28 + wob * 0.3, e.w * 0.5, e.h * 0.3, 0, Math.PI, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    [[-8, -6], [2, -9], [8, -3]].forEach(([dx, dy]) => ctx.fillRect(cx + dx, e.y + e.h * 0.24 + dy, 3, 2));
    eyes(cx, e.y + e.h * 0.5, e.w * 0.34, look, true);
  } else if (e.t === 'soda') {
    ctx.fillStyle = '#7a3a10';
    ctx.fillRect(cx - e.w * 0.3, e.y + e.h - 4, 7, 4); ctx.fillRect(cx + e.w * 0.08, e.y + e.h - 4, 7, 4);
    fillRR(e.x, e.y + 4, e.w, e.h - 8, 6, '#ff8f4d');
    fillRR(e.x, e.y + 2, e.w, 7, 3, '#cfd6de');
    ctx.fillStyle = '#9aa4b0'; ctx.fillRect(cx - 4, e.y + 3, 8, 3);
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillRect(e.x + 2, e.y + e.h * 0.45, e.w - 4, 5);
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(e.x + 3, e.y + 8, 3, e.h - 16);
    eyes(cx, e.y + e.h * 0.66, e.w * 0.36, look, true);
  } else if (e.t === 'donut') {
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    const fl = Math.sin(e.anim * 16) * 5;
    ctx.beginPath(); ctx.ellipse(e.x - 5, cy - 2, 9, 5 + fl, -0.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(e.x + e.w + 5, cy - 2, 9, 5 + fl, 0.5, 0, Math.PI * 2); ctx.fill();
    circle(cx, cy, e.w * 0.5, '#f0a05a');
    circle(cx, cy - 2, e.w * 0.46, '#ff9ec4');
    ctx.fillStyle = '#fff';
    [[-7, -8, 5, 2], [5, -9, 5, 2], [-9, 3, 5, 2], [7, 2, 5, 2], [0, -12, 5, 2]].forEach(([dx, dy, w2, h2]) => {
      ctx.save(); ctx.translate(cx + dx, cy + dy); ctx.rotate(dx * 0.2); ctx.fillRect(0, 0, w2, h2); ctx.restore();
    });
    ctx.save(); ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath(); ctx.arc(cx, cy - 1, e.w * 0.16, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    eyes(cx, cy + e.h * 0.22, e.w * 0.3, look, true);
  } else if (e.t === 'fat') {
    const s = 1 + Math.sin(e.anim * 5) * 0.05;
    ctx.save(); ctx.translate(cx, e.y + e.h); ctx.scale(s, 2 - s); ctx.translate(-cx, -(e.y + e.h));
    ctx.fillStyle = '#c98f2a';
    ctx.fillRect(cx - e.w * 0.28, e.y + e.h - 5, 9, 5); ctx.fillRect(cx + e.w * 0.1, e.y + e.h - 5, 9, 5);
    fillRR(e.x, e.y, e.w, e.h - 3, e.h * 0.42, '#ffd166');
    fillRR(e.x + 4, e.y + 3, e.w * 0.42, e.h * 0.3, 8, 'rgba(255,255,255,.35)');
    ctx.fillStyle = 'rgba(200,140,20,.4)';
    circle(cx - e.w * 0.2, e.y + e.h * 0.66, 4, 'rgba(200,140,20,.4)');
    circle(cx + e.w * 0.22, e.y + e.h * 0.7, 5, 'rgba(200,140,20,.4)');
    eyes(cx, e.y + e.h * 0.44, e.w * 0.3, look, true);
    if (e.hp <= 1) { ctx.strokeStyle = 'rgba(160,90,10,.7)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(e.x + 8, e.y + 8); ctx.lineTo(e.x + 16, e.y + 18); ctx.stroke(); }
    ctx.restore();
  }
  if (e.dead) ctx.restore();
}

function drawBoss() {
  if (!boss) return;
  const b = boss, cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  if (b.dead) { ctx.save(); ctx.globalAlpha = Math.max(0, 1 - b.deadT / 1.8); ctx.translate(cx, cy); ctx.rotate(b.deadT * 2); ctx.translate(-cx, -cy); }
  shadowEllipse(cx, b.y + b.h + 2, b.w * 0.45);
  const flash = b.stunT > 0 && Math.floor(b.stunT * 12) % 2 === 0;
  const body = flash ? '#ffffff' : '#8f1a2c';
  ctx.fillStyle = body;
  ctx.beginPath();
  const N = 13;
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2;
    const r = (b.w * 0.5) * (0.82 + 0.18 * Math.sin(i * 2.7 + b.anim * 2));
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.92;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = flash ? '#ffe9ec' : '#c22c40';
  ctx.beginPath(); ctx.ellipse(cx, cy - 6, b.w * 0.32, b.h * 0.3, 0, 0, Math.PI * 2); ctx.fill();
  // 콜레스테롤 결정
  ctx.fillStyle = 'rgba(255,240,220,.92)';
  [[-28, -18, 9], [22, -24, 11], [-34, 12, 8], [30, 14, 9], [0, -34, 10]].forEach(([dx, dy, s]) => {
    ctx.save(); ctx.translate(cx + dx, cy + dy); ctx.rotate(b.anim * 0.6 + dx);
    ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(s * 0.7, 0); ctx.lineTo(0, s); ctx.lineTo(-s * 0.7, 0);
    ctx.closePath(); ctx.fill(); ctx.restore();
  });
  eyes(cx, cy - 4, b.w * 0.34, Math.sign(b.vx) || 1, true);
  ctx.fillStyle = '#2a0810';
  ctx.beginPath(); ctx.ellipse(cx, cy + b.h * 0.22, b.w * 0.16, b.h * 0.08, 0, 0, Math.PI * 2); ctx.fill();
  if (b.dead) ctx.restore();
  // 체력 핍
  if (!b.dead) {
    for (let i = 0; i < 3; i++) {
      const x = cx - 30 + i * 22, y = b.y - 18;
      circle(x, y, 8, i < b.hp ? '#ff5d73' : 'rgba(255,255,255,.2)');
      if (i < b.hp) circle(x - 2, y - 2, 3, 'rgba(255,255,255,.5)');
    }
  }
}

// ---------- 깃발 ----------
function drawFlag() {
  if (LV.boss) return;
  const x = LV.goal * TILE, base = GROUND_TOP * TILE;
  ctx.fillStyle = '#cfd6de'; ctx.fillRect(x, base - 250, 6, 250);
  circle(x + 3, base - 254, 7, '#ffd166');
  const w = Math.sin(stageT * 3) * 5;
  ctx.fillStyle = goalReached ? '#7dffb0' : '#ff8fa3';
  ctx.beginPath();
  ctx.moveTo(x + 6, base - 244); ctx.lineTo(x + 76 + w, base - 222); ctx.lineTo(x + 6, base - 200);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 20px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('🚩', x + 34, base - 222);
}

// ---------- 파티클 ----------
function drawParts() {
  for (const p of parts) {
    const a = Math.max(0, 1 - p.t / p.life);
    ctx.globalAlpha = a;
    if (p.text) {
      ctx.fillStyle = p.color; ctx.font = 'bold 17px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(p.text, p.x, p.y);
    } else {
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }
}

// ---------- 렌더 ----------
function render() {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  if (!LV) return;
  drawBG();
  ctx.save();
  let sx = 0, sy = 0;
  if (shakeT > 0) { sx = (Math.random() - 0.5) * shakeAmp; sy = (Math.random() - 0.5) * shakeAmp; }
  ctx.translate(-Math.round(camX) + sx, sy);
  drawTiles();
  drawFlag();
  drawCoins();
  drawItems();
  for (const e of enemies) drawEnemy(e);
  drawBoss();
  drawPlayer();
  drawParts();
  ctx.restore();
  // 스테이지 이름
  if (stageT < 2.6 && G.state !== 'TITLE' && G.state !== 'GUIDE') {
    const a = stageT < 2 ? 1 : 1 - (stageT - 2) / 0.6;
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(0, VIEW_H * 0.36, VIEW_W, 76);
    ctx.fillStyle = '#ffd166'; ctx.font = 'bold 34px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(`${LV.id}  ${LV.name[G.lang] || LV.name.ko}`, VIEW_W / 2, VIEW_H * 0.36 + 38);
    ctx.globalAlpha = 1;
  }
}

// ---------- 루프 ----------
let last = performance.now();
function step(dt) {
  stageT += dt;
  shakeT = Math.max(0, shakeT - dt);
  if (shakeT <= 0) shakeAmp = 0;
  if (G.state === 'PLAY') {
    updatePlayer(dt);
    updateEnemies(dt);
    updateBoss(dt);
    updateItems(dt);
    if (!player.dead && !goalReached) {
      G.timeLeft -= dt;
      if (G.timeLeft <= 0) { G.timeLeft = 0; player.dead = true; player.deadT = 0; player.vy = -420; sfx.die(); showMsg(T('timeup')); }
    }
    const target = player.x + pw() / 2 - VIEW_W * 0.42;
    let lo = 0, hi = gridW * TILE - VIEW_W;
    if (LV.boss && bossSpawned && LV.arena) {
      lo = Math.max(lo, LV.arena[0] * TILE - 40);
      hi = Math.min(hi, LV.arena[1] * TILE - VIEW_W + 40);
      if (hi < lo) hi = lo;
    }
    camX += (Math.max(lo, Math.min(hi, target)) - camX) * Math.min(1, dt * 8);
  } else if (G.state === 'QUIZ') {
    updateItems(dt);
    const fg = $('quiz-timer-fg');
    if (!G.quizAnswered) {
      G.quizT -= dt;
      fg.style.width = Math.max(0, (G.quizT / DT().quizSec) * 100) + '%';
      if (G.quizT <= 0) submitQuiz();
    }
  } else if (G.state === 'TITLE' || G.state === 'GUIDE') {
    camX = (camX + dt * 34) % Math.max(1, gridW * TILE - VIEW_W);
    updateItems(dt);
  }
  updateHUD();
}
function tick(now) {
  requestAnimationFrame(tick);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  step(dt);
  render();
}

// ---------- 시작 ----------
loadQuiz(G.lang);
buildLevel(LEVELS[0]);
applyLang();
requestAnimationFrame(tick);

window.MJ = { G, LEVELS, keys, touchState, LV: () => LV, player: () => player, enemies: () => enemies, boss: () => boss,
  items: () => items, coins: () => coins, grid: () => grid, step, render, buildLevel, startGame, nextStage,
  openQuiz, submitQuiz, QUIZ_POOL, QUIZ_SETS, rebuildPool, makeEnemy, makeItem, camX: () => camX };
