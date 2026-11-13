// 효과음. 파일 없이 즉석에서 합성한다. 소리 길은 snd/core.js, 기합은 snd/voice.js, 음악은 snd/music.js.
import { ctx, spot, tone, noise, jit, cycle, mix, MODES } from './snd/core.js';
import { shout } from './snd/voice.js';

// 필살기를 낼 때 나는 소리는 기술 성격에 따라 열두 가지로 나눈다(기술 키 → 소리).
export const VOICE = {
  rush: 'multi', spray: 'multi', roll: 'multi', upper: 'rise', rising: 'rise', riser: 'rise', spear: 'rise', burst: 'rise', riposte: 'rise',
  charge: 'dash', slide: 'dash', lunge: 'dash', dive: 'dash', weave: 'dash', slip: 'dash', cast: 'cast', lob: 'cast', drop: 'cast', steam: 'cast',
  barrier: 'guard', stance: 'guard', grab: 'heavy', press: 'heavy', stomp: 'heavy', whip: 'snap',
  knee: 'rise', dash: 'dash', shock: 'zap', surf: 'splash', fountain: 'splash', flip: 'dash', heave: 'heavy', regen: 'heal', clap: 'boom',
  plunge: 'dash', inject: 'zap', reap: 'snap', rocket: 'splash', capshot: 'cast', darts: 'multi', flap: 'multi', ignite: 'flare',
  stab: 'multi', reel: 'snap', broth: 'splash', hammer: 'heavy', lid: 'rise', roar: 'boom',
};
const VOICES = {
  multi: o => [0, .055, .11].forEach((at, i) => { tone(o, 'square', 540 + i * 140, 380 + i * 120, .06, .16, at); noise(o, .05, .34, 'bandpass', 2200 + i * 500, 1200, 1.5, at); }),
  rise: o => { tone(o, 'sawtooth', 190, 1050, .24, .2); tone(o, 'sine', 285, 1400, .24, .18); noise(o, .24, .36, 'bandpass', 700, 4200, 1.2); },
  dash: o => { noise(o, .2, .7, 'bandpass', 500, 2600, .9); tone(o, 'sawtooth', 280, 100, .18, .16); },
  cast: o => { tone(o, 'triangle', 880, 640, .14, .2); tone(o, 'triangle', 1320, 960, .18, .14, .05); noise(o, .16, .3, 'highpass', 3000, 6000, .7); },
  guard: o => { tone(o, 'triangle', 990, 990, .14, .2); tone(o, 'triangle', 1485, 1485, .24, .17, .06); tone(o, 'sine', 1980, 1980, .3, .1, .1); },
  heavy: o => { tone(o, 'sine', 120, 46, .3, .5); tone(o, 'square', 84, 58, .18, .1); noise(o, .16, .2, 'lowpass', 500, 200); },
  snap: o => { noise(o, .05, .4, 'highpass', 4500, 7000, .7); tone(o, 'square', 1600, 560, .06, .12); noise(o, .12, .32, 'bandpass', 900, 3000, 2); },
  zap: o => { [0, .035, .07, .105].forEach((at, i) => tone(o, 'square', 2100 - i * 320, 220, .045, .13, at)); noise(o, .16, .4, 'highpass', 5000, 8000, .7); },
  splash: o => { noise(o, .34, .7, 'bandpass', 2600, 700, .7); noise(o, .2, .3, 'highpass', 5000, 5000, .7, .04); tone(o, 'sine', 540, 170, .24, .16); },
  heal: o => [523, 659, 784, 1047].forEach((hz, i) => tone(o, 'sine', hz, hz * 1.01, .26, .1, i * .07, .01)),
  boom: o => { tone(o, 'sawtooth', 160, 52, .4, .3); tone(o, 'sine', 78, 34, .5, .5); noise(o, .32, .28, 'lowpass', 1200, 300); },
  flare: o => { noise(o, .4, .8, 'bandpass', 900, 4200, .8); tone(o, 'sawtooth', 170, 560, .3, .17); },
};
// 필살기가 맞을 때 기본 타격음 위에 얹는 소리. 캐릭터마다 다르다(심장은 쿵쿵 두 번 뛴다).
const ACCENT = {
  heart: o => { tone(o, 'sine', 95, 50, .1, .5); tone(o, 'sine', 80, 45, .12, .45, .11); },
  kidney: o => { noise(o, .16, .24, 'bandpass', 4200, 1600, .8); tone(o, 'sine', 780, 320, .1, .12); },
  liver: o => { tone(o, 'sine', 92, 34, .3, .55); noise(o, .12, .2, 'lowpass', 400, 160); },
  pancreas: o => { tone(o, 'square', 1500, 520, .06, .1); tone(o, 'triangle', 2100, 1500, .1, .08, .03); },
  soda: o => { noise(o, .22, .2, 'highpass', 5200, 8000, .7); tone(o, 'sine', 900, 1400, .07, .08); },
  fries: o => { noise(o, .24, .18, 'highpass', 4800, 6800, .7); tone(o, 'triangle', 420, 240, .08, .1); },
  ramen: o => { noise(o, .06, .28, 'highpass', 4000, 5200, .7); tone(o, 'sawtooth', 340, 200, .1, .08); },
  burger: o => { tone(o, 'sine', 100, 40, .26, .5); noise(o, .12, .22, 'lowpass', 600, 200); },
};

// 타격음은 세 겹: 몸통 울림(낮은 사인) + 살이 맞는 소리(띠 소음) + 딱 하는 머리(높은 소음). 맞을 때마다 높이가 조금씩 달라진다.
function hit(e, o) {
  const heavy = e.heavy, k = jit(.07) * (1 + Math.min(e.combo || 0, 8) * .018);
  tone(o, 'sine', (heavy ? 165 : 205) * k, 42, heavy ? .22 : .13, heavy ? .62 : .46);
  noise(o, heavy ? .15 : .085, heavy ? .5 : .36, 'bandpass', (heavy ? 950 : 1500) * k, 320, 1.1);
  noise(o, .028, heavy ? .34 : .26, 'highpass', 3600, 3600, .7);
  if (heavy) tone(o, 'triangle', 92, 30, .32, .34, .008);
  if (e.counter) { tone(o, 'triangle', 1760, 1760, .2, .12); tone(o, 'triangle', 2640, 2640, .26, .07, .02); }
}
function ko(o) {
  tone(o, 'sine', 130, 26, 1, .8); tone(o, 'sawtooth', 220, 40, .5, .24); tone(o, 'triangle', 1320, 330, .9, .09, .05);
  noise(o, .6, .6, 'lowpass', 900, 150); noise(o, .05, .5, 'highpass', 3000, 3000, .7);
}
function swing(heavy, o) { noise(o, heavy ? .15 : .11, heavy ? .6 : .55, 'bandpass', heavy ? 420 : 700, heavy ? 1900 : 2600, 1.4, 0, .02); }
function block(o) { const k = jit(.05); tone(o, 'square', 310 * k, 240, .07, .2); tone(o, 'square', 466 * k, 360, .07, .14); noise(o, .06, .5, 'bandpass', 2600, 1800, 2); }
function land(heavy, o) { noise(o, heavy ? .16 : .09, heavy ? .4 : .5, 'lowpass', heavy ? 420 : 600, 150); if (heavy) tone(o, 'sine', 95, 40, .2, .4); }
function slam(big, o) { tone(o, 'sine', 112, 32, big ? .44 : .34, .7); noise(o, .3, .5, 'lowpass', 700, 150); noise(o, .03, .3, 'highpass', 3000, 3000, .7); }
function sup(o) {
  tone(o, 'sine', 72, 30, .5, .6); tone(o, 'sawtooth', 110, 880, .5, .2); tone(o, 'square', 220, 1320, .5, .09);
  noise(o, .5, .2, 'highpass', 800, 9000, .7, 0, .3);
  [1047, 1319, 1568, 2093].forEach((hz, i) => tone(o, 'triangle', hz, hz, .2, .09, .46 + i * .035));
}
const EVENTS = {
  fire: (e, o) => { tone(o, 'sawtooth', e.big ? 520 : 640, 170, .26, .2); noise(o, .22, .4, 'bandpass', 1800, 600, 1); },
  clash: (e, o) => { tone(o, 'square', 520, 90, .2, .22); tone(o, 'triangle', 1400, 1400, .18, .12); noise(o, .14, .45, 'bandpass', 2400, 900, 1.2); },
  counter: (e, o) => { tone(o, 'triangle', 1320, 1980, .12, .2); tone(o, 'triangle', 2640, 2640, .28, .12, .05); noise(o, .14, .4, 'bandpass', 900, 3600, 1.4); },
  reflect: (e, o) => { tone(o, 'triangle', 700, 2100, .16, .2); tone(o, 'sine', 1400, 2800, .2, .12, .03); noise(o, .1, .4, 'highpass', 4000, 7000, .7); },
  armor: (e, o) => { block(o); tone(o, 'sine', 140, 70, .12, .3); },
  jump: (e, o) => { tone(o, 'sine', 250, 470, .1, .13); noise(o, .08, .2, 'bandpass', 800, 2000, 1.2); },
  grab: (e, o) => { noise(o, .1, .6, 'bandpass', 600, 1500, 1.2); tone(o, 'square', 200, 260, .06, .16); },
  splash: (e, o) => noise(o, .22, .6, 'bandpass', 1800, 500, .8),
  heal: (e, o) => tone(o, 'sine', 880 * [1, 1.25, 1.5][Math.floor(Math.random() * 3)], 900, .14, .08, 0, .01),
  drain: (e, o) => { tone(o, 'sine', 300, 900, .2, .14); noise(o, .2, .2, 'bandpass', 1500, 4000, 1.5); },
  potion: (e, o) => { [523, 659, 784, 1047].forEach((hz, i) => tone(o, 'triangle', hz, hz, .16, .15, i * .07)); noise(o, .3, .06, 'highpass', 6000, 9000, .7, .2); },
  timeup: (e, o) => { tone(o, 'square', 440, 440, .18, .14); tone(o, 'square', 330, 330, .34, .14, .2); },
};

// 메뉴 소리는 가운데에서 난다. 첫 입력 전(ctx 없음)에는 조용히 넘어간다.
const ui = (fn, wet = 0) => () => { if (ctx) fn(spot(0, wet)); };

export const sfx = {
  // 대전 이벤트 하나를 소리로 옮긴다. pan은 화면에서의 좌우 자리, foe는 맞는 쪽 캐릭터.
  play(e, pan = 0, foe) {
    if (!ctx) return;
    switch (e.type) {
      case 'hit':
        if (e.ko) { ko(spot(pan * .5, .5)); shout(foe, 'ko', pan); break; }
        hit(e, spot(pan, e.heavy ? .14 : .05));
        if (e.special || e.sup) ACCENT[e.char]?.(spot(pan, .2));
        if ((e.heavy || e.special) && Math.random() < .65) shout(foe, 'hurt', pan);
        break;
      case 'special': (VOICES[VOICE[e.key]] || VOICES.rise)(spot(pan, .12)); shout(e.char, 'special', pan); break;
      case 'super': sup(spot(0, .35)); shout(e.char, 'super', pan); break;
      case 'swing': swing(e.heavy, spot(pan)); if (e.heavy && Math.random() < .55) shout(e.char, 'attack', pan); break;
      case 'block': block(spot(pan, .05)); break;
      case 'land': land(e.heavy, spot(pan, e.heavy ? .1 : 0)); break;
      case 'slam': slam(e.big, spot(pan, .25)); break;
      default: EVENTS[e.type]?.(e, spot(pan, .1));
    }
  },
  move: ui(o => tone(o, 'square', 700, 700, .035, .09)),
  confirm: ui(o => { tone(o, 'square', 660, 660, .06, .14); tone(o, 'square', 990, 990, .12, .14, .06); noise(o, .1, .12, 'highpass', 6000, 9000, .7, .06); }, .1),
  correct: ui(o => [659, 880, 1175, 1568].forEach((hz, i) => tone(o, 'triangle', hz, hz, .18, .16, i * .08)), .2),
  wrong: ui(o => { tone(o, 'sawtooth', 170, 88, .34, .18); tone(o, 'square', 120, 70, .34, .08); }),
  // "ROUND 1"이 뜰 때: 큰북 한 번과 차오르는 화음.
  round: ui(o => {
    tone(o, 'sine', 120, 48, .45, .7); noise(o, .25, .35, 'lowpass', 600, 150);
    [196, 247, 294, 392].forEach(hz => tone(o, 'sawtooth', hz, hz * 1.03, .6, .05, .05, .12));
  }, .3),
  // "FIGHT!"가 뜰 때: 화음을 한 번 세게 긋고 심벌이 퍼진다.
  fight: ui(o => {
    [82.4, 123.5, 164.8, 329.6].forEach(hz => tone(o, 'sawtooth', hz, hz, .38, .11));
    tone(o, 'sine', 100, 40, .4, .6); noise(o, .55, .24, 'highpass', 5000, 5000, .7);
  }, .3),
  // 소리 설정을 한 칸 넘기고 지금 상태 이름을 돌려준다.
  cycle: () => MODES[cycle()],
  label: () => MODES[mix.mode],
};
