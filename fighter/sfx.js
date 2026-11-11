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

export const sfx = {
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
