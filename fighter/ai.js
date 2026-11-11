// CPU 상대. 사람과 똑같이 스틱·버튼 입력을 내놓는다. level 0(쉬움)~1(어려움).
import { grounded } from './sim.js';

const frame = (x = 0, y = 0, buttons = '') => ({ x, y, p: buttons.includes('p'), k: buttons.includes('k'), s: buttons.includes('s') });
const hold = (input, frames) => Array.from({ length: frames }, () => input);

export class CpuBrain {
  constructor(level = .5, random = Math.random) { this.level = level; this.random = random; this.queue = []; this.seenAttack = null; this.guard = 0; this.guardLow = false; }
  chance(p) { return this.random() < p; }

  think(sim, side) {
    const me = sim.f[side], opp = sim.f[1 - side], toward = opp.x >= me.x ? 1 : -1, dist = Math.abs(opp.x - me.x);
    if (!sim.live) { this.queue.length = 0; return frame(); }
    const free = ['idle', 'walk', 'crouch'].includes(me.state);

    // 방어: 상대 공격 하나마다 막을지 한 번만 정한다(매 프레임 다시 굴리면 완벽하게 막아 버린다).
    const shot = sim.shots.find(s => s.owner !== side && Math.sign(s.vx) === -toward && Math.abs(s.x - me.x) < 240);
    const attacking = opp.state === 'attack' && opp.move.box && opp.t <= opp.move.startup + opp.move.active && dist < 230;
    const threat = shot || (attacking ? opp : null);
    if (threat && threat !== this.seenAttack) {
      this.seenAttack = threat;
      if (this.chance(.2 + .65 * this.level)) { this.guard = 26; this.guardLow = attacking && opp.move.guard === 'low'; this.queue.length = 0; }
    }
    if (!threat) this.seenAttack = null;
    if (this.guard > 0 && free) { this.guard--; if (!threat && this.guard < 14) this.guard = 0; return frame(-toward, this.guardLow ? 1 : 0); }

    // 대공: 뛰어 들어오는 상대를 승룡으로 받는다.
    if (free && opp.state === 'jump' && opp.vy > 0 && dist < 190 && this.chance(.03 + .1 * this.level)) return frame(0, 1, 's');

    if (this.queue.length) return this.queue.shift();
    if (!free || !grounded(me)) return frame();

    const pause = hold(frame(), Math.round(22 - 16 * this.level + this.random() * 10));
    const roll = this.random();
    if (me.meter >= 100 && dist < 210 && this.chance(.5)) this.queue = [frame(0, 0, 'pk'), ...pause];
    else if (dist > 420) {
      if (roll < .45) this.queue = [frame(0, 0, 's'), ...hold(frame(), 30)];
      else if (roll < .6) this.queue = [...hold(frame(toward, -1), 4), ...hold(frame(), 30)];
      else this.queue = hold(frame(toward), 22);
    } else if (dist > 150) {
      if (roll < .5) this.queue = hold(frame(toward), 12);
      else if (roll < .66) this.queue = [...hold(frame(toward, -1), 4), ...hold(frame(), 20), frame(0, 0, 'k'), ...hold(frame(), 14)];
      else if (roll < .78 && dist < 320) this.queue = [frame(toward, 0, 's'), ...pause];
      else if (roll < .9) this.queue = [frame(0, 0, 's'), ...hold(frame(), 26)];
      else this.queue = hold(frame(-toward), 14);
    } else {
      const gap = hold(frame(), 8);
      if (roll < .4) this.queue = [frame(0, 0, 'p'), ...gap, frame(0, 0, 'p'), ...gap, frame(0, 0, 'p'), ...pause];
      else if (roll < .58) this.queue = [frame(0, 0, 'k'), ...hold(frame(), 10), frame(0, 0, 's'), ...pause];
      else if (roll < .72) this.queue = [frame(0, 1, 'k'), ...pause];
      else if (roll < .84) this.queue = [frame(toward, 0, 'p'), ...pause];
      else if (roll < .94) this.queue = hold(frame(-toward), 20);
      else this.queue = [...hold(frame(-toward, -1), 4), ...hold(frame(), 30)];
    }
    return this.queue.shift();
  }
}
