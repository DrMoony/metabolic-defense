// 격투 판정. 화면·소리와 분리된 순수 계산이라 그림 방식(2D·2.5D)이 바뀌어도 그대로 쓴다.
import { MOVES, STAGE, advantage } from './data.js';

const GRAVITY = 1.05, HALF = 34, BUFFER = 8, JUGGLE_MAX = 3;
const NEUTRAL_STATES = ['idle', 'walk', 'crouch'];
export const grounded = f => f.y >= 0 && f.vy >= 0;

function createFighter(char, side) {
  return {
    char, side, x: side ? 860 : 420, y: 0, vx: 0, vy: 0, kb: 0, facing: side ? -1 : 1,
    hp: char.hp, meter: 0, potion: false, state: 'idle', t: 0, stun: 0,
    move: null, moveKey: '', strong: false, connected: false, hasHit: false, lastHit: -99, chainCount: 0, airActed: false,
    combo: 0, comboShown: 0, juggle: 0, invuln: 0, throwInvuln: 0, flash: 0, blockLow: false, jumpDir: 0, isKo: false,
    buf: { p: 0, k: 0, s: 0 }, hist: [], in: { x: 0, y: 0 },
  };
}

const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

export class Sim {
  constructor(charA, charB, { seconds = 45 } = {}) {
    this.f = [createFighter(charA, 0), createFighter(charB, 1)];
    this.adv = [advantage(charA, charB), advantage(charB, charA)];
    this.shots = []; this.events = [];
    this.frame = 0; this.hitstop = 0; this.freeze = 0; this.timer = seconds * 60;
    this.live = false; this.over = null; this.overFrames = 0;
  }

  step(inputs) {
    this.events.length = 0; this.frame++;
    this.f.forEach((f, i) => this.buffer(f, inputs[i]));
    if (this.hitstop > 0) { this.hitstop--; return; }
    if (this.freeze > 0) { this.freeze--; return; }
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
    if (inp.pp) f.buf.p = BUFFER; if (inp.pk) f.buf.k = BUFFER;
    // 필살기 버튼은 누른 순간의 방향도 같이 기억한다(히트스톱 중에 ↓+필살기를 눌러도 대공기가 나가게).
    if (inp.ps) { f.buf.s = BUFFER; f.buf.down = inp.y > 0; f.buf.forward = inp.x * f.facing > 0; }
    f.hist.push(5 + inp.x * f.facing + (inp.y < 0 ? 3 : inp.y > 0 ? -3 : 0));
    if (f.hist.length > 40) f.hist.shift();
    f.in = inp;
  }
  // 숫자패드 표기 커맨드(236=↓↘→)가 최근 window 프레임 안에 순서대로 들어왔는지.
  motion(f, sequence, window = 16) {
    let index = sequence.length - 1;
    for (let i = f.hist.length - 1; i >= Math.max(0, f.hist.length - window); i--) {
      if (f.hist[i] === sequence[index] && --index < 0) return true;
    }
    return false;
  }
  canShoot(f) { return this.shots.filter(shot => shot.owner === f.side).length < (f.char.shot.max || 1); }
  throwable(f, o) {
    return grounded(o) && [...NEUTRAL_STATES, 'attack'].includes(o.state) && o.throwInvuln <= 0 && o.invuln <= 0 && Math.abs(o.x - f.x) < MOVES.throw.range;
  }

  start(f, key, strong = false) {
    const move = MOVES[key];
    Object.assign(f, { state: 'attack', move, moveKey: key, t: 0, strong, connected: false, hasHit: false, lastHit: -99 });
    if (grounded(f)) f.vx = 0;
    if (move.special) f.meter = Math.min(100, f.meter + 3);
    if (strong) f.hist.length = 0;
    if (move.invuln) f.invuln = move.invuln;
    if (move.isSuper) { f.meter = 0; this.freeze = 34; this.events.push({ type: 'super', side: f.side, x: f.x, y: f.y - 120 }); }
    return true;
  }

  // 방향+필살기 버튼(쉬운 입력) 또는 커맨드+주먹·킥(강한 버전).
  trySpecial(f, fx, down) {
    const b = f.buf;
    if (b.p && b.k && f.meter >= 100) { b.p = b.k = 0; return this.start(f, 'super'); }
    if (b.s) {
      b.s = 0;
      if (down || b.down) return this.start(f, 'uppercut');
      if (fx > 0 || b.forward) return this.start(f, 'dash');
      return this.canShoot(f) ? this.start(f, 'fireball') : false;
    }
    if (b.p && this.motion(f, [6, 2, 3])) { b.p = 0; return this.start(f, 'uppercut', true); }
    if (b.p && this.motion(f, [2, 3, 6]) && this.canShoot(f)) { b.p = 0; return this.start(f, 'fireball', true); }
    if (b.k && this.motion(f, [2, 1, 4])) { b.k = 0; return this.start(f, 'dash', true); }
    return false;
  }
  tryAttack(f, o, fx, down) {
    if (this.trySpecial(f, fx, down)) return true;
    const b = f.buf;
    if (b.p) {
      b.p = 0; f.chainCount = 0;
      if (fx !== 0 && !down && this.throwable(f, o)) return this.start(f, 'throw');
      return this.start(f, down ? 'cjab' : 'jab');
    }
    if (b.k) { b.k = 0; f.chainCount = 0; return this.start(f, down ? 'sweep' : 'kick'); }
    return false;
  }

  recover(f, o, state = f.in.y > 0 ? 'crouch' : 'idle') {
    f.state = state; f.move = null; f.throwInvuln = 9; f.juggle = 0; o.combo = 0;
  }

  control(f, o) {
    const inp = f.in;
    for (const key of 'pks') if (f.buf[key] > 0) f.buf[key]--;
    if (f.invuln > 0) f.invuln--; if (f.throwInvuln > 0) f.throwInvuln--;
    switch (f.state) {
      case 'idle': case 'walk': case 'crouch': {
        f.facing = o.x >= f.x ? 1 : -1;
        const fx = inp.x * f.facing, down = inp.y > 0;
        if (this.tryAttack(f, o, fx, down)) break;
        if (inp.y < 0) { f.state = 'prejump'; f.t = 0; f.jumpDir = inp.x; f.vx = 0; }
        else if (down) { f.state = 'crouch'; f.vx = 0; }
        else if (fx) { f.state = 'walk'; f.vx = inp.x * f.char.walk * (fx > 0 ? 1 : .78); }
        else { f.state = 'idle'; f.vx = 0; }
        break;
      }
      case 'prejump':
        if (++f.t >= 3) { f.state = 'jump'; f.vy = -f.char.jump; f.vx = f.jumpDir * f.char.air; f.airActed = false; this.events.push({ type: 'jump', x: f.x, y: 0 }); }
        break;
      case 'jump':
        if (f.airActed) break;
        if (f.buf.s && f.char.airShot && this.canShoot(f)) { f.buf.s = 0; f.airActed = true; this.start(f, 'airshot'); }
        else if (f.buf.p) { f.buf.p = 0; f.airActed = true; this.start(f, 'jpunch'); }
        else if (f.buf.k) { f.buf.k = 0; f.airActed = true; this.start(f, 'jkick'); }
        break;
      case 'attack': this.attackTick(f, o); break;
      case 'hit': case 'block': if (--f.stun <= 0) this.recover(f, o); break;
      case 'down': if (++f.t >= 34 && !f.isKo) { f.state = 'getup'; f.t = 0; f.invuln = 18; } break;
      case 'getup': if (++f.t >= 16) this.recover(f, o, 'idle'); break;
    }
  }

  attackTick(f, o) {
    const m = f.move, t = ++f.t, hitStart = m.startup, hitEnd = m.startup + m.active, total = hitEnd + m.recovery;
    const onGround = grounded(f), fx = f.in.x * f.facing, down = f.in.y > 0;
    if (onGround) {
      if (m.move) f.vx = t > hitStart && t <= hitEnd ? f.facing * m.move : t <= hitStart ? f.facing * m.move * .25 : 0;
      else f.vx = m.step && t <= hitStart ? f.facing * m.step : 0;
    }
    if (m.rise && t === hitStart) { f.vx = f.facing * m.rise[0]; f.vy = m.rise[1]; }
    if (m.spawn && t === hitStart) this.spawnShot(f);
    if (m.isThrow && t === hitStart + 1) this.tryThrow(f, o);
    if (t === hitStart && m.box) this.events.push({ type: 'swing', heavy: !!m.heavy, x: f.x, y: f.y - 120 });
    // 맞히거나 막힌 뒤에만 다음 기술로 이어진다(연속기·캔슬).
    if (f.connected && !m.isSuper && onGround) {
      if (m.cancel && this.trySpecial(f, fx, down)) return;
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
      else if (onGround) { f.state = down ? 'crouch' : 'idle'; f.move = null; f.chainCount = 0; }
    }
  }

  spawnShot(f) {
    const spec = f.char.shot, power = f.strong ? 1.25 : 1;
    this.shots.push({
      owner: f.side, x: f.x + f.facing * 62, y: f.y - 108, vx: f.facing * spec.speed * (f.strong ? 1.3 : 1), w: spec.w, h: spec.h, color: f.char.color, age: 0,
      data: { dmg: spec.dmg * power, hitstun: 17, blockstun: 12, push: 8, guard: 'mid', special: true },
    });
    this.events.push({ type: 'fire', x: f.x + f.facing * 62, y: f.y - 108 });
  }

  tryThrow(f, o) {
    if (!this.throwable(f, o)) return;
    f.connected = true; f.combo = 0;
    o.hp = Math.max(0, o.hp - MOVES.throw.dmg * f.char.dmg * this.adv[f.side]);
    Object.assign(o, { state: 'air', move: null, vx: f.facing * 7, vy: -11, y: -1, kb: 0, juggle: JUGGLE_MAX, flash: 6 });
    if (o.hp <= 0) o.isKo = true;
    this.hitstop = o.isKo ? 22 : 12;
    this.events.push({ type: 'hit', heavy: true, ko: o.isKo, x: (f.x + o.x) / 2, y: -130 });
  }

  physics(f) {
    if (!grounded(f)) {
      f.vy += GRAVITY * (f.state === 'air' ? 1 + .12 * f.juggle : 1);
      f.y += f.vy; f.x += f.vx;
      if (f.y >= 0 && f.vy > 0) { f.y = 0; f.vy = 0; this.land(f); }
    } else {
      f.x += f.vx + f.kb;
      f.kb = Math.abs(f.kb) < .3 ? 0 : f.kb * .8;
    }
    f.x = Math.max(STAGE.left, Math.min(STAGE.right, f.x));
  }
  land(f) {
    f.vx = 0;
    if (f.state === 'air') { f.state = 'down'; f.t = 0; this.events.push({ type: 'land', heavy: true, x: f.x, y: 0 }); }
    else if (f.state === 'jump') { f.state = 'idle'; this.events.push({ type: 'land', x: f.x, y: 0 }); }
    else if (f.state === 'attack') {
      const m = f.move;
      if (m.air) { f.state = 'idle'; f.move = null; }
      else if (m.rise) f.t = m.startup + m.active + m.recovery - m.landRecovery;
    }
  }

  // 서로 겹치지 않게 밀어낸다. 벽에 붙은 쪽은 안 밀리고 상대가 그만큼 더 밀린다.
  separate() {
    const [a, b] = this.f;
    if (a.state === 'air' || b.state === 'air' || a.y < -90 || b.y < -90) return;
    const gap = b.x - a.x, need = HALF * 2 - 6;
    if (Math.abs(gap) >= need) return;
    const dir = gap > 0 ? 1 : gap < 0 ? -1 : -a.facing, shift = (need - Math.abs(gap)) / 2;
    a.x -= dir * shift; b.x += dir * shift;
    for (const [one, other] of [[a, b], [b, a]]) {
      const clamped = Math.max(STAGE.left, Math.min(STAGE.right, one.x));
      if (clamped !== one.x) { other.x += clamped - one.x; one.x = clamped; }
    }
  }

  moveShots() {
    for (const shot of this.shots) { shot.x += shot.vx; shot.age++; if (shot.x < -60 || shot.x > STAGE.w + 60) shot.dead = true; }
    // 마주 날아온 장풍끼리는 서로 지운다.
    for (const one of this.shots) for (const other of this.shots) {
      if (one.owner < other.owner && !one.dead && !other.dead && overlap(this.shotBox(one), this.shotBox(other))) {
        one.dead = other.dead = true;
        this.events.push({ type: 'clash', x: (one.x + other.x) / 2, y: one.y });
      }
    }
    this.shots = this.shots.filter(shot => !shot.dead);
  }
  shotBox(shot) { return { x: shot.x - shot.w / 2, y: shot.y - shot.h / 2, w: shot.w, h: shot.h }; }
  hitBox(f) { const [bx, by, bw, bh] = f.move.box; return { x: f.facing > 0 ? f.x + bx : f.x - bx - bw, y: f.y + by, w: bw, h: bh }; }
  hurtBox(f) {
    const low = f.state === 'crouch' || (f.state === 'attack' && f.move.crouch) || (f.state === 'block' && f.blockLow);
    const height = f.state === 'down' ? 50 : low ? 125 : grounded(f) ? 200 : 170;
    return { x: f.x - HALF, y: f.y - height, w: HALF * 2, h: height };
  }

  resolveHits() {
    // 양쪽 판정을 먼저 모은 뒤 한꺼번에 적용해야 서로 동시에 맞는 상황(상쇄)이 나온다.
    const hits = [];
    this.f.forEach((f, i) => {
      const m = f.move, d = this.f[1 - i];
      if (f.state !== 'attack' || !m.box) return;
      const active = f.t > m.startup && f.t <= m.startup + m.active;
      const ready = m.rehit ? this.frame - f.lastHit >= m.rehit : !f.hasHit;
      if (!active || !ready) return;
      const box = this.hitBox(f), hurt = this.hurtBox(d);
      if (overlap(box, hurt)) hits.push({ att: f, def: d, src: m, dir: f.facing, x: Math.max(box.x, hurt.x) / 2 + Math.min(box.x + box.w, hurt.x + hurt.w) / 2, y: Math.max(box.y, hurt.y) / 2 + Math.min(box.y + box.h, hurt.y + hurt.h) / 2 });
    });
    for (const shot of this.shots) {
      const d = this.f[1 - shot.owner];
      if (overlap(this.shotBox(shot), this.hurtBox(d))) hits.push({ att: this.f[shot.owner], def: d, src: shot.data, dir: Math.sign(shot.vx), shot, x: shot.x, y: shot.y });
    }
    for (const hit of hits) {
      if (!this.applyHit(hit)) continue;
      if (hit.shot) hit.shot.dead = true;
      else Object.assign(hit.att, { hasHit: true, connected: true, lastHit: this.frame });
    }
    this.shots = this.shots.filter(shot => !shot.dead);
  }

  applyHit({ att, def, src, dir, shot, x, y }) {
    if (def.invuln > 0 || def.isKo || ['down', 'getup'].includes(def.state)) return false;
    if (def.state === 'air' && def.juggle >= JUGGLE_MAX && !src.isSuper) return false;
    const base = src.dmg * (!shot && att.strong ? 1.15 : 1), onGround = grounded(def);
    const back = def.in.x * def.facing < 0, low = def.in.y > 0;
    const guardOk = src.guard === 'low' ? low : src.guard === 'over' ? !low : true;
    if (onGround && [...NEUTRAL_STATES, 'block'].includes(def.state) && back && guardOk) {
      const chip = src.special && !def.char.noChip ? Math.ceil(base * .15) : 0;
      def.hp = Math.max(1, def.hp - chip);
      Object.assign(def, { state: 'block', stun: src.blockstun, blockLow: low, vx: 0, kb: dir * src.push });
      att.meter = Math.min(100, att.meter + 2);
      def.meter = Math.min(100, def.meter + (shot && def.char.absorb ? 14 : 3));
      this.pushBackAttacker(att, def, dir, src, shot);
      this.hitstop = 6;
      this.events.push({ type: 'block', x, y });
      return true;
    }
    const counter = def.state === 'attack';
    att.combo = ['hit', 'air'].includes(def.state) ? att.combo + 1 : 1;
    att.comboShown = 70;
    const scale = Math.max(.4, 1 - .1 * (att.combo - 1));
    const dmg = base * att.char.dmg * this.adv[att.side] * scale * (counter ? 1.15 : 1);
    def.hp = Math.max(0, def.hp - dmg);
    if (!src.isSuper) att.meter = Math.min(100, att.meter + dmg * .07);
    def.meter = Math.min(100, def.meter + dmg * .04);
    const wasAir = !onGround || def.state === 'air';
    if (def.state === 'air') def.juggle++;
    let launch = src.launch;
    if (src.isSuper && att.t > src.startup + src.active - src.rehit) launch = src.finalLaunch;
    if (def.hp <= 0) { def.isKo = true; launch = [9, -15]; }
    def.move = null; def.flash = 6;
    if (launch || wasAir || src.knockdown) {
      const [lx, ly] = launch || (wasAir ? [4, -9] : [5, -8]);
      Object.assign(def, { state: 'air', vx: dir * lx, vy: ly, y: Math.min(def.y, -1), kb: 0 });
    } else {
      Object.assign(def, { state: 'hit', stun: src.hitstun + (counter ? 3 : 0), vx: 0, kb: dir * src.push * 1.2 });
    }
    this.pushBackAttacker(att, def, dir, src, shot);
    const heavy = !!(src.heavy || src.special) && !src.isSuper;
    this.hitstop = def.isKo ? 22 : src.isSuper ? 5 : heavy ? 11 : 8;
    this.events.push({ type: 'hit', heavy, counter, ko: def.isKo, combo: att.combo, side: att.side, x, y });
    return true;
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
    if (f.char.regen && !['hit', 'air', 'down'].includes(f.state)) f.hp = Math.min(f.char.hp, f.hp + f.char.regen);
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
