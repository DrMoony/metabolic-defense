import coronary from './coronary.js?v=a58';
import { withPlate } from './plates.js?v=a58';
// ICDM2026: 자디앙 부스용 — 관상동맥(심장) 맵 하나만 노출한다.
export const MAPS=[coronary].map(withPlate);
export const getMap=key=>MAPS.find(map=>map.key===key&&map.ready)||MAPS[0];
