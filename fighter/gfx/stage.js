// 무대: 그려 둔 배경 그림을 기준 카메라에서 바닥·뒷벽에 비춰 입히고, 그 위에 선수·그림자·떠다니는 빛을 올린다.
// 렌더러·조명·환경 반사·카메라를 한곳에서 관리한다.
// 좌표: 시뮬 x에서 640을 뺀 값이 월드 x, 바닥이 y=0, 화면 쪽이 +z. 1픽셀 = 1단위.
import * as THREE from '../../vendor/three.module.js';
import { Post } from './post.js';
import { COMIC, setView } from './comic.js';

const TAN_V = Math.tan(15 * Math.PI / 180), TAN_H = TAN_V * 16 / 9;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
// 그림은 "가장 넓게 잡은 경기 화면"보다 가장자리가 이만큼 더 넓다고 본다(화면 흔들림 여유).
const MARGIN = 1.04;
const ASSETS = new URL('../assets/', import.meta.url).href;

// floor: 그림에서 바닥 먼 쪽 끝 선의 높이(위에서부터 비율). 여기서 뒷벽까지 거리가 정해진다.
// gain·calm: 배경 밝기 배율과 채도를 빼는 정도(밝은 무대일수록 더 가라앉힌다). gloss: 바닥에 선수가 비치는 정도.
// key·rims: [색, 세기, 위치]. hemi: [하늘, 땅, 세기]. motes: 떠다니는 빛 알갱이.
export const STAGES = {
  heart: {
    name: '하트 콜로세움', image: 'stage_heart.jpg', floor: .697, dark: '#03061a', shadow: ['#040a2c', .5], gloss: .3,
    hemi: ['#eaf0ff', '#22357a', 1.1], key: ['#fff4e2', 2.5, [-380, 980, 820]],
    rims: [['#7fd8ff', 2.2, [-700, 520, -900]], ['#ffd07a', 1.9, [800, 420, -800]]],
    motes: { colors: ['#ffe29a', '#a9c8ff', '#ffffff'], count: 90, size: [5, 13], rise: [.15, .5], drift: .12 },
    beams: { color: '#dfe9ff', xs: [-620, -210, 240, 660], power: .1 },
  },
  kidney: {
    name: '아쿠아 돔', image: 'stage_kidney.jpg', floor: .692, gain: .74, calm: .2, dark: '#03101a', shadow: ['#06283a', .42],
    hemi: ['#e9fbff', '#2a6a82', 1.15], key: ['#f4ffff', 2.4, [-300, 1000, 800]],
    rims: [['#6ff3ff', 2.4, [-700, 520, -900]], ['#ff9c8a', 1.6, [800, 380, -800]]],
    motes: { colors: ['#c8fbff', '#ffffff', '#8fe9ff'], count: 80, size: [6, 18], rise: [.3, .9], drift: .2, ring: true },
    beams: { color: '#d8fbff', xs: [-420, -60, 330], power: .09 },
  },
  liver: {
    name: '아이언 웍스', image: 'stage_liver.jpg', floor: .696, dark: '#120603', shadow: ['#1c0703', .55], gloss: .18,
    hemi: ['#ffdcc0', '#4a1414', .95], key: ['#ffe2bd', 2.4, [-420, 940, 820]],
    rims: [['#ffa040', 2.6, [-300, 420, -900]], ['#c8ff5a', 1.5, [820, 420, -760]]],
    motes: { colors: ['#ffb14a', '#ff7a2a', '#ffe08a'], count: 110, size: [3, 8], rise: [.5, 1.6], drift: .35 },
  },
  pancreas: {
    name: '인슐린 랩', image: 'stage_lab.jpg', floor: .69, gain: .78, calm: .16, dark: '#0c0a14', shadow: ['#2a2240', .38],
    hemi: ['#fffdf2', '#6a5c8a', 1.2], key: ['#fffaf0', 2.3, [-360, 1000, 820]],
    rims: [['#b9a2ff', 2.0, [-700, 520, -900]], ['#8affd9', 1.6, [800, 380, -800]]],
    motes: { colors: ['#fff1b0', '#cdbdff', '#aaffe0'], count: 70, size: [5, 12], rise: [.1, .35], drift: .15 },
    beams: { color: '#fff6d8', xs: [-520, 0, 520], power: .07 },
  },
  // 2026-11-13 근육의 홈(파워 짐)과 최종 보스 내장지방의 홈(뱃속 심연).
  gym: {
    name: '파워 짐', image: 'stage_gym.jpg', floor: .668, gain: .86, calm: .1, dark: '#07061a', shadow: ['#0a0a2c', .52], gloss: .32,
    hemi: ['#fff1dc', '#2a2a6a', 1.05], key: ['#ffe6c0', 2.5, [-380, 980, 820]],
    rims: [['#ffc46a', 2.4, [-700, 520, -900]], ['#8aa0ff', 1.8, [800, 420, -800]]],
    motes: { colors: ['#ffe29a', '#ffd0a0', '#ffffff'], count: 80, size: [4, 10], rise: [.2, .6], drift: .15 },
    beams: { color: '#ffe8c0', xs: [-560, -180, 200, 580], power: .1 },
  },
  belly: {
    name: '뱃속 심연', image: 'stage_belly.jpg', floor: .684, gain: .9, dark: '#0a0412', shadow: ['#14061e', .58], gloss: .34,
    hemi: ['#e8d8ff', '#3a1a4a', .95], key: ['#fff0d8', 2.3, [-380, 980, 820]],
    rims: [['#b6ff4a', 2.4, [-700, 420, -900]], ['#c07aff', 2.2, [800, 420, -800]]],
    motes: { colors: ['#ffe27a', '#c8ff6a', '#e8c8ff'], count: 90, size: [4, 12], rise: [-.3, -.1], drift: .12 },
  },
  alley: {
    name: '야식 골목', image: 'stage_alley.jpg', floor: .692, dark: '#04030c', shadow: ['#02020a', .55], gloss: .34,
    hemi: ['#b8c8ff', '#3a1a4a', .9], key: ['#ffe6d0', 2.0, [-380, 980, 820]],
    rims: [['#ff5fc8', 2.6, [-700, 420, -900]], ['#4fe8ff', 2.4, [800, 420, -800]]],
    motes: { colors: ['#ffd27a', '#ff8ad0', '#7fe9ff'], count: 60, size: [4, 10], rise: [.05, .25], drift: .25 },
    rain: 150,
  },
};

function canvasTexture(w, h, paint) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  paint(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
// 씨앗이 같은 난수(무대가 매번 같은 모습이도록).
function rng(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

// 기준 카메라에서 본 그림을 월드 좌표에 그대로 비추는 재질. 색은 그림 그대로 나온다.
const PLATE_VERT = `
uniform mat4 uRef; varying vec4 vRef;
void main() { vec4 w = modelMatrix * vec4(position, 1.); vRef = uRef * w; gl_Position = projectionMatrix * viewMatrix * w; }`;
const PLATE_FRAG = `
uniform sampler2D map; uniform float uDim, uGain, uCalm, uComic, uDot; uniform vec2 uPx; uniform vec3 uDark; varying vec4 vRef;
float lum(vec3 c) { return dot(c, vec3(.2126, .7152, .0722)); }
float at(vec2 uv, float x, float y) { return sqrt(lum(texture2D(map, uv + uPx * vec2(x, y)).rgb)); }
void main() {
  vec2 uv = clamp(vRef.xy / vRef.w * .5 + .5, 0., 1.);
  vec3 c = texture2D(map, uv).rgb;
  // 만화풍: 밝기를 몇 단으로 끊고, 어두운 곳에 인쇄 망점을 찍고, 밝기가 확 바뀌는 경계에 먹선을 넣는다.
  if (uComic > 0.) {
    float tl = at(uv, -1., 1.), t = at(uv, 0., 1.), tr = at(uv, 1., 1.), l = at(uv, -1., 0.), r = at(uv, 1., 0.), bl = at(uv, -1., -1.), b = at(uv, 0., -1.), br = at(uv, 1., -1.);
    float edge = length(vec2(tr + 2. * r + br - tl - 2. * l - bl, tl + 2. * t + tr - bl - 2. * b - br));
    float y = lum(c), v = sqrt(y), q = floor(v * 5. + .5) / 5.;
    c *= mix(1., q * q / max(y, .002), .65);
    c = max(mix(vec3(lum(c)), c, 1.25), 0.);
    vec2 p = mat2(.7071, -.7071, .7071, .7071) * gl_FragCoord.xy / uDot, cell = fract(p) - .5;
    float radius = clamp((.6 - v) * 1.05, 0., .62), dots = 1. - smoothstep(radius - .07, radius + .07, length(cell));
    c *= 1. - dots * .5;
    c *= 1. - smoothstep(.16, .34, edge) * .85;
  }
  // 선수가 묻히지 않게 배경을 조금 가라앉힌다(밝기·채도), 화면 가장자리는 살짝 더.
  c = mix(c, vec3(dot(c, vec3(.2126, .7152, .0722))), uCalm) * uGain * (1. - .22 * smoothstep(.3, .75, length(uv - vec2(.5, .56))));
  c = mix(c, c * .14 + uDark, uDim);
  gl_FragColor = vec4(c, 1.);
  #include <colorspace_fragment>
}`;

export class Stage {
  constructor(canvas, { ratio = 1, shadows = true, stage = 'heart' } = {}) {
    const gl = this.gl = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    gl.setPixelRatio(ratio); gl.setSize(1280, 720, false);
    gl.outputColorSpace = THREE.SRGBColorSpace; gl.toneMapping = THREE.NeutralToneMapping; gl.toneMappingExposure = 1.05;
    gl.shadowMap.enabled = shadows; gl.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0d0612');
    this.camera = new THREE.PerspectiveCamera(30, 16 / 9, 60, 14000);
    this.view = { x: 0, w: 1280 }; this.time = 0; this.dim = 0; this.dimTo = 0;
    this.plates = new Map(); this.id = null; this.want = null;
    // 그림을 찍은 것으로 치는 기준 카메라: 가장 넓게 잡은 경기 화면과 같은 자리, 시야만 여유만큼 넓다.
    const ref = this.ref = new THREE.PerspectiveCamera(Math.atan(TAN_V * MARGIN) * 360 / Math.PI, 16 / 9, 60, 14000);
    ref.position.set(0, 316, 640 / TAN_H); ref.lookAt(0, 252, 0); ref.updateMatrixWorld(); ref.updateProjectionMatrix();
    this.refMatrix = new THREE.Matrix4().multiplyMatrices(ref.projectionMatrix, ref.matrixWorldInverse);
    this.environment(null); this.lights(); this.arena(); this.fitInk(ratio);
    this.post = new Post(gl); this.post.on = !/[?&]post=0/.test(location.search);
    this.aim(true);
    this.use(stage);
  }

  // 반사용 환경: 배경 그림을 둥글게 두르고 밝은 조명판 몇 장을 띄운다. 몸통 광택에 무대 색이 맺힌다.
  environment(plate, look) {
    const env = new THREE.Scene();
    let dome;
    if (plate) {
      dome = plate.clone(); dome.wrapS = THREE.MirroredRepeatWrapping; dome.repeat.set(2, 1); dome.offset.set(.25, 0); dome.needsUpdate = true;
    } else {
      dome = canvasTexture(64, 256, (g, w, h) => {
        const grad = g.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#ffd9e2'); grad.addColorStop(.3, '#a5486c'); grad.addColorStop(.58, '#4a1838'); grad.addColorStop(1, '#16050f');
        g.fillStyle = grad; g.fillRect(0, 0, w, h);
      });
    }
    env.add(new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), new THREE.MeshBasicMaterial({ map: dome, side: THREE.BackSide })));
    const panel = (color, power, w, h, x, y, z) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(power), side: THREE.DoubleSide }));
      m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m);
    };
    const key = look ? look.key[0] : '#fff4e8', a = look ? look.rims[0][0] : '#7fe6ff', b = look ? look.rims[1][0] : '#ff7ab0';
    panel(key, 9, 70, 40, -20, 80, 50);
    panel(key, 4.5, 30, 60, -85, 20, 40);
    panel(a, 7, 24, 80, -70, 30, -70);
    panel(b, 6, 24, 80, 80, 20, -60);
    const pmrem = new THREE.PMREMGenerator(this.gl), old = this.scene.environment;
    this.scene.environment = pmrem.fromScene(env, .035).texture;
    this.scene.environmentIntensity = .85;
    pmrem.dispose(); if (old) old.dispose(); if (plate) dome.dispose();
  }

  lights() {
    const s = this.scene;
    this.hemi = new THREE.HemisphereLight('#ffeef2', '#3a1a4a', 1.1); s.add(this.hemi);
    const key = this.key = new THREE.DirectionalLight('#fff2e2', 2.5);
    key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, { left: -820, right: 820, top: 560, bottom: -240, near: 100, far: 2600 });
    key.shadow.bias = -.0006; key.shadow.normalBias = 2.2; key.shadow.radius = 5; key.shadow.camera.updateProjectionMatrix();
    this.keyAt = [-380, 980, 820];
    s.add(key, key.target);
    const rim = (color, power, x, y, z) => { const l = new THREE.DirectionalLight(color, power); l.position.set(x, y, z); s.add(l); return l; };
    this.rims = [rim('#74e4ff', 2.4, -700, 520, -900), rim('#ff8fb8', 1.9, 800, 380, -800)];
  }

  arena() {
    const s = this.scene;
    // 그림을 입히는 바닥과 뒷벽. 뒷벽 자리는 무대마다 그림의 바닥 끝 선에 맞춰 옮긴다.
    const uniforms = this.plateUniforms = { uComic: { value: COMIC ? 1 : 0 }, uDot: { value: 5.5 }, uPx: { value: new THREE.Vector2(1 / 2048, 1 / 1152) }, map: { value: null }, uRef: { value: this.refMatrix }, uDim: { value: 0 }, uGain: { value: 1 }, uCalm: { value: 0 }, uDark: { value: new THREE.Color('#0a020c') } };
    const mat = this.plateMat = new THREE.ShaderMaterial({ uniforms, vertexShader: PLATE_VERT, fragmentShader: PLATE_FRAG, toneMapped: false, fog: false });
    const floor = this.floor = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat); floor.rotation.x = -Math.PI / 2;
    const wall = this.wall = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
    floor.frustumCulled = wall.frustumCulled = false; floor.visible = wall.visible = false; floor.renderOrder = wall.renderOrder = -2;
    s.add(floor, wall);
    // 선수 그림자만 받는 투명 판.
    const catcher = this.catcher = new THREE.Mesh(new THREE.PlaneGeometry(3200, 1500), new THREE.ShadowMaterial({ color: '#1a0410', opacity: .5 }));
    catcher.rotation.x = -Math.PI / 2; catcher.position.set(0, .5, -260); catcher.receiveShadow = true; catcher.renderOrder = -1; s.add(catcher);

    // 바닥에 비친 모습: 무대를 위아래로 뒤집어 한 번 더 그린 그림을 바닥 위에 엷게 깐다.
    this.mirrorRT = new THREE.WebGLRenderTarget(640, 360);
    const sheen = this.sheen = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
      uniforms: { tMap: { value: this.mirrorRT.texture }, uPx: { value: new THREE.Vector2(1 / 1280, 1 / 720) }, uPower: { value: .26 } },
      vertexShader: 'void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
      fragmentShader: `uniform sampler2D tMap; uniform vec2 uPx; uniform float uPower;
        void main() {
          vec2 uv = gl_FragCoord.xy * uPx, dx = vec2(uPx.x * 3., 0.), dy = vec2(0., uPx.y * 5.);
          vec4 c = texture2D(tMap, uv) * .36 + (texture2D(tMap, uv + dx) + texture2D(tMap, uv - dx) + texture2D(tMap, uv + dy) + texture2D(tMap, uv - dy)) * .16;
          gl_FragColor = vec4(c.rgb * uPower, c.a * uPower);
          #include <colorspace_fragment>
        }`,
      transparent: true, premultipliedAlpha: true, depthWrite: false, toneMapped: false, fog: false,
    }));
    sheen.rotation.x = -Math.PI / 2; sheen.frustumCulled = false; sheen.visible = false; sheen.renderOrder = -1.5; s.add(sheen);
    this.mirror = !/[?&]mirror=0/.test(location.search);

    // 떠다니는 빛 알갱이.
    const dot = canvasTexture(64, 64, (g, w) => {
      const grad = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      grad.addColorStop(0, '#ffffff'); grad.addColorStop(.25, '#ffffffb0'); grad.addColorStop(.6, '#ffffff30'); grad.addColorStop(1, '#ffffff00');
      g.fillStyle = grad; g.fillRect(0, 0, w, w);
    });
    const ring = canvasTexture(64, 64, (g, w) => {
      const c = w / 2;
      g.strokeStyle = '#ffffffd0'; g.lineWidth = 3.5; g.beginPath(); g.arc(c, c, c - 8, 0, 7); g.stroke();
      g.strokeStyle = '#ffffff'; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.arc(c, c, c - 15, 3.6, 4.6); g.stroke();
      const grad = g.createRadialGradient(c, c, 0, c, c, c - 8); grad.addColorStop(0, '#ffffff10'); grad.addColorStop(1, '#ffffff38');
      g.fillStyle = grad; g.beginPath(); g.arc(c, c, c - 8, 0, 7); g.fill();
    });
    this.moteTex = { dot, ring };
    const MAX = 140, geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX * 3), 3));
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(MAX * 3), 3));
    geo.setAttribute('size', new THREE.BufferAttribute(new Float32Array(MAX), 1));
    const moteMat = this.moteMat = new THREE.ShaderMaterial({
      uniforms: { map: { value: dot }, uScale: { value: 1 }, uFade: { value: 1 } },
      vertexShader: `attribute float size; attribute vec3 color; varying vec3 vColor; uniform float uScale;
        void main() { vColor = color; vec4 mv = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = size * uScale / -mv.z; }`,
      fragmentShader: `uniform sampler2D map; uniform float uFade; varying vec3 vColor;
        void main() {
          vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(vColor * t.rgb * t.a * uFade, 1.);
          #include <colorspace_fragment>
        }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    });
    this.motes = new THREE.Points(geo, moteMat); this.motes.frustumCulled = false; this.motes.visible = false; s.add(this.motes);
    this.moteData = [];

    // 위에서 내려오는 빛줄기.
    const beamTex = canvasTexture(64, 256, (g, w, h) => {
      const v = g.createLinearGradient(0, 0, 0, h); v.addColorStop(0, '#ffffff'); v.addColorStop(.7, '#ffffff50'); v.addColorStop(1, '#ffffff00');
      g.fillStyle = v; g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = 'destination-in';
      const hz = g.createLinearGradient(0, 0, w, 0); hz.addColorStop(0, '#ffffff00'); hz.addColorStop(.5, '#ffffff'); hz.addColorStop(1, '#ffffff00');
      g.fillStyle = hz; g.fillRect(0, 0, w, h);
    });
    this.beams = [];
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: beamTex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false }));
      m.visible = false; m.frustumCulled = false; s.add(m); this.beams.push(m);
    }

    // 비(야식 골목).
    const RAIN = 220, rg = new THREE.BufferGeometry();
    rg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(RAIN * 6), 3));
    this.rain = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: '#bfd8ff', transparent: true, opacity: .2, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    this.rain.frustumCulled = false; this.rain.visible = false; s.add(this.rain);
    this.rainData = [];
  }

  // 무대를 바꾼다. 그림을 다 받으면 그때 갈아 끼운다(그 전까지는 앞 무대가 그대로 보인다).
  use(id) {
    if (!STAGES[id]) id = 'heart';
    if (this.want === id) return this.ready;
    this.want = id;
    return this.ready = this.plate(id).then(t => { if (this.want === id) this.apply(id, t); }).catch(() => {});
  }
  plate(id) {
    let load = this.plates.get(id);
    if (!load) {
      load = new THREE.TextureLoader().loadAsync(ASSETS + STAGES[id].image).then(t => {
        t.colorSpace = THREE.SRGBColorSpace; t.generateMipmaps = false; t.minFilter = t.magFilter = THREE.LinearFilter;
        this.gl.initTexture(t); return t;
      });
      this.plates.set(id, load);
    }
    return load;
  }
  // 나머지 무대 그림을 미리 받아 둔다(경기 시작 때 앞 무대가 잠깐 비치지 않게).
  warm() { for (const id in STAGES) this.plate(id).catch(() => {}); }
  apply(id, plate) {
    const look = STAGES[id], rand = rng(11);
    this.id = id; this.look = look;
    // 그림의 바닥 끝 선을 기준 카메라에서 쏘아 바닥에 닿는 곳이 뒷벽 자리다.
    const ray = new THREE.Vector3(0, 1 - 2 * look.floor, .5).unproject(this.ref).sub(this.ref.position);
    const far = this.far = this.ref.position.z + ray.z * (-this.ref.position.y / ray.y);
    const near = 620, wide = 2 * (640 * MARGIN + (this.ref.position.z - far) * TAN_H * MARGIN) + 400;
    this.floor.scale.set(wide, near - far, 1); this.floor.position.set(0, 0, (near + far) / 2);
    this.wall.scale.set(wide, 1400, 1); this.wall.position.set(0, 700, far);
    this.floor.visible = this.wall.visible = true;
    this.sheen.scale.copy(this.floor.scale); this.sheen.position.set(0, .3, this.floor.position.z); this.sheen.visible = this.mirror; this.gloss = look.gloss ?? .26;
    this.plateUniforms.map.value = plate; this.plateUniforms.uPx.value.set(1.4 / plate.image.width, 1.4 / plate.image.height); this.plateUniforms.uDark.value.set(look.dark);
    this.plateUniforms.uGain.value = look.gain ?? .9; this.plateUniforms.uCalm.value = look.calm ?? .08;
    this.catcher.material.color.set(look.shadow[0]); this.catcher.material.opacity = this.shadowPower = look.shadow[1];
    this.catcher.position.z = (far + 420) / 2; this.catcher.scale.set(1, (420 - far) / 1500, 1);

    this.hemi.color.set(look.hemi[0]); this.hemi.groundColor.set(look.hemi[1]); this.hemi.intensity = look.hemi[2];
    this.key.color.set(look.key[0]); this.key.intensity = look.key[1]; this.keyAt = look.key[2];
    look.rims.forEach((r, i) => { this.rims[i].color.set(r[0]); this.rims[i].intensity = r[1]; this.rims[i].position.set(...r[2]); });
    this.environment(plate, look);

    // 빛 알갱이: 뒷벽 앞에서 화면 앞까지 흩어 놓는다.
    const m = look.motes, pos = this.motes.geometry.attributes.position, col = this.motes.geometry.attributes.color, size = this.motes.geometry.attributes.size, c = new THREE.Color();
    this.moteData = [];
    for (let i = 0; i < pos.count; i++) {
      const on = m && i < m.count;
      if (on) {
        const z = far + 40 + rand() * (300 - far), d = { x: (rand() * 2 - 1) * 1150, y: rand() * 760, z, vy: m.rise[0] + rand() * (m.rise[1] - m.rise[0]), sway: rand() * 6.3, drift: m.drift * (.5 + rand()) };
        this.moteData.push(d);
        c.set(m.colors[i % m.colors.length]).multiplyScalar(.35 + rand() * .5); col.setXYZ(i, c.r, c.g, c.b);
        size.setX(i, (m.size[0] + rand() * (m.size[1] - m.size[0])) * (z > 60 ? 1.8 : 1));
      } else { size.setX(i, 0); pos.setXYZ(i, 0, -999, 0); }
    }
    col.needsUpdate = size.needsUpdate = true;
    this.motes.visible = !!m; this.moteMat.uniforms.map.value = m && m.ring ? this.moteTex.ring : this.moteTex.dot;

    this.beams.forEach((b, i) => {
      const on = look.beams && i < look.beams.xs.length; b.visible = !!on; if (!on) return;
      b.material.color.set(look.beams.color); b.userData.power = look.beams.power; b.userData.phase = rand() * 6.3;
      b.scale.set(300 + rand() * 160, 900, 1); b.position.set(look.beams.xs[i], 470, far + 30 + i * 6); b.rotation.z = (rand() - .5) * .5;
    });

    this.rain.visible = !!look.rain; this.rainData = [];
    for (let i = 0; i < (look.rain || 0); i++) this.rainData.push({ x: (rand() * 2 - 1) * 1100, y: rand() * 800, z: far + 60 + rand() * (360 - far), v: 26 + rand() * 12 });
    this.rain.geometry.setDrawRange(0, (look.rain || 0) * 2);
    this.flow(0);
  }

  setRatio(ratio) { this.gl.setPixelRatio(ratio); this.gl.setSize(1280, 720, false); this.fitInk(ratio); }
  // 먹선 굵기와 망점 크기는 실제 화소 수를 따라간다.
  fitInk(ratio) { setView(1280 * ratio, 720 * ratio); if (this.plateUniforms) this.plateUniforms.uDot.value = 5.5 * ratio; }
  // 0이면 평소, 1이면 배경이 어두워진다. 부드럽게 따라간다.
  setDim(k) { this.dimTo = k; }

  flow(dt) {
    this.time += dt;
    this.dim += (this.dimTo - this.dim) * Math.min(1, .25 * dt);
    const lit = 1 - this.dim * .8, t = this.time;
    this.plateUniforms.uDim.value = this.dim * .86;
    this.catcher.material.opacity = (this.shadowPower || .5) * (1 - this.dim * .5);
    this.sheen.material.uniforms.uPower.value = (this.gloss || 0) * (1 - this.dim * .4);
    if (this.motes.visible) {
      const pos = this.motes.geometry.attributes.position;
      this.moteData.forEach((d, i) => {
        d.y += d.vy * dt; if (d.y > 780) d.y -= 800; else if (d.y < -20) d.y += 800;
        pos.setXYZ(i, d.x + Math.sin(t * .012 * d.drift + d.sway) * 40, d.y, d.z);
      });
      pos.needsUpdate = true;
      this.moteMat.uniforms.uScale.value = this.gl.getPixelRatio() * 720 / (2 * TAN_V); this.moteMat.uniforms.uFade.value = lit;
    }
    for (const b of this.beams) if (b.visible) b.material.opacity = b.userData.power * (.7 + .3 * Math.sin(t * .011 + b.userData.phase)) * lit;
    if (this.rain.visible) {
      const pos = this.rain.geometry.attributes.position;
      this.rainData.forEach((d, i) => {
        d.y -= d.v * dt; d.x -= d.v * .18 * dt; if (d.y < 0) { d.y += 800; d.x += 144; }
        pos.setXYZ(i * 2, d.x, d.y, d.z); pos.setXYZ(i * 2 + 1, d.x + 7, d.y + 40, d.z);
      });
      pos.needsUpdate = true; this.rain.material.opacity = .2 * lit;
    }
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
    const { x, w } = this.view, k = w / 1280, lookY = 252 * k, cam = this.camera, at = this.keyAt;
    cam.position.set(x + (this.shakeX || 0), lookY + 64 * k + (this.shakeY || 0), w / (2 * TAN_H));
    cam.lookAt(x, lookY, 0);
    this.key.position.set(x + at[0], at[1], at[2]); this.key.target.position.set(x, 120, 0);
  }
  // 월드 좌표가 화면의 어느 픽셀에 찍히는지(HUD 글자 위치용).
  project(x, y, z = 0, out = [0, 0]) {
    const v = (this.tmp || (this.tmp = new THREE.Vector3())).set(x, y, z).project(this.camera);
    out[0] = (v.x + 1) * 640; out[1] = (1 - v.y) * 360;
    return out;
  }
  // 바닥에 비칠 그림: 배경과 빛 알갱이는 빼고 선수와 기술 효과만 위아래로 뒤집어 그린다.
  reflect() {
    const gl = this.gl, s = this.scene, rt = this.mirrorRT, size = gl.getDrawingBufferSize(this.tmp2 || (this.tmp2 = new THREE.Vector2()));
    const w = Math.max(2, size.x >> 1), h = Math.max(2, size.y >> 1);
    if (rt.width !== w || rt.height !== h) rt.setSize(w, h);
    this.sheen.material.uniforms.uPx.value.set(1 / size.x, 1 / size.y);
    const hide = [this.floor, this.wall, this.catcher, this.sheen, this.motes, this.rain, ...this.beams], was = hide.map(o => o.visible);
    for (const o of hide) o.visible = false;
    const bg = s.background, auto = gl.shadowMap.autoUpdate;
    s.background = null; gl.shadowMap.autoUpdate = false;
    s.scale.y = -1; s.updateMatrixWorld(true);
    gl.setRenderTarget(rt); gl.render(s, this.camera); gl.setRenderTarget(null);
    s.scale.y = 1; s.updateMatrixWorld(true);
    s.background = bg; gl.shadowMap.autoUpdate = auto; hide.forEach((o, i) => { o.visible = was[i]; });
  }
  render(dt = 1) {
    if (this.mirror && this.sheen.visible && this.gloss > 0) this.reflect();
    this.gl.render(this.scene, this.camera); this.post.render(dt);
  }
}
