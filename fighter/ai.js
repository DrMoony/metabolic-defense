// CPU 상대. 사람과 똑같이 스틱·버튼 입력을 내놓는다(필살기 커맨드도 한 프레임씩 직접 넣는다). level 0(쉬움)~1(어려움).
// 낮은 단계는 늦게 알아채고, 덜 막고, 위아래를 자주 틀리고, 한 번 움직인 뒤 오래 쉰다(사람이 기술을 넣을 틈).
import { grounded } from './sim.js';

const frame = (x = 0, y = 0, buttons = '') => ({ x, y, p: buttons.includes('p'), k: buttons.includes('k') });
const hold = (input, frames) => Array.from({ length: Math.max(0, Math.round(frames)) }, () => input);

// 커맨드별 스틱 경로(숫자패드, 5=중립). 623은 중립에서 앞을 새로 눌러야 인정된다.
const PATHS = { '236': '26', '214': '24', '623': '5623', '426': '426', '22': '252', '236236': '2626' };
const stick = (digit, toward) => [((digit - 1) % 3 - 1) * toward, digit <= 3 ? 1 : digit >= 7 ? -1 : 0];
function motion(name, button, toward, pace = 2) {
  const digits = [...PATHS[name]].map(Number), last = stick(digits.at(-1), toward);
  return [...digits.flatMap(digit => hold(frame(...stick(digit, toward)), pace)), frame(...last, button), frame(...last, button), frame()];
}

// 캐릭터별 싸움 방식. 거리(far·mid·close)마다 [가중치, 행동, 조건]을 고른다.
// 행동: walk·back·wait·jump·jabs·kick·low·throw·dive, '@기술'=필살기, '+기술'=주먹 두 번 뒤 캔슬.
// anti=대공기, dodge=장풍 대응기(dodgeAt 거리 안에 들어오면), parry=받아치기, shove=돌진을 밀어내는 기술, superAt=초필살기를 쓰는 거리,
// follow=끝나자마자 주먹 연타로 잇는 이동기.
const PLANS = {
  heart: {
    anti: 'upper', dodge: 'weave', dodgeAt: 230, superAt: 210, follow: ['weave'],
    far: [[5, 'walk'], [3, '@weave'], [1, 'jump']],
    mid: [[3, 'walk'], [3, '@rush', d => d < 330], [2, '@weave'], [2, 'jump']],
    close: [[4, '+rush'], [3, 'jabs'], [2, 'low'], [2, 'throw'], [1, '@upper'], [1, 'back']],
  },
  kidney: {
    dodge: 'barrier', shove: 'barrier', dodgeAt: 150, superAt: 700,
    far: [[6, '@cast'], [3, '@lob', d => d < 520], [1, 'wait']],
    mid: [[4, '@cast'], [3, '@lob', d => d > 300], [2, '@barrier', d => d < 210], [2, 'back'], [1, 'walk'], [1, 'kick', d => d < 200]],
    close: [[3, '@barrier'], [3, 'jabs'], [2, '+cast'], [2, 'low'], [1, 'throw'], [2, 'back']],
  },
  liver: {
    superAt: 250,
    far: [[6, 'walk'], [2, '@charge'], [1, 'jump']],
    mid: [[4, 'walk'], [3, '@charge', d => d < 330], [2, '@stomp', d => d < 250], [1, 'jump']],
    close: [[4, '@grab'], [2, 'jabs'], [1, '+charge'], [2, 'low'], [1, 'throw'], [1, '@stomp']],
  },
  pancreas: {
    anti: 'rising', parry: 'stance', dodge: 'stance', dodgeAt: 110, superAt: 270,
    far: [[5, 'walk'], [1, 'wait'], [1, 'jump']],
    mid: [[4, '@lunge', d => d < 300], [3, 'kick', d => d < 230], [2, 'walk'], [1, 'back'], [1, '@stance', d => d < 230]],
    close: [[3, 'jabs'], [3, '+lunge'], [2, '@stance'], [2, 'low'], [1, 'throw'], [2, 'back'], [1, '@rising']],
  },
  soda: {
    anti: 'burst', dodge: 'slip', dodgeAt: 150, superAt: 160, follow: ['slip'],
    far: [[5, 'walk'], [3, 'dive', d => d < 520], [1, 'jump']],
    mid: [[4, 'dive'], [3, 'walk'], [2, '@slip', d => d < 250], [1, 'jump']],
    close: [[3, '@spray'], [3, 'jabs'], [2, '+spray'], [2, '@slip'], [1, '@burst'], [1, 'low'], [2, 'throw']],
  },
  fries: {
    anti: 'spear', superAt: 270,
    far: [[4, '@drop'], [4, 'walk'], [1, 'wait']],
    mid: [[4, '@slide', d => d < 320], [2, 'kick', d => d < 220], [2, '@drop', d => d > 230], [2, 'walk']],
    close: [[3, 'jabs'], [3, 'low'], [2, '+slide'], [1, 'throw'], [1, '@spear'], [2, 'back']],
  },
  ramen: {
    anti: 'riser', superAt: 310,
    far: [[5, 'walk'], [1, 'wait'], [1, 'jump']],
    mid: [[5, '@whip', d => d < 390], [2, '@steam', d => d < 240], [1, 'walk'], [1, 'back'], [1, 'kick', d => d < 210]],
    close: [[3, 'jabs'], [2, '+whip'], [2, '@steam'], [2, 'low'], [1, 'throw'], [1, '@riser'], [2, 'back']],
  },
  burger: {
    superAt: 400,
    far: [[4, 'walk'], [3, '@press', d => d < 450], [3, '@roll']],
    mid: [[3, '@roll'], [3, '@press'], [3, 'walk'], [1, '@grab', d => d < 190]],
    close: [[4, '@grab'], [2, 'jabs'], [2, 'low'], [1, 'kick'], [1, '@press']],
  },
};

export class CpuBrain {
  constructor(level = .5, random = Math.random) { this.level = level; this.random = random; this.queue = []; this.seenAttack = null; this.seenHit = false; this.guard = 0; this.guardLow = false; this.lastTotal = 0; this.quiet = 0; }
  chance(p) { return this.random() < p; }
  pick(options, dist, sim, me) {
    const usable = options.filter(([, action, when]) => (!when || when(dist)) && this.usable(action, sim, me));
    let roll = this.random() * usable.reduce((sum, [weight]) => sum + weight, 0);
    for (const [weight, action] of usable) if ((roll -= weight) < 0) return action;
    return 'walk';
  }
  // 이미 깔린 장풍·웅덩이가 있어서 못 쓰는 기술은 후보에서 뺀다.
  usable(action, sim, me) {
    const spawn = '@+'.includes(action[0]) && me.char.moves[action.slice(1)].spawn;
    return !spawn || sim.canShoot(me, spawn);
  }
  jabs(me) {
    const one = [frame(0, 0, 'p'), frame()], gap = hold(frame(), 8);
    return [...one, ...gap, ...one, ...gap, ...one, ...(me.char.extraJab ? [...gap, ...one] : [])];
  }
  special(me, key, toward, pace = 2) {
    const [name, button] = me.char.cmds.find(cmd => cmd[2] === key);
    return motion(name, button, toward, pace);
  }

  think(sim, side) {
    const me = sim.f[side], opp = sim.f[1 - side], toward = opp.x >= me.x ? 1 : -1, dist = Math.abs(opp.x - me.x);
    const plan = PLANS[me.char.id] || PLANS.heart;
    if (!sim.live) { this.queue.length = 0; return frame(); }
    if (['hit', 'air', 'down', 'getup', 'held'].includes(me.state)) { this.queue.length = 0; this.guard = 0; return frame(); }
    const free = ['idle', 'walk', 'crouch'].includes(me.state);

    // 방어: 상대 공격 하나마다 막을지 한 번만 정한다(매 프레임 다시 굴리면 완벽하게 막아 버린다).
    const near = plan.dodge ? plan.dodgeAt : 240;
    const shot = sim.shots.find(s => s.owner !== side && (s.still ? s.kind === 'steam' && Math.abs(s.x - me.x) < s.w / 2 + 50 : Math.sign(s.vx) === -toward && Math.abs(s.x - me.x) < near));
    const om = opp.state === 'attack' ? opp.move : null;
    const puddle = om?.spawn?.kind === 'puddle' && Math.abs(opp.x + opp.facing * om.spawn.at[0] - me.x) < 120;
    // 알아채는 데 걸리는 시간: 쉬운 단계는 빠른 주먹을 보고 막지 못한다.
    const notice = Math.round(9 * (1 - this.level));
    const attacking = om && (om.box || puddle) && opp.t >= notice && opp.t <= om.startup + om.active && dist < (om.move || om.home ? 330 : om.box?.[2] > 200 ? 400 : 230);
    const threat = shot || (attacking ? opp : null);
    if (threat && threat !== this.seenAttack) {
      this.seenAttack = threat;
      if (this.chance(.06 + .72 * this.level)) {
        this.queue.length = 0;
        // 캐릭터 고유 대응: 장풍은 흘리거나 되돌리고, 타격은 받아친다.
        if (free && shot && !shot.still && plan.dodge && this.chance(.1 + .7 * this.level)) this.queue = [...this.special(me, plan.dodge, toward, 1), ...hold(frame(), 6)];
        else if (free && !shot && plan.parry && !om.isSuper && dist < (om.box?.[2] > 200 ? 380 : 220) && this.chance(.5 * this.level)) this.queue = [...this.special(me, plan.parry, toward, 1), ...hold(frame(), 4)];
        else if (free && !shot && plan.shove && om.move && !om.isSuper && dist < 280 && this.chance(.7 * this.level)) this.queue = [...this.special(me, plan.shove, toward, 1), ...hold(frame(), 4)];
        // 곧게 날아오는 장풍은 앞으로 뛰어넘기도 한다.
        else if (free && grounded(me) && shot && !shot.still && !shot.g && shot.h < 100 && Math.abs(shot.x - me.x) > 130 && this.chance(.15 + .4 * this.level)) this.queue = [...hold(frame(toward, -1), 4), ...hold(frame(), 20), frame(0, 0, 'k'), ...hold(frame(), 14)];
        else {
          // 위아래 읽기도 단계만큼만 맞힌다. 틀리면 반대로 막다가 맞는다.
          const low = shot ? shot.data.guard === 'low' : om.guard === 'low' || puddle;
          this.guard = 26; this.guardLow = this.chance(.5 + .5 * this.level) ? low : !low;
        }
      }
    }
    if (!threat) this.seenAttack = null;
    if (this.guard > 0 && (free || me.state === 'block')) {
      this.guard--;
      if (threat && me.state === 'block') this.guard = Math.max(this.guard, 8);
      if (!threat && this.guard < 14) this.guard = 0;
      return frame(-toward, this.guardLow ? 1 : 0);
    }

    // 상대가 가까이에서 경직에 걸렸으면(채찍에 끌려왔을 때 등) 쉬지 않고 주먹 연타로 잇는다. 이것도 한 번만 정한다.
    const open = opp.state === 'hit' && dist < 150;
    if (open && !this.seenHit && free && !this.queue.some(input => input.x || input.y || input.p || input.k) && this.chance(.1 + .7 * this.level)) this.queue = this.jabs(me);
    this.seenHit = open;

    if (this.queue.length) return this.queue.shift();
    if (!free || !grounded(me)) return frame();

    // 대공: 뛰어 들어오는 상대를 대공기로 받는다.
    if (plan.anti && opp.state === 'jump' && opp.vy > 0 && dist < 190 && this.chance(.14 * this.level)) {
      this.queue = [...this.special(me, plan.anti, toward, 1), ...hold(frame(), 8)];
      return this.queue.shift();
    }
    // 잡으러 오는 상대는 뛰어서 피한다.
    if (om?.grab && opp.t <= om.startup && dist < om.grab.range + 40 && this.chance(.35 * this.level)) {
      this.queue = [...hold(frame(-toward, -1), 4), ...hold(frame(), 24)];
      return this.queue.shift();
    }

    // 한 번 움직인 뒤 쉬는 시간. 쉬운 단계는 1초 넘게 틈을 준다.
    const slack = 1 - this.level;
    const pause = hold(frame(), 14 + 50 * slack * slack + this.random() * (8 + 12 * slack));
    if (me.meter >= 100 && dist < plan.superAt && this.chance(.15 + .5 * this.level)) {
      this.queue = [...(this.chance(.5) ? [frame(0, 0, 'pk'), frame()] : motion('236236', 'p', toward)), ...pause];
      return this.queue.shift();
    }
    // 앞에 깔린 기름 웅덩이는 밟지 않고 뛰어넘는다.
    const trap = sim.shots.find(s => s.owner !== side && s.kind === 'puddle' && (s.x - me.x) * toward > 0 && Math.abs(s.x - me.x) < s.w / 2 + 110);
    // 서로 멀리서 견제만 하느라 한동안 아무도 안 맞았으면 걸어 들어가서 승부를 낸다.
    // 주먹이 닿는 거리부터가 근접이다(리치가 캐릭터마다 다르다).
    const jab = me.char.moves.jab, closeAt = jab.box[0] + jab.box[2] + 26;
    const total = me.hp + opp.hp;
    if (total !== this.lastTotal) { this.lastTotal = total; this.quiet = sim.frame; }
    const stalled = dist > 170 && sim.frame - this.quiet > 200;
    // 쉬운 단계는 가끔 멍하니 서 있거나 물러선다.
    const dither = this.chance(.36 - .6 * this.level);
    let action = trap && this.chance(.4 + .5 * this.level) ? 'jump'
      : stalled ? (this.chance(.75) ? 'walk' : 'jump')
      : dither ? (this.chance(.6) ? 'wait' : 'back')
      : this.pick(dist > 400 ? plan.far : dist > closeAt ? plan.mid : plan.close, dist, sim, me);
    // 장풍을 받아 마시는 상대에게는 장풍 대신 걸어 들어간다.
    // 쉬운 단계는 주먹에서 필살기로 잇는 연속기를 잘 못 쓴다.
    if (action[0] === '+' && !this.chance(.15 + 1.5 * this.level)) action = 'jabs';
    if (opp.char.absorb && '@+'.includes(action[0]) && me.char.moves[action.slice(1)].spawn?.speed && this.chance(.7)) action = dist > closeAt ? 'walk' : 'jabs';
    const press = (buttons, x = 0, y = 0) => [frame(x, y, buttons), frame(x, y)];
    switch (action) {
      case 'walk': this.queue = hold(frame(toward), dist > 400 ? 22 : 12); break;
      case 'back': this.queue = hold(frame(-toward), 16); break;
      case 'wait': this.queue = hold(frame(), dither ? 26 : 14); break;
      case 'jump': this.queue = [...hold(frame(toward, -1), 4), ...hold(frame(), 20), frame(0, 0, 'k'), ...hold(frame(), 14)]; break;
      case 'dive': this.queue = [...hold(frame(toward, -1), 4), ...hold(frame(), Math.max(8, Math.min(22, (dist - 140) / 6.2))), ...press('k', 0, 1), ...hold(frame(), 18)]; break;
      case 'jabs': this.queue = [...this.jabs(me), ...pause]; break;
      case 'kick': this.queue = [...press('k'), ...pause]; break;
      case 'low': this.queue = [...press('k', 0, 1), ...pause]; break;
      case 'throw': this.queue = [...press('p', toward), ...pause]; break;
      default: {
        const key = action.slice(1), m = me.char.moves[key];
        if (action[0] === '+') this.queue = [...press('p'), ...hold(frame(), 6), ...press('p'), ...this.special(me, key, toward, 1), ...pause];
        else if (plan.follow?.includes(key)) this.queue = [...this.special(me, key, toward), ...hold(frame(), m.startup + m.active + m.recovery - 3), ...this.jabs(me), ...pause];
        else this.queue = [...this.special(me, key, toward), ...pause];
      }
    }
    return this.queue.shift();
  }
}
