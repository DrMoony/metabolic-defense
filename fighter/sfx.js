// 효과음은 파일 없이 즉석에서 합성한다(시제품용).
let ctx = null;
const audio = () => { ctx ||= new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === 'suspended') ctx.resume(); return ctx; };
addEventListener('keydown', () => audio(), { once: true });
addEventListener('pointerdown', () => audio(), { once: true });

function tone(type, from, to, seconds, volume = .2, delay = 0) {
  if (!ctx) return;
  const osc = ctx.createOscillator(), gain = ctx.createGain(), at = ctx.currentTime + delay;
  osc.type = type; osc.frequency.setValueAtTime(from, at); osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), at + seconds);
  gain.gain.setValueAtTime(volume, at); gain.gain.exponentialRampToValueAtTime(.001, at + seconds);
  osc.connect(gain).connect(ctx.destination); osc.start(at); osc.stop(at + seconds);
}
function noise(seconds, volume, cutoff) {
  if (!ctx) return;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate), data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
  src.buffer = buffer; filter.type = 'lowpass'; filter.frequency.value = cutoff; gain.gain.value = volume;
  src.connect(filter).connect(gain).connect(ctx.destination); src.start();
}

// 필살기를 낼 때 나는 소리는 기술 성격에 따라 일곱 가지로 나눈다(기술 키 → 소리).
const VOICE = {
  rush: 'multi', spray: 'multi', roll: 'multi', upper: 'rise', rising: 'rise', riser: 'rise', spear: 'rise', burst: 'rise', riposte: 'rise',
  charge: 'dash', slide: 'dash', lunge: 'dash', dive: 'dash', weave: 'dash', slip: 'dash', cast: 'cast', lob: 'cast', drop: 'cast', steam: 'cast',
  barrier: 'guard', stance: 'guard', grab: 'heavy', press: 'heavy', stomp: 'heavy', whip: 'snap',
};
const VOICES = {
  multi: () => [0, .05, .1].forEach((at, i) => tone('square', 520 + i * 130, 400 + i * 130, .05, .09, at)),
  rise: () => { tone('sawtooth', 200, 980, .2, .13); tone('sine', 300, 1300, .2, .1); },
  dash: () => { noise(.16, .2, 1800); tone('sawtooth', 260, 110, .16, .1); },
  cast: () => { tone('triangle', 880, 660, .12, .12); tone('triangle', 1320, 990, .16, .08, .05); },
  guard: () => { tone('triangle', 990, 990, .1, .12); tone('triangle', 1480, 1480, .18, .1, .06); },
  heavy: () => { tone('sine', 110, 50, .24, .4); tone('square', 80, 60, .16, .1); },
  snap: () => { noise(.05, .3, 6000); tone('square', 1500, 600, .05, .08); },
};
// 필살기가 맞을 때 기본 타격음 위에 얹는 소리. 캐릭터마다 다르다(심장은 쿵쿵 두 번 뛴다).
const ACCENT = {
  heart: () => { tone('sine', 95, 50, .1, .5); tone('sine', 80, 45, .12, .45, .11); },
  kidney: () => { noise(.14, .22, 5200); tone('sine', 760, 320, .09, .12); },
  liver: () => tone('sine', 90, 34, .28, .55),
  pancreas: () => { tone('square', 1500, 520, .06, .1); tone('triangle', 2100, 1500, .1, .08, .03); },
  soda: () => { noise(.2, .2, 7000); tone('sine', 900, 1400, .07, .08); },
  fries: () => { noise(.22, .18, 6500); tone('triangle', 420, 240, .08, .1); },
  ramen: () => { noise(.06, .28, 5000); tone('sawtooth', 340, 200, .1, .08); },
  burger: () => { tone('sine', 100, 40, .24, .5); noise(.1, .2, 600); },
};

export const sfx = {
  special: key => (VOICES[VOICE[key]] || VOICES.rise)(),
  accent: char => ACCENT[char]?.(),
  swing: heavy => noise(.07, heavy ? .1 : .06, 2600),
  hit: heavy => { noise(heavy ? .16 : .09, heavy ? .5 : .34, heavy ? 1100 : 1700); tone('sine', heavy ? 150 : 190, 45, heavy ? .2 : .12, .5); },
  block: () => { tone('square', 320, 180, .06, .12); noise(.05, .14, 3200); },
  fire: () => tone('sawtooth', 620, 170, .24, .14),
  clash: () => { tone('square', 500, 90, .18, .16); noise(.12, .2, 2400); },
  jump: () => tone('sine', 260, 460, .09, .08),
  land: heavy => noise(heavy ? .14 : .05, heavy ? .3 : .1, 500),
  super: () => { tone('sawtooth', 110, 880, .5, .22); tone('square', 220, 1320, .5, .1); },
  ko: () => { noise(.5, .6, 700); tone('sine', 120, 30, .7, .6); },
  potion: () => [523, 659, 784, 1047].forEach((hz, i) => tone('triangle', hz, hz, .14, .16, i * .07)),
  correct: () => [659, 880, 1175].forEach((hz, i) => tone('triangle', hz, hz, .16, .18, i * .09)),
  wrong: () => tone('sawtooth', 160, 90, .32, .2),
  move: () => tone('square', 660, 660, .04, .06),
  confirm: () => { tone('square', 660, 660, .06, .1); tone('square', 990, 990, .1, .1, .06); },
  round: () => tone('sawtooth', 330, 660, .3, .14),
};
