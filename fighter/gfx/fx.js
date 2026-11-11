// 효과: 타격 불꽃, 먼지, 장풍 모양, 기술마다 다른 분사. 스프라이트는 풀에 담아 돌려 쓴다.
// 좌표는 무대와 같다(시뮬 x − 640, 바닥 y=0, 위가 +y). 시뮬의 y는 위가 음수라 부호를 뒤집어 받는다.
import * as THREE from '../../vendor/three.module.js';

const TAU = Math.PI * 2, POOL = 190;
const rnd = (a, b) => a + Math.random() * (b - a), pick = list => list[Math.floor(Math.random() * list.length)];
const easeOut = k => 1 - (1 - k) * (1 - k);

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
};

const KIND_COLOR = { water: '#7fd6ff', wave: '#7fd6ff', stone: '#ecd9b0', steam: '#fff4ea', puddle: '#ffd35a' };
const WARM = ['#fff6c8', '#ffd166', '#ff8a3d'];

export class Fx {
  constructor(stage) {
    this.stage = stage; this.scene = stage.scene;
    this.tex = {}; for (const key in TEX) this.tex[key] = texture(key === 'glow' || key === 'drop' || key === 'bubble' ? 64 : 128, TEX[key]);
    this.bits = []; this.next = 0;
    for (let i = 0; i < POOL; i++) {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.tex.glow, transparent: true, depthWrite: false, fog: false, toneMapped: false }));
      sprite.visible = false; sprite.renderOrder = 5; this.scene.add(sprite);
      this.bits.push({ sprite, live: false });
    }
    // 바닥에 눕는 충격 고리.
    this.rings = [];
    for (let i = 0; i < 6; i++) {
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
    const r = this.rings.find(r => !r.live) || this.rings[0];
    Object.assign(r, { live: true, age: 0, life, s0, s1 }); r.mesh.material.color.set(color); r.mesh.position.set(x, 1.6, z); r.mesh.visible = true;
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

  onEvent(e) {
    const x = e.x - 640, y = -(e.y || 0);
    switch (e.type) {
      case 'hit': {
        const big = e.ko ? 1.7 : e.heavy ? 1.3 : 1;
        this.flash(x, y, 170 * big, '#ffe9b0', 7, .8); this.star(x, y, 120 * big, '#fffbe8'); this.ringAt(x, y, 30, 150 * big, '#ffd166', 11);
        this.burst(x, y, e.ko ? 26 : e.heavy ? 15 : 9, WARM, e.heavy ? 12 : 8, e.heavy ? 20 : 15);
        if (e.counter) this.ringAt(x, y, 40, 230, '#ff8a3d', 16);
        break;
      }
      case 'block': this.flash(x, y, 110, '#7cc8ff', 7); this.ringAt(x, y, 24, 96, '#bfe6ff', 9); this.burst(x, y, 6, ['#d9f2ff', '#7cc8ff'], 5, 11); break;
      case 'clash': this.flash(x, y, 230, '#fff'); this.star(x, y, 170); this.ringAt(x, y, 30, 180, '#bfe6ff'); this.burst(x, y, 16, ['#fff', '#ffd166', '#7cc8ff'], 9, 15); break;
      case 'fire': this.ringAt(x, y, 30, 120, KIND_COLOR[e.kind] || '#fff', 10); this.flash(x, y, 120, KIND_COLOR[e.kind] || '#fff', 7); break;
      case 'land': if (e.heavy) { this.dust(x, 9, 70, 70); this.floorRing(x, 60, 300, 16, '#ffd9c0'); } else this.dust(x, 3, 30, 36); break;
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
      case 'grab': this.star(x, y, 130); this.ringAt(x, y, 20, 110, '#fff6c8', 9); break;
      case 'slam': this.dust(x, 14, 110, 90); this.floorRing(x, 80, 460, 20, '#ffd9c0'); break;
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
    const box = m.box ? sim.hitBox(f) : null;
    const bx = box ? box.x + box.w / 2 - 640 : x + d * 70, by = box ? -(box.y + box.h / 2) : y + 110, bw = box ? box.w : 80, bh = box ? box.h : 80;
    const trail = (color = '#d9b8c8') => { if (t % 2 === 0) this.emit({ tex: 'puff', add: false, x: x - d * rnd(20, 50), y: y + rnd(8, 22), z: rnd(-10, 30), vx: -d * rnd(.5, 2), vy: rnd(.4, 1.4), life: rnd(16, 24), s0: 26, s1: rnd(50, 70), color, alpha: .45 }); };
    const lines = (color = '#fff') => this.emit({ tex: 'streak', x: x - d * rnd(30, 90), y: y + rnd(50, 190), z: rnd(-20, 30), vx: -d * rnd(4, 8), life: rnd(6, 10), s0: rnd(90, 150), s1: 60, wide: 1, color, alpha: .5, rot: d > 0 ? 0 : Math.PI });
    const pop = (color, n = 1) => { for (let i = 0; i < n; i++) this.star(bx + rnd(-bw, bw) * .4, by + rnd(-bh, bh) * .4, rnd(40, 80), color, 6); };
    const column = (colors, tex = 'drop') => { for (let i = 0; i < 4; i++) this.emit({ tex, add: false, x: bx + rnd(-bw, bw) * .3, y: rnd(0, 60), z: rnd(-20, 30), vx: rnd(-1.5, 1.5), vy: rnd(10, 19), g: .25, life: rnd(14, 22), s0: rnd(14, 26), s1: 8, color: pick(colors) }); };
    const rise = color => { this.emit({ tex: 'streak', x: bx + rnd(-14, 14), y: by + rnd(-bh, bh) * .3, vy: rnd(5, 9), life: 8, s0: bh * .9, s1: bh * .5, color, alpha: .6, rot: Math.PI / 2 }); };
    switch (m.pose) {
      case 'rush': case 'flurry': case 'super': if (t % 2 === 0) pop('#fff6c8'); lines(m.isSuper ? '#ffd98a' : '#fff'); trail(); break;
      case 'upper': case 'rising': case 'riser': rise('#fff6c8'); if (first) this.dust(x, 5, 40, 44); break;
      case 'spear': rise('#ffe58a'); if (first) this.dust(x, 5, 40, 44, '#ffe9a8'); break;
      case 'lunge': if (first) this.emit({ tex: 'streak', x: bx, y: by, s0: bw * 1.1, s1: bw * .8, wide: 1, life: 9, color: '#c8fff0', alpha: .8, rot: d > 0 ? 0 : Math.PI }); break;
      case 'charge': lines('#ffd9c0'); trail(); break;
      case 'roll': lines('#ffe0a0'); trail(); if (t % 6 === 0) this.dust(x, 2, 30, 50); break;
      case 'stomp': if (first) { this.floorRing(bx, 60, bw * 2.4, 18, '#ffd9c0'); this.dust(bx, 12, bw * .5, 70); this.flash(bx, 30, 260, '#ffb347', 10); } break;
      case 'press': if (m.isSuper || t % 3 === 0) lines('#ffe0a0'); break;
      case 'slide': trail('#ffe58a'); if (t % 2 === 0) this.emit({ tex: 'drop', add: false, x: x - d * rnd(10, 60), y: rnd(4, 14), vx: -d * rnd(1, 4), vy: rnd(2, 5), g: .4, life: 16, s0: rnd(10, 16), s1: 4, color: '#ffd35a' }); if (m.isSuper) column(['#ffd35a', '#ffe58a', '#f1b836']); break;
      case 'spray': for (let i = 0; i < 3; i++) this.emit({ tex: i ? 'bubble' : 'puff', add: !i, x: bx - d * bw * .4, y: by + rnd(-10, 10), vx: d * rnd(7, 14), vy: rnd(-2.5, 2.5), drag: .94, life: rnd(10, 16), s0: rnd(10, 18), s1: rnd(26, 44), color: i ? '#e8f8ff' : '#bfe9ff', alpha: i ? .95 : .5 }); break;
      case 'burst':
        if (first) { this.ringAt(x, y + 110, 60, 330, '#bfe9ff', 14); this.flash(x, y + 110, 300, '#8fd6ff', 10); }
        for (let i = 0; i < 4; i++) { const a = rnd(0, TAU); this.emit({ tex: 'bubble', add: false, x, y: y + 110, vx: Math.cos(a) * rnd(4, 9), vy: Math.sin(a) * rnd(4, 9), drag: .92, life: rnd(12, 20), s0: rnd(12, 20), s1: rnd(24, 36), color: '#e8f8ff' }); }
        break;
      case 'geyser': column(['#e8f8ff', '#bfe9ff', '#8fd6ff'], 'bubble'); column(['#bfe9ff', '#fff']); if (t % 2 === 0) this.emit({ tex: 'puff', x: bx, y: rnd(20, 60), vy: rnd(8, 14), life: 16, s0: 70, s1: 130, color: '#bfe9ff', alpha: .5 }); if (first) this.floorRing(bx, 50, 260, 16, '#bfe9ff'); break;
      case 'dive': this.emit({ tex: 'streak', x: x - d * 30, y: y + 150, life: 7, s0: 150, s1: 90, color: '#bfe9ff', alpha: .55, rot: d > 0 ? -.85 : Math.PI + .85 }); break;
      case 'slip': case 'weave': if (t % 2 === 0) this.emit({ tex: 'puff', add: false, x: x - d * 20, y: y + rnd(30, 150), life: 12, s0: 40, s1: 80, color: tint, alpha: .28 }); break;
      case 'tornado':
        for (let i = 0; i < 4; i++) {
          const a = t * .55 + i * TAU / 4, h = (t * 9 + i * 70) % 260, r = 60 + h * .32;
          this.emit({ tex: 'streak', x: bx + Math.cos(a) * r, y: 20 + h, z: Math.sin(a) * r * .5, life: 7, s0: 110, s1: 70, color: i % 2 ? '#ffe08a' : '#fff3c8', alpha: .8, rot: Math.cos(a) > 0 ? .25 : Math.PI - .25 });
        }
        if (t % 3 === 0) this.dust(bx, 2, 90, 60);
        break;
      case 'whip': if (first) this.emit({ tex: 'slash', x: bx, y: by, s0: bw * .9, s1: bw * 1.1, life: 8, color: '#ffe9a8', alpha: .5, rot: d > 0 ? 0 : Math.PI }); break;
      case 'grab': if (m.isSuper) { lines('#ffd98a'); trail(); } break;
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
      const s = r.s0 + (r.s1 - r.s0) * easeOut(k); r.mesh.scale.set(s, s * .62, 1); r.mesh.material.opacity = .8 * (1 - k);
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
