// 정크 푸드 넷의 기술 효과. 캐릭터 시트(art/raw/<id>_moves_v1.png)의 모양과 색을 따른다.
import { T } from './toon.js';
import { CAST, WIND, TRAIL, HIT, TAU, UP, rnd, ang, smack, finish, stand, wake } from './fx_moves.js';

// ── 탄산: 크림색 거품과 방울, 빨간 병뚜껑 ──
{
  const F = T.soda.foam, Z = T.soda.fizz, C = T.soda.cap, K = T.soda.cola;
  const fizz = (fx, x, y, n = 6, a = UP, spread = 1.2, speed = 6) => { fx.sprayT('bubble', [F, Z], x, y, n, a, spread, speed, 24, { g: -.08, life: 16 }); };
  const puff = (fx, x, y, size = 150, life = 9) => fx.pop('cloud', F, x, y, size, life, { rot: rnd(-.3, .3) });

  CAST['soda.spray'] = (fx, c) => { fx.ringT(F, c.x + c.d * 40, c.y, 30, 150, 8, { toon: 'thin' }); fizz(fx, c.x + c.d * 40, c.y, 6, c.fwd, .8, 8); };
  TRAIL['soda.spray'] = (fx, c) => {
    fx.emit({ toon: 'cone', pal: c.t % 2 ? F : Z, x: c.bx - c.d * 10, y: c.by, z: 45, s0: 110, s1: 170, wide: 1.5, life: 5, rot: c.fwd + Math.PI, alpha: .9 });
    fx.sprayT('bubble', [F, Z], c.x + c.d * 40, c.by, 3, c.fwd, .5, 13, 26, { life: 12 });
    if (c.t % 3 === 0) puff(fx, c.bx + c.d * c.bw * .45, c.by + rnd(-30, 30), 110, 7);
  };
  HIT['soda.spray'] = (fx, c) => { smack(fx, c, F, 130); puff(fx, c.x, c.y, 170); fizz(fx, c.x, c.y, 6, c.fwd, 1.4, 9); if (c.fin) finish(fx, c, Z); };

  CAST['soda.rocket'] = (fx, c) => { fx.pop('burst', F, c.x - c.d * 30, 30, 220, 9); fx.floorT('splat', F, c.x, 220, 36); fizz(fx, c.x, 20, 10, UP, 2.4, 8); };
  TRAIL['soda.rocket'] = (fx, c) => {
    puff(fx, c.x - c.d * 50, c.y + 70, 120, 10);
    fx.linesT([Z, T.white], c.x - c.d * 40, c.y + rnd(40, 170), 2, ang(c.d, .62) + Math.PI, .1, 200, 5, { thick: 12 });
    if (c.t % 2) fx.sprayT('bubble', [F, Z], c.x - c.d * 50, c.y + 60, 2, ang(c.d, .62) + Math.PI, .7, 6, 26);
  };
  HIT['soda.rocket'] = (fx, c) => { smack(fx, c, Z, 170); fx.pop('glint', T.white, c.x, c.y, 260, 9); fizz(fx, c.x, c.y, 8, 0, Math.PI, 10); if (c.fin) finish(fx, c, Z); };

  WIND['soda.burst'] = (fx, c) => { if (c.t % 2) fizz(fx, c.x + rnd(-40, 40), c.y + 60, 2, UP, .5, 7); };
  CAST['soda.burst'] = (fx, c) => { fx.ringT(Z, c.x, c.y, 200, 50, 6, { toon: 'thin' }); };
  TRAIL['soda.burst'] = (fx, c) => {
    if (c.first) { stand(fx, 'pillar', F, c.x, 310, 12, { wide: .6 }); fx.pop('spikes', Z, c.x, c.y + 110, 300, 9, { z: 30 }); fx.floorT('ring', F, c.x, 380, 12, { spread: .3 }); fx.floorT('splat', F, c.x, 300, 46); puff(fx, c.x, 300, 200, 12); }
    fizz(fx, c.x + rnd(-70, 70), rnd(40, 260), 4, UP, 1.6, 9);
  };
  HIT['soda.burst'] = (fx, c) => { smack(fx, c, F, 190); fx.linesT([F, T.white], c.x, c.y, 8, UP, .9, 180, 14); if (c.fin) finish(fx, c, Z); };

  CAST['soda.slip'] = (fx, c) => { puff(fx, c.x - c.d * 30, 40, 150); fx.linesT(F, c.x, 50, 4, c.fwd + Math.PI, .2, 170, 8); };
  TRAIL['soda.slip'] = (fx, c) => {
    fx.floorT('splat', F, c.x - c.d * 20, 150, 34, { alpha: .9, rot: rnd(0, TAU) });
    if (c.t % 2) puff(fx, c.x - c.d * 40, 34, 100, 8);
    fx.sprayT('bubble', [F, Z], c.x - c.d * 30, 24, 2, c.fwd + Math.PI - c.d * .7, .6, 6, 22, { g: -.05 });
    wake(fx, c, [F, T.white], 1, 190);
  };

  CAST['soda.capshot'] = (fx, c) => { fx.pop('glint', C, c.x + c.d * 30, c.y - 30, 150, 7); fx.slashT(F, c.x + c.d * 10, c.y, 190, ang(c.d, -.6), 8); fizz(fx, c.x, c.y, 4, c.fwd, 1, 6); };
  HIT['soda.cap'] = (fx, c) => { smack(fx, c, C, 180); puff(fx, c.x, c.y, 200); fx.chunks(['cap', 'glint'], [C, F], c.x, c.y, 4, 30, 10); fizz(fx, c.x, c.y, 8, 0, Math.PI, 9); if (c.fin) finish(fx, c, C); };

  CAST['soda.dive'] = (fx, c) => { fx.ringT(Z, c.x, c.y, 40, 190, 8, { toon: 'thin' }); fx.pop('glint', T.white, c.x + c.d * 30, c.y - 60, 120, 6); };
  TRAIL['soda.dive'] = (fx, c) => {
    if (c.t % 2) fx.slashT(c.t % 4 === 1 ? F : Z, c.bx, c.by + 10, 170, ang(c.d, -.9), 6, { alpha: .85 });
    fx.linesT([F, T.white], c.x - c.d * 30, c.y + rnd(20, 110), 2, ang(c.d, -.9) + Math.PI, .1, 210, 5, { thick: 12 });
    if (c.t % 3 === 0) fizz(fx, c.x - c.d * 30, c.y + 50, 2, ang(c.d, -.9) + Math.PI, .6, 5);
  };
  HIT['soda.dive'] = (fx, c) => { smack(fx, c, Z, 170); fx.slashT(F, c.x, c.y, 250, ang(c.d, -.9), 9); fx.floorT('ring', F, c.x, 260, 10, { spread: .3 }); fizz(fx, c.x, c.y, 7, UP, 2, 9); if (c.fin) finish(fx, c, Z); };

  CAST['soda.super'] = (fx, c) => { fx.ringT(F, c.x, c.y, 500, 60, 16, { toon: 'thin' }); fx.ringT(Z, c.x, c.y, 380, 40, 16, { delay: 6, toon: 'thin' }); fx.floorT('ring', F, c.x + c.d * 106, 420, 30, { spread: .15 }); for (let i = 0; i < 3; i++) fizz(fx, c.x + c.d * 106 + rnd(-60, 60), 20, 5, UP, .8, 8 + i * 3); };
  TRAIL['soda.super'] = (fx, c) => {
    const x = c.bx;
    if (c.t % 5 === 1) { stand(fx, 'pillar', c.t % 10 === 1 ? F : Z, x, 470, 9, { wide: .5 }); puff(fx, x + rnd(-70, 70), 430 + rnd(-30, 40), 230, 10); }
    if (c.first) { fx.floorT('splat', F, x, 420, 70); fx.floorT('spikes', F, x, 520, 14, { spread: .3 }); }
    fizz(fx, x + rnd(-80, 80), rnd(60, 420), 5, UP, 1.5, 11);
    fx.linesT([F, T.white], x + rnd(-50, 50), rnd(40, 200), 2, UP, .12, 260, 16, { thick: 14 });
    if (c.t % 6 === 0) fx.floorT('ring', F, x, 460, 10, { spread: .3 });
  };
  HIT['soda.super'] = (fx, c) => { smack(fx, c, F, 170); fizz(fx, c.x, c.y, 5, UP, 1.6, 12); if (c.fin) { finish(fx, c, Z, 380); puff(fx, c.x, c.y + 120, 420, 14); fx.chunks(['bubble', 'cap'], [F, C], c.x, c.y, 10, 30, 13); } };
}

// ── 감자튀김: 금빛 기름과 튀김 조각, 주황 불꽃 ──
{
  const O = T.fries.oil, R = T.fries.fire, Y = T.fries.fry;
  const oil = (fx, x, y, n = 6, a = UP, spread = 1.4, speed = 8) => fx.sprayT('drop', [O, Y], x, y, n, a, spread, speed, 24, { g: .45 });
  const sticks = (fx, x, y, n = 4, speed = 10) => fx.chunks('fry', [Y, O], x, y, n, 44, speed);
  const upright = (fx, shape, pal, x, y, size, life, o = {}) => fx.emit({ toon: shape, pal, x, y, z: 45, s0: size * .5, s1: size, snap: true, rot: UP, life, ...o });

  CAST['fries.darts'] = (fx, c) => { fx.pop('glint', R, c.x + c.d * 60, c.y - 10, 150, 7); fx.linesT([R, Y], c.x + c.d * 60, c.y - 10, 6, c.fwd, .5, 200, 14, { thick: 12 }); fx.ringT(Y, c.x + c.d * 60, c.y - 10, 30, 130, 8, { toon: 'thin' }); };
  HIT['fries.fry'] = (fx, c) => { smack(fx, c, Y, 140); sticks(fx, c.x, c.y, 3, 9); fx.linesT(R, c.x, c.y, 4, c.fwd, .8, 130, 12); if (c.fin) finish(fx, c, R); };

  CAST['fries.slide'] = (fx, c) => { fx.floorT('splat', O, c.x, 240, 40); oil(fx, c.x, 20, 6, c.fwd + Math.PI - c.d * .8, .8, 8); };
  TRAIL['fries.slide'] = (fx, c) => {
    fx.floorT('splat', O, c.x - c.d * 10, 170, 40, { rot: rnd(0, TAU), alpha: .9 });
    fx.emit({ toon: 'lance', pal: O, x: c.x - c.d * 60, y: 26, z: 44, s0: 60, s1: 40, wide: 4.2, rot: c.fwd + Math.PI, life: 5, alpha: .85 });
    oil(fx, c.x + c.d * 50, 16, 2, ang(c.d, .9), .5, 9);
    if (c.t % 2) fx.pop('glint', T.white, c.x + c.d * rnd(-80, 60), rnd(8, 40), 60, 5);
  };
  HIT['fries.slide'] = (fx, c) => { smack(fx, c, O, 140); oil(fx, c.x, c.y, 8, UP, 1.6, 10); if (c.fin) finish(fx, c, O); };

  CAST['fries.spear'] = (fx, c) => { fx.floorT('ring', O, c.x + c.d * 60, 200, 8, { spread: .25 }); fx.dust(c.x + c.d * 60, 5, 40, 34); };
  TRAIL['fries.spear'] = (fx, c) => {
    if (c.first) {
      // 가운데가 가장 긴 튀김 다섯 가닥이 부채꼴로 솟는다.
      for (let i = -2; i <= 2; i++) { const len = 340 - Math.abs(i) * 62; upright(fx, 'fry', i % 2 ? O : Y, c.bx + i * 30, len / 2, 104, 11, { wide: len / 104, delay: Math.abs(i), rot: UP - i * .09 }); }
      fx.pop('glint', T.white, c.bx, 335, 180, 8, { delay: 1 }); fx.floorT('splat', O, c.bx, 260, 44); fx.floorT('spikes', O, c.bx, 300, 11, { spread: .3 });
      fx.chunks('rock', [T.liver.rock, Y], c.bx, 20, 6, 26, 11); oil(fx, c.bx, 30, 10, UP, 1.8, 12);
    }
    fx.linesT([Y, T.white], c.bx + rnd(-40, 40), rnd(40, 240), 2, UP, .1, 220, 15, { thick: 12 });
  };
  HIT['fries.spear'] = (fx, c) => { smack(fx, c, Y, 180); fx.slashT(O, c.x, c.y, 260, UP, 9); sticks(fx, c.x, c.y, 3); if (c.fin) finish(fx, c, R); };

  CAST['fries.flap'] = (fx, c) => { fx.slashT(Y, c.x + c.d * 50, c.y, 240, c.fwd, 8); fx.pop('glint', R, c.x + c.d * 70, c.y + 60, 120, 6); };
  TRAIL['fries.flap'] = (fx, c) => {
    if (c.t % 2) fx.slashT(c.t % 4 === 1 ? R : Y, c.bx - c.d * 10, c.by, 270, c.fwd + (c.t % 4 === 1 ? .9 : -.9) * c.d, 6, { alpha: .9 });
    if (c.t % 3 === 0) sticks(fx, c.bx, c.by, 1, 8);
    fx.linesT(R, c.bx, c.by + rnd(-80, 80), 1, c.fwd, .3, 150, 13);
  };
  HIT['fries.flap'] = (fx, c) => { smack(fx, c, R, 150); fx.ringT(Y, c.x, c.y, 40, 200, 8, { toon: 'thin' }); if (c.fin) { finish(fx, c, R); sticks(fx, c.x, c.y, 5, 12); } };

  CAST['fries.drop'] = (fx, c) => { fx.pop('drop', O, c.x + c.d * 50, c.y + 70, 110, 8); oil(fx, c.x + c.d * 50, c.y + 60, 7, ang(c.d, .9), .5, 13); fx.slashT(O, c.x + c.d * 30, c.y + 40, 190, ang(c.d, .8), 8, { alpha: .8 }); };
  HIT['fries.puddle'] = (fx, c) => { fx.pop('splat', O, c.x, 30, 190, 9); oil(fx, c.x, 20, 7, UP, 1.8, 9); fx.pop('glint', T.white, c.x, 50, 110, 6); };

  WIND['fries.ignite'] = (fx, c) => { if (c.t % 3 === 0) fx.pop('glint', R, c.x + c.d * rnd(40, 80), c.y + rnd(60, 130), 70, 5); };
  CAST['fries.ignite'] = (fx, c) => { fx.pop('glint', T.white, c.x + c.d * 60, c.y - 30, 170, 8); fx.linesT([R, Y], c.x + c.d * 60, c.y - 30, 7, ang(c.d, -.5), .6, 170, 13, { thick: 12 }); };
  HIT['fries.flame'] = (fx, c) => {
    smack(fx, c, R, 170); stand(fx, 'flame', R, c.x, 230 * c.big, 9); fx.chunks('glint', [R, Y], c.x, c.y, 5, 22, 10);
    if (c.fin) { finish(fx, c, R, 340); stand(fx, 'flame', R, c.x, 420, 14); }
  };

  CAST['fries.super'] = (fx, c) => { fx.ringT(O, c.x, c.y, 480, 60, 16, { toon: 'thin' }); fx.floorT('splat', O, c.x, 420, 70); for (let i = 0; i < 3; i++) stand(fx, 'crest', O, c.x - c.d * (40 + i * 60), 150 + i * 40, 12, { delay: i * 4, flip: c.d < 0, z: 30 }); sticks(fx, c.x, 80, 8, 13); };
  TRAIL['fries.super'] = (fx, c) => {
    if (c.t % 2) { stand(fx, 'crest', c.t % 4 === 1 ? O : Y, c.x - c.d * 90, 240, 3, { flip: c.d < 0, z: 24 }); stand(fx, 'crest', O, c.x + c.d * 70, 120, 6, { flip: c.d < 0, z: 52 }); }
    fx.floorT('splat', O, c.x - c.d * 60, 260, 50, { rot: rnd(0, TAU), alpha: .9 });
    if (c.t % 3 === 0) sticks(fx, c.x + rnd(-60, 60), rnd(120, 300), 2, 9);
    oil(fx, c.x + c.d * 60, 40, 3, ang(c.d, 1), .8, 12);
    wake(fx, c, [O, T.white], 2, 260);
  };
  HIT['fries.super'] = (fx, c) => { smack(fx, c, O, 170); oil(fx, c.x, c.y, 6, UP, 1.6, 11); if (c.fin) { finish(fx, c, R, 380); stand(fx, 'crest', O, c.x - c.d * 110, 300, 14, { flip: c.d < 0, z: 24 }); sticks(fx, c.x, c.y, 10, 14); } };
}

// ── 라면: 금빛 면발과 젓가락 줄, 흰 김, 호박색 국물, 고명 ──
{
  const N = T.ramen.noodle, S = T.ramen.steam, B = T.ramen.broth, L = T.ramen.leek;
  const steam = (fx, x, y, n = 2, size = 110) => { for (let i = 0; i < n; i++) fx.emit({ toon: 'swirl', pal: S, x: x + rnd(-30, 30), y: y + rnd(-20, 20), z: 43, s0: size * .5, s1: size, vy: rnd(1.5, 3), life: rnd(14, 20), rot: rnd(0, TAU), spin: rnd(-.08, .08), alpha: .85 }); };
  const toppings = (fx, x, y, n = 4, speed = 10) => fx.chunks(['cake', 'scallion', 'scallion'], [T.white, L, L], x, y, n, 30, speed);
  const sticks = (fx, c, n = 2) => fx.linesT([N, T.white], c.bx - c.d * c.bw * .4, c.by + rnd(-.5, .5) * c.bh, n, c.fwd, .06, c.bw * 1.1, 16, { thick: 16, life: 5 });

  WIND['ramen.whip'] = (fx, c) => { if (c.t % 4 === 0) fx.slashT(N, c.x - c.d * 30, c.y + 150, 150, ang(c.d, 2.2), 6, { alpha: .7 }); };
  CAST['ramen.whip'] = (fx, c) => { steam(fx, c.x, c.y + 40, 2); };
  TRAIL['ramen.whip'] = (fx, c) => {
    if (c.first) { fx.link('noodle', N, c.x + c.d * 30, c.by, c.x + c.d * (36 + c.bw), c.by, 120, 9); fx.pop('glint', T.white, c.x + c.d * (40 + c.bw), c.by, 190, 8); toppings(fx, c.x + c.d * (c.bw * .7), c.by, 3, 7); }
    if (c.t % 2) steam(fx, c.bx + rnd(-.4, .4) * c.bw, c.by + 20, 1, 80);
  };
  HIT['ramen.whip'] = (fx, c) => { smack(fx, c, N, 160); fx.linesT([N, T.white], c.x, c.y, 6, c.fwd + Math.PI, .5, 190, 14); steam(fx, c.x, c.y, 2); if (c.fin) finish(fx, c, N); };

  CAST['ramen.stab'] = (fx, c) => { fx.pop('glint', N, c.x + c.d * 50, c.y, 130, 6); fx.dust(c.x, 4, 34, 30); };
  TRAIL['ramen.stab'] = (fx, c) => {
    sticks(fx, c, 2);
    fx.emit({ toon: 'lance', pal: c.t % 2 ? N : T.white, x: c.bx + rnd(-.2, .2) * c.bw, y: c.by + rnd(-.5, .5) * c.bh, z: 46, s0: 44, s1: 28, wide: 4.6, rot: c.fwd, life: 4 });
    if (c.t % 4 === 0) fx.pop('glint', T.white, c.bx + c.d * c.bw / 2, c.by + rnd(-30, 30), 100, 5);
  };
  HIT['ramen.stab'] = (fx, c) => { smack(fx, c, N, 120); if (c.fin) { finish(fx, c, N); toppings(fx, c.x, c.y, 5, 12); } };

  CAST['ramen.riser'] = (fx, c) => { fx.dust(c.x, 5, 40, 34); fx.floorT('ring', N, c.x, 200, 8, { spread: .3 }); };
  TRAIL['ramen.riser'] = (fx, c) => {
    if (c.t % 3 === 1) fx.slashT(c.t % 2 ? N : T.white, c.bx, c.by + 10, 280, ang(c.d, 1.15), 7, { alpha: .9 });
    steam(fx, c.x + c.d * 30, c.y + 60, 1, 90);
    fx.linesT(N, c.x + c.d * 20, c.y + rnd(20, 120), 1, UP, .1, 190, 5);
  };
  HIT['ramen.riser'] = (fx, c) => { smack(fx, c, N, 170); fx.slashT(N, c.x, c.y, 300, ang(c.d, 1.2), 9); steam(fx, c.x, c.y + 40, 3, 120); if (c.fin) finish(fx, c, N); };

  CAST['ramen.steam'] = (fx, c) => { fx.pop('cloud', S, c.x + c.d * 110, c.y + 10, 240, 12); steam(fx, c.x + c.d * 110, c.y, 6, 150); fx.ringT(S, c.x + c.d * 60, c.y, 30, 200, 10, { toon: 'thin' }); };
  HIT['ramen.steam'] = (fx, c) => { fx.pop('cloud', S, c.x, c.y, 200, 9); steam(fx, c.x, c.y, 4, 130); fx.pop('glint', T.white, c.x, c.y, 130, 6); if (c.fin) finish(fx, c, S); };

  CAST['ramen.reel'] = (fx, c) => { fx.pop('glint', N, c.x + c.d * 40, c.y + 60, 130, 7); fx.slashT(N, c.x, c.y + 80, 200, ang(c.d, 1.6), 8, { alpha: .8 }); };
  TRAIL['ramen.reel'] = (fx, c) => { if (c.first) { fx.link('lasso', N, c.x + c.d * 30, c.y + 130, c.x + c.d * 290, c.y + 130, 110, 9); fx.linesT([N, T.white], c.x + c.d * 60, c.y + 130, 3, c.fwd, .08, 240, 18); } };
  HIT['ramen.slam'] = (fx, c) => {
    fx.pop('burst', N, c.x, 50, 300 * c.big, 10); fx.floorT('spikes', N, c.x, 380, 12, { spread: .3 }); fx.floorT('crater', T.liver.rock, c.x, 250, 60);
    toppings(fx, c.x, 40, 7, 12); steam(fx, c.x, 60, 4, 140); fx.linesT([N, T.white], c.x, 30, 10, UP, 1.3, 200, 15);
    if (c.fin) finish(fx, { ...c, y: 80 }, N);
  };

  CAST['ramen.broth'] = (fx, c) => { fx.floorT('splat', B, c.x + c.d * 60, 230, 40); fx.sprayT('drop', [B, N], c.x + c.d * 50, 40, 8, ang(c.d, .9), .7, 10, 26, { g: .45 }); toppings(fx, c.x + c.d * 60, 50, 3, 8); };
  HIT['ramen.broth'] = (fx, c) => { smack(fx, c, B, 150); fx.pop('splat', B, c.x, c.y, 220, 9); fx.sprayT('drop', [B, N], c.x, c.y, 8, UP, 1.8, 10, 26, { g: .45 }); toppings(fx, c.x, c.y, 3); if (c.fin) finish(fx, c, B); };

  CAST['ramen.super'] = (fx, c) => { fx.ringT(N, c.x, c.y, 500, 60, 16, { toon: 'thin' }); fx.floorT('ring', N, c.x + c.d * 150, 460, 30, { spread: .15 }); steam(fx, c.x, c.y, 6, 160); };
  TRAIL['ramen.super'] = (fx, c) => {
    const x = c.bx, a = c.t * .7;
    // 아래가 좁고 위가 넓은 면발 띠를 층층이 쌓아 회오리로 만든다.
    for (let i = 0; i < 6; i++) { const w = 120 + i * 48; fx.emit({ toon: 'noodle', pal: (i + c.t) % 3 ? N : T.white, x: x + Math.cos(a + i * 1.3) * (14 + i * 7), y: 26 + i * 50, z: 44 + Math.sin(a + i * 1.3) * 8, s0: 78, s1: 86, wide: w / 78, rot: Math.sin(a + i) * .12, life: 3, flip: (i + c.t) % 2 === 0 }); }
    if (c.t % 3 === 0) fx.emit({ toon: 'swirl', pal: N, x, y: 200, z: 30, s0: 380, s1: 440, rot: a, life: 6, alpha: .7 });
    if (c.t % 4 === 0) { toppings(fx, x + rnd(-90, 90), rnd(80, 320), 2, 9); steam(fx, x + rnd(-110, 110), rnd(240, 380), 2, 150); }
    if (c.t % 6 === 0) fx.floorT('ring', N, x, 480, 10, { spread: .3 });
    fx.linesT([N, T.white], x - c.d * rnd(120, 200), rnd(40, 300), 1, c.fwd, .1, 190, 16, { thick: 12 });
  };
  HIT['ramen.super'] = (fx, c) => { smack(fx, c, N, 160); if (c.fin) { finish(fx, c, N, 380); fx.pop('swirl', N, c.x, c.y, 460, 14); toppings(fx, c.x, c.y, 10, 14); } };
}

// ── 버거: 금빛 충격과 날아가는 재료(참깨·양상추·토마토·치즈), 무게가 남기는 구덩이 ──
{
  const G = T.burger.gold, L = T.burger.lettuce, M = T.burger.tomato, H = T.burger.cheese, S = T.burger.seed, K = T.burger.rock;
  const fixings = (fx, x, y, n = 6, speed = 11) => fx.chunks(['seed', 'seed', 'leaf', 'tomato', 'cheese'], [S, S, L, M, H], x, y, n, 30, speed);
  const quake = (fx, x, size = 380, life = 12) => { fx.floorT('spikes', G, x, size, life, { spread: .3 }); fx.floorT('crater', K, x, size * .62, 70); fx.chunks('rock', [K, G], x, 14, 5, 26, 10); fx.dust(x, 8, size * .2, 60); };

  WIND['burger.hammer'] = (fx, c) => { if (c.t % 5 === 0) fx.ringT(G, c.x, c.y + 250, 200, 50, 6, { toon: 'thin' }); };
  CAST['burger.hammer'] = (fx, c) => { fx.pop('glint', G, c.x, c.y + 130, 170, 8); };
  TRAIL['burger.hammer'] = (fx, c) => {
    if (!c.first) return;
    const x = c.x + c.d * 100;
    fx.slashT(G, c.x + c.d * 70, c.y + 150, 330, ang(c.d, -1.1), 9);
    fx.pop('burst', G, x, 40, 300, 10); quake(fx, x, 400); fixings(fx, x, 30, 7, 13); fx.linesT([G, T.white], x, 20, 10, UP, 1.3, 210, 15);
  };
  HIT['burger.hammer'] = (fx, c) => { smack(fx, c, G, 220); fixings(fx, c.x, c.y, 4); finish(fx, c, G, 280); };

  // 떨어지는 동안: 배 밑에 아래로 휜 초승달 압력파, 몸 뒤로 굵은 세로 잔상.
  const plummet = (fx, c, size, n) => {
    fx.emit({ toon: 'arc', pal: c.t % 2 ? G : T.white, x: c.x, y: c.y + 6, z: 96, s0: size * .42, s1: size * .5, wide: 2.1, life: 2, rot: -UP });
    for (let i = 0; i <= n + 1; i++) fx.emit({ toon: 'lance', pal: i % 2 ? T.white : G, x: c.x + rnd(-.34, .34) * size, y: c.y + rnd(250, 360), z: 30, s0: 70, s1: 40, wide: size / 80, rot: -UP, life: 5, vy: 6 });
    if (c.t % 3 === 0) fixings(fx, c.x, c.y + 120, 2, 7);
  };
  CAST['burger.press'] = (fx, c) => { fx.floorT('ring', G, c.x, 300, 10, { spread: .3 }); fx.dust(c.x, 8, 60, 50); fx.linesT([G, T.white], c.x, c.y, 5, UP, .25, 200, 14); };
  TRAIL['burger.press'] = (fx, c) => {
    if (c.f.vy <= 0) return;
    plummet(fx, c, 300, 1);
  };
  HIT['burger.press'] = (fx, c) => { smack(fx, c, G, 220); fixings(fx, c.x, c.y, 5, 12); if (c.fin) finish(fx, c, G); };

  CAST['burger.lid'] = (fx, c) => { fx.dust(c.x, 5, 40, 36); fx.pop('glint', G, c.x + c.d * 30, c.y + 40, 150, 7); };
  TRAIL['burger.lid'] = (fx, c) => {
    if (c.first) {
      fx.slashT(G, c.bx, c.by - 40, 360, ang(c.d, 1.25), 10); fx.pop('glint', T.white, c.bx, c.by + c.bh * .4, 220, 9);
      fixings(fx, c.bx, c.by, 6, 13); fx.sprayT('drop', [H, G], c.bx, c.by, 7, UP, .7, 9, 30, { g: .4 });
    }
    fx.linesT([G, T.white], c.bx + rnd(-40, 40), c.by + rnd(-100, 60), 1, UP, .1, 200, 14);
  };
  HIT['burger.lid'] = (fx, c) => { smack(fx, c, G, 190); fx.slashT(H, c.x, c.y, 280, ang(c.d, 1.3), 9); fixings(fx, c.x, c.y, 4); if (c.fin) finish(fx, c, G); };

  WIND['burger.roar'] = (fx, c) => { if (c.t % 4 === 0) fx.ringT(G, c.x, c.y + 140, 260, 60, 6, { toon: 'thin' }); };
  CAST['burger.roar'] = (fx, c) => { fx.floorT('ring', G, c.x, 420, 12, { spread: .3 }); };
  TRAIL['burger.roar'] = (fx, c) => {
    if (c.first) {
      // 양옆으로 점점 커지며 퍼지는 소리 물결 네 겹.
      for (const s of [1, -1]) for (let i = 0; i < 4; i++) fx.emit({ toon: 'sonic', pal: i % 2 ? T.white : G, x: c.x + s * (50 + i * 16), y: c.y + 140, z: 46, vx: s * (7 + i * 1.5), drag: .93, s0: 110 + i * 60, s1: 170 + i * 90, life: 12 + i * 2, delay: i * 2, flip: s < 0 });
      fx.pop('spikes', G, c.x, c.y + 140, 300, 8, { z: 30 }); fx.dust(c.x, 10, 120, 70);
    }
    if (c.t % 2) fx.linesT([G, T.white], c.x, c.y + 140, 3, 0, Math.PI, 220, 16);
  };
  HIT['burger.roar'] = (fx, c) => { smack(fx, c, G, 190); if (c.fin) finish(fx, c, G); };

  CAST['burger.grab'] = (fx, c) => { fx.pop('glint', H, c.x + c.d * 60, c.y + 20, 150, 7); fx.sprayT('drop', [H], c.x + c.d * 50, c.y, 4, c.fwd, .5, 8, 28, { g: .3 }); };
  HIT['burger.slam'] = (fx, c) => {
    fx.pop('burst', G, c.x, 50, 320 * c.big, 10); quake(fx, c.x, c.sup ? 520 : 400); fx.floorT('splat', H, c.x, 260, 60);
    fixings(fx, c.x, 40, 8, 13); fx.sprayT('drop', [H], c.x, 40, 8, UP, 1.5, 10, 30, { g: .45 });
    if (c.fin) finish(fx, { ...c, y: 80 }, G);
  };

  CAST['burger.roll'] = (fx, c) => { fx.dust(c.x, 8, 60, 50); fx.floorT('ring', G, c.x, 280, 9, { spread: .3 }); };
  TRAIL['burger.roll'] = (fx, c) => {
    const a = -c.d * c.t * .7;
    if (c.t % 2) fx.emit({ toon: 'swirl', pal: c.t % 4 === 1 ? G : T.white, x: c.x, y: c.y + 100, z: 30, s0: 300, s1: 320, rot: a, life: 4, alpha: .85, flip: c.d < 0 });
    if (c.t % 3 === 0) { fx.slashT(G, c.x + c.d * 40, c.y + 100, 250, a, 5, { alpha: .9 }); fx.pop('cloud', T.dust, c.x - c.d * 90, 36, 120, 9, { z: 40 }); }
    wake(fx, c, [G, T.white], 2, 190);
    if (c.t % 6 === 0) fx.chunks(['seed', 'tomato'], [S, M], c.x, 30, 2, 28, 8);
  };
  HIT['burger.roll'] = (fx, c) => { smack(fx, c, G, 200); fixings(fx, c.x, c.y, 3); if (c.fin) finish(fx, c, G); };

  CAST['burger.super'] = (fx, c) => { fx.floorT('spikes', G, c.x, 520, 14, { spread: .3 }); fx.linesT([G, T.white], c.x, c.y, 14, UP, .3, 300, 18, { thick: 16 }); fx.dust(c.x, 12, 100, 80); };
  TRAIL['burger.super'] = (fx, c) => {
    if (c.f.vy <= 0) { fx.linesT([G, T.white], c.x + rnd(-60, 60), c.y, 2, -UP, .1, 220, 8); return; }
    plummet(fx, c, 400, 2);
    if (c.t % 4 === 0) fx.floorT('ring', T.white, c.x, 380, 6, { spread: -.25, alpha: .8 });
  };
  HIT['burger.super'] = (fx, c) => { smack(fx, c, G, 260); fixings(fx, c.x, c.y, 8, 15); if (c.fin) { finish(fx, c, G, 420); fx.pop('spikes', T.white, c.x, 60, 520, 14, { z: 30 }); } };
}
