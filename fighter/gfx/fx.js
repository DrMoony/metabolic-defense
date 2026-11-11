// 효과: 타격 불꽃, 먼지, 장풍 모양, 기술마다 다른 분사. 스프라이트는 풀에 담아 돌려 쓴다.
// 좌표는 무대와 같다(시뮬 x − 640, 바닥 y=0, 위가 +y). 시뮬의 y는 위가 음수라 부호를 뒤집어 받는다.
import * as THREE from '../../vendor/three.module.js';

const TAU = Math.PI * 2, POOL = 280, DECALS = 12;
const rnd = (a, b) => a + Math.random() * (b - a), pick = list => list[Math.floor(Math.random() * list.length)];
const easeOut = k => 1 - (1 - k) * (1 - k);
const seeded = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

function texture(size, paint) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  paint(c.getContext('2d'), size, size / 2);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
// 전부 흰색으로 그려 두고 재질 색으로 물들인다.
const TEX = {
  glow: (g, s, c) => { const r = g.createRadialGradient(c, c, 0, c, c, c); r.addColorStop(0, '#fff'); r.addColorStop(.16, '#ffffffa0'); r.addColorStop(.5, '#ffffff38'); r.addColorStop(1, '#fff0'); g.fillStyle = r; g.fillRect(0, 0, s, s); },
  ring: (g, s, c) => { g.strokeStyle = '#fff'; g.lineWidth = s * .07; g.shadowColor = '#fff'; g.shadowBlur = s * .08; g.beginPath(); g.arc(c, c, c * .78, 0, TAU); g.stroke(); },
  spark: (g, s, c) => {
    g.fillStyle = '#fff'; g.shadowColor = '#fff'; g.shadowBlur = s * .06; g.beginPath();
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, r = i % 2 ? c * .14 : c * (i % 4 ? .62 : .94); g.lineTo(c + Math.cos(a) * r, c + Math.sin(a) * r); }
    g.fill();
  },
  puff: (g, s, c) => {
    for (const [x, y, r] of [[0, 0, .62], [-.3, .12, .42], [.3, .1, .44], [0, -.28, .42], [.18, .3, .36]]) {
      const grad = g.createRadialGradient(c + x * c, c + y * c, 0, c + x * c, c + y * c, r * c);
      grad.addColorStop(0, '#ffffffd0'); grad.addColorStop(.6, '#ffffff70'); grad.addColorStop(1, '#fff0'); g.fillStyle = grad; g.fillRect(0, 0, s, s);
    }
  },
  drop: (g, s, c) => { const r = g.createRadialGradient(c - c * .22, c - c * .25, 0, c, c, c * .82); r.addColorStop(0, '#fff'); r.addColorStop(.55, '#ffffffd8'); r.addColorStop(.9, '#ffffff90'); r.addColorStop(1, '#fff0'); g.fillStyle = r; g.fillRect(0, 0, s, s); },
  bubble: (g, s, c) => {
    g.strokeStyle = '#fff'; g.lineWidth = s * .06; g.beginPath(); g.arc(c, c, c * .74, 0, TAU); g.stroke();
    g.fillStyle = '#ffffff30'; g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.ellipse(c - c * .3, c - c * .34, c * .16, c * .1, -.7, 0, TAU); g.fill();
  },
  streak: (g, s, c) => { const r = g.createLinearGradient(0, 0, s, 0); r.addColorStop(0, '#fff0'); r.addColorStop(.75, '#ffffffc0'); r.addColorStop(1, '#fff'); g.fillStyle = r; g.beginPath(); g.ellipse(c, c, c, c * .16, 0, 0, TAU); g.fill(); },
  slash: (g, s, c) => { g.fillStyle = '#fff'; g.shadowColor = '#fff'; g.shadowBlur = s * .05; g.beginPath(); g.arc(c * .7, c, c * .92, -1.05, 1.05); g.arc(c * .34, c, c * .98, .8, -.8, true); g.fill(); },
  shield: (g, s, c) => {
    const r = g.createRadialGradient(c, c, c * .2, c, c, c * .9); r.addColorStop(0, '#ffffff18'); r.addColorStop(.8, '#ffffff66'); r.addColorStop(1, '#fff0');
    g.fillStyle = r; g.beginPath(); g.arc(c, c, c * .9, 0, TAU); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = s * .035; g.beginPath(); g.arc(c, c, c * .84, 0, TAU); g.stroke();
    g.globalAlpha = .5; g.lineWidth = s * .014;
    for (let i = -2; i <= 2; i++) { g.beginPath(); g.ellipse(c, c, Math.abs(i) * c * .3 + 2, c * .84, 0, 0, TAU); g.stroke(); }
  },
  // 아래는 기술마다 다른 타격 모양에 쓴다. seeded는 그릴 때마다 같은 모양이 나오게 하는 난수.
  heart: (g, s, c) => {
    g.fillStyle = '#fff'; g.shadowColor = '#fff'; g.shadowBlur = s * .05; g.beginPath(); g.moveTo(c, s * .84);
    g.bezierCurveTo(s * .06, s * .56, s * .1, s * .14, c, s * .34); g.bezierCurveTo(s * .9, s * .14, s * .94, s * .56, c, s * .84); g.fill();
  },
  hex: (g, s, c) => {
    g.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + TAU / 12; g.lineTo(c + Math.cos(a) * c * .82, c + Math.sin(a) * c * .82); } g.closePath();
    g.fillStyle = '#ffffff2c'; g.fill(); g.strokeStyle = '#fff'; g.lineWidth = s * .06; g.shadowColor = '#fff'; g.shadowBlur = s * .06; g.stroke();
  },
  shard: (g, s, c) => { g.fillStyle = '#fff'; g.beginPath(); for (const [x, y] of [[.5, .06], [.86, .42], [.7, .9], [.3, .78], [.12, .36]]) g.lineTo(x * s, y * s); g.fill(); g.fillStyle = '#0003'; g.beginPath(); g.moveTo(s * .5, s * .06); g.lineTo(s * .7, s * .9); g.lineTo(s * .3, s * .78); g.fill(); },
  cross: (g, s, c) => {
    g.fillStyle = '#fff'; g.shadowColor = '#fff'; g.shadowBlur = s * .05;
    for (const [w, h] of [[.97, .045], [.045, .97]]) { g.beginPath(); g.moveTo(c - c * w, c); g.lineTo(c, c - c * h); g.lineTo(c + c * w, c); g.lineTo(c, c + c * h); g.fill(); }
  },
  crack: (g, s, c) => {
    const R = seeded(7); g.strokeStyle = '#fff'; g.lineCap = 'round'; g.lineJoin = 'round'; g.shadowColor = '#fff'; g.shadowBlur = s * .03;
    for (let i = 0; i < 9; i++) {
      let a = i / 9 * TAU + R() * .5, x = c, y = c; const reach = c * (.55 + R() * .4);
      g.lineWidth = s * (.012 + R() * .022); g.beginPath(); g.moveTo(x, y);
      for (let r = 0; r < reach; r += c * .14) { a += (R() - .5) * .8; x += Math.cos(a) * c * .14; y += Math.sin(a) * c * .14; g.lineTo(x, y); if (R() < .3) { g.lineTo(x + Math.cos(a + 1) * c * .1, y + Math.sin(a + 1) * c * .1); g.moveTo(x, y); } }
      g.stroke();
    }
    const hub = g.createRadialGradient(c, c, 0, c, c, c * .3); hub.addColorStop(0, '#ffffffc0'); hub.addColorStop(1, '#fff0'); g.fillStyle = hub; g.fillRect(0, 0, s, s);
  },
  noodle: (g, s, c) => {
    g.strokeStyle = '#fff'; g.lineCap = 'round'; g.shadowColor = '#fff'; g.shadowBlur = s * .03;
    for (const [off, w, alpha] of [[0, .05, 1], [.07, .03, .6]]) { g.globalAlpha = alpha; g.lineWidth = s * w; g.beginPath(); for (let x = s * .03; x <= s * .97; x += 2) g.lineTo(x, c + off * s + Math.sin(x / s * TAU * 3.5 + off * 30) * s * .06); g.stroke(); }
  },
  bar: (g, s, c) => { const r = g.createLinearGradient(c - s * .12, 0, c + s * .12, 0); r.addColorStop(0, '#ffffffb0'); r.addColorStop(.4, '#fff'); r.addColorStop(1, '#ffffff90'); g.fillStyle = r; g.beginPath(); g.roundRect(c - s * .11, s * .06, s * .22, s * .88, s * .05); g.fill(); },
  splat: (g, s, c) => {
    const R = seeded(23); g.fillStyle = '#fff'; g.beginPath(); g.arc(c, c, c * .42, 0, TAU); g.fill();
    for (let i = 0; i < 9; i++) { const a = i / 9 * TAU + R() * .4, d = c * (.34 + R() * .3), r = c * (.12 + R() * .14); g.beginPath(); g.arc(c + Math.cos(a) * d, c + Math.sin(a) * d, r, 0, TAU); g.fill(); }
    for (let i = 0; i < 7; i++) { const a = R() * TAU, d = c * (.78 + R() * .16); g.beginPath(); g.arc(c + Math.cos(a) * d, c + Math.sin(a) * d, c * (.03 + R() * .04), 0, TAU); g.fill(); }
  },
};

const KIND_COLOR = { water: '#7fd6ff', wave: '#7fd6ff', stone: '#ecd9b0', steam: '#fff4ea', puddle: '#ffd35a' };
const WARM = ['#fff6c8', '#ffd166', '#ff8a3d'];
// 캐릭터마다 기술 효과에 쓰는 색 셋(주색, 밝은 색, 강조색). 몸 색과 같은 계열이되 기술끼리는 모양으로 가른다.
const PAL = {
  heart: ['#ff6f91', '#ffd0dc', '#ff2e63'], kidney: ['#7fd6ff', '#e8f8ff', '#e08af0'], liver: ['#ffb347', '#ffe0a0', '#9dffb0'], pancreas: ['#7cf0d8', '#c8fff0', '#ffd98a'],
  soda: ['#bfe9ff', '#ffffff', '#58c4ff'], fries: ['#ffd35a', '#ffe58a', '#ff6a4a'], ramen: ['#ffe9a8', '#ff9a4a', '#fff6ee'], burger: ['#ffd24a', '#8fdc6a', '#ff6a4a'],
};
const GOLD = '#ffd98a';
const SIZE = { glow: 64, drop: 64, bubble: 64, crack: 256, splat: 256, noodle: 256 };

export class Fx {
  constructor(stage) {
    this.stage = stage; this.scene = stage.scene;
    this.tex = {}; for (const key in TEX) this.tex[key] = texture(SIZE[key] || 128, TEX[key]);
    this.bits = []; this.next = 0;
    for (let i = 0; i < POOL; i++) {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.tex.glow, transparent: true, depthWrite: false, fog: false, toneMapped: false }));
      sprite.visible = false; sprite.renderOrder = 5; this.scene.add(sprite);
      this.bits.push({ sprite, live: false });
    }
    // 바닥에 눕는 것: 퍼지는 충격 고리와, 잠깐 남았다 사라지는 금·얼룩.
    this.rings = [];
    for (let i = 0; i < DECALS; i++) {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.tex.ring, transparent: true, depthWrite: false, fog: false, toneMapped: false, blending: THREE.AdditiveBlending }));
      mesh.rotation.x = -Math.PI / 2; mesh.visible = false; mesh.renderOrder = 3; this.scene.add(mesh);
      this.rings.push({ mesh, live: false });
    }
    // 선수마다 하나씩 두는 것: 초필살기 후광과 신장의 여과막.
    const fixed = (tex, color) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.tex[tex], color, transparent: true, depthWrite: false, fog: false, toneMapped: false, blending: THREE.AdditiveBlending })); s.visible = false; this.scene.add(s); return s; };
    this.aura = [fixed('glow', '#ffd98a'), fixed('glow', '#ffd98a')];
    this.shield = [fixed('shield', '#8fe9ff'), fixed('shield', '#8fe9ff')];
    this.shield.forEach(s => { s.renderOrder = 6; });
    this.shots = new Map(); this.sim = null; this.tick = -1;
    this.shotParts = this.buildShotParts();
  }

  // o: { tex, x, y, z, vx, vy, g, drag, life, s0, s1, wide(가로 배율), color, alpha, add, rot, spin, fade }
  emit(o) {
    let bit = null;
    for (let i = 0; i < POOL; i++) { const b = this.bits[(this.next + i) % POOL]; if (!b.live) { bit = b; this.next = (this.next + i + 1) % POOL; break; } }
    if (!bit) { bit = this.bits[this.next]; this.next = (this.next + 1) % POOL; }
    const m = bit.sprite.material;
    Object.assign(bit, { live: true, age: 0, x: o.x, y: o.y, z: o.z ?? 40, vx: o.vx || 0, vy: o.vy || 0, g: o.g || 0, drag: o.drag ?? 1, life: o.life || 12, s0: o.s0 ?? 20, s1: o.s1 ?? o.s0 ?? 20, wide: o.wide || 1, alpha: o.alpha ?? 1, spin: o.spin || 0, fade: o.fade || 'out' });
    m.map = this.tex[o.tex || 'glow']; m.color.set(o.color || '#fff'); m.blending = o.add === false ? THREE.NormalBlending : THREE.AdditiveBlending; m.rotation = o.rot || 0;
    bit.sprite.visible = true;
    this.place(bit);
  }
  place(b) {
    const k = Math.min(1, b.age / b.life), size = b.s0 + (b.s1 - b.s0) * easeOut(k), s = b.sprite;
    s.position.set(b.x, b.y, b.z); s.scale.set(size * b.wide, size, 1);
    s.material.opacity = b.alpha * (b.fade === 'inout' ? Math.sin(Math.PI * k) : 1 - k * k);
  }
  floorRing(x, s0, s1, life, color, z = 0) {
    const r = this.floorSlot(), m = r.mesh.material;
    Object.assign(r, { live: true, decal: false, age: 0, life, s0, s1 }); m.map = this.tex.ring; m.blending = THREE.AdditiveBlending; m.color.set(color);
    r.mesh.rotation.z = 0; r.mesh.position.set(x, 1.6, z); r.mesh.visible = true;
  }
  // 빈 자리가 없으면 가장 오래된 것을 덮어쓴다.
  floorSlot() { return this.rings.find(r => !r.live) || this.rings.reduce((a, b) => (b.age / b.life > a.age / a.life ? b : a)); }
  // 바닥에 남는 무늬. 금방 다 퍼지고, 수명의 뒤쪽 절반에서 옅어진다.
  floorDecal(x, tex, size, life, color, { z = 0, add = false, alpha = .9 } = {}) {
    const r = this.floorSlot(), m = r.mesh.material;
    Object.assign(r, { live: true, decal: true, age: 0, life, s1: size, alpha }); m.map = this.tex[tex]; m.blending = add ? THREE.AdditiveBlending : THREE.NormalBlending; m.color.set(color);
    r.mesh.rotation.z = rnd(0, TAU); r.mesh.position.set(x, 1.7, z); r.mesh.visible = true;
  }
  burst(x, y, count, colors, speed, size, o = {}) {
    for (let i = 0; i < count; i++) {
      const a = rnd(0, TAU), v = speed * rnd(.4, 1.2);
      this.emit({ tex: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v + 1, g: .35, drag: .93, life: rnd(14, 26), s0: size * rnd(.7, 1.5), s1: size * .2, color: colors[i % colors.length], rot: rnd(0, TAU), spin: rnd(-.3, .3), ...o });
    }
  }
  dust(x, count, spread, size, color = '#d9b8c8', z = 30) {
    for (let i = 0; i < count; i++) {
      const dir = i % 2 ? 1 : -1;
      this.emit({ tex: 'puff', add: false, x: x + rnd(-spread, spread) * .3, y: rnd(6, 20), z, vx: dir * rnd(1.5, spread / 12), vy: rnd(.3, 1.6), drag: .92, life: rnd(22, 34), s0: size * .5, s1: size * rnd(1, 1.6), color, alpha: .5, rot: rnd(0, TAU), spin: rnd(-.03, .03) });
    }
  }
  flash(x, y, size, color, life = 8, alpha = 1) { this.emit({ tex: 'glow', x, y, s0: size * .5, s1: size, life, color, alpha, z: 44 }); }
  ringAt(x, y, s0, s1, color, life = 12) { this.emit({ tex: 'ring', x, y, s0, s1, life, color, z: 42 }); }
  star(x, y, size, color = '#fff', life = 9) { this.emit({ tex: 'spark', x, y, s0: size, s1: size * .35, life, color, rot: rnd(0, TAU), spin: .08, z: 46 }); }

  // 기술 효과의 재료들. 전부 emit을 감싼 것이라 풀 하나를 같이 쓴다.
  hearts(x, y, n, colors, size = 34, speed = 5) {
    for (let i = 0; i < n; i++) { const a = rnd(.25, Math.PI - .25); this.emit({ tex: 'heart', x: x + rnd(-14, 14), y: y + rnd(-14, 14), z: 46, vx: Math.cos(a) * speed * rnd(.5, 1.2), vy: Math.sin(a) * speed * rnd(.6, 1.2), drag: .93, life: rnd(18, 30), s0: size * rnd(.7, 1.3), s1: size * .5, color: colors[i % colors.length], rot: rnd(-.4, .4) }); }
  }
  // 무게가 있는 조각(돌가루, 잎, 깨 등). 섞이지 않게 그려 색이 그대로 보인다.
  bitsOf(tex, x, y, n, colors, size, speed, o = {}) {
    for (let i = 0; i < n; i++) { const a = rnd(.1, Math.PI - .1), v = speed * rnd(.5, 1.2); this.emit({ tex, add: false, x: x + rnd(-10, 10), y: y + rnd(-10, 10), vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: .5, drag: .97, life: rnd(18, 30), s0: size * rnd(.6, 1.3), s1: size * .5, color: colors[i % colors.length], rot: rnd(0, TAU), spin: rnd(-.35, .35), ...o }); }
  }
  // dir 쪽으로 쏠려 튀는 방울.
  drops(x, y, n, colors, dir = 0, speed = 6, size = 16) {
    for (let i = 0; i < n; i++) this.emit({ tex: 'drop', add: false, x: x + rnd(-12, 12), y: y + rnd(-12, 12), vx: dir * rnd(1, speed) + rnd(-speed, speed) * .5, vy: rnd(1, speed * 1.2), g: .45, life: rnd(16, 26), s0: size * rnd(.7, 1.3), s1: 4, color: colors[i % colors.length] });
  }
  bubbles(x, y, n, colors, speed = 5, size = 18) {
    for (let i = 0; i < n; i++) { const a = rnd(0, TAU), v = speed * rnd(.4, 1.1); this.emit({ tex: 'bubble', add: false, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v + 1.2, drag: .92, life: rnd(16, 28), s0: size * rnd(.5, 1), s1: size * rnd(1.2, 1.8), color: colors[i % colors.length] }); }
  }
  // 한쪽으로 뻗는 선들. angle은 화면 기준 각도(오른쪽 0, 위 +), spread는 벌어지는 폭.
  rays(x, y, n, colors, angle, spread, len = 130, speed = 9) {
    for (let i = 0; i < n; i++) { const a = angle + rnd(-spread, spread), v = speed * rnd(.6, 1.2); this.emit({ tex: 'streak', x, y, z: 45, vx: Math.cos(a) * v, vy: Math.sin(a) * v, drag: .9, life: rnd(8, 13), s0: len * rnd(.7, 1.2), s1: len * .4, color: colors[i % colors.length], alpha: .85, rot: a }); }
  }
  // 세로로 선 빛기둥.
  pillar(x, y, height, color, life = 12, width = .2) { this.emit({ tex: 'glow', x, y, z: 43, vy: 2, life, s0: height * .7, s1: height, wide: width, color, alpha: .9 }); }
  mark(tex, x, y, size, color, rot = 0, life = 11, o = {}) { this.emit({ tex, x, y, z: 47, life, s0: size * .55, s1: size, color, rot, ...o }); }

  // 필살기가 맞았을 때. 캐릭터와 기술마다 모양이 다르다(e.key는 기술 키, 장풍이면 장풍 종류, 메치기는 slam).
  impact(e, x, y, big) {
    const P = PAL[e.char] || WARM, d = e.dir || 1, fwd = d > 0 ? 0 : Math.PI, fin = e.last || e.ko;
    switch (e.char + '.' + e.key) {
      case 'heart.rush': this.hearts(x, y, fin ? 10 : 4, P, 36); this.ringAt(x, y, 20, 110 * big, P[0], 9); this.ringAt(x, y, 20, 190 * big, P[2], 15); this.flash(x, y, 130 * big, P[1], 6, .7); break;
      case 'heart.upper': this.pillar(x, y + 60, 460, P[2], 14); this.pillar(x, y + 60, 380, '#fff', 8, .08); this.hearts(x, y + 40, 5, P, 40, 8); this.rays(x, y, 5, [P[1], P[0]], Math.PI / 2, .35, 150, 12); break;
      case 'heart.super': this.hearts(x, y, fin ? 16 : 5, [P[0], GOLD, P[2]], fin ? 50 : 38, fin ? 9 : 6); this.ringAt(x, y, 30, (fin ? 330 : 170), GOLD, fin ? 18 : 10); this.flash(x, y, fin ? 250 : 150, P[0], 8, .5); if (fin) this.mark('heart', x, y, 240, P[0], 0, 16, { alpha: .75 }); break;
      case 'kidney.water': this.drops(x, y, 11, [P[0], P[1], '#3aa8ff'], d, 7); this.bubbles(x, y, 3, [P[1]]); this.ringAt(x, y, 20, 150, P[0], 11); this.flash(x, y, 150, '#58c4ff', 7, .7); break;
      case 'kidney.stone': this.bitsOf('shard', x, y, 9, ['#ecd9b0', '#c9b48a', '#a8946c'], 22, 9); this.emit({ tex: 'puff', add: false, x, y, life: 20, s0: 60, s1: 150, color: '#e6dcc6', alpha: .6 }); this.star(x, y, 90, '#fff8e0', 6); break;
      case 'kidney.barrier': this.mark('hex', x, y, 300, P[0], 0, 13); this.mark('hex', x, y, 180, P[2], TAU / 12, 16); this.bitsOf('hex', x, y, 7, [P[0], P[2], P[1]], 26, 10, { add: true, g: .2 }); this.flash(x, y, 200, P[0], 7, .6); break;
      case 'kidney.wave': this.drops(x, y, fin ? 18 : 7, [P[0], P[1], '#3aa8ff'], d, fin ? 11 : 7, 20); this.emit({ tex: 'puff', x, y, life: 14, s0: 70, s1: 170, color: P[1], alpha: .6 }); if (fin) { this.floorRing(x, 60, 380, 18, P[0]); this.pillar(x, 120, 380, P[0], 14, .35); } break;
      case 'liver.charge': this.rays(x, y, 9, [P[0], P[1], '#ff8a3d'], fwd, .5, 170, 14); this.emit({ tex: 'ring', x, y, z: 44, s0: 60, s1: 300, wide: .45, life: 12, color: P[0] }); this.flash(x, y, 240, P[0], 8); this.bitsOf('shard', x, y, 4, [P[1], '#b0603f'], 16, 8); break;
      case 'liver.stomp': this.floorDecal(x, 'crack', 330, 70, P[1], { add: true, alpha: .8 }); this.floorRing(x, 60, 360, 16, P[0]); this.bitsOf('shard', x, 10, 9, ['#8a5a44', '#b98a6a', P[0]], 20, 11); this.pillar(x, 60, 200, P[0], 9, .6); break;
      case 'liver.slam': this.flash(x, y, 300 * big, P[0], 9); this.star(x, y, 190 * big, P[1], 10); if (e.special || e.sup) this.bubbles(x, 30, e.sup ? 16 : 10, [P[2], '#d9ffe0'], 7, 20); if (e.sup) this.ringAt(x, y + 60, 60, 460, GOLD, 20); break;
      case 'pancreas.lunge': this.emit({ tex: 'streak', x: x + d * 40, y, z: 46, vx: d * 6, life: 9, s0: 120, s1: 150, wide: 2.8, color: P[0], rot: fwd }); this.mark('cross', x, y, 90, '#fff', TAU / 8, 7); this.drops(x, y, 4, [P[0], P[1]], d, 8, 11); break;
      case 'pancreas.riposte': this.mark('cross', x, y, 420, P[1], TAU / 8, 14); this.mark('cross', x, y, 300, GOLD, TAU / 8, 18); this.ringAt(x, y, 40, 300, GOLD, 15); this.flash(x, y, 300, P[0], 9); this.rays(x, y, 8, [P[0], '#fff'], 0, Math.PI, 120, 12); break;
      case 'pancreas.rising': this.emit({ tex: 'slash', x, y, z: 46, vy: 9, drag: .9, life: 14, s0: 220, s1: 400, color: GOLD, rot: Math.PI / 2 }); this.rays(x, y, 6, [P[0], P[1]], Math.PI / 2, .3, 140, 13); this.mark('cross', x, y + 30, 110, '#fff', 0, 8); break;
      case 'pancreas.super': for (let i = 0; i < 3; i++) this.emit({ tex: 'streak', x: x + rnd(-30, 30), y: y + rnd(-60, 60), z: 46, vx: d * 5, life: rnd(6, 9), s0: rnd(70, 100), s1: 110, wide: 2.8, color: i ? P[0] : GOLD, rot: fwd + rnd(-.18, .18) }); this.mark('cross', x, y, fin ? 380 : 100, fin ? GOLD : '#fff', fin ? TAU / 8 : rnd(0, 1), fin ? 18 : 7); if (fin) { this.ringAt(x, y, 40, 380, P[0], 18); this.flash(x, y, 260, P[0], 10, .5); } break;
      case 'soda.spray': this.bubbles(x, y, 5, [P[0], P[1]], 6); this.emit({ tex: 'puff', x, y, life: 10, s0: 50, s1: 110, color: P[1], alpha: .5 }); if (fin) { this.bubbles(x, y, 10, [P[1]], 10, 22); this.ringAt(x, y, 30, 200, P[2], 12); } break;
      case 'soda.burst': this.bubbles(x, y, 14, [P[0], P[1]], 11, 24); this.ringAt(x, y, 40, 260, P[1], 12); this.ringAt(x, y, 30, 150, P[2], 9); this.flash(x, y, 240, P[2], 8, .8); break;
      case 'soda.dive': this.emit({ tex: 'streak', x: x - d * 50, y: y + 60, z: 46, life: 9, s0: 300, s1: 220, color: P[1], rot: d > 0 ? -.85 : Math.PI + .85 }); this.drops(x, 14, 12, [P[0], P[1], P[2]], 0, 9, 18); this.floorRing(x, 50, 300, 15, P[0]); break;
      case 'soda.super': this.bubbles(x, y, fin ? 16 : 5, [P[0], P[1]], fin ? 12 : 6, 22); this.drops(x, y, 4, [P[2], P[1]], 0, 9); if (fin) { this.pillar(x, 220, 620, P[0], 18, .3); this.floorRing(x, 60, 420, 20, P[1]); } break;
      case 'fries.slide': for (let i = 0; i < 9; i++) this.emit({ tex: 'drop', add: false, x: x + rnd(-20, 20), y: rnd(6, 26), vx: d * rnd(3, 11), vy: rnd(1, 5), g: .4, life: rnd(14, 22), s0: rnd(10, 18), s1: 4, color: P[i % 2] }); this.emit({ tex: 'glow', x, y: 20, life: 8, s0: 120, s1: 260, wide: 1.8, color: P[0], alpha: .7 }); break;
      case 'fries.spear': for (let i = 0; i < 5; i++) this.emit({ tex: 'bar', add: false, x: x + rnd(-40, 40), y: y + rnd(-60, 20), vx: rnd(-1.5, 1.5), vy: rnd(9, 16), g: .5, life: rnd(18, 26), s0: rnd(70, 110), s1: 60, wide: .7, color: P[i % 2], rot: rnd(-.25, .25), spin: rnd(-.05, .05) }); this.drops(x, y, 6, [P[0], '#f1b836'], 0, 8); this.pillar(x, y + 40, 360, P[1], 10, .16); break;
      case 'fries.puddle': this.drops(x, 10, 10, [P[0], P[1], '#f1b836'], 0, 8, 18); this.bubbles(x, 14, 3, ['#fff2b8'], 3, 14); this.emit({ tex: 'splat', add: false, x, y: 40, life: 12, s0: 60, s1: 150, color: P[0], alpha: .8, rot: rnd(0, TAU) }); break;
      case 'fries.super': this.drops(x, 16, 5, [P[0], P[1]], d, 9); for (let i = 0; i < (fin ? 9 : 2); i++) { const a = Math.PI / 2 + rnd(-1, 1) * (fin ? 1 : .4); this.emit({ tex: 'bar', add: false, x, y: 20, vx: Math.cos(a) * rnd(6, 13), vy: Math.sin(a) * rnd(9, 17), g: .5, life: rnd(20, 30), s0: rnd(70, 120), s1: 60, wide: .7, color: P[i % 2], rot: a - Math.PI / 2, spin: rnd(-.08, .08) }); } if (fin) { this.floorRing(x, 60, 420, 20, P[2]); this.flash(x, 60, 320, P[0], 10); } break;
      case 'ramen.whip': this.emit({ tex: 'noodle', add: false, x: x - d * 60, y, z: 46, life: 12, s0: 120, s1: 150, wide: 2.2, color: P[0], rot: fwd }); this.drops(x, y, 7, [P[1], '#ffc98a'], -d, 7, 14); this.ringAt(x, y, 20, 110, P[0], 9); break;
      case 'ramen.steam': for (let i = 0; i < 4; i++) this.emit({ tex: 'puff', add: false, x: x + rnd(-30, 30), y: y + rnd(-30, 30), vy: rnd(1.5, 3.5), life: rnd(18, 28), s0: 40, s1: rnd(90, 130), color: P[2], alpha: .55, rot: rnd(0, TAU) }); this.flash(x, y, 120, P[1], 6, .35); break;
      case 'ramen.riser': for (const k of [-1, 1]) this.emit({ tex: 'streak', x, y, z: 46, vy: 5, life: 11, s0: 260, s1: 320, color: '#ffe9c8', rot: Math.PI / 2 + k * .32 }); for (let i = 0; i < 3; i++) this.emit({ tex: 'puff', add: false, x: x + rnd(-30, 30), y, vy: rnd(3, 6), life: rnd(16, 24), s0: 36, s1: 96, color: P[2], alpha: .5 }); this.drops(x, y, 5, [P[1]], 0, 8, 13); break;
      case 'ramen.super': for (let i = 0; i < (fin ? 7 : 2); i++) this.emit({ tex: 'noodle', add: false, x: x + rnd(-40, 40), y: y + rnd(-50, 50), z: 46, life: rnd(10, 16), s0: 110, s1: 170, wide: 1.6, color: P[0], rot: rnd(0, TAU), spin: .12 }); this.drops(x, y, 4, [P[1]], 0, 9, 13); if (fin) { this.ringAt(x, y, 40, 380, P[1], 18); this.flash(x, y, 340, P[0], 10); } break;
      case 'burger.roll': this.bitsOf('drop', x, y, fin ? 14 : 7, ['#fff1c8', '#f3dca0'], 11, 10, { wide: .55 }); this.emit({ tex: 'puff', add: false, x, y, life: 16, s0: 60, s1: 150, color: '#c9a070', alpha: .55 }); this.ringAt(x, y, 30, 170 * big, '#e8a860', 11); break;
      case 'burger.press': case 'burger.super': { const sup = e.sup; this.emit({ tex: 'splat', add: false, x, y, z: 46, life: 16, s0: 90, s1: sup ? 380 : 240, color: P[0], rot: rnd(0, TAU) }); this.bitsOf('shard', x, y, sup ? 12 : 6, [P[1], '#5fb84a'], 22, 11); this.bitsOf('drop', x, y, sup ? 7 : 3, [P[2]], 20, 9); if (sup) { this.ringAt(x, y, 50, 460, GOLD, 20); this.flash(x, y, 420, P[0], 10); } break; }
      case 'burger.slam': this.emit({ tex: 'splat', add: false, x, y, z: 46, life: 14, s0: 80, s1: 260, color: P[0], rot: rnd(0, TAU) }); this.bitsOf('drop', x, y, 8, ['#fff1c8', '#f3dca0'], 11, 10, { wide: .55 }); this.star(x, y, 150, '#fff6d0', 8); break;
      default: this.flash(x, y, 190 * big, P[0], 7, .8); this.star(x, y, 130 * big, P[1]); this.ringAt(x, y, 30, 170 * big, P[0], 11); this.burst(x, y, 10, P, 10, 17);
    }
  }

  onEvent(e) {
    const x = e.x - 640, y = -(e.y || 0);
    switch (e.type) {
      case 'hit': {
        const big = e.ko ? 1.7 : e.heavy ? 1.3 : 1;
        // 필살기는 기술마다 제 모양으로 터지고, 기본기만 아래의 흰 불꽃을 쓴다.
        if (e.special || e.sup || e.key === 'slam') { this.impact(e, x, y, big); if (e.ko) { this.star(x, y, 220, '#fffbe8', 10); this.burst(x, y, 12, WARM, 12, 18); } if (e.counter) this.ringAt(x, y, 40, 230, '#ff8a3d', 16); break; }
        this.flash(x, y, 170 * big, '#ffe9b0', 7, .8); this.star(x, y, 120 * big, '#fffbe8'); this.ringAt(x, y, 30, 150 * big, '#ffd166', 11);
        this.burst(x, y, e.ko ? 26 : e.heavy ? 15 : 9, WARM, e.heavy ? 12 : 8, e.heavy ? 20 : 15);
        if (e.counter) this.ringAt(x, y, 40, 230, '#ff8a3d', 16);
        break;
      }
      case 'block': this.flash(x, y, 110, '#7cc8ff', 7); this.ringAt(x, y, 24, 96, '#bfe6ff', 9); this.burst(x, y, 6, ['#d9f2ff', '#7cc8ff'], 5, 11); break;
      case 'clash': this.flash(x, y, 230, '#fff'); this.star(x, y, 170); this.ringAt(x, y, 30, 180, '#bfe6ff'); this.burst(x, y, 16, ['#fff', '#ffd166', '#7cc8ff'], 9, 15); break;
      case 'fire': this.ringAt(x, y, 30, 120, KIND_COLOR[e.kind] || '#fff', 10); this.flash(x, y, 120, KIND_COLOR[e.kind] || '#fff', 7); break;
      case 'land':
        if (e.crater) { const P = PAL[e.char] || WARM; this.floorDecal(x, 'crack', 420, 80, '#fff1c8', { add: true, alpha: .7 }); this.floorDecal(x, 'splat', 260, 110, P[0], { alpha: .85 }); this.dust(x, 12, 100, 84, '#d8c0a0'); this.floorRing(x, 70, 440, 18, P[0]); this.bitsOf('shard', x, 10, 6, [P[1], '#5fb84a'], 18, 10); }
        else if (e.heavy) { this.dust(x, 9, 70, 70); this.floorRing(x, 60, 300, 16, '#ffd9c0'); } else this.dust(x, 3, 30, 36);
        break;
      // 필살기를 내는 순간: 캐릭터 색 고리가 몸 쪽으로 조여든다.
      case 'special': { const P = PAL[e.char] || WARM; this.ringAt(x, y, 210, 50, P[0], 9); this.flash(x, y, 170, P[0], 9, .5); this.mark('cross', x, y, 150, P[1], 0, 8); break; }
      case 'jump': this.dust(x, 4, 34, 40); break;
      case 'potion':
        this.flash(x, y, 260, '#9dffb0', 16); this.ringAt(x, y, 40, 200, '#9dffb0', 18);
        for (let i = 0; i < 18; i++) this.emit({ tex: 'spark', x: x + rnd(-50, 50), y: y + rnd(-90, 40), vy: rnd(1.5, 4.5), life: rnd(28, 48), s0: rnd(14, 26), s1: 4, color: pick(['#9dffb0', '#d9ffe0', '#58d68d']), rot: rnd(0, TAU), spin: .05 });
        break;
      case 'super':
        this.flash(x, y, 620, '#ffd98a', 24, .7); this.ringAt(x, y, 60, 520, '#ffe0a0', 26); this.ringAt(x, y, 30, 320, '#fff', 18); this.star(x, y, 320, '#fff7dc', 20);
        this.floorRing(x, 80, 620, 28, '#ffd98a');
        break;
      case 'armor': this.flash(x, y, 150, '#ffb347', 9); this.ringAt(x, y, 40, 150, '#ffb347', 10); break;
      case 'counter': this.flash(x, y, 220, '#7cf0ff', 12); this.star(x, y, 200, '#e8fdff', 13); this.ringAt(x, y, 30, 200, '#7cf0ff', 14); break;
      case 'reflect': this.ringAt(x, y, 40, 210, '#8fe9ff', 14); this.star(x, y, 150, '#e8fdff'); this.burst(x, y, 10, ['#e8fdff', '#8fe9ff'], 8, 13); break;
      case 'grab': {
        const P = PAL[e.char];
        if (!e.special || !P) { this.star(x, y, 130); this.ringAt(x, y, 20, 110, '#fff6c8', 9); break; }
        this.ringAt(x, y, 190, 40, P[0], 10); this.star(x, y, 150, P[1], 8);
        // 버거는 치즈가 늘어져 붙고, 간은 두 손이 죄어 온다.
        if (e.char === 'burger') for (let i = 0; i < 6; i++) this.emit({ tex: 'drop', add: false, x: x + rnd(-50, 50), y: y + rnd(20, 70), vy: -rnd(.5, 2), g: .25, life: rnd(20, 30), s0: 46, s1: 70, wide: .22, color: P[0] });
        else this.rays(x, y, 6, [P[0], P[1]], 0, Math.PI, 90, -7);
        break;
      }
      case 'slam': {
        const P = PAL[e.char], big = e.big && P;
        this.dust(x, 14, 110, 90); this.floorRing(x, 80, 460, 20, big ? P[0] : '#ffd9c0');
        if (!big) break;
        this.floorDecal(x, 'crack', e.sup ? 520 : 400, 90, P[1], { add: true, alpha: .8 });
        if (e.char === 'burger') this.floorDecal(x, 'splat', 280, 120, P[0], { alpha: .85 }); else this.bitsOf('shard', x, 10, 10, ['#8a5a44', '#b98a6a', P[0]], 20, 12);
        break;
      }
      case 'splash':
        if (e.kind === 'puddle') for (let i = 0; i < 10; i++) this.emit({ tex: 'drop', add: false, x: x + rnd(-50, 50), y: 6, vx: rnd(-3, 3), vy: rnd(3, 8), g: .45, life: rnd(16, 26), s0: rnd(12, 20), s1: 6, color: pick(['#ffd35a', '#ffe58a', '#f1b836']) });
        else { this.dust(x, 7, 50, 54, '#e6dcc6'); this.burst(x, 12, 6, ['#ecd9b0', '#c9b48a'], 6, 11, { tex: 'drop', add: false }); }
        break;
    }
  }

  // 장풍 모양 부품(지오메트리와 재질 틀).
  buildShotParts() {
    const rock = new THREE.IcosahedronGeometry(23, 1), p = rock.attributes.position;
    for (let i = 0; i < p.count; i++) { const k = 1 + Math.sin(p.getX(i) * 12.9898 + p.getY(i) * 78.233 + p.getZ(i) * 37.719) * .13; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k); }
    rock.computeVertexNormals();
    // 물마루: 앞(+x)으로 말려 넘어가는 파도 옆모습을 깊이 방향으로 뽑는다.
    const crest = new THREE.Shape();
    crest.moveTo(-62, -80); crest.lineTo(56, -80);
    crest.bezierCurveTo(30, -66, 8, -28, 16, 14); crest.bezierCurveTo(24, 50, 52, 62, 66, 44);
    crest.bezierCurveTo(60, 84, 10, 96, -22, 62); crest.bezierCurveTo(-52, 30, -58, -30, -62, -80);
    const wave = new THREE.ExtrudeGeometry(crest, { depth: 150, bevelEnabled: true, bevelThickness: 10, bevelSize: 8, bevelSegments: 4, curveSegments: 14 });
    wave.translate(0, 0, -75);
    const water = { roughness: .08, clearcoat: 1, clearcoatRoughness: .1, emissive: '#0b4f9a', emissiveIntensity: .55 };
    return {
      ball: new THREE.SphereGeometry(21, 24, 16), rock, wave, disc: new THREE.CircleGeometry(1, 40),
      water: new THREE.MeshPhysicalMaterial({ color: '#3aa8ff', ...water }),
      waveMat: new THREE.MeshPhysicalMaterial({ color: '#2f9bf0', ...water, transparent: true, opacity: .9 }),
      stone: new THREE.MeshStandardMaterial({ color: '#dccba6', roughness: .78, flatShading: true }),
      oil: new THREE.MeshPhysicalMaterial({ color: '#ffc92e', roughness: .1, clearcoat: 1, clearcoatRoughness: .08, emissive: '#7a4a00', emissiveIntensity: .35, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    };
  }
  glowSprite(color, size) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.tex.glow, color, transparent: true, depthWrite: false, fog: false, toneMapped: false, blending: THREE.AdditiveBlending, opacity: .7 }));
    s.scale.set(size, size, 1); s.position.z = -12; return s;
  }
  makeShot(shot) {
    const S = this.shotParts, group = new THREE.Group(), v = { group, kind: shot.kind };
    const solid = (geometry, material) => { const m = new THREE.Mesh(geometry, material); m.castShadow = true; group.add(m); return m; };
    switch (shot.kind) {
      case 'water': v.body = solid(S.ball, S.water); group.add(this.glowSprite('#58c4ff', 130)); break;
      case 'stone': v.body = solid(S.rock, S.stone); break;
      case 'wave': v.body = solid(S.wave, S.waveMat); group.add(this.glowSprite('#58c4ff', 300)); break;
      case 'puddle': v.mat = S.oil.clone(); v.body = new THREE.Mesh(S.disc, v.mat); v.body.rotation.x = -Math.PI / 2; v.body.receiveShadow = true; v.body.renderOrder = 2; group.add(v.body); break;
      case 'steam': break;
      default: group.add(this.glowSprite(shot.color || '#fff', Math.max(shot.w, shot.h) * 1.8));
    }
    this.scene.add(group);
    return v;
  }
  dropShot(v) { this.scene.remove(v.group); v.mat?.dispose(); v.group.traverse(o => { if (o.isSprite) o.material.dispose(); }); }

  syncShots(sim, ticked) {
    for (const v of this.shots.values()) v.seen = false;
    for (const shot of sim.shots) {
      if (shot.dead) continue;
      let v = this.shots.get(shot);
      if (!v) this.shots.set(shot, v = this.makeShot(shot));
      v.seen = true;
      const x = shot.x - 640, y = -shot.y, dir = Math.sign(shot.vx) || shot.dir || 1, g = v.group, wob = Math.sin(shot.age * .55);
      g.position.set(x, y, 0);
      switch (shot.kind) {
        case 'water':
          v.body.scale.set(1.45 + wob * .08, .95 - wob * .05, .95);
          if (ticked) this.emit({ tex: 'drop', add: false, x: x - dir * rnd(18, 30), y: y + rnd(-12, 12), z: 6, vx: -dir * rnd(.5, 2), vy: rnd(-.6, .6), life: rnd(10, 16), s0: rnd(12, 20), s1: 3, color: '#bfe9ff', alpha: .85 });
          break;
        case 'stone':
          v.body.rotation.z = -dir * shot.age * .22; v.body.rotation.x = shot.age * .1;
          if (ticked && shot.age % 3 === 0) this.emit({ tex: 'puff', add: false, x, y, z: 4, life: 14, s0: 20, s1: 44, color: '#e6dcc6', alpha: .35 });
          break;
        case 'wave':
          g.scale.set(dir, 1 + wob * .04, 1); g.position.y = 80;
          if (ticked) for (let i = 0; i < 2; i++) this.emit({ tex: 'puff', x: x + dir * rnd(10, 60), y: rnd(120, 170), z: rnd(-60, 60), vx: -dir * rnd(1, 3), vy: rnd(0, 2), life: rnd(10, 18), s0: rnd(26, 40), s1: rnd(50, 70), color: '#eaf8ff', alpha: .7 });
          if (ticked && shot.age % 2 === 0) this.emit({ tex: 'drop', add: false, x: x - dir * rnd(40, 70), y: rnd(10, 60), vx: -dir * rnd(1, 4), vy: rnd(2, 6), g: .4, life: 18, s0: rnd(10, 18), s1: 4, color: '#bfe9ff' });
          break;
        case 'puddle': {
          const grow = easeOut(Math.min(1, shot.age / 10)), fade = shot.life ? Math.min(1, (shot.life - shot.age) / 30) : 1;
          v.body.scale.set(shot.w / 2 * grow * (1 + wob * .02), 30 * grow, 1); g.position.set(x, 1.3, 0); v.mat.opacity = .92 * Math.max(0, fade);
          if (ticked && shot.age % 22 === 8) this.emit({ tex: 'bubble', add: false, x: x + rnd(-50, 50), y: 6, z: rnd(-14, 14), vy: .5, life: 16, s0: 6, s1: 16, color: '#fff2b8', alpha: .9 });
          break;
        }
        case 'steam':
          if (ticked) for (let i = 0; i < 2; i++) this.emit({ tex: 'puff', add: false, x: x + rnd(-shot.w, shot.w) * .36, y: y + rnd(-shot.h, shot.h * .4) * .5, z: rnd(-20, 40), vx: rnd(-.6, .6), vy: rnd(1.4, 3.2), life: rnd(22, 32), s0: rnd(40, 60), s1: rnd(90, 130), color: '#fff6ee', alpha: .42, fade: 'inout', rot: rnd(0, TAU), spin: rnd(-.03, .03) });
          break;
      }
    }
    for (const [shot, v] of this.shots) if (!v.seen) {
      // 사라지는 순간 물방울이나 돌가루로 흩어진다.
      const x = shot.x - 640, y = -shot.y;
      if (v.kind === 'water' || v.kind === 'wave') for (let i = 0; i < (v.kind === 'wave' ? 14 : 7); i++) this.emit({ tex: 'drop', add: false, x: x + rnd(-20, 20), y: y + rnd(-30, 30), vx: rnd(-5, 5), vy: rnd(1, 7), g: .45, life: rnd(14, 24), s0: rnd(10, 20), s1: 4, color: '#bfe9ff' });
      this.dropShot(v); this.shots.delete(shot);
    }
  }

  // 판정이 살아 있는 동안 기술마다 다른 효과를 뿌린다. 시뮬이 한 틱 나아갈 때만 부른다.
  poseFx(sim, f) {
    const m = f.move, t = f.t, first = t === m.startup + 1, d = f.facing, x = f.x - 640, y = -f.y, tint = f.char.color;
    const P = PAL[f.char.id] || WARM, fwd = d > 0 ? 0 : Math.PI;
    const box = m.box ? sim.hitBox(f) : null;
    const bx = box ? box.x + box.w / 2 - 640 : x + d * 70, by = box ? -(box.y + box.h / 2) : y + 110, bw = box ? box.w : 80, bh = box ? box.h : 80;
    const trail = (color = '#d9b8c8') => { if (t % 2 === 0) this.emit({ tex: 'puff', add: false, x: x - d * rnd(20, 50), y: y + rnd(8, 22), z: rnd(-10, 30), vx: -d * rnd(.5, 2), vy: rnd(.4, 1.4), life: rnd(16, 24), s0: 26, s1: rnd(50, 70), color, alpha: .45 }); };
    const lines = (color = '#fff') => this.emit({ tex: 'streak', x: x - d * rnd(30, 90), y: y + rnd(50, 190), z: rnd(-20, 30), vx: -d * rnd(4, 8), life: rnd(6, 10), s0: rnd(90, 150), s1: 60, wide: 1, color, alpha: .5, rot: d > 0 ? 0 : Math.PI });
    const column = (colors, tex = 'drop') => { for (let i = 0; i < 4; i++) this.emit({ tex, add: false, x: bx + rnd(-bw, bw) * .3, y: rnd(0, 60), z: rnd(-20, 30), vx: rnd(-1.5, 1.5), vy: rnd(10, 19), g: .25, life: rnd(14, 22), s0: rnd(14, 26), s1: 8, color: pick(colors) }); };
    switch (m.pose) {
      // 연타 셋은 모양이 다르다: 심장은 하트가 터지고, 췌장은 바늘이 꽂히고, 심장 초필살기는 금빛 고리가 겹친다.
      case 'rush': if (t % 2 === 0) this.hearts(bx + rnd(-bw, bw) * .3, by, 1, P, 30, 4); lines(P[0]); if (t % 7 === 1) this.ringAt(bx, by, 20, 120, P[2], 8); trail('#e8b8c8'); break;
      case 'flurry':
        this.emit({ tex: 'streak', x: bx + d * rnd(-20, 40), y: by + rnd(-bh, bh) * .45, z: 40, vx: d * 7, life: rnd(4, 7), s0: bw * rnd(.28, .38), s1: bw * .42, wide: 2.6, color: t % 3 ? P[0] : GOLD, alpha: .7, rot: fwd });
        if (t % 3 === 0) this.mark('cross', bx + d * bw * .45, by + rnd(-bh, bh) * .4, 80, GOLD, rnd(0, 1), 6);
        break;
      case 'super': this.hearts(bx + rnd(-bw, bw) * .35, by + rnd(-bh, bh) * .3, 1, [P[0], GOLD, P[2]], 34, 6); lines(GOLD); lines(P[2]); if (t % 6 === 1) { this.ringAt(bx, by, 30, 210, GOLD, 10); this.ringAt(bx, by, 20, 130, P[0], 8); } trail('#e8b8c8'); break;
      // 솟구치는 넷: 심장은 붉은 기둥, 췌장은 금빛 초승달, 라면은 김과 젓가락, 감자튀김은 튀김 막대.
      case 'upper': this.pillar(bx, by, bh * 1.3, P[2], 7, .16); if (t % 3 === 0) this.hearts(bx, by + bh * .3, 1, P, 26, 5); if (first) this.dust(x, 5, 40, 44); break;
      case 'rising':
        if (first) this.emit({ tex: 'slash', x: bx, y: by - bh * .2, z: 40, vy: 12, drag: .9, life: 13, s0: bh * .7, s1: bh * 1.2, color: GOLD, alpha: .9, rot: Math.PI / 2 });
        this.emit({ tex: 'streak', x: bx + rnd(-24, 24), y: by + rnd(-bh, bh) * .3, vy: rnd(7, 12), life: 7, s0: bh * .5, s1: bh * .3, color: P[t % 2], alpha: .7, rot: Math.PI / 2 });
        break;
      case 'riser':
        for (let i = 0; i < 2; i++) { const a = t * .7 + i * Math.PI; this.emit({ tex: 'streak', x: bx + Math.cos(a) * 46, y: by + rnd(-bh, bh) * .3, z: 30 + Math.sin(a) * 30, vy: 6, life: 7, s0: 120, s1: 70, color: i ? P[0] : P[1], alpha: .8, rot: Math.PI / 2 + Math.cos(a) * .5 }); }
        if (t % 2 === 0) this.emit({ tex: 'puff', add: false, x: bx + rnd(-30, 30), y: by, vy: rnd(2, 4), life: rnd(16, 24), s0: 34, s1: 90, color: P[2], alpha: .45, rot: rnd(0, TAU) });
        if (first) this.dust(x, 4, 36, 40, '#f0d8c0');
        break;
      case 'spear':
        this.emit({ tex: 'bar', add: false, x: bx + rnd(-bw, bw) * .35, y: rnd(10, 60), z: rnd(-10, 30), vy: rnd(13, 20), g: .3, life: rnd(12, 18), s0: rnd(90, 140), s1: 80, wide: .7, color: P[t % 2], rot: rnd(-.12, .12) });
        if (t % 2 === 0) this.drops(bx, 20, 1, [P[0]], 0, 8, 12);
        if (first) { this.dust(x, 5, 40, 44, '#ffe9a8'); this.floorRing(bx, 40, 200, 12, P[0]); }
        break;
      case 'lunge':
        if (first) this.emit({ tex: 'streak', x: bx, y: by, s0: bw * .4, s1: bw * .3, wide: 2.8, life: 9, color: P[0], alpha: .8, rot: fwd });
        if (t % 4 === 0) this.mark('cross', bx + d * bw * .5, by, 70, '#fff', TAU / 8, 6);
        break;
      // 돌진 둘: 간은 앞에 충격파를 밀고 가고, 버거는 깨와 흙먼지를 뒤로 흘린다.
      case 'charge':
        if (t % 2 === 0) this.emit({ tex: 'slash', x: x + d * 96, y: y + 105, z: 36, vx: d * 3, life: 6, s0: 190, s1: 250, color: P[0], alpha: .6, rot: fwd });
        lines(P[1]); trail('#d8b8a0');
        break;
      case 'roll':
        if (t % 2 === 0) this.bitsOf('drop', x - d * 20, y + rnd(40, 150), 1, ['#fff1c8', '#f3dca0'], 11, 7, { wide: .55, vx: -d * rnd(2, 6) });
        if (t % 3 === 0) this.dust(x, 2, 34, 56, '#c9a070');
        break;
      case 'stomp': if (first) { this.floorRing(bx, 60, bw * 2.4, 18, P[0]); this.floorDecal(bx, 'crack', bw * 1.7, 60, P[1], { add: true, alpha: .7 }); this.dust(bx, 12, bw * .5, 70); this.flash(bx, 30, 260, P[0], 10); } break;
      // 떨어지는 동안만 위로 치즈빛 선이 남는다.
      case 'press': if (f.vy > 0 && (m.isSuper || t % 2 === 0)) this.emit({ tex: 'streak', x: x + rnd(-60, 60), y: y + rnd(150, 260), z: rnd(-20, 30), vy: 6, life: rnd(6, 9), s0: rnd(120, 190), s1: 80, color: m.isSuper ? GOLD : P[0], alpha: .6, rot: -Math.PI / 2 }); break;
      case 'slide': trail('#ffe58a'); if (t % 2 === 0) this.emit({ tex: 'drop', add: false, x: x - d * rnd(10, 60), y: rnd(4, 14), vx: -d * rnd(1, 4), vy: rnd(2, 5), g: .4, life: 16, s0: rnd(10, 16), s1: 4, color: '#ffd35a' }); if (m.isSuper) { column(['#ffd35a', '#ffe58a', '#f1b836']); if (t % 4 === 0) this.emit({ tex: 'bar', add: false, x: bx + rnd(-bw, bw) * .4, y: 20, vy: rnd(10, 16), g: .45, life: 18, s0: 100, s1: 70, wide: .7, color: P[1], rot: rnd(-.3, .3), spin: rnd(-.06, .06) }); } break;
      case 'spray': for (let i = 0; i < 3; i++) this.emit({ tex: i ? 'bubble' : 'puff', add: !i, x: bx - d * bw * .4, y: by + rnd(-10, 10), vx: d * rnd(7, 14), vy: rnd(-2.5, 2.5), drag: .94, life: rnd(10, 16), s0: rnd(10, 18), s1: rnd(26, 44), color: i ? '#e8f8ff' : '#bfe9ff', alpha: i ? .95 : .5 }); break;
      case 'burst':
        if (first) { this.ringAt(x, y + 110, 60, 330, '#bfe9ff', 14); this.flash(x, y + 110, 300, '#8fd6ff', 10); }
        for (let i = 0; i < 4; i++) { const a = rnd(0, TAU); this.emit({ tex: 'bubble', add: false, x, y: y + 110, vx: Math.cos(a) * rnd(4, 9), vy: Math.sin(a) * rnd(4, 9), drag: .92, life: rnd(12, 20), s0: rnd(12, 20), s1: rnd(24, 36), color: '#e8f8ff' }); }
        break;
      case 'geyser': column(['#e8f8ff', '#bfe9ff', '#8fd6ff'], 'bubble'); column(['#bfe9ff', '#fff']); if (t % 2 === 0) this.emit({ tex: 'puff', x: bx, y: rnd(20, 60), vy: rnd(8, 14), life: 16, s0: 70, s1: 130, color: '#bfe9ff', alpha: .5 }); if (first) this.floorRing(bx, 50, 260, 16, '#bfe9ff'); break;
      case 'dive': this.emit({ tex: 'streak', x: x - d * 30, y: y + 150, life: 7, s0: 150, s1: 90, color: '#bfe9ff', alpha: .55, rot: d > 0 ? -.85 : Math.PI + .85 }); if (t % 2 === 0) this.bubbles(x - d * 20, y + 130, 1, P, 2, 14); break;
      // 피하는 둘: 심장은 분홍 잔상, 콜라는 거품 꼬리.
      case 'weave': if (t % 2 === 0) { this.emit({ tex: 'puff', add: false, x: x - d * 20, y: y + rnd(30, 150), life: 12, s0: 40, s1: 80, color: tint, alpha: .28 }); this.emit({ tex: 'streak', x: x - d * 40, y: y + rnd(60, 120), life: 6, s0: 110, s1: 60, color: P[1], alpha: .5, rot: fwd }); } break;
      case 'slip': this.bubbles(x - d * 16, y + rnd(20, 90), 1, P, 2, 13); if (t % 3 === 0) this.emit({ tex: 'puff', x: x - d * 30, y: y + 40, life: 10, s0: 40, s1: 90, color: P[2], alpha: .3 }); break;
      case 'tornado':
        for (let i = 0; i < 4; i++) {
          const a = t * .55 + i * TAU / 4, h = (t * 9 + i * 70) % 260, r = 60 + h * .32;
          this.emit({ tex: i % 2 ? 'noodle' : 'streak', add: !(i % 2), x: bx + Math.cos(a) * r, y: 20 + h, z: Math.sin(a) * r * .5, life: 7, s0: 110, s1: 70, wide: i % 2 ? 1.5 : 1, color: i % 2 ? P[0] : P[1], alpha: .8, rot: Math.cos(a) > 0 ? .25 : Math.PI - .25 });
        }
        if (t % 3 === 0) this.dust(bx, 2, 90, 60);
        break;
      // 면발이 판정 길이만큼 뻗는다.
      case 'whip':
        if (first) this.emit({ tex: 'noodle', add: false, x: bx, y: by, z: 38, life: m.active + 4, s0: 120, s1: 130, wide: bw / 120, color: P[0], rot: fwd });
        this.drops(bx + d * bw * .5, by, 1, [P[1]], d, 5, 11);
        break;
      case 'grab': if (m.isSuper) { lines(P[0]); trail('#d8b8a0'); if (t % 2 === 0) this.bubbles(x, y + rnd(40, 160), 1, [P[2]], 3, 14); } break;
      default:
        // 기본기: 판정이 나오는 순간 휘두른 자국을 남긴다.
        if (first && box && !m.special) this.emit({ tex: 'slash', x: bx + d * bw * .12, y: by, z: 34, s0: Math.max(bw, bh) * .9, s1: Math.max(bw, bh) * 1.25, life: 7, color: '#fff', alpha: m.heavy ? .55 : .38, rot: d > 0 ? 0 : Math.PI });
    }
  }

  update(sim, dt = 1) {
    for (const b of this.bits) if (b.live) {
      b.age += dt;
      if (b.age >= b.life) { b.live = false; b.sprite.visible = false; continue; }
      b.x += b.vx * dt; b.y += b.vy * dt; b.vy -= b.g * dt; if (b.drag !== 1) { b.vx *= b.drag; b.vy *= b.drag; }
      if (b.spin) b.sprite.material.rotation += b.spin * dt;
      this.place(b);
    }
    for (const r of this.rings) if (r.live) {
      r.age += dt; const k = r.age / r.life;
      if (k >= 1) { r.live = false; r.mesh.visible = false; continue; }
      if (r.decal) { const s = r.s1 * (.6 + .4 * easeOut(Math.min(1, k * 7))); r.mesh.scale.set(s, s * .56, 1); r.mesh.material.opacity = r.alpha * Math.min(1, (1 - k) * 2.2); }
      else { const s = r.s0 + (r.s1 - r.s0) * easeOut(k); r.mesh.scale.set(s, s * .62, 1); r.mesh.material.opacity = .8 * (1 - k); }
    }
    if (!sim) { this.clearShots(); for (const s of [...this.aura, ...this.shield]) s.visible = false; this.sim = null; return; }
    if (sim !== this.sim) { this.clearShots(); this.sim = sim; this.tick = -1; }
    const ticked = sim.tick !== this.tick; this.tick = sim.tick;
    this.syncShots(sim, ticked);
    sim.f.forEach((f, i) => {
      const m = f.state === 'attack' ? f.move : null, x = f.x - 640, y = -f.y, aura = this.aura[i], shield = this.shield[i];
      if (m && ticked && f.t > m.startup && f.t <= m.startup + m.active) this.poseFx(sim, f);
      aura.visible = !!m && (!!m.isSuper || sim.freeze > 0 && !!m.special);
      if (aura.visible) { const s = 400 + Math.sin(this.stage.time * .4) * 36; aura.position.set(x, y + 115, -40); aura.scale.set(s, s, 1); aura.material.opacity = .6; }
      // 신장의 여과막과 췌장의 받아치기 자세는 몸 앞에 막이 뜬다.
      const guard = m && (m.pose === 'barrier' || m.pose === 'stance') && f.t >= 3 && f.t <= m.startup + m.active + 3;
      shield.visible = !!guard;
      if (guard) {
        const stance = m.pose === 'stance', pulse = 1 + Math.sin(this.stage.time * .5) * .05;
        shield.material.color.set(stance ? '#b8ffd8' : '#8fe9ff'); shield.material.opacity = stance ? .4 : .85;
        shield.position.set(x + f.facing * (stance ? 30 : 62), y + 112, 26); shield.scale.set((stance ? 150 : 96) * pulse, (stance ? 230 : 212) * pulse, 1);
      }
    });
  }

  clearShots() { for (const v of this.shots.values()) this.dropShot(v); this.shots.clear(); }
  clear() {
    for (const b of this.bits) { b.live = false; b.sprite.visible = false; }
    for (const r of this.rings) { r.live = false; r.mesh.visible = false; }
    this.clearShots();
  }
}
