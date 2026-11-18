// Serve the repository root, then open /fighter/tests/visual.html. No packages.
// Uses production GLB assets, puppet geometry, physics, camera and WebGL renderer.
import * as THREE from '../../vendor/three.module.js';
import { CHARS } from '../data.js';
import { Sim } from '../sim.js';
import { Puppet } from '../gfx/puppet.js';
import { Renderer } from '../render.js';

const results = [], failures = [], N = { x: 0, y: 0 }, point = new THREE.Vector3();
const renderer = new Renderer(document.getElementById('game')); renderer.warm = [];
const display = () => document.getElementById('results').textContent = results.join('\n');
const check = (condition, message) => { if (!condition) failures.push(message); };
const yieldFrame = () => new Promise(resolve => requestAnimationFrame(resolve));
const dispose = puppet => {
  puppet.root.removeFromParent(); puppet.flashers.forEach(m => m.dispose());
  Object.values(puppet.hoses).forEach(h => h.mesh.geometry.dispose());
  for (const geometry of puppet.owned || []) geometry.dispose();
};

function floorContacts() {
  let count = 0, worst = 0;
  for (const char of Object.values(CHARS)) for (const facing of [-1, 1]) {
    const puppet = new Puppet(char.id), f = new Sim(char, CHARS.heart).f[0]; f.facing = facing;
    for (const [state, frames] of [['idle', 12], ['down', 35], ['getup', 17], ['idle', 20]]) {
      f.state = state;
      for (let t = 0; t < frames; t++) {
        f.t = t; const before = JSON.stringify(f); puppet.update(f, t + 20);
        check(JSON.stringify(f) === before, `${char.id}: rendering changed simulation state`);
        if (state === 'down' || state === 'getup') {
          const min = puppet.getBounds(true).min.y; worst = Math.min(worst, min); count++;
          check(min >= -.001, `${char.id} ${facing} ${state}@${t}: floor penetration ${min}`);
        }
      }
    }
    dispose(puppet);
  }
  results.push(`Floor: ${count} down/recovery frames, worst y=${worst.toFixed(6)}`); display();
}

function jabReach() {
  const deltas = [];
  for (const facing of [-1, 1]) {
    const p = new Puppet('visceral'), s = new Sim(CHARS.visceral, CHARS.heart), f = s.f[0]; f.facing = facing;
    for (let t = 0; t < 30; t++) p.update(f, t + 20);
    p.root.updateWorldMatrix(true, true); const idle = p.hands.hf.getWorldPosition(new THREE.Vector3());
    s.start(f, 'jab');
    for (let t = 0; t <= 9; t++) { f.t = t; p.update(f, t + 50); }
    p.root.updateWorldMatrix(true, true); const hit = p.hands.hf.getWorldPosition(new THREE.Vector3());
    const delta = (hit.x - idle.x) * facing; deltas.push(delta);
    check(delta > 40, `Visceral jab ${facing}: hand only advanced ${delta}`);
    // A fist cannot telegraph a hit beyond the real attack range.
    const hitbox = s.hitBox(f), tip = hit.x + 640;
    check(tip >= hitbox.x - 40 && tip <= hitbox.x + hitbox.w + 40, `Visceral jab ${facing}: fist outside hitbox`);
    dispose(p);
  }
  results.push(`Jab: forward hand travel ${deltas.map(x => x.toFixed(1)).join(' / ')} world units`); display();
}

function assertFramed(label) {
  renderer.stage.camera.updateMatrixWorld(true);
  for (const p of renderer.puppets) {
    if (!p.root.visible) continue;
    const box = p.getBounds();
    for (const x of [box.min.x, box.max.x]) for (const y of [Math.max(0, box.min.y), Math.max(0, box.max.y)]) for (const z of [box.min.z, box.max.z]) {
      point.set(x, y, z).project(renderer.stage.camera);
      const sx = (point.x + 1) * 640, sy = (1 - point.y) * 360;
      check(Number.isFinite(sx + sy), `${label}: invalid projection`);
      check(sx >= 20 && sx <= 1260 && sy >= 110 && sy <= 653, `${label}: outside HUD-safe frame (${sx.toFixed(1)},${sy.toFixed(1)})`);
    }
  }
  check(renderer.stage.view.w < 4096, `${label}: runaway camera zoom`);
}

async function cameraCoverage() {
  let frames = 0;
  for (const char of Object.values(CHARS)) {
    for (const side of [0, 1]) for (const key of new Set(char.commands.map(c => c.key))) {
      const s = new Sim(side ? CHARS.heart : char, side ? char : CHARS.heart), f = s.f[side], m = char.moves[key];
      s.live = true; if (m.air) { f.y = -100; f.vy = -5; }
      s.start(f, key); renderer.reset(); let elapsed = 0;
      for (const stop of [m.startup + 2, m.startup + 13]) {
        while (elapsed < stop) { const tick = s.tick; s.step([N, N]); if (s.tick !== tick) elapsed++; }
        renderer.last = performance.now(); renderer.draw(s); assertFramed(`${char.id}/${key}/${side}@${elapsed}`); frames++;
      }
    }
    results.push(`Camera: ${char.id} left/right specials passed`); display(); await yieldFrame();
  }
  // Continuous production rendering catches camera lag that isolated poses miss.
  const s = new Sim(CHARS.heart, CHARS.visceral); s.live = true; s.start(s.f[0], 'upper');
  renderer.reset();
  for (let i = 0; i < 55; i++) { s.step([N, N]); renderer.last = performance.now() - 16.667; renderer.draw(s); assertFramed(`heart/upper/frame${i}`); frames++; }
  // Both stage edges and both fighters airborne.
  for (const side of [0, 1]) {
    const s = new Sim(CHARS.visceral, CHARS.burger); s.f[0].x = 70; s.f[1].x = 1210;
    for (const f of s.f) { f.state = 'jump'; f.y = -240; f.facing = side ? -f.facing : f.facing; }
    renderer.last = performance.now(); renderer.draw(s); assertFramed(`stage edges/${side}`); frames++;
  }
  const widths = [], held = new Sim(CHARS.heart, CHARS.visceral);
  held.f[0].y = -180; held.f[0].state = 'jump';
  for (let i = 0; i < 50; i++) { renderer.last = performance.now(); renderer.draw(held); if (i > 30) widths.push(renderer.stage.view.w); }
  check(Math.max(...widths) - Math.min(...widths) < 1, 'Held airborne pose causes camera zoom pulsing');
  results.push(`Camera: ${frames} projected frames including continuous upper and stage edges`); display();
}

window.VISUAL = {
  renderer, results, failures, done: false,
  show(a, b, state, t = 20) {
    const s = new Sim(CHARS[a], CHARS[b]); s.live = true;
    for (const f of s.f) {
      if (state in f.char.moves) { s.start(f, state); f.t = t; }
      else Object.assign(f, { state, t, isKo: state === 'down' });
    }
    renderer.reset(); renderer.last = performance.now(); renderer.draw(s, { bars: true, labels: ['1P', '2P'] }); return s;
  },
};
try {
  floorContacts(); jabReach(); await yieldFrame(); await cameraCoverage();
  const html = await (await fetch('../index.html')).text();
  check(html.includes('4연전, 장기나 빌런으로') && !html.includes('3연전'), 'Arcade round count is stale');
  results.push(failures.length ? `FAIL (${failures.length}):\n${failures.slice(0, 20).join('\n')}` : 'ALL VISUAL REGRESSIONS PASSED');
} catch (error) { failures.push(error.stack); results.push(error.stack); }
window.VISUAL.done = true; display();
