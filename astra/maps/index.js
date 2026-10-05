import coronary from './coronary.js?v=a59';
import glomerulus from './glomerulus.js?v=a59';
import islet from './islet.js?v=a59';
import { withPlate } from './plates.js?v=a59';
// ICDM2026: 자디앙 적응증에 맞춰 심혈관(HF)·신장(CKD)·췌장 랑게르한스섬(T2D) 세 맵만 노출한다.
export const MAPS=[coronary,glomerulus,islet].map(withPlate);
export const getMap=key=>MAPS.find(map=>map.key===key&&map.ready)||MAPS[0];
