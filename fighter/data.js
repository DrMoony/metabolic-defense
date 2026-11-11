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

// 커맨드 규칙: 모두가 ↓→(236)·↓←(214)를 주먹과 킥으로 하나씩 갖는다(↓→주먹=주력, ↓→킥=전진, ↓←주먹=대공, ↓←킥=수비·변칙).
// 여기에 캐릭터마다 고유 커맨드(own) 하나를 주먹과 킥으로 하나씩 더 갖는다. 초필살기는 모두 주먹+킥.
// 커맨드는 바라보는 쪽 기준 숫자패드 표기. air는 공중에서 ↓+버튼.
const SUPER_CMD = '주먹 + 킥';
export const ARROWS = { '236': '↓ →', '214': '↓ ←', '66': '→ →', '44': '← ←', '22': '↓ ↓', '46': '← →', '64': '→ ←', air: '공중 ↓' };
const BUTTONS = { p: '주먹', k: '킥' };
// 기술표 한 벌. rows: [커맨드, 버튼, 기술 키, 이름, 설명] 을 화면에 보일 순서로.
// cmds: 판정이 보는 [커맨드, 버튼, 기술] 목록(점수가 같으면 앞쪽이 나가므로 고유 커맨드를 앞에 둔다). airCmds: 공중 전용 [버튼, 기술].
// commands: 고르기 화면 기술표. key는 moves의 기술 키로, 발동할 때 이름을 띄우는 데 쓴다.
function book(own, rows, superName, superNote = '초필살기') {
  const ground = rows.filter(row => row[0] !== 'air').map(([motion, button, key]) => [motion, button, key]);
  return {
    own,
    cmds: [...ground.filter(cmd => cmd[0] === own), ...ground.filter(cmd => cmd[0] !== own)],
    airCmds: rows.filter(row => row[0] === 'air').map(([, button, key]) => [button, key]),
    commands: [
      ...rows.map(([motion, button, key, name, note]) => ({ key, name, motion, button, cmd: `${ARROWS[motion]} + ${BUTTONS[button]}`, note })),
      { key: 'super', name: superName, cmd: SUPER_CMD, note: superNote },
    ],
  };
}
export const CHARS = {
  heart: {
    id: 'heart', name: '심장', en: 'HEART', kind: 'organ', color: '#ee4a66', dark: '#8f1c36', glove: '#ffd7c4', hp: 1040, walk: 5.4, jump: 21, air: 6.2, dmg: 1, extraJab: true, strong: 'overeat',
    style: '러시형 복서', trait: '장풍 없이 파고들어 4연타로 몰아쳐요',
    moves: {
      ...tuned(),
      rush:  sp('rush', 7, 20, 14, { dmg: 44, hitstun: 16, blockstun: 13, push: 3, box: [20, -170, 100, 60], rehit: 7, move: 8, finalLaunch: [9, -8], heavy: true }),
      upper: sp('upper', 4, 12, 14, { dmg: 120, blockstun: 16, push: 4, box: [6, -250, 88, 170], launch: [5, -17], invuln: 9, rise: [3.2, -16.5], landRecovery: 14, heavy: true }),
      weave: sp('weave', 3, 11, 3, { move: 9.5, approach: 4, crouch: true, shotInvuln: [1, 16], noMeter: true }),
      knee:  sp('knee', 8, 12, 16, { dmg: 88, blockstun: 14, box: [10, -190, 95, 130], launch: [7, -11], rise: [8.5, -9], landRecovery: 10, heavy: true }),
      dash:  sp('dash', 10, 9, 22, { dmg: 98, blockstun: 15, push: 12, box: [20, -178, 118, 56], launch: [10, -7], move: 20, approach: 2, heavy: true }),
      shock: sp('shock', 9, 5, 24, { dmg: 92, blockstun: 15, box: [-105, -235, 210, 235], launch: [6, -13], step: 4, heavy: true }),
      super: hyper('super', 10, 36, 26, { dmg: 52, hitstun: 20, blockstun: 14, push: 3, box: [16, -200, 136, 180], rehit: 6, move: 7, invuln: 14, finalLaunch: [10, -14] }),
    },
    ...book('66', [
      ['236', 'p', 'rush', '박동 연타', '달려들며 세 번 때려요'],
      ['236', 'k', 'knee', '도약 무릎', '낮게 뛰어들어 무릎으로 띄워요'],
      ['214', 'p', 'upper', '수축 어퍼', '뛰어오르는 상대를 받아쳐요'],
      ['214', 'k', 'weave', '위빙 스텝', '장풍 밑으로 파고들어요'],
      ['66', 'p', 'dash', '직선 돌파', '먼 거리를 단숨에 뚫고 들어가요'],
      ['66', 'k', 'shock', '제세동 쇼크', '몸 둘레에 전기 충격을 터뜨려요'],
    ], '심박 폭주'),
  },
  kidney: {
    id: 'kidney', name: '신장', en: 'KIDNEY', kind: 'organ', color: '#b65f97', dark: '#6a2a58', glove: '#f3d6ec', hp: 1000, walk: 4.5, jump: 20.5, air: 5.6, dmg: 1.02, noChip: true, absorb: true, strong: 'salt',
    style: '견제형 수비수', trait: '멀리서 물방울로 견제하고 장풍은 되돌려요',
    moves: {
      ...tuned(),
      cast:    sp('cast', 13, 1, 28, { spawn: { kind: 'water', at: [62, -108], speed: 8, w: 48, h: 40, dmg: 54, hitstun: 17, blockstun: 12, push: 8 } }),
      barrier: sp('barrier', 5, 16, 18, { dmg: 55, blockstun: 12, push: 24, box: [14, -210, 122, 200], launch: [11, -6], reflect: [4, 24], breakArmor: true, heavy: true }),
      lob:     sp('lob', 14, 1, 28, { spawn: { kind: 'stone', at: [40, -190], speed: 6.5, vy: -15, g: .6, w: 44, h: 44, dmg: 65, hitstun: 19, blockstun: 13, push: 6, guard: 'over' } }),
      surf:     sp('surf', 10, 18, 18, { dmg: 36, hitstun: 16, blockstun: 12, push: 3, box: [10, -120, 110, 120], rehit: 6, move: 9, approach: 2, finalLaunch: [8, -10], heavy: true }),
      fountain: sp('fountain', 7, 8, 26, { dmg: 100, blockstun: 15, box: [40, -330, 96, 330], launch: [2, -18], invuln: 5, heavy: true }),
      flip:     sp('flip', 6, 8, 14, { dmg: 80, blockstun: 13, box: [10, -200, 110, 170], launch: [6, -12], rise: [-7, -12], landRecovery: 10, invuln: 5, heavy: true }),
      super:   hyper('cast2', 12, 1, 30, { invuln: 10, spawn: { kind: 'wave', at: [70, -80], speed: 9, w: 110, h: 160, dmg: 46, hitstun: 20, blockstun: 14, push: 3, hits: 5, rehit: 5, power: 2, finalLaunch: [9, -13], isSuper: true } }),
    },
    ...book('44', [
      ['236', 'p', 'cast', '물방울 탄', '곧게 날아가는 장풍이에요'],
      ['236', 'k', 'surf', '급류 타기', '물살을 타고 밀고 들어가요'],
      ['214', 'p', 'fountain', '분수 기둥', '앞에서 물기둥이 솟아 띄워요'],
      ['214', 'k', 'barrier', '여과막', '장풍을 되돌리고, 버티며 오는 상대도 밀어내요'],
      ['44', 'p', 'lob', '결석 던지기', '포물선으로 떨어져요. 서서 막아야 해요'],
      ['44', 'k', 'flip', '물러서기 킥', '걷어차면서 뒤로 물러나요'],
    ], '대홍수'),
  },
  liver: {
    id: 'liver', name: '간', en: 'LIVER', kind: 'organ', color: '#b0603f', dark: '#63301c', glove: '#f4d9c2', hp: 1240, walk: 4, jump: 19.5, air: 5, dmg: 1.16, regen: 0.07, strong: 'fat',
    style: '잡기형 중량급', trait: '느리지만 붙으면 잡아 메쳐요. 체력이 조금씩 돌아와요',
    moves: {
      ...tuned({ slow: 2, power: 1.25 }),
      grab:   sp('grab', 7, 3, 34, { grab: { range: 124, dmg: 190, hold: 66, launch: [4, -7], slam: 'slamBig' } }),
      charge: sp('charge', 12, 12, 24, { dmg: 112, blockstun: 15, push: 12, box: [16, -170, 96, 130], launch: [9, -9], move: 10, approach: 2, armor: [4, 24], heavy: true }),
      stomp:  sp('stomp', 15, 5, 24, { dmg: 95, blockstun: 14, box: [10, -46, 210, 46], guard: 'low', knockdown: true, heavy: true }),
      heave:  sp('heave', 9, 7, 28, { dmg: 125, blockstun: 16, box: [10, -290, 115, 250], launch: [4, -18], armor: [3, 16], step: 3, heavy: true }),
      regen:  sp('regen', 10, 44, 16, { heal: 2.4, noMeter: true }),
      clap:   sp('clap', 11, 4, 22, { dmg: 70, hitstun: 34, blockstun: 16, push: 2, box: [20, -210, 150, 120], heavy: true }),
      super:  hyper('grab', 12, 14, 34, { move: 11, approach: 8, invuln: 16, grab: { range: 130, dmg: 290, hold: 66, launch: [5, -9], slam: 'slamBig', isSuper: true } }),
    },
    ...book('22', [
      ['236', 'p', 'grab', '해독 슬램', '가드를 무시하고 잡아 메쳐요'],
      ['236', 'k', 'charge', '돌진 박치기', '한 대 맞아도 버티며 들이받아요'],
      ['214', 'p', 'heave', '들어 올리기', '한 대 버티며 위로 퍼 올려요'],
      ['214', 'k', 'regen', '재생 호흡', '숨을 고르며 체력을 되찾아요'],
      ['22', 'p', 'clap', '간 박수', '맞으면 한동안 어질어질해요'],
      ['22', 'k', 'stomp', '지면 강타', '바닥 충격파예요. 앉아서 막아야 해요'],
    ], '대해독', '초필살기. 달려가 잡아요'),
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
      plunge:  sp('plunge', 9, 34, 20, { dmg: 92, blockstun: 15, box: [10, -110, 95, 120], guard: 'over', knockdown: true, rise: [7, -17], landRecovery: 16, fall: true, heavy: true }),
      inject:  sp('inject', 8, 4, 20, { dmg: 48, hitstun: 30, blockstun: 12, push: 3, box: [24, -160, 150, 44], drain: 34, heavy: true }),
      reap:    sp('reap', 12, 5, 24, { dmg: 82, blockstun: 14, box: [26, -52, 235, 52], guard: 'low', knockdown: true, crouch: true, heavy: true }),
      super:   hyper('flurry', 9, 35, 26, { dmg: 46, hitstun: 20, blockstun: 14, push: 3, box: [26, -200, 235, 170], rehit: 5, move: 2.5, invuln: 12, finalLaunch: [10, -14] }),
    },
    ...book('46', [
      ['236', 'p', 'lunge', '인슐린 찌르기', '멀리까지 두 번 찔러요'],
      ['236', 'k', 'plunge', '내리꽂기', '뛰어올라 위에서 찍어요. 서서 막아야 해요'],
      ['214', 'p', 'rising', '올려 베기', '높이 닿는 대공기예요'],
      ['214', 'k', 'stance', '받아치기', '맞는 순간 흘리고 되받아쳐요. 장풍도 흘려요'],
      ['46', 'p', 'inject', '인슐린 주입', '찔러서 상대 게이지를 빼앗아요'],
      ['46', 'k', 'reap', '바닥 쓸기', '멀리까지 바닥을 쓸어요. 앉아서 막아야 해요'],
    ], '인슐린 난무'),
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
      rocket:  sp('rocket', 9, 16, 18, { dmg: 90, blockstun: 15, box: [10, -170, 90, 110], launch: [8, -11], rise: [13, -9.5], landRecovery: 14, heavy: true }),
      capshot: sp('capshot', 6, 1, 14, { air: true, rise: [-2.5, -6], spawn: { kind: 'cap', at: [30, -60], speed: 10, vy: 4.5, g: .45, w: 46, h: 46, dmg: 62, hitstun: 19, blockstun: 12, push: 5, guard: 'over' } }),
      super: hyper('geyser', 8, 30, 28, { dmg: 44, hitstun: 20, blockstun: 14, push: 1, box: [36, -340, 140, 340], rehit: 5, invuln: 12, finalLaunch: [4, -18] }),
    },
    ...book('air', [
      ['236', 'p', 'spray', '탄산 분사', '가까이에서 여러 번 맞아요'],
      ['236', 'k', 'rocket', '탄산 로켓', '탄산을 뿜으며 낮게 날아가 들이받아요'],
      ['214', 'p', 'burst', '흔들어 폭발', '몸 둘레가 터져요. 잠깐 무적이에요'],
      ['214', 'k', 'slip', '거품 슬립', '상대를 지나 뒤로 미끄러져요'],
      ['air', 'p', 'capshot', '병뚜껑 폭탄', '공중에서 비스듬히 아래로 던져요'],
      ['air', 'k', 'dive', '급강하 킥', '공중에서 비스듬히 내리꽂아요'],
    ], '탄산 간헐천'),
  },
  fries: {
    id: 'fries', name: '튀김', en: 'FRIES', kind: 'villain', color: '#dd4b33', dark: '#7c2014', glove: '#ffe29a', hp: 1100, walk: 3.6, jump: 19.5, air: 5, dmg: 1.1, type: 'fat',
    style: '함정 슬라이더', trait: '기름을 깔아 두고 바닥으로 미끄러져 들어와요',
    moves: {
      ...tuned({ reach: 1.25, slow: 2, power: 1.05 }),
      slide: sp('slide', 9, 14, 24, { dmg: 84, blockstun: 14, box: [10, -50, 120, 50], guard: 'low', knockdown: true, move: 11.5, approach: 3, crouch: true, heavy: true }),
      drop:  sp('drop', 14, 1, 22, { spawn: { kind: 'puddle', at: [240, -9], speed: 0, w: 150, h: 18, dmg: 40, hitstun: 0, blockstun: 10, push: 2, guard: 'low', launch: [2, -8], life: 190, max: 1 } }),
      spear: sp('spear', 5, 8, 26, { dmg: 105, blockstun: 15, box: [10, -330, 100, 270], launch: [4, -17], invuln: 7, heavy: true }),
      darts:  sp('darts', 12, 1, 24, { spawn: { kind: 'fry', at: [60, -130], speed: 10, w: 54, h: 22, dmg: 27, hitstun: 16, blockstun: 10, push: 4, life: 30, fan: [-4, 0, 2.2], max: 1 } }),
      flap:   sp('flap', 8, 18, 18, { dmg: 30, hitstun: 15, blockstun: 11, push: 5, box: [20, -220, 130, 200], rehit: 6, wipe: [6, 26], finalLaunch: [8, -9], heavy: true }),
      ignite: sp('ignite', 12, 1, 26, { spawn: { kind: 'flame', at: [110, -95], speed: 0, w: 120, h: 190, dmg: 26, hitstun: 14, blockstun: 10, push: 3, hits: 4, rehit: 9, life: 44, finalLaunch: [5, -14], ignite: { w: 240, h: 300, hits: 5, dmg: 30, life: 54, push: 1 } } }),
      super: hyper('slide', 8, 34, 26, { dmg: 48, hitstun: 20, blockstun: 14, push: 3, box: [6, -80, 150, 80], guard: 'low', rehit: 6, move: 9, invuln: 12, crouch: true, finalLaunch: [9, -14] }),
    },
    ...book('22', [
      ['236', 'p', 'darts', '튀김 투척', '감자튀김 세 개를 부채꼴로 던져요'],
      ['236', 'k', 'slide', '기름 슬라이딩', '바닥으로 미끄러져 넘어뜨려요. 앉아서 막아야 해요'],
      ['214', 'p', 'spear', '감자 솟구침', '위로 길게 찌르는 대공기예요'],
      ['214', 'k', 'flap', '튀김 부채', '휘둘러서 날아오는 장풍을 쓸어 내요'],
      ['22', 'p', 'drop', '기름 웅덩이', '바닥에 3초 남아요. 밟으면 미끄러져요'],
      ['22', 'k', 'ignite', '기름 점화', '앞에 불을 붙여요. 웅덩이가 있으면 불기둥이 돼요'],
    ], '기름 쓰나미'),
  },
  ramen: {
    id: 'ramen', name: '라면', en: 'RAMEN', kind: 'villain', color: '#e8833c', dark: '#84401a', glove: '#fff0d6', hp: 950, walk: 4.4, jump: 20.5, air: 5.6, dmg: 1, type: 'salt',
    style: '중거리 채찍', trait: '면발로 멀리서 끌어당기고 김으로 자리를 막아요',
    moves: {
      ...tuned({ reach: 1.15, slow: 1 }),
      whip:  sp('whip', 15, 5, 20, { dmg: 62, hitstun: 36, blockstun: 14, push: 2, box: [36, -164, 310, 36], pull: 100, heavy: true }),
      steam: sp('steam', 11, 1, 20, { spawn: { kind: 'steam', at: [120, -110], speed: 0, w: 140, h: 170, dmg: 20, hitstun: 13, blockstun: 9, push: 3, life: 62, hits: 4, rehit: 13, still: true } }),
      riser: sp('riser', 5, 14, 16, { dmg: 60, blockstun: 15, push: 4, box: [6, -240, 96, 180], launch: [3.5, -15], rehit: 7, invuln: 8, rise: [3, -15.5], landRecovery: 14, heavy: true }),
      stab:  sp('stab', 9, 18, 16, { dmg: 24, hitstun: 15, blockstun: 11, push: 3, box: [30, -170, 210, 70], rehit: 5, move: 3, finalLaunch: [8, -8], heavy: true }),
      reel:  sp('reel', 14, 4, 30, { grab: { range: 270, dmg: 130, hold: 70, launch: [5, -8], slam: 'slamBig', reel: 16 } }),
      broth: sp('broth', 13, 1, 24, { spawn: { kind: 'broth', at: [60, -30], speed: 7.5, w: 90, h: 60, dmg: 58, hitstun: 0, blockstun: 12, push: 6, guard: 'low', launch: [3, -9], life: 48 } }),
      super: hyper('tornado', 10, 36, 26, { dmg: 46, hitstun: 20, blockstun: 14, push: 2, box: [20, -210, 290, 190], rehit: 6, pull: 110, invuln: 12, finalLaunch: [9, -15] }),
    },
    ...book('64', [
      ['236', 'p', 'whip', '면발 채찍', '멀리서 맞히면 끌려와요. 앉으면 머리 위로 지나가요'],
      ['236', 'k', 'stab', '젓가락 연타', '빠른 발차기를 여러 번 꽂아요'],
      ['214', 'p', 'riser', '젓가락 올려치기', '뛰어오르며 두 번 올려쳐요'],
      ['214', 'k', 'steam', '김 뿜기', '앞에 김이 잠깐 남아 여러 번 맞아요'],
      ['64', 'p', 'reel', '면발 낚아채기', '멀리 있는 상대를 감아 끌어와 메쳐요'],
      ['64', 'k', 'broth', '국물 파도', '바닥을 타고 가요. 앉아서 막아야 해요'],
    ], '면발 소용돌이'),
  },
  burger: {
    id: 'burger', name: '대왕버거', en: 'BIG BURGER', kind: 'villain', color: '#c98a3a', dark: '#6b4215', glove: '#ffe9c2', hp: 1260, walk: 4, jump: 20, air: 5.4, dmg: 1.15, type: 'overeat', boss: true,
    style: '초중량 압박', trait: '맞으면서 굴러오고 위에서 덮쳐요',
    moves: {
      ...tuned({ reach: 1.1, slow: 3, power: 1.3 }),
      roll:  sp('roll', 14, 30, 26, { dmg: 42, hitstun: 18, blockstun: 14, push: 6, box: [0, -190, 90, 190], rehit: 10, move: 10.5, approach: 1, armor: [6, 44], armorHits: 2, finalLaunch: [9, -10], heavy: true }),
      press: sp('press', 14, 44, 26, { dmg: 105, blockstun: 16, box: [-60, -110, 120, 120], guard: 'over', knockdown: true, rise: [0, -20], landRecovery: 26, home: 12, homeMax: 9, heavyLand: true, fall: true, heavy: true }),
      grab:  sp('grab', 9, 3, 36, { grab: { range: 158, dmg: 160, hold: 74, launch: [5, -8], slam: 'slamBig' } }),
      hammer: sp('hammer', 17, 5, 28, { dmg: 122, blockstun: 17, push: 10, box: [20, -240, 150, 240], knockdown: true, step: 3, heavy: true }),
      lid:    sp('lid', 8, 8, 28, { dmg: 112, blockstun: 16, box: [0, -330, 130, 270], launch: [3, -18], armor: [2, 10], heavy: true }),
      roar:   sp('roar', 10, 6, 24, { dmg: 40, blockstun: 16, push: 26, box: [-150, -250, 300, 250], launch: [13, -7], armor: [2, 16], wipe: [8, 18], heavy: true }),
      super: hyper('press', 8, 44, 24, { dmg: 250, blockstun: 18, box: [-80, -130, 160, 140], guard: 'over', launch: [5, -12], rise: [0, -19], landRecovery: 24, home: 10, homeMax: 14, invuln: 26, heavyLand: true, fall: true }),
    },
    ...book('66', [
      ['236', 'p', 'hammer', '양손 내려치기', '두 손으로 크게 내려찍어 넘어뜨려요'],
      ['236', 'k', 'press', '보디 프레스', '뛰어올라 상대 위로 떨어져요. 서서 막아야 해요'],
      ['214', 'p', 'lid', '빵 뚜껑 어퍼', '빵 뚜껑으로 높이 쳐올려요'],
      ['214', 'k', 'roar', '포효', '둘레를 밀어내고 장풍도 지워요'],
      ['66', 'p', 'grab', '치즈 잡기', '멀리서도 잡아 메쳐요'],
      ['66', 'k', 'roll', '통구르기', '두 대까지 버티며 굴러가요'],
    ], '대왕 압사'),
  },
};
export const ORGANS = ['heart', 'kidney', 'liver', 'pancreas'];
export const VILLAINS = ['soda', 'fries', 'ramen'];
export const BOSS = 'burger';

// 담당 장기가 그 속성 빌런에게 주는 피해 배율.
export const advantage = (attacker, defender) => (attacker.strong && attacker.strong === defender.type ? 1.2 : 1);

// 기술 키로 기술 이름을 찾는다(기술표에 없는 동작은 빈 문자열).
export const moveName = (char, key) => char.commands.find(c => c.key === key)?.name || '';
