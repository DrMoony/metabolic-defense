// 소리 뼈대. 파일 없이 전부 즉석에서 합성하고, 한 줄기로 모아 눌러 준 뒤(컴프레서) 내보낸다.
// 줄기는 sfx(효과음)와 music(음악) 둘. 울림(hall)은 보낸 양만큼 섞인다.
const KEY = 'mf.sound';
const saved = (() => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } })();
export const mix = { mode: saved.mode ?? 0 };   // 0 전부, 1 효과음만, 2 끔
export const MODES = ['소리 전부', '효과음만', '소리 끔'];
export let ctx = null;
export const bus = {};
const wakers = [];

function decay(c, seconds, power, channels = 2) {
  const n = Math.floor(c.sampleRate * seconds), buffer = c.createBuffer(channels, n, c.sampleRate);
  for (let ch = 0; ch < channels; ch++) { const d = buffer.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** power; }
  return buffer;
}

// 소리 길을 깐다. 시험에서는 OfflineAudioContext를 넘겨 같은 길로 파일을 뽑는다.
export function mount(c) {
  ctx = c;
  const out = bus.out = c.createDynamicsCompressor(), master = c.createGain();
  out.threshold.value = -15; out.knee.value = 16; out.ratio.value = 5; out.attack.value = .004; out.release.value = .16;
  master.gain.value = .85; out.connect(master).connect(c.destination);
  const hall = c.createConvolver(), back = c.createGain(); hall.buffer = decay(c, 1.7, 2.8); back.gain.value = .5;
  bus.wet = c.createGain(); bus.wet.connect(hall).connect(back).connect(out);
  bus.sfx = c.createGain(); bus.sfx.connect(out);
  // 음악은 한 번 더 걸러서(초필살기 때 먹먹하게) 내보내고, 울림을 조금 섞는다.
  bus.music = c.createGain(); bus.tone = c.createBiquadFilter(); bus.tone.type = 'lowpass'; bus.tone.frequency.value = 18000; bus.tone.Q.value = .5;
  const air = c.createGain(); air.gain.value = .1;
  bus.music.connect(bus.tone).connect(out); bus.tone.connect(air).connect(bus.wet);
  bus.hiss = decay(c, 2, 0, 1);
  level(0);
  return c;
}
export function level(glide = .05) {
  if (!ctx) return;
  const at = ctx.currentTime;
  bus.sfx.gain.setTargetAtTime(mix.mode === 2 ? 0 : 1, at, glide || .001);
  bus.music.gain.setTargetAtTime(mix.mode ? 0 : .42, at, glide || .001);
}
export function cycle() {
  mix.mode = (mix.mode + 1) % 3;
  try { localStorage.setItem(KEY, JSON.stringify(mix)); } catch { /* 저장을 막아 둔 브라우저 */ }
  level();
  return mix.mode;
}
// 브라우저는 첫 입력 전에는 소리를 못 내게 한다. 첫 키·터치에서 깨운다.
export function wake() {
  if (!ctx) mount(new (window.AudioContext || window.webkitAudioContext)());
  if (ctx.state === 'suspended') ctx.resume();
  for (const fn of wakers.splice(0)) fn();
  return ctx;
}
export const onWake = fn => { if (ctx) fn(); else wakers.push(fn); };
if (typeof addEventListener === 'function') for (const type of ['keydown', 'pointerdown']) addEventListener(type, () => wake(), { once: true });
// 탭이 가려지면 게임도 멈추니 소리도 같이 멈춘다.
if (typeof document === 'object') document.addEventListener('visibilitychange', () => { if (ctx?.suspend) document.hidden ? ctx.suspend() : ctx.resume(); });

export const jit = (amount = .06) => 1 + (Math.random() * 2 - 1) * amount;
export const pick = list => list[Math.floor(Math.random() * list.length)];

// 소리 하나가 나갈 자리: 좌우 위치(pan −1~1)와 울림에 보내는 양(wet).
export function spot(pan = 0, wet = 0, to = bus.sfx) {
  const node = ctx.createStereoPanner(); node.pan.value = Math.max(-1, Math.min(1, pan)); node.connect(to);
  if (wet > 0) { const send = ctx.createGain(); send.gain.value = wet; node.connect(send).connect(bus.wet); }
  return node;
}
function swell(param, at, seconds, volume, attack) {
  param.setValueAtTime(.0001, at); param.linearRampToValueAtTime(volume, at + attack); param.exponentialRampToValueAtTime(.0005, at + Math.max(attack + .005, seconds));
}
// 음 하나: from에서 to로 미끄러지며 사라진다. at은 절대 시각.
export function toneAt(o, type, from, to, at, seconds, volume = .2, attack = .003) {
  const osc = ctx.createOscillator(), gain = ctx.createGain();
  osc.type = type; osc.frequency.setValueAtTime(from, at);
  if (to !== from) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), at + seconds);
  swell(gain.gain, at, seconds, volume, attack);
  osc.connect(gain).connect(o); osc.start(at); osc.stop(at + seconds + .03);
  return osc;
}
// 소음 한 줄기: 거르는 방식(kind)과 거르는 자리(from→to)로 바람·살·쇠 소리를 가른다.
export function noiseAt(o, at, seconds, volume, kind = 'lowpass', from = 2000, to = from, q = .8, attack = .002) {
  const src = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
  src.buffer = bus.hiss; src.loop = true;
  filter.type = kind; filter.Q.value = q; filter.frequency.setValueAtTime(from, at);
  if (to !== from) filter.frequency.exponentialRampToValueAtTime(Math.max(30, to), at + seconds);
  swell(gain.gain, at, seconds, volume, attack);
  src.connect(filter).connect(gain).connect(o); src.start(at, Math.random() * 1.6); src.stop(at + seconds + .03);
  return src;
}
// 뜯는 소리: 파형 → 닫히는 저역 필터 → 음량. 베이스·멜로디·아르페지오가 함께 쓴다.
export function pluckAt(o, type, hz, at, seconds, volume, open = 2400, shut = 600, q = 1, attack = .004, cents = 0) {
  const osc = ctx.createOscillator(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
  osc.type = type; osc.frequency.setValueAtTime(hz, at); osc.detune.value = cents;
  filter.type = 'lowpass'; filter.Q.value = q; filter.frequency.setValueAtTime(open, at); filter.frequency.exponentialRampToValueAtTime(shut, at + seconds);
  gain.gain.setValueAtTime(.0001, at); gain.gain.linearRampToValueAtTime(volume, at + attack);
  gain.gain.setTargetAtTime(volume * .62, at + attack, seconds * .3); gain.gain.setTargetAtTime(.0001, at + seconds * .86, seconds * .05 + .008);
  osc.connect(filter).connect(gain).connect(o); osc.start(at); osc.stop(at + seconds + .12);
  return osc;
}
export const tone = (o, type, from, to, seconds, volume, delay = 0, attack) => toneAt(o, type, from, to, ctx.currentTime + delay, seconds, volume, attack);
export const noise = (o, seconds, volume, kind, from, to, q, delay = 0, attack) => noiseAt(o, ctx.currentTime + delay, seconds, volume, kind, from, to, q, attack);
