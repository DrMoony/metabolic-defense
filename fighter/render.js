// 임시 그림. 캐릭터는 도형으로 그리고 팔다리는 동작 진행도에 맞춰 뻗는다. 실제 아트가 정해지면 이 파일만 바꾼다.
import { STAGE, TYPES } from './data.js';
import { grounded } from './sim.js';

const FLOOR = STAGE.floor, TAU = Math.PI * 2;
const lerp = (a, b, k) => a + (b - a) * k, mix = (p, q, k) => [lerp(p[0], q[0], k), lerp(p[1], q[1], k)];
const ease = k => 1 - (1 - k) * (1 - k);
const FONT = '"Apple SD Gothic Neo","Malgun Gothic",Inter,sans-serif';

const SHAPES = {
  heart: p => { p.moveTo(0, .95); p.bezierCurveTo(-1.35, .05, -1, -1.1, 0, -.5); p.bezierCurveTo(1, -1.1, 1.35, .05, 0, .95); },
  kidney: p => { p.moveTo(.15, -1); p.bezierCurveTo(1.05, -1, 1.05, 1, .15, 1); p.bezierCurveTo(-.7, 1, -.95, .45, -.5, .12); p.bezierCurveTo(-.3, 0, -.3, -.05, -.5, -.15); p.bezierCurveTo(-.95, -.5, -.7, -1, .15, -1); },
  liver: p => { p.moveTo(-1, -.35); p.bezierCurveTo(-.8, -1, .75, -.95, 1, -.25); p.bezierCurveTo(1.1, .3, .5, .95, -.2, .9); p.bezierCurveTo(-.85, .85, -1.15, .3, -1, -.35); },
  pancreas: p => { p.moveTo(.1, -1); p.bezierCurveTo(.95, -1, 1, -.1, .6, .35); p.bezierCurveTo(.35, .65, .2, 1, -.25, .98); p.bezierCurveTo(-.75, .95, -.7, .4, -.5, 0); p.bezierCurveTo(-.9, -.5, -.6, -1, .1, -1); },
  soda: p => p.roundRect(-.72, -1, 1.44, 2, .22),
  fries: p => { p.moveTo(-.88, -.5); p.lineTo(.88, -.5); p.lineTo(.62, 1); p.lineTo(-.62, 1); p.closePath(); },
  ramen: p => { p.moveTo(-.95, -.55); p.lineTo(.95, -.55); p.lineTo(.6, 1); p.lineTo(-.6, 1); p.closePath(); },
  burger: p => p.roundRect(-1, -.9, 2, 1.85, .55),
};
const shapePath = id => { const path = new Path2D(); SHAPES[id](path); return path; };

function attackPose(P, f, crouch, airborne) {
  const m = f.move, t = f.t;
  const k = t <= m.startup ? ease(t / m.startup) : t <= m.startup + m.active ? 1 : 1 - ease(Math.min(1, (t - m.startup - m.active) / Math.max(1, m.recovery)));
  switch (m.pose) {
    case 'punch': P.hf = mix(P.hf, [122, -150], k); P.bx = 8 * k; P.rot = .06 * k; break;
    case 'punch2': P.hb = mix(P.hb, [138, -147], k); P.hf = mix(P.hf, [36, -120], k); P.bx = 16 * k; P.rot = .14 * k; break;
    case 'hook': P.hf = mix(P.hf, [112, -204], k); P.bx = 14 * k; P.by -= 10 * k; P.rot = .2 * k; break;
    case 'kick': P.ff = mix(P.ff, [152, -126], k); P.rot = -.2 * k; P.bx = -8 * k; P.hf = mix(P.hf, [30, -140], k); break;
    case 'cpunch': crouch(); P.hf = mix(P.hf, [122, -88], k); break;
    case 'sweep': crouch(); P.ff = mix(P.ff, [156, -18], k); P.rot = -.22 * k; break;
    case 'jpunch': airborne(); P.hf = mix(P.hf, [104, -102], k); P.rot = .25 * k; break;
    case 'jkick': airborne(); P.ff = mix(P.ff, [120, -56], k); P.rot = -.2 * k; break;
    case 'cast': if (!grounded(f)) airborne(); P.hf = mix(P.hf, [104, P.by - 14], k); P.hb = mix(P.hb, [96, P.by + 8], k); P.bx = lerp(-8, 10, k); break;
    case 'upper': P.hf = mix(P.hf, [40, -264], k); P.sy = 1 + .1 * k; P.rot = .12 * k; P.ff = [24, -12 * k]; break;
    case 'dash': P.rot = .4 * k; P.bx = 18 * k; P.hf = mix(P.hf, [106, -126], k); P.hb = mix(P.hb, [92, -100], k); P.fb = [-50, 0]; break;
    case 'super': { const alt = Math.floor(t / 3) % 2; P.hf = alt ? [140, -160] : [60, -120]; P.hb = alt ? [50, -110] : [134, -124]; P.rot = .15; P.bx = 12; break; }
    case 'throw': P.hf = mix(P.hf, [90, -150], k); P.hb = mix(P.hb, [86, -118], k); P.bx = 10 * k; break;
  }
}

function poseOf(f, frame) {
  const P = { bx: 0, by: -112, sx: 1, sy: 1, rot: 0, hf: [54, -128], hb: [24, -106], ff: [28, 0], fb: [-26, 0], eyes: 'open' };
  const bob = Math.sin(frame * .11 + f.side * 2) * 3;
  const crouch = () => Object.assign(P, { by: -72, sx: 1.1, sy: .8, hf: [52, -84], hb: [26, -66], ff: [40, 0], fb: [-40, 0] });
  const airborne = () => Object.assign(P, { by: -116, hf: [44, -150], hb: [-34, -146], ff: [22, -30], fb: [-24, -22] });
  switch (f.state) {
    case 'idle': P.by += bob; P.hf[1] += bob; P.hb[1] += bob; break;
    case 'walk': { const w = Math.sin(frame * .34); P.ff = [28 + w * 20, -Math.max(0, w) * 12]; P.fb = [-26 - w * 20, -Math.max(0, -w) * 12]; P.by -= Math.abs(w) * 4; break; }
    case 'crouch': crouch(); break;
    case 'prejump': P.by = -92; P.sy = .86; P.sx = 1.06; break;
    case 'jump': airborne(); P.rot = f.vx * f.facing * .02; break;
    case 'block': if (f.blockLow) crouch(); P.hf = [48, P.by - 38]; P.hb = [52, P.by + 4]; P.rot = -.07; P.bx = -6; break;
    case 'hit': P.rot = -.28; P.bx = -12; P.hf = [14, -156]; P.hb = [-42, -118]; P.eyes = 'shut'; break;
    case 'air': P.rot = -1.15; P.by = -96; P.hf = [-30, -150]; P.hb = [-58, -110]; P.ff = [52, -70]; P.fb = [30, -40]; P.eyes = 'shut'; break;
    case 'down': P.rot = -Math.PI / 2; P.by = -34; P.hf = [-70, -18]; P.hb = [-60, -8]; P.ff = [78, -10]; P.fb = [72, -4]; P.eyes = f.isKo ? 'ko' : 'shut'; break;
    case 'getup': { const k = ease(f.t / 16); P.rot = -Math.PI / 2 * (1 - k); P.by = lerp(-34, -112, k); break; }
    case 'win': P.hf = [34, -226 + bob]; P.hb = [-34, -226 - bob]; P.by += bob; P.eyes = 'happy'; break;
    case 'attack': attackPose(P, f, crouch, airborne); break;
  }
  return P;
}

function limb(c, from, to, color, width, end, glove) {
  const mx = (from[0] + to[0]) / 2, my = (from[1] + to[1]) / 2, bend = end === 'foot' ? 10 : 8;
  c.strokeStyle = '#1b0a14'; c.lineWidth = width + 6; c.lineCap = 'round';
  c.beginPath(); c.moveTo(...from); c.quadraticCurveTo(mx + (end === 'foot' ? bend : 0), my + (end === 'hand' ? bend : 0), ...to); c.stroke();
  c.strokeStyle = color; c.lineWidth = width; c.stroke();
  c.fillStyle = end === 'hand' ? glove : color; c.strokeStyle = '#1b0a14'; c.lineWidth = 3;
  c.beginPath();
  if (end === 'hand') c.arc(to[0], to[1], 15, 0, TAU); else c.ellipse(to[0] + 6, to[1] - 7, 21, 11, 0, 0, TAU);
  c.fill(); c.stroke();
}

function face(c, char, eyes) {
  const villain = char.kind === 'villain', ink = '#1b0a14';
  for (const ex of [.12, .56]) {
    c.lineWidth = .06; c.strokeStyle = ink; c.lineCap = 'round';
    if (eyes === 'open') {
      c.fillStyle = '#fff'; c.beginPath(); c.ellipse(ex, -.2, .15, .17, 0, 0, TAU); c.fill(); c.stroke();
      c.fillStyle = ink; c.beginPath(); c.arc(ex + .05, -.18, .075, 0, TAU); c.fill();
    } else if (eyes === 'ko') {
      c.beginPath(); c.moveTo(ex - .1, -.3); c.lineTo(ex + .1, -.1); c.moveTo(ex + .1, -.3); c.lineTo(ex - .1, -.1); c.stroke();
    } else if (eyes === 'happy') {
      c.beginPath(); c.arc(ex, -.15, .12, Math.PI, TAU); c.stroke();
    } else { c.beginPath(); c.moveTo(ex - .12, -.26); c.lineTo(ex + .08, -.2); c.lineTo(ex - .12, -.14); c.stroke(); }
    c.lineWidth = .07; c.beginPath();
    if (villain) { c.moveTo(ex - .17, -.5 + (ex < .3 ? 0 : .12)); c.lineTo(ex + .17, -.38 - (ex < .3 ? 0 : .12)); }
    else { c.moveTo(ex - .15, -.46); c.lineTo(ex + .15, -.44); }
    if (eyes === 'open') c.stroke();
  }
  c.lineWidth = .06; c.beginPath();
  if (eyes === 'happy') c.arc(.34, .1, .16, 0, Math.PI);
  else if (eyes === 'open') { if (villain) c.arc(.34, .28, .14, Math.PI * 1.1, Math.PI * 1.9); else c.arc(.34, .1, .1, .1, Math.PI - .1); }
  else c.arc(.34, .18, .08, 0, TAU);
  c.stroke();
}

// 몸통 위에 얹는 캐릭터별 장식(단위 좌표계).
function decorate(c, id, before) {
  const ink = '#1b0a14';
  if (before) {
    c.lineCap = 'round'; c.lineWidth = .06; c.strokeStyle = ink;
    if (id === 'heart') { c.fillStyle = '#c7304c'; for (const [x, w] of [[-.28, .26], [.12, .22]]) { c.beginPath(); c.roundRect(x, -1.12, w, .6, .08); c.fill(); c.stroke(); } }
    if (id === 'fries') { c.fillStyle = '#ffd35a'; for (const [x, top] of [[-.72, -1.15], [-.42, -1.35], [-.12, -1.2], [.18, -1.4], [.48, -1.18]]) { c.beginPath(); c.roundRect(x, top, .24, .9, .05); c.fill(); c.stroke(); } }
    if (id === 'ramen') { c.strokeStyle = '#ffe08a'; c.lineWidth = .12; c.beginPath(); for (let x = -.75; x < .75; x += .3) { c.moveTo(x, -.55); c.bezierCurveTo(x - .1, -.95, x + .35, -.75, x + .15, -1.1); } c.stroke(); }
    if (id === 'soda') { c.strokeStyle = '#fff'; c.lineWidth = .1; c.beginPath(); c.moveTo(.3, -.95); c.lineTo(.6, -1.45); c.stroke(); }
    return;
  }
  if (id === 'soda') { c.fillStyle = '#ffffffcc'; c.fillRect(-.72, .32, 1.44, .22); }
  if (id === 'fries') { c.fillStyle = '#ffd35a'; c.beginPath(); c.arc(0, .55, .22, 0, TAU); c.fill(); }
  if (id === 'ramen') { c.fillStyle = '#fff3d6'; c.fillRect(-.95, -.55, 1.9, .16); }
  if (id === 'burger') {
    for (const [y, h, color] of [[.0, .14, '#62b84a'], [.14, .3, '#6b3a1c'], [.44, .1, '#ffd35a']]) { c.fillStyle = color; c.fillRect(-1, y + .28, 2, h); }
    c.fillStyle = '#fff3d6'; for (const [x, y] of [[-.5, -.7], [0, -.78], [.5, -.68], [-.2, -.55]]) { c.beginPath(); c.ellipse(x, y, .07, .04, .4, 0, TAU); c.fill(); }
  }
  if (id === 'pancreas') { c.fillStyle = '#ffffff55'; for (const [x, y] of [[-.25, .45], [.1, .6], [-.2, .75]]) { c.beginPath(); c.arc(x, y, .07, 0, TAU); c.fill(); } }
  if (id === 'liver') { c.strokeStyle = '#1b0a1455'; c.lineWidth = .05; c.beginPath(); c.moveTo(-.25, -.85); c.quadraticCurveTo(-.4, 0, -.2, .88); c.stroke(); }
}

export function drawFighter(c, f, frame) {
  const P = poseOf(f, frame), char = f.char, size = char.boss ? 1.12 : 1;
  const body = f.flash > 0 ? '#fff' : char.color;
  c.save(); c.translate(f.x, FLOOR + f.y); c.scale(f.facing * size, size);
  const cos = Math.cos(P.rot), sin = Math.sin(P.rot);
  const at = (x, y) => [P.bx + x * cos - y * sin, P.by + x * sin + y * cos];
  limb(c, at(-16 * P.sx, 56 * P.sy), P.fb, char.dark, 18, 'foot');
  limb(c, at(-22 * P.sx, -22 * P.sy), P.hb, char.dark, 15, 'hand', char.glove);
  c.save(); c.translate(P.bx, P.by); c.rotate(P.rot); c.scale(58 * P.sx, 70 * P.sy);
  decorate(c, char.id, true);
  const path = shapePath(char.id), shade = c.createLinearGradient(-1, -1, 1, 1);
  shade.addColorStop(0, body); shade.addColorStop(1, f.flash > 0 ? '#fff' : char.dark);
  c.fillStyle = shade; c.fill(path);
  c.save(); c.clip(path); decorate(c, char.id, false); c.restore();
  c.lineWidth = .075; c.strokeStyle = '#1b0a14'; c.lineJoin = 'round'; c.stroke(path);
  face(c, char, P.eyes);
  c.restore();
  limb(c, at(16 * P.sx, 56 * P.sy), P.ff, char.dark, 18, 'foot');
  limb(c, at(20 * P.sx, -22 * P.sy), P.hf, char.color, 15, 'hand', char.glove);
  c.restore();
}

// 캐릭터 선택 화면용 초상.
export function drawPortrait(canvas, char) {
  const c = canvas.getContext('2d');
  c.clearRect(0, 0, canvas.width, canvas.height);
  c.save(); c.translate(canvas.width / 2 - 18, canvas.height - 26 - FLOOR); c.translate(0, 0);
  drawFighter(c, { char, x: 0, y: 0, vx: 0, vy: 0, facing: 1, state: 'idle', side: 0, flash: 0, t: 0 }, 0);
  c.restore();
}

export class Renderer {
  constructor(canvas, { debug = false } = {}) {
    this.canvas = canvas; this.c = canvas.getContext('2d'); this.debug = debug;
    this.particles = []; this.texts = []; this.shake = 0; this.flash = 0; this.lag = [1, 1]; this.frame = 0;
    this.backdrop = this.paintBackdrop();
  }

  paintBackdrop() {
    const off = document.createElement('canvas'); off.width = STAGE.w; off.height = STAGE.h;
    const c = off.getContext('2d'), sky = c.createLinearGradient(0, 0, 0, FLOOR);
    sky.addColorStop(0, '#1d0b19'); sky.addColorStop(.6, '#4a1a30'); sky.addColorStop(1, '#7a2a36');
    c.fillStyle = sky; c.fillRect(0, 0, STAGE.w, STAGE.h);
    // 멀리 보이는 혈관 벽과 떠다니는 혈구.
    c.lineCap = 'round';
    for (const [x, y, r, w, alpha] of [[200, 620, 420, 90, .22], [1050, 660, 480, 110, .2], [640, 760, 560, 70, .14]]) {
      c.strokeStyle = `rgba(214,84,90,${alpha})`; c.lineWidth = w; c.beginPath(); c.arc(x, y, r, Math.PI, TAU); c.stroke();
    }
    for (let i = 0; i < 26; i++) {
      const x = (i * 211) % STAGE.w, y = 90 + (i * 97) % 380, r = 10 + (i * 7) % 16;
      c.fillStyle = `rgba(255,120,120,${.05 + (i % 4) * .025})`; c.beginPath(); c.ellipse(x, y, r, r * .7, i, 0, TAU); c.fill();
    }
    const ground = c.createLinearGradient(0, FLOOR - 30, 0, STAGE.h);
    ground.addColorStop(0, '#8e3540'); ground.addColorStop(.12, '#5c1f30'); ground.addColorStop(1, '#210c1c');
    c.fillStyle = ground; c.fillRect(0, FLOOR - 30, STAGE.w, STAGE.h - FLOOR + 30);
    c.strokeStyle = '#ffe0a033'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, FLOOR - 30); c.lineTo(STAGE.w, FLOOR - 30); c.stroke();
    c.strokeStyle = '#ffffff0d';
    for (let i = -8; i <= 8; i++) { c.beginPath(); c.moveTo(640 + i * 70, FLOOR - 30); c.lineTo(640 + i * 190, STAGE.h); c.stroke(); }
    return off;
  }

  burst(x, y, count, colors, speed, size) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * TAU, v = speed * (.4 + Math.random() * .8);
      this.particles.push({ x, y, vx: Math.cos(angle) * v, vy: Math.sin(angle) * v - 1, life: 0, max: 14 + Math.random() * 12, color: colors[i % colors.length], size: size * (.6 + Math.random() * .8) });
    }
  }
  onEvent(event) {
    const x = event.x, y = FLOOR + (event.y || 0);
    switch (event.type) {
      case 'hit':
        this.burst(x, y, event.heavy ? 20 : 11, ['#fff6c8', '#ffd166', '#ff8a3d'], event.heavy ? 11 : 7, event.heavy ? 7 : 5);
        this.particles.push({ ring: true, x, y, life: 0, max: event.heavy ? 14 : 10, size: event.heavy ? 80 : 50, color: '#fff6c8' });
        this.shake = Math.max(this.shake, event.ko ? 22 : event.heavy ? 11 : 5);
        if (event.ko) this.flash = 14;
        if (event.counter) this.texts.push({ text: 'COUNTER', x, y: y - 40, life: 0, max: 46, color: '#ff8a3d' });
        break;
      case 'block': this.burst(x, y, 7, ['#d9f2ff', '#7cc8ff'], 5, 4); this.particles.push({ ring: true, x, y, life: 0, max: 8, size: 34, color: '#7cc8ff' }); break;
      case 'clash': this.burst(x, y, 16, ['#fff', '#ffd166', '#7cc8ff'], 8, 5); break;
      case 'fire': this.particles.push({ ring: true, x, y, life: 0, max: 10, size: 44, color: '#fff' }); break;
      case 'land': if (event.heavy) { this.burst(x, y, 9, ['#e9c9c0', '#b98a86'], 4, 7); this.shake = Math.max(this.shake, 6); } break;
      case 'potion': this.burst(x, y, 18, ['#9dffb0', '#d9ffe0', '#58d68d'], 5, 6); this.texts.push({ text: '포션 +30%', x, y: y - 90, life: 0, max: 70, color: '#9dffb0' }); break;
      case 'super': this.shake = Math.max(this.shake, 8); break;
    }
  }

  draw(sim, hud) {
    const c = this.c; this.frame++;
    c.save();
    if (this.shake > .5) { c.translate((Math.random() - .5) * this.shake, (Math.random() - .5) * this.shake); this.shake *= .86; }
    c.drawImage(this.backdrop, 0, 0);
    if (sim) this.drawWorld(sim);
    this.drawEffects();
    c.restore();
    if (this.flash > 0) { c.fillStyle = `rgba(255,255,255,${this.flash / 22})`; c.fillRect(0, 0, STAGE.w, STAGE.h); this.flash--; }
    if (hud?.dim) { c.fillStyle = `rgba(22,8,20,${hud.dim})`; c.fillRect(0, 0, STAGE.w, STAGE.h); }
    if (sim && hud?.bars) this.drawHud(sim, hud);
    if (hud?.banner) this.drawBanner(hud.banner);
  }

  drawWorld(sim) {
    const c = this.c, order = sim.f[0].state === 'attack' ? [1, 0] : [0, 1];
    if (sim.freeze > 0) { c.fillStyle = 'rgba(10,2,12,.62)'; c.fillRect(-40, -40, STAGE.w + 80, STAGE.h + 80); }
    for (const f of sim.f) {
      const lift = Math.min(1, -f.y / 260);
      c.fillStyle = `rgba(10,2,10,${.42 - lift * .2})`;
      c.beginPath(); c.ellipse(f.x, FLOOR + 4, 62 - lift * 20, 13 - lift * 4, 0, 0, TAU); c.fill();
    }
    for (const index of order) {
      const f = sim.f[index];
      if (f.state === 'attack' && (f.move.isSuper || sim.freeze > 0 && f.move.special)) {
        const glow = c.createRadialGradient(f.x, FLOOR + f.y - 110, 20, f.x, FLOOR + f.y - 110, 190);
        glow.addColorStop(0, '#ffe0a0aa'); glow.addColorStop(1, '#ffe0a000');
        c.fillStyle = glow; c.fillRect(f.x - 200, FLOOR + f.y - 310, 400, 400);
      }
      drawFighter(c, f, this.frame);
    }
    for (const shot of sim.shots) {
      const dir = Math.sign(shot.vx), r = shot.h / 2 + 6 + Math.sin(shot.age * .6) * 3;
      for (let i = 4; i >= 0; i--) {
        c.globalAlpha = i ? .16 : 1;
        const glow = c.createRadialGradient(shot.x - dir * i * 13, FLOOR + shot.y, 2, shot.x - dir * i * 13, FLOOR + shot.y, r * (1 + i * .12));
        glow.addColorStop(0, '#fff'); glow.addColorStop(.4, shot.color); glow.addColorStop(1, shot.color + '00');
        c.fillStyle = glow; c.beginPath(); c.ellipse(shot.x - dir * i * 13, FLOOR + shot.y, r * 1.25 * (1 + i * .12), r, 0, 0, TAU); c.fill();
      }
      c.globalAlpha = 1;
    }
    if (this.debug) {
      c.lineWidth = 2;
      for (const f of sim.f) {
        const hurt = sim.hurtBox(f); c.strokeStyle = '#59f'; c.strokeRect(hurt.x, FLOOR + hurt.y, hurt.w, hurt.h);
        if (f.state === 'attack' && f.move.box && f.t > f.move.startup && f.t <= f.move.startup + f.move.active) { const box = sim.hitBox(f); c.strokeStyle = '#f44'; c.strokeRect(box.x, FLOOR + box.y, box.w, box.h); }
      }
    }
  }

  drawEffects() {
    const c = this.c;
    for (const p of this.particles) {
      p.life++; const k = p.life / p.max;
      if (p.ring) { c.strokeStyle = p.color; c.globalAlpha = 1 - k; c.lineWidth = 6 * (1 - k) + 1; c.beginPath(); c.arc(p.x, p.y, p.size * ease(k), 0, TAU); c.stroke(); }
      else { p.x += p.vx; p.y += p.vy; p.vy += .35; p.vx *= .94; c.globalAlpha = 1 - k; c.fillStyle = p.color; c.beginPath(); c.arc(p.x, p.y, p.size * (1 - k * .6), 0, TAU); c.fill(); }
    }
    c.globalAlpha = 1;
    this.particles = this.particles.filter(p => p.life < p.max);
    c.textAlign = 'center'; c.font = `900 26px ${FONT}`;
    for (const t of this.texts) {
      t.life++; c.globalAlpha = Math.min(1, (t.max - t.life) / 14);
      c.lineWidth = 6; c.strokeStyle = '#1b0a14'; c.strokeText(t.text, t.x, t.y - t.life * .8); c.fillStyle = t.color; c.fillText(t.text, t.x, t.y - t.life * .8);
    }
    c.globalAlpha = 1;
    this.texts = this.texts.filter(t => t.life < t.max);
  }

  drawHud(sim, hud) {
    const c = this.c, W = 500, H = 28, Y = 44;
    sim.f.forEach((f, i) => {
      const ratio = f.hp / f.char.hp, left = i === 0, x0 = left ? 60 : STAGE.w - 60 - W;
      this.lag[i] = this.lag[i] < ratio ? ratio : Math.max(ratio, this.lag[i] - .004);
      c.fillStyle = '#1b0a14cc'; c.strokeStyle = '#ffe0a0'; c.lineWidth = 2;
      c.beginPath(); c.roundRect(x0 - 3, Y - 3, W + 6, H + 6, 4); c.fill(); c.stroke();
      // 체력은 화면 가운데 쪽부터 줄어든다.
      const bar = (value, color) => { const w = W * value; c.fillStyle = color; c.fillRect(left ? x0 + W - w : x0, Y, w, H); };
      bar(this.lag[i], '#e5484d');
      const fill = c.createLinearGradient(0, Y, 0, Y + H);
      fill.addColorStop(0, ratio < .3 ? '#ffb347' : '#fff0a8'); fill.addColorStop(1, ratio < .3 ? '#e2622b' : '#f1b836');
      bar(ratio, fill);
      c.textAlign = left ? 'left' : 'right'; const tx = left ? x0 : x0 + W;
      c.font = `800 22px ${FONT}`; c.fillStyle = '#fff3dd'; c.fillText(f.char.name, tx, Y + H + 28);
      const nameWidth = c.measureText(f.char.name).width, sign = left ? 1 : -1;
      c.font = `600 13px ${FONT}`; c.fillStyle = '#e0b789'; c.fillText(hud.labels[i], tx + sign * (nameWidth + 12), Y + H + 27);
      if (sim.adv[i] > 1) { c.fillStyle = '#9dffb0'; c.fillText(`상성 유리 (${TYPES[f.char.strong]})`, tx, Y + H + 48); }
      // 포션과 승리 표시.
      let px = left ? x0 + W - 14 : x0 + 14;
      for (let n = 0; n < (hud.winsNeeded || 0); n++) {
        c.beginPath(); c.arc(px, Y + H + 20, 8, 0, TAU); c.fillStyle = n < hud.wins[i] ? '#ffe0a0' : '#1b0a14aa'; c.fill(); c.strokeStyle = '#ffe0a0'; c.lineWidth = 2; c.stroke();
        px -= sign * 24;
      }
      if (f.potion) { c.font = `800 14px ${FONT}`; c.textAlign = left ? 'right' : 'left'; c.fillStyle = '#9dffb0'; c.fillText('포션 보유', px, Y + H + 25); }
      // 필살 게이지.
      const mw = 320, mx = left ? 60 : STAGE.w - 60 - mw, my = 676, full = f.meter >= 100;
      c.fillStyle = '#1b0a14cc'; c.fillRect(mx - 2, my - 2, mw + 4, 16);
      c.fillStyle = full ? (this.frame % 20 < 10 ? '#fff' : '#7cf0ff') : '#3fb6d9';
      const w = mw * f.meter / 100; c.fillRect(left ? mx : mx + mw - w, my, w, 12);
      c.font = `800 13px ${FONT}`; c.textAlign = left ? 'left' : 'right'; c.fillStyle = full ? '#fff' : '#9fd8e8';
      c.fillText(full ? '초필살기 준비 완료 (주먹+킥)' : 'SUPER', left ? mx : mx + mw, my - 8);
      if (f.comboShown > 0 && f.combo >= 2) {
        c.textAlign = left ? 'left' : 'right'; c.font = `900 44px ${FONT}`; c.lineWidth = 8; c.strokeStyle = '#1b0a14'; c.fillStyle = '#ffe0a0';
        c.strokeText(`${f.combo} HIT`, left ? 70 : STAGE.w - 70, 190); c.fillText(`${f.combo} HIT`, left ? 70 : STAGE.w - 70, 190);
      }
    });
    const seconds = Math.max(0, Math.ceil(sim.timer / 60));
    c.textAlign = 'center'; c.font = `900 46px ${FONT}`; c.lineWidth = 8; c.strokeStyle = '#1b0a14'; c.fillStyle = seconds <= 10 ? '#ff8a3d' : '#fff3dd';
    c.strokeText(seconds, STAGE.w / 2, 82); c.fillText(seconds, STAGE.w / 2, 82);
    if (hud.caption) { c.font = `700 14px ${FONT}`; c.fillStyle = '#e0b789'; c.fillText(hud.caption, STAGE.w / 2, 108); }
  }

  drawBanner({ text, sub, age }) {
    const c = this.c, k = ease(Math.min(1, age / 12)), scale = lerp(2.2, 1, k);
    c.save(); c.translate(STAGE.w / 2, 330); c.scale(scale, scale); c.globalAlpha = k; c.textAlign = 'center';
    c.font = `900 110px ${FONT}`; c.lineWidth = 16; c.strokeStyle = '#1b0a14'; c.lineJoin = 'round'; c.strokeText(text, 0, 0);
    const fill = c.createLinearGradient(0, -90, 0, 10); fill.addColorStop(0, '#fff7dc'); fill.addColorStop(1, '#ffb347');
    c.fillStyle = fill; c.fillText(text, 0, 0);
    if (sub) { c.font = `800 30px ${FONT}`; c.lineWidth = 8; c.strokeText(sub, 0, 58); c.fillStyle = '#fff3dd'; c.fillText(sub, 0, 58); }
    c.restore();
  }
}
