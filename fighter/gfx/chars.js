// 캐릭터 조형. 몸통은 sdf.js 덩어리로 빚고, 얼굴·팔다리·소품 자리는 숫자로 적는다.
// 몸통 좌표: 원점=몸 가운데, +y 위, +z 얼굴 쪽, +x 캐릭터의 왼쪽. 단위는 화면 픽셀.
import { Shape, ball, cap, box, torus, cone } from './sdf.js';
import * as organs from './chars_organs.js';
import * as villains from './chars_villains.js';

export const INK = '#2b0f1d';

// 기본 자세 값. 손발 좌표는 발밑 기준(x 앞, y 위, z 화면 쪽). 앞 손발(f)은 화면에서 먼 쪽, 뒤 손발(b)은 가까운 쪽이다.
const STANCE = { by: 112, turn: 34, lean: 0, hf: [58, 132, -18], hb: [56, 84, 44], ff: [30, 0, -16], fb: [-28, 0, 20], bob: 3, sway: 0 };

export const MODELS = {
  // 심장: 러시형 복서. 대동맥 궁이 머리 위로 솟고 흰 머리띠를 둘렀다.
  heart: {
    cell: 2.1, size: 1,
    shape() {
      const c = '#f0496a', d = '#b9264a';
      return new Shape()
        .add(ball([-27, 22, 0], [35, 35, 31]), c)
        .add(ball([27, 22, 0], [35, 35, 31]), c, 7)
        .add(cap([0, 6, 0], [3, -56, 0], [41, 9]), c, 20)
        // 대동맥 궁: 뒤통수에서 솟아 뒤쪽으로 넘어간다.
        .add(cap([6, 40, -16], [8, 72, -18], 11), d, 5)
        .add(cap([8, 72, -18], [-14, 86, -18], 10.5), d, 2)
        .add(cap([-14, 86, -18], [-34, 76, -18], 10), d, 2)
        .cut(cap([-36, 74.5, -18], [-52, 64, -18], 6), 1, '#6d1230')
        .add(cap([30, 44, -14], [40, 66, -16], 9), '#6f86ea', 4)
        .cut(cap([41.5, 69, -16], [47, 82, -17], 5.2), 1, '#34439c')
        // 머리띠와 뒤로 날리는 매듭 끈.
        .paint(box([0, 37, 0], [90, 4.6, 90], 0, [0, 0, -4]), '#fff6e6')
        .add(ball([-58, 33, -4], 7), '#fff6e6', 2)
        .add(cap([-60, 33, -5], [-84, 44, -10], [5, 3]), '#fff6e6', 2)
        .add(cap([-60, 31, -3], [-82, 22, -6], [5, 3]), '#fff6e6', 2)
        .paint(ball([-41, -6, 24], 9), '#ff9fb4', 7).paint(ball([41, -6, 24], 9), '#ff9fb4', 7);
    },
    face: { eyes: [20, 9], eye: [12, 15], mouth: [0, -19], brow: 'hero', calm: 'smile' },
    shoulder: [46, 0, 0], hip: [16, -46, 0], arm: [8.5, 8], leg: [9, 8.5],
    hand: 'boxing', foot: 'boot', limb: '#c92d50', glove: '#ffc531', shoe: '#ffc531', handScale: 1.18,
    stance: { hf: [68, 140, -14], hb: [70, 80, 40], bob: 5, bounce: 1 },
    // 블렌더로 빚은 몸(assets/heart.glb)을 쓸 때 덮어쓰는 값. 몸이 넓고 장갑·부츠가 커서 관절 자리가 다르다.
    built: {
      face: { eyes: [19, 24], eye: [11, 13], mouth: [0, 2], brow: 'hero', calm: 'smirk' },
      girth: .9, rise: 16, shoulder: [58, 4, 0], hip: [22, -52, 0], ankle: 32, stride: 66, legStretch: 2.1, handScale: .92, footScale: .88,
      limb: '#c4202f', arm: [15, 11], leg: [19, 13],
      // 팔: 어깨, 알통, 팔꿈치, 아래팔, 손목 순. 다리: 바지 자락(남색 천)이 끝나는 자리에서 한 단 가늘어진다.
      armShape: [[0, 15], [.2, 17], [.45, 12.5], [.62, 14.5], [.9, 11], [1, 11]],
      legShape: [[0, 19], [.42, 20], [.5, 16.5], [.7, 15], [1, 12.5]],
      legBands: [[0, .45, '#2b2a5e']],
      stance: { hf: [78, 136, -22], hb: [66, 86, 50], bob: 5, bounce: 1 },
    },
  },

  // 탄산: 변칙 트릭스터. 돔 뚜껑에 꺾인 빨대를 꽂은 종이컵.
  soda: {
    cell: 2.1, size: 1,
    shape() {
      const c = '#3f9fe6';
      return new Shape()
        .add(cone([0, -10, 0], 100, 33, 45, 6), c)
        .add(cone([0, 43, 0], 9, 49, 49, 3.5), '#f4fbff')
        .add(ball([0, 46, 0], [43, 27, 43]), '#e3f3ff', 2)
        .add(cap([12, 62, -4], [18, 100, -4], 5.5), '#ff5a5f', 1)
        .add(cap([18, 100, -4], [40, 108, -4], 5.5), '#ff5a5f', 1)
        .cut(cap([41, 108.4, -4], [50, 112, -4], 3), .5, '#8a1f2a')
        .paint(box([0, 81, 0], [60, 4, 60], 0, [0, 0, 12]), '#fff6e6').paint(box([0, 96, 0], [60, 4, 60], 0, [0, 0, 12]), '#fff6e6')
        .paint(box([0, -44, 0], [80, 7, 80]), '#fff6e6')
        .paint(box([0, -57, 0], [80, 5, 80]), '#2a6fc0');
    },
    face: { eyes: [18, 8], eye: [12, 14], mouth: [0, -18], brow: 'villain', calm: 'smirk' },
    shoulder: [40, -4, 0], hip: [17, -56, 0], arm: [7.5, 7], leg: [8, 7.5],
    hand: 'mitt', foot: 'sneaker', limb: '#2a6fc0', glove: '#fff6e6', shoe: '#ff5a5f',
    stance: { by: 116, hf: [50, 120, -16], hb: [20, 74, 46], bob: 4, sway: 5 },
  },
  ...organs.MODELS, ...villains.MODELS,
};

for (const model of Object.values(MODELS)) {
  model.stance = { ...STANCE, ...model.stance };
  if (model.built) model.built.stance = { ...model.stance, ...model.built.stance };
}

// 손과 발. +x가 뻗는 방향이다.
export const PARTS = {
  boxing(color) {
    return new Shape()
      .add(ball([5, 1, 0], [17, 15.5, 15]), color)
      .add(ball([4, -7, 9], [9.5, 7.5, 7.5]), color, 4)
      .add(cap([-11, 0, 0], [-19, 0, 0], 11), '#fff6e6', 2)
      .paint(box([-15, 0, 0], [1.6, 20, 20]), color);
  },
  mitt(color) {
    return new Shape()
      .add(ball([5, 0, 0], [14, 13, 12]), color)
      .add(ball([3, -6, 8], [7.5, 6, 6]), color, 3)
      .add(torus([-8, 0, 0], 8.5, 4.5, [0, 0, 90]), color, 2);
  },
  boot(color) {
    return new Shape()
      .add(ball([8, 9, 0], [19, 9.5, 12]), color)
      .add(ball([17, 8, 0], [11, 8.5, 12]), color, 4)
      .add(cap([-3, 10, 0], [-3, 22, 0], 9.5), color, 4)
      .add(box([7, 2.2, 0], [21, 2.6, 12.5], 2.4), '#fff6e6', 1)
      .paint(box([-3, 22, 0], [14, 2.4, 14]), '#fff6e6');
  },
  sneaker(color) {
    return new Shape()
      .add(ball([8, 8.5, 0], [19, 9, 12]), color)
      .add(ball([18, 7.5, 0], [10, 8, 11.5]), '#fff6e6', 3)
      .add(box([7, 2.2, 0], [21, 2.6, 12.5], 2.4), '#fff6e6', 1);
  },
  ...organs.PARTS, ...villains.PARTS,
};

// 손에 쥐는 소품. 손의 +x(뻗는 방향)를 따라 놓인다.
export const PROPS = { ...organs.PROPS, ...villains.PROPS };
