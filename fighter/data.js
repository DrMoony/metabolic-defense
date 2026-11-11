// 메타볼릭 파이터 시제품 — 캐릭터·기술 수치. 프레임은 60fps 기준.
export const STAGE = { w: 1280, h: 720, left: 70, right: 1210, floor: 612 };

// box: [앞쪽 x, 발 기준 y(위가 음수), 너비, 높이]. guard: mid=서서·앉아 모두 막힘, low=앉아야 막힘, over=서야 막힘.
export const MOVES = {
  jab:      { startup: 4,  active: 3,  recovery: 7,  dmg: 40,  hitstun: 15, blockstun: 10, push: 6,  box: [28, -168, 92, 36],  guard: 'mid', chain: { p: 'straight', k: 'kick' }, cancel: true, pose: 'punch' },
  straight: { startup: 5,  active: 3,  recovery: 10, dmg: 55,  hitstun: 17, blockstun: 11, push: 7,  box: [28, -166, 108, 38], guard: 'mid', chain: { p: 'finisher', k: 'kick' }, cancel: true, pose: 'punch2', step: 3 },
  finisher: { startup: 7,  active: 4,  recovery: 18, dmg: 85,  hitstun: 0,  blockstun: 14, push: 10, box: [24, -205, 104, 80], guard: 'mid', launch: [7, -13], cancel: true, pose: 'hook', step: 5, heavy: true },
  kick:     { startup: 7,  active: 4,  recovery: 13, dmg: 70,  hitstun: 19, blockstun: 12, push: 9,  box: [28, -148, 122, 44], guard: 'mid', cancel: true, pose: 'kick', heavy: true },
  cjab:     { startup: 4,  active: 3,  recovery: 7,  dmg: 32,  hitstun: 14, blockstun: 9,  push: 6,  box: [28, -104, 92, 32],  guard: 'mid', chain: { p: 'cjab', k: 'sweep' }, cancel: true, pose: 'cpunch', crouch: true },
  sweep:    { startup: 8,  active: 4,  recovery: 20, dmg: 75,  hitstun: 0,  blockstun: 13, push: 8,  box: [24, -40, 130, 40],   guard: 'low', knockdown: true, pose: 'sweep', crouch: true, heavy: true },
  jpunch:   { startup: 5,  active: 12, recovery: 4,  dmg: 50,  hitstun: 16, blockstun: 11, push: 5,  box: [14, -150, 92, 76],  guard: 'over', air: true, pose: 'jpunch' },
  jkick:    { startup: 6,  active: 16, recovery: 4,  dmg: 70,  hitstun: 19, blockstun: 12, push: 6,  box: [10, -92, 110, 70],  guard: 'over', air: true, pose: 'jkick', heavy: true },
  fireball: { startup: 13, active: 1,  recovery: 28, spawn: true, pose: 'cast', special: true },
  airshot:  { startup: 9,  active: 1,  recovery: 16, spawn: true, air: true, pose: 'cast', special: true },
  uppercut: { startup: 4,  active: 12, recovery: 14, dmg: 120, hitstun: 0,  blockstun: 16, push: 4,  box: [6, -250, 88, 170],  guard: 'mid', launch: [5, -17], invuln: 9, rise: [3.2, -16.5], landRecovery: 14, pose: 'upper', special: true, heavy: true },
  dash:     { startup: 9,  active: 9,  recovery: 20, dmg: 100, hitstun: 0,  blockstun: 14, push: 14, box: [16, -160, 100, 110], guard: 'mid', launch: [9, -9], move: 11, pose: 'dash', special: true, heavy: true },
  super:    { startup: 10, active: 36, recovery: 26, dmg: 52,  hitstun: 20, blockstun: 14, push: 3,  box: [16, -200, 136, 180], guard: 'mid', rehit: 6, move: 7, invuln: 14, finalLaunch: [10, -14], pose: 'super', special: true, isSuper: true },
  throw:    { startup: 4,  active: 2,  recovery: 22, dmg: 110, range: 104, pose: 'throw', isThrow: true },
};

export const TYPES = { sugar: '당', fat: '지방', salt: '소금', overeat: '과식' };

export const CHARS = {
  heart:    { id: 'heart',    name: '심장',     en: 'HEART',    kind: 'organ',   color: '#ee4a66', dark: '#8f1c36', glove: '#ffd7c4', hp: 950,  walk: 5.4, jump: 21,   air: 6.2, dmg: 1,    extraJab: true, shot: { speed: 11,  dmg: 50, w: 44, h: 36 }, strong: 'overeat', trait: '빠른 발과 4연타' },
  kidney:   { id: 'kidney',   name: '신장',     en: 'KIDNEY',   kind: 'organ',   color: '#b65f97', dark: '#6a2a58', glove: '#f3d6ec', hp: 1020, walk: 4.5, jump: 20.5, air: 5.6, dmg: 1.02, noChip: true, absorb: true, shot: { speed: 8, dmg: 60, w: 48, h: 40 }, strong: 'salt', trait: '가드 대미지 없음, 장풍을 막으면 게이지 충전' },
  liver:    { id: 'liver',    name: '간',       en: 'LIVER',    kind: 'organ',   color: '#b0603f', dark: '#63301c', glove: '#f4d9c2', hp: 1200, walk: 3.7, jump: 19.5, air: 5,   dmg: 1.16, regen: 0.07, shot: { speed: 5.5, dmg: 85, w: 70, h: 60 }, strong: 'fat', trait: '높은 체력과 재생, 느리지만 묵직한 한 방' },
  pancreas: { id: 'pancreas', name: '췌장',     en: 'PANCREAS', kind: 'organ',   color: '#f2bc55', dark: '#8f6417', glove: '#fff2cf', hp: 880,  walk: 4.7, jump: 21,   air: 6,   dmg: 0.95, airShot: true, shot: { speed: 9, dmg: 55, w: 40, h: 32, max: 2 }, strong: 'sugar', trait: '장풍 두 발, 공중 장풍' },
  soda:     { id: 'soda',     name: '탄산',     en: 'SODA',     kind: 'villain', color: '#3f9fe6', dark: '#1b4f86', glove: '#d9efff', hp: 820,  walk: 5.6, jump: 21,   air: 6.2, dmg: 0.9,  shot: { speed: 10, dmg: 45, w: 40, h: 34 }, type: 'sugar' },
  fries:    { id: 'fries',    name: '튀김',     en: 'FRIES',    kind: 'villain', color: '#dd4b33', dark: '#7c2014', glove: '#ffe29a', hp: 1150, walk: 3.6, jump: 19.5, air: 5,   dmg: 1.1,  shot: { speed: 6, dmg: 70, w: 56, h: 46 }, type: 'fat' },
  ramen:    { id: 'ramen',    name: '라면',     en: 'RAMEN',    kind: 'villain', color: '#e8833c', dark: '#84401a', glove: '#fff0d6', hp: 950,  walk: 4.4, jump: 20.5, air: 5.6, dmg: 1,    shot: { speed: 8, dmg: 50, w: 44, h: 36, max: 2 }, type: 'salt' },
  burger:   { id: 'burger',   name: '대왕버거', en: 'BIG BURGER', kind: 'villain', color: '#c98a3a', dark: '#6b4215', glove: '#ffe9c2', hp: 1350, walk: 4,   jump: 20,   air: 5.4, dmg: 1.2,  shot: { speed: 7, dmg: 75, w: 64, h: 54 }, type: 'overeat', boss: true },
};
export const ORGANS = ['heart', 'kidney', 'liver', 'pancreas'];
export const VILLAINS = ['soda', 'fries', 'ramen'];
export const BOSS = 'burger';

// 담당 장기가 그 속성 빌런에게 주는 피해 배율.
export const advantage = (attacker, defender) => (attacker.strong && attacker.strong === defender.type ? 1.2 : 1);
