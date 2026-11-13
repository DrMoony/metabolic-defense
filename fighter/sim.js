// 격투 판정. 화면·소리와 분리된 순수 계산이라 그림 방식(2D·2.5D)이 바뀌어도 그대로 쓴다.
import { STAGE, REACH, PACE, advantage } from './data.js';

// hop: 점프 높이 배율, tuck: 그냥 뛴 몸의 맞는 범위 [발밑에서 빈 높이, 머리 높이] (2026-11-13 무니 "점프로 피하기 어려워").
export const JUMP = { hop: 1.06, tuck: [42, 158], wind: 2 };   // wind: 뛰기 전 웅크리는 프레임
const GRAVITY = 1.05, HALF = 34, BUFFER = 10, EARLY = 6, JUGGLE_MAX = 3;
const NEUTRAL_STATES = ['idle', 'walk', 'crouch'];
export const grounded = f => f.y >= 0 && f.vy >= 0;
const clampX = x => Math.max(STAGE.left, Math.min(STAGE.right, x));

// 숫자패드 표기 커맨드(바라보는 쪽 기준, 6=앞). 키보드로도 되게 대각선은 없어도 인정한다.
// window는 넉넉하게 잡는다(키보드로 또박또박 눌러도 나오게). 모두가 쓰는 건 ↓→(236)·↓←(214) 둘뿐이고,
// 나머지는 캐릭터마다 하나씩 갖는 고유 커맨드다: 방향 두 번(→→ ←← ↓↓)이나 방향 뒤집기(←→ →←).
const FWD = [6, 3], BACK = [4, 1], DOWN = [1, 2, 3], NOT_DOWN = [4, 5, 6, 7, 8, 9];
export const MOTIONS = {
  '236236': { seq: [[2], FWD, [2], FWD], window: 56 },
  '236':    { seq: [[2], FWD], window: 26 },
  '214':    { seq: [[2], BACK], window: 26 },
  '22':     { seq: [DOWN, NOT_DOWN, DOWN], window: 28 },
  '66':     { seq: [[6], [4, 5, 7, 8, 9], [6]], window: 24 },
  '44':     { seq: [[4], [5, 6, 7, 8, 9], [4]], window: 24 },
  '46':     { seq: [[4], [6]], window: 18 },
  '64':     { seq: [[6], [4]], window: 18 },
};

function createFighter(char, side) {
  return {
    char, side, x: side ? 860 : 420, y: 0, vx: 0, vy: 0, kb: 0, facing: side ? -1 : 1,
    hp: char.hp, meter: 0, potion: false, state: 'idle', t: 0, stun: 0,
    move: null, moveKey: '', connected: false, hasHit: false, lastHit: -99, chainCount: 0, airActed: false, early: 0, earlyBy: '',
    armor: false, armorLeft: 0, grab: null,
    // 상태 이상(남은 프레임): pump 힘 올리기, drunk 취함(좌우 뒤바뀜), poison 중독(체력이 조금씩 빠짐), slow 느려짐.
    status: { pump: 0, drunk: 0, poison: 0, slow: 0 },
    combo: 0, comboShown: 0, juggle: 0, invuln: 0, throwInvuln: 0, flash: 0, blockLow: false, jumpDir: 0, isKo: false,
    buf: { p: 0, k: 0 }, hist: [], in: { x: 0, y: 0 },
  };
}

const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const within = (range, t) => !!range && t >= range[0] && t <= range[1];

export class Sim {
  constructor(charA, charB, { seconds = 45 } = {}) {
    this.f = [createFighter(charA, 0), createFighter(charB, 1)];
    this.adv = [advantage(charA, charB), advantage(charB, charA)];
    this.shots = []; this.events = [];
    this.frame = 0; this.tick = 0; this.hitstop = 0; this.freeze = 0; this.timer = seconds * 60;
    this.live = false; this.over = null; this.overFrames = 0;
  }

  step(inputs) {
    this.events.length = 0; this.frame++;
    this.f.forEach((f, i) => this.buffer(f, inputs[i]));
    if (this.hitstop > 0) { this.hitstop--; return; }
    if (this.freeze > 0) { this.freeze--; return; }
    this.tick++;
    this.f.forEach((f, i) => this.control(f, this.f[1 - i]));
    this.f.forEach(f => this.physics(f));
    this.separate();
    this.moveShots();
    this.resolveHits();
    this.f.forEach(f => this.upkeep(f));
    if (this.over) this.overFrames++;
    else if (this.live) this.judge();
  }

  // 입력 버퍼: 경직·히트스톱 중에 누른 버튼도 몇 프레임 기억해 다음 동작으로 이어 준다.
  buffer(f, inp) {
    // 취하면 스틱 좌우가 뒤바뀐다(커맨드도 거꾸로 넣어야 나간다).
    if (f.status.drunk > 0 && inp.x) inp = { ...inp, x: -inp.x };
    if (inp.pp) f.buf.p = BUFFER; if (inp.pk) f.buf.k = BUFFER;
    f.hist.push(5 + inp.x * f.facing + (inp.y < 0 ? 3 : inp.y > 0 ? -3 : 0));
    if (f.hist.length > 40) f.hist.shift();
    f.in = inp;
  }
  // 커맨드가 최근 window 프레임 안에 순서대로 들어왔는지. 들어왔으면 점수를, 아니면 -1을 돌려준다.
  // 점수는 늦게 시작한 커맨드일수록 크다(여러 커맨드가 겹쳐 보일 때 방금 넣은 쪽을 고르려고).
  motion(f, name) {
    const { seq, window } = MOTIONS[name], hist = f.hist;
    let index = seq.length - 1, last = -1;
    for (let i = hist.length - 1; i >= Math.max(0, hist.length - window); i--) {
      if (!seq[index].includes(hist[i])) continue;
      if (last < 0) last = i;
      if (--index < 0) return i * 64 + last;
    }
    return -1;
  }
  // 눌린 버튼(buttons)으로 낼 수 있는 필살기 가운데 커맨드 점수가 가장 높은 것.
  pickCommand(f, buttons) {
    let best = null, top = -1;
    for (const cmd of f.char.cmds) {
      const [name, button, key] = cmd, spawn = f.char.moves[key].spawn;
      if (!buttons.includes(button) || (spawn && !this.canShoot(f, spawn))) continue;
      const score = this.motion(f, name);
      // 점수가 같으면 뒤에 적힌 공통 커맨드(↓→, ↓←)를 고른다. ↓ 뒤에 대각선을 거쳐 일찍 누른 ↓→가 ↓↓로 읽히지 않게.
      if (score >= 0 && score >= top) { top = score; best = cmd; }
    }
    return best;
  }
  canShoot(f, spawn) { return this.shots.filter(shot => shot.owner === f.side && shot.kind === spawn.kind).length < (spawn.max || 1); }
  // air: 뛰어오른 상대도 머리 높이(220)까지는 붙잡는다(근육 파워 밤).
  grabbable(f, o, range, air = false) {
    const reach = grounded(o) ? [...NEUTRAL_STATES, 'attack'].includes(o.state) : air && o.y > -220 && ['jump', 'attack'].includes(o.state);
    return reach && o.throwInvuln <= 0 && o.invuln <= 0 && !o.isKo && Math.abs(o.x - f.x) < range;
  }

  start(f, key) {
    const move = f.char.moves[key];
    Object.assign(f, { state: 'attack', move, moveKey: key, t: 0, connected: false, hasHit: false, lastHit: -99, armor: false, armorLeft: move.armor ? move.armorHits || 1 : 0, grab: null, early: 0 });
    if (grounded(f)) f.vx = 0;
    if (move.special) {
      f.hist.length = 0;
      if (!move.noMeter && !move.isSuper) f.meter = Math.min(100, f.meter + 3);
    }
    if (move.invuln) f.invuln = move.invuln;
    if (move.isSuper) { f.meter = 0; this.freeze = 34; this.events.push({ type: 'super', side: f.side, key, char: f.char.id, x: f.x, y: f.y - 120 }); }
    else if (move.special) this.events.push({ type: 'special', side: f.side, key, char: f.char.id, x: f.x, y: f.y - 120 });
    return true;
  }

  // 필살기: 방향 커맨드 뒤에 주먹이나 킥(같은 커맨드라도 버튼에 따라 다른 기술). 초필살기는 게이지가 가득 찼을 때 주먹+킥, 또는 ↓→↓→+주먹.
  tryCommand(f) {
    const b = f.buf;
    if (b.p && f.meter >= 100 && (b.k || this.motion(f, '236236') >= 0)) { b.p = b.k = 0; return this.start(f, 'super'); }
    const cmd = this.pickCommand(f, (b.p ? 'p' : '') + (b.k ? 'k' : ''));
    if (!cmd) return false;
    b[cmd[1]] = 0;
    return this.start(f, cmd[2]);
  }
  // 버튼이 방향보다 조금 일러서 기본기가 먼저 나갔을 때: 나온 지 EARLY 프레임 안에 커맨드가 마저 들어오면 필살기로 바꿔 준다.
  // 주먹과 킥을 살짝 어긋나게 눌러도 초필살기가 나온다.
  tryLate(f) {
    const by = f.earlyBy, other = by === 'p' ? 'k' : 'p';
    if (f.meter >= 100 && (f.buf[other] || (by === 'p' && this.motion(f, '236236') >= 0))) { f.buf.p = f.buf.k = 0; return this.start(f, 'super'); }
    const cmd = this.pickCommand(f, by);
    return cmd ? this.start(f, cmd[2]) : false;
  }
  tryAttack(f, o, fx, down) {
    if (this.tryCommand(f)) return true;
    const b = f.buf, by = b.p ? 'p' : b.k ? 'k' : '';
    if (!by) return false;
    b[by] = 0; f.chainCount = 0;
    if (by === 'k') this.start(f, down ? 'sweep' : 'kick');
    else if (fx !== 0 && !down && this.grabbable(f, o, f.char.moves.throw.grab.range)) this.start(f, 'throw');
    else this.start(f, down ? 'cjab' : 'jab');
    f.early = EARLY; f.earlyBy = by;
    return true;
  }

  recover(f, o, state = f.in.y > 0 ? 'crouch' : 'idle') {
    f.state = state; f.move = null; f.throwInvuln = 9; f.juggle = 0; o.combo = 0;
  }

  control(f, o) {
    const inp = f.in;
    for (const key of 'pk') if (f.buf[key] > 0) f.buf[key]--;
    if (f.invuln > 0) f.invuln--; if (f.throwInvuln > 0) f.throwInvuln--;
    if (f.state !== 'attack') f.armor = false;
    switch (f.state) {
      case 'idle': case 'walk': case 'crouch': {
        f.facing = o.x >= f.x ? 1 : -1;
        const fx = inp.x * f.facing, down = inp.y > 0;
        if (this.tryAttack(f, o, fx, down)) break;
        if (inp.y < 0) { f.state = 'prejump'; f.t = 0; f.jumpDir = inp.x; f.vx = 0; }
        else if (down) { f.state = 'crouch'; f.vx = 0; }
        else if (fx) { f.state = 'walk'; f.vx = inp.x * f.char.walk * PACE * (fx > 0 ? 1 : .78) * (f.status.slow > 0 ? .55 : 1); }
        else { f.state = 'idle'; f.vx = 0; }
        break;
      }
      case 'prejump':
        if (++f.t >= JUMP.wind) { f.state = 'jump'; f.vy = -f.char.jump * JUMP.hop; f.vx = f.jumpDir * f.char.air * (f.status.slow > 0 ? .6 : 1); f.airActed = false; this.events.push({ type: 'jump', x: f.x, y: 0 }); }
        break;
      case 'jump': {
        if (f.airActed) break;
        // 공중 전용 기술(↓+버튼). 너무 낮으면 일반 점프 공격이 나간다.
        const air = inp.y > 0 && f.y < -70 && f.char.airCmds?.find(([button, key]) => f.buf[button] && (!f.char.moves[key].spawn || this.canShoot(f, f.char.moves[key].spawn)));
        if (air) { f.buf[air[0]] = 0; f.airActed = true; f.facing = o.x >= f.x ? 1 : -1; this.start(f, air[1]); }
        else if (f.buf.p) { f.buf.p = 0; f.airActed = true; this.start(f, 'jpunch'); }
        else if (f.buf.k) { f.buf.k = 0; f.airActed = true; this.start(f, 'jkick'); }
        break;
      }
      case 'attack': this.attackTick(f, o); break;
      case 'hit': case 'block': if (--f.stun <= 0) this.recover(f, o); break;
      // 잡힌 상태: 잡은 쪽이 메칠 때까지 끌려다닌다. 잡은 쪽 동작이 끊기면 풀려난다.
      case 'held': f.t++; if (!(o.state === 'attack' && o.move.isSlam && o.grab)) this.recover(f, o, 'idle'); break;
      case 'down': if (++f.t >= 34 && !f.isKo) { f.state = 'getup'; f.t = 0; f.invuln = 18; } break;
      case 'getup': if (++f.t >= 16) this.recover(f, o, 'idle'); break;
    }
  }

  attackTick(f, o) {
    const m = f.move, t = ++f.t, hitStart = m.startup, hitEnd = m.startup + m.active, total = hitEnd + m.recovery;
    const onGround = grounded(f), down = f.in.y > 0;
    f.armor = f.armorLeft > 0 && within(m.armor, t);
    if (f.early > 0 && f.early-- && this.tryLate(f)) return;
    if (onGround) {
      if (m.move) f.vx = t > hitStart && t <= hitEnd ? f.facing * m.move : t <= hitStart ? f.facing * (m.approach ?? m.move * .25) : 0;
      else f.vx = m.step && t <= hitStart ? f.facing * m.step : 0;
    } else if (m.home) {
      // 뛰어올라 상대 머리 위로 따라간다.
      f.vx = Math.max(-m.homeMax, Math.min(m.homeMax, (o.x - f.x) / m.home));
    }
    if (m.rise && t === hitStart) { f.vx = f.facing * m.rise[0]; f.vy = m.rise[1]; }
    if (m.dive && t === hitStart) { f.vx = f.facing * m.dive[0]; f.vy = m.dive[1]; }
    if (m.spawn && t === hitStart) this.spawnShot(f, m.spawn);
    // 힘 올리기(pump): 한동안 모든 공격이 세진다.
    if (m.pump && t === hitStart) { f.status.pump = m.pump; this.events.push({ type: 'buff', side: f.side, x: f.x, y: f.y - 120, char: f.char.id }); }
    // 순간이동(warp): 연기 속으로 사라졌다가 상대 등 뒤로 나온다. 등 뒤가 벽이면 벽 앞에 선다.
    if (m.warp && t === hitStart) {
      const side = Math.sign(o.x - f.x) || f.facing, from = f.x;
      f.x = clampX(o.x + side * m.warp); f.facing = o.x >= f.x ? 1 : -1;
      this.events.push({ type: 'warp', side: f.side, from, x: f.x, y: f.y - 100, char: f.char.id });
    }
    // 회복기: 지속 프레임 동안 체력이 찬다. 맞으면 끊긴다.
    if (m.heal && t > hitStart && t <= hitEnd && this.live) {
      f.hp = Math.min(f.char.hp, f.hp + m.heal);
      if ((t - hitStart) % 8 === 1) this.events.push({ type: 'heal', side: f.side, x: f.x, y: f.y - 110, char: f.char.id });
    }
    if (m.grab && t > hitStart && t <= hitEnd && this.tryGrab(f, o)) return;
    if (m.isSlam && f.grab) {
      if (t < hitStart) this.hold(f, o); else if (t === hitStart) this.slam(f, o);
    }
    if (t === hitStart && m.box) this.events.push({ type: 'swing', heavy: !!m.heavy, x: f.x, y: f.y - 120, char: f.char.id, side: f.side });
    // 맞히거나 막힌 뒤에만 다음 기술로 이어진다(연속기·캔슬).
    if (f.connected && !m.isSuper && onGround) {
      if (m.cancel && this.tryCommand(f)) return;
      const next = m.chain;
      if (next && f.buf.p && next.p) {
        const repeatJab = f.moveKey === 'jab' && f.char.extraJab && f.chainCount === 0;
        const limit = f.moveKey === 'cjab' ? 2 : 4;
        if (f.chainCount < limit) { f.buf.p = 0; f.chainCount++; this.start(f, repeatJab ? 'jab' : next.p); return; }
      }
      if (next && f.buf.k && next.k) { f.buf.k = 0; f.chainCount++; this.start(f, next.k); return; }
    }
    if (t >= total) {
      if (m.air && !onGround) { f.state = 'jump'; f.move = null; }
      else if (onGround) { f.state = down ? 'crouch' : 'idle'; f.move = null; f.chainCount = 0; f.armor = false; f.grab = null; }
    }
  }

  spawnShot(f, spec, dir = f.facing) {
    let x = clampX(f.x + f.facing * spec.at[0]), y = f.y + spec.at[1], big = false;
    // 점화(ignite): 깔아 둔 내 웅덩이가 있으면 그 자리에서 더 큰 불기둥이 된다.
    const puddle = spec.ignite && this.shots.find(shot => shot.owner === f.side && shot.kind === 'puddle');
    if (puddle) { puddle.dead = true; spec = { ...spec, ...spec.ignite }; x = puddle.x; y = -spec.h / 2; big = true; }
    // 부채꼴(fan): 위아래로 갈라지는 여러 발을 한 번에 던진다.
    for (const vy of spec.fan || [spec.vy || 0]) {
      this.shots.push({
        owner: f.side, kind: spec.kind, x, y, vx: dir * spec.speed, vy, g: spec.g || 0, w: spec.w, h: spec.h, color: f.char.color, age: 0,
        life: spec.life || 0, hits: spec.hits || 1, power: spec.power || 1, still: !spec.speed, dir, lastHit: -99, hold: 0, big,
        data: { ...spec, special: true },
      });
    }
    this.events.push(spec.kind === 'puddle' || spec.field ? { type: 'splash', x, y: 0, kind: spec.kind } : { type: 'fire', x, y, kind: spec.kind, big, dir });
  }

  // 잡기: 가드를 무시한다. 잡으면 상대를 held로 묶고 메치기(slam) 동작으로 넘어간다.
  tryGrab(f, o) {
    const g = f.move.grab;
    if (this.over || !this.grabbable(f, o, g.range, g.air)) return false;
    this.start(f, g.slam);
    Object.assign(f, { grab: g, connected: true, combo: 0, invuln: f.move.startup + 2 });
    Object.assign(o, { state: 'held', move: null, t: 0, vx: 0, vy: 0, kb: 0, y: 0, stun: 0, armor: false, flash: 4 });
    this.hold(f, o);
    this.hitstop = 6;
    this.events.push({ type: 'grab', x: (f.x + o.x) / 2, y: -120, char: f.char.id, side: f.side, special: g.slam === 'slamBig', reel: !!g.reel, from: f.x, to: o.x });
    return true;
  }
  hold(f, o) {
    if (o.state !== 'held') return;
    f.vx = 0; o.y = 0; o.facing = -f.facing;
    const g = f.grab, at = clampX(f.x + f.facing * g.hold), left = Math.abs(at - o.x);
    // 멀리서 낚아챈 상대(reel)는 메치기 전까지 끌려온다.
    if (g.reel && left > g.reel) { o.x += Math.sign(at - o.x) * Math.max(g.reel, left / Math.max(1, f.move.startup - f.t)); return; }
    o.x = at;
    f.x = clampX(o.x - f.facing * g.hold);
  }
  slam(f, o) {
    const g = f.grab;
    if (o.state !== 'held') return;
    const dmg = this.over ? 0 : g.dmg * f.char.dmg * this.adv[f.side] * this.power(f, o);
    o.hp = Math.max(0, o.hp - dmg);
    // 감싸 조이기(heal): 빼앗은 만큼 일부를 내 체력으로 채운다. 중독 올가미(poison)는 메친 뒤에도 갉는다.
    if (g.heal && dmg) { f.hp = Math.min(f.char.hp, f.hp + dmg * g.heal); this.events.push({ type: 'heal', side: f.side, x: f.x, y: f.y - 110, char: f.char.id }); }
    this.afflict(o, g);
    if (!g.isSuper) f.meter = Math.min(100, f.meter + dmg * .07);
    o.meter = Math.min(100, o.meter + dmg * .04);
    Object.assign(o, { state: 'air', move: null, vx: f.facing * g.launch[0], vy: g.launch[1], y: -1, kb: 0, juggle: JUGGLE_MAX, flash: 6 });
    if (o.hp <= 0 && !this.over) o.isKo = true;
    this.hitstop = o.isKo ? 22 : 12;
    this.events.push({ type: 'slam', x: o.x, y: 0, char: f.char.id, big: g.slam === 'slamBig', sup: !!g.isSuper });
    this.events.push({ type: 'hit', heavy: true, ko: o.isKo, side: f.side, x: o.x, y: -60, dir: f.facing, char: f.char.id, key: 'slam', special: g.slam === 'slamBig', sup: !!g.isSuper });
  }

  physics(f) {
    if (f.state === 'held') return;
    if (!grounded(f)) {
      f.vy += GRAVITY * (f.state === 'air' ? 1 + .12 * f.juggle : 1);
      f.y += f.vy; f.x += f.vx;
      if (f.y >= 0 && f.vy > 0) { f.y = 0; f.vy = 0; this.land(f); }
    } else {
      f.x += f.vx + f.kb;
      f.kb = Math.abs(f.kb) < .3 ? 0 : f.kb * .8;
    }
    f.x = clampX(f.x);
  }
  land(f) {
    f.vx = 0;
    if (f.state === 'air') { f.state = 'down'; f.t = 0; this.events.push({ type: 'land', heavy: true, x: f.x, y: 0 }); }
    else if (f.state === 'jump') { f.state = 'idle'; this.events.push({ type: 'land', x: f.x, y: 0 }); }
    else if (f.state === 'attack') {
      const m = f.move;
      if (m.dive) f.t = m.startup + m.active;
      else if (m.air) { f.state = 'idle'; f.move = null; }
      else if (m.rise) f.t = m.startup + m.active + m.recovery - m.landRecovery;
      if (m.heavyLand) this.events.push({ type: 'land', heavy: true, x: f.x, y: 0, char: f.char.id, crater: true });
      // 떨어지며 바닥을 울리는 기술(landWave): 양쪽으로 땅울림이 퍼진다.
      if (m.landWave) for (const dir of [-1, 1]) this.spawnShot(f, { ...m.landWave, at: [dir * f.facing * 70, -m.landWave.h / 2] }, dir);
    }
  }

  // 서로 겹치지 않게 밀어낸다. 벽에 붙은 쪽은 안 밀리고 상대가 그만큼 더 밀린다.
  separate() {
    const [a, b] = this.f;
    if (a.state === 'air' || b.state === 'air' || a.y < -90 || b.y < -90) return;
    // 잡힌 동안과 상대를 지나가는 기술(pass) 중에는 밀어내지 않는다.
    if (this.f.some(f => f.state === 'held' || (f.state === 'attack' && f.move.pass))) return;
    const gap = b.x - a.x, need = HALF * 2 - 6;
    if (Math.abs(gap) >= need) return;
    const dir = gap > 0 ? 1 : gap < 0 ? -1 : -a.facing, shift = (need - Math.abs(gap)) / 2;
    a.x -= dir * shift; b.x += dir * shift;
    for (const [one, other] of [[a, b], [b, a]]) {
      const clamped = clampX(one.x);
      if (clamped !== one.x) { other.x += clamped - one.x; one.x = clamped; }
    }
  }

  moveShots() {
    this.fresh = [];
    for (const shot of this.shots) {
      shot.age++;
      // 여러 번 맞는 장풍은 맞힌 직후 잠깐 멈춰서 상대를 갈아 낸다.
      if (shot.hold > 0) shot.hold--;
      else { shot.vy += shot.g; shot.x += shot.vx; shot.y += shot.vy; }
      if (shot.life && shot.age >= shot.life) shot.dead = true;
      if (shot.g && shot.y + shot.h / 2 >= 0) {
        shot.dead = true; this.events.push({ type: 'splash', x: shot.x, y: 0, kind: shot.kind });
        // 떨어진 자리에 남는 것(leave): 지방 덩어리는 기름띠가 된다.
        const left = shot.data.leave;
        if (left) {
          for (const old of this.shots) if (old.owner === shot.owner && old.kind === left.kind) old.dead = true;
          this.fresh.push({ owner: shot.owner, kind: left.kind, x: shot.x, y: -left.h / 2, vx: 0, vy: 0, g: 0, w: left.w, h: left.h, age: 0, life: left.life, hits: 1, power: 1, still: true, dir: shot.dir, lastHit: -99, hold: 0,
            data: { kind: left.kind, field: true, slow: shot.data.slow, rehit: 20 } });
        }
      }
      if (shot.x < -60 || shot.x > STAGE.w + 60) shot.dead = true;
    }
    // 마주 날아온 장풍끼리는 서로 지운다. 센 쪽(power)이 있으면 그쪽만 남는다.
    for (const one of this.shots) for (const other of this.shots) {
      if (one.owner < other.owner && !one.dead && !other.dead && !one.still && !other.still && overlap(this.shotBox(one), this.shotBox(other))) {
        if (one.power <= other.power) one.dead = true;
        if (other.power <= one.power) other.dead = true;
        this.events.push({ type: 'clash', x: (one.x + other.x) / 2, y: (one.y + other.y) / 2 });
      }
    }
    this.shots = this.shots.filter(shot => !shot.dead).concat(this.fresh);
  }
  shotBox(shot) { return { x: shot.x - shot.w / 2, y: shot.y - shot.h / 2, w: shot.w, h: shot.h }; }
  // 앞쪽 끝을 REACH만큼 더 뻗는다. 몸 뒤까지 감싸는 상자(앞 x가 음수)는 뒤쪽 끝도 같이 늘린다.
  hitBox(f) {
    const [x0, by, w0, bh] = f.move.box, bx = x0 < 0 ? x0 * REACH : x0, bw = (x0 + w0) * REACH - bx;
    return { x: f.facing > 0 ? f.x + bx : f.x - bx - bw, y: f.y + by, w: bw, h: bh };
  }
  hurtBox(f) {
    const low = f.state === 'crouch' || (f.state === 'attack' && f.move.crouch) || (f.state === 'block' && f.blockLow);
    // 드러눕는 기술(lie): 그동안은 쓰러진 몸처럼 낮다.
    if (f.state === 'attack' && within(f.move.lie, f.t)) return { x: f.x - HALF - 20, y: f.y - 50, w: HALF * 2 + 40, h: 50 };
    // 그냥 뛰어오른 몸은 무릎을 끌어안아 발밑이 비고 키가 줄어든다(장풍·발 공격을 넘기 쉽게).
    if (f.state === 'jump') return { x: f.x - HALF, y: f.y - JUMP.tuck[1], w: HALF * 2, h: JUMP.tuck[1] - JUMP.tuck[0] };
    const height = f.state === 'down' ? 50 : low ? 125 : grounded(f) ? 200 : 170;
    return { x: f.x - HALF, y: f.y - height, w: HALF * 2, h: height };
  }

  // 반사막: 날아오는 상대 장풍을 내 것으로 바꿔 되돌려 보낸다.
  reflectShots(f) {
    const m = f.move;
    if (f.state !== 'attack' || !within(m.reflect, f.t)) return;
    const box = this.hitBox(f);
    for (const shot of this.shots) {
      if (shot.owner === f.side || shot.still || shot.power > 1 || !overlap(box, this.shotBox(shot))) continue;
      Object.assign(shot, { owner: f.side, vx: -shot.vx * 1.15, dir: -shot.dir, color: f.char.color, lastHit: -99 });
      if (shot.g) shot.vy = -9;
      f.meter = Math.min(100, f.meter + 6);
      this.events.push({ type: 'reflect', x: shot.x, y: shot.y });
    }
  }

  // 쓸어 내기(wipe): 기술 판정에 닿은 상대 장풍을 지운다.
  wipeShots(f) {
    const m = f.move;
    if (f.state !== 'attack' || !m.box || !within(m.wipe, f.t)) return;
    const box = this.hitBox(f);
    for (const shot of this.shots) {
      if (shot.owner === f.side || shot.still || shot.power > 1 || !overlap(box, this.shotBox(shot))) continue;
      shot.dead = true;
      this.events.push({ type: 'clash', x: shot.x, y: shot.y });
    }
  }

  resolveHits() {
    this.f.forEach(f => { this.reflectShots(f); this.wipeShots(f); });
    // 양쪽 판정을 먼저 모은 뒤 한꺼번에 적용해야 서로 동시에 맞는 상황(상쇄)이 나온다.
    const hits = [];
    this.f.forEach((f, i) => {
      const m = f.move, d = this.f[1 - i];
      if (f.state !== 'attack' || !m.box) return;
      const active = f.t > m.startup && f.t <= m.startup + m.active && !(m.fall && f.vy <= 0);
      const ready = m.rehit ? this.tick - f.lastHit >= m.rehit : !f.hasHit;
      if (!active || !ready) return;
      const box = this.hitBox(f), hurt = this.hurtBox(d);
      if (overlap(box, hurt)) hits.push({ att: f, def: d, src: m, dir: f.facing, x: Math.max(box.x, hurt.x) / 2 + Math.min(box.x + box.w, hurt.x + hurt.w) / 2, y: Math.max(box.y, hurt.y) / 2 + Math.min(box.y + box.h, hurt.y + hurt.h) / 2 });
    });
    for (const shot of this.shots) {
      const d = this.f[1 - shot.owner], src = shot.data;
      if (this.tick - shot.lastHit < (src.rehit || 0)) continue;
      // 바닥 웅덩이는 땅에 선 상대만 밟는다. 위빙처럼 장풍을 흘리는 동작 중에는 안 맞는다.
      if ((shot.kind === 'puddle' || shot.data.field) && !grounded(d)) continue;
      // 밟으면 상태만 거는 바닥(field): 맞는 판정 없이 느려지게 한다.
      if (shot.data.field) {
        if (overlap(this.shotBox(shot), this.hurtBox(d)) && d.invuln <= 0 && !d.isKo) { shot.lastHit = this.tick; this.afflict(d, shot.data, true); }
        continue;
      }
      if (d.state === 'attack' && within(d.move.shotInvuln, d.t)) continue;
      if (!overlap(this.shotBox(shot), this.hurtBox(d))) continue;
      const dir = shot.still ? (Math.sign(d.x - this.f[shot.owner].x) || shot.dir) : Math.sign(shot.vx) || shot.dir;
      hits.push({ att: this.f[shot.owner], def: d, src, dir, shot, x: shot.still ? d.x : shot.x, y: shot.still ? Math.min(shot.y, -20) : shot.y });
    }
    for (const hit of hits) {
      const result = this.applyHit(hit);
      if (!result) continue;
      if (hit.shot) {
        const shot = hit.shot;
        shot.lastHit = this.tick;
        if (--shot.hits <= 0) shot.dead = true; else if (!shot.still) shot.hold = hit.src.rehit || 0;
      } else Object.assign(hit.att, { hasHit: true, connected: result !== 'counter', lastHit: this.tick });
    }
    this.shots = this.shots.filter(shot => !shot.dead);
  }

  applyHit({ att, def, src, dir, shot, x, y }) {
    if (this.over || def.invuln > 0 || def.isKo || ['down', 'getup', 'held'].includes(def.state)) return false;
    if (def.state === 'air' && def.juggle >= JUGGLE_MAX && !src.isSuper) return false;
    const base = src.dmg, onGround = grounded(def);
    // 받아치기 자세: 타격을 흘리고 바로 되받아친다. 장풍은 흘려서 없애기만 하고 자세를 일찍 푼다(초필살기는 못 받는다).
    if (!src.isSuper && def.state === 'attack' && onGround && within(def.move.counter, def.t)) {
      def.flash = 4; this.hitstop = shot ? 6 : 10;
      this.events.push({ type: 'counter', x, y });
      if (shot) {
        shot.hits = 0;
        def.meter = Math.min(100, def.meter + 8);
        def.t = Math.max(def.t, def.move.startup + def.move.active + def.move.recovery - 6);
        return 'counter';
      }
      def.facing = att.x >= def.x ? 1 : -1;
      this.start(def, def.move.riposte);
      return 'counter';
    }
    const back = def.in.x * def.facing < 0, low = def.in.y > 0;
    const guardOk = src.guard === 'low' ? low : src.guard === 'over' ? !low : true;
    if (onGround && [...NEUTRAL_STATES, 'block'].includes(def.state) && back && guardOk) {
      const chip = src.special && !def.char.noChip ? Math.ceil(base * .15) : 0;
      def.hp = Math.max(1, def.hp - chip);
      Object.assign(def, { state: 'block', stun: src.blockstun, blockLow: low, vx: 0, kb: dir * src.push });
      att.meter = Math.min(100, att.meter + 2);
      def.meter = Math.min(100, def.meter + (shot && def.char.absorb ? 14 : 3));
      this.pushBackAttacker(att, def, dir, src, shot);
      this.hitstop = src.rehit ? 4 : 6;
      this.events.push({ type: 'block', x, y });
      return true;
    }
    // 아머: 버티는 동안은 피해만 조금 받고 동작이 안 끊긴다. 초필살기에는 깨진다.
    if (def.armor && def.state === 'attack' && !src.isSuper && !src.breakArmor) {
      const dmg = base * att.char.dmg * this.adv[att.side] * this.power(att, def) * .6;
      if (def.hp - dmg > 0) {
        def.hp -= dmg; def.flash = 4;
        if (--def.armorLeft <= 0) def.armor = false;
        att.meter = Math.min(100, att.meter + dmg * .07);
        this.hitstop = 7;
        this.events.push({ type: 'armor', x, y });
        return true;
      }
    }
    const counter = def.state === 'attack';
    att.combo = ['hit', 'air'].includes(def.state) ? att.combo + 1 : 1;
    att.comboShown = 70;
    const scale = Math.max(.4, 1 - .1 * (att.combo - 1));
    const dmg = base * att.char.dmg * this.adv[att.side] * this.power(att, def) * scale * (counter ? 1.15 : 1);
    def.hp = Math.max(0, def.hp - dmg);
    this.afflict(def, src);
    if (!src.isSuper) att.meter = Math.min(100, att.meter + dmg * .07);
    def.meter = Math.min(100, def.meter + dmg * .04);
    // 게이지 빼앗기(drain): 맞은 상대의 게이지를 덜어 내 것으로 만든다.
    if (src.drain) {
      const take = Math.min(def.meter, src.drain);
      def.meter -= take; att.meter = Math.min(100, att.meter + take);
      this.events.push({ type: 'drain', side: att.side, x: def.x, y, tx: att.x, amount: take });
    }
    const wasAir = !onGround || def.state === 'air';
    if (def.state === 'air') def.juggle++;
    let launch = src.launch;
    const last = shot ? shot.hits <= 1 : att.t > src.startup + src.active - src.rehit;
    if (src.finalLaunch && last) launch = src.finalLaunch;
    if (def.hp <= 0) { def.isKo = true; launch = [9, -15]; }
    def.move = null; def.flash = 6; def.armor = false;
    // 끌어당기는 기술(pull): 맞은 상대가 내 앞 pull 거리까지 딸려 온다.
    const gap = Math.abs(def.x - att.x), drag = src.pull && !def.isKo && !(src.finalLaunch && last) ? Math.max(0, Math.min(60, (gap - src.pull) / 5)) : 0;
    if (launch || wasAir || src.knockdown) {
      const [lx, ly] = launch || (wasAir ? [4, -9] : [5, -8]);
      Object.assign(def, { state: 'air', vx: drag ? -dir * drag * .35 : dir * lx, vy: ly, y: Math.min(def.y, -1), kb: 0 });
    } else {
      Object.assign(def, { state: 'hit', stun: src.hitstun + (counter ? 3 : 0), vx: 0, kb: src.pull ? -dir * drag : dir * src.push * 1.2 });
    }
    if (!src.pull) this.pushBackAttacker(att, def, dir, src, shot);
    const heavy = !!(src.heavy || src.special) && !src.isSuper;
    this.hitstop = def.isKo ? 22 : src.rehit ? 4 : heavy ? 11 : 8;
    this.events.push({ type: 'hit', heavy, counter, ko: def.isKo, combo: att.combo, side: att.side, x, y, dir, char: att.char.id, key: shot ? shot.kind : att.moveKey, special: !!(shot || src.special), sup: !!src.isSuper, last: !!(src.finalLaunch && last) });
    return true;
  }
  // 힘 올리기 중이면 세게, 몸이 두꺼운 상대(bulk)에게는 덜 들어간다.
  power(att, def) { return (att.status.pump > 0 ? 1.25 : 1) * (def.char.bulk || 1); }
  // 맞힌 기술에 붙은 상태 이상을 건다. 이미 걸려 있으면 남은 시간만 늘린다.
  afflict(def, src, quiet = false) {
    let any = false;
    for (const key of ['drunk', 'poison', 'slow']) if (src[key] && !def.isKo) { if (def.status[key] < src[key]) any = true; def.status[key] = Math.max(def.status[key], src[key]); }
    if (any && !quiet) this.events.push({ type: 'status', side: def.side, x: def.x, y: def.y - 200, kinds: ['drunk', 'poison', 'slow'].filter(key => src[key]) });
  }
  // 구석에 몰린 상대를 때리면 상대 대신 내가 밀려나야 무한 압박이 안 된다.
  pushBackAttacker(att, def, dir, src, shot) {
    const cornered = dir > 0 ? def.x >= STAGE.right - 4 : def.x <= STAGE.left + 4;
    if (!shot && cornered && grounded(att)) att.kb = -dir * src.push;
  }

  upkeep(f) {
    if (f.flash > 0) f.flash--;
    if (f.comboShown > 0) f.comboShown--;
    if (!this.live || f.isKo) {
      if (this.over && this.overFrames > 50 && this.over.winner === f.side && NEUTRAL_STATES.includes(f.state)) f.state = 'win';
      return;
    }
    if (f.char.regen && !['hit', 'air', 'down', 'held'].includes(f.state)) f.hp = Math.min(f.char.hp, f.hp + f.char.regen);
    for (const key in f.status) if (f.status[key] > 0) f.status[key]--;
    // 중독: 1초에 18씩 빠지지만 이것만으로는 쓰러지지 않는다.
    if (f.status.poison > 0) f.hp = Math.max(Math.min(f.hp, 1), f.hp - .3);
    // 퀴즈로 얻은 포션은 체력이 30% 아래로 떨어지면 자동으로 마신다.
    if (f.potion && f.hp < f.char.hp * .3) {
      f.potion = false; f.hp += f.char.hp * .3;
      this.events.push({ type: 'potion', side: f.side, x: f.x, y: f.y - 130 });
    }
  }

  judge() {
    const down = this.f.filter(f => f.isKo);
    if (down.length) this.over = { reason: 'ko', winner: down.length === 2 ? -1 : 1 - down[0].side };
    else if (--this.timer <= 0) {
      const [a, b] = this.f.map(f => f.hp / f.char.hp);
      this.over = { reason: 'time', winner: Math.abs(a - b) < .001 ? -1 : a > b ? 0 : 1 };
      this.events.push({ type: 'timeup' });
    }
    if (this.over) this.live = false;
  }
}
