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
  soda:   { hp: 2,  speed: 3.2, score: 150, wallDmg: 5,  sugar: true,  label: '소용돌이 캔디' },
  fries:  { hp: 3,  speed: 2.2, score: 200, wallDmg: 7,  sugar: false, label: '트랜스 프라이' },
  burger: { hp: 8,  speed: 1.35, score: 400, wallDmg: 13, sugar: false, label: '미드나잇 버거' },
  pizza:  { hp: 5,  speed: 1.8, score: 300, wallDmg: 9,  sugar: false, label: '기름진 피자' },
  ramen:  { hp: 6,  speed: 1.5, score: 350, wallDmg: 11, sugar: false, label: '나트륨 컵라면' },
  icecream: { hp: 2, speed: 2.8, score: 200, wallDmg: 6, sugar: true,  label: '아이스크림 콘' },
  boss:   { hp: 45, speed: 0.85, score: 2000, wallDmg: 30, sugar: false, label: '킹 버거' },
  donut:  { hp: 1,  speed: 3.4, score: 250, wallDmg: 0,  sugar: true,  fly: true, label: '슈가 도넛' },
  moth:   { hp: 1,  speed: 4.2, score: 250, wallDmg: 0,  sugar: false, fly: true, label: '날아온 과자봉지' },
};

const WAVES = [
  { name: 'WAVE 1', duration: 35,
    spawns: [ { type: 'soda', interval: 2.3, firstAt: 1.0 }, { type: 'fries', interval: 4.6, firstAt: 3.0 }, { type: 'icecream', interval: 7, firstAt: 8.0 } ],
    events: [] },
  { name: 'WAVE 2', duration: 55,
    spawns: [ { type: 'soda', interval: 1.9, firstAt: 1.0 }, { type: 'fries', interval: 3.4, firstAt: 2.0 }, { type: 'burger', interval: 10, firstAt: 6.0 }, { type: 'pizza', interval: 9, firstAt: 8.0 }, { type: 'icecream', interval: 6.5, firstAt: 4.0 }, { type: 'donut', interval: 10, firstAt: 9.0 } ],
    events: [ { t: 13, type: 'trap' }, { t: 38, type: 'trap' } ] },
  { name: 'FINAL WAVE', duration: 65,
    spawns: [ { type: 'soda', interval: 1.6, firstAt: 1.0 }, { type: 'fries', interval: 3.0, firstAt: 2.0 }, { type: 'burger', interval: 8.5, firstAt: 5.0 }, { type: 'pizza', interval: 7.5, firstAt: 3.0 }, { type: 'ramen', interval: 9.5, firstAt: 7.0 }, { type: 'icecream', interval: 6, firstAt: 4.5 }, { type: 'donut', interval: 8, firstAt: 6.0 }, { type: 'moth', interval: 9, firstAt: 11.0 } ],
    events: [ { t: 9, type: 'boss' }, { t: 30, type: 'trap' } ] },
];

// 문제은행은 AASLD 'Unmasking MASH and MASLD' 덱 추출본만 사용 (ko/en 분리 파일)
// 언어·난이도는 시작 화면에서 선택. ?lang=en 은 초기 선택값만 바꾼다
const QUIZ_LANG_INIT = new URLSearchParams(location.search).get('lang') === 'en' ? 'en' : 'ko';
const QUIZ_POOL = [];
function loadQuizLang(lang) {
  fetch(`./assets/quiz_aasld_${lang}.json`)
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
  { name: '석궁',     icon: '🏹', dmg: 1, cd: 0.30, flash: 0xd9c9a8, beam: false },
  { name: '화승총',   icon: '🧨', dmg: 2, cd: 0.42, flash: 0xffb060, beam: false },
  { name: '권총',     icon: '🔫', dmg: 2, cd: 0.18, flash: 0xffe9a8, beam: false },
  { name: '샷건',     icon: '💥', dmg: 1, cd: 0.55, flash: 0xffc070, beam: false, pellets: 5 },
  { name: '기관단총', icon: '⚙️', dmg: 1, cd: 0.08, flash: 0xffe9a8, beam: false },
  { name: '소총',     icon: '🎯', dmg: 3, cd: 0.14, flash: 0xfff2c8, beam: false },
  { name: '레이저',   icon: '⚡', dmg: 4, cd: 0.10, flash: 0x8ff2ff, beam: true },
];

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
  const store = JSON.parse(localStorage.getItem('xg_routes') || '{}');
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
const pancSprite = makeOrganSprite('./assets/pancreas.png', 5.4, 7.6, 2.5, -1.6);   // 우하단, 좌우반전으로 총구가 길 쪽(왼쪽)
pancSprite.scale.x = -1;
const liverSprite = makeOrganSprite('./assets/liver.png', 4.8, -3.2, 2.3, 1.9);     // 방어선 전면의 간 수호탑
const pancTip = new THREE.Object3D();
pancTip.position.set(5.7, 3.2, -1.6);   // 반전된 대포의 총구 지점
scene.add(pancTip);

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
  const hand = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xe8b48f, roughness: 0.8 }));
  hand.position.set(0, -0.28, 0.1); g.add(hand);
  const mz = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0 }));
  if (tier === 0) {          // 석궁: 나무 활대 + 볼트
    const wood = new THREE.MeshStandardMaterial({ color: 0x6b4a2e, roughness: 0.7 });
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.15, 0.95), wood); stock.position.set(0, 0, -0.35); g.add(stock);
    for (const s of [-1, 1]) {
      const limb = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.07), wood);
      limb.position.set(s * 0.26, 0.03, -0.72); limb.rotation.y = s * 0.5; g.add(limb);
    }
    const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.7, 6),
      new THREE.MeshStandardMaterial({ color: 0xd9c9a8, roughness: 0.5 }));
    bolt.rotation.x = Math.PI / 2; bolt.position.set(0, 0.1, -0.5); g.add(bolt);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.35, 0.2), wood);
    grip.position.set(0, -0.2, 0.02); grip.rotation.x = 0.25; g.add(grip);
    mz.position.set(0, 0.08, -0.85);
  } else if (tier === 1) {   // 화승총: 긴 철 총열 + 나무 개머리판 + 황동 밴드
    const iron = new THREE.MeshStandardMaterial({ color: 0x3a3f45, roughness: 0.45, metalness: 0.6 });
    const wood = new THREE.MeshStandardMaterial({ color: 0x7a5230, roughness: 0.7 });
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.075, 1.25, 10), iron);
    barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.08, -0.55); g.add(barrel);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.2, 0.75), wood);
    stock.position.set(0, -0.03, 0.05); stock.rotation.x = -0.08; g.add(stock);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.08, 10),
      new THREE.MeshStandardMaterial({ color: 0xc9a84c, roughness: 0.3, metalness: 0.8 }));
    band.rotation.x = Math.PI / 2; band.position.set(0, 0.08, -0.75); g.add(band);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.34, 0.2), wood);
    grip.position.set(0, -0.24, 0.15); grip.rotation.x = 0.3; g.add(grip);
    mz.position.set(0, 0.08, -1.2); mz.scale.setScalar(1.4);
  } else if (tier === 2) {   // 권총: 컴팩트 슬라이드
    const gunMetal = new THREE.MeshStandardMaterial({ color: 0x2a2d34, roughness: 0.4, metalness: 0.5 });
    const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.2, 0.9), gunMetal); barrel.position.set(0, 0.07, -0.45); g.add(barrel);
    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.14, 0.6),
      new THREE.MeshStandardMaterial({ color: 0x1c4a38, roughness: 0.35, metalness: 0.4 }));
    slide.position.set(0, 0.2, -0.3); g.add(slide);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.42, 0.22), gunMetal); grip.position.set(0, -0.22, 0.05); grip.rotation.x = 0.25; g.add(grip);
    mz.position.set(0, 0.07, -0.95);
  } else if (tier === 3) {   // 샷건: 쌍열 총열 + 나무 개머리판
    const iron = new THREE.MeshStandardMaterial({ color: 0x33383f, roughness: 0.4, metalness: 0.6 });
    const wood = new THREE.MeshStandardMaterial({ color: 0x8a5a32, roughness: 0.65 });
    for (const dx of [-0.06, 0.06]) {
      const b2 = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 1.05, 10), iron);
      b2.rotation.x = Math.PI / 2; b2.position.set(dx, 0.1, -0.5); g.add(b2);
    }
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.2, 0.6), wood);
    stock.position.set(0, -0.02, 0.05); stock.rotation.x = -0.1; g.add(stock);
    const pump = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.3), wood);
    pump.position.set(0, -0.02, -0.55); g.add(pump);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.34, 0.2), wood);
    grip.position.set(0, -0.23, 0.15); grip.rotation.x = 0.3; g.add(grip);
    mz.position.set(0, 0.1, -1.05); mz.scale.setScalar(1.6);
  } else if (tier === 4) {   // 기관단총: 컴팩트 바디 + 긴 탄창 + 앞손잡이
    const dark = new THREE.MeshStandardMaterial({ color: 0x24272e, roughness: 0.4, metalness: 0.55 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 0.7), dark);
    body.position.set(0, 0.05, -0.2); g.add(body);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.4, 8), dark);
    barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.08, -0.72); g.add(barrel);
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.42, 0.16), dark);
    mag.position.set(0, -0.24, -0.15); mag.rotation.x = -0.12; g.add(mag);
    const fgrip = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.2, 0.12), dark);
    fgrip.position.set(0, -0.1, -0.5); g.add(fgrip);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.3, 0.18), dark);
    grip.position.set(0, -0.18, 0.12); grip.rotation.x = 0.28; g.add(grip);
    mz.position.set(0, 0.08, -0.95); mz.scale.setScalar(0.8);
  } else if (tier === 5) {   // 소총: 긴 총열 + 스코프 + 탄창
    const dark = new THREE.MeshStandardMaterial({ color: 0x22343a, roughness: 0.4, metalness: 0.5 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.18, 1.0), dark); body.position.set(0, 0.05, -0.3); g.add(body);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 8), dark);
    barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.08, -0.95); g.add(barrel);
    const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.35, 10),
      new THREE.MeshStandardMaterial({ color: 0x111418, roughness: 0.3, metalness: 0.6 }));
    scope.rotation.x = Math.PI / 2; scope.position.set(0, 0.24, -0.25); g.add(scope);
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.3, 0.18), dark);
    mag.position.set(0, -0.18, -0.25); mag.rotation.x = -0.2; g.add(mag);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.36, 0.2), dark);
    grip.position.set(0, -0.2, 0.1); grip.rotation.x = 0.25; g.add(grip);
    mz.position.set(0, 0.08, -1.25);
  } else {                   // 레이저: 유선형 바디 + 시안 발광 링
    const shell = new THREE.MeshStandardMaterial({ color: 0x143c4a, roughness: 0.3, metalness: 0.6 });
    const glow = new THREE.MeshStandardMaterial({ color: 0x2ee6ff, emissive: 0x2ee6ff, emissiveIntensity: 1.2, roughness: 0.3 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 1.05, 12), shell);
    body.rotation.x = Math.PI / 2; body.position.set(0, 0.07, -0.4); g.add(body);
    for (const dz of [-0.15, -0.45, -0.7]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.02, 6, 16), glow);
      ring.position.set(0, 0.07, dz); g.add(ring);
    }
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.09, 0.25, 10), glow);
    tip.rotation.x = Math.PI / 2; tip.position.set(0, 0.07, -1.0); g.add(tip);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.38, 0.2), shell);
    grip.position.set(0, -0.22, 0.08); grip.rotation.x = 0.25; g.add(grip);
    mz.position.set(0, 0.07, -1.15);
  }
  g.add(mz);
  return { group: g, mz };
}

function applyWeaponVisual() {
  const W = WEAPONS[G.weapon];
  while (gun.children.length) gun.remove(gun.children[0]);
  const built = buildGunModel(G.weapon);
  gun.add(built.group);
  muzzle = built.mz;
  const chip = $('hud-weapon');
  if (chip) chip.textContent = `${W.icon} ${W.name}`;
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
  try { storedWallPos = JSON.parse(localStorage.getItem('xg_fatwalls2') || 'null'); } catch (err) { /* 무시 */ }
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
  showMsg('🧨 지방 둔덕 제거! +1,000 · 보너스 퀴즈 찬스');
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

function buildEnemyMesh(type) {
  const g = new THREE.Group();
  if (type === 'soda') {   // 소용돌이 막대사탕
    const capMat = new THREE.MeshStandardMaterial({ map: swirlTex, roughness: 0.35 });
    const sideMat = new THREE.MeshStandardMaterial({ color: 0xff8fb3, roughness: 0.4 });
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.2, 24), [sideMat, capMat, capMat]);
    disc.rotation.x = Math.PI / 2;   // 납작면이 정면을 보게
    disc.position.y = 1.25; g.add(disc);
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.85, 8),
      new THREE.MeshStandardMaterial({ color: 0xfff2e0, roughness: 0.5 }));
    stick.position.y = 0.35; g.add(stick);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
    for (const dx of [-0.24, 0.24]) {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), eyeMat);
      e.position.set(dx, 1.32, 0.14); g.add(e);
    }
  } else if (type === 'fries') {
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.0, 0.55),
      new THREE.MeshStandardMaterial({ color: 0xe03131, roughness: 0.55, emissive: 0x550a0a, emissiveIntensity: 0.5 }));
    box.position.y = 0.8; g.add(box);
    const fryMat = new THREE.MeshStandardMaterial({ color: 0xffd166, roughness: 0.6, emissive: 0x664d10, emissiveIntensity: 0.5 });
    for (let i = 0; i < 5; i++) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.85, 0.13), fryMat);
      f.position.set(-0.3 + i * 0.15, 1.55, (Math.random() - 0.5) * 0.2); f.rotation.z = (Math.random() - 0.5) * 0.35; g.add(f);
    }
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (const dx of [-0.2, 0.2]) {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), eyeMat);
      e.position.set(dx, 0.95, 0.31); g.add(e);
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), new THREE.MeshBasicMaterial({ color: 0x111111 }));
      p.position.set(dx, 0.95, 0.4); g.add(p);
    }
  } else if (type === 'pizza') { // 기름진 피자 조각 (삼각 프리즘)
    const slice = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.2, 3),
      new THREE.MeshStandardMaterial({ color: 0xf2c15c, roughness: 0.6, emissive: 0x5a4010, emissiveIntensity: 0.35 }));
    slice.rotation.x = Math.PI / 2; slice.rotation.z = Math.PI;   // 꼭짓점 아래로
    slice.position.y = 0.95; g.add(slice);
    const crust = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.22, 0.26),
      new THREE.MeshStandardMaterial({ color: 0xc98a3a, roughness: 0.65 }));
    crust.position.y = 1.36; g.add(crust);
    const pepMat = new THREE.MeshStandardMaterial({ color: 0xd94f3d, roughness: 0.5 });
    for (const [px, py] of [[-0.25, 1.1], [0.22, 1.05], [0, 0.72]]) {
      const pep = new THREE.Mesh(new THREE.CircleGeometry(0.13, 10), pepMat);
      pep.position.set(px, py, 0.12); g.add(pep);
    }
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
    for (const dx of [-0.16, 0.16]) {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), eyeMat);
      e.position.set(dx, 0.9, 0.13); g.add(e);
    }
  } else if (type === 'ramen') { // 나트륨 컵라면
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.38, 0.95, 14),
      new THREE.MeshStandardMaterial({ color: 0xf2ece0, roughness: 0.55 }));
    cup.position.y = 0.85; g.add(cup);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.57, 0.53, 0.22, 14),
      new THREE.MeshStandardMaterial({ color: 0xd9483b, roughness: 0.5 }));
    band.position.y = 1.05; g.add(band);
    const noodleMat = new THREE.MeshStandardMaterial({ color: 0xffd166, roughness: 0.5 });
    for (let k = 0; k < 3; k++) {
      const n = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.05, 6, 10, Math.PI), noodleMat);
      n.position.set(-0.2 + k * 0.2, 1.36, 0.07 * (k % 2 ? 1 : -1));
      n.rotation.x = -0.4; g.add(n);
    }
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
    for (const dx of [-0.18, 0.18]) {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), eyeMat);
      e.position.set(dx, 0.8, 0.5); g.add(e);
    }
  } else if (type === 'icecream') { // 아이스크림 콘 (당류)
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.9, 10),
      new THREE.MeshStandardMaterial({ color: 0xc98a4a, roughness: 0.7 }));
    cone.rotation.x = Math.PI;   // 꼭짓점 아래
    cone.position.y = 0.6; g.add(cone);
    const scoop = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0xff9ec4, roughness: 0.45, emissive: 0x7a2c47, emissiveIntensity: 0.35 }));
    scoop.position.y = 1.28; g.add(scoop);
    const cherry = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0xd9302e, roughness: 0.4 }));
    cherry.position.set(0.1, 1.66, 0.05); g.add(cherry);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
    for (const dx of [-0.16, 0.16]) {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), eyeMat);
      e.position.set(dx, 1.32, 0.4); g.add(e);
    }
  } else if (type === 'donut') { // 비행: 슈가 도넛
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.26, 10, 18),
      new THREE.MeshStandardMaterial({ color: 0xff8fb3, roughness: 0.45, emissive: 0x77203c, emissiveIntensity: 0.5 }));
    ring.rotation.x = Math.PI / 2 - 0.5; ring.position.y = 0; g.add(ring);
    const wings = [];
    for (const s of [-1, 1]) {
      const w = new THREE.Mesh(new THREE.CircleGeometry(0.45, 10),
        new THREE.MeshStandardMaterial({ color: 0xfff2f6, roughness: 0.4, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
      w.scale.set(1, 0.55, 1);
      w.position.set(s * 0.72, 0.25, 0); w.rotation.z = s * 0.5;
      g.add(w); wings.push(w);
    }
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
    for (const dx of [-0.2, 0.2]) {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), eyeMat);
      e.position.set(dx, 0.12, 0.62); g.add(e);
    }
    g.userData.wings = wings;
  } else if (type === 'moth') { // 비행: 날아다니는 과자봉지 (은박 파우치)
    const foil = new THREE.MeshStandardMaterial({ color: 0x6aa0e0, roughness: 0.35, metalness: 0.55, emissive: 0x1a3050, emissiveIntensity: 0.35 });
    const bag = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.85, 0.22), foil);
    bag.position.y = 0.1; g.add(bag);
    // 위아래 절취선 크림프(톱니)
    const crimpMat = new THREE.MeshStandardMaterial({ color: 0x8fb8ec, roughness: 0.4, metalness: 0.5 });
    for (const sy of [-1, 1]) {
      for (let k = -1; k <= 1; k++) {
        const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.18, 4), crimpMat);
        tooth.position.set(k * 0.2, 0.1 + sy * 0.5, 0);
        if (sy < 0) tooth.rotation.z = Math.PI;
        g.add(tooth);
      }
    }
    // 앞면 라벨: 노란 띠 + 감자칩 그림
    const band = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.3),
      new THREE.MeshStandardMaterial({ color: 0xffd166, roughness: 0.5 }));
    band.position.set(0, 0.02, 0.115); g.add(band);
    const chipMat = new THREE.MeshStandardMaterial({ color: 0xe8b458, roughness: 0.55 });
    for (const [cx, cy] of [[-0.08, 0.0], [0.09, 0.05]]) {
      const chip = new THREE.Mesh(new THREE.CircleGeometry(0.13, 12), chipMat);
      chip.position.set(cx, cy, 0.12); g.add(chip);
    }
    const wings = [];
    for (const s of [-1, 1]) {
      const w = new THREE.Mesh(new THREE.CircleGeometry(0.42, 10),
        new THREE.MeshStandardMaterial({ color: 0xf2f6ff, roughness: 0.4, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
      w.scale.set(1, 0.6, 1);
      w.position.set(s * 0.55, 0.42, 0); w.rotation.z = s * 0.5;
      g.add(w); wings.push(w);
    }
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
    for (const dx of [-0.14, 0.14]) {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), eyeMat);
      e.position.set(dx, 0.38, 0.12); g.add(e);
    }
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
    // 약점: 영양성분표
    const label = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.42),
      new THREE.MeshBasicMaterial({ color: 0xffffff }));
    label.position.set(0, 0.85, 0.97); g.add(label);
    label.userData.weakpoint = true;
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
    for (const dx of [-0.28, 0.28]) {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), eyeMat);
      e.position.set(dx, 1.45, 0.85); g.add(e);
    }
    if (type === 'boss') g.scale.setScalar(1.6);
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
  // 탱커 체력바
  let hpBar = null;
  if (def.hp >= 8) {
    hpBar = new THREE.Group();
    const bg = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.14), new THREE.MeshBasicMaterial({ color: 0x1a1016, transparent: true, opacity: 0.75 }));
    const fg = new THREE.Mesh(new THREE.PlaneGeometry(1.04, 0.09), new THREE.MeshBasicMaterial({ color: 0x42d68f }));
    fg.position.z = 0.001;
    hpBar.add(bg); hpBar.add(fg); hpBar.userData.fg = fg;
    hpBar.position.y = 2.4;
    mesh.add(hpBar);
  }
  const enemy = {
    type, def, mesh, hp: def.hp, maxhp: def.hp, mats, hpBar, flashT: 0,
    curve: route.curve, clen: route.len,
    x0: mesh.position.x, z0: mesh.position.z, xT: mesh.position.x, yT: mesh.position.y, jinkT: 0,
    wings: mesh.userData.wings || null,
    progress: Math.random() * 0.01, lane: (Math.random() - 0.5) * 2.4,
    phase: Math.random() * Math.PI * 2,
    state: 'walk',           // walk | attack | leak | dying
    attackT: 0, dyingT: 0, leaked: false,
  };
  mesh.traverse((o) => { o.userData.entity = { kind: 'enemy', ref: enemy }; });
  shootRoot.add(mesh);
  enemies.push(enemy);
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
  showMsg('⚠️ 내장지방 덫! 자물쇠를 쏴서 지방이를 구해주세요');
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
const LIVER_STAGE_TEXT = ['건강해요 · 정화 파동 가동 중', '지방간(MASLD) · 파동이 느려져요', 'MASH · 파동이 많이 느려져요', '섬유화 · 파동이 거의 멎어가요'];
const LIVER_DISSOLVE = [2.4, 3.4, 4.8, 6.5];

function pancMult() {
  if (G.beta <= 0) return 0; if (G.beta > 60) return 1; if (G.beta > 30) return 0.7; return 0.45;
}

function updateHUD() {
  $('score-val').textContent = G.score.toLocaleString();
  const mult = comboMult();
  $('combo-val').textContent = G.streak >= 3 ? `${G.streak} COMBO · x${mult.toFixed(1)}` : '';
  $('bar-core').style.width = `${Math.max(0, G.core)}%`;
  $('bar-meta').style.width = `${Math.max(0, G.metabolic)}%`;
  $('bar-sugar').style.width = `${Math.min(100, G.sugar)}%`;
  $('bar-liver').style.width = `${Math.max(0, 100 - G.fibrosis)}%`;
  $('bar-beta').style.width = `${Math.max(0, G.beta)}%`;
  const st = liverStage();
  $('liver-state').textContent = LIVER_STAGE_TEXT[st];
  const tints = ['transparent', 'rgba(214,150,60,.14)', 'rgba(170,80,80,.22)', 'rgba(120,115,130,.34)'];
  $('liver-tint').style.background = `linear-gradient(to top, ${tints[st]}, transparent 45%)`;
  liverSprite.material.color.setHex([0xffffff, 0xe8cba6, 0xc99a90, 0x8f8f96][st]);   // 간이 굳을수록 수호탑도 탁해짐
  if (G.pancDown) $('panc-state').textContent = '⛔ 기능 정지 · 이번 판엔 못 일어나요';
  else {
    const m = pancMult();
    $('panc-state').textContent = m >= 1 ? `기능 ${Math.round(G.beta)}% · 지원 사격 중`
      : m >= 0.7 ? `기능 ${Math.round(G.beta)}% · 인슐린이 약해졌어요` : `기능 ${Math.round(G.beta)}% · 과로 상태!`;
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
    e.hp -= (weak ? 2 : 1) * W.dmg;
    const gain = Math.round((weak ? 140 : 80) * comboMult());
    G.score += gain; G.shootScore += gain;
    damageFx(e, hit.point, weak ? 0xffe9a8 : 0xff8fa3, weak ? 22 : 15);
    sfx.hit();
    e.mesh.position.z -= 0.18; // 넉백
    if (e.hp <= 0) killEnemy(e, true);
    return 'enemy';
  }
  if (ent.kind === 'fatwall') {
    const wl = ent.ref;
    if (!wl.hinted) { wl.hinted = true; showMsg('🟡 지방 둔덕이 길을 막고 있어요! 뚫으려면 꽤 맞혀야 해요'); }
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
  G.fireCooldown = W.cd;
  sfx.shoot();
  gunKick = 1;
  muzzle.material.color.setHex(W.flash);
  muzzle.material.opacity = 1; setTimeout(() => { muzzle.material.opacity = 0; }, 55);
  crosshair.classList.add('kick'); setTimeout(() => crosshair.classList.remove('kick'), 70);

  const rect = canvas.getBoundingClientRect();
  const bx = ((clientX - rect.left) / rect.width) * 2 - 1;
  const by = -((clientY - rect.top) / rect.height) * 2 + 1;
  // 샷건은 산탄 퍼짐, 나머지는 단발
  const offs = W.pellets
    ? Array.from({ length: W.pellets }, (_, i) => (i === 0 ? [0, 0] : [(Math.random() - 0.5) * 0.09, (Math.random() - 0.5) * 0.07]))
    : [[0, 0]];
  const results = offs.map(([ox, oy]) => processRay(bx + ox, by + oy, W));
  if (results.includes('enemy')) G.streak += 1;
  else if (!results.includes('fatwall') && !results.includes('trap')) G.streak = 0;
}

function killEnemy(e, byPlayer) {
  e.state = 'dying'; e.dyingT = 0.28;
  if (byPlayer) {
    const gain = Math.round(e.def.score * comboMult());
    G.score += gain; G.shootScore += gain;
    burst(e.mesh.position.clone().add(new THREE.Vector3(0, 1, 0)), 0xffd166, 24, 8);
    sfx.kill();
    if (e.type === 'boss') showMsg('👑 킹 버거 격파! +' + gain.toLocaleString());
  }
}

function freeTrap(trap) {
  trap.state = 'freed'; trap.t = 0;
  G.fatsRescued += 1;
  G.rescueScore += 800; G.score += 800;
  G.metabolic = Math.min(100, G.metabolic + 12);
  burst(trap.blob.getWorldPosition(new THREE.Vector3()), 0xffa040, 16, 4);
  sfx.rescue();
  showMsg('🔥 지방이 구출! 에너지로 연소 +800');
  // 구출 보상: 아이템 퀴즈 찬스 (무기 업그레이드 / 간 회복 포션)
  setTimeout(() => { if (G.state === 'WAVE' && !G.over) startQuiz('item'); }, 900);
}
function loseTrap(trap, shotBlob) {
  trap.state = 'lost'; trap.t = 0;
  G.fatsLost += 1;
  if (shotBlob) { showMsg('😢 지방이를 맞히면 안 돼요! 보너스가 사라졌어요'); sfx.no(); G.streak = 0; }
}

// ---------- 췌장 자동 사격 ----------
let pancTimer = 0;
function pancreasUpdate(dt) {
  if (G.pancDown) { pancSprite.material.color.setHex(0x777777); return; }
  const sugarEnemies = enemies.filter((e) => e.def.sugar && (e.state === 'walk' || e.state === 'attack') && e.mesh.position.z > -15);
  // 회복/소모
  if (sugarEnemies.length === 0) G.beta = Math.min(100, G.beta + 2.2 * dt);
  else G.beta = Math.min(100, G.beta + 0.4 * dt);
  pancTimer -= dt;
  if (pancTimer <= 0 && sugarEnemies.length > 0) {
    pancTimer = 1.0;
    let nearest = sugarEnemies[0];
    for (const e of sugarEnemies) if (e.mesh.position.z > nearest.mesh.position.z) nearest = e;
    const cost = G.sugar > 70 ? 5.0 : 2.2;   // 고혈당 = 과로
    G.beta -= cost;
    const mult = pancMult();
    if (G.beta <= 0) {
      G.beta = 0; G.pancDown = true;
      showMsg('⛔ 췌장이 번아웃됐어요… 인슐린 지원이 끊깁니다', 3200);
      sfx.no();
      return;
    }
    const p = new THREE.Mesh(new THREE.SphereGeometry(mult >= 1 ? 0.22 : 0.3, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0x9ad0ff }));
    p.position.copy(pancTip.getWorldPosition(new THREE.Vector3()));
    projectiles.push({ mesh: p, target: nearest, dmg: 1.2 * mult, speed: 26 });
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
    showMsg('🚨 최종 웨이브! 좌측 혈관 파이프까지 열렸어요', 3400);
  } else {
    showMsg(`${w.name} 시작!`);
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
        if (ev.type === 'boss') { spawnEnemy('boss'); showMsg('👑 킹 버거 등장! 영양성분표가 약점이에요'); }
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
      const ratio = Math.max(0, e.hp) / e.maxhp;
      const fg = e.hpBar.userData.fg;
      fg.scale.x = Math.max(0.02, ratio);
      fg.position.x = -(1 - fg.scale.x) * 0.52;
      fg.material.color.setHex(ratio > 0.5 ? 0x42d68f : ratio > 0.25 ? 0xffd166 : 0xff5d73);
      e.hpBar.quaternion.copy(e.mesh.quaternion).invert().multiply(camera.quaternion);
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
        showMsg('🪽 날아드는 간식이 코어를 스쳤어요!');
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
        if (stage >= 3 && Math.random() < 0.45 && e.type !== 'boss') {
          e.state = 'leak';
        } else {
          e.state = 'attack'; e.attackT = LIVER_DISSOLVE[stage];
          G.fibrosis = Math.min(100, G.fibrosis + e.def.wallDmg * 0.55);
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
        showMsg('💔 성벽이 뚫렸어요! 코어가 공격받았습니다');
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
        showMsg('🫠 내장지방이 간으로 흘러갔어요… 간이 더 굳습니다');
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

function weaponUp() {
  if (G.weapon >= WEAPONS.length - 1) return false;
  G.weapon += 1;
  applyWeaponVisual();
  showMsg(`⬆️ 무기 업그레이드! ${WEAPONS[G.weapon].icon} ${WEAPONS[G.weapon].name} 획득`, 3000);
  return true;
}

function startQuiz(mode = 'wave') {
  G.state = 'QUIZ'; G.quizMode = mode; G.quizT = 15; G.quizAnswered = false;
  G.currentQuiz = drawQuiz(); G.quizTotal += 1;
  const quiz = G.currentQuiz;
  const diffLabel = { easy: 'EASY', mid: 'NORMAL', hard: 'HARD' }[G.quizDiff] || 'NORMAL';
  $('quiz-tag').textContent = (mode === 'item' ? 'ITEM CHANCE · 정답을 쏘면 보상!' : 'QUIZ TIME · 정답을 쏘세요!') + ` · ${diffLabel}`;
  $('quiz-sub').textContent = mode === 'item'
    ? '정답이면 무기 업그레이드, 무기가 최고면 간 회복 포션을 얻어요'
    : '정답을 맞히면 간 성벽이 수리되고 췌장이 회복되고 무기도 좋아져요';
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
        if (!G.pancDown) G.beta = Math.min(100, G.beta + 20);
        G.metabolic = Math.min(100, G.metabolic + 10);
      }
      $('quiz-feedback').textContent = upgraded
        ? `정답! +${gain.toLocaleString()} · 새 무기를 손에 넣었어요`
        : `정답! +${gain.toLocaleString()} · 🧪 간 회복 포션! 간이 부드러워졌어요`;
    } else {
      G.fibrosis = Math.max(0, G.fibrosis - 25);
      if (!G.pancDown) G.beta = Math.min(100, G.beta + 30);
      G.metabolic = Math.min(100, G.metabolic + 8);
      weaponUp();
      $('quiz-feedback').textContent = `정답! +${gain.toLocaleString()} · 간 성벽이 수리되고 췌장이 회복됐어요`;
    }
    sfx.ok();
  } else {
    if (btn) btn.classList.add('wrong');
    buttons.find((b) => b.textContent === quiz.a[quiz.correct])?.classList.add('correct');
    $('quiz-feedback').textContent = G.quizMode === 'item'
      ? `아쉬워요! 정답은 "${quiz.a[quiz.correct]}" — 보상 없이 전투로 복귀해요`
      : `아쉬워요! 정답은 "${quiz.a[quiz.correct]}" — 수리 없이 다음 웨이브로 가요`;
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

const GRADES = [[60000, 'S · 대사 마스터'], [42000, 'A · 간 지킴이'], [28000, 'B · 성실한 수호자'], [0, 'C · 다음엔 더 잘할 수 있어요']];

function finishGame(victory) {
  if (G.over) return;
  G.over = true; G.state = 'RESULT';
  const liverSoft = Math.max(0, 100 - G.fibrosis);
  G.finishBonus = Math.round(liverSoft * 15 + Math.max(0, G.beta) * 15 + Math.max(0, G.core) * 25 + Math.max(0, G.metabolic) * 10);
  if (victory) G.score += G.finishBonus; else G.finishBonus = 0;

  $('result-score').textContent = G.score.toLocaleString();
  $('result-grade').textContent = victory ? GRADES.find(([min]) => G.score >= min)[1] : '💔 코어 함락 · 다시 도전해요';

  const stage = liverStage();
  const stageName = ['건강', '지방간(MASLD)', 'MASH', '섬유화'][stage];
  $('result-report').innerHTML = `
    <div class="rep-card"><div class="rep-k">C · K</div><div class="rep-v">${Math.round(Math.max(0, G.core))}%</div><div class="rep-s">심장·콩팥·뇌혈관</div></div>
    <div class="rep-card"><div class="rep-k">L</div><div class="rep-v">${stageName}</div><div class="rep-s">간 상태</div></div>
    <div class="rep-card"><div class="rep-k">M</div><div class="rep-v">${Math.round(Math.max(0, G.metabolic))}%</div><div class="rep-s">대사 건강</div></div>
    <div class="rep-card"><div class="rep-k">QUIZ</div><div class="rep-v">${G.quizCorrectCount}/${Math.max(1, G.quizTotal)}</div><div class="rep-s">지식 점수</div></div>`;
  $('result-breakdown').innerHTML =
    `사격 ${G.shootScore.toLocaleString()} · 퀴즈 ${G.quizScore.toLocaleString()} · 지방이 구출 ${G.rescueScore.toLocaleString()} (${G.fatsRescued}명) · 최종 무기 ${WEAPONS[G.weapon].icon} ${WEAPONS[G.weapon].name}` +
    `<br>피니시 보너스 ${G.finishBonus.toLocaleString()} — 장기를 건강하게 지킬수록 점수가 커져요` +
    (G.pancDown ? '<br>⚠️ 이번 판엔 췌장이 번아웃됐어요. 당류 적을 빨리 잡을수록 췌장이 오래 버텨요' : '');
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
let editRoute = -1, editPts = [], editMarkers = null;

// ---------- 지방 둔덕 배치 모드 (F): 클릭한 곳으로 둔덕이 순서대로 이동, 자동 저장 ----------
let wallEdit = false, wallEditIdx = 0;
function toggleWallEdit() {
  wallEdit = !wallEdit;
  wallEditIdx = 0;
  if (wallEdit && !debugOn) toggleDebug();
  showMsg(wallEdit ? '🍞 둔덕 배치 모드 — 빈 땅 클릭=추가(최대 6), 둔덕 클릭=제거 (F로 종료)' : '🍞 둔덕 배치 종료', 3200);
}
function saveWallPos() {
  localStorage.setItem('xg_fatwalls2', JSON.stringify(
    fatWalls.map((w) => [+w.mesh.position.x.toFixed(1), +w.mesh.position.z.toFixed(1)])));
}
function startRouteEdit(idx) {
  if (!debugOn) toggleDebug();
  finishRouteEdit(false);
  editRoute = idx; editPts = [];
  editMarkers = new THREE.Group(); scene.add(editMarkers);
  showMsg(`✏️ ${['터널(1번)', '심장(2번)', '파이프(3번)'][idx]} 루트 그리기 — 스폰 지점부터 방어선까지 길을 따라 클릭한 뒤 Enter`, 5200);
}
function finishRouteEdit(save) {
  if (editRoute < 0) return;
  if (save && editPts.length >= 3) {
    const pts = editPts.map((p) => [+p.x.toFixed(1), +p.z.toFixed(1)]);
    const store = JSON.parse(localStorage.getItem('xg_routes') || '{}');
    store[editRoute] = pts;
    localStorage.setItem('xg_routes', JSON.stringify(store));
    applyRoutePoints(editRoute, pts);
    console.log(`[route ${editRoute}]`, JSON.stringify(pts));
    showMsg('✅ 루트 저장! 새로 나오는 적부터 이 길을 따라와요 (0 키 = 기본 복원)', 3600);
    if (debugOn) { toggleDebug(); toggleDebug(); }   // 경로 마커 갱신
  } else if (editPts.length) {
    showMsg('↩️ 루트 그리기 취소', 1600);
  }
  editRoute = -1; editPts = [];
  if (editMarkers) { scene.remove(editMarkers); editMarkers = null; }
}

// ---------- 입력 ----------
window.addEventListener('pointermove', (e) => {
  crosshair.style.left = e.clientX + 'px';
  crosshair.style.top = e.clientY + 'px';
  if (debugOn) $('debug-info').textContent = debugCoords(e.clientX, e.clientY);
});
window.addEventListener('pointerdown', (e) => {
  audio();
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
// 시작 화면 옵션 (언어·문제 난이도) — 클릭이 게임 시작으로 번지지 않게 전파 차단
document.querySelectorAll('.opt-btn').forEach((b) => {
  b.addEventListener('pointerdown', (ev) => {
    ev.stopPropagation();
    audio();
    const { opt, val } = b.dataset;
    document.querySelectorAll(`.opt-btn[data-opt="${opt}"]`).forEach((x) => x.classList.toggle('sel', x === b));
    if (opt === 'lang') loadQuizLang(val);
    else G.quizDiff = val;
    beep(620, 0.05, 'triangle', 0.05);
  });
});
if (QUIZ_LANG_INIT === 'en') {
  document.querySelectorAll('.opt-btn[data-opt="lang"]').forEach((x) => x.classList.toggle('sel', x.dataset.val === 'en'));
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
  if (k === 'Escape') { finishRouteEdit(false); if (wallEdit) toggleWallEdit(); }
  if (k === 'Digit0' || k === 'Numpad0') {
    localStorage.removeItem('xg_routes');
    localStorage.removeItem('xg_fatwalls2');
    ROUTES.forEach((_, i) => applyRoutePoints(i, DEFAULT_ROUTES[i]));
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

  renderer.render(scene, camera);
}
function tick() {
  requestAnimationFrame(tick);
  step(Math.min(clock.getDelta(), 0.05));
}
window.DBG = { G, enemies, traps, fatWalls, camera, scene, step, ROUTES, THREE, toggleDebug, startRouteEdit, finishRouteEdit, spawnEnemy };  // 디버그용 노출
tick();
