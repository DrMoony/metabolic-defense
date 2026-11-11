// 무대: 혈관 속 경기장. 렌더러·조명·환경 반사·배경·카메라를 한곳에서 관리한다.
// 좌표: 시뮬 x에서 640을 뺀 값이 월드 x, 바닥이 y=0, 화면 쪽이 +z. 1픽셀 = 1단위.
import * as THREE from '../../vendor/three.module.js';

const TAN_H = Math.tan(15 * Math.PI / 180) * 16 / 9;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const R = 1500, CY = 520;   // 혈관 반지름과 중심 높이

function canvasTexture(w, h, paint, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  paint(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
}
// 씨앗이 같은 난수(무대가 매번 같은 모습이도록).
function rng(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

export class Stage {
  constructor(canvas, { ratio = 1, shadows = true } = {}) {
    const gl = this.gl = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    gl.setPixelRatio(ratio); gl.setSize(1280, 720, false);
    gl.outputColorSpace = THREE.SRGBColorSpace; gl.toneMapping = THREE.NeutralToneMapping; gl.toneMappingExposure = 1.05;
    gl.shadowMap.enabled = shadows; gl.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#150a22');
    this.scene.fog = new THREE.Fog('#1d0d2e', 1900, 7200);
    this.camera = new THREE.PerspectiveCamera(30, 16 / 9, 60, 14000);
    this.view = { x: 0, w: 1280 }; this.time = 0; this.dim = 0; this.dimTo = 0;
    this.environment(); this.lights(); this.arena();
    this.aim(true);
  }

  // 반사용 환경: 어두운 자줏빛 돔에 밝은 조명판 몇 장. 몸통 광택에 맺힌다.
  environment() {
    const env = new THREE.Scene();
    const dome = canvasTexture(64, 256, (g, w, h) => {
      const grad = g.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#ffd9e2'); grad.addColorStop(.3, '#a5486c'); grad.addColorStop(.58, '#4a1838'); grad.addColorStop(1, '#16050f');
      g.fillStyle = grad; g.fillRect(0, 0, w, h);
    });
    env.add(new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), new THREE.MeshBasicMaterial({ map: dome, side: THREE.BackSide })));
    const panel = (color, power, w, h, x, y, z) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(power), side: THREE.DoubleSide }));
      m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m);
    };
    panel('#fff4e8', 9, 70, 40, -20, 80, 50);
    panel('#ffe7c9', 5, 30, 60, -85, 20, 40);
    panel('#7fe6ff', 7, 24, 80, -70, 30, -70);
    panel('#ff7ab0', 6, 24, 80, 80, 20, -60);
    const pmrem = new THREE.PMREMGenerator(this.gl);
    this.scene.environment = pmrem.fromScene(env, .03).texture;
    this.scene.environmentIntensity = .85;
    pmrem.dispose();
  }

  lights() {
    const s = this.scene;
    s.add(new THREE.HemisphereLight('#ffeef2', '#3a1a4a', 1.1));
    const key = this.key = new THREE.DirectionalLight('#fff2e2', 2.5);
    key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, { left: -820, right: 820, top: 560, bottom: -240, near: 100, far: 2600 });
    key.shadow.bias = -.0006; key.shadow.normalBias = 2.2; key.shadow.radius = 5; key.shadow.camera.updateProjectionMatrix();
    s.add(key, key.target);
    const rim = (color, power, x, y, z) => { const l = new THREE.DirectionalLight(color, power); l.position.set(x, y, z); s.add(l); return l; };
    rim('#74e4ff', 2.4, -700, 520, -900);
    rim('#ff8fb8', 1.9, 800, 380, -800);
  }

  arena() {
    const s = this.scene, rand = rng(7);
    // 바닥: 혈관 안쪽 세포가 깔린 젖은 바닥.
    const tiles = canvasTexture(512, 512, (g, w, h) => {
      g.fillStyle = '#1c0e2a'; g.fillRect(0, 0, w, h);
      const cols = 6, rows = 10, cw = w / cols, ch = h / rows;
      for (let j = 0; j < rows; j++) for (let i = -1; i <= cols; i++) {
        const x = i * cw + (j % 2 ? cw / 2 : 0), y = j * ch;
        g.fillStyle = `hsl(286 30% ${13 + rand() * 3}%)`;
        g.beginPath(); g.roundRect(x + 2, y + 2, cw - 4, ch - 4, 14); g.fill();
        const sheen = g.createLinearGradient(0, y, 0, y + ch); sheen.addColorStop(0, '#ffffff0a'); sheen.addColorStop(.5, '#ffffff00');
        g.fillStyle = sheen; g.beginPath(); g.roundRect(x + 2, y + 2, cw - 4, ch - 4, 14); g.fill();
      }
    }, [14, 19]);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(7000, 9600), new THREE.MeshStandardMaterial({ map: tiles, roughness: .3, metalness: .15, envMapIntensity: .8 }));
    floor.rotation.x = -Math.PI / 2; floor.position.z = -3300; floor.receiveShadow = true; s.add(floor);

    // 경기장 금빛 원.
    const ring = canvasTexture(1024, 1024, (g, w) => {
      const c = w / 2;
      const glow = g.createRadialGradient(c, c, 0, c, c, c); glow.addColorStop(0, '#ffcf7a30'); glow.addColorStop(.7, '#ff9a6a10'); glow.addColorStop(1, '#ff9a6a00');
      g.fillStyle = glow; g.fillRect(0, 0, w, w);
      g.strokeStyle = '#ffd98a'; g.lineWidth = 13; g.beginPath(); g.arc(c, c, c * .86, 0, 7); g.stroke();
      g.lineWidth = 4; g.globalAlpha = .8; g.beginPath(); g.arc(c, c, c * .8, 0, 7); g.stroke();
      g.globalAlpha = .6; g.setLineDash([26, 22]); g.lineWidth = 6; g.beginPath(); g.arc(c, c, c * .56, 0, 7); g.stroke();
    });
    const mark = new THREE.Mesh(new THREE.PlaneGeometry(1500, 1500), new THREE.MeshBasicMaterial({ map: ring, transparent: true, opacity: .8, depthWrite: false, blending: THREE.AdditiveBlending }));
    mark.rotation.x = -Math.PI / 2; mark.position.set(0, .6, -40); s.add(mark);

    // 혈관 벽: 멀리 뻗는 원통과 주름 고리.
    const wall = canvasTexture(512, 512, (g, w, h) => {
      g.fillStyle = '#44204f'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 90; i++) {
        const x = rand() * w, y = rand() * h, len = 80 + rand() * 220;
        g.strokeStyle = rand() < .5 ? '#6a3a7a55' : '#24102e66'; g.lineWidth = 3 + rand() * 9; g.lineCap = 'round';
        g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + 14, y + len * .3, x - 14, y + len * .6, x + 6, y + len); g.stroke();
      }
    }, [10, 8]);
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 9600, 56, 1, true), new THREE.MeshStandardMaterial({ map: wall, side: THREE.BackSide, roughness: .55, envMapIntensity: .5 }));
    tube.rotation.x = Math.PI / 2; tube.position.set(0, CY, -3300); s.add(tube);
    const ribMat = new THREE.MeshStandardMaterial({ color: '#6c3a82', roughness: .4, envMapIntensity: .8 });
    for (let i = 0; i < 9; i++) {
      const rib = new THREE.Mesh(new THREE.TorusGeometry(R - 16, 52, 12, 72), ribMat);
      rib.position.set(0, CY, -420 - i * 760); s.add(rib);
    }
    // 혈관 끝의 빛.
    const glowTex = canvasTexture(256, 256, (g, w) => {
      const grad = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      grad.addColorStop(0, '#fff1e0'); grad.addColorStop(.25, '#ffb08fcc'); grad.addColorStop(.6, '#ff5f8a44'); grad.addColorStop(1, '#ff5f8a00');
      g.fillStyle = grad; g.fillRect(0, 0, w, w);
    });
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(3800, 3800), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, fog: false, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.position.set(0, CY - 60, -7900); s.add(glow);

    // 떠다니는 적혈구.
    const profile = [];
    for (let i = 0; i <= 14; i++) { const a = i / 14 * Math.PI, x = Math.sin(a), y = -Math.cos(a); profile.push(new THREE.Vector2(x * (1 + .06 * Math.cos(a * 2)), y * (.18 + .2 * x * x))); }
    const cellGeo = new THREE.LatheGeometry(profile, 28);
    const cells = this.cells = new THREE.InstancedMesh(cellGeo, new THREE.MeshPhysicalMaterial({ color: '#c22f48', roughness: .42, clearcoat: .4, clearcoatRoughness: .3 }), 46);
    this.cellData = [];
    for (let i = 0; i < 46; i++) {
      const a = rand() * Math.PI * 2, rad = 420 + rand() * 900, z = -1300 - rand() * 5200;
      this.cellData.push({ x: Math.cos(a) * rad, y: Math.max(260, CY + Math.sin(a) * rad * .8), z, size: 40 + rand() * 44, rx: rand() * 6, ry: rand() * 6, spin: (.2 + rand() * .5) * (rand() < .5 ? -1 : 1), speed: .5 + rand() * .9 });
      if (rand() < .1) cells.setColorAt(i, new THREE.Color('#f3e6ee')); else cells.setColorAt(i, new THREE.Color('#ffffff'));
    }
    cells.frustumCulled = false; s.add(cells);

    // 초필살기 연출용 암막: 선수 뒤 배경과 바닥을 어둡게 덮는다.
    const shade = () => new THREE.MeshBasicMaterial({ color: '#0a020c', transparent: true, opacity: 0, depthWrite: false, fog: false });
    const curtain = new THREE.Mesh(new THREE.PlaneGeometry(9000, 5000), shade()); curtain.position.set(0, 1200, -60);
    const mat = new THREE.Mesh(new THREE.PlaneGeometry(9000, 3200), shade()); mat.rotation.x = -Math.PI / 2; mat.position.set(0, .4, 1540);
    curtain.visible = mat.visible = false; curtain.renderOrder = mat.renderOrder = 1; s.add(curtain, mat);
    this.shades = [curtain, mat];
    this.flow(0);
  }

  setRatio(ratio) { this.gl.setPixelRatio(ratio); this.gl.setSize(1280, 720, false); }
  // 0이면 평소, 1이면 배경이 어두워진다. 부드럽게 따라간다.
  setDim(k) { this.dimTo = k; }

  flow(dt) {
    const dummy = this.dummy || (this.dummy = new THREE.Object3D());
    this.time += dt;
    this.dim += (this.dimTo - this.dim) * Math.min(1, .25 * dt);
    for (const m of this.shades) { m.visible = this.dim > .01; m.material.opacity = this.dim * .62; }
    this.cellData.forEach((c, i) => {
      c.z += c.speed * dt; if (c.z > -1100) c.z -= 5400;
      dummy.position.set(c.x, c.y + Math.sin(this.time * .01 + i) * 14, c.z);
      dummy.rotation.set(c.rx + this.time * .006 * c.spin, c.ry + this.time * .004 * c.spin, 0);
      dummy.scale.setScalar(c.size); dummy.updateMatrix(); this.cells.setMatrixAt(i, dummy.matrix);
    });
    this.cells.instanceMatrix.needsUpdate = true;
  }

  // 두 선수가 화면에 다 들어오게 카메라를 맞춘다. ax·bx는 시뮬 x, top은 가장 높은 머리 높이.
  follow(ax, bx, top = 200, snap = false) {
    const need = clamp(Math.max(Math.abs(ax - bx) + 520, (top + 46) / .478), 800, 1280);
    const x = clamp((ax + bx) / 2 - 640, -640 + need / 2, 640 - need / 2);
    const v = this.view;
    if (snap) { v.w = need; v.x = x; } else { v.w += (need - v.w) * (need > v.w ? .16 : .05); v.x += (x - v.x) * .12; }
    this.aim();
  }
  aim() {
    const { x, w } = this.view, k = w / 1280, lookY = 252 * k, cam = this.camera;
    cam.position.set(x + (this.shakeX || 0), lookY + 64 * k + (this.shakeY || 0), w / (2 * TAN_H));
    cam.lookAt(x, lookY, 0);
    this.key.position.set(x - 380, 980, 820); this.key.target.position.set(x, 120, 0);
  }
  // 월드 좌표가 화면의 어느 픽셀에 찍히는지(HUD 글자 위치용).
  project(x, y, z = 0, out = [0, 0]) {
    const v = (this.tmp || (this.tmp = new THREE.Vector3())).set(x, y, z).project(this.camera);
    out[0] = (v.x + 1) * 640; out[1] = (1 - v.y) * 360;
    return out;
  }
  render() { this.gl.render(this.scene, this.camera); }
}
