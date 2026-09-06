import coronary from './coronary.js?v=a5';
import omentum from './omentum.js?v=a5';
import sinusoid from './sinusoid.js?v=a5';
import carotid from './carotid.js?v=a5';
import stomach from './stomach.js?v=a5';
import glomerulus from './glomerulus.js?v=a5';
import islet from './islet.js?v=a5';
export const MAPS=[coronary,omentum,sinusoid,carotid,stomach,glomerulus,islet];
export const getMap=key=>MAPS.find(map=>map.key===key&&map.ready)||coronary;
