// 악보. parts는 [마디마다 화음, 멜로디] 묶음이고 멜로디는 8분음표 여덟 칸이 한 마디다('-' 잇기, '.' 쉼, '|' 마디줄).
// bass·arp·drums는 16분음표 열여섯 칸. bass: r 뿌리음, 5 다섯째 음, o 한 옥타브 위, l 아래 다섯째 음. arp: 화음 안에서 몇 번째 음인지.
// drums: x 치기, X 세게, o 약하게(hat 줄에서는 열린 하이햇). fill은 여덟 마디째에 바꿔 치는 줄.
export const SONGS = {
  // 심장 스테이지: 마단조, 씩씩하게 달린다.
  heart: {
    bpm: 152, voice: 'square', pad: .026, bass: 'r.rrr.rrr.rrr.rr',
    drums: { kick: 'x...x...x...x.x.', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.' }, fill: { snare: '....x.......xxxx' },
    parts: [
      ['Em Em C D Em Em C B7', 'E5 - B4 E5 G5 - F#5 E5 | B5 - - A5 G5 - E5 - | C5 - E5 G5 C6 - B5 G5 | A5 - F#5 D5 A5 - - . | E5 - B4 E5 G5 - F#5 E5 | B5 - - D6 B5 - G5 - | C6 - B5 A5 G5 - E5 G5 | F#5 - D#5 F#5 B5 - - .'],
      ['G D Em C G D C B7', 'D5 - G5 B5 D6 - B5 G5 | A5 - F#5 A5 D6 - A5 F#5 | G5 - E5 G5 B5 - - A5 | G5 - E5 C5 E5 - - . | D5 - G5 B5 D6 - E6 D6 | A5 - D6 F#6 E6 - D6 A5 | G5 - C6 E6 D6 - C6 B5 | B5 - A5 F#5 D#5 - B4 .'],
    ],
  },
  // 신장 스테이지: 라 도리아, 물결 타는 펑크.
  kidney: {
    bpm: 126, swing: .14, voice: 'triangle', loud: .17, bright: 6000, low: 'square', pad: .022, bass: 'r..r..o.r.r..5o.',
    arp: '..2...1...2..1..', pluck: 'triangle', arpLoud: .09,
    drums: { kick: 'x.....x...x.....', clap: '....x.......x...', hat: 'x.xxx.xxx.xxx.xo' }, fill: { clap: '....x.....x.x.xx' },
    parts: [
      ['Dm7 G Dm7 G Bb C Dm7 Dm7', 'D5 . F5 A5 . C6 A5 . | B5 - G5 . D5 G5 B5 . | D5 . F5 A5 . C6 D6 . | B5 - D6 . B5 G5 - . | Bb5 . D6 F6 . D6 Bb5 . | C6 - E6 . G5 C6 E6 . | F6 - E6 D6 . A5 F5 . | D5 - - . A5 C6 D6 .'],
      ['F C Dm Am Bb C Dm A', 'A5 - C6 F6 - C6 A5 - | G5 - C6 E6 - C6 G5 - | F5 - A5 D6 - A5 F5 - | E5 - A5 C6 - A5 E5 - | D5 - F5 Bb5 - D6 F6 - | E5 - G5 C6 - E6 G6 - | A6 - F6 D6 A5 - D6 - | C#6 - A5 E5 C#5 - E5 .'],
    ],
  },
  // 간 스테이지: 다단조, 무겁게 쿵쿵 밟는다(큰북과 쇳소리).
  liver: {
    bpm: 112, voice: 'sawtooth', loud: .13, bright: 3400, pad: .03, bass: 'r...r.r...r.r.5.',
    drums: { kick: 'x.....x.x.....x.', snare: '....x.......x...', clank: '....x.......x...', tom: '..........x...xx', hat: 'x...x...x...x...' }, fill: { tom: '........x.x.xxxx' },
    parts: [
      ['Cm Cm Ab Bb Cm Cm Fm G', 'C4 - - Eb4 G4 - - Eb4 | C5 - Bb4 G4 Eb4 - C4 - | Ab4 - - C5 Eb5 - - C5 | D5 - Bb4 F4 Bb4 - - . | C4 - - Eb4 G4 - - C5 | Eb5 - D5 C5 G4 - Eb4 - | F4 - Ab4 C5 F5 - Eb5 C5 | D5 - B4 G4 D4 - G4 .'],
      ['Eb Bb Ab G Eb Bb Ab G', 'G4 - Bb4 Eb5 - - G5 - | F5 - D5 Bb4 - - D5 - | Eb5 - C5 Ab4 - - C5 - | D5 - B4 G4 - - . . | G4 - Bb4 Eb5 - - Bb5 - | Ab5 - F5 D5 - - F5 - | Eb5 - C5 Eb5 Ab5 - C6 - | B5 - G5 D5 B4 - G4 .'],
    ],
  },
  // 췌장 스테이지: 가단조, 실험실 테크노. 아르페지오가 끌고 간다.
  pancreas: {
    bpm: 138, voice: 'square', loud: .1, low: 'square', pad: .02, bass: 'r.o.r.o.r.o.r.oo', arp: '0231023102310231', arpLoud: .05,
    drums: { kick: 'x...x...x...x...', clap: '....x.......x...', hat: '..x...x...x...o.' }, fill: { clap: '....x.......x.xx' },
    parts: [
      ['Am F C G Am F Dm E', 'A5 . E5 A5 C6 . B5 A5 | A5 . F5 A5 C6 . A5 F5 | G5 . E5 G5 C6 . E6 C6 | D6 . B5 G5 B5 - - . | A5 . E5 A5 C6 . E6 C6 | F6 . C6 A5 F5 . A5 C6 | D6 . A5 F5 D5 . F5 A5 | G#5 . B5 E6 G#6 - - .'],
      ['F G Am Am F G E E', 'C6 - - A5 F5 - A5 C6 | D6 - - B5 G5 - B5 D6 | E6 - - C6 A5 - C6 E6 | A6 - G6 E6 C6 - A5 - | C6 - - A5 F5 - A5 C6 | D6 - - B5 G5 - B5 D6 | E6 - D6 B5 G#5 - B5 E6 | G#6 - E6 B5 G#5 - E5 .'],
    ],
  },
  // 야식 골목(보스전): 올림바단조, 어둡고 빠르다.
  alley: {
    bpm: 164, voice: 'sawtooth', loud: .13, bright: 4000, pad: .026, bass: 'rrorrorrorror5o5',
    drums: { kick: 'x..x..x.x..x..x.', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.' }, fill: { snare: '....x...x.x.xxxx' },
    parts: [
      ['F#m G F#m G F#m G A C#', 'F#5 - C#5 F#5 A5 - G5 F#5 | G5 - D5 G5 B5 - A5 G5 | F#5 - C#5 F#5 A5 - C#6 A5 | B5 - G5 D5 G5 - - . | C#6 - A5 F#5 C#6 - B5 A5 | D6 - B5 G5 D6 - B5 G5 | E6 - C#6 A5 E6 - C#6 A5 | G#5 - C#6 F6 G#6 - - .'],
      ['D E F#m F#m D E C# C#', 'F#5 - A5 D6 - - A5 - | G#5 - B5 E6 - - B5 - | A5 - C#6 F#6 - E6 C#6 A5 | F#5 - - . C#5 F#5 A5 . | F#5 - A5 D6 - - F#6 - | G#5 - B5 E6 - - G#6 - | F6 - C#6 G#5 F5 - G#5 C#6 | F6 - G#6 - C#6 - - .'],
    ],
  },
  // 근육 스테이지(파워 짐): 라장조, 금관처럼 밀어붙이는 응원가.
  gym: {
    bpm: 144, voice: 'square', loud: .11, bright: 4200, pad: .028, bass: 'r.r.o.r.r.r.o.5.',
    drums: { kick: 'x...x...x...x...', clap: '....x.......x...', hat: 'x.xxx.xxx.xxx.xx' }, fill: { clap: '....x...x.x.xxxx' },
    parts: [
      ['D A Bm G D A G A', 'D5 - F#5 A5 D6 - A5 F#5 | E5 - A5 C#6 E6 - C#6 A5 | F#5 - B5 D6 F#6 - D6 B5 | G5 - B5 D6 G5 - - . | A5 - D6 F#6 A6 - F#6 D6 | C#6 - E6 C#6 A5 - E5 A5 | B5 - D6 B5 G5 - B5 D6 | C#6 - A5 E5 A5 - - .'],
      ['G A F#m Bm G A Em A', 'D6 - B5 G5 D6 - B5 G5 | E6 - C#6 A5 E6 - C#6 A5 | F#6 - C#6 A5 F#5 - A5 C#6 | D6 - B5 F#5 D5 - - . | G5 - B5 D6 G6 - D6 B5 | A5 - C#6 E6 A6 - E6 C#6 | B5 - G5 E5 B5 - E6 G6 | E6 - C#6 A5 E5 - - .'],
    ],
  },
  // 최종 보스(뱃속 심연): 바단조, 느리고 무겁게 짓누르다가 둘째 마디부터 몰아친다.
  belly: {
    bpm: 128, voice: 'sawtooth', loud: .12, bright: 3000, low: 'square', pad: .034, bass: 'r..r..r.r..r.5o.',
    drums: { kick: 'x..x..x.x..x..x.', snare: '....x.......x...', tom: '..........x..xx.', hat: 'x.x.x.x.x.x.x.x.' }, fill: { tom: '........xxx.xxxx' },
    parts: [
      ['Fm Fm Db C Fm Fm Bbm C', 'F4 - - Ab4 C5 - Db5 C5 | Ab4 - F4 - C4 - - . | Db5 - F5 Ab5 Db5 - C5 Bb4 | C5 - E4 G4 C5 - - . | F5 - Ab5 C6 F5 - Eb5 Db5 | C5 - Ab4 F4 C5 - - . | Db5 - F5 Bb5 Db6 - C6 Bb4 | E5 - G5 C6 E5 - - .'],
      ['Db Eb Fm Fm Db Eb C C', 'F5 - Ab5 Db6 - - C6 Ab5 | G5 - Bb5 Eb6 - - Db6 Bb5 | C6 - Ab5 F5 C6 - Ab5 F5 | Ab5 - - . F5 - Ab5 C6 | Db6 - F6 Ab5 Db6 - F6 Db6 | Eb6 - G6 Bb5 Eb6 - G6 Eb6 | E6 - C6 G5 E6 - C6 G5 | C6 - - - G5 - - .'],
    ],
  },
  // 처음 화면: 다장조, 주제가.
  title: {
    bpm: 120, voice: 'sawtooth', loud: .13, bright: 3800, pad: .034, bass: 'r...r..r..r.5.o.', arp: '0.1.2.3.2.1.2.1.', pluck: 'triangle', arpLoud: .07,
    drums: { kick: 'x.......x.x.....', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.' }, fill: { snare: '....x.......x.xx' },
    parts: [
      ['C G Am F C G F G', 'E5 - - G5 C6 - - G5 | B5 - - A5 G5 - D5 - | C5 - - E5 A5 - - E5 | A5 - G5 F5 - - C5 - | E5 - - G5 C6 - - E6 | D6 - - B5 G5 - B5 - | A5 - C6 F6 - - C6 A5 | B5 - D6 G6 - - - .'],
      ['Am F C G Am F G G', 'A5 - C6 E6 - - C6 - | A5 - C6 F6 - - C6 - | G5 - C6 E6 - - G6 - | D6 - B5 G5 - - . . | A5 - C6 E6 - - A6 - | F6 - C6 A5 - - C6 - | D6 - G6 B6 - - A6 G6 | D6 - - - B5 - G5 .'],
    ],
  },
  // 캐릭터 고르기·결과 화면: 멜로디 없이 가볍게 돈다.
  select: {
    bpm: 116, pad: .03, bass: 'r.....r.5...r...', arp: '0.1.2.3.1.2.3.2.', pluck: 'triangle', arpLoud: .12, ring: 2.4,
    drums: { kick: 'x.......x.......', tick: '....x.......x...', hat: '..x...x...x...x.' },
    parts: [['G Em C D']],
  },
  // 퀴즈: 조용히 째깍거리며 생각할 틈을 준다.
  quiz: {
    bpm: 96, pad: .04, bass: 'r.......l.......', arp: '0..1..2.3..2..1.', pluck: 'triangle', arpLoud: .15, ring: 3,
    drums: { tick: 'x...o...x...o...' },
    parts: [['Am Am Dm E']],
  },
  // 여기부터는 한 번만 울리는 짧은 곡.
  vs: {
    loop: false, bpm: 140, voice: 'sawtooth', pad: .03, bass: 'r.rrr.rrr.rrr.rr',
    drums: { kick: 'x...x...x...x...', snare: '....x.......x.xx' },
    parts: [['Em B', 'E5 . E5 E5 G5 - B5 - | B5 - - - - - . .']],
  },
  win: {
    loop: false, bpm: 160, voice: 'square', pad: .03, bass: 'r...r...r...r...',
    drums: { kick: 'x...x...x...x...', hat: 'x.x.x.x.x.x.x.x.' },
    parts: [['C C', 'C5 E5 G5 C6 . G5 C6 - | E6 - - - - - . .']],
  },
  clear: {
    loop: false, bpm: 132, voice: 'sawtooth', pad: .032, bass: 'r...r...5...r...', arp: '0.1.2.3.2.1.2.3.', pluck: 'triangle', arpLoud: .07,
    drums: { kick: 'x.......x.......', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.' },
    parts: [['C F G C', 'G4 - C5 - E5 - G5 - | A5 - F5 - C5 - F5 - | G5 - D5 - B4 - D5 G5 | C6 - - - - - . .']],
  },
  lose: {
    loop: false, bpm: 90, voice: 'triangle', loud: .13, pad: .035, bass: 'r.......l.......', drums: {},
    parts: [['Am Am', 'E5 - D5 - C5 - B4 - | A4 - - - - - . .']],
  },
};
