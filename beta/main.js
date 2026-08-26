// ============================================================
// 메타볼릭 디펜스 — CKLM Arcade (프로토타입 v0.1)
// 고정 화면 라이트건 디펜스 슈터. 라이트건은 절대좌표 마우스로
// 들어오므로 모든 조준/사격은 pointer 이벤트 하나로 처리한다.
// ============================================================
import * as THREE from 'three';

// ---------- 상수 ----------
const WALL_Z = -3.2;          // 간 성벽 위치
const SPAWN_Z = -62;          // 적 스폰 z
const LEAK_Z = 7;             // 성벽 통과한 적이 코어를 때리는 지점

const ENEMY_TYPES = {
  soda:   { hp: 2,  speed: 3.2, score: 150, wallDmg: 5,  sugar: true,  label: '소용돌이 캔디', labelEn: 'Swirl Candy' },
  fries:  { hp: 3,  speed: 2.2, score: 200, wallDmg: 7,  sugar: false, label: '트랜스 프라이', labelEn: 'Trans Fries' },
  burger: { hp: 8,  speed: 1.35, score: 400, wallDmg: 13, sugar: false, label: '미드나잇 버거', labelEn: 'Midnight Burger' },
  pizza:  { hp: 5,  speed: 1.8, score: 300, wallDmg: 9,  sugar: false, label: '기름진 피자', labelEn: 'Greasy Pizza' },
  ramen:  { hp: 6,  speed: 1.5, score: 350, wallDmg: 11, sugar: false, label: '나트륨 컵라면', labelEn: 'Sodium Cup Noodles' },
  icecream: { hp: 2, speed: 2.8, score: 200, wallDmg: 6, sugar: true,  label: '아이스크림 콘', labelEn: 'Mint-Choco Cone' },
  ciga:   { hp: 3,  speed: 2.5, score: 250, wallDmg: 8,  sugar: false, label: '꽁초 니코틴', labelEn: 'Nicotine Butt' },
  soju:   { hp: 4,  speed: 2.0, score: 320, wallDmg: 6,  sugar: false, liverX: 2.4, label: '초록 소주병', labelEn: 'Green Soju Bottle' },
  donut:  { hp: 1,  speed: 3.4, score: 250, wallDmg: 0,  sugar: true,  fly: true, label: '슈가 도넛', labelEn: 'Sugar Donut' },
  moth:   { hp: 1,  speed: 4.2, score: 250, wallDmg: 0,  sugar: false, fly: true, label: '날아온 과자봉지', labelEn: 'Flying Chip Bag' },
  // 보스 3종 (판마다 로테이션)
  boss:   { hp: 45, speed: 0.85, score: 2000, wallDmg: 30, sugar: false, boss: true, label: '킹 버거', labelEn: 'King Burger' },
  cancer: { hp: 40, speed: 0.95, score: 2200, wallDmg: 26, sugar: false, boss: true, splits: 4, label: '암세포', labelEn: 'Cancer Cell' },
  plaque: { hp: 34, speed: 1.25, score: 2400, wallDmg: 34, sugar: false, boss: true, ram: true, label: '죽상경화 플라크', labelEn: 'Atherosclerotic Plaque' },
  cancerlet: { hp: 2, speed: 3.4, score: 150, wallDmg: 5, sugar: false, label: '암세포 조각', labelEn: 'Cancer Fragment' },
};
const BOSS_POOL = ['boss', 'cancer', 'plaque'];
const BOSS_INTRO = {
  ko: { boss: '👑 킹 버거 등장! 영양성분표가 약점이에요',
        cancer: '🧬 암세포 등장! 쓰러뜨리면 조각으로 흩어져요',
        plaque: '🩸 죽상경화 플라크 등장! 간 성벽을 뚫고 코어로 돌진해요' },
  en: { boss: '👑 King Burger! The nutrition label is its weak point',
        cancer: '🧬 Cancer Cell! It splits into fragments when destroyed',
        plaque: '🩸 Atherosclerotic Plaque! It rams through the liver wall to the core' },
};

const WAVES = [
  { name: 'WAVE 1', duration: 35,
    spawns: [ { type: 'soda', interval: 2.3, firstAt: 1.0 }, { type: 'fries', interval: 4.6, firstAt: 3.0 }, { type: 'icecream', interval: 7, firstAt: 8.0 } ],
    events: [] },
  { name: 'WAVE 2', duration: 55,
    spawns: [ { type: 'soda', interval: 1.9, firstAt: 1.0 }, { type: 'fries', interval: 3.4, firstAt: 2.0 }, { type: 'burger', interval: 10, firstAt: 6.0 }, { type: 'pizza', interval: 9, firstAt: 8.0 }, { type: 'icecream', interval: 6.5, firstAt: 4.0 }, { type: 'ciga', interval: 12, firstAt: 14.0 }, { type: 'soju', interval: 14, firstAt: 24.0 }, { type: 'donut', interval: 10, firstAt: 9.0 } ],
    events: [ { t: 13, type: 'trap' }, { t: 38, type: 'trap' } ] },
  { name: 'FINAL WAVE', duration: 65,
    spawns: [ { type: 'soda', interval: 1.6, firstAt: 1.0 }, { type: 'fries', interval: 3.0, firstAt: 2.0 }, { type: 'burger', interval: 8.5, firstAt: 5.0 }, { type: 'pizza', interval: 7.5, firstAt: 3.0 }, { type: 'ramen', interval: 9.5, firstAt: 7.0 }, { type: 'icecream', interval: 6, firstAt: 4.5 }, { type: 'ciga', interval: 10, firstAt: 9.0 }, { type: 'soju', interval: 12, firstAt: 17.0 }, { type: 'donut', interval: 8, firstAt: 6.0 }, { type: 'moth', interval: 9, firstAt: 11.0 } ],
    events: [ { t: 9, type: 'boss' }, { t: 34, type: 'boss' }, { t: 30, type: 'trap' } ] },
];

// 문제은행은 AASLD 'Unmasking MASH and MASLD' 덱 추출본만 사용 (ko/en 분리 파일)
// 언어·난이도는 시작 화면에서 선택. ?lang=en 은 초기 선택값만 바꾼다
const QUIZ_LANG_INIT = new URLSearchParams(location.search).get('lang') === 'en' ? 'en' : 'ko';

// ?layout=<코드> 로 열면 다른 컴퓨터에서 내보낸 배치(루트·둔덕·포탑)를 이어받는다 (9키 = 내보내기)
try {
  const lp = new URLSearchParams(location.search).get('layout');
  if (lp) {
    const lay = JSON.parse(decodeURIComponent(escape(atob(lp))));
    if (lay.routes) localStorage.setItem('xgb_routes', JSON.stringify(lay.routes));
    if (lay.walls) localStorage.setItem('xgb_fatwalls2', JSON.stringify(lay.walls));
    if (lay.organs) localStorage.setItem('xgb_organs', JSON.stringify(lay.organs));
  }
} catch (err) { /* 무시 */ }
const QUIZ_POOL = [];
function loadQuizLang(lang) {
  fetch(`../assets/quiz_aasld_${lang}.json`)
    .then((r) => r.json())
    .then((qs) => {
      QUIZ_POOL.length = 0;
      for (const q of qs) {
        if (q.q && Array.isArray(q.a) && q.a.length === 4) QUIZ_POOL.push({ q: q.q, a: q.a, correct: q.correct || 0, diff: q.diff || 'mid' });
      }
      G.quizDeck = [...QUIZ_POOL].sort(() => Math.random() - 0.5);
    })
    .catch(() => {});
}

loadQuizLang(QUIZ_LANG_INIT);

// 무기 성장: 트랩 아이템 퀴즈·웨이브 퀴즈 정답으로 승급
const WEAPONS = [
  { name: '새총',     en: 'Slingshot',   icon: '🪀', dmg: 1, cd: 0.46, flash: 0xd9c9a8, beam: false, mag: 6,  rl: 1.3 },
  { name: '석궁',     en: 'Crossbow',    icon: '🏹', dmg: 1, cd: 0.28, flash: 0xd9c9a8, beam: false, mag: 5,  rl: 1.5 },
  { name: '화승총',   en: 'Matchlock',   icon: '🧨', dmg: 2, cd: 0.42, flash: 0xffb060, beam: false, mag: 1,  rl: 1.7 },
  { name: '권총',     en: 'Pistol',      icon: '🔫', dmg: 2, cd: 0.18, flash: 0xffe9a8, beam: false, mag: 12, rl: 1.2 },
  { name: '샷건',     en: 'Shotgun',     icon: '💥', dmg: 1, cd: 0.55, flash: 0xffc070, beam: false, pellets: 5, mag: 6, rl: 1.9 },
  { name: '기관단총', en: 'SMG',         icon: '⚙️', dmg: 1, cd: 0.08, flash: 0xffe9a8, beam: false, mag: 30, rl: 1.6 },
  { name: '소총',     en: 'Rifle',       icon: '🎯', dmg: 3, cd: 0.14, flash: 0xfff2c8, beam: false, mag: 20, rl: 1.6 },
  { name: '기관총',   en: 'Machine Gun', icon: '🔩', dmg: 2, cd: 0.36, flash: 0xfff2c8, beam: false, burst: 3, mag: 45, rl: 2.3 },
  { name: '바주카',   en: 'Bazooka',     icon: '🚀', dmg: 5, cd: 0.75, flash: 0xffa060, beam: false, rocket: true, splash: 3.2, splashDmg: 2, mag: 1, rl: 2.1 },
  { name: '레이저',   en: 'Laser',       icon: '⚡', dmg: 4, cd: 0.10, flash: 0x8ff2ff, beam: true, mag: 40, rl: 1.4 },
];
function wName(i) { const w = WEAPONS[i]; return G.lang === 'en' ? w.en : w.name; }

// ---------- 문자열 테이블 (전체 이중 언어) ----------
const STR = {
  ko: {
    lblCore: 'CORE (심장·콩팥·뇌혈관)', lblMeta: '대사 건강 (M)', lblSugar: '혈당',
    lblLiver: '🟤 간 성벽 (L)', lblPanc: '인슐린 망루 (췌장) 🔵',
    liverStage: ['건강해요 · 정화 파동 가동 중', '지방간(MASLD) · 파동이 느려져요', 'MASH · 파동이 많이 느려져요', '섬유화 · 파동이 거의 멎어가요'],
    liverShort: ['건강', '지방간(MASLD)', 'MASH', '섬유화'],
    pancDown: '⛔ 췌장부전 · 회복 불가',
    pancOk: (n) => `기능 ${n}% · 지원 사격 중`, pancWeak: (n) => `기능 ${n}% · 인슐린이 약해졌어요`,
    pancTired: (n) => `기능 ${n}% · 과로 상태!`, pancResist: (n) => `기능 ${n}% · 무력화(인슐린 저항성)`,
    waveStart: (n) => `${n} 시작!`, finalWave: '🚨 최종 웨이브! 좌측 혈관 파이프까지 열렸어요',
    trapWarn: '⚠️ 내장지방 덫! 자물쇠를 쏴서 지방이를 구해주세요',
    rescue: '🔥 지방이 구출! 에너지로 연소 +800',
    shotBlob: '😢 지방이를 맞히면 안 돼요! 보너스가 사라졌어요',
    dragged: '🫠 내장지방이 간으로 흘러갔어요… 간이 더 굳습니다',
    wallHint: '🟡 지방 둔덕이 길을 막고 있어요! 뚫으려면 꽤 맞혀야 해요',
    wallDown: '🧨 지방 둔덕 제거! +1,000 · 보너스 퀴즈 찬스',
    leak: '💔 성벽이 뚫렸어요! 코어가 공격받았습니다',
    flyHit: '🪽 날아드는 간식이 코어를 스쳤어요!',
    pancResistWarn: '💉 인슐린 저항성! 쏘고는 있지만 거의 듣지 않아요',
    pancFail: '⛔ 췌장부전… 이번 판엔 인슐린이 다시 나오지 않아요',
    sojuHit: '🍶 알코올이 간을 직접 때렸어요!',
    cancerSplit: '🧬 암세포가 조각으로 분열했어요!',
    plaqueRam: '🩸 플라크가 성벽을 뚫고 돌진해요!',
    bossKill: (l, g) => `${l} 격파! +${g}`,
    weaponUp: (i, n) => `⬆️ 무기 업그레이드! ${i} ${n} 획득`,
    reloading: '재장전', reloadHint: '⟳ 재장전 중… 우클릭으로 무기를 바꿀 수 있어요',
    swap: (i, n) => `🔄 ${i} ${n}(으)로 교체`,
    quizTagWave: 'QUIZ TIME · 정답을 쏘세요!', quizTagItem: 'ITEM CHANCE · 정답을 쏘면 보상!',
    quizSubWave: '정답을 맞히면 간 성벽이 수리되고 췌장이 회복되고 무기도 좋아져요',
    quizSubItem: '정답이면 무기 업그레이드, 무기가 최고면 간 회복 포션을 얻어요',
    okWave: (g) => `정답! +${g} · 간 성벽이 수리되고 췌장이 회복됐어요`,
    okItemGun: (g) => `정답! +${g} · 새 무기를 손에 넣었어요`,
    okItemPot: (g) => `정답! +${g} · 🧪 간 회복 포션! 간이 부드러워졌어요`,
    ngItem: (a) => `아쉬워요! 정답은 "${a}" — 보상 없이 전투로 복귀해요`,
    ngWave: (a) => `아쉬워요! 정답은 "${a}" — 수리 없이 다음 웨이브로 가요`,
    grades: [[60000, 'S · 대사 마스터'], [42000, 'A · 간 지킴이'], [28000, 'B · 성실한 수호자'], [0, 'C · 다음엔 더 잘할 수 있어요']],
    defeat: '💔 코어 함락 · 다시 도전해요',
    repCK: '심장·콩팥·뇌혈관', repL: '간 상태', repM: '대사 건강', repQ: '지식 점수',
    breakdown: (a, b, c, n, w) => `사격 ${a} · 퀴즈 ${b} · 지방이 구출 ${c} (${n}명) · 최종 무기 ${w}`,
    finishBonus: (v) => `<br>피니시 보너스 ${v} — 장기를 건강하게 지킬수록 점수가 커져요`,
    pancNote: '<br>⚠️ 이번 판엔 췌장부전까지 진행됐어요. 저항성(무력화) 단계에서 당류 적을 빨리 정리하면 부전을 막을 수 있어요',
  },
  en: {
    lblCore: 'CORE (Heart · Kidney · Brain)', lblMeta: 'Metabolic health (M)', lblSugar: 'Blood glucose',
    lblLiver: '🟤 Liver Wall (L)', lblPanc: 'Insulin Turret (Pancreas) 🔵',
    liverStage: ['Healthy · detox pulse active', 'Steatosis (MASLD) · pulse slowing', 'MASH · pulse much slower', 'Fibrosis · pulse nearly stopped'],
    liverShort: ['Healthy', 'MASLD', 'MASH', 'Fibrosis'],
    pancDown: '⛔ Pancreatic failure · unrecoverable',
    pancOk: (n) => `Function ${n}% · supporting fire`, pancWeak: (n) => `Function ${n}% · insulin weakening`,
    pancTired: (n) => `Function ${n}% · overworked!`, pancResist: (n) => `Function ${n}% · blunted (insulin resistance)`,
    waveStart: (n) => `${n} START!`, finalWave: '🚨 Final wave! The left vessel pipe is open too',
    trapWarn: '⚠️ Visceral fat trap! Shoot the lock to free Fatty',
    rescue: '🔥 Fatty freed! Burned as energy +800',
    shotBlob: '😢 Never shoot Fatty! Bonus lost',
    dragged: '🫠 Visceral fat drifted into the liver… it hardens further',
    wallHint: '🟡 A fat mound blocks the path! It takes many hits to clear',
    wallDown: '🧨 Fat mound cleared! +1,000 · bonus quiz',
    leak: '💔 The wall was breached! The core is under attack',
    flyHit: '🪽 A flying snack grazed the core!',
    pancResistWarn: '💉 Insulin resistance! Still firing, but barely working',
    pancFail: '⛔ Pancreatic failure… no more insulin this run',
    sojuHit: '🍶 Alcohol hit the liver directly!',
    cancerSplit: '🧬 The cancer split into fragments!',
    plaqueRam: '🩸 The plaque smashed through the wall!',
    bossKill: (l, g) => `${l} down! +${g}`,
    weaponUp: (i, n) => `⬆️ Weapon upgrade! Got ${i} ${n}`,
    reloading: 'RELOAD', reloadHint: '⟳ Reloading… right-click to switch weapons',
    swap: (i, n) => `🔄 Switched to ${i} ${n}`,
    quizTagWave: 'QUIZ TIME · Shoot the answer!', quizTagItem: 'ITEM CHANCE · Answer right for a reward!',
    quizSubWave: 'A correct answer repairs the liver wall, revives the pancreas and upgrades your weapon',
    quizSubItem: 'Correct = weapon upgrade; if maxed, you get a liver recovery potion',
    okWave: (g) => `Correct! +${g} · liver wall repaired, pancreas recovered`,
    okItemGun: (g) => `Correct! +${g} · new weapon acquired`,
    okItemPot: (g) => `Correct! +${g} · 🧪 Liver potion! The liver softened`,
    ngItem: (a) => `Close! The answer was "${a}" — back to battle with no reward`,
    ngWave: (a) => `Close! The answer was "${a}" — on to the next wave without repairs`,
    grades: [[60000, 'S · Metabolic Master'], [42000, 'A · Liver Guardian'], [28000, 'B · Steady Defender'], [0, 'C · Better luck next run']],
    defeat: '💔 Core lost · try again',
    repCK: 'Heart · Kidney · Brain', repL: 'Liver stage', repM: 'Metabolic health', repQ: 'Knowledge',
    breakdown: (a, b, c, n, w) => `Shooting ${a} · Quiz ${b} · Fatty rescues ${c} (${n}) · Final weapon ${w}`,
    finishBonus: (v) => `<br>Finish bonus ${v} — the healthier your organs, the bigger the score`,
    pancNote: '<br>⚠️ The pancreas failed this run. Clearing sugar enemies fast during the resistance stage prevents it',
  },
};
function eLabel(def) { return G.lang === 'en' ? (def.labelEn || def.label) : def.label; }
function T(k, ...a) {
  const t = (STR[G.lang] || STR.ko)[k];
  return typeof t === 'function' ? t(...a) : t;
}

// ---------- 게임 상태 ----------
const G = {
  state: 'START',            // START | WAVE | QUIZ | RESULT
  score: 0, shootScore: 0, quizScore: 0, rescueScore: 0, finishBonus: 0,
  streak: 0,
  core: 100, metabolic: 100, sugar: 8,
  fibrosis: 0,               // 간: 0=건강 100=완전 섬유화
  beta: 100,                 // 췌장 베타세포 기능
  pancDown: false,
  waveIdx: 0, waveT: 0, spawnTimers: [], firedEvents: new Set(),
  quizDeck: [], currentQuiz: null, quizMode: 'wave', quizTotal: 0,
  quizT: 0, quizAnswered: false, quizCorrectCount: 0,
  weapon: 0, pipeOpen: false, quizDiff: 'mid', liverPulseT: 4,
  pancStrain: 0, pancWarned: false, bossesUsed: [],
  lang: 'ko', ammo: {}, reloadT: 0, nextWeaponScore: 18000,
  fatsRescued: 0, fatsLost: 0,
  fireCooldown: 0,
  over: false,
};

const enemies = [];
const traps = [];
const projectiles = [];
const particles = [];

// ---------- DOM ----------
const $ = (id) => document.getElementById(id);
const canvas = $('game-canvas');
const crosshair = $('crosshair');
const hud = $('hud');

// ---------- 오디오 (미니 블립) ----------
let AC = null;
function audio() { if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)(); return AC; }
function beep(freq, dur = 0.08, type = 'square', gain = 0.05, slide = 0) {
  try {
    const ctx = audio(); const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), ctx.currentTime + dur);
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    o.connect(g).connect(ctx.destination); o.start(); o.stop(ctx.currentTime + dur + 0.02);
  } catch (e) { /* 오디오 실패는 무시 */ }
}
const sfx = {
  shoot: () => beep(140, 0.07, 'square', 0.06, -80),
  hit: () => beep(620, 0.05, 'triangle', 0.05),
  kill: () => { beep(520, 0.07, 'triangle', 0.05); setTimeout(() => beep(780, 0.09, 'triangle', 0.05), 60); },
  dmg: () => beep(85, 0.22, 'sawtooth', 0.09),
  ok: () => { beep(660, 0.1, 'sine', 0.07); setTimeout(() => beep(880, 0.16, 'sine', 0.07), 90); },
  no: () => beep(160, 0.25, 'sawtooth', 0.06, -60),
  rescue: () => { beep(700, 0.08, 'sine', 0.06); setTimeout(() => beep(940, 0.08, 'sine', 0.06), 70); setTimeout(() => beep(1180, 0.14, 'sine', 0.06), 140); },
};

// ---------- 렌더러 / 씬 ----------
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// 16:9 고정 스테이지 — 부스 TV 기준. 창이 어떤 비율이든 레터박스로 유지
const ASPECT = 16 / 9;
const stage = document.getElementById('stage');
function layoutStage() {
  let w = window.innerWidth, h = window.innerHeight;
  if (w / h > ASPECT) w = Math.round(h * ASPECT); else h = Math.round(w / ASPECT);
  stage.style.width = w + 'px'; stage.style.height = h + 'px';
  stage.style.left = Math.round((window.innerWidth - w) / 2) + 'px';
  stage.style.top = Math.round((window.innerHeight - h) / 2) + 'px';
  renderer.setSize(w, h, false);
}
layoutStage();

const scene = new THREE.Scene();
scene.background = null;   // 배경은 스테이지의 이미지(assets/bg.jpg)가 담당
scene.fog = new THREE.Fog(0x4a2440, 30, 90);

const camera = new THREE.PerspectiveCamera(58, ASPECT, 0.1, 200);
camera.position.set(0, 9, 11);
camera.lookAt(0, -1.5, -18);   // 배경 이미지의 원근에 정합
scene.add(camera);

window.addEventListener('resize', layoutStage);

// ---------- 조명 ----------
scene.add(new THREE.AmbientLight(0xffe2cf, 1.15));
const hemi = new THREE.HemisphereLight(0xffe8d0, 0x8a4a5a, 0.9); scene.add(hemi);
const dir = new THREE.DirectionalLight(0xffd9b0, 2.0); dir.position.set(-4, 16, 6); scene.add(dir);  // 이미지 좌상단 빛줄기 방향
const pulse = new THREE.PointLight(0xff5d73, 60, 70, 1.1); pulse.position.set(-10, 8, -26); scene.add(pulse); // 이미지 속 심장 위치의 고동
const corridor = new THREE.PointLight(0xffe2cc, 40, 80, 1.0); corridor.position.set(0, 12, -12); scene.add(corridor);

// ---------- 환경: 배경 이미지(assets/bg.jpg) 정합 월드 ----------
// 배경은 2D 이미지가 담당하고 3D는 게임 오브젝트만 그린다. PATH는 이미지 속
// 구불길을 y=0 평면으로 역투영해 얻은 좌표라, 적이 그림의 길을 그대로 걸어온다.
// 두 갈래 진입 루트가 합류점에서 만나 메인 길로 내려온다 (전부 이미지 역투영 좌표)
const MAIN_PTS = [               // 합류점 → 화면 하단 방어선
  new THREE.Vector3(-1.5, 0, -18.9),
  new THREE.Vector3(-3.7, 0, -13.9),
  new THREE.Vector3(-4.3, 0, -8.1),
  new THREE.Vector3(-0.7, 0, -4.6),
  new THREE.Vector3(1.9, 0, -1.4),
  new THREE.Vector3(0.4, 0, 1.0),
  new THREE.Vector3(-1.2, 0, 3.0),
];
const ROUTE_TUNNEL = [           // 터널 → 로터리를 시계방향으로 → 합류점
  new THREE.Vector3(13.1, 0, -46.3),
  new THREE.Vector3(11.4, 0, -33.7),
  new THREE.Vector3(10.9, 0, -25.4),
  new THREE.Vector3(7.2, 0, -20.6),
  new THREE.Vector3(3.5, 0, -19.3),
  new THREE.Vector3(0.5, 0, -19.8),
];
const ROUTE_HEART = [            // 심장 옆 원경 길 → 아치 아래 → 메인길 왼쪽 굽이로 합류
  new THREE.Vector3(-41.7, 0, -58.3),
  new THREE.Vector3(-27.5, 0, -46.3),
  new THREE.Vector3(-18.6, 0, -39.3),
  new THREE.Vector3(-14.9, 0, -41.5),
  new THREE.Vector3(-9.5, 0, -31),
  new THREE.Vector3(-6.2, 0, -21),
];
function makeRoute(feeder, mainFrom = 0) {
  const curve = new THREE.CatmullRomCurve3([...feeder, ...MAIN_PTS.slice(mainFrom)]);
  return { curve, len: curve.getLength() };
}
const ROUTE_PIPE = [             // 좌측 혈관 파이프 → 왼쪽 굽이 합류 (최종 웨이브에 열리는 지름길)
  new THREE.Vector3(-16, 0, -10.5),
  new THREE.Vector3(-11.9, 0, -9.5),
  new THREE.Vector3(-8.1, 0, -8.6),
];
const ROUTES = [makeRoute(ROUTE_TUNNEL), makeRoute(ROUTE_HEART, 1), makeRoute(ROUTE_PIPE, 2)];  // 심장=왼쪽 굽이 합류, 파이프=지름길
const DEFAULT_ROUTES = ROUTES.map((r) => r.curve.points.map((p) => [+p.x.toFixed(1), +p.z.toFixed(1)]));

function applyRoutePoints(idx, pts) {
  const curve = new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, 0, z)));
  ROUTES[idx].curve = curve; ROUTES[idx].len = curve.getLength();
}
// 디버그 편집기로 그린 루트가 있으면 복원
try {
  const store = JSON.parse(localStorage.getItem('xgb_routes') || '{}');
  for (const k of [0, 1, 2]) if (store[k]) applyRoutePoints(k, store[k]);
} catch (err) { /* 무시 */ }

// 보이지 않는 지면 — 색은 안 그리고 깊이만 기록해서, 가라앉는 적이 지형에 가려진 것처럼 보이게
const ground = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), new THREE.MeshBasicMaterial({ colorWrite: false }));
ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0, -20); ground.renderOrder = -2; scene.add(ground);

// 은은한 부유 입자 (이미지의 빛줄기에 맞춘 금빛 보케)
const RBC_N = 24;
const rbcGeo = new THREE.SphereGeometry(0.5, 10, 8); rbcGeo.scale(1, 0.5, 1);
const rbcMat = new THREE.MeshBasicMaterial({ color: 0xffd9a8, transparent: true, opacity: 0.28 });
const rbc = new THREE.InstancedMesh(rbcGeo, rbcMat, RBC_N);
const rbcData = [];
const dummy = new THREE.Object3D();
for (let i = 0; i < RBC_N; i++) {
  rbcData.push({
    x: (Math.random() - 0.5) * 30, y: 3 + Math.random() * 8, z: -40 + Math.random() * 46,
    s: 0.25 + Math.random() * 0.4, spin: 0, wob: 0.5 + Math.random(),
  });
}
scene.add(rbc);

// ---------- 코어 (심장·콩팥·뇌혈관) ----------
function makeCore(color, x) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 14),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.55, roughness: 0.4 }));
  m.position.set(x * 1.5, 5.1, WALL_Z - 0.4); m.visible = false; scene.add(m); return m;  // 코어는 HUD로만 표시
}
const coreMeshes = [makeCore(0xff5d73, -4), makeCore(0xc98a5a, 0), makeCore(0xd9a0ff, 4)];

// ---------- 간 성벽 ----------
const liverGroup = new THREE.Group();
const liverMat = new THREE.MeshStandardMaterial({ color: 0xb5493a, roughness: 0.6, emissive: 0x3d0f08, emissiveIntensity: 0.6 });
const liverBody = new THREE.Mesh(new THREE.BoxGeometry(17, 3.1, 1.7), liverMat);
liverBody.position.y = 1.55; liverGroup.add(liverBody);
for (let i = 0; i < 7; i++) {  // 유기적인 혹 느낌
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.65 + Math.random() * 0.35, 12, 10), liverMat);
  b.position.set(-7 + i * 2.35, 3.0 + Math.random() * 0.4, (Math.random() - 0.5) * 0.8);
  liverGroup.add(b);
}
liverGroup.position.z = WALL_Z; liverGroup.visible = false; scene.add(liverGroup);  // 성벽 시각화는 하단 간 상태 틴트로 대체

// ---------- 췌장 포탑 + 간 수호탑 (업로드 스프라이트) ----------
const texLoader = new THREE.TextureLoader();
function makeOrganSprite(url, size, x, y, z) {
  const tex = texLoader.load(url);
  tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
  m.position.set(x, y, z);
  m.quaternion.copy(camera.quaternion);   // 고정 카메라 빌보드
  m.renderOrder = 2;
  scene.add(m);
  return m;
}
const pancSprite = makeOrganSprite('../assets/pancreas.png', 5.4, 7.6, 2.5, -1.6);   // 우하단, 좌우반전으로 총구가 길 쪽(왼쪽)
pancSprite.scale.x = -1;
const liverSprite = makeOrganSprite('../assets/liver.png', 4.8, -3.2, 2.3, 1.9);     // 방어선 전면의 간 수호탑
const pancTip = new THREE.Object3D();
pancTip.position.set(5.7, 3.2, -1.6);   // 반전된 대포의 총구 지점
scene.add(pancTip);

// 포탑 위치: 디버그 편집(4·5키)으로 이동 가능, localStorage 저장
const ORGAN_DEFAULTS = { liver: [-3.2, 1.9], panc: [7.6, -1.6] };
function placeOrgan(which, x, z) {
  if (which === 'liver') { liverSprite.position.x = x; liverSprite.position.z = z; }
  else { pancSprite.position.x = x; pancSprite.position.z = z; pancTip.position.set(x - 1.9, 3.2, z); }
}
try {
  const o = JSON.parse(localStorage.getItem('xgb_organs') || '{}');
  if (o.liver) placeOrgan('liver', o.liver[0], o.liver[1]);
  if (o.panc) placeOrgan('panc', o.panc[0], o.panc[1]);
} catch (err) { /* 무시 */ }

// ---------- 간 정화 파동: 주기적 광역 해독 — 지상 적 전체 체력을 조금씩 깎는다 ----------
// 간이 굳을수록(섬유화) 파동 주기가 느려진다. 묵묵하지만 확실한 지원.
const LIVER_PULSE_INTERVAL = [6, 7.5, 9, 12];   // 단계별 주기(초)
const LIVER_PULSE_RANGE = 16;
const liverRings = [];
function spawnLiverRing() {
  const m = new THREE.Mesh(new THREE.RingGeometry(0.6, 1.0, 40),
    new THREE.MeshBasicMaterial({ color: 0x7dffb0, transparent: true, opacity: 0.75, side: THREE.DoubleSide, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  m.position.set(liverSprite.position.x, 0.15, liverSprite.position.z);
  m.renderOrder = 3;
  scene.add(m);
  liverRings.push({ mesh: m, life: 1.0 });
}
function liverRingsUpdate(dt) {
  for (const r of [...liverRings]) {
    r.life -= dt * 1.1;
    r.mesh.scale.setScalar(1 + (1 - r.life) * 16);
    r.mesh.material.opacity = Math.max(0, r.life) * 0.7;
    if (r.life <= 0) { scene.remove(r.mesh); liverRings.splice(liverRings.indexOf(r), 1); }
  }
}
function liverPulseUpdate(dt) {
  G.liverPulseT -= dt;
  if (G.liverPulseT > 0) return;
  G.liverPulseT = LIVER_PULSE_INTERVAL[liverStage()];
  spawnLiverRing();
  beep(520, 0.14, 'sine', 0.045);
  for (const e of [...enemies]) {
    if (e.def.fly || e.state === 'dying') continue;
    const dx = e.mesh.position.x - liverSprite.position.x;
    const dz = e.mesh.position.z - liverSprite.position.z;
    if (dx * dx + dz * dz > LIVER_PULSE_RANGE * LIVER_PULSE_RANGE) continue;
    e.hp -= 1;
    damageFx(e, e.mesh.position.clone().add(new THREE.Vector3(0, 1, 0)), 0x7dffb0, 5);
    if (e.hp <= 0) killEnemy(e, false);   // 간이 처리 — 점수 없음 (묵묵히)
  }
}

// ---------- 총 뷰모델 (손 + 총) — 무기 티어별로 다른 디자인 ----------
const gun = new THREE.Group();
gun.scale.setScalar(0.72); gun.rotation.y = -0.1;
gun.position.set(0.6, -0.6, -1.45); camera.add(gun);
let gunKick = 0;
let muzzle = null;

function buildGunModel(tier) {
  const g = new THREE.Group();
  const W = WEAPONS[tier];
  // 공통: 손 + 소매
  const hand = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xe8b48f, roughness: 0.8 }));
  hand.position.set(0, -0.28, 0.1); g.add(hand);
  const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.21, 0.16, 10),
    new THREE.MeshStandardMaterial({ color: 0x2f6d5a, roughness: 0.7 }));
  cuff.position.set(0, -0.34, 0.26); cuff.rotation.x = 1.35; g.add(cuff);
  const mz = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6),
    new THREE.MeshBasicMaterial({ color: W.flash, transparent: true, opacity: 0 }));

  const wood = () => new THREE.MeshStandardMaterial({ color: 0x7a5230, roughness: 0.68 });
  const darkWood = () => new THREE.MeshStandardMaterial({ color: 0x5a3a20, roughness: 0.7 });
  const steel = (c = 0x33383f) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.38, metalness: 0.65 });
  const brass = () => new THREE.MeshStandardMaterial({ color: 0xc9a84c, roughness: 0.28, metalness: 0.8 });

  if (tier === 0) {          // 새총: Y자 나무 프레임 + 고무줄 + 돌
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.5, 8), darkWood());
    handle.position.set(0, -0.12, 0.02); g.add(handle);
    for (const s of [-1, 1]) {
      const fork = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.55, 7), darkWood());
      fork.position.set(s * 0.16, 0.28, -0.06); fork.rotation.z = s * -0.42; g.add(fork);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.62, 6),
        new THREE.MeshStandardMaterial({ color: 0x8a2a2a, roughness: 0.85 }));
      band.position.set(s * 0.2, 0.28, -0.32); band.rotation.set(-0.9, 0, s * -0.3); g.add(band);
    }
    const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.11, 0.04),
      new THREE.MeshStandardMaterial({ color: 0x4a3524, roughness: 0.8 }));
    pouch.position.set(0, 0.18, -0.6); g.add(pouch);
    const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.075),
      new THREE.MeshStandardMaterial({ color: 0x8a8f96, roughness: 0.9 }));
    stone.position.set(0, 0.18, -0.62); g.add(stone);
    mz.position.set(0, 0.2, -0.75); mz.scale.setScalar(0.7);
  } else if (tier === 1) {   // 석궁: 활대 + 시위 + 볼트
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.15, 0.95), wood());
    stock.position.set(0, 0, -0.35); g.add(stock);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.9), darkWood());
    rail.position.set(0, 0.1, -0.4); g.add(rail);
    for (const s of [-1, 1]) {
      const limb = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.07), darkWood());
      limb.position.set(s * 0.26, 0.03, -0.72); limb.rotation.y = s * 0.5; g.add(limb);
      const tipc = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 5), brass());
      tipc.position.set(s * 0.5, 0.03, -0.6); g.add(tipc);
    }
    const string = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.0, 5),
      new THREE.MeshBasicMaterial({ color: 0xf2ede0 }));
    string.rotation.z = Math.PI / 2; string.position.set(0, 0.03, -0.52); g.add(string);
    const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.7, 6),
      new THREE.MeshStandardMaterial({ color: 0xd9c9a8, roughness: 0.5 }));
    bolt.rotation.x = Math.PI / 2; bolt.position.set(0, 0.14, -0.5); g.add(bolt);
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 6), steel(0x9aa0a8));
    head.rotation.x = -Math.PI / 2; head.position.set(0, 0.14, -0.88); g.add(head);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.35, 0.2), wood());
    grip.position.set(0, -0.2, 0.02); grip.rotation.x = 0.25; g.add(grip);
    mz.position.set(0, 0.14, -0.95); mz.scale.setScalar(0.8);
  } else if (tier === 2) {   // 화승총: 긴 철 총열 + 황동 밴드 + 화승 심지
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.075, 1.25, 10), steel(0x3a3f45));
    barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.08, -0.55); g.add(barrel);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.2, 0.75), wood());
    stock.position.set(0, -0.03, 0.05); stock.rotation.x = -0.08; g.add(stock);
    for (const dz of [-0.75, -0.35]) {
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.07, 10), brass());
      band.rotation.x = Math.PI / 2; band.position.set(0, 0.08, dz); g.add(band);
    }
    const pan = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.14), brass());
    pan.position.set(0.09, 0.06, -0.1); g.add(pan);
    const match = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.26, 5),
      new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.9 }));
    match.position.set(0.11, 0.2, -0.06); match.rotation.z = -0.5; g.add(match);
    const ember = new THREE.Mesh(new THREE.SphereGeometry(0.028, 6, 5),
      new THREE.MeshBasicMaterial({ color: 0xff7a2a }));
    ember.position.set(0.17, 0.3, -0.06); g.add(ember);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.34, 0.2), wood());
    grip.position.set(0, -0.24, 0.15); grip.rotation.x = 0.3; g.add(grip);
    mz.position.set(0, 0.08, -1.2); mz.scale.setScalar(1.4);
  } else if (tier === 3) {   // 권총: 슬라이드 + 세레이션 + 조준기
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.2, 0.9), steel(0x2a2d34));
    frame.position.set(0, 0.07, -0.45); g.add(frame);
    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.16, 0.62), steel(0x1c4a38));
    slide.position.set(0, 0.21, -0.32); g.add(slide);
    for (let i = 0; i < 4; i++) {   // 슬라이드 세레이션
      const ser = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.13, 0.015), steel(0x14382a));
      ser.position.set(0, 0.21, -0.06 - i * 0.045); g.add(ser);
    }
    const sight = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.04), steel(0x11141a));
    sight.position.set(0, 0.31, -0.6); g.add(sight);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.42, 0.22), steel(0x24262c));
    grip.position.set(0, -0.22, 0.05); grip.rotation.x = 0.25; g.add(grip);
    const trig = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.02, 6, 12, Math.PI), steel(0x2a2d34));
    trig.position.set(0, -0.06, -0.15); trig.rotation.set(Math.PI / 2, 0, 0); g.add(trig);
    mz.position.set(0, 0.07, -0.95);
  } else if (tier === 4) {   // 샷건: 쌍열 + 펌프 + 탄띠
    for (const dx of [-0.06, 0.06]) {
      const b2 = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 1.05, 10), steel(0x33383f));
      b2.rotation.x = Math.PI / 2; b2.position.set(dx, 0.1, -0.5); g.add(b2);
    }
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.2, 0.6), wood());
    stock.position.set(0, -0.02, 0.05); stock.rotation.x = -0.1; g.add(stock);
    const pump = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.13, 0.32), darkWood());
    pump.position.set(0, -0.03, -0.55); g.add(pump);
    for (let i = 0; i < 3; i++) {   // 개머리판 탄띠
      const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.11, 8),
        new THREE.MeshStandardMaterial({ color: 0xd9483b, roughness: 0.5 }));
      sh.rotation.z = Math.PI / 2; sh.position.set(0.12, 0.02 - i * 0.09, 0.12); g.add(sh);
    }
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.34, 0.2), wood());
    grip.position.set(0, -0.23, 0.15); grip.rotation.x = 0.3; g.add(grip);
    mz.position.set(0, 0.1, -1.05); mz.scale.setScalar(1.6);
  } else if (tier === 5) {   // 기관단총: 긴 탄창 + 앞손잡이 + 접이식 개머리
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 0.7), steel(0x24272e));
    body.position.set(0, 0.05, -0.2); g.add(body);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.4, 8), steel(0x24272e));
    barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.08, -0.72); g.add(barrel);
    const shroud = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.26, 8), steel(0x1a1d22));
    shroud.rotation.x = Math.PI / 2; shroud.position.set(0, 0.08, -0.6); g.add(shroud);
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.42, 0.16), steel(0x1a1d22));
    mag.position.set(0, -0.24, -0.15); mag.rotation.x = -0.12; g.add(mag);
    const fgrip = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.2, 0.12), steel(0x24272e));
    fgrip.position.set(0, -0.1, -0.5); g.add(fgrip);
    const wire = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.018, 5, 10, Math.PI), steel(0x2f333a));
    wire.position.set(0, 0.02, 0.3); wire.rotation.set(0, Math.PI / 2, 0); g.add(wire);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.3, 0.18), steel(0x24272e));
    grip.position.set(0, -0.18, 0.12); grip.rotation.x = 0.28; g.add(grip);
    mz.position.set(0, 0.08, -0.95); mz.scale.setScalar(0.85);
  } else if (tier === 6) {   // 소총: 스코프 + 총열덮개 + 소염기
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.18, 1.0), steel(0x22343a));
    body.position.set(0, 0.05, -0.3); g.add(body);
    const hand2 = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.42, 8), steel(0x1a2a30));
    hand2.rotation.x = Math.PI / 2; hand2.position.set(0, 0.08, -0.82); g.add(hand2);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 8), steel(0x22343a));
    barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.08, -0.95); g.add(barrel);
    const brake = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.16, 8), steel(0x11181c));
    brake.rotation.x = Math.PI / 2; brake.position.set(0, 0.08, -1.24); g.add(brake);
    const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.4, 10), steel(0x111418));
    scope.rotation.x = Math.PI / 2; scope.position.set(0, 0.26, -0.25); g.add(scope);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.06, 12),
      new THREE.MeshBasicMaterial({ color: 0x66d9ff, transparent: true, opacity: 0.75 }));
    lens.position.set(0, 0.26, -0.451); g.add(lens);
    for (const dz of [-0.1, -0.4]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.018, 5, 10), steel(0x2a3238));
      ring.position.set(0, 0.26, dz); g.add(ring);
    }
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.3, 0.18), steel(0x1a2a30));
    mag.position.set(0, -0.18, -0.25); mag.rotation.x = -0.2; g.add(mag);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.36, 0.2), steel(0x22343a));
    grip.position.set(0, -0.2, 0.1); grip.rotation.x = 0.25; g.add(grip);
    mz.position.set(0, 0.08, -1.35);
  } else if (tier === 7) {   // 기관총(3점사): 두꺼운 총열 + 방열핀 + 탄띠 + 양각대
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.24, 0.85), steel(0x2c3238));
    body.position.set(0, 0.05, -0.25); g.add(body);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.075, 0.95, 10), steel(0x20262b));
    barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.09, -0.95); g.add(barrel);
    for (let i = 0; i < 6; i++) {   // 방열핀
      const fin = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.03, 10), steel(0x161b1f));
      fin.rotation.x = Math.PI / 2; fin.position.set(0, 0.09, -0.62 - i * 0.1); g.add(fin);
    }
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.24, 0.3), steel(0x3a4b3a));
    box.position.set(0.02, -0.2, -0.1); g.add(box);   // 탄약통
    for (let i = 0; i < 5; i++) {   // 탄띠
      const rnd = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.09, 6), brass());
      rnd.rotation.z = Math.PI / 2; rnd.position.set(0.03, -0.06 + i * 0.02, -0.22 + i * 0.05); g.add(rnd);
    }
    for (const s of [-1, 1]) {   // 양각대
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.44, 6), steel(0x20262b));
      leg.position.set(s * 0.13, -0.14, -0.78); leg.rotation.set(0.25, 0, s * 0.42); g.add(leg);
    }
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.34, 0.2), steel(0x2c3238));
    grip.position.set(0, -0.2, 0.16); grip.rotation.x = 0.28; g.add(grip);
    mz.position.set(0, 0.09, -1.42); mz.scale.setScalar(1.25);
  } else if (tier === 8) {   // 바주카: 대구경 발사관 + 조준경 + 로켓탄두
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 1.75, 14), steel(0x4a5a3a));
    tube.rotation.x = Math.PI / 2; tube.position.set(0, 0.12, -0.55); g.add(tube);
    const flare = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.19, 0.3, 14, 1, true), steel(0x3a4a2c));
    flare.rotation.x = Math.PI / 2; flare.position.set(0, 0.12, 0.34); g.add(flare);   // 후폭풍 나팔
    const shield = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.28, 0.03), steel(0x55663f));
    shield.position.set(0, 0.3, -0.5); shield.rotation.x = -0.2; g.add(shield);
    const sight2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.24), steel(0x222a18));
    sight2.position.set(-0.16, 0.34, -0.3); g.add(sight2);
    const warhead = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.32, 12),
      new THREE.MeshStandardMaterial({ color: 0xd9483b, roughness: 0.45 }));
    warhead.rotation.x = -Math.PI / 2; warhead.position.set(0, 0.12, -1.52); g.add(warhead);
    for (let i = 0; i < 3; i++) {   // 탄두 핀
      const a = (i / 3) * Math.PI * 2;
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.12, 0.16),
        new THREE.MeshStandardMaterial({ color: 0xf2ece0, roughness: 0.6 }));
      fin.position.set(Math.cos(a) * 0.13, 0.12 + Math.sin(a) * 0.13, -1.3);
      fin.rotation.z = a; g.add(fin);
    }
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.32, 0.2), steel(0x3a4a2c));
    grip.position.set(0, -0.16, 0.05); grip.rotation.x = 0.28; g.add(grip);
    const fgrip2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.26, 0.16), steel(0x3a4a2c));
    fgrip2.position.set(0, -0.1, -0.75); fgrip2.rotation.x = -0.1; g.add(fgrip2);
    mz.position.set(0, 0.12, -1.75); mz.scale.setScalar(1.9);
  } else {                   // 레이저: 발광 코어 + 방열핀 + 에너지 셀
    const shell = steel(0x143c4a);
    const glow = new THREE.MeshStandardMaterial({ color: 0x2ee6ff, emissive: 0x2ee6ff, emissiveIntensity: 1.3, roughness: 0.3 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 1.1, 14), shell);
    body.rotation.x = Math.PI / 2; body.position.set(0, 0.07, -0.4); g.add(body);
    for (const dz of [-0.12, -0.42, -0.72]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.135, 0.022, 6, 16), glow);
      ring.position.set(0, 0.07, dz); g.add(ring);
    }
    const cell = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.2, 0.26), glow);
    cell.position.set(0, -0.14, -0.1); g.add(cell);   // 에너지 셀
    for (const s of [-1, 1]) {   // 방열 날개
      const finl = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.16, 0.4), shell);
      finl.position.set(s * 0.15, 0.14, -0.3); finl.rotation.z = s * 0.25; g.add(finl);
    }
    const emitter = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.1, 0.3, 12), glow);
    emitter.rotation.x = Math.PI / 2; emitter.position.set(0, 0.07, -1.05); g.add(emitter);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.38, 0.2), shell);
    grip.position.set(0, -0.22, 0.08); grip.rotation.x = 0.25; g.add(grip);
    mz.position.set(0, 0.07, -1.2); mz.scale.setScalar(1.1);
  }
  g.add(mz);
  return { group: g, mz };
}

function applyWeaponVisual() {
  while (gun.children.length) gun.remove(gun.children[0]);
  const built = buildGunModel(G.weapon);
  gun.add(built.group);
  muzzle = built.mz;
  updateWeaponChip();
}

// ---------- 탄약 · 재장전 · 무기 교체 (NORMAL 이상에서 작동) ----------
function ammoOn() { return G.quizDiff !== 'easy'; }
function magOf(i) { return WEAPONS[i].mag || 99; }
function ammoOf(i) { if (G.ammo[i] === undefined) G.ammo[i] = magOf(i); return G.ammo[i]; }
function startReload() {
  if (G.reloadT > 0) return;
  G.reloadT = WEAPONS[G.weapon].rl || 1.5;
  beep(240, 0.1, 'square', 0.04, -60);
  showMsg(T('reloadHint'), 1800);
}
function reloadUpdate(dt) {
  if (G.reloadT <= 0) return;
  G.reloadT -= dt;
  if (G.reloadT <= 0) {
    G.reloadT = 0;
    G.ammo[G.weapon] = magOf(G.weapon);
    beep(760, 0.09, 'sine', 0.05);
  }
}
function swapWeapon() {
  if (G.weapon <= 0 && !ammoOn()) return;
  const owned = WEAPONS.map((_, i) => i).filter((i) => i <= G.weapon);
  if (owned.length < 2) return;
  const cur = owned.indexOf(G.weapon);
  G.weapon = owned[(cur + 1) % owned.length];
  G.reloadT = 0;                      // 교체하면 재장전은 중단
  G.fireCooldown = 0.12;
  applyWeaponVisual();
  beep(520, 0.06, 'triangle', 0.05);
  showMsg(T('swap', WEAPONS[G.weapon].icon, wName(G.weapon)), 1500);
  if (ammoOn() && ammoOf(G.weapon) <= 0) startReload();
}
function updateWeaponChip() {
  const chip = $('hud-weapon');
  if (!chip) return;
  const W = WEAPONS[G.weapon];
  let txt = `${W.icon} ${wName(G.weapon)}`;
  if (ammoOn()) {
    txt += G.reloadT > 0 ? ` · ⟳ ${T('reloading')}` : ` · ${ammoOf(G.weapon)}/${magOf(G.weapon)}`;
  }
  chip.textContent = txt;
}
applyWeaponVisual();

// 레이저 빔 이펙트
const beams = [];
function spawnBeam(a, b) {
  const d = a.distanceTo(b);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, d, 6),
    new THREE.MeshBasicMaterial({ color: 0x8ff2ff, transparent: true, opacity: 0.9 }));
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  scene.add(m);
  beams.push({ mesh: m, life: 0.09 });
}
function beamsUpdate(dt) {
  for (const b of [...beams]) {
    b.life -= dt;
    b.mesh.material.opacity = Math.max(0, b.life / 0.09);
    if (b.life <= 0) { scene.remove(b.mesh); beams.splice(beams.indexOf(b), 1); }
  }
}

// 피격 연출: 파티클 + 백색 플래시 + 체력 비례로 어두워짐
function damageFx(e, point, color, n) {
  burst(point, color, n, 6.5);
  e.flashT = 0.1;
  for (const r of e.mats) { r.m.emissive.setHex(0xffffff); r.m.emissiveIntensity = 0.9; }
  const ratio = Math.max(0, e.hp) / e.maxhp;
  const f = 0.35 + 0.65 * ratio;
  for (const r of e.mats) r.m.color.copy(r.color).multiplyScalar(f);
}

// ---------- 사격 대상 루트 ----------
const shootRoot = new THREE.Group(); scene.add(shootRoot);

// ---------- 파괴 가능한 지방 둔덕 (경로 위 실물 엄폐물 — 쏘면 뚫린다) ----------
// 길의 카메라 쪽에 앉아 시야와 탄을 막는다. 지나가는 적은 자연스럽게 둔덕 뒤로 가려진다.
const fatWalls = [];
const DEFAULT_WALL_POS = [];
const wallMatA = new THREE.MeshStandardMaterial({ color: 0xffdf9e, roughness: 0.7, emissive: 0x6b5420, emissiveIntensity: 0.12 });
const wallMatB = new THREE.MeshStandardMaterial({ color: 0xf2c96e, roughness: 0.75, emissive: 0x5a4318, emissiveIntensity: 0.12 });

function makeFatWall(x, z) {
  const g2 = new THREE.Group();
  [[0, 0.75, 0, 1.15], [-0.95, 0.5, 0.25, 0.8], [0.95, 0.55, 0.2, 0.85], [-0.4, 1.15, -0.15, 0.6], [0.45, 1.2, -0.1, 0.55]].forEach(([bx, by, bz, br], k) => {
    const b = new THREE.Mesh(new THREE.SphereGeometry(br, 12, 9), k % 2 ? wallMatB : wallMatA);
    b.scale.y = 0.78; b.position.set(bx, by * 0.6, bz);
    g2.add(b);
  });
  // HP 바 (첫 피격부터 표시)
  const bar = new THREE.Group();
  const barBg = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 0.16), new THREE.MeshBasicMaterial({ color: 0x1a1016, transparent: true, opacity: 0.75 }));
  const barFg = new THREE.Mesh(new THREE.PlaneGeometry(1.28, 0.1), new THREE.MeshBasicMaterial({ color: 0xffdf9e }));
  barFg.position.z = 0.001;
  bar.add(barBg); bar.add(barFg);
  bar.userData.fg = barFg;
  bar.position.y = 1.75;
  bar.quaternion.copy(camera.quaternion);   // 고정 카메라라 한 번만 빌보드 정렬
  bar.visible = false;
  g2.add(bar);
  g2.position.set(x, 0, z);
  const wall = { mesh: g2, hp: 100, max: 100, hinted: false, bar };
  g2.traverse((o) => { o.userData.entity = { kind: 'fatwall', ref: wall }; });
  shootRoot.add(g2);
  fatWalls.push(wall);
  return wall;
}

{
  // 기본 4개: 메인길 상·중·하 + 심장 루트 합류 전
  [[0, 0.62], [0, 0.74], [0, 0.86], [1, 0.58]].forEach(([ri, tp]) => {
    const p = ROUTES[ri].curve.getPointAt(tp);
    DEFAULT_WALL_POS.push([+(p.x).toFixed(1), +(p.z + 1.7).toFixed(1)]);
  });
  let storedWallPos = null;
  try { storedWallPos = JSON.parse(localStorage.getItem('xgb_fatwalls2') || 'null'); } catch (err) { /* 무시 */ }
  const positions = (Array.isArray(storedWallPos) && storedWallPos.length) ? storedWallPos : DEFAULT_WALL_POS;
  positions.forEach(([x, z]) => makeFatWall(x, z));

  // 우측 지방 벌판 — 원경 길을 가리는 대형 오클루더 (배경 이미지와 일치하는 가림막)
  for (const [fx, fz, fr] of [[4.4, -9.5, 3.2], [6.9, -6.3, 3.6]]) {
    const f = new THREE.Mesh(new THREE.SphereGeometry(fr, 12, 9), new THREE.MeshBasicMaterial({ colorWrite: false }));
    f.scale.y = 0.8; f.position.set(fx, 0, fz); f.renderOrder = -1;
    shootRoot.add(f);
  }
}

function destroyFatWall(wl, hitPoint) {
  shootRoot.remove(wl.mesh);
  fatWalls.splice(fatWalls.indexOf(wl), 1);
  burst(hitPoint, 0xffdf9e, 30, 8);
  G.score += 1000; G.shootScore += 1000;
  G.metabolic = Math.min(100, G.metabolic + 8);
  sfx.rescue();
  showMsg(T('wallDown'));
  setTimeout(() => { if (G.state === 'WAVE' && !G.over) startQuiz('item'); }, 900);
}

// ---------- 적 팩토리 (절차 생성 — 이후 GLB 스왑 지점) ----------
// 소용돌이 막대사탕 무늬
function makeSwirlTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff6f8'; ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = '#ff4d8a'; ctx.lineWidth = 13; ctx.lineCap = 'round';
  ctx.beginPath();
  for (let a = 0; a < Math.PI * 8; a += 0.05) {
    const r = 2 + a * 2.35;
    const x = 64 + Math.cos(a) * r, y = 64 + Math.sin(a) * r;
    if (a === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
  return new THREE.CanvasTexture(c);
}
const swirlTex = makeSwirlTexture();

// 공통 파츠: 카툰 눈(흰자+동공+화난 눈썹) · 팔다리 · 바닥 그림자
function addFace(g, y, z, s = 1, gap = 0.18) {
  for (const dx of [-gap * s, gap * s]) {
    const white = new THREE.Mesh(new THREE.SphereGeometry(0.11 * s, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    white.position.set(dx, y, z); g.add(white);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.055 * s, 6, 5), new THREE.MeshBasicMaterial({ color: 0x18181c }));
    pupil.position.set(dx, y, z + 0.075 * s); g.add(pupil);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.17 * s, 0.04 * s, 0.03), new THREE.MeshBasicMaterial({ color: 0x18181c }));
    brow.position.set(dx, y + 0.15 * s, z + 0.02);
    brow.rotation.z = dx < 0 ? -0.45 : 0.45;   // 화난 눈썹
    g.add(brow);
  }
}
function addLimbs(g, color, armY, armX, legX) {
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.6 });
  const arms = [], legs = [];
  for (const s of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.3, 3, 6), mat);
    arm.position.set(s * armX, armY, 0); arm.rotation.z = s * 0.7;
    g.add(arm); arms.push(arm);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.2, 3, 6), mat);
    leg.position.set(s * legX, 0.16, 0);
    g.add(leg); legs.push(leg);
  }
  g.userData.limbs = { arms, legs };
}
function addShadow(g, r) {
  const sh = new THREE.Mesh(new THREE.CircleGeometry(r, 16),
    new THREE.MeshBasicMaterial({ color: 0x2a0e14, transparent: true, opacity: 0.32, depthWrite: false }));
  sh.rotation.x = -Math.PI / 2; sh.position.y = 0.03; sh.renderOrder = 1;
  g.add(sh);
  g.userData.shadow = sh;
}

function buildEnemyMesh(type) {
  const g = new THREE.Group();
  if (type === 'soda') {   // 소용돌이 막대사탕
    const capMat = new THREE.MeshStandardMaterial({ map: swirlTex, roughness: 0.3 });
    const sideMat = new THREE.MeshStandardMaterial({ color: 0xff8fb3, roughness: 0.4 });
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.2, 24), [sideMat, capMat, capMat]);
    disc.rotation.x = Math.PI / 2; disc.position.y = 1.25; g.add(disc);
    const gloss = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 }));
    gloss.scale.set(1.4, 0.7, 0.4); gloss.position.set(-0.3, 1.7, 0.12); g.add(gloss);
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.85, 8),
      new THREE.MeshStandardMaterial({ color: 0xfff2e0, roughness: 0.5 }));
    stick.position.y = 0.35; g.add(stick);
    for (const s of [-1, 1]) {   // 리본 매듭
      const rb = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.22, 4),
        new THREE.MeshStandardMaterial({ color: 0xff4d8a, roughness: 0.5 }));
      rb.position.set(s * 0.12, 0.62, 0); rb.rotation.z = s * 1.9; g.add(rb);
    }
    addFace(g, 1.32, 0.14, 1, 0.24);
    addLimbs(g, 0xfff2e0, 0.9, 0.72, 0.14);
    addShadow(g, 0.55);
  } else if (type === 'fries') {
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.0, 0.55),
      new THREE.MeshStandardMaterial({ color: 0xe03131, roughness: 0.5, emissive: 0x550a0a, emissiveIntensity: 0.4 }));
    box.position.y = 0.8; g.add(box);
    const lip = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.1, 0.62),
      new THREE.MeshStandardMaterial({ color: 0xf2f2e6, roughness: 0.5 }));
    lip.position.y = 1.28; g.add(lip);
    const fryMat = new THREE.MeshStandardMaterial({ color: 0xffd166, roughness: 0.55, emissive: 0x664d10, emissiveIntensity: 0.4 });
    const saltMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (let i = 0; i < 6; i++) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.6 + Math.random() * 0.5, 0.13), fryMat);
      f.position.set(-0.32 + i * 0.13, 1.55, (Math.random() - 0.5) * 0.25);
      f.rotation.z = (Math.random() - 0.5) * 0.4; g.add(f);
      const salt = new THREE.Mesh(new THREE.SphereGeometry(0.025, 4, 4), saltMat);
      salt.position.set(f.position.x, 1.6 + Math.random() * 0.3, f.position.z + 0.09); g.add(salt);
    }
    addFace(g, 0.92, 0.29, 1, 0.2);
    addLimbs(g, 0xe03131, 0.7, 0.52, 0.2);
    addShadow(g, 0.6);
  } else if (type === 'pizza') { // 기름진 피자 조각
    const slice = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.2, 3),
      new THREE.MeshStandardMaterial({ color: 0xf2c15c, roughness: 0.55, emissive: 0x5a4010, emissiveIntensity: 0.3 }));
    slice.rotation.x = Math.PI / 2; slice.rotation.z = Math.PI; slice.position.y = 0.95; g.add(slice);
    const crust = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 1.5, 8),
      new THREE.MeshStandardMaterial({ color: 0xc98a3a, roughness: 0.6 }));
    crust.rotation.z = Math.PI / 2; crust.position.y = 1.38; g.add(crust);
    const pepMat = new THREE.MeshStandardMaterial({ color: 0xd94f3d, roughness: 0.45, emissive: 0x4a0f0a, emissiveIntensity: 0.35 });
    for (const [px, py] of [[-0.28, 1.12], [0.24, 1.06], [0, 0.7]]) {
      const pep = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.06, 10), pepMat);
      pep.rotation.x = Math.PI / 2; pep.position.set(px, py, 0.12); g.add(pep);
    }
    const cheese = new THREE.MeshStandardMaterial({ color: 0xffdf7a, roughness: 0.4 });
    for (const [cx, cy, l] of [[-0.42, 0.62, 0.3], [0.1, 0.42, 0.42], [0.45, 0.68, 0.26]]) {
      const d = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, l, 3, 6), cheese);
      d.position.set(cx, cy, 0.1); g.add(d);
    }
    addFace(g, 0.95, 0.16, 0.9, 0.2);
    addLimbs(g, 0xc98a3a, 0.85, 0.62, 0.16);
    addShadow(g, 0.6);
  } else if (type === 'ramen') { // 나트륨 컵라면
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.38, 0.95, 14),
      new THREE.MeshStandardMaterial({ color: 0xf2ece0, roughness: 0.5 }));
    cup.position.y = 0.85; g.add(cup);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.57, 0.53, 0.22, 14),
      new THREE.MeshStandardMaterial({ color: 0xd9483b, roughness: 0.45 }));
    band.position.y = 1.05; g.add(band);
    const noodleMat = new THREE.MeshStandardMaterial({ color: 0xffd166, roughness: 0.5 });
    for (let k = 0; k < 4; k++) {
      const n = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.05, 6, 10, Math.PI), noodleMat);
      n.position.set(-0.24 + k * 0.16, 1.38, 0.07 * (k % 2 ? 1 : -1));
      n.rotation.x = -0.4; g.add(n);
    }
    const drape = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.045, 6, 10, Math.PI * 0.9), noodleMat);
    drape.position.set(0.5, 1.25, 0.05); drape.rotation.z = -1.4; g.add(drape);   // 흘러넘친 면발
    const chop = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.85, 6),
      new THREE.MeshStandardMaterial({ color: 0x8a5a32, roughness: 0.6 }));
    chop.position.set(-0.3, 1.62, -0.05); chop.rotation.z = 0.5; g.add(chop);   // 젓가락
    for (const [sx2, sy2] of [[-0.12, 1.85], [0.16, 1.98]]) {   // 김
      const steam = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.32 }));
      steam.position.set(sx2, sy2, 0); g.add(steam);
    }
    addFace(g, 0.78, 0.5, 1, 0.2);
    addLimbs(g, 0xf2ece0, 0.75, 0.58, 0.18);
    addShadow(g, 0.55);
  } else if (type === 'icecream') { // 민트초코 콘
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.9, 10),
      new THREE.MeshStandardMaterial({ color: 0xc98a4a, roughness: 0.65 }));
    cone.rotation.x = Math.PI; cone.position.y = 0.6; g.add(cone);
    const lat = new THREE.MeshStandardMaterial({ color: 0xa8703a, roughness: 0.7 });
    for (const ly of [0.45, 0.7]) {   // 와플 링
      const line = new THREE.Mesh(new THREE.TorusGeometry(0.42 * (ly - 0.15) / 0.9 + 0.12, 0.02, 4, 12), lat);
      line.rotation.x = Math.PI / 2; line.position.y = ly; g.add(line);
    }
    const scoop = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0x9fe8c9, roughness: 0.4, emissive: 0x2c6a52, emissiveIntensity: 0.3 }));
    scoop.position.y = 1.28; g.add(scoop);
    const dripMat = new THREE.MeshStandardMaterial({ color: 0x9fe8c9, roughness: 0.4 });
    for (const [dx2, dy2, l2] of [[-0.3, 1.0, 0.18], [0.28, 0.96, 0.24], [0, 1.02, 0.14]]) {
      const d2 = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, l2, 3, 6), dripMat);
      d2.position.set(dx2, dy2, 0.16); g.add(d2);   // 흘러내리는 민트
    }
    const chipMat2 = new THREE.MeshStandardMaterial({ color: 0x3a2418, roughness: 0.5 });
    for (const [cx, cy, cz] of [[-0.18, 1.42, 0.3], [0.15, 1.3, 0.38], [-0.05, 1.18, 0.42], [0.28, 1.45, 0.2], [0.02, 1.55, 0.32]]) {
      const chip = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 5), chipMat2);
      chip.position.set(cx, cy, cz); g.add(chip);
    }
    const choco = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0x4a2c1a, roughness: 0.45 }));
    choco.position.set(0.08, 1.68, 0.05); g.add(choco);
    addFace(g, 1.3, 0.36, 1, 0.17);
    addLimbs(g, 0xc98a4a, 0.7, 0.42, 0.13);
    addShadow(g, 0.5);
  } else if (type === 'ciga') { // 꽁초 니코틴 — 타들어가는 담배
    const paper = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 1.1, 12),
      new THREE.MeshStandardMaterial({ color: 0xf4f0e6, roughness: 0.75 }));
    paper.position.y = 0.85; g.add(paper);
    const filt = new THREE.Mesh(new THREE.CylinderGeometry(0.245, 0.245, 0.42, 12),
      new THREE.MeshStandardMaterial({ color: 0xd9a441, roughness: 0.8 }));
    filt.position.y = 0.28; g.add(filt);
    const seam = new THREE.Mesh(new THREE.TorusGeometry(0.246, 0.018, 5, 14),
      new THREE.MeshStandardMaterial({ color: 0xb8860b, roughness: 0.7 }));
    seam.rotation.x = Math.PI / 2; seam.position.y = 0.5; g.add(seam);
    const ash = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.22, 12),
      new THREE.MeshStandardMaterial({ color: 0x6e6a66, roughness: 0.95 }));
    ash.position.y = 1.5; g.add(ash);
    const ember = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.09, 12),
      new THREE.MeshStandardMaterial({ color: 0xff5a1e, emissive: 0xff4a10, emissiveIntensity: 1.6, roughness: 0.4 }));
    ember.position.y = 1.63; g.add(ember);
    for (const [sx, sy, sr] of [[0.06, 1.9, 0.13], [-0.09, 2.14, 0.16], [0.05, 2.4, 0.2]]) {
      const smoke = new THREE.Mesh(new THREE.SphereGeometry(sr, 8, 6),
        new THREE.MeshBasicMaterial({ color: 0xdcd6cf, transparent: true, opacity: 0.28 }));
      smoke.position.set(sx, sy, 0); g.add(smoke);
    }
    addFace(g, 0.95, 0.26, 0.95, 0.12);
    addLimbs(g, 0xd9a441, 0.72, 0.3, 0.11);
    addShadow(g, 0.4);
  } else if (type === 'soju') { // 초록 소주병 — 간 직격
    const glass = new THREE.MeshStandardMaterial({ color: 0x2f9e5c, roughness: 0.2, metalness: 0.15, transparent: true, opacity: 0.93 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.4, 1.05, 14), glass);
    body.position.y = 0.62; g.add(body);
    const shoulder = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.34, 14), glass);
    shoulder.position.y = 1.3; g.add(shoulder);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.4, 10), glass);
    neck.position.y = 1.62; g.add(neck);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.18, 10),
      new THREE.MeshStandardMaterial({ color: 0xd9d9de, roughness: 0.3, metalness: 0.8 }));
    cap.position.y = 1.88; g.add(cap);
    const label = new THREE.Mesh(new THREE.CylinderGeometry(0.405, 0.405, 0.5, 14, 1, true),
      new THREE.MeshStandardMaterial({ color: 0xf7f4ec, roughness: 0.7, side: THREE.DoubleSide }));
    label.position.y = 0.62; g.add(label);
    const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.408, 0.408, 0.1, 14, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x1d6fb8, roughness: 0.6, side: THREE.DoubleSide }));
    stripe.position.y = 0.44; g.add(stripe);
    const shine = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.85),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 }));
    shine.position.set(-0.22, 0.75, 0.36); g.add(shine);
    addFace(g, 0.72, 0.42, 0.95, 0.15);
    addLimbs(g, 0x2f9e5c, 0.62, 0.42, 0.14);
    addShadow(g, 0.45);
  } else if (type === 'cancer' || type === 'cancerlet') { // 암세포 — 분열하는 덩어리
    const small = type === 'cancerlet';
    const k = small ? 0.45 : 1;
    const mat = new THREE.MeshStandardMaterial({ color: 0x7b3f8f, roughness: 0.5, emissive: 0x35104a, emissiveIntensity: 0.6 });
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.95 * k, 14, 11), mat);
    core.position.y = 1.0 * k; g.add(core);
    for (let i = 0; i < (small ? 4 : 8); i++) {   // 울퉁불퉁한 혹
      const a = Math.random() * Math.PI * 2, b = Math.random() * Math.PI;
      const lump = new THREE.Mesh(new THREE.SphereGeometry((0.3 + Math.random() * 0.24) * k, 10, 8), mat);
      lump.position.set(Math.sin(b) * Math.cos(a) * 0.85 * k, 1.0 * k + Math.cos(b) * 0.8 * k, Math.sin(b) * Math.sin(a) * 0.85 * k);
      g.add(lump);
    }
    const nucMat = new THREE.MeshStandardMaterial({ color: 0xff4d8a, emissive: 0xb3125a, emissiveIntensity: 1.1, roughness: 0.35 });
    for (const [nx, ny, nz] of [[0.2, 1.15, 0.55], [-0.3, 0.85, 0.5], [0.05, 1.35, 0.3]]) {
      const nuc = new THREE.Mesh(new THREE.SphereGeometry(0.16 * k, 8, 6), nucMat);
      nuc.position.set(nx * k, ny * k, nz * k); g.add(nuc);
    }
    if (!small) {
      for (let i = 0; i < 6; i++) {   // 침윤 촉수
        const a = (i / 6) * Math.PI * 2;
        const ten = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.5, 6), mat);
        ten.position.set(Math.cos(a) * 1.0, 0.85, Math.sin(a) * 1.0);
        ten.rotation.set(Math.PI / 2, 0, -a); g.add(ten);
      }
    }
    addFace(g, 1.15 * k, 0.9 * k, 1.1 * k, 0.28 * k);
    addShadow(g, 0.85 * k);
    if (!small) g.scale.setScalar(1.15);
  } else if (type === 'plaque') { // 죽상경화 플라크 — 혈관을 막는 기름 덩어리
    const vessel = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.3, 10, 20),
      new THREE.MeshStandardMaterial({ color: 0xc4506a, roughness: 0.55, emissive: 0x4a1020, emissiveIntensity: 0.4 }));
    vessel.position.y = 1.0; g.add(vessel);
    const waxMat = new THREE.MeshStandardMaterial({ color: 0xf2e3a8, roughness: 0.45, emissive: 0x6b5a20, emissiveIntensity: 0.35 });
    const mass = new THREE.Mesh(new THREE.SphereGeometry(0.88, 14, 11), waxMat);
    mass.scale.set(1.12, 1.0, 0.88); mass.position.y = 0.98; g.add(mass);
    for (let i = 0; i < 5; i++) {   // 기름 덩어리 표면 융기
      const a = (i / 5) * Math.PI * 2;
      const lob = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), waxMat);
      lob.position.set(Math.cos(a) * 0.62, 0.85 + Math.sin(a * 1.7) * 0.28, Math.sin(a) * 0.42 + 0.25);
      g.add(lob);
    }
    for (let i = 0; i < 6; i++) {   // 콜레스테롤 결정
      const cry = new THREE.Mesh(new THREE.OctahedronGeometry(0.16),
        new THREE.MeshStandardMaterial({ color: 0xfffbe8, roughness: 0.2, metalness: 0.3 }));
      const a = Math.random() * Math.PI * 2;
      cry.position.set(Math.cos(a) * 0.66, 0.95 + (Math.random() - 0.5) * 0.85, Math.sin(a) * 0.4 + 0.62);
      cry.rotation.set(Math.random() * 2, Math.random() * 2, 0); g.add(cry);
    }
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.9, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.42),
      new THREE.MeshStandardMaterial({ color: 0xf2c6cc, roughness: 0.55, transparent: true, opacity: 0.35, side: THREE.DoubleSide }));
    cap.scale.set(1.1, 0.9, 0.88); cap.position.y = 1.08; g.add(cap);   // 섬유성 피막(얇게 덮임)
    for (let i = 0; i < 4; i++) {   // 혈전 꼬리
      const clot = new THREE.Mesh(new THREE.SphereGeometry(0.2 - i * 0.03, 8, 6),
        new THREE.MeshStandardMaterial({ color: 0x8f1f2e, roughness: 0.7 }));
      clot.position.set(0, 0.75, 0.9 + i * 0.28); g.add(clot);
    }
    addFace(g, 1.12, 0.92, 1.15, 0.3);
    addShadow(g, 0.95);
    g.scale.setScalar(1.1);
  } else if (type === 'donut') { // 비행: 슈가 도넛
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.26, 10, 18),
      new THREE.MeshStandardMaterial({ color: 0xff8fb3, roughness: 0.45, emissive: 0x77203c, emissiveIntensity: 0.5 }));
    ring.rotation.x = Math.PI / 2 - 0.5; g.add(ring);
    const icing = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.2, 10, 18),
      new THREE.MeshStandardMaterial({ color: 0xffc2d6, roughness: 0.35 }));
    icing.rotation.x = Math.PI / 2 - 0.5; icing.position.y = 0.06; g.add(icing);
    const sprColors = [0xffd166, 0x7dffb0, 0x66aaff, 0xffffff, 0xd94f3d];
    for (let i = 0; i < 10; i++) {   // 스프링클
      const a = (i / 10) * Math.PI * 2;
      const spr = new THREE.Mesh(new THREE.CapsuleGeometry(0.02, 0.08, 2, 5),
        new THREE.MeshBasicMaterial({ color: sprColors[i % sprColors.length] }));
      spr.position.set(Math.cos(a) * 0.55, 0.16 + Math.sin(a) * 0.24, Math.sin(a) * 0.4);
      spr.rotation.set(Math.random() * 2, Math.random() * 2, Math.random() * 2);
      g.add(spr);
    }
    const wings = [];
    for (const s of [-1, 1]) {
      const w = new THREE.Mesh(new THREE.CircleGeometry(0.45, 10),
        new THREE.MeshStandardMaterial({ color: 0xfff2f6, roughness: 0.4, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
      w.scale.set(1, 0.55, 1);
      w.position.set(s * 0.72, 0.25, 0); w.rotation.z = s * 0.5;
      g.add(w); wings.push(w);
    }
    addFace(g, 0.12, 0.58, 0.9, 0.2);
    addShadow(g, 0.5);
    g.userData.wings = wings;
  } else if (type === 'moth') { // 비행: 날아다니는 과자봉지
    const foil = new THREE.MeshStandardMaterial({ color: 0x6aa0e0, roughness: 0.35, metalness: 0.55, emissive: 0x1a3050, emissiveIntensity: 0.35 });
    const bag = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.85, 0.22), foil);
    bag.position.y = 0.1; g.add(bag);
    const crimpMat = new THREE.MeshStandardMaterial({ color: 0x8fb8ec, roughness: 0.4, metalness: 0.5 });
    for (const sy of [-1, 1]) {
      for (let k = -1; k <= 1; k++) {
        const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.18, 4), crimpMat);
        tooth.position.set(k * 0.2, 0.1 + sy * 0.5, 0);
        if (sy < 0) tooth.rotation.z = Math.PI;
        g.add(tooth);
      }
    }
    const shine = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.9),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 }));
    shine.position.set(-0.18, 0.1, 0.115); shine.rotation.z = 0.35; g.add(shine);   // 은박 광택
    const band = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.3),
      new THREE.MeshStandardMaterial({ color: 0xffd166, roughness: 0.5 }));
    band.position.set(0, 0.02, 0.115); g.add(band);
    const chipMat = new THREE.MeshStandardMaterial({ color: 0xe8b458, roughness: 0.55 });
    for (const [cx, cy] of [[-0.08, 0.0], [0.09, 0.05]]) {
      const chip = new THREE.Mesh(new THREE.CircleGeometry(0.13, 12), chipMat);
      chip.position.set(cx, cy, 0.12); g.add(chip);
    }
    for (const s of [-1, 1]) {   // 더듬이
      const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.3, 5),
        new THREE.MeshStandardMaterial({ color: 0x2a3a55, roughness: 0.5 }));
      ant.position.set(s * 0.12, 0.72, 0); ant.rotation.z = s * -0.4; g.add(ant);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 5), new THREE.MeshBasicMaterial({ color: 0xffd166 }));
      tip.position.set(s * 0.18, 0.86, 0); g.add(tip);
    }
    const wings = [];
    for (const s of [-1, 1]) {
      const w = new THREE.Mesh(new THREE.CircleGeometry(0.42, 10),
        new THREE.MeshStandardMaterial({ color: 0xf2f6ff, roughness: 0.4, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
      w.scale.set(1, 0.6, 1);
      w.position.set(s * 0.55, 0.42, 0); w.rotation.z = s * 0.5;
      g.add(w); wings.push(w);
    }
    addFace(g, 0.36, 0.12, 0.85, 0.17);
    addShadow(g, 0.45);
    g.userData.wings = wings;
  } else { // burger / boss
    const stack = [
      [0.95, 0.32, 0xe8a95c], [0.9, 0.22, 0x7a4a21], [1.0, 0.12, 0x63c04b], [0.92, 0.16, 0xffc93c], [0.88, 0.38, 0xe8a95c],
    ];
    let y = 0.35;
    for (const [r, h, c] of stack) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 16),
        new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, emissive: c, emissiveIntensity: 0.12 }));
      m.position.y = y; y += h * 0.9; g.add(m);
    }
    const seedMat = new THREE.MeshStandardMaterial({ color: 0xfff2d9, roughness: 0.6 });
    for (let i = 0; i < 8; i++) {   // 참깨
      const a = Math.random() * Math.PI * 2, rr = Math.random() * 0.6;
      const seed = new THREE.Mesh(new THREE.SphereGeometry(0.045, 5, 4), seedMat);
      seed.scale.set(1, 0.6, 1.4);
      seed.position.set(Math.cos(a) * rr, 1.28 + (0.6 - rr) * 0.18, Math.sin(a) * rr + 0.1);
      g.add(seed);
    }
    const cheeseMat = new THREE.MeshStandardMaterial({ color: 0xffc93c, roughness: 0.4 });
    for (const [cx, cz] of [[-0.6, 0.6], [0.5, 0.72], [0, 0.9]]) {   // 늘어진 치즈
      const d = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.06), cheeseMat);
      d.position.set(cx, 0.62, cz); g.add(d);
    }
    // 약점: 영양성분표
    const label = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.42),
      new THREE.MeshBasicMaterial({ color: 0xffffff }));
    label.position.set(0, 0.85, 0.97); g.add(label);
    label.userData.weakpoint = true;
    addFace(g, 1.42, 0.82, 1.1, 0.26);
    addLimbs(g, 0xe8a95c, 0.8, 1.02, 0.34);
    addShadow(g, 0.85);
    if (type === 'boss') {   // 왕관
      const gold = new THREE.MeshStandardMaterial({ color: 0xf2c14e, roughness: 0.3, metalness: 0.7 });
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.2, 10), gold);
      base.position.y = 1.66; g.add(base);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.26, 6), gold);
        spike.position.set(Math.cos(a) * 0.3, 1.86, Math.sin(a) * 0.3); g.add(spike);
        const jewel = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5),
          new THREE.MeshStandardMaterial({ color: 0xd9302e, roughness: 0.3, emissive: 0x661010, emissiveIntensity: 0.8 }));
        jewel.position.set(Math.cos(a + 0.8) * 0.42, 1.66, Math.sin(a + 0.8) * 0.42); g.add(jewel);
      }
      g.scale.setScalar(1.6);
    }
  }
  return g;
}

function spawnEnemy(type) {
  const def = ENEMY_TYPES[type];
  const mesh = buildEnemyMesh(type);
  mesh.scale.multiplyScalar(1.5);   // 아케이드 가독성
  // 진입 루트: 보스는 심장 길. 최종 웨이브엔 혈관 파이프 지름길이 추가로 열린다
  let route;
  if (type === 'boss') route = ROUTES[1];
  else {
    const r = Math.random();
    if (G.pipeOpen) route = r < 0.45 ? ROUTES[0] : (r < 0.75 ? ROUTES[1] : ROUTES[2]);
    else route = r < 0.6 ? ROUTES[0] : ROUTES[1];
  }
  // 비행 몬스터는 우상단 '간의 성'에서 출발해 활강해 온다
  if (def.fly) mesh.position.set(24.6 + (Math.random() - 0.5) * 8, 7.6 + (Math.random() - 0.5) * 2.5, -43.7 + (Math.random() - 0.5) * 6);
  else mesh.position.copy(route.curve.getPointAt(0));
  // 피격 시 어두워질 재질 원본 수집
  const mats = [];
  mesh.traverse((o) => {
    if (o.material && o.material.isMeshStandardMaterial) {
      mats.push({ m: o.material, color: o.material.color.clone(), em: o.material.emissive.clone(), emi: o.material.emissiveIntensity });
    }
  });
  // 체력바: 원샷 비행체 빼고 전원 표시 (명시적 체력)
  let hpBar = null;
  if (def.hp >= 2) {
    hpBar = new THREE.Group();
    const bg = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.16), new THREE.MeshBasicMaterial({ color: 0x1a1016, transparent: true, opacity: 0.8 }));
    const fg = new THREE.Mesh(new THREE.PlaneGeometry(1.04, 0.1), new THREE.MeshBasicMaterial({ color: 0x42d68f }));
    fg.position.z = 0.001;
    hpBar.add(bg); hpBar.add(fg); hpBar.userData.fg = fg;
    hpBar.position.y = def.hp >= 8 ? 2.4 : 2.15;
    mesh.add(hpBar);
  }
  const enemy = {
    type, def, mesh, hp: def.hp, maxhp: def.hp, mats, hpBar, flashT: 0,
    curve: route.curve, clen: route.len,
    x0: mesh.position.x, z0: mesh.position.z, xT: mesh.position.x, yT: mesh.position.y, jinkT: 0,
    wings: mesh.userData.wings || null, limbs: mesh.userData.limbs || null, shadow: mesh.userData.shadow || null,
    progress: Math.random() * 0.01, lane: (Math.random() - 0.5) * 2.4,
    phase: Math.random() * Math.PI * 2,
    state: 'walk',           // walk | attack | leak | dying
    attackT: 0, dyingT: 0, leaked: false,
  };
  mesh.traverse((o) => { o.userData.entity = { kind: 'enemy', ref: enemy }; });
  shootRoot.add(mesh);
  enemies.push(enemy);
  spawnFx(enemy);
  return enemy;
}

// ---------- Fat Trap ----------
let trapSide = 1;
function spawnTrap() {
  const g = new THREE.Group();
  const barMat = new THREE.MeshStandardMaterial({ color: 0x8a94a8, roughness: 0.35, metalness: 0.6 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.6, 6), barMat);
    bar.position.set(Math.cos(a) * 1.25, 1.3, Math.sin(a) * 1.25); g.add(bar);
  }
  const top = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.09, 8, 20), barMat);
  top.rotation.x = Math.PI / 2; top.position.y = 2.6; g.add(top);
  const blob = new THREE.Mesh(new THREE.SphereGeometry(0.72, 14, 12),
    new THREE.MeshStandardMaterial({ color: 0xffd166, roughness: 0.45, emissive: 0x775510, emissiveIntensity: 0.6 }));
  blob.position.y = 0.85; g.add(blob);
  const lockMat = new THREE.MeshStandardMaterial({ color: 0xffb020, roughness: 0.3, metalness: 0.7, emissive: 0x664400, emissiveIntensity: 0.8 });
  const lock = new THREE.Group();
  const lockBody = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.95, 0.5), lockMat);
  const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.1, 8, 14, Math.PI), lockMat);
  shackle.position.y = 0.55;
  lock.add(lockBody); lock.add(shackle);
  lock.position.set(0, 1.15, 1.4); g.add(lock);

  trapSide *= -1;
  const tp0 = 0.6 + Math.random() * 0.16;
  const pp = ROUTES[0].curve.getPointAt(tp0);
  const tn = ROUTES[0].curve.getTangentAt(tp0);
  g.position.set(pp.x - tn.z * trapSide * 3.2, 0, pp.z + tn.x * trapSide * 3.2);
  g.scale.setScalar(1.0);
  const trap = { mesh: g, blob, lock, t: 0, state: 'live', life: 12 }; // live | freed | lost | dragging
  lock.traverse((o) => { o.userData.entity = { kind: 'lock', trap }; });
  blob.userData.entity = { kind: 'blob', trap };
  shootRoot.add(g);
  traps.push(trap);
  showMsg(T('trapWarn'));
}

// ---------- 파티클 ----------
const partGeo = new THREE.SphereGeometry(0.13, 6, 5);
function burst(pos, color, n = 9, speed = 5) {
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(partGeo, new THREE.MeshBasicMaterial({ color, transparent: true }));
    m.position.copy(pos);
    const v = new THREE.Vector3((Math.random() - 0.5), Math.random() * 0.9, (Math.random() - 0.5)).normalize().multiplyScalar(speed * (0.5 + Math.random() * 0.7));
    particles.push({ mesh: m, v, life: 0.45 });
    scene.add(m);
  }
}

// ---------- 등장 이펙트: 터널/성문에서 나올 때 번쩍 ----------
const spawnFxRings = [];
function spawnFx(e) {
  const p = e.mesh.position.clone();
  const boss = !!e.def.boss;
  const color = boss ? 0xff5d73 : e.def.fly ? 0xffd9a8 : 0x7dffb0;
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.62, 24),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }));
  if (e.def.fly) { ring.position.copy(p); ring.lookAt(camera.position); }
  else { ring.rotation.x = -Math.PI / 2; ring.position.set(p.x, 0.12, p.z); }
  ring.renderOrder = 3;
  scene.add(ring);
  spawnFxRings.push({ mesh: ring, life: 0.55, grow: boss ? 9 : 5 });
  burst(p.clone().add(new THREE.Vector3(0, 0.6, 0)), color, boss ? 20 : 7, boss ? 7 : 3.5);
  if (boss) beep(140, 0.35, 'sawtooth', 0.07, -50);
}
function spawnFxUpdate(dt) {
  for (const r of [...spawnFxRings]) {
    r.life -= dt * 1.8;
    r.mesh.scale.setScalar(1 + (1 - r.life) * r.grow);
    r.mesh.material.opacity = Math.max(0, r.life) * 0.8;
    if (r.life <= 0) { scene.remove(r.mesh); spawnFxRings.splice(spawnFxRings.indexOf(r), 1); }
  }
}

// ---------- 데미지 숫자 팝업 ----------
const popups = [];
function damagePopup(pos, text, color, scale = 1) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 64;
  const ctx = c.getContext('2d');
  ctx.font = 'bold 42px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.lineWidth = 8; ctx.strokeText(text, 64, 32);
  ctx.fillStyle = color; ctx.fillText(text, 64, 32);
  const tex = new THREE.CanvasTexture(c);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  sp.scale.set(2.2 * scale, 1.1 * scale, 1);
  sp.position.copy(pos); sp.position.y += 0.5;
  sp.renderOrder = 10;
  scene.add(sp);
  popups.push({ mesh: sp, life: 0.95 });
}
function popupsUpdate(dt) {
  for (const p of [...popups]) {
    p.life -= dt;
    p.mesh.position.y += dt * 1.7;
    p.mesh.material.opacity = Math.min(1, p.life / 0.35);
    if (p.life <= 0) {
      p.mesh.material.map.dispose(); p.mesh.material.dispose();
      scene.remove(p.mesh); popups.splice(popups.indexOf(p), 1);
    }
  }
}

// ---------- HUD 헬퍼 ----------
function showMsg(text, dur = 2400) {
  const el = $('hud-msg'); el.textContent = text; el.classList.add('show');
  clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('show'), dur);
}
function flashDamage() {
  const el = $('dmg-flash'); el.style.opacity = 1;
  clearTimeout(el._t); el._t = setTimeout(() => { el.style.opacity = 0; }, 160);
}
function liverStage() {
  if (G.fibrosis < 25) return 0; if (G.fibrosis < 50) return 1; if (G.fibrosis < 75) return 2; return 3;
}

const LIVER_DISSOLVE = [2.4, 3.4, 4.8, 6.5];

// T2D 흐름: 저항성으로 인슐린이 '무력화'(계속 쏘지만 데미지 급감) → 지속 혹사 시 췌장부전(영구 정지)
function pancMult() {
  if (G.pancDown) return 0;
  if (G.beta > 60) return 1;
  if (G.beta > 30) return 0.7;
  if (G.beta > 10) return 0.45;
  return 0.2;   // 무력화: 발사는 되지만 거의 안 박힘
}

function updateHUD() {
  // 점수 마일스톤마다 자동 승급 — 퀴즈를 놓쳐도 무기 트리를 끝까지 탈 수 있게
  while (G.score >= G.nextWeaponScore && G.weapon < WEAPONS.length - 1) {
    G.nextWeaponScore += 18000;
    weaponUp(1);
  }
  updateWeaponChip();
  $('score-val').textContent = G.score.toLocaleString();
  const mult = comboMult();
  $('combo-val').textContent = G.streak >= 3 ? `${G.streak} COMBO · x${mult.toFixed(1)}` : '';
  $('bar-core').style.width = `${Math.max(0, G.core)}%`;
  $('bar-meta').style.width = `${Math.max(0, G.metabolic)}%`;
  $('bar-sugar').style.width = `${Math.min(100, G.sugar)}%`;
  $('bar-liver').style.width = `${Math.max(0, 100 - G.fibrosis)}%`;
  $('bar-beta').style.width = `${Math.max(0, G.beta)}%`;
  const st = liverStage();
  $('liver-state').textContent = T('liverStage')[st];
  const tints = ['transparent', 'rgba(214,150,60,.14)', 'rgba(170,80,80,.22)', 'rgba(120,115,130,.34)'];
  $('liver-tint').style.background = `linear-gradient(to top, ${tints[st]}, transparent 45%)`;
  liverSprite.material.color.setHex([0xffffff, 0xe8cba6, 0xc99a90, 0x8f8f96][st]);   // 간이 굳을수록 수호탑도 탁해짐
  if (G.pancDown) $('panc-state').textContent = T('pancDown');
  else {
    const m = pancMult();
    const bn = Math.round(G.beta);
    $('panc-state').textContent = m >= 1 ? T('pancOk', bn) : m >= 0.7 ? T('pancWeak', bn)
      : m >= 0.45 ? T('pancTired', bn) : T('pancResist', bn);
  }
  const third = Math.ceil((G.core / 100) * 3);
  [$('core-heart'), $('core-kidney'), $('core-brain')].forEach((el, i) => {
    el.style.opacity = i < third ? 1 : 0.22;
    el.style.filter = i < third ? '' : 'grayscale(1)';
  });
}

function comboMult() { return Math.min(4, 1 + G.streak * 0.12); }

// ---------- 사격 ----------
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();

function processRay(ndcX, ndcY, W) {
  raycaster.setFromCamera(ndc.set(ndcX, ndcY), camera);
  const hits = raycaster.intersectObjects(shootRoot.children, true);
  const hit = hits[0];
  if (W.beam) spawnBeam(muzzle.getWorldPosition(new THREE.Vector3()), hit ? hit.point.clone() : raycaster.ray.at(60, new THREE.Vector3()));
  if (!hit) return 'miss';
  const ent = hit.object.userData.entity;
  if (!ent) {  // 엄폐물(오클루더)에 막힘
    burst(hit.point, 0xffe3b0, 7, 3);
    return 'blocked';
  }
  if (ent.kind === 'enemy') {
    const e = ent.ref;
    if (e.state === 'dying') return 'miss';
    const weak = !!hit.object.userData.weakpoint;
    const pdmg = (weak ? 2 : 1) * W.dmg;
    e.hp -= pdmg;
    const gain = Math.round((weak ? 140 : 80) * comboMult());
    G.score += gain; G.shootScore += gain;
    damageFx(e, hit.point, weak ? 0xffe9a8 : 0xff8fa3, weak ? 22 : 15);
    damagePopup(hit.point, `-${pdmg}`, weak ? '#ffd166' : '#ffffff', weak ? 1.3 : 1.05);
    sfx.hit();
    e.mesh.position.z -= 0.18; // 넉백
    if (e.hp <= 0) killEnemy(e, true);
    return 'enemy';
  }
  if (ent.kind === 'fatwall') {
    const wl = ent.ref;
    if (!wl.hinted) { wl.hinted = true; showMsg(T('wallHint')); }
    wl.hp -= W.dmg;
    G.score += 5; G.shootScore += 5;   // 콤보는 유지, 소량 점수
    burst(hit.point, 0xffdf9e, 6, 3);
    beep(280, 0.04, 'triangle', 0.03);
    wl.mesh.scale.setScalar(0.8 + 0.2 * Math.max(0, wl.hp) / wl.max);
    const ratio = Math.max(0, wl.hp) / wl.max;
    wl.bar.visible = true;
    wl.bar.userData.fg.scale.x = Math.max(0.02, ratio);
    wl.bar.userData.fg.position.x = -(1 - Math.max(0.02, ratio)) * 0.64;
    wl.bar.userData.fg.material.color.setHex(ratio > 0.5 ? 0xffdf9e : ratio > 0.25 ? 0xffb347 : 0xff5d73);
    if (wl.hp <= 0) destroyFatWall(wl, hit.point);
    return 'fatwall';
  }
  if (ent.kind === 'lock' && ent.trap.state === 'live') { freeTrap(ent.trap); return 'trap'; }
  if (ent.kind === 'blob' && ent.trap.state === 'live') { loseTrap(ent.trap, true); return 'trap'; }
  return 'miss';
}

function shootAt(clientX, clientY) {
  if (G.fireCooldown > 0) return;
  const W = WEAPONS[G.weapon];
  if (ammoOn()) {
    if (G.reloadT > 0) return;                       // 재장전 중엔 발사 불가 (우클릭으로 교체 가능)
    if (ammoOf(G.weapon) <= 0) { startReload(); return; }
    G.ammo[G.weapon] = Math.max(0, ammoOf(G.weapon) - (W.burst || 1));
  }
  G.fireCooldown = W.cd;
  sfx.shoot();
  gunKick = 1;
  muzzle.material.color.setHex(W.flash);
  muzzle.material.opacity = 1; setTimeout(() => { muzzle.material.opacity = 0; }, 55);
  crosshair.classList.add('kick'); setTimeout(() => crosshair.classList.remove('kick'), 70);

  const rect = canvas.getBoundingClientRect();
  const bx = ((clientX - rect.left) / rect.width) * 2 - 1;
  const by = -((clientY - rect.top) / rect.height) * 2 + 1;

  if (W.rocket) {   // 바주카: 로켓을 날려 착탄 지점에 광역 폭발
    raycaster.setFromCamera(ndc.set(bx, by), camera);
    const hits = raycaster.intersectObjects(shootRoot.children, true);
    const target = hits[0] ? hits[0].point.clone() : raycaster.ray.at(45, new THREE.Vector3());
    const r = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.55, 8),
      new THREE.MeshStandardMaterial({ color: 0xd9483b, emissive: 0x662010, emissiveIntensity: 0.7, roughness: 0.4 }));
    r.position.copy(muzzle.getWorldPosition(new THREE.Vector3()));
    r.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), target.clone().sub(r.position).normalize());
    scene.add(r);
    rockets.push({ mesh: r, target, speed: 34, W });
    beep(180, 0.16, 'sawtooth', 0.06, -60);
    if (ammoOn() && ammoOf(G.weapon) <= 0) startReload();
    return;
  }

  // 샷건은 산탄 퍼짐, 기관총은 3점사, 나머지는 단발
  const offs = W.pellets
    ? Array.from({ length: W.pellets }, (_, i) => (i === 0 ? [0, 0] : [(Math.random() - 0.5) * 0.09, (Math.random() - 0.5) * 0.07]))
    : W.burst
      ? Array.from({ length: W.burst }, (_, i) => (i === 0 ? [0, 0] : [(Math.random() - 0.5) * 0.035, (Math.random() - 0.5) * 0.028]))
      : [[0, 0]];
  const results = offs.map(([ox, oy]) => processRay(bx + ox, by + oy, W));
  if (W.burst) {   // 3점사 총구 화염 연출
    for (let i = 1; i < W.burst; i++) {
      setTimeout(() => { muzzle.material.opacity = 1; setTimeout(() => { muzzle.material.opacity = 0; }, 45); }, i * 65);
      setTimeout(() => sfx.shoot(), i * 65);
    }
  }
  if (results.includes('enemy')) G.streak += 1;
  else if (!results.includes('fatwall') && !results.includes('trap')) G.streak = 0;
  if (ammoOn() && ammoOf(G.weapon) <= 0) startReload();
}

// ---------- 로켓(바주카): 착탄 시 광역 폭발 ----------
const rockets = [];
function rocketsUpdate(dt) {
  for (const r of [...rockets]) {
    const dir = r.target.clone().sub(r.mesh.position);
    const step = r.speed * dt;
    if (dir.length() <= step) {
      const at = r.target.clone();
      burst(at, 0xffb347, 34, 11);
      burst(at, 0xff5d73, 20, 7);
      damagePopup(at, '💥', '#ffb347', 1.6);
      beep(90, 0.3, 'sawtooth', 0.09, -40);
      let hitAny = false;
      for (const e of [...enemies]) {
        if (e.state === 'dying') continue;
        const d = e.mesh.position.distanceTo(at);
        if (d > (r.W.splash || 3)) continue;
        const dmg = d < 1.9 ? r.W.dmg : (r.W.splashDmg || 2);
        e.hp -= dmg;
        hitAny = true;
        damageFx(e, e.mesh.position.clone().add(new THREE.Vector3(0, 1, 0)), 0xffb347, 12);
        damagePopup(e.mesh.position.clone().add(new THREE.Vector3(0, 1, 0)), `-${dmg}`, '#ffd166', 1.1);
        const gain = Math.round(90 * comboMult());
        G.score += gain; G.shootScore += gain;
        if (e.hp <= 0) killEnemy(e, true);
      }
      for (const wl of [...fatWalls]) {   // 둔덕도 함께 파괴
        if (wl.mesh.position.distanceTo(at) > (r.W.splash || 3) + 1) continue;
        wl.hp -= r.W.dmg * 3;
        wl.bar.visible = true;
        const ratio = Math.min(1, Math.max(0, wl.hp) / wl.max);
        wl.bar.userData.fg.scale.x = Math.max(0.02, ratio);
        if (wl.hp <= 0) destroyFatWall(wl, at);
      }
      G.streak = hitAny ? G.streak + 1 : 0;
      scene.remove(r.mesh); rockets.splice(rockets.indexOf(r), 1);
      continue;
    }
    r.mesh.position.addScaledVector(dir.normalize(), step);
    if (Math.random() < 0.6) burst(r.mesh.position, 0xffd9a0, 2, 1.5);   // 연기 꼬리
  }
}

function killEnemy(e, byPlayer) {
  e.state = 'dying'; e.dyingT = 0.28;
  if (byPlayer) {
    const gain = Math.round(e.def.score * comboMult());
    G.score += gain; G.shootScore += gain;
    burst(e.mesh.position.clone().add(new THREE.Vector3(0, 1, 0)), 0xffd166, 24, 8);
    sfx.kill();
    if (e.def.boss) showMsg(T('bossKill', eLabel(e.def), gain.toLocaleString()), 3000);
  }
  // 암세포는 쓰러져도 조각으로 흩어진다
  if (e.def.splits) {
    for (let i = 0; i < e.def.splits; i++) {
      const child = spawnEnemy('cancerlet');
      if (!child) continue;
      child.curve = e.curve; child.clen = e.clen;
      child.progress = Math.max(0, Math.min(0.99, e.progress - 0.015));
      child.lane = (i - (e.def.splits - 1) / 2) * 1.4;
      child.mesh.position.copy(e.mesh.position);
    }
    burst(e.mesh.position.clone().add(new THREE.Vector3(0, 1.2, 0)), 0xff4d8a, 26, 9);
    showMsg(T('cancerSplit'), 2600);
  }
}

function freeTrap(trap) {
  trap.state = 'freed'; trap.t = 0;
  G.fatsRescued += 1;
  G.rescueScore += 800; G.score += 800;
  G.metabolic = Math.min(100, G.metabolic + 12);
  burst(trap.blob.getWorldPosition(new THREE.Vector3()), 0xffa040, 16, 4);
  sfx.rescue();
  showMsg(T('rescue'));
  // 구출 보상: 아이템 퀴즈 찬스 (무기 업그레이드 / 간 회복 포션)
  setTimeout(() => { if (G.state === 'WAVE' && !G.over) startQuiz('item'); }, 900);
}
function loseTrap(trap, shotBlob) {
  trap.state = 'lost'; trap.t = 0;
  G.fatsLost += 1;
  if (shotBlob) { showMsg(T('shotBlob')); sfx.no(); G.streak = 0; }
}

// ---------- 췌장 자동 사격 ----------
let pancTimer = 0;
function pancreasUpdate(dt) {
  if (G.pancDown) { pancSprite.material.color.setHex(0x777777); return; }
  const sugarEnemies = enemies.filter((e) => e.def.sugar && (e.state === 'walk' || e.state === 'attack') && e.mesh.position.z > -15);
  // 회복/소모
  if (sugarEnemies.length === 0) G.beta = Math.min(100, G.beta + 2.2 * dt);
  else G.beta = Math.min(100, G.beta + 0.4 * dt);
  // 저항성 상태로 계속 혹사되면 췌장부전으로 진행 (회복하면 부담이 천천히 풀림)
  if (G.beta <= 5 && sugarEnemies.length > 0) {
    G.pancStrain += dt;
    if (G.pancStrain >= 12) {
      G.pancDown = true;
      showMsg(T('pancFail'), 3600);
      sfx.no();
      return;
    }
  } else if (G.beta > 30) {
    G.pancStrain = Math.max(0, G.pancStrain - dt * 0.5);
  }
  pancTimer -= dt;
  if (pancTimer <= 0 && sugarEnemies.length > 0) {
    pancTimer = 1.0;
    let nearest = sugarEnemies[0];
    for (const e of sugarEnemies) if (e.mesh.position.z > nearest.mesh.position.z) nearest = e;
    const cost = G.sugar > 70 ? 5.0 : 2.2;   // 고혈당 = 과로
    G.beta = Math.max(0, G.beta - cost);
    const mult = pancMult();
    if (G.beta <= 10 && !G.pancWarned) {
      G.pancWarned = true;
      showMsg(T('pancResistWarn'), 3200);
      sfx.no();
    }
    // 무력화여도 계속 발사한다 — 저항성 시기의 고인슐린혈증 (약할수록 옅고 작은 탄)
    const tier = mult >= 1 ? 0 : mult >= 0.7 ? 1 : mult >= 0.45 ? 2 : 3;
    const p = new THREE.Mesh(new THREE.SphereGeometry([0.24, 0.21, 0.18, 0.14][tier], 8, 6),
      new THREE.MeshBasicMaterial({ color: [0x7dc8ff, 0xa5c2dd, 0xc2bda0, 0x9a9aa2][tier] }));
    p.position.copy(pancTip.getWorldPosition(new THREE.Vector3()));
    projectiles.push({ mesh: p, target: nearest, dmg: 1.2 * mult, speed: 26, tier });
    scene.add(p);
    beep(980, 0.05, 'sine', 0.03);
  }
  pancSprite.material.color.setHex(pancMult() >= 1 ? 0xffffff : pancMult() >= 0.7 ? 0xf2d9c0 : 0xd9b09a);
  const ps = 1 + Math.sin(performance.now() * 0.004) * 0.025;
  pancSprite.scale.set(-ps, ps, ps);   // 좌우반전 유지하며 맥동
}

// ---------- 웨이브 진행 ----------
function startWave(idx) {
  G.state = 'WAVE'; G.waveIdx = idx; G.waveT = 0; G.firedEvents = new Set();
  const w = WAVES[idx];
  G.spawnTimers = w.spawns.map((s) => ({ ...s, next: s.firstAt }));
  $('hud-wave').textContent = w.name;
  if (idx === WAVES.length - 1) {
    G.pipeOpen = true;
    showMsg(T('finalWave'), 3400);
  } else {
    showMsg(T('waveStart', w.name));
  }
}

function waveUpdate(dt) {
  const w = WAVES[G.waveIdx];
  G.waveT += dt;
  if (G.waveT < w.duration) {
    for (const s of G.spawnTimers) {
      if (G.waveT >= s.next) { s.next += s.interval; spawnEnemy(s.type); }
    }
    for (const ev of w.events) {
      if (G.waveT >= ev.t && !G.firedEvents.has(ev)) {
        G.firedEvents.add(ev);
        if (ev.type === 'trap') spawnTrap();
        if (ev.type === 'boss') {   // 보스 3종 로테이션 (한 판에 중복 없이)
          const pool = BOSS_POOL.filter((b) => !G.bossesUsed.includes(b));
          const src = pool.length ? pool : BOSS_POOL;
          const pick = src[Math.floor(Math.random() * src.length)];
          G.bossesUsed.push(pick);
          spawnEnemy(pick);
          showMsg((BOSS_INTRO[G.lang] || BOSS_INTRO.ko)[pick], 3600);
        }
      }
    }
  }
  const fieldClear = enemies.length === 0 && traps.every((t) => t.state !== 'live');
  if ((G.waveT >= w.duration && fieldClear) || G.waveT >= w.duration + 16) {
    // 잔여 정리
    for (const e of [...enemies]) removeEnemy(e);
    for (const t of [...traps]) removeTrap(t);
    if (G.waveIdx < WAVES.length - 1) startQuiz('wave');
    else finishGame(true);
  }
}

// ---------- 적 업데이트 ----------
function removeEnemy(e) {
  shootRoot.remove(e.mesh);
  const i = enemies.indexOf(e); if (i >= 0) enemies.splice(i, 1);
}
function removeTrap(t) {
  shootRoot.remove(t.mesh);
  const i = traps.indexOf(t); if (i >= 0) traps.splice(i, 1);
}

function enemiesUpdate(dt, t) {
  const stage = liverStage();
  for (const e of [...enemies]) {
    const m = e.mesh;
    // 피격 플래시 복원 + 체력바 갱신 (빌보드)
    if (e.flashT > 0) {
      e.flashT -= dt;
      if (e.flashT <= 0) for (const r of e.mats) { r.m.emissive.copy(r.em); r.m.emissiveIntensity = r.emi; }
    }
    if (e.hpBar) {
      const ratio = Math.min(1, Math.max(0, e.hp) / e.maxhp);
      const fg = e.hpBar.userData.fg;
      fg.scale.x = Math.max(0.02, ratio);
      fg.position.x = -(1 - fg.scale.x) * 0.52;
      fg.material.color.setHex(ratio > 0.5 ? 0x42d68f : ratio > 0.25 ? 0xffd166 : 0xff5d73);
      e.hpBar.quaternion.copy(e.mesh.quaternion).invert().multiply(camera.quaternion);
    }
    // 그림자는 바닥에 고정, 팔다리는 걸음에 맞춰 흔들기
    if (e.shadow) {
      e.shadow.position.y = 0.03 - m.position.y;
      e.shadow.scale.setScalar(Math.max(0.35, 1 - m.position.y * 0.09));
    }
    if (e.limbs && e.state === 'walk') {
      const sw = Math.sin(t * 9 + e.phase) * 0.55;
      e.limbs.legs.forEach((l, i) => { l.rotation.x = sw * (i ? -1 : 1); });
      e.limbs.arms.forEach((a, i) => { a.rotation.x = sw * (i ? 1 : -1) * 0.7; });
    }
    if (e.state === 'dying') {
      e.dyingT -= dt;
      m.scale.multiplyScalar(1 - dt * 6);
      if (e.dyingT <= 0) removeEnemy(e);
      continue;
    }
    if (e.def.fly) {   // 비행 몬스터: '간의 성'에서 출발, 무작위 목표점을 갱신하며 지그재그 활강
      m.position.z += e.def.speed * dt;
      const p01 = Math.min(1, (m.position.z - e.z0) / (6 - e.z0));
      e.jinkT -= dt;
      if (e.jinkT <= 0) {
        e.jinkT = 0.55 + Math.random() * 0.9;
        // 성 위치에서 출발해 다가올수록 중앙으로: 지그재그 중심선이 서서히 이동
        const centerX = e.x0 * (1 - p01);
        e.xT = centerX + (Math.random() - 0.5) * (4 + 8 * p01);
        const maxY = 7.5 - 5.5 * p01;
        e.yT = 1.6 + Math.random() * Math.max(0.6, maxY - 1.6);
      }
      m.position.x += (e.xT - m.position.x) * Math.min(1, dt * 2.2);
      m.position.y += (e.yT - m.position.y) * Math.min(1, dt * 2.0);
      m.rotation.z = Math.max(-0.5, Math.min(0.5, (m.position.x - e.xT) * 0.1));
      if (e.wings) e.wings.forEach((w, i) => { w.rotation.z = (i ? 1 : -1) * (0.45 + Math.sin(t * 16 + e.phase) * 0.5); });
      if (m.position.z >= 6) {
        G.core = Math.max(0, G.core - 6);
        G.metabolic = Math.max(0, G.metabolic - 3);
        flashDamage(); sfx.dmg();
        showMsg(T('flyHit'));
        removeEnemy(e);
        if (G.core <= 0 && !G.over) { finishGame(false); return; }
      }
      continue;
    }
    if (e.state === 'walk') {
      e.progress += (e.def.speed * dt) / e.clen;
      const tt = Math.min(e.progress, 1);
      const p = e.curve.getPointAt(tt);
      const tan = e.curve.getTangentAt(tt);
      m.position.set(p.x - tan.z * e.lane,
        Math.abs(Math.sin(t * 5 + e.phase)) * (e.type === 'soda' ? 0.45 : 0.12),
        p.z + tan.x * e.lane);
      m.rotation.y = Math.atan2(tan.x, tan.z);
      m.rotation.z = Math.sin(t * 6 + e.phase) * 0.07;
      if (e.progress >= 1) {
        m.position.x = e.lane * 1.8;
        // 섬유화 단계면 일부가 성벽을 샌다
        if (e.def.ram || (stage >= 3 && Math.random() < 0.45 && !e.def.boss)) {
          e.state = 'leak';
          if (e.def.ram) showMsg(T('plaqueRam'), 2400);
        } else {
          e.state = 'attack'; e.attackT = LIVER_DISSOLVE[stage];
          G.fibrosis = Math.min(100, G.fibrosis + e.def.wallDmg * 0.55 * (e.def.liverX || 1));
          if (e.def.liverX) showMsg(T('sojuHit'), 1800);
          G.metabolic = Math.max(0, G.metabolic - 3);
        }
      }
    } else if (e.state === 'attack') {
      // 성벽에 매달려 공격, 간이 서서히 녹여낸다 (묵묵히)
      e.attackT -= dt;
      m.position.y = Math.abs(Math.sin(t * 9 + e.phase)) * 0.2;
      m.rotation.z = Math.sin(t * 12 + e.phase) * 0.12;
      if (e.attackT <= 0) {
        burst(m.position.clone().add(new THREE.Vector3(0, 0.8, 0)), 0x8a5a58, 7, 3);
        killEnemy(e, false);   // 간이 처리 — 점수 없음
      }
    } else if (e.state === 'leak') {
      m.position.z += e.def.speed * 1.6 * dt;
      m.position.y = Math.abs(Math.sin(t * 7 + e.phase)) * 0.3;
      if (m.position.z >= LEAK_Z) {
        G.core = Math.max(0, G.core - e.def.wallDmg);
        G.metabolic = Math.max(0, G.metabolic - 4);
        flashDamage(); sfx.dmg();
        showMsg(T('leak'));
        removeEnemy(e);
        if (G.core <= 0 && !G.over) { finishGame(false); return; }
      }
    }
  }
}

function trapsUpdate(dt) {
  for (const tr of [...traps]) {
    tr.t += dt;
    if (tr.state === 'live') {
      tr.blob.position.y = 0.85 + Math.abs(Math.sin(tr.t * 4)) * 0.25;
      tr.lock.rotation.y = Math.sin(tr.t * 3) * 0.3;
      if (tr.t >= tr.life) { tr.state = 'dragging'; tr.t = 0; }
    } else if (tr.state === 'dragging') {
      // 못 구하면 내장지방이 간으로 흘러간다
      const p = tr.mesh.position;
      p.x += (0 - p.x) * dt * 1.4; p.z += (WALL_Z - p.z) * dt * 1.4;
      if (tr.t > 1.8) {
        G.fibrosis = Math.min(100, G.fibrosis + 12);
        showMsg(T('dragged'));
        sfx.no();
        loseTrap(tr, false);
      }
    } else { // freed | lost
      if (tr.state === 'freed') {
        tr.blob.position.y += dt * 3.2;
        tr.blob.scale.multiplyScalar(1 - dt * 1.2);
        tr.mesh.children.forEach((c) => { if (c !== tr.blob) c.scale.multiplyScalar(1 - dt * 2); });
      } else {
        tr.mesh.scale.multiplyScalar(1 - dt * 2.2);
      }
      if (tr.t > 1.1) removeTrap(tr);
    }
  }
}

function projectilesUpdate(dt) {
  for (const p of [...projectiles]) {
    const drop = () => { scene.remove(p.mesh); projectiles.splice(projectiles.indexOf(p), 1); };
    if (!p.target || p.target.state === 'dying' || !enemies.includes(p.target)) { drop(); continue; }
    const targetPos = p.target.mesh.position.clone().add(new THREE.Vector3(0, 0.8, 0));
    const dir2 = targetPos.sub(p.mesh.position);
    const dist = dir2.length();
    if (dist < 0.6) {
      p.target.hp -= p.dmg;
      G.sugar = Math.max(0, G.sugar - 7);
      damageFx(p.target, p.mesh.position, 0x9ad0ff, 8);
      // 인슐린 위력 단계가 눈에 보이게: 약할수록 옅고 작은 숫자
      damagePopup(p.mesh.position, `-${p.dmg.toFixed(1)}`,
        ['#7dc8ff', '#a5c2dd', '#c2bda0', '#9a9aa2'][p.tier || 0],
        [1.2, 1.05, 0.9, 0.7][p.tier || 0]);
      if (p.target.hp <= 0) killEnemy(p.target, false);
      drop(); continue;
    }
    p.mesh.position.add(dir2.normalize().multiplyScalar(p.speed * dt));
  }
}

function particlesUpdate(dt) {
  for (const pt of [...particles]) {
    pt.life -= dt;
    if (pt.life <= 0) { scene.remove(pt.mesh); particles.splice(particles.indexOf(pt), 1); continue; }
    pt.v.y -= 9 * dt;
    pt.mesh.position.addScaledVector(pt.v, dt);
    pt.mesh.material.opacity = pt.life / 0.45;
  }
}

// ---------- 혈당/대사 ----------
function metersUpdate(dt) {
  const sugarCount = enemies.filter((e) => e.def.sugar && e.state !== 'dying').length;
  G.sugar = Math.min(100, Math.max(0, G.sugar + (sugarCount * 2.6 - 3.0) * dt));
  if (G.sugar > 70) G.metabolic = Math.max(0, G.metabolic - 1.6 * dt);
}

// ---------- 퀴즈 ----------
function drawQuiz() {
  if (!G.quizDeck.length) G.quizDeck = [...QUIZ_POOL].sort(() => Math.random() - 0.5);
  // 선택한 난이도 우선, 소진되면 인접 난이도로
  const pref = G.quizDiff === 'hard' ? ['hard', 'mid', 'easy'] : G.quizDiff === 'easy' ? ['easy', 'mid', 'hard'] : ['mid', 'hard', 'easy'];
  for (const d of pref) {
    const i = G.quizDeck.findIndex((q) => (q.diff || 'mid') === d);
    if (i >= 0) return G.quizDeck.splice(i, 1)[0];
  }
  // 파일 로드가 아직이거나 실패한 극단적 경우의 비상 문항 (AASLD 내용)
  return G.quizDeck.pop() || { q: 'MASLD의 예후를 가장 크게 좌우하는 요소는 무엇일까요?', a: ['간 섬유화의 정도', '간 지방의 양', '키', '혈액형'], correct: 0 };
}

function weaponUp(steps = 1) {
  if (G.weapon >= WEAPONS.length - 1) return false;
  G.weapon = Math.min(WEAPONS.length - 1, G.weapon + steps);
  applyWeaponVisual();
  showMsg(T('weaponUp', WEAPONS[G.weapon].icon, wName(G.weapon)), 3000);
  return true;
}

function startQuiz(mode = 'wave') {
  G.state = 'QUIZ'; G.quizMode = mode; G.quizT = 15; G.quizAnswered = false;
  G.currentQuiz = drawQuiz(); G.quizTotal += 1;
  const quiz = G.currentQuiz;
  const diffLabel = { easy: 'EASY', mid: 'NORMAL', hard: 'HARD' }[G.quizDiff] || 'NORMAL';
  $('quiz-tag').textContent = (mode === 'item' ? T('quizTagItem') : T('quizTagWave')) + ` · ${diffLabel}`;
  $('quiz-sub').textContent = mode === 'item' ? T('quizSubItem') : T('quizSubWave');
  // 보기 셔플
  const order = quiz.a.map((_, i) => i).sort(() => Math.random() - 0.5);
  $('quiz-q').textContent = quiz.q;
  $('quiz-feedback').textContent = '';
  const wrap = $('quiz-answers'); wrap.innerHTML = '';
  order.forEach((ai) => {
    const btn = document.createElement('button');
    btn.className = 'quiz-btn'; btn.textContent = quiz.a[ai];
    btn.addEventListener('pointerdown', (ev) => { ev.stopPropagation(); answerQuiz(ai === quiz.correct, btn); });
    wrap.appendChild(btn);
  });
  $('quiz').classList.remove('hidden');
}

function answerQuiz(correct, btn) {
  if (G.quizAnswered) return;
  G.quizAnswered = true;
  sfx.shoot();
  const buttons = [...document.querySelectorAll('.quiz-btn')];
  buttons.forEach((b) => { b.style.pointerEvents = 'none'; });
  const quiz = G.currentQuiz;
  if (correct) {
    btn.classList.add('correct');
    const speedBonus = Math.round((G.quizT / 15) * 500);
    const gain = 1500 + speedBonus;
    G.quizScore += gain; G.score += gain; G.quizCorrectCount += 1;
    if (G.quizMode === 'item') {
      const upgraded = weaponUp();
      if (!upgraded) {
        G.fibrosis = Math.max(0, G.fibrosis - 20);
        if (!G.pancDown) { G.beta = Math.min(100, G.beta + 20); G.pancStrain = Math.max(0, G.pancStrain - 6); }
        G.metabolic = Math.min(100, G.metabolic + 10);
      }
      $('quiz-feedback').textContent = upgraded ? T('okItemGun', gain.toLocaleString()) : T('okItemPot', gain.toLocaleString());
    } else {
      G.fibrosis = Math.max(0, G.fibrosis - 25);
      if (!G.pancDown) { G.beta = Math.min(100, G.beta + 30); G.pancStrain = Math.max(0, G.pancStrain - 6); }
      G.metabolic = Math.min(100, G.metabolic + 8);
      weaponUp(1);   // 점수 마일스톤 승급이 있어 1단계씩 — 모든 무기를 거치게
      $('quiz-feedback').textContent = T('okWave', gain.toLocaleString());
    }
    sfx.ok();
  } else {
    if (btn) btn.classList.add('wrong');
    buttons.find((b) => b.textContent === quiz.a[quiz.correct])?.classList.add('correct');
    $('quiz-feedback').textContent = G.quizMode === 'item' ? T('ngItem', quiz.a[quiz.correct]) : T('ngWave', quiz.a[quiz.correct]);
    sfx.no();
  }
  setTimeout(() => {
    $('quiz').classList.add('hidden');
    if (G.quizMode === 'item') G.state = 'WAVE';
    else startWave(G.waveIdx + 1);
  }, 2400);
}

function quizUpdate(dt) {
  if (G.quizAnswered) return;
  G.quizT -= dt;
  $('quiz-timer').style.width = `${Math.max(0, (G.quizT / 15) * 100)}%`;
  if (G.quizT <= 0) answerQuiz(false, null);
}

// ---------- 시작 / 종료 ----------
function startGame() {
  $('screen-start').classList.add('hidden');
  hud.classList.remove('hidden');
  G.quizDeck = [...QUIZ_POOL].sort(() => Math.random() - 0.5);
  applyWeaponVisual();
  startWave(0);
}



function finishGame(victory) {
  if (G.over) return;
  G.over = true; G.state = 'RESULT';
  const liverSoft = Math.max(0, 100 - G.fibrosis);
  G.finishBonus = Math.round(liverSoft * 15 + Math.max(0, G.beta) * 15 + Math.max(0, G.core) * 25 + Math.max(0, G.metabolic) * 10);
  if (victory) G.score += G.finishBonus; else G.finishBonus = 0;

  $('result-score').textContent = G.score.toLocaleString();
  $('result-grade').textContent = victory ? T('grades').find(([min]) => G.score >= min)[1] : T('defeat');

  const stage = liverStage();
  const stageName = T('liverShort')[stage];
  $('result-report').innerHTML = `
    <div class="rep-card"><div class="rep-k">C · K</div><div class="rep-v">${Math.round(Math.max(0, G.core))}%</div><div class="rep-s">${T('repCK')}</div></div>
    <div class="rep-card"><div class="rep-k">L</div><div class="rep-v">${stageName}</div><div class="rep-s">${T('repL')}</div></div>
    <div class="rep-card"><div class="rep-k">M</div><div class="rep-v">${Math.round(Math.max(0, G.metabolic))}%</div><div class="rep-s">${T('repM')}</div></div>
    <div class="rep-card"><div class="rep-k">QUIZ</div><div class="rep-v">${G.quizCorrectCount}/${Math.max(1, G.quizTotal)}</div><div class="rep-s">${T('repQ')}</div></div>`;
  $('result-breakdown').innerHTML =
    T('breakdown', G.shootScore.toLocaleString(), G.quizScore.toLocaleString(), G.rescueScore.toLocaleString(),
      G.fatsRescued, `${WEAPONS[G.weapon].icon} ${wName(G.weapon)}`) +
    T('finishBonus', G.finishBonus.toLocaleString()) + (G.pancDown ? T('pancNote') : '');
  $('screen-result').classList.remove('hidden');
  hud.classList.add('hidden');
  setTimeout(() => { canRestart = true; }, 1200);
}
let canRestart = false;

// ---------- 디버그 모드 (D 키): 경로 마커 + 커서 좌표(이미지 norm / 월드) ----------
let debugOn = false, debugGroup = null;
function toggleDebug() {
  debugOn = !debugOn;
  $('debug-info').classList.toggle('hidden', !debugOn);
  if (debugGroup) { scene.remove(debugGroup); debugGroup = null; }
  if (debugOn) {
    debugGroup = new THREE.Group();
    ROUTES.forEach((r, ri) => {
      const color = [0x00ff88, 0x66aaff, 0xffb020][ri];   // 터널=초록, 심장=파랑, 파이프=주황
      for (let i = 0; i <= 60; i++) {
        const mk = new THREE.Mesh(new THREE.SphereGeometry(0.13 + (i / 60) * 0.22, 6, 5), new THREE.MeshBasicMaterial({ color }));
        mk.position.copy(r.curve.getPointAt(i / 60)); mk.position.y = 0.25;
        debugGroup.add(mk);
      }
    });
    scene.add(debugGroup);
  }
}
function groundPoint(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const sx = (clientX - rect.left) / rect.width, sy = (clientY - rect.top) / rect.height;
  const v = new THREE.Vector3(sx * 2 - 1, -(sy * 2 - 1), 0.5); v.unproject(camera);
  const origin = camera.position.clone();
  const dir = v.sub(origin).normalize();
  if (dir.y >= -0.001) return { sx, sy, p: null };
  const tt = -origin.y / dir.y;
  return { sx, sy, p: origin.clone().addScaledVector(dir, tt) };
}
function debugCoords(clientX, clientY) {
  const g = groundPoint(clientX, clientY);
  const world = g.p ? `world(${g.p.x.toFixed(1)}, ${g.p.z.toFixed(1)})` : 'ground 밖';
  const editing = editRoute >= 0 ? ` · ✏️루트${editRoute + 1} ${editPts.length}점 (Enter 저장/Esc 취소)` : '';
  return `img(${g.sx.toFixed(3)}, ${g.sy.toFixed(3)}) → ${world}${editing}`;
}

// ---------- 루트 드로잉 편집기 (디버그): 1/2/3 = 그리기 시작, 클릭 = 점 추가, Enter = 저장, Esc = 취소, 0 = 기본 복원 ----------
let editRoute = -1, editPts = [], editMarkers = null, routeAutoDebug = false;

// ---------- 지방 둔덕 배치 모드 (F): 클릭한 곳으로 둔덕이 순서대로 이동, 자동 저장 ----------
let wallEdit = false, wallEditIdx = 0, wallAutoDebug = false;
function toggleWallEdit() {
  wallEdit = !wallEdit;
  wallEditIdx = 0;
  if (wallEdit && !debugOn) { toggleDebug(); wallAutoDebug = true; }
  if (!wallEdit && wallAutoDebug) { if (debugOn) toggleDebug(); wallAutoDebug = false; }
  showMsg(wallEdit ? '🍞 둔덕 배치 모드 — 빈 땅 클릭=추가(최대 6), 둔덕 클릭=제거 (F로 종료)' : '🍞 둔덕 배치 종료', 3200);
}

// ---------- 포탑 이동 모드 (4=간, 5=췌장): 클릭 위치로 이동, 자동 저장 ----------
let organEdit = null, organAutoDebug = false;
function toggleOrganEdit(which) {
  if (organEdit === which) { organEdit = null; }
  else organEdit = which;
  if (organEdit && !debugOn) { toggleDebug(); organAutoDebug = true; }
  if (!organEdit && organAutoDebug) { if (debugOn) toggleDebug(); organAutoDebug = false; }
  showMsg(organEdit
    ? `${organEdit === 'liver' ? '🫀 간 수호탑' : '💉 췌장 포탑'} 이동 모드 — 클릭한 자리로 옮겨요 (같은 키로 종료)`
    : '포탑 이동 종료', 3000);
}
function saveOrganPos() {
  localStorage.setItem('xgb_organs', JSON.stringify({
    liver: [+liverSprite.position.x.toFixed(1), +liverSprite.position.z.toFixed(1)],
    panc: [+pancSprite.position.x.toFixed(1), +pancSprite.position.z.toFixed(1)],
  }));
}
function saveWallPos() {
  localStorage.setItem('xgb_fatwalls2', JSON.stringify(
    fatWalls.map((w) => [+w.mesh.position.x.toFixed(1), +w.mesh.position.z.toFixed(1)])));
}
function startRouteEdit(idx) {
  finishRouteEdit(false);   // 이전 편집 정리 후에 디버그 자동점등 (순서 중요)
  if (!debugOn) { toggleDebug(); routeAutoDebug = true; }
  editRoute = idx; editPts = [];
  editMarkers = new THREE.Group(); scene.add(editMarkers);
  showMsg(`✏️ ${['터널(1번)', '심장(2번)', '파이프(3번)'][idx]} 루트 그리기 — 스폰 지점부터 방어선까지 길을 따라 클릭한 뒤 Enter`, 5200);
}
function finishRouteEdit(save) {
  if (editRoute < 0) return;
  if (save && editPts.length >= 3) {
    const pts = editPts.map((p) => [+p.x.toFixed(1), +p.z.toFixed(1)]);
    const store = JSON.parse(localStorage.getItem('xgb_routes') || '{}');
    store[editRoute] = pts;
    localStorage.setItem('xgb_routes', JSON.stringify(store));
    applyRoutePoints(editRoute, pts);
    console.log(`[route ${editRoute}]`, JSON.stringify(pts));
    showMsg('✅ 루트 저장! 새로 나오는 적부터 이 길을 따라와요 (0 키 = 기본 복원)', 3600);
    if (debugOn && !routeAutoDebug) { toggleDebug(); toggleDebug(); }   // 경로 마커 갱신
  } else if (editPts.length) {
    showMsg('↩️ 루트 그리기 취소', 1600);
  }
  editRoute = -1; editPts = [];
  if (editMarkers) { scene.remove(editMarkers); editMarkers = null; }
  if (routeAutoDebug) { if (debugOn) toggleDebug(); routeAutoDebug = false; }   // 자동으로 켠 디버그는 같이 끔
}

// ---------- 입력 ----------
window.addEventListener('pointermove', (e) => {
  crosshair.style.left = e.clientX + 'px';
  crosshair.style.top = e.clientY + 'px';
  if (debugOn) $('debug-info').textContent = debugCoords(e.clientX, e.clientY);
});
window.addEventListener('contextmenu', (e) => { e.preventDefault(); });
window.addEventListener('pointerdown', (e) => {
  audio();
  if (e.button === 2) {   // 우클릭: 보유 무기 순환 (재장전 중에도 가능)
    if (G.state === 'WAVE') swapWeapon();
    return;
  }
  if (editRoute >= 0) {   // 루트 그리기 중: 클릭 = 점 추가 (사격 안 함)
    const g = groundPoint(e.clientX, e.clientY);
    if (g.p) {
      editPts.push(g.p);
      const mk = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff4444 }));
      mk.position.copy(g.p); mk.position.y = 0.3;
      editMarkers.add(mk);
      $('debug-info').textContent = debugCoords(e.clientX, e.clientY);
    }
    return;
  }
  if (organEdit) {   // 포탑 이동 중: 클릭 = 이동 (사격 안 함)
    const g = groundPoint(e.clientX, e.clientY);
    if (g.p) {
      placeOrgan(organEdit, +g.p.x.toFixed(1), +g.p.z.toFixed(1));
      saveOrganPos();
      showMsg(`${organEdit === 'liver' ? '🫀 간 수호탑' : '💉 췌장 포탑'} 이동 완료 (자동 저장)`, 1500);
    }
    return;
  }
  if (wallEdit) {   // 둔덕 배치 중: 빈 땅 클릭 = 추가, 둔덕 클릭 = 제거 (사격 안 함)
    const rect2 = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - rect2.left) / rect2.width) * 2 - 1, -((e.clientY - rect2.top) / rect2.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hitW = raycaster.intersectObjects(shootRoot.children, true)
      .find((h) => h.object.userData.entity && h.object.userData.entity.kind === 'fatwall');
    if (hitW) {
      const wl = hitW.object.userData.entity.ref;
      shootRoot.remove(wl.mesh); fatWalls.splice(fatWalls.indexOf(wl), 1);
      saveWallPos();
      showMsg(`🍞 둔덕 제거 — 현재 ${fatWalls.length}개 (자동 저장)`, 1600);
    } else {
      const g = groundPoint(e.clientX, e.clientY);
      if (g.p && fatWalls.length < 6) {
        makeFatWall(+g.p.x.toFixed(1), +g.p.z.toFixed(1));
        saveWallPos();
        showMsg(`🍞 둔덕 추가 — 현재 ${fatWalls.length}개 (자동 저장)`, 1600);
      } else if (fatWalls.length >= 6) showMsg('둔덕은 최대 6개까지예요', 1500);
    }
    return;
  }
  if (debugOn) console.log('[debug]', debugCoords(e.clientX, e.clientY));
  if (G.state === 'START') { startGame(); return; }
  if (G.state === 'WAVE') shootAt(e.clientX, e.clientY);
  if (G.state === 'RESULT' && canRestart) location.reload();
});
// 시작 화면 인트로 이중 언어
const INTRO_STRINGS = {
  ko: {
    sub: 'CKLM ARCADE — 몸속 최후의 방어선',
    press: '화면을 쏘면 시작합니다',
    pressAgain: '화면을 쏘면 다시 시작합니다',
    diffLabel: '문제 난이도',
    howto: '걸어오는 <b>정크푸드</b>를 쏘고, <b>퀴즈</b>를 맞혀 점수를 올리세요<br>' +
      '<b>간 성벽</b>은 놓친 적을 묵묵히 막아주지만, 혹사되면 서서히 굳어가요<br>' +
      '<b>췌장 망루</b>는 당류 적을 자동 요격하지만, 과로하면 인슐린이 약해져요<br>' +
      '덫에 갇힌 <b>지방이</b>는 자물쇠만 정확히 쏴서 구해주세요 (지방이를 쏘면 안 돼요!)',
  },
  en: {
    sub: 'CKLM ARCADE — LAST DEFENSE INSIDE THE BODY',
    press: 'Shoot the screen to start',
    pressAgain: 'Shoot the screen to play again',
    diffLabel: 'Quiz difficulty',
    howto: 'Shoot the marching <b>junk food</b> and answer <b>quizzes</b> to score<br>' +
      'The <b>liver wall</b> quietly absorbs what you miss — overwork slowly hardens it<br>' +
      'The <b>pancreas turret</b> auto-fires insulin at sugar enemies, but overwork weakens it<br>' +
      'Free trapped <b>Fatty</b> by shooting only the lock (never shoot Fatty!)',
  },
};
function applyLang(lang) {
  G.lang = lang;
  loadQuizLang(lang);
  const S = INTRO_STRINGS[lang];
  const press = document.querySelectorAll('.press-start');
  if (press[0]) press[0].textContent = S.press;
  if (press[1]) press[1].textContent = S.pressAgain;
  const subs = document.querySelectorAll('.title-sub');
  if (subs[0]) subs[0].textContent = S.sub;
  const labels = document.querySelectorAll('.opt-label');
  if (labels[1]) labels[1].textContent = S.diffLabel;
  const howto = document.querySelector('.howto');
  if (howto) howto.innerHTML = S.howto;
  // 인게임 HUD 고정 라벨도 함께 전환
  const setTxt = (id, v) => { const el = $(id); if (el) el.textContent = v; };
  setTxt('lbl-core', T('lblCore')); setTxt('lbl-meta', T('lblMeta')); setTxt('lbl-sugar', T('lblSugar'));
  setTxt('lbl-liver', T('lblLiver')); setTxt('lbl-panc', T('lblPanc'));
  applyWeaponVisual();
}

// 시작 화면 옵션 (언어·문제 난이도) — 클릭이 게임 시작으로 번지지 않게 전파 차단
document.querySelectorAll('.opt-btn').forEach((b) => {
  b.addEventListener('pointerdown', (ev) => {
    ev.stopPropagation();
    audio();
    const { opt, val } = b.dataset;
    document.querySelectorAll(`.opt-btn[data-opt="${opt}"]`).forEach((x) => x.classList.toggle('sel', x === b));
    if (opt === 'lang') applyLang(val);
    else G.quizDiff = val;
    beep(620, 0.05, 'triangle', 0.05);
  });
});
if (QUIZ_LANG_INIT === 'en') {
  document.querySelectorAll('.opt-btn[data-opt="lang"]').forEach((x) => x.classList.toggle('sel', x.dataset.val === 'en'));
  applyLang('en');
}

window.addEventListener('keydown', (e) => {
  const k = e.code || '';   // 한글 IME 상태에선 e.key가 'Process'로 들어올 수 있어 e.code 기준으로 판정
  if (k === 'KeyC') crosshair.style.display = crosshair.style.display === 'none' ? '' : 'none';
  if (k === 'KeyD') toggleDebug();
  if (k === 'Digit1' || k === 'Numpad1') startRouteEdit(0);
  if (k === 'Digit2' || k === 'Numpad2') startRouteEdit(1);
  if (k === 'Digit3' || k === 'Numpad3') startRouteEdit(2);
  if (k === 'Enter' || k === 'NumpadEnter') finishRouteEdit(true);
  if (k === 'KeyF') toggleWallEdit();
  if (k === 'Digit9' || k === 'Numpad9') {   // 현재 배치 전체를 공유 주소로 복사
    const layout = {
      routes: Object.fromEntries(ROUTES.map((r, i) => [i, r.curve.points.map((p) => [+p.x.toFixed(1), +p.z.toFixed(1)])])),
      walls: fatWalls.map((w) => [+w.mesh.position.x.toFixed(1), +w.mesh.position.z.toFixed(1)]),
      organs: { liver: [+liverSprite.position.x.toFixed(1), +liverSprite.position.z.toFixed(1)], panc: [+pancSprite.position.x.toFixed(1), +pancSprite.position.z.toFixed(1)] },
    };
    const code = btoa(unescape(encodeURIComponent(JSON.stringify(layout))));
    const url = location.origin + location.pathname + '?layout=' + code;
    console.log('[layout]', url);
    if (navigator.clipboard) navigator.clipboard.writeText(url).then(
      () => showMsg('📋 배치 주소가 복사됐어요 — 다른 컴퓨터에서 열면 그대로 적용돼요', 3600),
      () => showMsg('콘솔(F12)에 배치 주소를 출력했어요', 3000));
    else showMsg('콘솔(F12)에 배치 주소를 출력했어요', 3000);
  }
  if (k === 'Digit4' || k === 'Numpad4') toggleOrganEdit('liver');
  if (k === 'Digit5' || k === 'Numpad5') toggleOrganEdit('panc');
  if (k === 'Escape') { finishRouteEdit(false); if (wallEdit) toggleWallEdit(); if (organEdit) toggleOrganEdit(organEdit); }
  if (k === 'Digit0' || k === 'Numpad0') {
    localStorage.removeItem('xgb_routes');
    localStorage.removeItem('xgb_fatwalls2');
    localStorage.removeItem('xgb_organs');
    ROUTES.forEach((_, i) => applyRoutePoints(i, DEFAULT_ROUTES[i]));
    placeOrgan('liver', ORGAN_DEFAULTS.liver[0], ORGAN_DEFAULTS.liver[1]);
    placeOrgan('panc', ORGAN_DEFAULTS.panc[0], ORGAN_DEFAULTS.panc[1]);
    fatWalls.slice().forEach((w) => { shootRoot.remove(w.mesh); });
    fatWalls.length = 0;
    DEFAULT_WALL_POS.forEach(([x, z]) => makeFatWall(x, z));
    if (debugOn) { toggleDebug(); toggleDebug(); }
    showMsg('🔄 기본 루트·둔덕 위치로 복원했어요', 2200);
  }
});

// ---------- 메인 루프 ----------
const clock = new THREE.Clock();
let simT = 0;
function step(dt) {
  simT += dt;
  const t = simT;

  // 환경 연출은 항상
  pulse.intensity = 40 + Math.pow(Math.max(0, Math.sin(t * 2.4)), 6) * 70 + Math.pow(Math.max(0, Math.sin(t * 2.4 - 0.5)), 8) * 30;
  for (let i = 0; i < RBC_N; i++) {
    const d = rbcData[i];
    d.z += dt * 1.4 * d.wob;
    if (d.z > 8) d.z = -40;
    dummy.position.set(d.x + Math.sin(t * d.wob + i) * 0.8, d.y + Math.cos(t * 0.7 * d.wob + i) * 0.6, d.z);
    dummy.rotation.set(t * d.wob, i, t * 0.5);
    dummy.scale.setScalar(d.s);
    dummy.updateMatrix();
    rbc.setMatrixAt(i, dummy.matrix);
  }
  rbc.instanceMatrix.needsUpdate = true;
  coreMeshes.forEach((c, i) => { c.position.y = 5.4 + Math.sin(t * 1.8 + i * 2) * 0.25; c.rotation.y += dt * 0.6; });
  gunKick = Math.max(0, gunKick - dt * 8);
  gun.position.z = -1.45 + gunKick * 0.22;
  gun.rotation.x = gunKick * 0.18;
  G.fireCooldown = Math.max(0, G.fireCooldown - dt);

  if (G.state === 'WAVE') {
    waveUpdate(dt);
    enemiesUpdate(dt, t);
    trapsUpdate(dt);
    pancreasUpdate(dt);
    reloadUpdate(dt);
    liverPulseUpdate(dt);
    projectilesUpdate(dt);
    metersUpdate(dt);
    updateHUD();
  } else if (G.state === 'QUIZ') {
    quizUpdate(dt);
  }
  particlesUpdate(dt);
  beamsUpdate(dt);
  liverRingsUpdate(dt);
  rocketsUpdate(dt);
  spawnFxUpdate(dt);
  popupsUpdate(dt);

  renderer.render(scene, camera);
}
function tick() {
  requestAnimationFrame(tick);
  step(Math.min(clock.getDelta(), 0.05));
}
window.DBG = { G, enemies, traps, fatWalls, projectiles, rockets, applyWeaponVisual, buildGunModel, WEAPONS, ENEMY_TYPES, camera, scene, step, ROUTES, THREE, toggleDebug, startRouteEdit, finishRouteEdit, spawnEnemy };  // 디버그용 노출
tick();
