// 기술마다 다른 효과. 열쇠는 '캐릭터.기술'이고, 표에 없는 기술은 fx.js의 기본 효과로 떨어진다.
// CAST: 기술을 내는 순간 · WIND: 준비 동작 틱마다 · TRAIL: 판정이 살아 있는 틱마다 · HIT: 맞은 순간.
import { T } from './toon.js';

export const MAIN = { heart: T.heart.pulse, kidney: T.kidney.water, liver: T.liver.vital, pancreas: T.pancreas.teal, soda: T.soda.fizz, fries: T.fries.oil, ramen: T.ramen.noodle, burger: T.burger.gold,
  muscle: T.muscle.power, soju: T.soju.flame, smoke: T.smoke.ember, visceral: T.visceral.fat };
export const CAST = {}, WIND = {}, TRAIL = {}, HIT = {};
// 장풍 모양(종류마다): MAKE(fx, shot, v) 처음 나올 때 부품을 단다 · TICK(fx, shot, v, x, y, dir, ticked) 매 틱 · END(fx, shot, x, y) 사라질 때.
// GRAB[캐릭터](fx, e, x0, x1, y): 필살 잡기 순간. STATUS: 상태 이상이 걸린 몸 위에 도는 표시.
export const SHOT = {}, GRAB = {};

export const TAU = Math.PI * 2, UP = Math.PI / 2;
export const rnd = (a, b) => a + Math.random() * (b - a);
// 앞쪽을 0으로 두고 위로 a만큼 든 각. 왼쪽을 볼 때는 뒤집힌다.
export const ang = (d, a) => (d > 0 ? a : Math.PI - a);
// 맞은 자리의 기본 묶음: 가시 별, 얇은 고리, 속도선, 옅은 빛.
export function smack(fx, c, pal, size = 150) {
  fx.pop('burst', pal, c.x, c.y, size * c.big, 9, { rot: rnd(0, TAU) });
  fx.ringT(pal, c.x, c.y, 40, size * 1.25 * c.big, 10, { toon: 'thin' });
  fx.linesT(pal, c.x, c.y, 5, c.fwd, 1.1, 120, 12);
  fx.flash(c.x, c.y, size * .9, pal[1], 6, .45);
}
// 마지막 한 방: 흰 네 갈래 별과 사방으로 뻗는 선.
export function finish(fx, c, pal, size = 300) {
  fx.pop('glint', T.white, c.x, c.y, size * c.big, 12);
  fx.linesT([T.white, pal], c.x, c.y, 14, 0, Math.PI, 210, 17, { thick: 16 });
  fx.ringT(pal, c.x, c.y, 60, size * 1.5, 14);
}
// 바닥에 서는 그림(기둥, 불꽃, 물마루). 밑변이 바닥에 닿게 놓는다.
export function stand(fx, shape, pal, x, size, life = 11, o = {}) {
  fx.emit({ toon: shape, pal, x, y: (o.base || 0) + size / 2, z: 44, s0: size, s1: size * 1.06, life, ...o });
}
// 몸 뒤로 남는 속도선.
export function wake(fx, c, pal, n = 2, len = 150) {
  fx.linesT(pal, c.x - c.d * 30, c.y + rnd(40, 180), n, c.fwd + Math.PI, .08, len, 4, { thick: 12 });
}
