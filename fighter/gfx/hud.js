// 화면 위 정보: 체력, 게이지, 시간, 연속기, 큰 글자. 3D 무대 위에 겹친 2D 캔버스에 그린다.
import { STAGE, TYPES } from '../data.js';

const W = STAGE.w, H = STAGE.h, TAU = Math.PI * 2;
const FONT = '"Apple SD Gothic Neo","Malgun Gothic",Inter,sans-serif';
const INK = '#1b0a14', GOLD = '#ffe0a0', CREAM = '#fff3dd', MUTED = '#e0b789', GOOD = '#9dffb0';
const lerp = (a, b, k) => a + (b - a) * k, ease = k => 1 - (1 - k) * (1 - k);

export class Hud {
  // stage: 월드 좌표를 화면 픽셀로 바꿔 준다. portraitOf(id): 얼굴 배지에 쓸 그림(없으면 null).
  constructor(canvas, stage, portraitOf) {
    this.canvas = canvas; this.c = canvas.getContext('2d'); this.stage = stage; this.portraitOf = portraitOf;
    this.ratio = 1; this.debug = false; this.reset();
  }
  resize(ratio) { this.ratio = ratio; this.canvas.width = Math.round(W * ratio); this.canvas.height = Math.round(H * ratio); }
  reset() { this.texts = []; this.flash = 0; this.lag = [1, 1]; this.combo = [0, 0]; this.pop = [0, 0]; }
  // 시뮬 좌표(x, 바닥 기준 y) 위에 잠깐 떠오르는 글자.
  say(text, x, y, color, max = 50) { this.texts.push({ text, x, y, color, life: 0, max }); }

  // 기울어진 막대 경로. s가 1이면 위쪽이 오른쪽으로, -1이면 왼쪽으로 밀린다.
  slab(x, y, w, h, s, lean = 12, grow = 0) {
    const c = this.c, d = s * lean / 2 * (1 + grow * 2 / h);
    c.beginPath(); c.moveTo(x - grow + d, y - grow); c.lineTo(x + w + grow + d, y - grow); c.lineTo(x + w + grow - d, y + h + grow); c.lineTo(x - grow - d, y + h + grow); c.closePath();
  }
  ink(text, x, y, fill, width = 6) { const c = this.c; c.lineJoin = 'round'; c.lineWidth = width; c.strokeStyle = INK; c.strokeText(text, x, y); c.fillStyle = fill; c.fillText(text, x, y); }

  draw(sim, o = {}, dt = 1, frame = 0) {
    const c = this.c;
    c.setTransform(this.ratio, 0, 0, this.ratio, 0, 0); c.clearRect(0, 0, W, H);
    if (sim && this.debug) this.boxes(sim);
    this.floaters(dt);
    if (this.flash > 0) { c.fillStyle = `rgba(255,255,255,${Math.min(1, this.flash / 22)})`; c.fillRect(0, 0, W, H); this.flash -= dt; }
    if (o.dim) { c.fillStyle = `rgba(22,8,20,${o.dim})`; c.fillRect(0, 0, W, H); }
    if (sim && o.bars) this.bars(sim, o, dt, frame);
    if (o.banner) this.banner(o.banner);
  }

  boxes(sim) {
    const c = this.c, a = [0, 0], b = [0, 0];
    const rect = (box, color) => { this.stage.project(box.x - 640, -box.y, 0, a); this.stage.project(box.x + box.w - 640, -(box.y + box.h), 0, b); c.strokeStyle = color; c.lineWidth = 2; c.strokeRect(a[0], a[1], b[0] - a[0], b[1] - a[1]); };
    for (const f of sim.f) {
      rect(sim.hurtBox(f), '#59f');
      if (f.state === 'attack' && f.move.box && f.t > f.move.startup && f.t <= f.move.startup + f.move.active) rect(sim.hitBox(f), '#f44');
    }
    for (const shot of sim.shots) rect(sim.shotBox(shot), '#fc4');
  }

  floaters(dt) {
    const c = this.c, at = [0, 0];
    c.textAlign = 'center'; c.font = `900 26px ${FONT}`;
    for (const t of this.texts) {
      t.life += dt; this.stage.project(t.x - 640, -t.y, 40, at);
      c.globalAlpha = Math.max(0, Math.min(1, (t.max - t.life) / 14));
      const k = ease(Math.min(1, t.life / 8));
      c.save(); c.translate(at[0], at[1] - t.life * .8); c.scale(lerp(1.6, 1, k), lerp(1.6, 1, k)); this.ink(t.text, 0, 0, t.color); c.restore();
    }
    c.globalAlpha = 1;
    this.texts = this.texts.filter(t => t.life < t.max);
  }

  bars(sim, o, dt, frame) {
    const c = this.c, BW = 462, BH = 26, Y = 38;
    sim.f.forEach((f, i) => {
      const left = i === 0, s = left ? 1 : -1, x0 = left ? 112 : W - 112 - BW, ratio = Math.max(0, f.hp / f.char.hp), low = ratio < .3;
      this.lag[i] = this.lag[i] < ratio ? ratio : Math.max(ratio, this.lag[i] - .004 * dt);
      // 체력 막대. 남은 체력은 화면 가운데 쪽에 붙어 있고 바깥쪽부터 비어 간다.
      this.slab(x0, Y, BW, BH, s, 12, 5); c.fillStyle = '#1b0a14e6'; c.fill(); c.lineWidth = 2; c.strokeStyle = GOLD; c.stroke();
      this.slab(x0, Y, BW, BH, s); const back = c.createLinearGradient(0, Y, 0, Y + BH); back.addColorStop(0, '#2a1024'); back.addColorStop(1, '#4b1f3a'); c.fillStyle = back; c.fill();
      const part = (value, fill) => { const w = BW * value; if (w < 1) return; this.slab(left ? x0 + BW - w : x0, Y, w, BH, s); c.fillStyle = fill; c.fill(); };
      part(this.lag[i], '#e5484d');
      const fill = c.createLinearGradient(0, Y, 0, Y + BH);
      fill.addColorStop(0, low ? '#ffb347' : '#fff0a8'); fill.addColorStop(1, low ? '#e2622b' : '#f1b836');
      part(ratio, fill);
      c.save(); this.slab(x0, Y, BW, BH, s); c.clip();
      c.fillStyle = '#ffffff3d'; c.fillRect(x0 - 20, Y + 3, BW + 40, 6);
      c.fillStyle = '#1b0a1455'; for (let n = 1; n < 4; n++) c.fillRect(x0 + BW * n / 4 - 1, Y, 2, BH);
      c.restore();

      // 얼굴 배지.
      const bx = left ? 58 : W - 58, by = 60, r = 42, face = this.portraitOf?.(f.char.id);
      c.beginPath(); c.arc(bx, by, r + 5, 0, TAU); c.fillStyle = INK; c.fill();
      const plate = c.createRadialGradient(bx, by - 10, 4, bx, by, r); plate.addColorStop(0, '#7a2a4a'); plate.addColorStop(1, '#2a1226');
      c.beginPath(); c.arc(bx, by, r, 0, TAU); c.fillStyle = plate; c.fill();
      if (face) {
        c.save(); c.clip(); c.translate(bx, by); c.scale(s, 1);
        const fw = r * 2.5, fh = fw * face.height / face.width; c.drawImage(face, -fw / 2 - 4, -fh * .47, fw, fh);
        c.restore();
      }
      c.beginPath(); c.arc(bx, by, r, 0, TAU); c.lineWidth = 3; c.strokeStyle = GOLD; c.stroke();

      // 이름, 조작 주체, 상성.
      const tx = left ? x0 + 4 : x0 + BW - 4, ny = Y + BH + 31;
      c.textAlign = left ? 'left' : 'right'; c.font = `800 22px ${FONT}`; this.ink(f.char.name, tx, ny, CREAM, 5);
      const nameWidth = c.measureText(f.char.name).width, label = o.labels?.[i];
      if (label) {
        c.font = `800 12px ${FONT}`; const lw = c.measureText(label).width + 16, lx = tx + s * (nameWidth + 10) - (left ? 0 : lw);
        c.beginPath(); c.roundRect(lx, ny - 17, lw, 20, 10); c.fillStyle = '#1b0a14cc'; c.fill(); c.lineWidth = 1; c.strokeStyle = MUTED; c.stroke();
        c.textAlign = 'center'; c.fillStyle = MUTED; c.fillText(label, lx + lw / 2, ny - 3);
      }
      if (sim.adv[i] > 1) { c.textAlign = left ? 'left' : 'right'; c.font = `700 13px ${FONT}`; this.ink(`상성 유리 (${TYPES[f.char.strong]})`, tx, ny + 21, GOOD, 4); }

      // 이긴 판 수와 포션.
      let px = left ? x0 + BW - 16 : x0 + 16;
      for (let n = 0; n < (o.winsNeeded || 0); n++) {
        c.save(); c.translate(px, Y + BH + 22); c.rotate(Math.PI / 4);
        c.fillStyle = n < o.wins[i] ? GOLD : '#1b0a14cc'; c.strokeStyle = GOLD; c.lineWidth = 2; c.beginPath(); c.rect(-7, -7, 14, 14); c.fill(); c.stroke();
        c.restore(); px -= s * 26;
      }
      if (f.potion) {
        c.font = `800 13px ${FONT}`; const pw = c.measureText('포션 보유').width + 20, x = left ? px - pw + 8 : px - 8;
        c.beginPath(); c.roundRect(x, Y + BH + 11, pw, 22, 11); c.fillStyle = '#12301ecc'; c.fill(); c.lineWidth = 1.5; c.strokeStyle = GOOD; c.stroke();
        c.textAlign = 'center'; c.fillStyle = GOOD; c.fillText('포션 보유', x + pw / 2, Y + BH + 27);
      }

      // 초필살기 게이지.
      const mw = 320, mh = 12, mx = left ? 60 : W - 60 - mw, my = 680, full = f.meter >= 100, w = mw * Math.min(1, f.meter / 100);
      this.slab(mx, my, mw, mh, s, 6, 3); c.fillStyle = '#1b0a14e6'; c.fill(); c.lineWidth = 1.5; c.strokeStyle = full ? '#7cf0ff' : '#3fb6d988'; c.stroke();
      if (w > 1) {
        const glow = c.createLinearGradient(0, my, 0, my + mh); glow.addColorStop(0, full && frame % 20 < 10 ? '#fff' : '#a8f4ff'); glow.addColorStop(1, full ? '#7cf0ff' : '#2f9fc4');
        this.slab(left ? mx : mx + mw - w, my, w, mh, s, 6); c.fillStyle = glow; c.fill();
      }
      c.font = `800 13px ${FONT}`; c.textAlign = left ? 'left' : 'right';
      this.ink(full ? `초필살기 준비 완료 (${f.char.commands.at(-1).cmd})` : 'SUPER', left ? mx : mx + mw, my - 9, full ? '#fff' : '#9fd8e8', 4);

      // 연속기. 숫자가 오를 때마다 살짝 튄다.
      if (f.comboShown > 0 && f.combo >= 2) {
        if (f.combo !== this.combo[i]) { this.combo[i] = f.combo; this.pop[i] = 1; }
        this.pop[i] = Math.max(0, this.pop[i] - .12 * dt);
        const k = 1 + this.pop[i] * .35;
        c.save(); c.translate(left ? 70 : W - 70, 196); c.transform(1, 0, -.14, 1, 0, 0); c.scale(k, k); c.textAlign = left ? 'left' : 'right';
        const grad = c.createLinearGradient(0, -52, 0, 4); grad.addColorStop(0, '#fff7dc'); grad.addColorStop(1, '#ffb347');
        c.font = `900 62px ${FONT}`; const nw = c.measureText(f.combo).width;
        c.font = `900 30px ${FONT}`; const hw = c.measureText(' HIT').width;
        // 숫자가 먼저, HIT가 뒤. 오른쪽 선수는 오른쪽 끝에 맞춘다.
        this.ink(' HIT', left ? nw : 0, 0, CREAM, 7);
        c.font = `900 62px ${FONT}`; this.ink(String(f.combo), left ? 0 : -hw, 0, grad, 9);
        c.restore();
      } else this.combo[i] = 0;
    });

    // 남은 시간.
    const seconds = Math.max(0, Math.ceil(sim.timer / 60)), hurry = seconds <= 10;
    c.beginPath(); c.moveTo(W / 2 - 52, 20); c.lineTo(W / 2 + 52, 20); c.lineTo(W / 2 + 40, 92); c.lineTo(W / 2 - 40, 92); c.closePath();
    const plate = c.createLinearGradient(0, 20, 0, 92); plate.addColorStop(0, '#3a1830'); plate.addColorStop(1, '#1b0a14');
    c.fillStyle = plate; c.fill(); c.lineWidth = 2.5; c.strokeStyle = GOLD; c.stroke();
    c.textAlign = 'center'; c.font = `900 46px ${FONT}`; this.ink(String(seconds), W / 2, 74, hurry ? '#ff8a3d' : CREAM, 6);
    if (o.caption) { c.font = `800 13px ${FONT}`; this.ink(o.caption, W / 2, 114, MUTED, 4); }
  }

  banner({ text, sub, age }) {
    const c = this.c, k = ease(Math.min(1, age / 12)), scale = lerp(2.2, 1, k), top = 226, tall = sub ? 196 : 150;
    // 글자 뒤에 깔리는 어두운 띠. 양 끝은 흐려진다.
    const band = c.createLinearGradient(0, 0, W, 0); band.addColorStop(0, '#1b0a1400'); band.addColorStop(.22, '#1b0a14d0'); band.addColorStop(.78, '#1b0a14d0'); band.addColorStop(1, '#1b0a1400');
    const line = c.createLinearGradient(0, 0, W, 0); line.addColorStop(.08, '#ffe0a000'); line.addColorStop(.5, '#ffe0a0'); line.addColorStop(.92, '#ffe0a000');
    c.save(); c.globalAlpha = k; c.fillStyle = band; c.fillRect(0, top, W, tall); c.fillStyle = line; c.fillRect(0, top, W, 2); c.fillRect(0, top + tall - 2, W, 2); c.restore();
    c.save(); c.translate(W / 2, 330); c.scale(scale, scale); c.globalAlpha = k; c.textAlign = 'center';
    c.save(); c.transform(1, 0, -.14, 1, 0, 0);
    c.font = `900 110px ${FONT}`; const fill = c.createLinearGradient(0, -90, 0, 10); fill.addColorStop(0, '#fff7dc'); fill.addColorStop(1, '#ffb347');
    this.ink(text, 0, 0, fill, 16);
    c.restore();
    if (sub) { c.font = `800 30px ${FONT}`; this.ink(sub, 0, 62, CREAM, 8); }
    c.restore();
  }
}
