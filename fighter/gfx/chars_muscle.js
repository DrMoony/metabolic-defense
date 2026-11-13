// 근육: 파워 레슬러. 이두근 덩어리 몸에 흰 힘줄 머리, 청록 싱글렛과 금 챔피언 벨트.
// 블렌더 몸(assets/muscle.glb)이 없을 때 쓰는 임시 SDF 몸과, 관절 자리·팔다리 굵기를 적는다.
import { Shape, ball, cap, box } from './sdf.js';

export const MODEL = {
  cell: 2.4, size: 1.1,
  shape() { return new Shape().add(ball([0, 4, 0], [50, 54, 40]), '#e8785a'); },
  face: { eyes: [16, 18], eye: [10, 11], mouth: [0, 0], brow: 'hero', calm: 'grin' },
  shoulder: [52, 0, 0], hip: [22, -50, 0], arm: [11, 10], leg: [12, 11], reach: 96, stride: 72,
  hand: 'mitt', foot: 'boot', limb: '#c85a40', glove: '#1f8f8a', shoe: '#f4f4ee',
  stance: { by: 108 },
  // 블렌더로 빚은 몸(assets/muscle.glb). 팔은 이두근이 불룩한 굵은 호스, 손목엔 흰 테이프, 무릎엔 청록 보호대.
  built: {
    face: { eyes: [18, 26], eye: [11, 11.5], mouth: [0, 2], brow: 'hero', calm: 'grin' },
    girth: 1, rise: 14, shoulder: [56, 14, 0], hip: [24, -56, 0], ankle: 38, stride: 72, legStretch: 2.1, handScale: .98, footScale: .95,
    limb: '#d4654a', arm: [19, 14], leg: [20, 14],
    armShape: [[0, 21], [.16, 24], [.32, 25], [.46, 17], [.6, 19.5], [.76, 17], [.86, 14.5], [1, 14.5]],
    armBands: [[.9, 1, '#ebe7e0']],
    legShape: [[0, 22], [.3, 21], [.42, 17], [.5, 19.5], [.6, 17.5], [.78, 16], [1, 14]],
    legBands: [[0, .14, '#17807a'], [.4, .6, '#17807a']],
    // 시트처럼 주먹을 허리 옆에 내리고 다리를 넓게 벌린다(손이 입을 가리지 않게).
    stance: { hf: [118, 92, -6], hb: [-60, 74, 30], ff: [44, 0, -18], fb: [-44, 0, 22], bob: 2.4 },
  },
  // 주먹이 커서 공용 앉기·막기 자리에 두면 입을 가린다.
  fix: { crouch: { hf: [120, 56, -12], hb: [94, 34, 54] }, block: { hf: [100, 146, -10], hb: [102, 84, 40] }, blockLow: { hf: [100, 100, -10], hb: [98, 44, 46] } },
};
