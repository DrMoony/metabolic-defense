// 장기 넷의 기술 효과. 캐릭터 시트(art/raw/<id>_moves_v1.png)의 모양과 색을 따른다.
import { T } from './toon.js';
import { CAST, WIND, TRAIL, HIT, TAU, UP, rnd, ang, smack, finish, stand, wake } from './fx_moves.js';

// ── 심장: 분홍 박동 고리와 심전도 선, 노란 번개, 하트 조각 ──
{
  const P = T.heart.pulse, V = T.heart.volt, S = T.heart.shard;
  const ecg = (fx, x, y, d, len = 260, thick = 90) => fx.link('ecg', P, x, y, x + d * len, y, thick, 8);

  CAST['heart.rush'] = (fx, c) => { fx.ringT(P, c.x, c.y, 60, 230, 10); fx.ringT(P, c.x, c.y, 30, 150, 10, { delay: 3, toon: 'thin' }); ecg(fx, c.x, c.y, c.d); };
  TRAIL['heart.rush'] = (fx, c) => {
    fx.emit({ toon: 'lance', pal: c.t % 2 ? P : S, x: c.bx + rnd(-.25, .25) * c.bw, y: c.by + rnd(-.5, .5) * c.bh, z: 46, s0: 46, s1: 30, wide: 3.4, rot: c.fwd, life: 5, vx: c.d * 7 });
    if (c.t % 3 === 0) fx.ringT(P, c.bx + c.d * 20, c.by, 30, 130, 7, { toon: 'thin' });
    if (c.t % 7 === 1) ecg(fx, c.x, c.by, c.d, 240, 80);
    wake(fx, c, S, 1);
  };
  HIT['heart.rush'] = (fx, c) => {
    smack(fx, c, P, 140); fx.chunks('heart', [P, S], c.x, c.y, 2, 26, 8);
    if (c.fin) { finish(fx, c, P); fx.pop('heart', P, c.x, c.y, 260, 12); fx.chunks('heart', [P, S], c.x, c.y, 6, 30, 11); }
  };

  CAST['heart.knee'] = (fx, c) => { fx.pop('glint', S, c.x + c.d * 40, c.y - 40, 130, 7); fx.dust(c.x, 5, 40, 34); };
  TRAIL['heart.knee'] = (fx, c) => {
    if (c.t % 3 === 1) fx.slashT(c.t % 2 ? P : S, c.bx - c.d * 20, c.by, 190, ang(c.d, .7), 7, { alpha: .85 });
    fx.linesT(S, c.x - c.d * 40, c.y + rnd(30, 150), 1, ang(c.d, .7) + Math.PI, .1, 170, 5);
  };
  HIT['heart.knee'] = (fx, c) => {
    smack(fx, c, P, 170); fx.slashT(P, c.x, c.y, 260, ang(c.d, .9), 9);
    fx.chunks(['heart', 'glint'], [S, P], c.x, c.y, 6, 26, 10);
    if (c.fin) finish(fx, c, P);
  };

  CAST['heart.upper'] = (fx, c) => { fx.ringT(P, c.x, c.y - 90, 150, 40, 6, { toon: 'thin' }); fx.dust(c.x, 4, 30, 30); };
  TRAIL['heart.upper'] = (fx, c) => {
    if (c.first) { stand(fx, 'pillar', P, c.bx, 350, 12, { wide: .5 }); fx.link('ecg', V, c.bx - c.d * 6, 10, c.bx - c.d * 6, 370, 120, 10); fx.floorT('ring', P, c.bx, 300, 12, { spread: .3 }); }
    fx.linesT([P, S], c.bx + rnd(-30, 30), c.by - 60, 2, UP, .12, 170, 15);
  };
  HIT['heart.upper'] = (fx, c) => {
    smack(fx, c, P, 180); fx.slashT(P, c.x, c.y + 20, 280, ang(c.d, 1.2), 9);
    fx.linesT(V, c.x, c.y, 6, UP, .35, 200, 18); fx.chunks('heart', [P, S], c.x, c.y, 3, 26, 10);
    if (c.fin) finish(fx, c, P);
  };

  TRAIL['heart.weave'] = (fx, c) => {
    wake(fx, c, [T.white, S], 2, 190);
    if (c.t % 3 === 0) fx.emit({ toon: 'arc', pal: S, x: c.x - c.d * 50, y: c.y + 70, z: 30, s0: 150, s1: 170, life: 6, rot: c.fwd, alpha: .5 });
    if (c.first) fx.dust(c.x, 5, 40, 30);
  };

  CAST['heart.dash'] = (fx, c) => { fx.ringT(P, c.x - c.d * 30, c.y, 220, 50, 8); fx.linesT(S, c.x, c.y, 6, c.fwd + Math.PI, .5, 150, 9); };
  TRAIL['heart.dash'] = (fx, c) => {
    fx.emit({ toon: 'lance', pal: P, x: c.bx - c.d * 60, y: c.by, z: 45, s0: 120, s1: 70, wide: 3.6, rot: c.fwd, life: 5 });
    if (c.t % 2) fx.emit({ toon: 'sonic', pal: S, x: c.bx + c.d * 30, y: c.by, z: 46, s0: 170, s1: 240, life: 6, rot: c.fwd, vx: c.d * 6 });
    wake(fx, c, [P, T.white], 3, 240);
    if (c.t % 3 === 0) fx.dust(c.x - c.d * 30, 2, 20, 30);
  };
  HIT['heart.dash'] = (fx, c) => {
    smack(fx, c, P, 190); fx.slashT(P, c.x + c.d * 30, c.y, 320, c.fwd, 10);
    fx.emit({ toon: 'sonic', pal: T.white, x: c.x + c.d * 40, y: c.y, z: 47, s0: 220, s1: 380, life: 9, rot: c.fwd, vx: c.d * 9, snap: true });
    fx.linesT([P, T.white], c.x, c.y, 8, c.fwd, .4, 230, 20);
    finish(fx, c, P, 240);
  };

  CAST['heart.shock'] = (fx, c) => { fx.ringT(V, c.x, c.y, 260, 60, 9); fx.pop('bolt', V, c.x, c.y + 60, 170, 7, { rot: UP }); };
  WIND['heart.shock'] = (fx, c) => { if (c.t % 2) { const a = rnd(0, TAU); fx.link('bolt', V, c.x + Math.cos(a) * 120, c.y + 110 + Math.sin(a) * 110, c.x, c.y + 110, 34, 4); } };
  TRAIL['heart.shock'] = (fx, c) => {
    if (c.first) {
      fx.pop('spikes', V, c.x, c.y + 115, 420, 11); fx.pop('burst', T.white, c.x, c.y + 115, 230, 7);
      fx.floorT('spikes', V, c.x, 520, 14, { spread: .3 }); fx.floorT('crater', V, c.x, 330, 70);
      fx.flash(c.x, c.y + 115, 420, V[1], 8, .6);
    }
    const a = rnd(0, Math.PI), r = rnd(130, 190);
    fx.link('bolt', V, c.x, c.y + 110, c.x + Math.cos(a) * r, c.y + 110 + Math.sin(a) * r * .8, 56, 5);
    fx.link('bolt', T.white, c.x, c.y + 110, c.x - Math.cos(a) * r, c.y + 30 + rnd(0, 60), 40, 4);
  };
  HIT['heart.shock'] = (fx, c) => {
    smack(fx, c, V, 190); fx.pop('glint', T.white, c.x, c.y, 220, 9);
    for (let i = 0; i < 4; i++) { const a = rnd(0, TAU); fx.link('bolt', V, c.x, c.y, c.x + Math.cos(a) * 130, c.y + Math.sin(a) * 130, 44, 7, { delay: i }); }
    fx.chunks('glint', [V, T.white], c.x, c.y, 5, 22, 9);
    if (c.fin) finish(fx, c, V);
  };

  CAST['heart.super'] = (fx, c) => { fx.pop('heart', P, c.x, c.y + 10, 460, 26, { alpha: .9 }); fx.ringT(P, c.x, c.y, 80, 520, 20); fx.ringT(T.gold, c.x, c.y, 40, 360, 20, { delay: 5, toon: 'thin' }); };
  TRAIL['heart.super'] = (fx, c) => {
    for (let i = 0; i < 2; i++) fx.emit({ toon: 'lance', pal: i ? P : T.white, x: c.bx + rnd(-.3, .3) * c.bw, y: c.by + rnd(-.5, .5) * c.bh, z: 46, s0: 60, s1: 36, wide: 3.6, rot: c.fwd, life: 5, vx: c.d * 9 });
    if (c.t % 6 === 1) { fx.pop('heart', P, c.bx + c.d * 30, c.by, 300, 9, { alpha: .9 }); fx.ringT(T.gold, c.bx, c.by, 40, 240, 9, { toon: 'thin' }); }
    if (c.t % 4 === 0) fx.link('ecg', V, c.x, c.by + rnd(-60, 60), c.x + c.d * 300, c.by + rnd(-60, 60), 90, 6);
    wake(fx, c, [P, T.gold], 2, 220);
  };
  HIT['heart.super'] = (fx, c) => {
    smack(fx, c, c.e.combo % 2 ? P : T.gold, 170); fx.chunks('heart', [P, S, T.gold], c.x, c.y, 3, 28, 10);
    if (c.fin) { finish(fx, c, P, 380); fx.pop('heart', P, c.x, c.y, 560, 18); fx.pop('burst', T.gold, c.x, c.y, 420, 12); fx.chunks('heart', [P, S, T.gold], c.x, c.y, 12, 34, 14); }
  };
}

// ── 신장: 파란 물줄기와 물마루, 청록 육각 여과막, 호박색 결석 ──
{
  const W = T.kidney.water, F = T.kidney.film, A = T.kidney.amber;
  const splash = (fx, x, y, n = 8, a = UP, spread = 1.1, speed = 9) => fx.sprayT('drop', [W, F], x, y, n, a, spread, speed, 22, { g: .45 });

  CAST['kidney.cast'] = (fx, c) => { fx.ringT(W, c.x + c.d * 62, c.y - 10, 30, 150, 9); fx.ringT(F, c.x + c.d * 62, c.y - 10, 20, 90, 8, { delay: 2, toon: 'thin' }); splash(fx, c.x + c.d * 62, c.y - 10, 5, c.fwd, .7, 7); };
  HIT['kidney.water'] = (fx, c) => { smack(fx, c, W, 150); fx.pop('splat', W, c.x, c.y, 210, 9); splash(fx, c.x, c.y, 9, c.fwd, 1.2, 10); if (c.fin) finish(fx, c, W); };

  CAST['kidney.lob'] = (fx, c) => { fx.pop('glint', A, c.x + c.d * 40, c.y + 70, 130, 7); fx.ringT(A, c.x + c.d * 40, c.y + 70, 20, 110, 8, { toon: 'thin' }); };
  HIT['kidney.stone'] = (fx, c) => { smack(fx, c, A, 160); fx.chunks('rock', [A, T.liver.rock], c.x, c.y, 6, 24, 10); splash(fx, c.x, c.y, 5); if (c.fin) finish(fx, c, A); };

  CAST['kidney.surf'] = (fx, c) => { fx.floorT('ring', W, c.x, 260, 10, { spread: .3 }); splash(fx, c.x, 10, 6); };
  TRAIL['kidney.surf'] = (fx, c) => {
    if (c.t % 2) stand(fx, 'crest', W, c.x + c.d * 16, 190, 6, { flip: c.d < 0, z: 52 });
    fx.sprayT('drop', [W, F], c.x - c.d * 50, 30, 2, c.fwd + Math.PI - c.d * .6, .4, 8, 20, { g: .4 });
    if (c.t % 3 === 0) fx.sprayT('bubble', F, c.x - c.d * 70, 20, 1, UP, .6, 3, 20, { g: -.05 });
    wake(fx, c, [W, T.white], 1, 200);
  };
  HIT['kidney.surf'] = (fx, c) => { smack(fx, c, W, 150); fx.pop('splat', W, c.x, c.y, 220, 9); splash(fx, c.x, c.y, 8); if (c.fin) finish(fx, c, W); };

  CAST['kidney.fountain'] = (fx, c) => { fx.floorT('ring', W, c.x + c.d * 88, 220, 9, { spread: .2 }); fx.ringT(F, c.x, c.y, 160, 50, 7, { toon: 'thin' }); };
  TRAIL['kidney.fountain'] = (fx, c) => {
    if (c.first) { stand(fx, 'pillar', W, c.bx, 420, 13, { wide: .55 }); fx.floorT('ring', W, c.bx, 360, 14, { spread: .3 }); fx.floorT('splat', W, c.bx, 260, 40); fx.chunks('drop', [W, F], c.bx, 330, 10, 24, 9); }
    fx.linesT([W, T.white], c.bx + rnd(-26, 26), rnd(20, 200), 2, UP, .06, 180, 16, { thick: 12 });
    splash(fx, c.bx, 16, 2, UP, 1.3, 7);
  };
  HIT['kidney.fountain'] = (fx, c) => { smack(fx, c, W, 180); splash(fx, c.x, c.y, 10, UP, .8, 12); fx.linesT(W, c.x, c.y, 5, UP, .3, 200, 18); if (c.fin) finish(fx, c, W); };

  CAST['kidney.barrier'] = (fx, c) => { fx.pop('hex', F, c.x + c.d * 62, c.y - 8, 250, 9); fx.ringT(F, c.x + c.d * 62, c.y - 8, 240, 90, 7, { toon: 'thin' }); };
  TRAIL['kidney.barrier'] = (fx, c) => {
    if (c.t % 4 === 1) fx.emit({ toon: 'hex', pal: F, x: c.x + c.d * 66, y: c.y + 112 + rnd(-50, 50), z: 30, s0: 90, s1: 120, life: 8, alpha: .8 });
    if (c.t % 5 === 0) fx.pop('glint', F, c.x + c.d * (66 + rnd(-10, 20)), c.y + rnd(40, 190), 60, 6);
  };
  HIT['kidney.barrier'] = (fx, c) => { smack(fx, c, F, 170); fx.pop('hex', F, c.x, c.y, 280, 10); fx.chunks('hex', [F, W], c.x, c.y, 4, 26, 9); finish(fx, c, F, 220); };

  CAST['kidney.flip'] = (fx, c) => { splash(fx, c.x, 10, 5); fx.dust(c.x, 4, 30, 30); };
  TRAIL['kidney.flip'] = (fx, c) => {
    if (c.first || c.t % 4 === 0) fx.slashT(c.first ? W : F, c.bx, c.by, c.first ? 300 : 220, ang(c.d, 1.0), 8, { alpha: c.first ? 1 : .8 });
    fx.sprayT('drop', [W, F], c.bx + c.d * 40, c.by + 40, 2, ang(c.d, 1.2), .6, 8, 20, { g: .4 });
  };
  HIT['kidney.flip'] = (fx, c) => { smack(fx, c, W, 170); fx.slashT(W, c.x, c.y, 320, ang(c.d, 1.0), 9); splash(fx, c.x, c.y, 8, ang(c.d, 1.0), .7, 11); if (c.fin) finish(fx, c, W); };

  CAST['kidney.super'] = (fx, c) => {
    fx.ringT(W, c.x, c.y, 80, 520, 20); fx.pop('hex', F, c.x, c.y, 420, 22, { alpha: .85 }); fx.floorT('ring', W, c.x, 620, 26, { spread: .15 });
    for (let i = 0; i < 4; i++) stand(fx, 'crest', W, c.x - c.d * (60 + i * 40), 150 + i * 30, 12, { flip: c.d < 0, delay: 6 + i * 4, z: 20 });
  };
  HIT['kidney.wave'] = (fx, c) => {
    smack(fx, c, W, 190); fx.pop('splat', W, c.x, c.y, 280, 10); fx.pop('hex', F, c.x, c.y, 230, 8, { alpha: .8 }); splash(fx, c.x, c.y, 10, UP, 1.2, 12);
    if (c.fin) { finish(fx, c, W, 380); stand(fx, 'pillar', W, c.x, 460, 14, { wide: .6 }); fx.chunks('hex', [F, W], c.x, c.y, 8, 30, 12); }
  };
}

// ── 간: 초록 생기, 바위 조각, 보라 독소 방울, 연두 번쩍임 ──
{
  const V = T.liver.vital, R = T.liver.rock, X = T.liver.toxin, Z = T.liver.zest;
  const rubble = (fx, x, n = 6, speed = 11) => fx.chunks('rock', [R, V], x, 10, n, 28, speed);

  CAST['liver.grab'] = (fx, c) => { fx.ringT(V, c.x + c.d * 60, c.y, 200, 60, 7, { toon: 'thin' }); fx.linesT(V, c.x + c.d * 150, c.y, 5, c.fwd + Math.PI, .4, 120, 9); };
  HIT['liver.slam'] = (fx, c) => {
    const s = c.sup ? 1.35 : 1;
    fx.pop('burst', V, c.x, 70, 400 * s, 11); fx.pop('spikes', Z, c.x, 60, 300 * s, 9, { delay: 1 }); fx.pop('glint', T.white, c.x, 80, 240 * s, 8);
    fx.floorT('spikes', V, c.x, 560 * s, 14, { spread: .3 }); fx.floorT('crater', V, c.x, 400 * s, 80);
    rubble(fx, c.x, c.sup ? 14 : 8, 13); fx.linesT([V, Z], c.x, 30, 8, UP, .9, 200, 16); fx.flash(c.x, 70, 320, V[1], 8, .5);
    if (c.sup) { fx.chunks('bubble', [X], c.x, 40, 14, 30, 9, { g: .12 }); fx.pop('spikes', X, c.x, 90, 560, 14, { delay: 2 }); finish(fx, { ...c, y: 90 }, V, 420); }
  };

  CAST['liver.charge'] = (fx, c) => { fx.dust(c.x, 6, 50, 40); fx.ringT(V, c.x - c.d * 30, c.y, 210, 60, 8); };
  TRAIL['liver.charge'] = (fx, c) => {
    fx.emit({ toon: 'cone', pal: c.t % 2 ? V : Z, x: c.bx + c.d * 34, y: c.by, z: 46, s0: 120, s1: 138, life: 4, rot: c.fwd, alpha: .9 });
    wake(fx, c, [V, T.white], 3, 220);
    if (c.t % 2) fx.dust(c.x - c.d * 40, 2, 24, 38);
  };
  HIT['liver.charge'] = (fx, c) => { smack(fx, c, V, 200); fx.emit({ toon: 'cone', pal: T.white, x: c.x + c.d * 30, y: c.y, z: 47, s0: 130, s1: 190, life: 7, rot: c.fwd, snap: true }); rubble(fx, c.x, 4); if (c.fin) finish(fx, c, V); };

  CAST['liver.heave'] = (fx, c) => { fx.floorT('ring', V, c.x + c.d * 60, 240, 9, { spread: .3 }); fx.dust(c.x + c.d * 40, 5, 40, 34); };
  TRAIL['liver.heave'] = (fx, c) => {
    if (c.first) { stand(fx, 'pillar', V, c.bx, 360, 11, { wide: .5 }); fx.slashT(Z, c.bx, c.by, 300, ang(c.d, 1.25), 9); rubble(fx, c.bx, 4, 9); }
    fx.linesT([V, Z], c.bx + rnd(-30, 30), rnd(20, 160), 2, UP, .06, 190, 17, { thick: 13 });
  };
  HIT['liver.heave'] = (fx, c) => { smack(fx, c, V, 190); fx.linesT([V, Z], c.x, c.y, 7, UP, .3, 220, 19); rubble(fx, c.x, 3); if (c.fin) finish(fx, c, V); };

  CAST['liver.regen'] = (fx, c) => { fx.floorT('ring', V, c.x, 330, 14, { spread: .25 }); fx.pop('plus', V, c.x, c.y + 60, 150, 10); };
  TRAIL['liver.regen'] = (fx, c) => {
    if (c.t % 3 === 0) fx.emit({ toon: 'plus', pal: c.t % 2 ? V : Z, x: c.x + rnd(-80, 80), y: rnd(20, 120), z: 48, vy: rnd(2.5, 4), life: 24, s0: rnd(26, 44), s1: 20 });
    if (c.t % 10 === 1) { fx.floorT('ring', V, c.x, 300, 14, { spread: .3 }); fx.emit({ toon: 'swirl', pal: Z, x: c.x, y: c.y + 110, z: 20, s0: 200, s1: 300, life: 14, spin: .22, alpha: .8 }); }
    if (c.t % 2) fx.linesT(V, c.x + rnd(-70, 70), rnd(10, 60), 1, UP, .03, 120, 8, { thick: 8 });
  };

  CAST['liver.clap'] = (fx, c) => { fx.linesT(Z, c.x + c.d * 90, c.y, 6, c.fwd + Math.PI, 1.2, 110, 8); };
  TRAIL['liver.clap'] = (fx, c) => {
    if (!c.first) return;
    fx.pop('burst', Z, c.bx - c.d * 30, c.by, 330, 10); fx.pop('glint', T.white, c.bx - c.d * 30, c.by, 260, 8);
    for (let i = 0; i < 3; i++) fx.emit({ toon: 'sonic', pal: i ? Z : T.white, x: c.bx, y: c.by, z: 46, s0: 150 + i * 60, s1: 230 + i * 70, life: 9, rot: c.fwd, vx: c.d * (5 + i * 2), delay: i * 2 });
    fx.flash(c.bx, c.by, 300, Z[1], 7, .5);
  };
  HIT['liver.clap'] = (fx, c) => { smack(fx, c, Z, 200); fx.chunks('star5', [Z, T.gold], c.x, c.y + 70, 5, 30, 6, { g: .12, life: 34 }); if (c.fin) finish(fx, c, Z); };

  CAST['liver.stomp'] = (fx, c) => { fx.dust(c.x, 4, 30, 30); };
  TRAIL['liver.stomp'] = (fx, c) => {
    if (c.first) {
      fx.floorT('crater', V, c.bx, 420, 80); fx.floorT('spikes', V, c.bx, 520, 13, { spread: .3 }); rubble(fx, c.bx, 8, 12);
      fx.pop('burst', V, c.x + c.d * 40, 30, 240, 8); fx.dust(c.bx, 8, 110, 46);
      for (let i = 0; i < 5; i++) fx.linesT([V, Z], c.x + c.d * (30 + i * 45), 6, 1, UP, .1, 150 + i * 14, 15, { delay: i, thick: 15 });
    }
  };
  HIT['liver.stomp'] = (fx, c) => { smack(fx, c, V, 170); rubble(fx, c.x, 4); fx.linesT(V, c.x, 10, 5, UP, .4, 180, 16); if (c.fin) finish(fx, c, V); };

  CAST['liver.super'] = (fx, c) => { fx.pop('spikes', V, c.x, c.y, 480, 24, { alpha: .9 }); fx.ringT(X, c.x, c.y, 80, 520, 20); fx.floorT('spikes', V, c.x, 640, 26, { spread: .2 }); fx.chunks('bubble', [X], c.x, 30, 10, 30, 8, { g: .1 }); };
  TRAIL['liver.super'] = (fx, c) => {
    wake(fx, c, [V, X], 3, 240);
    fx.emit({ toon: 'cone', pal: V, x: c.x + c.d * 70, y: c.y + 110, z: 46, s0: 130, s1: 150, life: 4, rot: c.fwd, alpha: .85 });
    if (c.t % 2) fx.sprayT('bubble', X, c.x, c.y + rnd(40, 170), 1, c.fwd + Math.PI, .5, 5, 26, { g: -.05 });
    if (c.t % 3 === 0) fx.dust(c.x - c.d * 40, 2, 24, 40);
  };
}

// ── 췌장: 가는 청록 바늘 선과 네 갈래 반짝임. 무대가 밝아서 굵은 흰 덩어리는 쓰지 않는다 ──
{
  const N = T.pancreas.teal, G = T.pancreas.gold;
  const thrust = (fx, x, y, d, len, pal = N, thick = 20, life = 4) => fx.emit({ toon: 'needle', pal, x: x + d * len / 2, y, z: 46, s0: thick * 8, s1: thick * 6, wide: len / (thick * 8), rot: d > 0 ? 0 : Math.PI, life });
  const prick = (fx, c, size = 130) => { fx.pop('glint', N, c.x, c.y, size * c.big, 8); fx.ringT(N, c.x, c.y, 20, size * .9, 8, { toon: 'thin' }); fx.pop('burst', N, c.x, c.y, size * .6, 6, { rot: rnd(0, TAU) }); };

  CAST['pancreas.lunge'] = (fx, c) => { fx.pop('glint', N, c.x + c.d * 70, c.y - 10, 110, 7); fx.ringT(N, c.x, c.y, 150, 50, 7, { toon: 'thin' }); };
  TRAIL['pancreas.lunge'] = (fx, c) => {
    thrust(fx, c.bx - c.d * c.bw / 2, c.by + rnd(-6, 6), c.d, c.bw * 1.15);
    if (c.t % 7 === 1) { fx.ringT(N, c.bx + c.d * c.bw / 2, c.by, 20, 110, 7, { toon: 'thin' }); fx.pop('glint', G, c.bx + c.d * c.bw / 2, c.by, 80, 6); }
    wake(fx, c, N, 1, 160);
  };
  HIT['pancreas.lunge'] = (fx, c) => { prick(fx, c, 140); fx.linesT([N, G], c.x, c.y, 4, c.fwd, .25, 170, 16, { thick: 9 }); if (c.fin) finish(fx, c, N, 240); };

  CAST['pancreas.plunge'] = (fx, c) => { fx.dust(c.x, 4, 30, 28); fx.linesT(N, c.x, c.y, 4, UP, .3, 120, 10, { thick: 8 }); };
  TRAIL['pancreas.plunge'] = (fx, c) => {
    if (c.f.vy <= 0) { if (c.t % 3 === 0) fx.linesT(N, c.x, c.y + 60, 1, ang(c.d, -1.9), .1, 140, 5, { thick: 8 }); return; }
    fx.linesT([N, T.white], c.bx + rnd(-26, 26), c.by + 120, 2, -UP, .04, 220, 3, { thick: 8 });
    thrust(fx, c.bx - c.d * 20, c.by + 10, c.d, 90, G, 14, 3);
  };
  HIT['pancreas.plunge'] = (fx, c) => { prick(fx, c, 160); fx.floorT('thin', N, c.x, 340, 12, { spread: .25 }); fx.floorT('ring', N, c.x, 220, 10, { spread: .3 }); fx.linesT(N, c.x, 10, 6, UP, .5, 150, 13, { thick: 8 }); if (c.fin) finish(fx, c, N, 240); };

  CAST['pancreas.rising'] = (fx, c) => { fx.ringT(N, c.x, c.y - 60, 140, 40, 6, { toon: 'thin' }); };
  TRAIL['pancreas.rising'] = (fx, c) => {
    if (c.first) { fx.slashT(N, c.bx - c.d * 10, c.by + 10, 360, ang(c.d, 1.2), 9); fx.slashT(G, c.bx - c.d * 30, c.by - 10, 250, ang(c.d, 1.2), 8, { delay: 2, alpha: .85 }); }
    fx.sprayT('drop', [N, G], c.bx + rnd(-30, 30), c.by + rnd(0, 110), 1, UP, .5, 8, 18, { g: .4 });
  };
  HIT['pancreas.rising'] = (fx, c) => { prick(fx, c, 160); fx.slashT(N, c.x, c.y, 300, ang(c.d, 1.2), 8); fx.sprayT('drop', [N, G], c.x, c.y, 7, UP, .7, 11, 20, { g: .45 }); if (c.fin) finish(fx, c, N, 240); };

  CAST['pancreas.stance'] = (fx, c) => { fx.ringT(N, c.x, c.y, 60, 250, 10, { toon: 'thin' }); fx.pop('glint', G, c.x + c.d * 60, c.y + 40, 120, 8); };
  TRAIL['pancreas.stance'] = (fx, c) => {
    if (c.t % 6 === 1) fx.ringT(N, c.x, c.y + 110, 250, 200, 8, { toon: 'thin', alpha: .8 });
    if (c.t % 5 === 0) fx.pop('glint', c.t % 2 ? N : G, c.x + rnd(-80, 80), c.y + rnd(40, 200), 50, 6);
  };
  CAST['pancreas.riposte'] = (fx, c) => { fx.pop('glint', G, c.x, c.y, 300, 9); fx.ringT(G, c.x, c.y, 40, 300, 10, { toon: 'thin' }); };
  TRAIL['pancreas.riposte'] = (fx, c) => { if (c.first) { fx.slashT(G, c.bx, c.by, 340, ang(c.d, .8), 9); fx.slashT(N, c.bx, c.by, 260, ang(c.d, -.5), 8, { delay: 2 }); } };
  HIT['pancreas.riposte'] = (fx, c) => { prick(fx, c, 190); fx.pop('glint', G, c.x, c.y, 300, 10); fx.linesT([N, G], c.x, c.y, 8, c.fwd, .7, 200, 18, { thick: 9 }); finish(fx, c, N, 260); };

  CAST['pancreas.inject'] = (fx, c) => { fx.pop('glint', G, c.x + c.d * 80, c.y - 20, 100, 7); };
  TRAIL['pancreas.inject'] = (fx, c) => {
    thrust(fx, c.bx - c.d * c.bw / 2, c.by, c.d, c.bw * 1.1, G, 16);
    fx.sprayT('bubble', [N, G], c.bx + rnd(-.5, .5) * c.bw, c.by + rnd(-20, 20), 1, c.fwd, .3, 6, 12, { g: 0 });
  };
  HIT['pancreas.inject'] = (fx, c) => {
    prick(fx, c, 130);
    for (let i = 0; i < 10; i++) fx.emit({ toon: 'bubble', pal: i % 2 ? N : G, x: c.x + rnd(-20, 20), y: c.y + rnd(-30, 30), z: 48, vx: -c.d * rnd(5, 9), vy: rnd(-1.5, 1.5), drag: .97, life: 20, s0: rnd(10, 18), s1: 8, delay: i });
    fx.ringT(G, c.x, c.y, 120, 30, 9, { toon: 'thin' });
    if (c.fin) finish(fx, c, N, 240);
  };

  CAST['pancreas.reap'] = (fx, c) => { fx.dust(c.x, 3, 30, 26); };
  TRAIL['pancreas.reap'] = (fx, c) => {
    if (c.first) { fx.emit({ toon: 'arc', pal: N, x: c.bx, y: 34, z: 46, s0: 230, s1: 300, wide: .32, rot: -UP, life: 8, snap: true }); fx.linesT(N, c.bx - c.d * 100, 16, 4, c.fwd, .03, 230, 14, { thick: 8 }); }
    if (c.t % 2) fx.dust(c.bx + rnd(-90, 90), 1, 20, 24);
  };
  HIT['pancreas.reap'] = (fx, c) => { prick(fx, c, 140); fx.linesT(N, c.x, c.y, 4, UP, .5, 130, 12, { thick: 8 }); if (c.fin) finish(fx, c, N, 220); };

  CAST['pancreas.super'] = (fx, c) => { fx.pop('glint', N, c.x, c.y, 460, 22); fx.ringT(N, c.x, c.y, 80, 520, 20, { toon: 'thin' }); fx.ringT(G, c.x, c.y, 60, 380, 20, { delay: 5, toon: 'thin' }); fx.linesT([N, G], c.x, c.y, 16, 0, Math.PI, 200, 8, { thick: 8 }); };
  TRAIL['pancreas.super'] = (fx, c) => {
    for (let i = 0; i < 3; i++) thrust(fx, c.x + c.d * 20, c.by + rnd(-.5, .5) * c.bh, c.d, c.bw * rnd(.9, 1.25), [N, T.white, G][i], 20, 5);
    if (c.t % 4 === 0) fx.slashT(c.t % 8 ? N : G, c.bx + c.d * 40, c.by, 260, rnd(0, TAU), 6, { alpha: .9 });
    if (c.t % 5 === 1) fx.pop('glint', G, c.bx + c.d * c.bw / 2, c.by + rnd(-60, 60), 110, 6);
    if (c.t % 3 === 0) fx.emit({ toon: 'arc', pal: N, x: c.x - c.d * 30, y: c.y + 110, z: 30, s0: 190, s1: 210, life: 6, rot: c.fwd, alpha: .45 });
  };
  HIT['pancreas.super'] = (fx, c) => {
    prick(fx, c, 150); fx.linesT([N, G], c.x, c.y, 3, c.fwd, .3, 180, 17, { thick: 9 });
    if (c.fin) { finish(fx, c, N, 340); fx.linesT([N, G, T.white], c.x, c.y, 18, 0, Math.PI, 260, 20, { thick: 10 }); fx.pop('burst', N, c.x, c.y, 300, 10); }
  };
}
