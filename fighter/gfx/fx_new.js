// 2026-11-13 새 캐릭터 넷(근육·소주·담배·내장지방)의 기술 효과와 장풍 모양, 상태 이상 표시.
// 형식은 fx_villains.js와 같다. 캐릭터 시트(art/raw/<id>_sheet_v1.png)의 색과 소품을 따른다.
import * as THREE from '../../vendor/three.module.js';
import { T } from './toon.js';
import { CAST, WIND, TRAIL, HIT, SHOT, GRAB, TAU, UP, rnd, ang, smack, finish, stand, wake } from './fx_moves.js';

const pick = list => list[Math.floor(Math.random() * list.length)];

// ── 근육: 청록 기합, 금빛 별, 땀방울, 쇳덩이 ──
{
  const P = T.muscle.power, H = T.muscle.heat, W = T.muscle.sweat, I = T.muscle.iron, G = T.muscle.gold;
  const sweat = (fx, x, y, n = 4) => fx.sprayT('drop', [W], x, y, n, UP, 1.2, 7, 18, { g: .4 });
  const stars = (fx, x, y, n = 4, size = 34) => fx.chunks('star5', [G, T.white], x, y, n, size, 9);

  CAST['muscle.lariat'] = (fx, c) => { fx.dust(c.x, 5, 40, 40); fx.pop('glint', P, c.x + c.d * 60, c.y + 150, 140, 7); sweat(fx, c.x, c.y + 170, 3); };
  TRAIL['muscle.lariat'] = (fx, c) => {
    if (c.t % 2) fx.slashT(c.t % 4 === 1 ? P : T.white, c.bx, c.by, 230, ang(c.d, -.25), 6, { alpha: .9 });
    wake(fx, c, [P, T.white], 2, 170);
    if (c.t % 3 === 0) fx.dust(c.x - c.d * 30, 2, 26, 30);
  };
  HIT['muscle.lariat'] = (fx, c) => { smack(fx, c, P, 190); fx.pop('star5', G, c.x, c.y + 20, 150, 9, { rot: rnd(-.4, .4) }); sweat(fx, c.x, c.y, 5); if (c.fin) finish(fx, c, P); };

  CAST['muscle.dropkick'] = (fx, c) => { fx.floorT('ring', P, c.x, 220, 9, { spread: .3 }); fx.dust(c.x, 6, 50, 44); };
  TRAIL['muscle.dropkick'] = (fx, c) => {
    fx.linesT([P, T.white], c.x - c.d * 40, c.y + rnd(60, 170), 2, c.fwd + Math.PI, .08, 200, 5, { thick: 12 });
    if (c.t % 3 === 1) fx.emit({ toon: 'lance', pal: P, x: c.bx, y: c.by, z: 46, s0: 60, s1: 40, wide: 3.4, rot: c.fwd, life: 5 });
  };
  HIT['muscle.dropkick'] = (fx, c) => { smack(fx, c, P, 210); fx.pop('spikes', H, c.x, c.y, 260, 10); stars(fx, c.x, c.y, 4); if (c.fin) finish(fx, c, P); };

  CAST['muscle.bomb'] = (fx, c) => { fx.pop('glint', T.white, c.x + c.d * 70, c.y + 210, 150, 7); fx.linesT([P, T.white], c.x + c.d * 50, c.y + 200, 4, UP, .5, 130, 8); };
  CAST['muscle.super'] = (fx, c) => { fx.ringT(P, c.x, c.y, 520, 60, 16, { toon: 'thin' }); fx.pop('star5', G, c.x, c.y + 60, 300, 14); fx.dust(c.x, 10, 80, 60); };
  // 잡아 돌리는 동안: 둘레에 바람 고리와 속도선이 감긴다.
  WIND['muscle.slamSpin'] = (fx, c) => {
    if (c.t % 3 === 0) fx.ringT(c.t % 6 ? P : T.white, c.x, c.y + 100, 120, 340, 7, { toon: 'thin' });
    fx.linesT([P, T.white], c.x + rnd(-120, 120), c.y + rnd(40, 200), 2, c.t * .7, .3, 170, 6, { thick: 12 });
    if (c.t % 5 === 0) { fx.dust(c.x, 4, 90, 50); sweat(fx, c.x, c.y + 180, 2); }
  };
  HIT['muscle.slam'] = (fx, c) => {
    const big = c.sup ? 1.5 : 1;
    fx.pop('burst', P, c.x, 50, 340 * big, 11); fx.floorT('spikes', P, c.x, 460 * big, 13, { spread: .3 }); fx.floorT('crater', T.burger.rock, c.x, 300 * big, 70);
    stars(fx, c.x, 60, c.sup ? 9 : 5, 40); sweat(fx, c.x, 80, 6); fx.linesT([P, T.white], c.x, 30, 12, UP, 1.3, 220, 15);
    if (c.fin || c.sup) finish(fx, { ...c, y: 90 }, P, c.sup ? 420 : 300);
  };

  CAST['muscle.tackle'] = (fx, c) => { fx.dust(c.x, 6, 50, 50); fx.pop('burst', H, c.x - c.d * 40, c.y + 60, 160, 7); };
  TRAIL['muscle.tackle'] = (fx, c) => { wake(fx, c, [H, T.white], 2, 190); if (c.t % 2) fx.dust(c.x - c.d * 20, 2, 30, 34); if (c.t % 3 === 0) fx.ringT(H, c.bx, c.by, 60, 160, 6, { toon: 'thin' }); };
  HIT['muscle.tackle'] = (fx, c) => { smack(fx, c, H, 200); sweat(fx, c.x, c.y, 4); if (c.fin) finish(fx, c, H); };

  CAST['muscle.dumbbell'] = (fx, c) => { fx.pop('glint', I, c.x + c.d * 30, c.y + 210, 130, 6); fx.slashT(I, c.x, c.y + 150, 200, ang(c.d, 1.2), 8, { alpha: .8 }); };
  SHOT.dumbbell = {
    make: (fx, shot, v) => { v.spr = fx.toonSprite('dumbbell', I, 96); v.group.add(v.spr); },
    tick: (fx, shot, v, x, y, dir, ticked) => { v.spr.material.rotation = -dir * shot.age * .3; if (ticked && shot.age % 3 === 0) fx.linesT(I, x - dir * 30, y, 1, dir > 0 ? Math.PI : 0, .2, 90, 3, { thick: 10 }); },
    end: (fx, shot, x, y) => { fx.floorT('crater', T.burger.rock, x, 200, 50); fx.dust(x, 6, 50, 44); fx.chunks('rock', [T.burger.rock], x, 14, 4, 22, 9); },
  };
  HIT['muscle.dumbbell'] = (fx, c) => { smack(fx, c, I, 200); stars(fx, c.x, c.y, 4); fx.pop('dumbbell', I, c.x, c.y + 40, 120, 10, { rot: rnd(-1, 1) }); if (c.fin) finish(fx, c, I); };

  // 펌프업: 근육이 부풀며 청록 기합이 터지고 금빛 별이 튄다.
  GRAB['@buff'] = (fx, e, x, y) => {
    fx.ringT(P, x, y, 300, 70, 12, { toon: 'thin' }); fx.pop('spikes', P, x, y - 10, 240, 10, { z: 20 }); fx.pop('star5', G, x, y + 150, 90, 12);
    fx.chunks('star5', [G, T.white], x, y + 40, 6, 34, 10); fx.sprayT('drop', [W], x, y + 50, 8, UP, 1.6, 9, 18, { g: .4 });
    fx.floorT('ring', P, x, 360, 14, { spread: .3 }); fx.linesT([P, T.white], x, y, 10, UP, 1.4, 200, 12, { thick: 14 });
  };
}

// ── 소주: 파란 불길, 초록 유리, 술방울과 빨개진 볼 ──
{
  const F = T.soju.flame, G = T.soju.glass, D = T.soju.drink, B = T.soju.blush;
  const drops = (fx, x, y, n = 5, a = UP, spread = 1.4) => fx.sprayT('drop', [D, G], x, y, n, a, spread, 8, 20, { g: .45 });
  const hic = (fx, x, y, n = 2) => fx.sprayT('bubble', [D, F], x, y, n, UP, .6, 3, 26, { g: -.05, life: 22 });

  CAST['soju.breath'] = (fx, c) => { fx.pop('glint', F, c.x + c.d * 80, c.y + 150, 150, 7); fx.ringT(F, c.x + c.d * 70, c.y + 150, 30, 170, 9, { toon: 'thin' }); };
  SHOT.breath = {
    make: () => {},
    tick: (fx, shot, v, x, y, dir, ticked) => {
      if (!ticked) return;
      const k = shot.age / (shot.life || 30);
      for (let i = 0; i < 2; i++) fx.emit({ toon: 'flame', pal: i ? F : T.white, x: x + rnd(-.4, .4) * shot.w, y: y + rnd(-.35, .35) * shot.h, z: 46, vx: dir * rnd(1, 3), vy: rnd(.5, 2), s0: 50, s1: 90 * (1 - k * .4), life: 8, rot: dir > 0 ? -UP : UP, alpha: .95, wide: .8 });
      if (shot.age % 3 === 0) fx.emit({ tex: 'puff', add: false, x: x - dir * 30, y, z: 30, vy: 1.2, life: 18, s0: 40, s1: 90, color: '#a8d8ff', alpha: .35 });
    },
    end: (fx, shot, x, y) => { fx.pop('cloud', F, x, y, 140, 9); },
  };
  HIT['soju.breath'] = (fx, c) => { smack(fx, c, F, 140); fx.pop('flame', F, c.x, c.y + 20, 150, 8); hic(fx, c.x, c.y + 30, 2); if (c.fin) finish(fx, c, F); };

  CAST['soju.stagger'] = (fx, c) => { hic(fx, c.x, c.y + 200, 2); fx.dust(c.x, 4, 34, 34); };
  TRAIL['soju.stagger'] = (fx, c) => {
    if (c.t % 3 === 0) hic(fx, c.x + rnd(-30, 30), c.y + 210, 1);
    if (c.t % 2) fx.slashT(c.t % 4 === 1 ? G : T.white, c.bx, c.by, 170, ang(c.d, Math.sin(c.t) * .6), 5, { alpha: .8 });
    if (c.t % 4 === 0) fx.dust(c.x - c.d * 20, 2, 26, 30);
  };
  HIT['soju.stagger'] = (fx, c) => { smack(fx, c, G, 180); fx.chunks('glint', [G, D], c.x, c.y, 5, 30, 9); drops(fx, c.x, c.y, 6); if (c.fin) finish(fx, c, G); };

  CAST['soju.bottle'] = (fx, c) => { fx.floorT('ring', G, c.x, 220, 9, { spread: .3 }); drops(fx, c.x, c.y + 120, 4); };
  TRAIL['soju.bottle'] = (fx, c) => {
    fx.slashT(c.t % 2 ? G : T.white, c.x + Math.cos(c.t * 1.1) * 40, c.y + 140 + Math.sin(c.t * 1.1) * 60, 240, c.t * 1.1, 5, { alpha: .9 });
    if (c.t % 2) drops(fx, c.x + rnd(-60, 60), c.y + rnd(100, 240), 2, UP, 2);
  };
  HIT['soju.bottle'] = (fx, c) => { smack(fx, c, G, 190); fx.slashT(G, c.x, c.y, 280, ang(c.d, 1.2), 9); drops(fx, c.x, c.y, 7); if (c.fin) finish(fx, c, G); };

  TRAIL['soju.sway'] = (fx, c) => { if (c.t % 4 === 0) hic(fx, c.x + rnd(-20, 20), c.y + 200, 1); };
  CAST['soju.hiccup'] = (fx, c) => { fx.pop('bubble', D, c.x, c.y + 200, 160, 9); fx.pop('glint', B, c.x + c.d * 50, c.y + 180, 160, 7); };
  HIT['soju.hiccup'] = (fx, c) => { smack(fx, c, B, 220); fx.pop('bubble', D, c.x, c.y + 20, 240, 12); hic(fx, c.x, c.y, 4); if (c.fin) finish(fx, c, B); };

  CAST['soju.glass'] = (fx, c) => { fx.slashT(G, c.x, c.y + 160, 180, ang(c.d, 1), 7, { alpha: .8 }); };
  SHOT.glass = {
    make: (fx, shot, v) => { v.spr = fx.toonSprite('cup', G, 58, 64); v.group.add(v.spr); },
    tick: (fx, shot, v, x, y, dir, ticked) => { v.spr.material.rotation = -dir * shot.age * .35; if (ticked && shot.age % 2 === 0) fx.emit({ toon: 'drop', pal: D, x: x - dir * 18, y, z: 46, vy: -1, g: .3, s0: 16, s1: 8, life: 12 }); },
    end: (fx, shot, x, y) => { fx.chunks('glint', [G, T.white], x, Math.max(10, y), 6, 26, 8); fx.floorT('splat', D, x, 160, 30, { alpha: .8 }); },
  };
  HIT['soju.glass'] = (fx, c) => { smack(fx, c, G, 170); fx.chunks('glint', [G, T.white], c.x, c.y, 7, 28, 10); drops(fx, c.x, c.y, 7); if (c.fin) finish(fx, c, G); };

  TRAIL['soju.flop'] = (fx, c) => { if (c.first) { fx.dust(c.x, 6, 50, 44); drops(fx, c.x + c.d * 40, 40, 8, UP, .5); } if (c.t % 2) fx.slashT(G, c.bx, c.by, 220, ang(c.d, 1.4), 6, { alpha: .85 }); };
  HIT['soju.flop'] = (fx, c) => { smack(fx, c, G, 200); drops(fx, c.x, c.y, 8); hic(fx, c.x, c.y, 2); if (c.fin) finish(fx, c, G); };

  CAST['soju.super'] = (fx, c) => { fx.ringT(F, c.x, c.y, 520, 60, 16, { toon: 'thin' }); fx.pop('flame', F, c.x, c.y + 80, 320, 14); hic(fx, c.x, c.y + 160, 6); };
  TRAIL['soju.super'] = (fx, c) => {
    if (c.t % 2) fx.slashT(pick([G, F, T.white]), c.bx + rnd(-.3, .3) * c.bw, c.by + rnd(-.4, .4) * c.bh, 200, rnd(0, TAU), 5, { alpha: .9 });
    if (c.t % 3 === 0) fx.emit({ toon: 'flame', pal: F, x: c.bx + rnd(-60, 60), y: c.by + rnd(-60, 60), z: 46, s0: 60, s1: 110, life: 7, rot: rnd(-.5, .5) });
    if (c.t % 4 === 0) { drops(fx, c.bx, c.by, 3, rnd(0, TAU), 1); hic(fx, c.x, c.y + 220, 1); }
    wake(fx, c, [G, T.white], 1, 160);
  };
  HIT['soju.super'] = (fx, c) => { smack(fx, c, F, 170); if (c.fin) { finish(fx, c, F, 380); fx.pop('swirl', G, c.x, c.y, 380, 14); hic(fx, c.x, c.y, 8); } };
}

// ── 담배: 주황 불씨, 잿빛 연기, 보라빛 독 ──
{
  const E = T.smoke.ember, A = T.smoke.ash, S = T.smoke.smoke, X = T.smoke.toxin;
  const puff = (fx, x, y, n = 3, size = 90, o = {}) => { for (let i = 0; i < n; i++) fx.emit({ tex: 'puff', add: false, x: x + rnd(-40, 40), y: y + rnd(-30, 30), z: rnd(20, 50), vx: rnd(-1, 1), vy: rnd(.4, 1.6), life: rnd(20, 32), s0: size * .5, s1: size * rnd(1, 1.5), color: pick(['#b8b4c0', '#8e8a98', '#d8d4dc']), alpha: .6, fade: 'inout', rot: rnd(0, TAU), spin: rnd(-.03, .03), ...o }); };
  const sparks = (fx, x, y, n = 5, a = UP, spread = 1.5) => fx.sprayT('glint', [E, T.white], x, y, n, a, spread, 8, 22, { g: .15 });

  CAST['smoke.ember'] = (fx, c) => { fx.pop('glint', E, c.x + c.d * 50, c.y + 140, 140, 6); sparks(fx, c.x + c.d * 40, c.y + 140, 3, c.fwd, .5); };
  SHOT.ember = {
    make: (fx, shot, v) => { v.spr = fx.toonSprite('shuriken', A, 54); v.group.add(v.spr); v.group.add(fx.glowSprite('#ff7a2a', 110)); },
    tick: (fx, shot, v, x, y, dir, ticked) => { v.spr.material.rotation = -dir * shot.age * .7; if (ticked) { fx.emit({ toon: 'glint', pal: E, x: x - dir * rnd(10, 30), y: y + rnd(-8, 8), z: 46, vx: -dir, s0: 22, s1: 8, life: 9 }); if (shot.age % 2) fx.emit({ tex: 'puff', add: false, x: x - dir * 26, y, z: 30, vy: .6, life: 16, s0: 18, s1: 46, color: '#9a96a4', alpha: .4 }); } },
    end: (fx, shot, x, y) => { sparks(fx, x, y, 6, UP, 2); },
  };
  HIT['smoke.ember'] = (fx, c) => { smack(fx, c, E, 150); sparks(fx, c.x, c.y, 6); fx.pop('skull', X, c.x, c.y + 60, 90, 12); if (c.fin) finish(fx, c, E); };

  // 연기 순간이동: 떠난 자리와 나타난 자리에 연기가 피어오른다.
  GRAB['@warp'] = (fx, e, x, y) => {
    const from = e.from - 640;
    for (const at of [from, x]) { puff(fx, at, y - 20, 6, 120); fx.pop('cloud', S, at, y, 170, 12); fx.chunks('shuriken', [A], at, y, 2, 20, 7); }
    sparks(fx, x, y, 5); fx.linesT([S, T.white], x, y, 6, 0, Math.PI, 140, 8);
  };
  WIND['smoke.vanish'] = (fx, c) => { if (c.t % 2) puff(fx, c.x, c.y + 80, 2, 80); };

  CAST['smoke.flare'] = (fx, c) => { fx.dust(c.x, 5, 40, 34); sparks(fx, c.x, 40, 5); };
  TRAIL['smoke.flare'] = (fx, c) => { fx.slashT(c.t % 2 ? E : T.white, c.bx, c.by, 250, ang(c.d, 1.3 + c.t * .2), 6, { alpha: .9 }); sparks(fx, c.bx, c.by, 2); if (c.t % 2) puff(fx, c.x, c.y + 60, 1, 70); };
  HIT['smoke.flare'] = (fx, c) => { smack(fx, c, E, 190); fx.slashT(E, c.x, c.y, 280, ang(c.d, 1.3), 9); sparks(fx, c.x, c.y, 7); if (c.fin) finish(fx, c, E); };

  CAST['smoke.screen'] = (fx, c) => { puff(fx, c.x + c.d * 110, c.y + 110, 6, 140); fx.pop('cloud', S, c.x + c.d * 100, c.y + 120, 260, 14); };
  SHOT.smoke = {
    make: () => {},
    tick: (fx, shot, v, x, y, dir, ticked) => {
      if (!ticked) return;
      const fade = shot.life ? Math.min(1, (shot.life - shot.age) / 30) : 1;
      if (shot.age % 2 === 0) puff(fx, x + rnd(-.35, .35) * shot.w, y + rnd(-.4, .3) * shot.h, 2, 120, { alpha: .62 * fade, vx: rnd(-.5, .5), vy: rnd(.1, .8), life: 34 });
      if (shot.age % 9 === 0) fx.emit({ toon: 'glint', pal: E, x: x + rnd(-60, 60), y: y + rnd(-60, 60), z: 52, s0: 14, s1: 30, life: 10 });
    },
    end: (fx, shot, x, y) => { puff(fx, x, y, 4, 120); },
  };
  HIT['smoke.smoke'] = (fx, c) => { fx.pop('cloud', S, c.x, c.y, 160, 8); if (Math.random() < .5) fx.pop('skull', X, c.x, c.y + 70, 80, 12); };

  CAST['smoke.ash'] = (fx, c) => { fx.floorT('splat', A, c.x + c.d * 60, 160, 30, { alpha: .7 }); sparks(fx, c.x + c.d * 50, 30, 5, ang(c.d, .7), .6); };
  SHOT.ash = {
    make: () => {},
    tick: (fx, shot, v, x, y, dir, ticked) => {
      if (!ticked) return;
      fx.emit({ tex: 'puff', add: false, x: x + rnd(-20, 20), y: rnd(10, 50), z: 30, vx: -dir * rnd(.5, 1.5), vy: rnd(.5, 1.5), life: 18, s0: 40, s1: 90, color: pick(['#6a6672', '#8e8a98']), alpha: .6 });
      if (shot.age % 2) fx.sprayT('glint', [E], x, 20, 1, dir > 0 ? Math.PI - .7 : .7, .4, 5, 18);
      if (shot.age % 5 === 0) fx.floorT('splat', A, x - dir * 30, 110, 20, { alpha: .6 });
    },
    end: (fx, shot, x, y) => { fx.dust(x, 5, 50, 44, '#8e8a98'); },
  };
  HIT['smoke.ash'] = (fx, c) => { smack(fx, c, A, 160); fx.dust(c.x, 6, 50, 50, '#8e8a98'); sparks(fx, c.x, c.y, 4); if (c.fin) finish(fx, c, E); };

  // 니코틴 올가미: 연기 줄이 감기고 보라 독이 피어난다.
  GRAB.smoke = (fx, e, x0, x1, y) => {
    fx.link('lasso', S, x0, y, x1 + (x1 > x0 ? 50 : -50), y, 130, 12); puff(fx, x1, y, 5, 110); fx.pop('skull', X, x1, y + 90, 140, 16); fx.ringT(X, x1, y, 220, 60, 10, { toon: 'thin' });
  };
  HIT['smoke.slam'] = (fx, c) => { fx.pop('burst', E, c.x, 50, 260, 10); fx.floorT('spikes', A, c.x, 360, 12, { spread: .3 }); puff(fx, c.x, 50, 6, 130); fx.pop('skull', X, c.x, 160, 170, 18); sparks(fx, c.x, 40, 8); };

  CAST['smoke.super'] = (fx, c) => { fx.ringT(S, c.x, c.y, 520, 60, 16, { toon: 'thin' }); puff(fx, c.x, c.y, 10, 180); fx.pop('skull', X, c.x, c.y + 120, 260, 16); };
  SHOT.storm = {
    make: () => {},
    tick: (fx, shot, v, x, y, dir, ticked) => {
      if (!ticked) return;
      const a = shot.age * .5;
      for (let i = 0; i < 3; i++) { const r = 40 + i * 45; fx.emit({ tex: 'puff', add: false, x: x + Math.cos(a + i * 2.1) * r, y: y + Math.sin(a + i * 2.1) * r * .7, z: 40, life: 20, s0: 70, s1: 150, color: pick(['#8e8a98', '#b8b4c0', '#5a5664']), alpha: .66, rot: rnd(0, TAU) }); }
      if (shot.age % 2) fx.emit({ toon: 'glint', pal: E, x: x + rnd(-130, 130), y: y + rnd(-130, 130), z: 52, vx: Math.cos(a) * 4, vy: Math.sin(a) * 4, s0: 20, s1: 40, life: 10 });
      if (shot.age % 6 === 0) fx.emit({ toon: 'swirl', pal: S, x, y, z: 30, s0: 300, s1: 360, rot: a, life: 8, alpha: .7 });
    },
    end: (fx, shot, x, y) => { puff(fx, x, y, 8, 160); },
  };
  HIT['smoke.storm'] = (fx, c) => { smack(fx, c, E, 170); sparks(fx, c.x, c.y, 5); if (c.fin) { finish(fx, c, E, 380); fx.pop('skull', X, c.x, c.y + 80, 260, 16); } };
}

// ── 내장지방: 노란 지방 덩어리, 번들거리는 기름, 붉은 핏줄 ──
{
  const F = T.visceral.fat, O = T.visceral.oil, V = T.visceral.vein, S = T.visceral.strap;
  const lumps = (fx, x, y, n = 4, size = 40, speed = 9) => fx.chunks('blob', [F], x, y, n, size, speed);
  const oil = (fx, x, y, n = 6, a = UP, spread = 1.5) => fx.sprayT('drop', [O, F], x, y, n, a, spread, 9, 22, { g: .5 });

  CAST['visceral.glob'] = (fx, c) => { fx.pop('blob', F, c.x + c.d * 30, c.y + 220, 140, 8); oil(fx, c.x, c.y + 200, 3); };
  SHOT.glob = {
    make: (fx, shot, v) => { v.spr = fx.toonSprite('blob', F, 96); v.group.add(v.spr); },
    tick: (fx, shot, v, x, y, dir, ticked) => { const w = Math.sin(shot.age * .6); v.spr.scale.set(96 * (1 + w * .08), 96 * (1 - w * .08), 1); if (ticked && shot.age % 2) fx.emit({ toon: 'drop', pal: O, x: x - dir * 20, y: y - 20, z: 46, vy: -1, g: .35, s0: 18, s1: 8, life: 14 }); },
    end: (fx, shot, x, y) => { fx.floorT('splat', O, x, 230, 40); oil(fx, x, 20, 8); lumps(fx, x, 20, 3, 30); },
  };
  HIT['visceral.glob'] = (fx, c) => { smack(fx, c, F, 190); fx.pop('splat', O, c.x, c.y, 200, 10); oil(fx, c.x, c.y, 7); lumps(fx, c.x, c.y, 3); if (c.fin) finish(fx, c, F); };
  // 기름띠: 바닥에 번들거리는 노란 기름이 깔린다.
  SHOT.lard = {
    make: (fx, shot, v) => {
      const S0 = fx.shotParts; v.mat = S0.oil.clone(); v.mat.color.set('#f6d272'); v.mat.emissive.set('#6a4a08');
      v.body = new THREE.Mesh(S0.disc, v.mat); v.body.rotation.x = -Math.PI / 2; v.body.renderOrder = 2; v.group.add(v.body);
    },
    tick: (fx, shot, v, x, y, dir, ticked) => {
      const grow = Math.min(1, shot.age / 10), fade = shot.life ? Math.min(1, (shot.life - shot.age) / 30) : 1, wob = Math.sin(shot.age * .2);
      v.body.scale.set(shot.w / 2 * grow * (1 + wob * .03), 30 * grow, 1); v.group.position.set(x, 1.3, 0); v.mat.opacity = .9 * Math.max(0, fade);
      if (ticked && shot.age % 18 === 4) fx.emit({ toon: 'blob', pal: F, x: x + rnd(-60, 60), y: 8, z: rnd(-10, 10), vy: .4, life: 18, s0: 10, s1: 26 });
    },
    end: () => {},
  };
  CAST['visceral.lard'] = (fx, c) => { oil(fx, c.x + c.d * 200, 20, 10, UP, 1); fx.pop('splat', O, c.x + c.d * 200, 30, 180, 10); };

  CAST['visceral.belly'] = (fx, c) => { fx.ringT(F, c.x + c.d * 40, c.y + 100, 60, 200, 8, { toon: 'thin' }); };
  TRAIL['visceral.belly'] = (fx, c) => { if (c.t % 2) fx.ringT(c.t % 4 === 1 ? F : T.white, c.bx, c.by, 80, 260, 6, { toon: 'thin' }); wake(fx, c, [F, T.white], 1, 160); };
  HIT['visceral.belly'] = (fx, c) => { smack(fx, c, F, 230); fx.pop('blob', F, c.x, c.y, 200, 10); lumps(fx, c.x, c.y, 4); oil(fx, c.x, c.y, 6, c.fwd, .8); if (c.fin) finish(fx, c, F); };

  CAST['visceral.bounce'] = (fx, c) => { fx.dust(c.x, 6, 60, 50); fx.floorT('ring', F, c.x, 260, 9, { spread: .3 }); };
  TRAIL['visceral.bounce'] = (fx, c) => { if (c.t % 2) fx.slashT(F, c.bx, c.by + 10, 300, ang(c.d, 1.25), 7, { alpha: .9 }); oil(fx, c.bx, c.by, 2, UP, .6); };
  HIT['visceral.bounce'] = (fx, c) => { smack(fx, c, F, 210); fx.slashT(O, c.x, c.y, 300, ang(c.d, 1.3), 9); lumps(fx, c.x, c.y, 3); if (c.fin) finish(fx, c, F); };

  CAST['visceral.quake'] = (fx, c) => { fx.dust(c.x, 10, 80, 64); fx.floorT('ring', F, c.x, 300, 10, { spread: .3 }); lumps(fx, c.x, 30, 4, 34, 10); };
  TRAIL['visceral.quake'] = (fx, c) => { if (c.t % 3 === 0) oil(fx, c.x, c.y + 60, 2, -UP, .5); };
  HIT['visceral.quake'] = (fx, c) => { smack(fx, c, F, 220); fx.floorT('splat', O, c.x, 260, 40); lumps(fx, c.x, c.y, 5); if (c.fin) finish(fx, c, F); };
  // 땅울림: 바닥을 타고 출렁이는 지방 물결.
  SHOT.quake = {
    make: () => {},
    tick: (fx, shot, v, x, y, dir, ticked) => {
      if (!ticked) return;
      if (shot.age % 2 === 0) fx.emit({ toon: 'crest', pal: F, x, y: 36, z: 44, s0: 70, s1: 86, life: 4, wide: 1.2, flip: dir < 0 });
      if (shot.age % 3 === 0) { fx.dust(x, 2, 30, 34, '#d8c08a'); oil(fx, x, 20, 1, UP, .5); }
    },
    end: (fx, shot, x) => { fx.dust(x, 4, 40, 40, '#d8c08a'); },
  };

  // 감싸 조이기: 지방 덩어리가 상대를 덮고, 핏줄이 조인다.
  GRAB.visceral = (fx, e, x0, x1, y) => {
    for (const k of [-50, 0, 50]) fx.link('noodle', F, x0, y + k * .4, x1 + (x1 > x0 ? 60 : -60), y + k, 70, 16, { z: 96, flip: k === 0 });
    fx.pop('blob', F, x1, y, 280, 16, { z: 97 }); fx.ringT(V, x1, y, 260, 80, 12, { toon: 'thin', z: 98 }); oil(fx, x1, y + 40, 10);
  };
  WIND['visceral.slamSqueeze'] = (fx, c) => {
    const x = c.x + c.d * 80;
    if (c.t % 4 === 0) { fx.pop('blob', F, x + rnd(-30, 30), c.y + rnd(80, 160), 140, 8, { z: 96 }); fx.ringT(V, x, c.y + 120, 200, 90, 6, { toon: 'thin', z: 97 }); }
    if (c.t % 6 === 0) fx.emit({ toon: 'plus', pal: T.heal, x: c.x + rnd(-40, 40), y: c.y + rnd(150, 220), z: 46, vy: 2.4, s0: 24, s1: 44, life: 16 });
    if (c.t % 3 === 0) oil(fx, x, c.y + 100, 1);
  };
  HIT['visceral.slam'] = (fx, c) => {
    const big = c.sup ? 1.4 : 1;
    fx.pop('burst', F, c.x, 50, 320 * big, 11); fx.floorT('splat', O, c.x, 330 * big, 60); fx.floorT('spikes', F, c.x, 420 * big, 12, { spread: .3 });
    lumps(fx, c.x, 40, c.sup ? 8 : 5, 44, 11); oil(fx, c.x, 50, 10);
    if (c.fin || c.sup) finish(fx, { ...c, y: 90 }, F, c.sup ? 420 : 300);
  };
  CAST['visceral.engulf'] = (fx, c) => { fx.pop('glint', F, c.x + c.d * 100, c.y + 150, 160, 7); };
  CAST['visceral.super'] = (fx, c) => { fx.ringT(F, c.x, c.y, 560, 60, 16, { toon: 'thin' }); fx.pop('blob', F, c.x, c.y + 80, 360, 14); lumps(fx, c.x, c.y + 80, 8, 50, 12); };
}

// ── 상태 이상 표시: 걸린 몸 위에 계속 돈다(틱마다 한 번 부른다) ──
GRAB['@status'] = (fx, e, x, y) => {
  if (e.kinds.includes('drunk')) fx.pop('swirl', T.soju.glass, x, y, 120, 14);
  if (e.kinds.includes('poison')) fx.pop('skull', T.smoke.toxin, x, y, 110, 16);
  if (e.kinds.includes('slow')) fx.pop('blob', T.visceral.fat, x, y - 140, 110, 14);
};
GRAB['@aura'] = (fx, f, x, y, tick) => {
  const s = f.status;
  // 담배는 늘 머리에서 연기가 피어오르고, 소주는 가끔 딸꾹 거품이 뜬다.
  if (f.char.id === 'smoke' && tick % 5 === 0 && f.state !== 'down') fx.emit({ tex: 'puff', add: false, x: x + f.facing * 4 + rnd(-6, 6), y: y + 262, z: 20, vx: rnd(-.3, .3) - f.facing * .3, vy: rnd(1.2, 2), life: 34, s0: 16, s1: 60, color: pick(['#c8c4cc', '#a8a4b0']), alpha: .5, fade: 'inout', rot: rnd(0, TAU), spin: rnd(-.02, .02) });
  if (f.char.id === 'soju' && tick % 70 === 0 && f.state === 'idle') fx.emit({ toon: 'bubble', pal: T.soju.drink, x: x + f.facing * 30, y: y + 230, z: 50, vy: 1.2, s0: 12, s1: 26, life: 22 });
  // 취함: 머리 위에서 초록 소용돌이와 술방울이 돈다.
  if (s.drunk > 0 && tick % 6 === 0) {
    fx.emit({ toon: 'swirl', pal: T.soju.glass, x: x + Math.sin(tick * .2) * 20, y: y + 240, z: 50, s0: 50, s1: 60, life: 7, rot: tick * .3, alpha: .9 });
    fx.emit({ toon: 'bubble', pal: T.soju.drink, x: x + rnd(-30, 30), y: y + 220, z: 50, vy: 1.6, s0: 14, s1: 26, life: 16 });
  }
  // 중독: 몸에서 보랏빛 연기가 새어 나오고 가끔 해골이 뜬다.
  if (s.poison > 0 && tick % 5 === 0) {
    fx.emit({ tex: 'puff', add: false, x: x + rnd(-40, 40), y: y + rnd(60, 180), z: 50, vy: 1.4, life: 22, s0: 24, s1: 64, color: pick(['#9a6ad0', '#7a6a8a']), alpha: .55 });
    if (tick % 30 === 0) fx.emit({ toon: 'skull', pal: T.smoke.toxin, x, y: y + 230, z: 52, vy: .8, s0: 30, s1: 50, life: 20 });
  }
  // 느려짐: 발밑에 기름이 뚝뚝 떨어진다.
  if (s.slow > 0 && tick % 6 === 0) fx.emit({ toon: 'drop', pal: T.visceral.oil, x: x + rnd(-36, 36), y: y + rnd(30, 120), z: 50, vy: -1, g: .3, s0: 18, s1: 10, life: 16 });
  // 펌프업: 몸 둘레로 청록 기합 선이 솟는다.
  if (s.pump > 0 && tick % 4 === 0) {
    fx.emit({ toon: 'line', pal: T.muscle.power, x: x + rnd(-60, 60), y: y + rnd(20, 160), z: 50, vy: 5, s0: 12, s1: 6, wide: 8, rot: UP, life: 8, alpha: .9 });
    if (tick % 16 === 0) fx.emit({ toon: 'star5', pal: T.muscle.gold, x: x + rnd(-50, 50), y: y + rnd(120, 220), z: 52, vy: 1, s0: 16, s1: 30, life: 12 });
  }
};
