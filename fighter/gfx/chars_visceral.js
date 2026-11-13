// 내장지방: 최종 보스. 노란 지방 덩어리가 겹겹이 출렁이고, 보라 가죽 띠를 졸라맸다.
// 블렌더 몸(assets/visceral.glb)이 없을 때 쓰는 임시 SDF 몸과, 관절 자리·팔다리 굵기를 적는다.
import { Shape, ball, cap, box } from './sdf.js';

export const MODEL = {
  cell: 2.4, size: 1.32,
  shape() { return new Shape().add(ball([0, 0, 0], [66, 58, 52]), '#f1cf72'); },
  face: { eyes: [16, 18], eye: [10, 11], mouth: [0, 0], brow: 'villain', calm: 'frown' },
  shoulder: [52, 0, 0], hip: [22, -50, 0], arm: [11, 10], leg: [12, 11], reach: 96, stride: 72,
  hand: 'mitt', foot: 'boot', limb: '#e8b85a', glove: '#4a2346', shoe: '#2a1626',
  stance: { by: 108 },
  // 블렌더로 빚은 몸(assets/visceral.glb). 대왕버거보다 넓고 크게: 몸은 작게 빚고 size로 키운다.
  built: {
    face: { eyes: [15, 30], eye: [10.5, 10], mouth: [0, 11], brow: 'villain', calm: 'grin' },
    girth: 1, rise: 20, shoulder: [64, -2, 0], hip: [26, -62, 0], ankle: 30, stride: 80, legStretch: 2.1, handScale: .8, footScale: .95, stretch: 1.3,
    limb: '#e9b84e', arm: [12, 10.5], leg: [12.5, 11.5],
    armShape: [[0, 13], [.25, 14.5], [.5, 11.5], [.75, 13], [1, 11]],
    legShape: [[0, 14], [.4, 14.5], [1, 12]],
    stance: { by: 100, turn: 26, far: .78, hf: [104, 104, -34], hb: [84, 66, 60], ff: [34, 0, -22], fb: [-34, 0, 26], bob: 2.5, sway: 2 },
  },
  // 손이 크고 얼굴이 몸 위쪽 앞에 묻혀 있어서 앉기·막기 손을 얼굴 밖으로 빼고, 누우면 넓은 몸이 바닥에 묻히지 않게 띄운다.
  fix: { crouch: { hf: [98, 56, -30], hb: [86, 28, 60] }, block: { hf: [100, 122, -14], hb: [96, 66, 52] }, blockLow: { hf: [98, 80, -14], hb: [92, 34, 52] }, win: { hf: [84, 196, -40], hb: [-84, 196, 44] }, down: { by: 66 } },
};
