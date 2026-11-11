// 그리기 총괄. 3D 무대(gfx/stage)에 인형(gfx/puppet)을 세우고, 효과(gfx/fx)와 화면 정보(gfx/hud)를 얹는다.
// 캐릭터 조형은 gfx/chars*.js, 자세는 gfx/poses.js에 있다.
import * as THREE from '../vendor/three.module.js';
import { CHARS } from './data.js';
import { Stage } from './gfx/stage.js';
import { Puppet } from './gfx/puppet.js';
import { Fx } from './gfx/fx.js';
import { Hud } from './gfx/hud.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const pixelRatio = () => clamp(Math.min(innerWidth / 1280, innerHeight / 720) * (devicePixelRatio || 1), 1, 2);

// ── 초상 ──────────────────────────────────────────────
// 고르는 화면·대진 화면·체력 막대 옆 얼굴에 쓰는 그림. 본 무대 캔버스 한쪽에 한 번 그려서 떠 두고 다시 쓴다.
const PW = 560, PH = 580;
const portraits = new Map(), jobs = [];

function paint(canvas, image) {
  const c = canvas.getContext('2d'), k = Math.min(canvas.width / image.width, canvas.height / image.height), w = image.width * k, h = image.height * k;
  c.clearRect(0, 0, canvas.width, canvas.height);
  c.drawImage(image, (canvas.width - w) / 2, canvas.height - h, w, h);
}
export function drawPortrait(canvas, char, pose = 'idle') {
  const key = `${char.id}:${pose}`, ready = portraits.get(key);
  canvas.dataset.want = key;
  if (ready) return paint(canvas, ready);
  canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  jobs.push({ canvas, id: char.id, pose, key });
}
function portraitOf(id) {
  const key = `${id}:idle`, ready = portraits.get(key);
  if (!ready && !jobs.some(job => job.key === key && !job.canvas)) jobs.push({ id, pose: 'idle', key });
  return ready || null;
}

function dropPuppet(puppet) {
  puppet.root.removeFromParent();
  for (const material of puppet.flashers) material.dispose();
  for (const key in puppet.hoses) puppet.hoses[key].mesh.geometry.dispose();
}

export class Renderer {
  constructor(canvas, { debug = false } = {}) {
    const ratio = pixelRatio();
    this.stage = new Stage(canvas, { ratio }); this.stage.warm();
    this.fx = new Fx(this.stage);
    this.hud = new Hud(document.getElementById('hud'), this.stage, portraitOf);
    this.hud.debug = debug; this.hud.resize(ratio);
    this.puppets = [null, null]; this.sim = null;
    this.shake = 0; this.frame = 0; this.last = performance.now();
    this.warm = Object.keys(CHARS); this.warmAt = 60;
  }
  resize() { const ratio = pixelRatio(); this.stage.setRatio(ratio); this.hud.resize(ratio); }
  reset() { this.hud.reset(); this.fx.clear(); this.shake = 0; }

  onEvent(event) {
    this.fx.onEvent(event);
    const jolt = power => { this.shake = Math.max(this.shake, power); };
    switch (event.type) {
      case 'hit':
        jolt(event.ko ? 22 : event.heavy ? 11 : 5);
        if (event.ko) this.hud.flash = 14;
        // 서로 치고받을 때마다 뜨면 정신없으니 연속기 첫 타에만, 한 번에 하나만 띄운다.
        if (event.counter && event.combo <= 1 && !this.hud.texts.some(t => t.text === 'COUNTER')) this.hud.say('COUNTER', event.x, event.y - 40, '#ff8a3d', 34);
        break;
      case 'land': if (event.heavy) jolt(6); break;
      case 'slam': jolt(12); break;
      case 'super': jolt(8); break;
      case 'potion': this.hud.say('포션 +30%', event.x, event.y - 90, '#9dffb0', 70); break;
    }
  }

  // 초상용 작은 촬영장. 본 무대와 같은 반사 환경과 조명을 쓴다.
  studio() {
    if (this.booth) return this.booth;
    const scene = new THREE.Scene(), light = (color, power, x, y, z) => { const l = new THREE.DirectionalLight(color, power); l.position.set(x, y, z); scene.add(l); };
    scene.environment = this.stage.scene.environment; scene.environmentIntensity = this.stage.scene.environmentIntensity;
    scene.add(new THREE.HemisphereLight('#ffeef2', '#3a1a4a', 1.1));
    light('#fff2e2', 2.5, -380, 860, 820); light('#74e4ff', 2.4, -700, 520, -900); light('#ff8fb8', 1.9, 800, 380, -800);
    return this.booth = { scene, camera: new THREE.PerspectiveCamera(30, PW / PH, 20, 6000), box: new THREE.Box3(), v: new THREE.Vector3() };
  }
  shoot(id, pose) {
    const { scene, camera, box, v } = this.studio(), gl = this.stage.gl, ratio = gl.getPixelRatio(), puppet = new Puppet(id);
    puppet.update({ char: CHARS[id], side: 0, x: 640, y: 0, vx: 0, vy: 0, facing: 1, state: pose, t: 0, flash: 0, move: null }, 10);
    scene.add(puppet.root); puppet.root.updateWorldMatrix(true, true);
    // 보이는 조각의 꼭짓점을 하나하나 재서 몸 전체가 꼭 맞게 들어오는 틀을 잡는다.
    box.makeEmpty();
    puppet.root.traverseVisible(o => {
      if (!o.isMesh) return;
      const at = o.geometry.attributes.position;
      for (let i = 0; i < at.count; i += 3) box.expandByPoint(v.fromBufferAttribute(at, i).applyMatrix4(o.matrixWorld));
    });
    const cx = (box.min.x + box.max.x) / 2, cy = (box.min.y + box.max.y) / 2;
    const span = Math.max(box.max.y - box.min.y, (box.max.x - box.min.x) * PH / PW) * 1.16, d = span / 2 / Math.tan(15 * Math.PI / 180);
    camera.position.set(cx + d * .12, cy + d * .06, d); camera.lookAt(cx, cy, 0);
    gl.setViewport(0, 0, PW / ratio, PH / ratio); gl.setScissor(0, 0, PW / ratio, PH / ratio); gl.setScissorTest(true);
    gl.render(scene, camera);
    const out = document.createElement('canvas'); out.width = PW; out.height = PH;
    out.getContext('2d').drawImage(gl.domElement, 0, gl.domElement.height - PH, PW, PH, 0, 0, PW, PH);
    gl.setScissorTest(false); gl.setViewport(0, 0, 1280, 720);
    dropPuppet(puppet);
    return out;
  }
  // 밀린 초상을 그린다. 새로 찍는 건 한 프레임에 한 장까지만(몸통을 빚는 데 시간이 걸린다).
  portraitWork() {
    while (jobs.length) {
      const job = jobs.shift(), fresh = !portraits.has(job.key);
      if (job.canvas && job.canvas.dataset.want !== job.key) continue;
      if (fresh) portraits.set(job.key, this.shoot(job.id, job.pose));
      if (job.canvas) paint(job.canvas, portraits.get(job.key));
      if (fresh) return;
    }
    // 할 일이 없을 때 나머지 캐릭터를 하나씩 미리 빚어 둔다(경기 시작 때 멈칫하지 않게).
    if (this.warm.length && this.frame > this.warmAt) { this.warmAt = this.frame + 24; portraitOf(this.warm.shift()); }
  }

  draw(sim, o = {}) {
    const now = performance.now(), dt = clamp((now - this.last) / 16.667, 0, 3), stage = this.stage;
    this.last = now; this.frame += dt;
    this.portraitWork();

    stage.shakeX = (Math.random() - .5) * this.shake; stage.shakeY = (Math.random() - .5) * this.shake;
    this.shake *= .86 ** dt; if (this.shake < .4) this.shake = 0;
    if (sim) {
      const fresh = sim !== this.sim;
      if (fresh) stage.use(sim.arena || 'heart');
      sim.f.forEach((f, i) => {
        let puppet = this.puppets[i];
        if (!puppet || puppet.id !== f.char.id) {
          if (puppet) dropPuppet(puppet);
          puppet = this.puppets[i] = new Puppet(f.char.id); stage.scene.add(puppet.root);
        }
        if (fresh) puppet.P = null;
        puppet.root.visible = true; puppet.update(f, this.frame);
      });
      stage.follow(sim.f[0].x, sim.f[1].x, Math.max(-sim.f[0].y, -sim.f[1].y) + 230, fresh);
    } else {
      // 경기가 없는 화면: 빈 경기장을 천천히 훑는다.
      for (const puppet of this.puppets) if (puppet) puppet.root.visible = false;
      stage.view.w += (1280 - stage.view.w) * .05; stage.view.x = Math.sin(stage.time * .003) * 60; stage.aim();
    }
    this.sim = sim;
    stage.setDim(sim && sim.freeze > 0 ? 1 : 0);
    stage.flow(dt);
    this.fx.update(sim, dt);
    stage.render();
    this.hud.draw(sim, o, dt, this.frame);
  }
}
