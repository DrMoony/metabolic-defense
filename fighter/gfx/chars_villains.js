// 튀김·라면·대왕버거 조형. 형식은 chars.js의 심장·탄산과 같다.
import { Shape, ball, cap, box, torus, cone } from './sdf.js';

const RAD = Math.PI / 180;
// 밑동 p에서 솟는 네모 막대(감자튀김). rz는 옆으로, rx는 앞뒤로 기운 각(도).
const stick = (shape, p, len, rz, rx, r, color, k = 0) => {
  const dir = [-Math.sin(rz * RAD) * Math.cos(rx * RAD), Math.cos(rz * RAD) * Math.cos(rx * RAD), Math.sin(rx * RAD)];
  return shape.add(box([p[0] + dir[0] * len / 2, p[1] + dir[1] * len / 2, p[2] + dir[2] * len / 2], [r, len / 2, r], 1.6, [rx, 0, rz]), color, k);
};

export const MODELS = {
  // 튀김: 함정 슬라이더. 빨간 종이 상자에 감자튀김이 머리카락처럼 삐죽 솟았다. 팔다리가 길고 흐느적거린다.
  fries: {
    cell: 2.1, size: 1,
    shape() {
      const c = '#dd4b33', fry = '#ffd257', tip = '#f0a93a';
      const s = new Shape()
        .add(box([0, -4, 0], [33, 40, 19], 5, null, .24), c)
        // 뒤판은 높고 앞판은 가운데가 파였다.
        .add(ball([0, 34, -17], [42, 24, 7]), c, 3)
        .cut(ball([0, 49, 24], [25, 15, 16]), 2, '#a82f1c');
      // 감자튀김: 뒤쪽 줄은 길고 앞쪽 줄은 짧다.
      const rows = [
        [-12, 62, [[-30, 26, -2], [-18, 12, 6], [-6, 4, -4], [7, -5, 3], [19, -14, -6], [30, -27, 2]]],
        [-1, 46, [[-24, 20, 4], [-11, 9, -5], [2, -2, 6], [14, -11, -3], [25, -22, 5]]],
        [9, 30, [[-17, 16, -4], [-4, 5, 5], [9, -7, -6], [20, -18, 3]]],
      ];
      for (const [z, len, list] of rows) for (const [x, rz, rx] of list) stick(s, [x, 28, z], len + (x * 7 % 9), rz, rx, 5.2, (x + z) % 2 ? fry : tip);
      return s
        .paint(box([0, -38, 0], [60, 7, 60]), '#a82f1c')
        .paint(box([0, 27, 0], [60, 2.6, 60]), '#ffd257');
    },
    face: { eyes: [15, 4], eye: [12.5, 11], mouth: [0, -17], brow: 'villain', calm: 'smirk' },
    shoulder: [34, 2, 0], hip: [14, -42, 0], arm: [6, 5.5], leg: [6.5, 6], reach: 128, stride: 104,
    hand: 'mitt', foot: 'pointy', limb: '#f0a93a', glove: '#fff6e6', shoe: '#7c2014', handScale: 1.05,
    stance: { by: 128, lean: -.06, hf: [70, 98, -18], hb: [28, 72, 46], ff: [40, 0, -16], fb: [-36, 0, 20], bob: 4, sway: 7 },
    // 블렌더로 빚은 몸(assets/fries.glb). 앞머리 튀김은 앞으로 말리고, 목수건 매듭은 등 왼쪽에서 날린다.
    built: {
      face: { eyes: [14.5, 21], eye: [11, 10], mouth: [0, -12], brow: 'villain', calm: 'smirk' },
      girth: 1.14, rise: 22, shoulder: [30, -8, 0], hip: [11, -56, 0], ankle: 18, stride: 90, legStretch: 2.1, handScale: .82, footScale: .86,
      limb: '#f2b22c', arm: [6, 5.5], leg: [6.5, 6],
      armShape: [[0, 6], [.25, 6.8], [.5, 5.4], [.72, 6.2], [1, 5.5]],
      legShape: [[0, 6.8], [.35, 7.2], [.5, 5.8], [.75, 6.4], [1, 6]],
    },
  },

  // 라면: 중거리 채찍. 컵라면에 뚜껑이 반쯤 벗겨져 뒤로 서 있고, 면발이 넘치고 젓가락이 꽂혔다.
  ramen: {
    cell: 2.25, size: 1,
    shape() {
      const c = '#e8833c', n = '#ffe08a', n2 = '#f6c95c', wood = '#a8683a';
      return new Shape()
        .add(cone([0, -10, 0], 96, 30, 45, 5), c)
        .add(torus([0, 38, 0], 45, 4.2), '#fff6e6', 1)
        // 넘치는 면발.
        .add(ball([0, 42, 0], [41, 15, 41]), n, 1)
        .add(torus([-14, 53, 6], 15, 5, [18, 0, 12]), n2, 2)
        .add(torus([15, 55, -2], 14, 5, [-14, 30, -16]), n, 2)
        .add(torus([2, 58, -16], 15, 5, [24, 60, 6]), n2, 2)
        // 컵 밖으로 흘러내린 면발 가닥(옆머리).
        .add(cap([40, 46, 6], [51, 30, 8], 4.6), n, 2).add(cap([51, 30, 8], [47, 10, 10], [4.6, 3.6]), n, 2)
        .add(cap([-41, 46, -4], [-53, 28, -6], 4.6), n2, 2).add(cap([-53, 28, -6], [-50, 4, -6], [4.6, 3.6]), n2, 2)
        // 반쯤 벗겨져 뒤로 선 뚜껑과 손잡이.
        .add(ball([0, 70, -38], [42, 36, 3.6], [-22, 0, 0]), '#cfd9e2', 1)
        .add(ball([0, 106, -52], [11, 8, 3.4], [-22, 0, 0]), '#d9372c', 2)
        .paint(ball([0, 70, -45], [48, 42, 5], [-22, 0, 0]), '#d9372c')
        // 젓가락 한 벌.
        .add(cap([-6, 44, -4], [-48, 112, -18], [3.4, 2.6]), wood, 1)
        .add(cap([4, 44, -10], [-33, 117, -24], [3.4, 2.6]), wood, 1)
        .paint(box([0, -40, 0], [80, 9, 80]), '#fff6e6')
        .paint(box([0, -27, 0], [80, 2.4, 80]), '#d9372c')
        .paint(box([0, 27, 0], [80, 2.4, 80]), '#d9372c');
    },
    face: { eyes: [17, 6], eye: [11.5, 13], mouth: [0, -17], brow: 'villain', calm: 'grin' },
    shoulder: [38, -2, 0], hip: [15, -54, 0], arm: [5.6, 5], leg: [7, 6.5], reach: 112, stride: 84,
    hand: 'mitt', foot: 'sneaker', limb: '#f6c95c', glove: '#d9372c', shoe: '#d9372c',
    props: [{ kind: 'whip', color: '#ffe08a', at: [6, 0, 0], hang: [.8, -.6, 0], stretch: .28 }],
    stance: { by: 118, prop: 0, hf: [62, 104, -18], hb: [36, 80, 46], bob: 4, sway: 3 },
    // 블렌더로 빚은 몸(assets/ramen.glb). 은박 뚜껑은 뒤로 서고, 땋은 면발과 젓가락은 등 왼쪽으로 나온다.
    built: {
      face: { eyes: [17, 13], eye: [11, 11], mouth: [0, -1], brow: 'villain', calm: 'grin' },
      girth: 1.1, rise: 14, shoulder: [36, 4, 0], hip: [14, -58, 0], ankle: 24, stride: 86, legStretch: 2.1, handScale: .86, footScale: .84,
      limb: '#f3dcc0', arm: [6, 5.5], leg: [8, 6.5],
      armShape: [[0, 6], [.25, 6.8], [.5, 5.4], [.72, 6.2], [1, 5.5]],
      legShape: [[0, 13], [.3, 14], [.52, 12.5], [.6, 6.4], [1, 6]],
      legBands: [[0, .58, '#eedcbc'], [.58, 1, '#fbf6ea']],
      stance: { hf: [62, 120, -18], hb: [36, 98, 46] },
    },
  },

  // 대왕버거: 초중량 보스. 빵·치즈·패티·양상추가 겹겹이고 금 왕관을 썼다.
  // 공용 자세의 손 자리가 몸 밖에 놓이도록 몸은 작게 빚고 size로 키운다.
  burger: {
    cell: 2.8, size: 1.3,
    shape() {
      const bun = '#d9953f', top = '#c98a3a', gold = '#ffc531', cheese = '#ffc94a';
      // 위 빵(얼굴 자리)을 먼저 빚어 밑을 평평하게 자르고, 그 아래로 속을 쌓는다.
      const s = new Shape()
        .add(ball([0, -5, 0], [58, 54, 52]), top)
        .cut(box([0, -59, 0], [90, 52, 90]), 3)
        // 치즈: 모서리가 패티 위로 흘러내린다.
        .add(box([0, -10, 0], [43, 3.2, 43], 2.4, [0, 45, 0]), cheese)
        .add(cap([0, -11, 57], [0, -25, 56], [6.5, 3.8]), cheese, 3)
        .add(cap([57, -11, 0], [56, -22, 0], [6.5, 3.8]), cheese, 3)
        .add(cap([-57, -11, 0], [-56, -27, 0], [6.5, 3.8]), cheese, 3)
        .add(cone([0, -21, 0], 16, 55, 55, 6), '#6b3a1e')
        // 양상추: 물결치는 가장자리.
        .add(ball([0, -31, 0], [56, 4.6, 51]), '#7cc04a', 1);
      for (let i = 0; i < 6; i++) { const a = (i + .75) / 6 * Math.PI * 2; s.add(ball([Math.cos(a) * 53, -33, Math.sin(a) * 49], [16, 6, 15]), i % 2 ? '#8fd45a' : '#6cb03c', 3); }
      // 아래 빵.
      s.add(ball([0, -44, 0], [54, 14, 49]), bun);
      // 금 왕관: 테와 뾰족한 다섯 봉우리, 가운데 보석.
      s.add(cone([0, 50, -2], 12, 25, 29, 2), gold, 1);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5 + .05) * Math.PI * 2 + Math.PI / 2;
        s.add(cone([Math.cos(a) * 27, 64, Math.sin(a) * 27 - 2], 20, 8, 1.4, 1), gold, 2);
      }
      s.add(ball([0, 51, 26], [5, 5, 3.6]), '#e23a4f', 1);
      // 깨.
      for (const [x, y] of [[-37, 26], [-24, 38], [35, 30], [22, 40], [-50, 8], [50, 10]]) {
        const hit = s.surface(x, y);
        if (hit) s.paint(ball(hit.p, [4.2, 2.8, 3.2]), '#fff3cf', 1);
      }
      return s;
    },
    face: { eyes: [15.5, 21], eye: [10.5, 11.5], mouth: [0, 5], brow: 'villain', calm: 'frown' },
    shoulder: [53, -3, 0], hip: [21, -53, 0], arm: [10.5, 9.5], leg: [11, 10.5], reach: 84, stride: 50,
    hand: 'mitt', foot: 'boot', limb: '#8a5a2b', glove: '#fff6e6', shoe: '#6b3a1e', handScale: 1.2, footScale: 1.2, stretch: 1.25,
    stance: { by: 92, turn: 26, far: .78, hf: [86, 90, -24], hb: [64, 56, 52], ff: [32, 0, -20], fb: [-32, 0, 24], bob: 2.5, sway: 2 },
    // 블렌더로 빚은 몸(assets/burger.glb). 망토는 등 뒤로 늘어지고, 털 목도리 아래에서 팔이 나온다.
    built: {
      face: { eyes: [15.5, 21], eye: [10.5, 11.5], mouth: [0, 5], brow: 'villain', calm: 'frown' },
      girth: 1, rise: 14, shoulder: [56, -17, 0], hip: [22, -60, 0], ankle: 30, handScale: .8, footScale: 1.05,
      limb: '#d08c3c', arm: [10.5, 9.5], leg: [11, 10.5],
      armShape: [[0, 11], [.25, 12.5], [.5, 9.5], [.75, 11.5], [1, 10]],
      legShape: [[0, 12], [.4, 12.5], [1, 11]],
    },
    // 얼굴이 몸 위쪽에 넓게 있어서 앉기·막기 손을 얼굴 밖으로 뺀다.
    fix: { crouch: { hf: [80, 62, -26], hb: [72, 28, 54] }, block: { hf: [80, 120, -12], hb: [82, 66, 46] }, blockLow: { hf: [80, 84, -12], hb: [80, 34, 50] }, win: { hf: [74, 168, -40], hb: [-74, 168, 44] } },
  },
};

// 이 파일 캐릭터만 쓰는 손발과 소품. +x가 뻗는 방향이다.
export const PARTS = {
  // 앞코가 길고 뾰족한 구두(튀김).
  pointy(color) {
    return new Shape()
      .add(ball([6, 8, 0], [17, 8.5, 10.5]), color)
      .add(cap([14, 6.5, 0], [34, 5, 0], [7, 3.2]), color, 5)
      .add(box([9, 2, 0], [22, 2.2, 10.5], 2), '#ffd257', 1);
  },
};
export const PROPS = {
  // 면발 채찍: 손에서 앞으로 구불구불 뻗고 끝이 돌돌 말렸다.
  whip(color) {
    const s = new Shape(), n = 11, r = u => 4.6 - u * 1.2;
    let prev = [0, 0, 0];
    for (let i = 1; i <= n; i++) {
      const u = i / n, p = [u * 118, Math.sin(u * 8.6) * 6 - u * u * 14, Math.cos(u * 7.1) * 4 * u];
      s.add(cap(prev, p, [r(u - 1 / n), r(u)]), color, 1.5);
      prev = p;
    }
    // 끝의 소용돌이.
    const c = [prev[0] + 2, prev[1] + 11, prev[2]];
    for (let i = 1; i <= 7; i++) {
      const a = -Math.PI / 2 + i * .82, q = 11 - i * 1.1, p = [c[0] + Math.cos(a) * q, c[1] + Math.sin(a) * q, c[2]];
      s.add(cap(prev, p, 3.3), color, 1);
      prev = p;
    }
    return s;
  },
};
