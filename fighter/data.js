// 메타볼릭 파이터 시제품 — 캐릭터·기술 수치. 프레임은 60fps 기준.
export const STAGE = { w: 1280, h: 720, left: 70, right: 1210, floor: 612 };

// 모두가 쓰는 기본기. 캐릭터마다 리치·속도·세기를 조정한 사본을 char.moves에 담는다.
// box: [앞쪽 x, 발 기준 y(위가 음수), 너비, 높이]. guard: mid=서서·앉아 모두 막힘, low=앉아야 막힘, over=서야 막힘.
export const MOVES = {
  jab:      { startup: 4,  active: 3,  recovery: 7,  dmg: 40,  hitstun: 15, blockstun: 10, push: 6,  box: [28, -168, 92, 36],  guard: 'mid', chain: { p: 'straight', k: 'kick' }, cancel: true, pose: 'punch' },
  straight: { startup: 5,  active: 3,  recovery: 10, dmg: 55,  hitstun: 17, blockstun: 11, push: 7,  box: [28, -166, 108, 38], guard: 'mid', chain: { p: 'finisher', k: 'kick' }, cancel: true, pose: 'punch2', step: 3 },
  finisher: { startup: 7,  active: 4,  recovery: 18, dmg: 85,  hitstun: 0,  blockstun: 14, push: 10, box: [24, -205, 104, 80], guard: 'mid', launch: [7, -13], cancel: true, pose: 'hook', step: 5, heavy: true },
  kick:     { startup: 7,  active: 4,  recovery: 13, dmg: 70,  hitstun: 19, blockstun: 12, push: 9,  box: [28, -148, 122, 44], guard: 'mid', cancel: true, pose: 'kick', heavy: true },
  cjab:     { startup: 4,  active: 3,  recovery: 7,  dmg: 32,  hitstun: 14, blockstun: 9,  push: 6,  box: [28, -104, 92, 32],  guard: 'mid', chain: { p: 'cjab', k: 'sweep' }, cancel: true, pose: 'cpunch', crouch: true },
  sweep:    { startup: 8,  active: 4,  recovery: 20, dmg: 75,  hitstun: 0,  blockstun: 13, push: 8,  box: [24, -40, 130, 40],   guard: 'low', knockdown: true, pose: 'sweep', crouch: true, heavy: true },
  jpunch:   { startup: 5,  active: 12, recovery: 4,  dmg: 50,  hitstun: 16, blockstun: 11, push: 5,  box: [14, -150, 92, 76],  guard: 'over', air: true, pose: 'jpunch' },
  jkick:    { startup: 6,  active: 16, recovery: 4,  dmg: 70,  hitstun: 19, blockstun: 12, push: 6,  box: [10, -92, 110, 70],  guard: 'over', air: true, pose: 'jkick', heavy: true },
  // 잡기: grab이 성공하면 상대를 held로 붙잡고 slam 동작으로 넘어가 startup 프레임에 메친다.
  throw:    { startup: 4,  active: 2,  recovery: 22, pose: 'throw', grab: { range: 104, dmg: 110, hold: 60, launch: [7, -11], slam: 'slam' } },
  slam:     { startup: 14, active: 1,  recovery: 20, pose: 'slam', isSlam: true },
  slamBig:  { startup: 26, active: 1,  recovery: 26, pose: 'slam', isSlam: true },
};

const NORMALS = ['jab', 'straight', 'finisher', 'kick', 'cjab', 'sweep', 'jpunch', 'jkick'];
function tuned({ reach = 1, slow = 0, power = 1 } = {}) {
  const moves = { throw: MOVES.throw, slam: MOVES.slam, slamBig: MOVES.slamBig };
  for (const key of NORMALS) {
    const m = MOVES[key], [bx, by, bw, bh] = m.box;
    moves[key] = { ...m, startup: Math.max(3, m.startup + slow), recovery: Math.max(4, m.recovery + Math.round(slow * 1.5)), dmg: Math.round(m.dmg * power), box: [bx, by, Math.round(bw * reach), bh] };
  }
  return moves;
}
// 필살기 한 줄: 자세 이름, 발동·지속·회수 프레임, 나머지 성질.
const sp = (pose, startup, active, recovery, rest = {}) => ({ startup, active, recovery, pose, special: true, guard: 'mid', hitstun: 18, blockstun: 13, push: 8, ...rest });
const hyper = (pose, startup, active, recovery, rest = {}) => sp(pose, startup, active, recovery, { isSuper: true, ...rest });

export const TYPES = { sugar: '당', fat: '지방', salt: '소금', overeat: '과식' };

// cmds: [커맨드, 버튼, 기술] 을 우선순위 순서로(긴 커맨드 먼저). 커맨드는 바라보는 쪽 기준 숫자패드 표기.
// commands: 고르기 화면에 보여 줄 기술표(오른쪽을 볼 때 기준). key는 moves의 기술 키로, 발동할 때 이름을 띄우는 데 쓴다.
const SUPER_CMD = '↓ → ↓ → + 주먹';
export const CHARS = {
  heart: {
    id: 'heart', name: '심장', en: 'HEART', kind: 'organ', color: '#ee4a66', dark: '#8f1c36', glove: '#ffd7c4', hp: 1040, walk: 5.4, jump: 21, air: 6.2, dmg: 1, extraJab: true, strong: 'overeat',
    style: '러시형 복서', trait: '장풍 없이 파고들어 4연타로 몰아쳐요',
    moves: {
      ...tuned(),
      rush:  sp('rush', 7, 20, 14, { dmg: 44, hitstun: 16, blockstun: 13, push: 3, box: [20, -170, 100, 60], rehit: 7, move: 8, finalLaunch: [9, -8], heavy: true }),
      upper: sp('upper', 4, 12, 14, { dmg: 120, blockstun: 16, push: 4, box: [6, -250, 88, 170], launch: [5, -17], invuln: 9, rise: [3.2, -16.5], landRecovery: 14, heavy: true }),
      weave: sp('weave', 3, 11, 3, { move: 9.5, approach: 4, crouch: true, shotInvuln: [1, 16], noMeter: true }),
      super: hyper('super', 10, 36, 26, { dmg: 52, hitstun: 20, blockstun: 14, push: 3, box: [16, -200, 136, 180], rehit: 6, move: 7, invuln: 14, finalLaunch: [10, -14] }),
    },
    cmds: [['623', 'p', 'upper'], ['236', 'p', 'rush'], ['214', 'k', 'weave']],
    commands: [
      { key: 'rush', name: '박동 연타', cmd: '↓ → + 주먹', note: '달려들며 세 번 때려요' },
      { key: 'upper', name: '수축 어퍼', cmd: '→ ↓ → + 주먹', note: '뛰어오르는 상대를 받아쳐요' },
      { key: 'weave', name: '위빙 스텝', cmd: '↓ ← + 킥', note: '장풍 밑으로 파고들어요' },
      { key: 'super', name: '심박 폭주', cmd: SUPER_CMD, note: '초필살기' },
    ],
  },
  kidney: {
    id: 'kidney', name: '신장', en: 'KIDNEY', kind: 'organ', color: '#b65f97', dark: '#6a2a58', glove: '#f3d6ec', hp: 1000, walk: 4.5, jump: 20.5, air: 5.6, dmg: 1.02, noChip: true, absorb: true, strong: 'salt',
    style: '견제형 수비수', trait: '멀리서 물방울로 견제하고 장풍은 되돌려요',
    moves: {
      ...tuned(),
      cast:    sp('cast', 13, 1, 28, { spawn: { kind: 'water', at: [62, -108], speed: 8, w: 48, h: 40, dmg: 54, hitstun: 17, blockstun: 12, push: 8 } }),
      barrier: sp('barrier', 5, 16, 18, { dmg: 55, blockstun: 12, push: 24, box: [14, -210, 122, 200], launch: [11, -6], reflect: [4, 24], breakArmor: true, heavy: true }),
      lob:     sp('lob', 14, 1, 28, { spawn: { kind: 'stone', at: [40, -190], speed: 6.5, vy: -15, g: .6, w: 44, h: 44, dmg: 65, hitstun: 19, blockstun: 13, push: 6, guard: 'over' } }),
      super:   hyper('cast2', 12, 1, 30, { invuln: 10, spawn: { kind: 'wave', at: [70, -80], speed: 9, w: 110, h: 160, dmg: 46, hitstun: 20, blockstun: 14, push: 3, hits: 5, rehit: 5, power: 2, finalLaunch: [9, -13], isSuper: true } }),
    },
    cmds: [['22', 'p', 'lob'], ['236', 'p', 'cast'], ['214', 'p', 'barrier']],
    commands: [
      { key: 'cast', name: '물방울 탄', cmd: '↓ → + 주먹', note: '곧게 날아가는 장풍이에요' },
      { key: 'barrier', name: '여과막', cmd: '↓ ← + 주먹', note: '장풍을 되돌리고, 버티며 오는 상대도 밀어내요' },
      { key: 'lob', name: '결석 던지기', cmd: '↓ ↓ + 주먹', note: '포물선으로 떨어져요. 서서 막아야 해요' },
      { key: 'super', name: '대홍수', cmd: SUPER_CMD, note: '초필살기' },
    ],
  },
  liver: {
    id: 'liver', name: '간', en: 'LIVER', kind: 'organ', color: '#b0603f', dark: '#63301c', glove: '#f4d9c2', hp: 1240, walk: 4, jump: 19.5, air: 5, dmg: 1.16, regen: 0.07, strong: 'fat',
    style: '잡기형 중량급', trait: '느리지만 붙으면 잡아 메쳐요. 체력이 조금씩 돌아와요',
    moves: {
      ...tuned({ slow: 2, power: 1.25 }),
      grab:   sp('grab', 7, 3, 34, { grab: { range: 124, dmg: 190, hold: 66, launch: [4, -7], slam: 'slamBig' } }),
      charge: sp('charge', 12, 12, 24, { dmg: 112, blockstun: 15, push: 12, box: [16, -170, 96, 130], launch: [9, -9], move: 10, approach: 2, armor: [4, 24], heavy: true }),
      stomp:  sp('stomp', 15, 5, 24, { dmg: 95, blockstun: 14, box: [10, -46, 210, 46], guard: 'low', knockdown: true, heavy: true }),
      super:  hyper('grab', 12, 14, 34, { move: 11, approach: 8, invuln: 16, grab: { range: 130, dmg: 290, hold: 66, launch: [5, -9], slam: 'slamBig', isSuper: true } }),
    },
    cmds: [['426', 'p', 'grab'], ['22', 'k', 'stomp'], ['236', 'k', 'charge']],
    commands: [
      { key: 'grab', name: '해독 슬램', cmd: '← ↓ → + 주먹', note: '가드를 무시하고 잡아 메쳐요' },
      { key: 'charge', name: '돌진 박치기', cmd: '↓ → + 킥', note: '한 대 맞아도 버티며 들이받아요' },
      { key: 'stomp', name: '지면 강타', cmd: '↓ ↓ + 킥', note: '바닥 충격파예요. 앉아서 막아야 해요' },
      { key: 'super', name: '대해독', cmd: SUPER_CMD, note: '초필살기. 달려가 잡아요' },
    ],
  },
  pancreas: {
    id: 'pancreas', name: '췌장', en: 'PANCREAS', kind: 'organ', color: '#f2bc55', dark: '#8f6417', glove: '#fff2cf', hp: 960, walk: 4.7, jump: 21, air: 6, dmg: 1, strong: 'sugar',
    style: '긴 리치 테크니션', trait: '주사기로 멀리서 찌르고 공격을 받아쳐요',
    moves: {
      ...tuned({ reach: 1.4, slow: 1 }),
      lunge:   sp('lunge', 11, 12, 16, { dmg: 58, box: [30, -150, 215, 40], rehit: 7, move: 4, heavy: true }),
      stance:  sp('stance', 3, 20, 18, { counter: [3, 23], riposte: 'riposte' }),
      riposte: sp('riposte', 4, 5, 20, { dmg: 130, box: [10, -260, 170, 240], launch: [5, -15], invuln: 12, heavy: true }),
      rising:  sp('rising', 6, 6, 24, { dmg: 105, blockstun: 15, box: [14, -310, 110, 250], launch: [2.5, -19], invuln: 6, heavy: true }),
      super:   hyper('flurry', 9, 35, 26, { dmg: 46, hitstun: 20, blockstun: 14, push: 3, box: [26, -200, 235, 170], rehit: 5, move: 2.5, invuln: 12, finalLaunch: [10, -14] }),
    },
    cmds: [['623', 'p', 'rising'], ['236', 'p', 'lunge'], ['214', 'p', 'stance']],
    commands: [
      { key: 'lunge', name: '인슐린 찌르기', cmd: '↓ → + 주먹', note: '멀리까지 두 번 찔러요' },
      { key: 'stance', name: '받아치기', cmd: '↓ ← + 주먹', note: '맞는 순간 흘리고 되받아쳐요. 장풍도 흘려요' },
      { key: 'rising', name: '올려 베기', cmd: '→ ↓ → + 주먹', note: '높이 닿는 대공기예요' },
      { key: 'super', name: '인슐린 난무', cmd: SUPER_CMD, note: '초필살기' },
    ],
  },
  soda: {
    id: 'soda', name: '탄산', en: 'SODA', kind: 'villain', color: '#3f9fe6', dark: '#1b4f86', glove: '#d9efff', hp: 960, walk: 5.6, jump: 21, air: 6.2, dmg: 1, type: 'sugar',
    style: '변칙 트릭스터', trait: '빠르고 가벼워요. 뒤로 돌아가고 위에서 내리꽂아요',
    moves: {
      ...tuned({ reach: .95, slow: -1, power: .9 }),
      spray: sp('spray', 8, 16, 14, { dmg: 33, hitstun: 15, blockstun: 11, push: 4, box: [26, -175, 150, 110], rehit: 5, finalLaunch: [10, -6] }),
      burst: sp('burst', 5, 6, 26, { dmg: 95, blockstun: 15, box: [-80, -230, 160, 230], launch: [6, -15], invuln: 11, heavy: true }),
      dive:  sp('dive', 4, 40, 8, { dmg: 78, hitstun: 20, box: [10, -70, 80, 70], guard: 'over', air: true, dive: [9, 11], heavy: true }),
      slip:  sp('slip', 3, 16, 8, { move: 13, approach: 6, invuln: 19, pass: true, crouch: true, noMeter: true }),
      super: hyper('geyser', 8, 30, 28, { dmg: 44, hitstun: 20, blockstun: 14, push: 1, box: [36, -340, 140, 340], rehit: 5, invuln: 12, finalLaunch: [4, -18] }),
    },
    cmds: [['623', 'p', 'burst'], ['236', 'p', 'spray'], ['214', 'k', 'slip']],
    airCmd: ['k', 'dive'],
    commands: [
      { key: 'spray', name: '탄산 분사', cmd: '↓ → + 주먹', note: '가까이에서 여러 번 맞아요' },
      { key: 'burst', name: '흔들어 폭발', cmd: '→ ↓ → + 주먹', note: '몸 둘레가 터져요. 잠깐 무적이에요' },
      { key: 'dive', name: '급강하 킥', cmd: '공중에서 ↓ + 킥', note: '비스듬히 내리꽂아요' },
      { key: 'slip', name: '거품 슬립', cmd: '↓ ← + 킥', note: '상대를 지나 뒤로 미끄러져요' },
      { key: 'super', name: '탄산 간헐천', cmd: SUPER_CMD, note: '초필살기' },
    ],
  },
  fries: {
    id: 'fries', name: '튀김', en: 'FRIES', kind: 'villain', color: '#dd4b33', dark: '#7c2014', glove: '#ffe29a', hp: 1100, walk: 3.6, jump: 19.5, air: 5, dmg: 1.1, type: 'fat',
    style: '함정 슬라이더', trait: '기름을 깔아 두고 바닥으로 미끄러져 들어와요',
    moves: {
      ...tuned({ reach: 1.25, slow: 2, power: 1.05 }),
      slide: sp('slide', 9, 14, 24, { dmg: 84, blockstun: 14, box: [10, -50, 120, 50], guard: 'low', knockdown: true, move: 11.5, approach: 3, crouch: true, heavy: true }),
      drop:  sp('drop', 14, 1, 22, { spawn: { kind: 'puddle', at: [240, -9], speed: 0, w: 150, h: 18, dmg: 40, hitstun: 0, blockstun: 10, push: 2, guard: 'low', launch: [2, -8], life: 190, max: 1 } }),
      spear: sp('spear', 5, 8, 26, { dmg: 105, blockstun: 15, box: [10, -330, 100, 270], launch: [4, -17], invuln: 7, heavy: true }),
      super: hyper('slide', 8, 34, 26, { dmg: 48, hitstun: 20, blockstun: 14, push: 3, box: [6, -80, 150, 80], guard: 'low', rehit: 6, move: 9, invuln: 12, crouch: true, finalLaunch: [9, -14] }),
    },
    cmds: [['623', 'p', 'spear'], ['236', 'k', 'slide'], ['214', 'p', 'drop']],
    commands: [
      { key: 'slide', name: '기름 슬라이딩', cmd: '↓ → + 킥', note: '바닥으로 미끄러져 넘어뜨려요. 앉아서 막아야 해요' },
      { key: 'drop', name: '기름 웅덩이', cmd: '↓ ← + 주먹', note: '바닥에 3초 남아요. 밟으면 미끄러져요' },
      { key: 'spear', name: '감자 솟구침', cmd: '→ ↓ → + 주먹', note: '위로 길게 찌르는 대공기예요' },
      { key: 'super', name: '기름 쓰나미', cmd: SUPER_CMD, note: '초필살기' },
    ],
  },
  ramen: {
    id: 'ramen', name: '라면', en: 'RAMEN', kind: 'villain', color: '#e8833c', dark: '#84401a', glove: '#fff0d6', hp: 950, walk: 4.4, jump: 20.5, air: 5.6, dmg: 1, type: 'salt',
    style: '중거리 채찍', trait: '면발로 멀리서 끌어당기고 김으로 자리를 막아요',
    moves: {
      ...tuned({ reach: 1.15, slow: 1 }),
      whip:  sp('whip', 15, 5, 20, { dmg: 62, hitstun: 36, blockstun: 14, push: 2, box: [36, -164, 310, 36], pull: 100, heavy: true }),
      steam: sp('steam', 11, 1, 20, { spawn: { kind: 'steam', at: [120, -110], speed: 0, w: 140, h: 170, dmg: 20, hitstun: 13, blockstun: 9, push: 3, life: 62, hits: 4, rehit: 13, still: true } }),
      riser: sp('riser', 5, 14, 16, { dmg: 60, blockstun: 15, push: 4, box: [6, -240, 96, 180], launch: [3.5, -15], rehit: 7, invuln: 8, rise: [3, -15.5], landRecovery: 14, heavy: true }),
      super: hyper('tornado', 10, 36, 26, { dmg: 46, hitstun: 20, blockstun: 14, push: 2, box: [20, -210, 290, 190], rehit: 6, pull: 110, invuln: 12, finalLaunch: [9, -15] }),
    },
    cmds: [['623', 'k', 'riser'], ['236', 'p', 'whip'], ['214', 'p', 'steam']],
    commands: [
      { key: 'whip', name: '면발 채찍', cmd: '↓ → + 주먹', note: '멀리서 맞히면 끌려와요. 앉으면 머리 위로 지나가요' },
      { key: 'steam', name: '김 뿜기', cmd: '↓ ← + 주먹', note: '앞에 김이 잠깐 남아 여러 번 맞아요' },
      { key: 'riser', name: '젓가락 올려차기', cmd: '→ ↓ → + 킥', note: '뛰어오르며 두 번 차요' },
      { key: 'super', name: '면발 소용돌이', cmd: SUPER_CMD, note: '초필살기' },
    ],
  },
  burger: {
    id: 'burger', name: '대왕버거', en: 'BIG BURGER', kind: 'villain', color: '#c98a3a', dark: '#6b4215', glove: '#ffe9c2', hp: 1260, walk: 4, jump: 20, air: 5.4, dmg: 1.15, type: 'overeat', boss: true,
    style: '초중량 압박', trait: '맞으면서 굴러오고 위에서 덮쳐요',
    moves: {
      ...tuned({ reach: 1.1, slow: 3, power: 1.3 }),
      roll:  sp('roll', 14, 30, 26, { dmg: 42, hitstun: 18, blockstun: 14, push: 6, box: [0, -190, 90, 190], rehit: 10, move: 10.5, approach: 1, armor: [6, 44], armorHits: 2, finalLaunch: [9, -10], heavy: true }),
      press: sp('press', 14, 44, 26, { dmg: 105, blockstun: 16, box: [-60, -110, 120, 120], guard: 'over', knockdown: true, rise: [0, -20], landRecovery: 26, home: 12, homeMax: 9, heavyLand: true, fall: true, heavy: true }),
      grab:  sp('grab', 9, 3, 36, { grab: { range: 158, dmg: 160, hold: 74, launch: [5, -8], slam: 'slamBig' } }),
      super: hyper('press', 8, 44, 24, { dmg: 250, blockstun: 18, box: [-80, -130, 160, 140], guard: 'over', launch: [5, -12], rise: [0, -19], landRecovery: 24, home: 10, homeMax: 14, invuln: 26, heavyLand: true, fall: true }),
    },
    cmds: [['426', 'p', 'grab'], ['22', 'k', 'press'], ['236', 'k', 'roll']],
    commands: [
      { key: 'roll', name: '통구르기', cmd: '↓ → + 킥', note: '두 대까지 버티며 굴러가요' },
      { key: 'press', name: '보디 프레스', cmd: '↓ ↓ + 킥', note: '뛰어올라 상대 위로 떨어져요. 서서 막아야 해요' },
      { key: 'grab', name: '치즈 잡기', cmd: '← ↓ → + 주먹', note: '멀리서도 잡아 메쳐요' },
      { key: 'super', name: '대왕 압사', cmd: SUPER_CMD, note: '초필살기' },
    ],
  },
};
export const ORGANS = ['heart', 'kidney', 'liver', 'pancreas'];
export const VILLAINS = ['soda', 'fries', 'ramen'];
export const BOSS = 'burger';

// 담당 장기가 그 속성 빌런에게 주는 피해 배율.
export const advantage = (attacker, defender) => (attacker.strong && attacker.strong === defender.type ? 1.2 : 1);

// 기술 키로 기술 이름을 찾는다(기술표에 없는 동작은 빈 문자열).
export const moveName = (char, key) => char.commands.find(c => c.key === key)?.name || '';
