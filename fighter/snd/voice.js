// 기합과 비명. 톱니파(성대)를 포먼트 필터 셋(입 모양)에 통과시켜 "하!", "이얏!", "으아" 같은 소리를 만든다.
import { ctx, bus, spot, jit, pick } from './core.js';

// 모음마다 입 안에서 울리는 자리 셋(Hz).
const VOWEL = { a: [800, 1250, 2600], e: [520, 1850, 2500], i: [300, 2300, 3000], o: [480, 880, 2500], u: [340, 900, 2300] };
// 캐릭터 목소리: 높이(hz), 몸집(size, 클수록 포먼트가 내려가 굵게 들린다), 거친 정도(grit).
const WHO = {
  heart: { hz: 210, size: 1, grit: .12 },
  kidney: { hz: 295, size: .88, grit: .05 },
  liver: { hz: 118, size: 1.22, grit: .3 },
  pancreas: { hz: 255, size: .92, grit: .08 },
  soda: { hz: 370, size: .78, grit: .1 },
  fries: { hz: 168, size: 1.05, grit: .28 },
  ramen: { hz: 232, size: .96, grit: .18 },
  burger: { hz: 86, size: 1.4, grit: .42 },
  muscle: { hz: 150, size: 1.18, grit: .26 },
  soju: { hz: 245, size: .94, grit: .14 },
  smoke: { hz: 190, size: .9, grit: .36 },
  visceral: { hz: 70, size: 1.55, grit: .5 },
};
// 외침: [소리(h는 숨, 나머지는 모음), 길이(초), 높이 곡선(배율)].
const CRY = {
  attack: [['ha', .15, [1.3, .92]], ['hia', .19, [1.1, 1.42, 1.02]], ['ei', .17, [1, 1.36]], ['ho', .16, [1.24, .86]]],
  special: [['hia', .3, [1, 1.5, 1.22]], ['eia', .32, [1.1, 1.46, 1.12]], ['oa', .28, [.92, 1.42, 1.16]]],
  super: [['oaa', .68, [.8, 1.2, 1.62, 1.42]]],
  hurt: [['u', .11, [1.22, .8]], ['o', .13, [1.3, .84]], ['a', .12, [1.36, .9]]],
  ko: [['uaa', .92, [1.5, 1.34, .92, .56]]],
};
const LOUD = { attack: .5, special: .62, super: .8, hurt: .5, ko: .8 };

export function shout(who, kind, pan = 0) {
  const v = WHO[who];
  if (!ctx || !v) return;
  const now = ctx.currentTime, big = kind === 'ko' || kind === 'super';
  if (!big && now < (v.busy || 0)) return;
  const [sound, seconds, curve] = pick(CRY[kind]), at = now + .004, breathy = sound[0] === 'h';
  const mouth = (breathy ? sound.slice(1) : sound).split('').map(ch => VOWEL[ch]), base = v.hz * jit(.05), volume = LOUD[kind];
  v.busy = now + seconds + .14;

  const o = spot(pan, big ? .3 : .1), env = ctx.createGain(), soft = ctx.createBiquadFilter(), cords = ctx.createGain();
  soft.type = 'lowpass'; soft.frequency.value = 4200; env.connect(soft).connect(o);
  env.gain.setValueAtTime(.0001, at); env.gain.linearRampToValueAtTime(volume, at + .018);
  env.gain.setValueAtTime(volume, at + seconds * .55); env.gain.exponentialRampToValueAtTime(.0005, at + seconds);

  // 성대: 살짝 어긋난 톱니파 둘이 높이 곡선을 따라간다.
  for (const cents of [0, 11]) {
    const osc = ctx.createOscillator(), part = ctx.createGain(); osc.type = 'sawtooth'; osc.detune.value = cents; part.gain.value = .5;
    osc.frequency.setValueAtTime(base * curve[0], at);
    curve.forEach((k, i) => { if (i) osc.frequency.linearRampToValueAtTime(base * k, at + seconds * i / (curve.length - 1)); });
    osc.connect(part).connect(cords); osc.start(at); osc.stop(at + seconds + .05);
  }
  // 숨소리: 거친 목일수록 많이 섞고, "하"로 시작하면 앞머리에 한 번 더 뱉는다.
  const air = ctx.createBufferSource(), puff = ctx.createGain(); air.buffer = bus.hiss; air.loop = true;
  puff.gain.setValueAtTime(breathy ? .9 : v.grit, at); puff.gain.linearRampToValueAtTime(v.grit, at + .05);
  air.connect(puff).connect(cords); air.start(at, Math.random()); air.stop(at + seconds + .05);

  // 입 모양: 포먼트 셋을 나란히 두고 모음에서 모음으로 미끄러진다.
  [0, 1, 2].forEach(i => {
    const f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = 'bandpass'; f.Q.value = [6, 9, 10][i]; g.gain.value = [1.6, 1, .5][i];
    f.frequency.setValueAtTime(mouth[0][i] / v.size, at);
    mouth.forEach((vowel, j) => { if (j) f.frequency.linearRampToValueAtTime(vowel[i] / v.size, at + seconds * .7 * j / (mouth.length - 1)); });
    cords.connect(f).connect(g).connect(env);
  });
  // 가슴 울림을 조금 남긴다.
  const chest = ctx.createBiquadFilter(), body = ctx.createGain(); chest.type = 'lowpass'; chest.frequency.value = 700; body.gain.value = .12;
  cords.connect(chest).connect(body).connect(env);
}
