// 담배: 연기 닌자. 흰 종이 몸 아래는 주황 필터, 머리는 타는 불씨와 연기.
// 블렌더 몸(assets/smoke.glb)이 없을 때 쓰는 임시 SDF 몸과, 관절 자리·팔다리 굵기를 적는다.
import { Shape, ball, cap, box } from './sdf.js';

export const MODEL = {
  cell: 2.4, size: 1,
  shape() { return new Shape().add(cap([0, -48, 0], [0, 52, 0], [26, 24]), '#f2efe8'); },
  face: { eyes: [16, 18], eye: [10, 11], mouth: [0, 0], brow: 'villain', calm: 'smirk' },
  shoulder: [52, 0, 0], hip: [22, -50, 0], arm: [11, 10], leg: [12, 11], reach: 96, stride: 72,
  hand: 'mitt', foot: 'boot', limb: '#3a3a42', glove: '#2c2c34', shoe: '#1e1e24',
  stance: { by: 108 },
  // 블렌더로 빚은 몸(assets/smoke.glb). 위는 흰 종이, 아래는 주황 필터, 목도리 꼬리는 등 뒤(−x)로 날린다.
  built: {
    face: { eyes: [11, 35], eye: [9.5, 9], mouth: [0, 20], brow: 'villain', calm: 'smirk' },
    girth: 1.1, rise: 26, shoulder: [21, -9, 0], hip: [10, -62, 0], ankle: 20, stride: 86, legStretch: 2.1, handScale: .74, footScale: .86,
    limb: '#4a4952', arm: [5.5, 5], leg: [9, 7],
    armShape: [[0, 5.6], [.25, 6.2], [.5, 5], [.72, 5.6], [1, 5]],
    legShape: [[0, 10.5], [.3, 11.5], [.55, 10], [.75, 8.5], [1, 7.5]],
    legBands: [[0, 1, '#2c2b33']],
    stance: { hf: [62, 96, -18], hb: [-40, 84, 34] },
  },
  // 몸이 가늘고 얼굴이 위쪽에 있어서 앉기·맞기·막기 손을 얼굴 밖으로 뺀다.
  fix: { crouch: { hf: [64, 58, -18], hb: [-40, 46, 34] }, hit: { hf: [-40, 124, -30], hb: [-58, 98, 40] }, block: { hf: [66, 112, -10], hb: [64, 70, 40] }, blockLow: { hf: [66, 72, -10], hb: [64, 36, 40] } },
};
