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
    const r = c.t * .34, cs = Math.cos(r), sn = Math.sin(r), at = (x, y, z) => [x * cs + y * sn, Math.max(8, 62 - x * sn + y * cs), z];
    return { raw: true, roll: r, by: 62, sx: 1.04, sy: .96, hf: at(76, 8, -34), hb: at(-76, 8, 40), ff: at(26, -76, -22), fb: at(-26, -76, 24), mouth: 'grit' };
  },
  press: c => ({ lean: c.k < .5 ? -.2 : 1.25, by: c.k < .5 ? 98 : 66, hf: [70, 150, -60], hb: [60, 140, 64], ff: [-50, 70, -24], fb: [-60, 60, 26], mouth: 'open' }),
};
ATTACKS.dash = ATTACKS.charge;

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
      if (Q.raw) { const fade = f.t > (m.startup || 0) + (m.active ?? 0) ? clamp01(c.k) : 1; blend(P, Q, fade); }
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
