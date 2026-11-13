// 만화풍 효과 그림. 흰 속(core) · 진한 몸(body) · 어두운 테두리(edge) 세 겹으로 또렷하게 그린다.
// 색이 그림에 구워져 있어서 섞지 않고(일반 블렌딩) 그대로 찍는다. 같은 모양·색은 한 번만 그려서 돌려 쓴다.
import * as THREE from '../../vendor/three.module.js';
import { COMIC, INK } from './comic.js';

const TAU = Math.PI * 2;
const seeded = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const poly = (g, s, pts) => { g.beginPath(); for (const [x, y] of pts) g.lineTo(x * s, y * s); g.closePath(); };
const curve = (g, s, start, ...beziers) => { g.beginPath(); g.moveTo(start[0] * s, start[1] * s); for (const b of beziers) g.bezierCurveTo(...b.map(v => v * s)); g.closePath(); };

// 닫힌 도형: 테두리 → 몸 → (cx, cy)를 중심으로 줄인 속. 속은 몸 밖으로 못 나가게 오려 낸다.
function layers(g, s, pal, path, { edge = .045, core = .55, cx = .5, cy = .5 } = {}) {
  g.lineJoin = 'round';
  path(); g.strokeStyle = pal[2]; g.lineWidth = s * edge * 2; g.stroke(); g.fillStyle = pal[1]; g.fill();
  g.save(); path(); g.clip(); g.translate(s * cx, s * cy); g.scale(core, core); g.translate(-s * cx, -s * cy); path(); g.fillStyle = pal[0]; g.fill(); g.restore();
}
// 선: 테두리 → 몸 → 속을 굵기만 줄여 가며 겹쳐 긋는다.
function stroked(g, s, pal, path, w, { join = 'round', cap = 'round', edge = .028 } = {}) {
  g.lineCap = cap; g.lineJoin = join; g.miterLimit = 6;
  for (const [color, width] of [[pal[2], w + edge * 2], [pal[1], w], [pal[0], w * .36]]) { path(); g.strokeStyle = color; g.lineWidth = s * width; g.stroke(); }
}
// 초승달: 바깥 원호(중심 ox, 반지름 r, 반각 a)와 그 두 끝을 지나는 안쪽 원호(중심 ix).
function crescent(g, s, ox, r, a, ix) {
  const tx = ox + r * Math.cos(a), ty = r * Math.sin(a), ir = Math.hypot(tx - ix, ty), ia = Math.atan2(ty, tx - ix);
  g.beginPath(); g.arc(ox * s, s / 2, r * s, -a, a); g.arc(ix * s, s / 2, ir * s, ia, -ia, true); g.closePath();
}
const star = (n, outer, inner, turn = -Math.PI / 2) => Array.from({ length: n * 2 }, (_, i) => { const a = turn + i / (n * 2) * TAU, r = i % 2 ? inner : outer; return [.5 + Math.cos(a) * r, .5 + Math.sin(a) * r]; });
const BUMPS = [[.5, .56, .27], [.27, .6, .19], [.73, .6, .2], [.38, .37, .19], [.63, .36, .18], [.5, .74, .18]];

// 방향이 있는 그림은 오른쪽(+x)을 앞으로 그린다. 왼쪽을 볼 때는 돌리거나(rot) 뒤집어(flip) 쓴다.
const SHAPES = {
  // 베는 자국. 뒤에 옅은 꼬리가 남는다.
  arc: (g, s, pal) => {
    g.lineJoin = 'round';
    crescent(g, s, .4, .46, 1.2, -.3); g.globalAlpha = .32; g.fillStyle = pal[1]; g.fill(); g.globalAlpha = 1;
    crescent(g, s, .4, .46, 1.2, .014); g.strokeStyle = pal[2]; g.lineWidth = s * .045; g.stroke(); g.fillStyle = pal[1]; g.fill();
    crescent(g, s, .4, .445, 1.02, .2); g.fillStyle = pal[0]; g.fill();
  },
  // 뾰족한 타격 불꽃.
  burst: (g, s, pal) => {
    const R = seeded(11), n = 14, pts = [];
    for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * TAU + (R() - .5) * .1, r = i % 2 ? .16 + R() * .05 : .3 + R() * .165; pts.push([.5 + Math.cos(a) * r, .5 + Math.sin(a) * r]); }
    layers(g, s, pal, () => poly(g, s, pts), { edge: .026, core: .58 });
  },
  ring: (g, s, pal) => stroked(g, s, pal, () => { g.beginPath(); g.arc(s / 2, s / 2, s * .385, 0, TAU); }, .085),
  thin: (g, s, pal) => stroked(g, s, pal, () => { g.beginPath(); g.arc(s / 2, s / 2, s * .44, 0, TAU); }, .03, { edge: .012 }),
  // 소리 물결 한 조각.
  sonic: (g, s, pal) => stroked(g, s, pal, () => { g.beginPath(); g.arc(s * .02, s / 2, s * .78, -.5, .5); }, .08),
  bolt: (g, s, pal) => stroked(g, s, pal, () => {
    g.beginPath(); for (const [x, y] of [[.05, .52], [.2, .38], [.33, .6], [.5, .36], [.63, .62], [.79, .42], [.95, .5]]) g.lineTo(x * s, y * s);
    g.moveTo(s * .5, s * .36); g.lineTo(s * .6, s * .17); g.lineTo(s * .73, s * .24);
  }, .05, { join: 'miter', edge: .022 }),
  // 굵은 빛줄기와 가는 속도선, 바늘.
  lance: (g, s, pal) => layers(g, s, pal, () => poly(g, s, [[.04, .5], [.62, .375], [.96, .5], [.62, .625]]), { edge: .026, core: .56, cx: .66 }),
  line: (g, s, pal) => { poly(g, s, [[.02, .5], [.7, .456], [.98, .5], [.7, .544]]); g.fillStyle = pal[1]; g.fill(); poly(g, s, [[.34, .5], [.72, .48], [.95, .5], [.72, .52]]); g.fillStyle = pal[0]; g.fill(); },
  needle: (g, s, pal) => {
    poly(g, s, [[.02, .484], [.86, .468], [.98, .5], [.86, .532], [.02, .516]]); g.lineJoin = 'round'; g.strokeStyle = pal[2]; g.lineWidth = s * .026; g.stroke(); g.fillStyle = pal[1]; g.fill();
    poly(g, s, [[.2, .495], [.9, .489], [.97, .5], [.9, .511], [.2, .505]]); g.fillStyle = pal[0]; g.fill();
  },
  // 앞으로 미는 쐐기.
  cone: (g, s, pal) => layers(g, s, pal, () => poly(g, s, [[.08, .08], [.52, .3], [.95, .5], [.52, .7], [.08, .92], [.36, .5]]), { edge: .035, core: .52, cx: .66 }),
  flame: (g, s, pal) => layers(g, s, pal, () => curve(g, s, [.5, .96], [.14, .94, .1, .6, .3, .42], [.34, .56, .42, .56, .42, .44], [.4, .26, .5, .14, .6, .04], [.58, .24, .72, .3, .78, .46], [.9, .72, .8, .95, .5, .96]), { edge: .032, core: .56, cy: .9 }),
  // 거품·김 덩어리.
  cloud: (g, s, pal) => {
    const blobs = (grow, dx, dy, color, k = 1) => { g.fillStyle = color; for (const [x, y, r] of BUMPS) { g.beginPath(); g.arc((x + dx) * s, (y + dy) * s, (r * k + grow) * s, 0, TAU); g.fill(); } };
    blobs(.032, 0, 0, pal[2]); blobs(0, 0, 0, pal[1]); blobs(0, -.03, -.035, pal[0], .66);
  },
  // 앞으로 말려 넘어가는 물마루 옆모습.
  crest: (g, s, pal) => {
    layers(g, s, pal, () => curve(g, s, [.04, .96], [.3, .96, .56, .96, .82, .96], [.64, .88, .5, .7, .56, .48], [.61, .3, .8, .25, .9, .34], [.87, .12, .54, .05, .32, .23], [.12, .4, .08, .7, .04, .96]), { edge: .032, core: .52, cx: .3, cy: .96 });
    for (const [x, y, r] of [[.9, .34, .05], [.83, .2, .058], [.68, .115, .064], [.5, .105, .058], [.36, .19, .048]]) { g.beginPath(); g.arc(x * s, y * s, r * s, 0, TAU); g.fillStyle = pal[0]; g.fill(); g.strokeStyle = pal[2]; g.lineWidth = s * .012; g.stroke(); }
  },
  // 솟는 기둥. 꼭대기가 왕관처럼 갈라진다.
  pillar: (g, s, pal) => {
    const body = () => poly(g, s, [[.14, .98], [.3, .9], [.35, .6], [.31, .36], [.19, .17], [.36, .25], [.4, .07], [.47, .2], [.52, .02], [.57, .2], [.64, .09], [.66, .27], [.83, .15], [.7, .37], [.65, .6], [.7, .9], [.86, .98]]);
    g.lineJoin = 'round'; body(); g.strokeStyle = pal[2]; g.lineWidth = s * .05; g.stroke(); g.fillStyle = pal[1]; g.fill();
    g.save(); body(); g.clip();
    g.translate(s * .5, s * .98); g.scale(.46, .9); g.translate(-s * .5, -s * .98); body(); g.fillStyle = pal[0]; g.fill(); g.restore();
    g.save(); body(); g.clip(); g.globalAlpha = .4; g.strokeStyle = pal[2]; g.lineWidth = s * .012; g.lineCap = 'round';
    for (const [x, a, b] of [[.335, .42, .8], [.665, .5, .86], [.31, .2, .3], [.69, .2, .32]]) { g.beginPath(); g.moveTo(x * s, a * s); g.lineTo(x * s, b * s); g.stroke(); }
    g.restore();
  },
  rock: (g, s, pal) => {
    poly(g, s, [[.5, .07], [.87, .38], [.73, .9], [.28, .83], [.12, .4]]); g.lineJoin = 'round'; g.strokeStyle = pal[2]; g.lineWidth = s * .09; g.stroke(); g.fillStyle = pal[1]; g.fill();
    poly(g, s, [[.5, .07], [.12, .4], [.46, .46]]); g.fillStyle = pal[0]; g.fill();
    poly(g, s, [[.46, .46], [.87, .38], [.73, .9]]); g.globalAlpha = .4; g.fillStyle = pal[2]; g.fill(); g.globalAlpha = 1;
  },
  ecg: (g, s, pal) => stroked(g, s, pal, () => { g.beginPath(); for (const [x, y] of [[.03, .5], [.3, .5], [.36, .42], [.42, .5], [.46, .5], [.52, .12], [.6, .88], [.66, .5], [.74, .5], [.8, .4], [.86, .5], [.97, .5]]) g.lineTo(x * s, y * s); }, .04, { join: 'miter', edge: .02 }),
  plus: (g, s, pal) => layers(g, s, pal, () => poly(g, s, [[.37, .08], [.63, .08], [.63, .37], [.92, .37], [.92, .63], [.63, .63], [.63, .92], [.37, .92], [.37, .63], [.08, .63], [.08, .37], [.37, .37]]), { edge: .04, core: .56 }),
  hex: (g, s, pal) => {
    const path = () => { g.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + TAU / 12; g.lineTo(s * (.5 + Math.cos(a) * .39), s * (.5 + Math.sin(a) * .39)); } g.closePath(); };
    path(); g.globalAlpha = .2; g.fillStyle = pal[1]; g.fill(); g.globalAlpha = 1; stroked(g, s, pal, path, .075, { join: 'miter' });
  },
  noodle: (g, s, pal) => stroked(g, s, pal, () => { g.beginPath(); for (let x = .05; x <= .951; x += .01) g.lineTo(x * s, s * (.5 + Math.sin(x * TAU * 2.5) * .1)); }, .06, { edge: .024 }),
  lasso: (g, s, pal) => stroked(g, s, pal, () => { g.beginPath(); g.moveTo(s * .04, s * .5); g.lineTo(s * .56, s * .5); g.ellipse(s * .76, s * .5, s * .19, s * .3, 0, Math.PI, Math.PI * 3); }, .045, { edge: .02 }),
  fry: (g, s, pal) => {
    g.beginPath(); g.roundRect(s * .06, s * .39, s * .88, s * .22, s * .035); g.lineJoin = 'round'; g.strokeStyle = pal[2]; g.lineWidth = s * .05; g.stroke(); g.fillStyle = pal[1]; g.fill();
    g.fillStyle = pal[0]; g.fillRect(s * .1, s * .42, s * .8, s * .055); g.globalAlpha = .35; g.fillStyle = pal[2]; g.fillRect(s * .1, s * .55, s * .8, s * .04); g.globalAlpha = 1;
  },
  // 병뚜껑: pal = [가운데, 몸, 톱니 테].
  cap: (g, s, pal) => {
    g.beginPath(); for (let i = 0; i < 36; i++) { const a = i / 36 * TAU, r = i % 2 ? .395 : .45; g.lineTo(s * (.5 + Math.cos(a) * r), s * (.5 + Math.sin(a) * r)); } g.closePath();
    g.lineJoin = 'round'; g.strokeStyle = '#5a2a08'; g.lineWidth = s * .05; g.stroke(); g.fillStyle = pal[2]; g.fill();
    g.beginPath(); g.arc(s / 2, s / 2, s * .32, 0, TAU); g.fillStyle = pal[1]; g.fill();
    g.beginPath(); g.arc(s / 2, s / 2, s * .16, 0, TAU); g.fillStyle = pal[0]; g.fill();
    g.beginPath(); g.arc(s / 2, s / 2, s * .255, -2.5, -1.2); g.strokeStyle = '#ffffffb8'; g.lineWidth = s * .04; g.lineCap = 'round'; g.stroke();
  },
  // 어묵(나루토): 흰 톱니 원에 분홍 소용돌이.
  cake: (g, s) => {
    g.beginPath(); for (let i = 0; i < 48; i++) { const a = i / 48 * TAU, r = .39 + Math.cos(a * 12) * .04; g.lineTo(s * (.5 + Math.cos(a) * r), s * (.5 + Math.sin(a) * r)); } g.closePath();
    g.lineJoin = 'round'; g.strokeStyle = '#9a4a68'; g.lineWidth = s * .06; g.stroke(); g.fillStyle = '#fff8f4'; g.fill();
    g.beginPath(); for (let a = 0; a < TAU * 1.6; a += .1) { const r = .04 + a / (TAU * 1.6) * .22; g.lineTo(s * (.5 + Math.cos(a) * r), s * (.5 + Math.sin(a) * r)); }
    g.strokeStyle = '#ff6f9c'; g.lineWidth = s * .07; g.lineCap = 'round'; g.stroke();
  },
  scallion: (g, s, pal) => { stroked(g, s, pal, () => { g.beginPath(); g.arc(s / 2, s / 2, s * .28, 0, TAU); }, .17, { edge: .04 }); },
  seed: (g, s, pal) => layers(g, s, pal, () => curve(g, s, [.5, .08], [.82, .34, .8, .9, .5, .92], [.2, .9, .18, .34, .5, .08]), { edge: .06, core: .5, cx: .42, cy: .5 }),
  leaf: (g, s, pal) => layers(g, s, pal, () => curve(g, s, [.08, .56], [.1, .3, .26, .34, .3, .18], [.42, .3, .5, .08, .62, .16], [.66, .3, .86, .22, .92, .44], [.8, .52, .94, .7, .78, .8], [.6, .74, .56, .94, .38, .86], [.3, .72, .12, .8, .08, .56]), { edge: .045, core: .5 }),
  tomato: (g, s, pal) => {
    g.beginPath(); g.arc(s / 2, s / 2, s * .4, 0, TAU); g.strokeStyle = pal[2]; g.lineWidth = s * .08; g.stroke(); g.fillStyle = pal[1]; g.fill();
    g.beginPath(); g.arc(s / 2, s / 2, s * .27, 0, TAU); g.strokeStyle = pal[0]; g.lineWidth = s * .035; g.stroke();
    g.fillStyle = pal[0]; for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + .3; g.beginPath(); g.ellipse(s * (.5 + Math.cos(a) * .15), s * (.5 + Math.sin(a) * .15), s * .05, s * .028, a, 0, TAU); g.fill(); }
  },
  // 늘어지는 치즈 한 가닥.
  cheese: (g, s, pal) => layers(g, s, pal, () => curve(g, s, [.18, .05], [.4, .05, .6, .05, .82, .05], [.66, .16, .57, .3, .56, .52], [.56, .6, .57, .68, .57, .74], [.66, .84, .6, .96, .5, .96], [.4, .96, .34, .84, .43, .74], [.43, .68, .44, .6, .44, .52], [.43, .3, .34, .16, .18, .05]), { edge: .035, core: .5, cy: .2 }),
  heart: (g, s, pal) => layers(g, s, pal, () => curve(g, s, [.5, .86], [.08, .58, .1, .16, .5, .36], [.9, .16, .92, .58, .5, .86]), { edge: .045, core: .5, cx: .4, cy: .42 }),
  drop: (g, s, pal) => {
    g.beginPath(); g.arc(s / 2, s / 2, s * .36, 0, TAU); g.strokeStyle = pal[2]; g.lineWidth = s * .09; g.stroke(); g.fillStyle = pal[1]; g.fill();
    g.beginPath(); g.ellipse(s * .4, s * .38, s * .13, s * .09, -.7, 0, TAU); g.fillStyle = pal[0]; g.fill();
  },
  swirl: (g, s, pal) => stroked(g, s, pal, () => { g.beginPath(); for (let a = 0; a < TAU * 1.9; a += .08) { const r = .05 + a / (TAU * 1.9) * .33; g.lineTo(s * (.5 + Math.cos(a) * r), s * (.5 + Math.sin(a) * r)); } }, .075, { edge: .022 }),
  // 바닥에 남는 구덩이: 빛나는 금 위에 어두운 구멍.
  crater: (g, s, pal) => {
    const R = seeded(31), c = s / 2;
    for (const [color, width] of [[pal[2], .034], [pal[1], .02], [pal[0], .007]]) {
      const Q = seeded(7); g.strokeStyle = color; g.lineCap = 'round'; g.lineJoin = 'round';
      for (let i = 0; i < 11; i++) {
        let a = i / 11 * TAU + Q() * .4, x = c, y = c; const reach = c * (.6 + Q() * .34);
        g.lineWidth = s * width * (.7 + Q() * .6); g.beginPath(); g.moveTo(x, y);
        for (let r = 0; r < reach; r += c * .13) { a += (Q() - .5) * .7; x += Math.cos(a) * c * .13; y += Math.sin(a) * c * .13; g.lineTo(x, y); }
        g.stroke();
      }
    }
    g.beginPath(); for (let i = 0; i < 18; i++) { const a = i / 18 * TAU, r = c * (.2 + R() * .13); g.lineTo(c + Math.cos(a) * r, c + Math.sin(a) * r); } g.closePath();
    g.fillStyle = '#12080ee0'; g.fill(); g.strokeStyle = pal[1]; g.lineWidth = s * .014; g.stroke();
  },
  glint: (g, s, pal) => layers(g, s, pal, () => poly(g, s, star(4, .47, .06)), { edge: .02, core: .5 }),
  bubble: (g, s, pal) => {
    g.beginPath(); g.arc(s / 2, s / 2, s * .36, 0, TAU); g.globalAlpha = .28; g.fillStyle = pal[1]; g.fill(); g.globalAlpha = 1;
    g.strokeStyle = pal[2]; g.lineWidth = s * .1; g.stroke(); g.strokeStyle = pal[1]; g.lineWidth = s * .055; g.stroke();
    g.beginPath(); g.arc(s / 2, s / 2, s * .25, .3, 1.5); g.strokeStyle = '#ff9fd8'; g.lineWidth = s * .04; g.lineCap = 'round'; g.stroke();
    g.beginPath(); g.ellipse(s * .38, s * .36, s * .1, s * .06, -.7, 0, TAU); g.fillStyle = pal[0]; g.fill();
  },
  // 가시 돋친 충격 고리(가운데가 뚫려 있다).
  spikes: (g, s, pal) => {
    const R = seeded(5), n = 20, pts = [];
    for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * TAU, r = i % 2 ? .34 : .4 + R() * .075; pts.push([.5 + Math.cos(a) * r, .5 + Math.sin(a) * r]); }
    const path = () => { poly(g, s, pts); g.moveTo(s * .77, s / 2); g.arc(s / 2, s / 2, s * .27, 0, TAU, true); };
    g.lineJoin = 'round'; path(); g.strokeStyle = pal[2]; g.lineWidth = s * .045; g.stroke(); g.fillStyle = pal[1]; g.fill('evenodd');
    g.beginPath(); g.arc(s / 2, s / 2, s * .305, 0, TAU); g.strokeStyle = pal[0]; g.lineWidth = s * .035; g.stroke();
  },
  star5: (g, s, pal) => layers(g, s, pal, () => poly(g, s, star(5, .44, .19)), { edge: .045, core: .5 }),
  // 기름·국물이 튄 얼룩.
  splat: (g, s, pal) => {
    const R = seeded(23), c = s / 2, blobs = [[0, 0, .36]];
    for (let i = 0; i < 9; i++) { const a = i / 9 * TAU + R() * .4, d = .3 + R() * .22; blobs.push([Math.cos(a) * d, Math.sin(a) * d, .1 + R() * .1]); }
    const all = (grow, color) => { g.fillStyle = color; for (const [x, y, r] of blobs) { g.beginPath(); g.arc(c + x * c, c + y * c, (r + grow) * c, 0, TAU); g.fill(); } };
    all(.05, pal[2]); all(0, pal[1]); g.fillStyle = pal[0]; g.beginPath(); g.ellipse(c * .8, c * .78, c * .16, c * .09, -.6, 0, TAU); g.fill();
  },
};
const BIG = { arc: 512, burst: 512, crest: 512, pillar: 512, crater: 512, spikes: 512, flame: 256, cloud: 256, ring: 256, thin: 256, sonic: 256, bolt: 256, ecg: 256, noodle: 256, lasso: 256, lance: 256, cone: 256, hex: 256, heart: 256, splat: 256, cheese: 256, glint: 256 };

// 색 묶음: [속, 몸, 테두리].
export const T = {
  hit: ['#ffffff', '#ffd94a', '#e0562a'], white: ['#ffffff', '#f4f0ff', '#8a80b0'], gold: ['#fffbe0', '#ffd24a', '#8a5a00'], guard: ['#ffffff', '#7cc8ff', '#1a4f9a'], dust: ['#fff6ec', '#e2cdbc', '#8a6f66'], heal: ['#f4ffe8', '#7dff9a', '#1a7a3a'],
  heart: { pulse: ['#fff0f4', '#ff4f86', '#7a0f3a'], volt: ['#ffffff', '#ffe14a', '#b25a00'], shard: ['#ffffff', '#ffb0c8', '#b02458'] },
  kidney: { water: ['#f2fcff', '#39b8ff', '#0b3f8f'], film: ['#ffffff', '#7fe9ff', '#1a5fa8'], amber: ['#fff6d8', '#e9b84a', '#7a4a12'] },
  liver: { vital: ['#f4ffd8', '#6fe04a', '#1f5c1a'], rock: ['#d9c2a8', '#9a6a4c', '#3d2416'], toxin: ['#f0d8ff', '#a04ae0', '#3d1466'], zest: ['#ffffe0', '#d8f03a', '#5a7a00'] },
  pancreas: { teal: ['#ffffff', '#2fe0c4', '#0a5a5a'], gold: ['#fffbe0', '#ffd24a', '#8a5a00'] },
  soda: { foam: ['#ffffff', '#ffeccb', '#8a5a3c'], fizz: ['#ffffff', '#ff8fc0', '#7a1f6a'], cap: ['#ffffff', '#e8323c', '#e2b030'], cola: ['#ffe8d0', '#b0522a', '#3d1408'] },
  fries: { oil: ['#fff8c8', '#ffc21a', '#a05a00'], fire: ['#fff7b0', '#ff7a1a', '#a01a00'], fry: ['#fff0a0', '#f5b82e', '#8a5210'] },
  ramen: { noodle: ['#fff8d0', '#ffcc4a', '#9a5a10'], steam: ['#ffffff', '#f4ece4', '#a89888'], broth: ['#ffe8b0', '#f08a2a', '#7a2e08'], leek: ['#e8ffc0', '#6fd04a', '#2a6a1a'] },
  burger: { gold: ['#fffbe0', '#ffc02e', '#8a4a00'], lettuce: ['#e8ffc0', '#6fd04a', '#2a6a1a'], tomato: ['#ffd8c8', '#f0463a', '#8a1410'], cheese: ['#fff6b0', '#ffb81a', '#b06a00'], seed: ['#ffffff', '#fff1c8', '#a8824a'], rock: ['#d9c2a8', '#9a6a4c', '#3d2416'] },
};

const cache = new Map();
export function toonCanvas(shape, pal, flip = false) {
  const s = BIG[shape] || 128, c = document.createElement('canvas'), g = c.getContext('2d');
  c.width = c.height = s;
  if (flip) { g.translate(s, 0); g.scale(-1, 1); }
  SHAPES[shape](g, s, pal);
  return COMIC ? inked(c) : c;
}
// 만화풍 마무리: 그림 둘레에 굵은 먹선을 한 번 더 두르고, 오른쪽 아래(그늘 쪽)로 갈수록 커지는 망점을 찍는다.
function inked(src) {
  const s = src.width, make = () => { const c = document.createElement('canvas'); c.width = c.height = s; return c; };
  // 반투명 꼬리까지 먹선을 두르면 지저분하니 절반 이상 진한 곳만 테두리를 딴다.
  const sil = make(), k = sil.getContext('2d'); k.drawImage(src, 0, 0);
  const img = k.getImageData(0, 0, s, s), d = img.data;
  for (let i = 3; i < d.length; i += 4) d[i] = d[i] > 120 ? 255 : 0;
  k.putImageData(img, 0, 0); k.globalCompositeOperation = 'source-in'; k.fillStyle = INK; k.fillRect(0, 0, s, s);
  const out = make(), g = out.getContext('2d'), r = Math.max(2, s * .024);
  for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; g.drawImage(sil, Math.cos(a) * r, Math.sin(a) * r); }
  g.drawImage(src, 0, 0);
  // 망점: 45도로 기운 격자, 그림이 있는 곳에만 얹는다.
  const dots = make(), h = dots.getContext('2d'), step = s / 20;
  h.fillStyle = INK; h.translate(s / 2, s / 2); h.rotate(Math.PI / 4);
  for (let y = -s; y < s; y += step) for (let x = -s; x < s; x += step) {
    const sx = (x - y) * .7071 + s / 2, sy = (x + y) * .7071 + s / 2, shade = Math.min(1, Math.max(0, (sx + sy) / s - .75) * 1.6);
    if (shade > 0) { h.beginPath(); h.arc(x, y, step * .46 * Math.sqrt(shade), 0, TAU); h.fill(); }
  }
  g.globalCompositeOperation = 'source-atop'; g.globalAlpha = .34; g.drawImage(dots, 0, 0);
  return out;
}
export function toonTexture(shape, pal = T.hit, flip = false) {
  const key = shape + '|' + pal.join() + (flip ? '|f' : '');
  let t = cache.get(key);
  if (!t) { t = new THREE.CanvasTexture(toonCanvas(shape, pal, flip)); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; cache.set(key, t); }
  return t;
}
export const TOON_SHAPES = Object.keys(SHAPES);
