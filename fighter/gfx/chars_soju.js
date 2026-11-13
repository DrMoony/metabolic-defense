// 소주: 취권 트릭스터. 초록 유리병 몸에 은색 뚜껑, 진청 쿵후 저고리.
// 블렌더 몸(assets/soju.glb)이 없을 때 쓰는 임시 SDF 몸과, 관절 자리·팔다리 굵기를 적는다.
import { Shape, ball, cap, box } from './sdf.js';

export const MODEL = {
  cell: 2.4, size: 1,
  shape() { return new Shape().add(cap([0, -40, 0], [0, 50, 0], [30, 14]), '#2fa66a'); },
  face: { eyes: [16, 18], eye: [10, 11], mouth: [0, 0], brow: 'villain', calm: 'smirk' },
  shoulder: [52, 0, 0], hip: [22, -50, 0], arm: [11, 10], leg: [12, 11], reach: 96, stride: 72,
  hand: 'mitt', foot: 'boot', limb: '#9cc9a4', glove: '#e9e2d0', shoe: '#222226',
  stance: { by: 108 },
  // 블렌더로 빚은 몸(assets/soju.glb). 가는 병 몸통 위쪽에 얼굴, 아래에 흰 상표, 앞이 트인 저고리와 빨간 허리띠.
  // 소매는 팔 호스 첫머리를 진청으로 칠하고, 손목에는 크림색 천, 바지는 검정에서 흰 각반으로 이어진다.
  built: {
    face: { eyes: [13, 30], eye: [9, 10], mouth: [0, 9], brow: 'villain', calm: 'grin' },
    girth: .9, rise: 14, shoulder: [35, 16, -2], hip: [14, -62, 0], ankle: 24, stride: 80, legStretch: 2.1, handScale: .74, footScale: .84,
    limb: '#9cc9a4', arm: [7, 6], leg: [8, 6.5],
    armShape: [[0, 11], [.3, 11.5], [.42, 10], [.48, 6.6], [.72, 7], [1, 6]],
    armBands: [[0, .44, '#1d4d50'], [.44, .5, '#efe4c6'], [.9, 1, '#efe4c6']],
    legShape: [[0, 13], [.3, 14], [.52, 12.5], [.6, 7], [1, 6.5]],
    legBands: [[0, .58, '#26282f'], [.58, 1, '#eee8da']],
    stance: { hf: [62, 124, -18], hb: [54, 66, 46] },
  },
  // 얼굴이 병 위쪽에 있어서 앉기·막기 손을 얼굴 밖으로 뺀다.
  fix: { crouch: { hf: [78, 92, -24], hb: [66, 40, 50] }, block: { hf: [82, 138, -14], hb: [78, 82, 46] }, blockLow: { hf: [80, 92, -14], hb: [76, 40, 48] } },
};
