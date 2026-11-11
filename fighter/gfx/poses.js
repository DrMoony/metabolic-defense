// 자세 사전. 시뮬 상태(f.state, f.move.pose, f.t)를 몸통 위치·기울기와 손발 목표점으로 바꾼다.
// 좌표는 발밑 기준: x 앞(상대 쪽), y 위, z 화면 쪽. lean은 앞으로 숙이는 각(라디안), turn은 몸을 상대 쪽으로 돌린 각(도).
const lerp = (a, b, k) => a + (b - a) * k;
const smooth = k => k * k * (3 - 2 * k);
const easeOut = k => 1 - (1 - k) * (1 - k);
const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);
const LIMBS = ['hf', 'hb', 'ff', 'fb'];

// P에 Q를 w만큼 섞는다. 숫자와 좌표는 보간하고 표정 같은 글자는 w가 절반을 넘으면 바꾼다.
export function blend(P, Q, w) {
  for (const key in Q) {
    const q = Q[key], p = P[key];
    if (Array.isArray(q)) { if (!p) P[key] = [...q]; else for (let i = 0; i < 3; i++) p[i] = lerp(p[i], q[i] ?? p[i], w); }
    else if (typeof q === 'number') P[key] = lerp(p ?? q, q, w);
    else if (w > .5) P[key] = q;
  }
  return P;
}

// 공격 진행도. 준비 동작에서 살짝 뒤로 당겼다가(음수) 한 번에 뻗고, 판정이 끝나면 부드럽게 돌아온다.
function strike(t, m) {
  const s = Math.max(1, m.startup || 1), a = m.active ?? 2, r = Math.max(1, m.recovery ?? 10);
  if (t <= s) {
    const u = t / s;
    if (s <= 3) return u;
    return u < .45 ? -.2 * easeOut(u / .45) : -.2 + 1.2 * ((u - .45) / .55) ** 3;
  }
  if (t <= s + a) return 1 + .06 * Math.sin(Math.PI * (t - s) / Math.max(1, a));
  return 1 - smooth(clamp01((t - s - a) / r));
}

const crouched = S => ({ by: S.by - 40, sx: 1.1, sy: .82, hf: [52, 88, -16], hb: [54, 58, 44], ff: [42, 0, -18], fb: [-42, 0, 22] });
const airborne = S => ({ by: S.by + 4, hf: [46, 152, -18], hb: [-30, 140, 40], ff: [24, 34, -14], fb: [-26, 24, 18] });
const alt = (t, every) => Math.floor(t / every) % 2;
// 몸통 중심(높이 by)을 축으로 r만큼 구른 자리. 구르는 기술에서 손발이 몸과 같이 돌게 한다.
const rolled = (r, by) => { const cs = Math.cos(r), sn = Math.sin(r); return (x, y, z) => [x * cs + y * sn, Math.max(8, by - x * sn + y * cs), z]; };
// 뛰어오르는 기술: 떠 있는 동안은 섞지 않고 그 자세를 끝까지 지킨다(hold).
const flying = (c, pose) => ({ ...pose, raw: c.air, hold: c.air });

// 공격 자세. c = { f, t, m, k, S(기본 자세), air }. 돌려주는 값은 "다 뻗었을 때" 모습이고 k만큼 섞인다. raw: true면 섞지 않고 그대로 쓴다.
const ATTACKS = {
  punch: () => ({ hf: [126, 150, -6], bx: 8, lean: .06, turn: 42 }),
  punch2: () => ({ hb: [142, 146, 8], hf: [38, 118, -24], bx: 18, lean: .14, turn: 18 }),
  hook: () => ({ hf: [110, 206, -4], hb: [20, 90, 44], bx: 14, by: 124, lean: .2, turn: 47, sy: 1.05 }),
  kick: () => ({ ff: [158, 126, -4], lean: -.22, bx: -8, hf: [26, 136, -26], hb: [-10, 92, 46], turn: 44 }),
  cpunch: c => ({ ...crouched(c.S), hf: [126, 88, -6], lean: .08, turn: 41 }),
  sweep: c => ({ ...crouched(c.S), ff: [160, 14, -4], lean: -.24, hf: [20, 70, -24], turn: 43 }),
  jpunch: c => ({ ...airborne(c.S), hf: [106, 100, -6], lean: .3, turn: 41 }),
  jkick: c => ({ ...airborne(c.S), ff: [124, 54, -4], fb: [-40, 60, 18], lean: -.22, turn: 43 }),
  throw: () => ({ hf: [92, 152, -22], hb: [88, 116, 34], bx: 12, lean: .16 }),
  grab: () => ({ hf: [104, 156, -40], hb: [100, 104, 50], bx: 22, lean: .26, ff: [56, 0, -16], mouth: 'grit' }),
  slam: c => {
    const u = clamp01(c.t / Math.max(1, (c.m.startup || 12)));
    return u < 1
      ? { raw: true, hf: [lerp(70, 10, u), lerp(150, 236, u), -26], hb: [lerp(70, 6, u), lerp(110, 232, u), 30], lean: lerp(.1, -.3, u), by: c.S.by + 8 * u, sy: 1 + .06 * u, mouth: 'grit' }
      : { hf: [96, 40, -26], hb: [92, 34, 30], lean: .55, by: c.S.by - 22, bx: 16, sy: .9, sx: 1.08, mouth: 'open' };
  },

  // 심장
  rush: c => { const a = alt(c.t, 3); return { hf: a ? [142, 152, -6] : [62, 122, -20], hb: a ? [54, 112, 40] : [140, 132, 12], lean: .2, bx: 14, turn: a ? 62 : 20, ff: [44, 0, -16] }; },
  upper: () => ({ hb: [46, 268, 14], hf: [20, 110, -26], by: 128, sy: 1.12, sx: .94, lean: .1, turn: 8, ff: [28, 22, -16] }),
  weave: c => { const w = Math.sin(c.t * .5); return { by: c.S.by - 26, lean: .28 + w * .1, bx: 10 + w * 8, hf: [46, 116, -18], hb: [40, 80, 44], sy: .9, sx: 1.06, turn: 48 + w * 22 }; },
  super: c => { const a = alt(c.t, 2); return { hf: a ? [150, 160, -6] : [60, 118, -20], hb: a ? [50, 108, 40] : [146, 128, 12], lean: .24, bx: 18, turn: a ? 64 : 14, eyes: 'fierce' }; },

  // 신장
  cast: c => ({ ...(c.air ? airborne(c.S) : {}), hf: [108, c.S.by + 16, -14], hb: [100, c.S.by - 8, 30], bx: 10, lean: .08 }),
  barrier: () => ({ hf: [78, 172, -22], hb: [80, 84, 36], bx: 4, lean: -.04, turn: 40, mouth: 'grit' }),
  lob: c => ({ hf: c.k < .5 ? [-24, 214, -20] : [96, 176, -12], hb: [44, 96, 44], lean: c.k < .5 ? -.16 : .16, turn: 36 }),
  cast2: () => ({ hf: [116, 156, -18], hb: [114, 110, 36], bx: 16, lean: .14, sy: 1.04 }),

  // 간
  charge: () => ({ lean: .6, bx: 22, by: 100, hf: [-36, 86, -30], hb: [-44, 70, 40], ff: [50, 0, -16], fb: [-60, 0, 20], mouth: 'grit' }),
  stomp: c => (c.k < .6
    ? { ff: [44, 78, -16], hf: [14, 232, -24], hb: [8, 228, 30], lean: -.14, by: 122 }
    : { ff: [56, 0, -16], hf: [84, 36, -26], hb: [80, 30, 32], lean: .42, by: 92, sy: .88, sx: 1.08 }),

  // 췌장
  lunge: () => ({ hf: [156, 124, -6], hb: [-62, 150, 30], ff: [84, 0, -14], fb: [-72, 0, 20], by: 96, bx: 22, lean: .2, turn: 44 }),
  stance: () => ({ hf: [40, 178, -16], hb: [-24, 96, 40], lean: -.08, turn: 36, by: 116, eyes: 'fierce', mouth: 'smirk' }),
  riposte: () => ({ hf: [160, 148, -6], hb: [-56, 140, 30], ff: [70, 0, -14], bx: 20, lean: .18, turn: 44 }),
  rising: c => ({ hf: [lerp(70, 62, c.k), lerp(60, 258, c.k), -8], hb: [-20, 80, 40], by: 126, sy: 1.1, lean: -.06, turn: 30, ff: [30, 26, -16] }),
  flurry: c => ({ raw: true, hf: [150 - (c.t % 4) * 14, 96 + (c.t * 37 % 96), -6], hb: [-50, 140, 30], ff: [70, 0, -14], fb: [-56, 0, 20], by: 100, bx: 18, lean: .16, turn: 43, mouth: 'open' }),

  // 탄산
  spray: c => ({ lean: .5, bx: 10, by: 106, hf: [50, 70, -26], hb: [30, 60, 46], sx: 1 + Math.sin(c.t * 1.9) * .03, mouth: 'open' }),
  burst: c => (c.k < .7
    ? { raw: true, bx: Math.sin(c.t * 2.4) * 5, lean: Math.sin(c.t * 1.7) * .08, hf: [44, 150, -20], hb: [30, 144, 44], sy: .92, sx: 1.06, mouth: 'grit' }
    : { by: 132, sy: 1.2, sx: .9, hf: [50, 200, -30], hb: [-40, 196, 40], ff: [26, 24, -16], fb: [-24, 18, 20], mouth: 'open' }),
  dive: c => ({ ...airborne(c.S), lean: -.55, ff: [84, -8, -6], fb: [-30, 66, 20], hf: [-10, 160, -24], hb: [-50, 130, 40], mouth: 'grin' }),
  slip: c => ({ by: 66, sy: .62, sx: 1.26, lean: .1, spin: c.t * .5, hf: [40, 40, -30], hb: [-40, 40, 40], ff: [34, 0, -16], fb: [-34, 0, 20] }),
  geyser: c => ({ lean: -.2, by: 108 + Math.sin(c.t * 2) * 3, hf: [40, 210, -34], hb: [-30, 206, 44], sy: 1.06, mouth: 'open' }),

  // 튀김
  slide: () => ({ lean: -.95, by: 52, bx: 6, ff: [112, 14, -8], fb: [74, 6, 20], hf: [-40, 44, -24], hb: [-56, 30, 40], mouth: 'grin' }),
  drop: () => ({ hf: [88, 40, -18], hb: [-40, 96, 44], lean: .3, by: 104 }),
  spear: () => ({ by: 158, sy: 1.6, sx: .8, lean: .08, hf: [52, 92, -30], hb: [-44, 88, 44], ff: [16, 0, -14], fb: [-14, 0, 18], mouth: 'open' }),

  // 라면
  whip: c => ({ hf: c.k < .4 ? [-30, 190, -20] : [174, 128, -8], hb: [14, 84, 46], lean: c.k < .4 ? -.14 : .2, bx: 14, turn: 41, prop: 1 }),
  steam: () => ({ lean: .34, bx: 8, hf: [20, 70, -34], hb: [-10, 66, 46], mouth: 'open', sy: .96 }),
  riser: () => ({ ff: [92, 232, -6], lean: -.4, by: 138, hf: [-20, 150, -26], hb: [-50, 110, 40], fb: [-10, 40, 18], sy: 1.06 }),
  tornado: c => ({ raw: true, prop: 1, spin: c.t * .62, by: 118 + Math.sin(c.t * .5) * 6, hf: [96, 150, -60], hb: [-96, 150, 60], ff: [20, 20, -14], fb: [-20, 8, 18], mouth: 'open' }),

  // 대왕버거
  // 손발이 몸과 같이 돌아서 얼굴을 가리지 않는다. at은 몸통 기준 자리를 구른 각만큼 돌린 좌표.
  roll: c => {
    const r = c.t * .34, at = rolled(r, 62);
    return { raw: true, roll: r, by: 62, sx: 1.04, sy: .96, hf: at(76, 8, -34), hb: at(-76, 8, 40), ff: at(26, -76, -22), fb: at(-26, -76, 24), mouth: 'grit' };
  },
  press: c => ({ lean: c.k < .5 ? -.2 : 1.25, by: c.k < .5 ? 98 : 66, hf: [70, 150, -60], hb: [60, 140, 64], ff: [-50, 70, -24], fb: [-60, 60, 26], mouth: 'open' }),
};

// 4차에 더한 기술들.
Object.assign(ATTACKS, {
  // 심장: 날아 차는 무릎, 곧게 뚫는 주먹, 두 주먹을 벌려 터뜨리는 전기 충격.
  knee: c => flying(c, { lean: .34, by: c.S.by + 6, ff: [74, 92, -8], fb: [-58, 18, 18], hf: [-24, 118, -26], hb: [52, 176, 30], turn: 30, mouth: 'open' }),
  dash: () => ({ hb: [176, 150, 6], hf: [-30, 128, -26], lean: .42, bx: 30, by: 104, turn: 8, ff: [78, 0, -16], fb: [-86, 8, 20], mouth: 'open' }),
  shock: c => (c.k < .5
    ? { hf: [46, 140, -8], hb: [44, 132, 12], by: c.S.by - 16, sy: .9, sx: 1.06, lean: .16, mouth: 'grit' }
    : { hf: [112, 168, -44], hb: [-104, 168, 48], by: c.S.by + 12, sy: 1.12, sx: .95, lean: -.06, turn: 60, ff: [40, 0, -18], fb: [-44, 0, 22], mouth: 'open' }),

  // 신장: 물마루를 타고 가기, 손을 들어 올려 물기둥 세우기, 뒤로 넘으며 차기.
  surf: c => ({ by: c.S.by + 14 + Math.sin(c.t * .6) * 4, lean: -.14, turn: 68, bx: 6, hf: [88, 168, -30], hb: [-80, 150, 40], ff: [50, 26, -16], fb: [-50, 22, 20], mouth: 'grin' }),
  fountain: c => ({ hf: [lerp(70, 76, c.k), lerp(40, 246, c.k), -14], hb: [26, 92, 42], lean: -.12, by: c.S.by + 6, sy: 1.06, turn: 30, mouth: 'open' }),
  flip: c => {
    if (!c.air) return { by: c.S.by - 26, sy: .86, sx: 1.08, lean: -.1, hf: [40, 96, -18], hb: [-30, 90, 40], ff: [36, 0, -16], fb: [-40, 0, 20] };
    const r = -Math.PI * 2 * clamp01((c.t - c.m.startup) / 23), by = c.S.by, at = rolled(r, by);
    return { raw: true, hold: true, roll: r, by, sy: .94, sx: 1.04, hf: at(-40, 30, -30), hb: at(-50, 10, 40), ff: at(20, -118, -8), fb: at(-30, -70, 20), mouth: 'grin' };
  },

  // 간: 밑에서 퍼 올리기, 숨 고르기, 두 손바닥 마주 치기.
  heave: c => (c.k < .5
    ? { hf: [96, 44, -30], hb: [92, 38, 34], lean: .5, by: c.S.by - 30, sy: .88, sx: 1.08, ff: [56, 0, -18], mouth: 'grit' }
    : { hf: [70, 262, -30], hb: [62, 256, 34], lean: -.22, by: c.S.by + 16, sy: 1.14, sx: .94, ff: [40, 0, -18], mouth: 'open' }),
  regen: c => { const b = Math.sin(c.t * .28); return { raw: true, by: c.S.by + b * 5, sy: 1 + b * .04, sx: 1 - b * .025, lean: -.04, turn: 30, hf: [44, 118 + b * 6, -24], hb: [40, 112 + b * 6, 36], eyes: 'shut', mouth: 'calm' }; },
  clap: c => (c.k < .45
    ? { hf: [30, 158, -96], hb: [26, 154, 100], lean: -.12, by: c.S.by + 6, sy: 1.05, turn: 70, mouth: 'grit' }
    : { hf: [138, 152, -8], hb: [136, 148, 10], lean: .26, bx: 16, turn: 70, ff: [54, 0, -18], mouth: 'open' }),

  // 췌장: 높이 뛰어 내리꽂기, 주사기로 찌르고 누르기, 바닥을 길게 쓸기.
  plunge: c => {
    if (!c.air) return { hf: [84, 26, -6], hb: [-50, 150, 36], lean: .5, by: c.S.by - 30, sy: .9, ff: [60, 0, -16], fb: [-56, 0, 20], mouth: 'grit' };
    return c.f.vy < 0
      ? { raw: true, hold: true, by: c.S.by + 8, sy: 1.08, sx: .95, lean: -.12, hf: [34, 262, -8], hb: [-30, 150, 40], ff: [18, 44, -14], fb: [-34, 30, 18], mouth: 'grit' }
      : { raw: true, hold: true, by: c.S.by, lean: .78, hf: [78, 6, -6], hb: [-56, 178, 40], ff: [-44, 78, -14], fb: [-76, 98, 18], mouth: 'open' };
  },
  inject: c => ({ hf: [158, 150, -6], hb: [c.k > .9 ? 118 : 84, 150, 10], bx: 18, lean: .16, turn: 30, ff: [62, 0, -14], fb: [-50, 0, 20], mouth: 'smirk' }),
  reap: () => ({ ff: [172, 12, -4], fb: [-40, 0, 22], lean: -.34, bx: -6, hf: [-10, 64, -26], hb: [-58, 14, 40], turn: 50 }),

  // 탄산: 머리부터 날아가기, 공중에서 병뚜껑 내던지기.
  rocket: c => flying(c, { lean: 1.2, by: 92, sy: 1.14, sx: .93, hf: [-54, 98, -30], hb: [-64, 86, 40], ff: [-98, 72, -14], fb: [-108, 58, 18], mouth: 'grin' }),
  capshot: c => ({ ...airborne(c.S), hf: c.k < .5 ? [-10, 214, -18] : [84, 62, -10], hb: [-34, 150, 40], lean: c.k < .5 ? -.1 : .34, mouth: 'grin' }),

  // 튀김: 세 갈래 던지기, 부채처럼 휘두르기, 발끝으로 불씨 긋기.
  darts: c => ({ hf: c.k < .5 ? [-34, 186, -22] : [128, 150, -10], hb: [40, 100, 44], lean: c.k < .5 ? -.18 : .22, bx: 10, turn: 34, ff: [48, 0, -16] }),
  flap: c => { const a = c.t * .95; return { hf: [96 + Math.cos(a) * 26, 150 + Math.sin(a) * 78, -10], hb: [30, 96, 44], lean: .1, bx: 8, turn: 40, mouth: 'grit' }; },
  ignite: () => ({ ff: [136, 16, -6], fb: [-36, 0, 22], lean: -.2, by: 104, hf: [96, 104, -20], hb: [-40, 120, 42], turn: 46, mouth: 'smirk' }),

  // 라면: 쉴 새 없이 차기, 면발 올가미 던지기, 국물을 차서 보내기.
  stab: c => ({ raw: true, ff: [170 - (c.t % 4) * 16, 96 + (c.t * 37 % 84), -6], fb: [-44, 0, 22], lean: -.26, bx: 6, by: 112, hf: [10, 150, -26], hb: [-46, 116, 42], turn: 46, mouth: 'open' }),
  reel: c => ({ hf: c.k < .4 ? [-36, 200, -20] : [178, 150, -8], hb: [30, 96, 46], lean: c.k < .4 ? -.16 : .24, bx: 16, turn: 38, prop: 1, mouth: 'grit' }),
  broth: () => ({ ff: [140, 34, -6], fb: [-40, 0, 22], lean: -.28, by: 98, bx: -4, hf: [6, 120, -28], hb: [-52, 96, 42], turn: 44, mouth: 'open' }),

  // 대왕버거: 두 주먹 내려찍기, 빵 뚜껑으로 올려치기, 팔 벌려 포효하기.
  hammer: c => {
    const u = clamp01(c.t / Math.max(1, c.m.startup));
    return u < 1
      ? { raw: true, hf: [lerp(60, -6, u), lerp(140, 262, u), -22], hb: [lerp(60, -10, u), lerp(120, 258, u), 26], lean: lerp(.06, -.3, u), by: c.S.by + 14 * u, sy: 1 + .1 * u, sx: 1 - .04 * u, mouth: 'grit' }
      : { hf: [110, 30, -22], hb: [106, 24, 26], lean: .62, by: c.S.by - 26, bx: 18, sy: .86, sx: 1.1, mouth: 'open' };
  },
  lid: c => ({ by: c.S.by + 46, sy: 1.34, sx: .88, lean: -.16, hf: [-30, 70, -34], hb: [-44, 66, 46], ff: [22, 0, -16], fb: [-20, 0, 20], mouth: 'open' }),
  roar: c => ({ raw: true, sx: 1.1 + Math.sin(c.t * 1.6) * .03, sy: 1.04 + Math.sin(c.t * 1.6 + 1) * .03, lean: .18, by: c.S.by + 4, hf: [56, 176, -92], hb: [-40, 176, 96], ff: [46, 0, -22], fb: [-50, 0, 26], turn: 20, mouth: 'open' }),
});

export function poseFor(f, frame, model) {
  const S = model.stance, phase = frame * .11 + f.side * 2, bob = Math.sin(phase) * S.bob;
  const P = { bx: 0, by: S.by, lean: S.lean, turn: S.turn, sx: 1, sy: 1, spin: 0, roll: 0, prop: S.prop ?? 1, hf: [...S.hf], hb: [...S.hb], ff: [...S.ff], fb: [...S.fb], eyes: 'open', mouth: 'calm', rate: .32 };
  const put = Q => blend(P, Q, 1);
  const idle = () => {
    P.by += bob; P.hf[1] += bob * 1.2; P.hb[1] += bob * .8; P.sy = 1 + Math.sin(phase) * .012;
    if (S.sway) { P.lean += Math.sin(phase * .6) * .012 * S.sway; P.bx += Math.sin(phase * .6) * S.sway; }
    // 복서는 제자리에서 통통 튄다.
    if (S.bounce) { const hop = Math.abs(Math.sin(frame * .21 + f.side)); P.by += hop * 5; P.ff[1] = hop * 4; P.fb[1] = (1 - hop) * 3; }
  };
  switch (f.state) {
    case 'idle': idle(); break;
    case 'walk': {
      const back = f.vx * f.facing < 0, w = Math.sin(frame * .34) * (back ? -1 : 1);
      P.ff[0] += w * 22; P.ff[1] = Math.max(0, w) * 14; P.fb[0] -= w * 22; P.fb[1] = Math.max(0, -w) * 14;
      P.by += Math.abs(w) * 4 + bob * .4; P.lean += back ? -.05 : .06; P.hf[0] -= w * 6; P.hb[0] += w * 6;
      break;
    }
    case 'crouch': put(crouched(S)); break;
    case 'prejump': put({ by: S.by - 22, sy: .82, sx: 1.1 }); P.rate = .6; break;
    case 'jump': put(airborne(S)); P.lean = (f.vx || 0) * f.facing * .02; P.sy = f.vy < 0 ? 1.08 : .98; P.sx = f.vy < 0 ? .95 : 1.02; P.rate = .45; break;
    case 'block': {
      if (f.blockLow) put(crouched(S));
      put({ hf: [50, P.by + 30, -4], hb: [56, P.by - 8, 34], lean: -.08, bx: -6, turn: 42, mouth: 'grit' }); P.rate = .6; break;
    }
    case 'hit': put({ lean: -.3, bx: -12 + Math.sin(f.t * 2.2) * 3, hf: [8, 158, -30], hb: [-46, 120, 40], eyes: 'shut', mouth: 'o', sy: 1.04, sx: .97 }); P.rate = .75; break;
    case 'held': put({ lean: -.34, by: S.by + 6, hf: [-30, 70, -30], hb: [-40, 60, 40], ff: [20, 14, -14], fb: [-12, 8, 18], eyes: 'wide', mouth: 'o' }); P.rate = .7; break;
    case 'air': put({ lean: -1.15, by: 96, hf: [-30, 152, -30], hb: [-60, 112, 40], ff: [54, 70, -14], fb: [30, 42, 18], eyes: 'shut', mouth: 'o' }); P.rate = .6; break;
    case 'down': put({ lean: -Math.PI / 2, by: 38, hf: [-74, 22, -30], hb: [-62, 12, 40], ff: [80, 12, -14], fb: [72, 6, 18], eyes: f.isKo ? 'ko' : 'shut', mouth: f.isKo ? 'wavy' : 'o' }); P.rate = .6; break;
    case 'getup': { const k = easeOut(clamp01(f.t / 16)); P.lean = -Math.PI / 2 * (1 - k); P.by = lerp(38, S.by, k); P.rate = .7; break; }
    case 'win': put({ hf: [58, 210 + bob, -40], hb: [-58, 210 - bob, 44], by: S.by + bob + Math.abs(Math.sin(frame * .16)) * 10, turn: 14, eyes: 'happy', mouth: 'grin' }); break;
    case 'attack': {
      const m = f.move || {}, make = ATTACKS[m.pose] || ATTACKS.punch;
      const c = { f, t: f.t, m, k: strike(f.t, m), S, air: f.y < 0 };
      const Q = make(c);
      // 몸을 키운 캐릭터는 멀리 뻗는 손발만 판정 길이에 맞춰 줄인다.
      if (S.far) for (const key of LIMBS) if (Q[key] && Q[key][0] > 100) Q[key] = [Q[key][0] * S.far, Q[key][1] * S.far, Q[key][2]];
      P.eyes = 'fierce'; P.mouth = c.k > .3 ? 'open' : 'grit'; P.rate = .7;
      if (m.crouch) put(crouched(S));
      if (Q.raw) { const fade = !Q.hold && f.t > (m.startup || 0) + (m.active ?? 0) ? clamp01(c.k) : 1; blend(P, Q, fade); }
      else {
        // 뒤로 당기는 구간(k<0)에서는 손발만 반대로 빼고 표정은 그대로 둔다.
        const w = c.k;
        for (const key in Q) {
          const q = Q[key];
          if (Array.isArray(q)) for (let i = 0; i < 3; i++) P[key][i] = lerp(P[key][i], q[i], LIMBS.includes(key) ? Math.max(w, -.12) : w);
          else if (typeof q === 'number') P[key] = lerp(P[key], q, w);
          else if (w > .2) P[key] = q;
        }
      }
      break;
    }
    default: idle();
  }
  // 캐릭터별 손보기: 공용 자세에서 손이 얼굴을 가리는 몸집은 여기서 손 자리를 옮긴다.
  const fix = model.fix && model.fix[f.state === 'block' && f.blockLow ? 'blockLow' : f.state];
  if (fix) blend(P, fix, 1);
  return P;
}
