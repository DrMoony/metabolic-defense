// 배경 음악. 악보를 글자로 적어 두고(snd/songs.js) 16분음표 한 칸씩 조금 앞서 예약해 가며 연주한다.
import { ctx, bus, mix, onWake, toneAt, noiseAt, pluckAt } from './core.js';
import { SONGS } from './songs.js';

const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const KIND = { '': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], m7: [0, 3, 7, 10], sus: [0, 5, 7] };
const pitch = (letter, mark) => NOTE[letter] + (mark === '#' ? 1 : mark === 'b' ? -1 : 0);
export const midi = name => { const m = /^([A-G])([#b]?)(\d)$/.exec(name); return pitch(m[1], m[2]) + (+m[3] + 1) * 12; };
const hz = n => 440 * 2 ** ((n - 69) / 12);
// 화음 이름 → 베이스 뿌리음(2옥타브)과 쌓이는 음.
function chord(name) { const m = /^([A-G])([#b]?)(m7|m|7|sus)?$/.exec(name); return { root: 36 + pitch(m[1], m[2]), tones: KIND[m[3] || ''] }; }
// 글자 줄에서 음 길이를 센다: 음 뒤에 붙은 '-' 수만큼 이어진다.
const held = (list, i) => { let n = 1; while (list[i + n] === '-') n++; return n; };

// 악보를 마디 단위로 풀어 둔다. 멜로디는 8분음표, 나머지는 16분음표 칸.
const cache = {};
export function score(name) {
  if (cache[name]) return cache[name];
  const song = SONGS[name], bars = [], tokens = [];
  for (const [chords, lead] of song.parts) {
    const lines = lead ? lead.split('|').map(line => line.trim().split(/\s+/)) : [];
    chords.split(' ').forEach((c, i) => { bars.push(chord(c)); tokens.push(...(lines[i] || Array(8).fill('.'))); });
  }
  const lead = {};
  tokens.forEach((t, i) => { if (t !== '-' && t !== '.') lead[i * 2] = [midi(t), held(tokens, i) * 2]; });
  return cache[name] = { ...song, bars, lead, steps: bars.length * 16 };
}

const DRUM = {
  kick: (o, at, v) => { toneAt(o, 'sine', 160, 44, at, .2, .58 * v); noiseAt(o, at, .02, .3 * v, 'lowpass', 2600); },
  snare: (o, at, v) => { noiseAt(o, at, .17, .36 * v, 'bandpass', 1900, 1300, .6); toneAt(o, 'triangle', 200, 130, at, .1, .22 * v); },
  hat: (o, at, v) => noiseAt(o, at, .04, .2 * v, 'highpass', 7000, 7000, .7),
  open: (o, at, v) => noiseAt(o, at, .24, .14 * v, 'highpass', 6500, 6500, .7),
  clap: (o, at, v) => [0, .011, .023].forEach(d => noiseAt(o, at + d, d ? .12 : .02, .26 * v, 'bandpass', 1500, 1500, 1.4)),
  tom: (o, at, v) => { toneAt(o, 'sine', 128, 58, at, .3, .6 * v); noiseAt(o, at, .08, .14 * v, 'lowpass', 700); },
  clank: (o, at, v) => { toneAt(o, 'square', 830, 830, at, .13, .05 * v); toneAt(o, 'triangle', 1245, 1245, at, .2, .06 * v); },
  tick: (o, at, v) => toneAt(o, 'sine', 1150, 880, at, .05, .2 * v),
};
const BASS = { r: 0, 5: 7, o: 12, l: -5 };

let now = null, want = null, after = null, queued = false, heat = false;

function side(s, pan) { const node = ctx.createStereoPanner(); node.pan.value = pan; node.connect(s.out); return node; }
function begin(name, then) {
  const song = score(name);
  halt(.1);
  const out = ctx.createGain(); out.connect(bus.music);
  const s = now = { name, song, then, out, step: 0, at: ctx.currentTime + .07 };
  s.hats = side(s, .22); s.arp = side(s, -.28); s.pad = side(s, .1);
  // 멜로디에는 점8분 메아리를 붙인다.
  s.lead = ctx.createGain(); s.lead.connect(out);
  const echo = ctx.createDelay(1), again = ctx.createGain(), back = ctx.createGain();
  echo.delayTime.value = 60 / song.bpm * .75; again.gain.value = .3; back.gain.value = .24;
  s.lead.connect(echo); echo.connect(again).connect(echo); echo.connect(back).connect(out);
  s.timer = setInterval(() => pump(s), 25);
  pump(s);
}
function halt(fade = .3) {
  const s = now; if (!s) return;
  now = null; clearInterval(s.timer);
  s.out.gain.setTargetAtTime(0, ctx.currentTime, fade / 3);
  setTimeout(() => s.out.disconnect(), fade * 1000 + 1500);
}
// 다음 .17초 안에 울릴 칸을 예약한다(시험에서는 바깥에서 직접 부른다).
export function pump(s = now) {
  if (!s) return;
  if (s.at < ctx.currentTime - .25) s.at = ctx.currentTime + .05;   // 오래 멈췄다 돌아오면 밀린 칸은 건너뛴다
  while (s.at < ctx.currentTime + .17) {
    const fast = heat && s.song.loop !== false, dur = 60 / s.song.bpm / 4 / (fast ? 1.06 : 1);
    if (!mix.mode) strike(s, s.step, s.at + (s.step % 2 ? (s.song.swing || 0) * dur : 0), dur, fast);
    s.at += dur;
    if (++s.step < s.song.steps) continue;
    if (s.song.loop !== false) { s.step = 0; continue; }
    // 한 번만 울리는 곡은 끝나면 물러나고, 이어 틀 곡이 있으면 넘긴다.
    clearInterval(s.timer); if (now === s) now = null;
    if (s.then && want === s.name) music.play(s.then);
    return;
  }
}

// 한 칸에 울릴 것을 모두 예약한다.
function strike(s, step, at, dur, fast) {
  const song = s.song, bar = Math.floor(step / 16), i = step % 16, c = song.bars[bar];
  const fill = song.fill && bar % 8 === 7 ? song.fill : null;
  for (const row in song.drums) {
    const mark = (fill?.[row] || song.drums[row])[i];
    if (mark === '.') continue;
    const open = row === 'hat' && mark === 'o';
    DRUM[open ? 'open' : row](row === 'hat' ? s.hats : s.out, at, mark === 'X' ? 1.3 : mark === 'o' && !open ? .5 : 1);
  }
  if (fast && i % 2 && song.drums.hat) DRUM.hat(s.hats, at, .6);
  if (fast && i % 4 === 2 && song.drums.tick && !song.drums.hat) DRUM.tick(s.out, at, .5);
  const b = song.bass?.[i];
  if (b in BASS) {
    const f = hz(c.root + BASS[b]), len = held(song.bass, i) * dur * .92;
    pluckAt(s.out, song.low || 'sawtooth', f, at, len, .19, 1500, 320, 2, .004);
    toneAt(s.out, 'sine', f, f, at, len, .1);
  }
  const a = song.arp?.[i];
  if (a >= '0') {
    const n = +a, f = hz(c.root + 24 + c.tones[n % c.tones.length] + 12 * Math.floor(n / c.tones.length));
    pluckAt(s.arp, song.pluck || 'square', f, at, dur * (song.ring || 1.6), song.arpLoud || .06, 3800, 900, 1.5, .003);
  }
  if (song.pad && i === 0) for (const t of c.tones) pluckAt(s.pad, 'sawtooth', hz(c.root + 12 + t), at, dur * 16, song.pad, 1500, 650, .7, .1, t * 2 - 5);
  const note = song.lead[step];
  if (note) {
    const f = hz(note[0] + (song.shift || 0)), len = note[1] * dur * .94;
    for (const cents of [-6, 6]) {
      const osc = pluckAt(s.lead, song.voice || 'square', f, at, len, song.loud || .11, song.bright || 4600, 1700, 1.2, .008, cents);
      if (len < .3) continue;
      // 긴 음은 조금 지나서 떨린다.
      const lfo = ctx.createOscillator(), depth = ctx.createGain(); lfo.frequency.value = 5.6; depth.gain.value = f * .007;
      lfo.connect(depth).connect(osc.frequency); lfo.start(at + .15); lfo.stop(at + len + .12);
    }
  }
}

export const music = {
  // name 곡을 튼다. 같은 곡이 돌고 있으면 그대로 둔다. then은 한 번 울리는 곡 뒤에 이어 틀 곡.
  play(name, then) {
    want = name; after = then;
    if (!ctx) { if (!queued) { queued = true; onWake(() => { queued = false; if (want) begin(want, after); }); } return; }
    if (now?.name === name && now.song.loop !== false) return;
    begin(name, then);
  },
  stop(fade = .3) { want = null; if (ctx) halt(fade); },
  // 체력이 얼마 안 남았거나 시간이 없을 때: 조금 빨라지고 하이햇이 촘촘해진다.
  hot(flag) { heat = !!flag; },
  // 초필살기가 터지는 동안 음악을 먹먹하게 눌러 둔다.
  duck(seconds = .7) {
    if (!ctx) return;
    const at = ctx.currentTime, f = bus.tone.frequency;
    f.cancelScheduledValues(at); f.setTargetAtTime(520, at, .03); f.setTargetAtTime(18000, at + seconds, .22);
  },
  get playing() { return now?.name || null; },
};
