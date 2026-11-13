// 화면 위 정보: 체력, 게이지, 시간, 연속기, 큰 글자. 3D 무대 위에 겹친 2D 캔버스에 그린다.
import { STAGE, TYPES, CHARS } from '../data.js';
import { COMIC } from './comic.js';

const W = STAGE.w, H = STAGE.h, TAU = Math.PI * 2;
const FONT = '"Apple SD Gothic Neo","Malgun Gothic",Inter,sans-serif';
const INK = '#1b0a14', GOLD = '#ffe0a0', CREAM = '#fff3dd', MUTED = '#e0b789', GOOD = '#9dffb0';
// 상태 이상 표시 순서와 색.
const STATUS = [['pump', '펌프업', '#5af0dc'], ['drunk', '취함', '#7ee0a0'], ['poison', '중독', '#c79aff'], ['slow', '느려짐', '#ffd86a']];
const lerp = (a, b, k) => a + (b - a) * k, ease = k => 1 - (1 - k) * (1 - k);

export class Hud {
  // stage: 월드 좌표를 화면 픽셀로 바꿔 준다. portraitOf(id): 얼굴 배지에 쓸 그림(없으면 null).
  constructor(canvas, stage, portraitOf) {
    this.canvas = canvas; this.c = canvas.getContext('2d'); this.stage = stage; this.portraitOf = portraitOf;
    this.ratio = 1; this.debug = false; this.patterns = new Map(); this.reset();
  }
  resize(ratio) { this.ratio = ratio; this.canvas.width = Math.round(W * ratio); this.canvas.height = Math.round(H * ratio); }
  reset() { this.texts = []; this.words = []; this.bursts = []; this.cut = null; this.flash = 0; this.lag = [1, 1]; this.combo = [0, 0]; this.pop = [0, 0]; }
  // 시뮬 좌표(x, 바닥 기준 y) 위에 잠깐 떠오르는 글자.
  say(text, x, y, color, max = 50, size = 26) { const t = { text, x, y, color, life: 0, max, size }; this.texts.push(t); return t; }

  // 만화 의성어: 맞은 자리 위로 뾰족한 말풍선과 큰 글자가 튀어나온다. 같은 선수의 앞 글자는 바로 지운다.
  word(text, x, y, { size = 1, owner = null, balloon = true } = {}) {
    if (!COMIC) return;
    if (owner != null) this.words = this.words.filter(w => w.owner !== owner);
    this.words.push({ text, x, y, size, owner, balloon, life: 0, max: 30, tilt: (Math.random() - .5) * .44, seed: 1 + Math.floor(Math.random() * 9999), dx: (Math.random() - .5) * 60 });
  }
  // 망점 채우기: 지금 잡힌 경로를 45도 격자 점무늬로 칠한다. 점 타일은 한 번 만들어 무늬로 돌려 쓴다.
  dots(color, step, radius, alpha = 1) {
    const key = color + '|' + step + '|' + radius;
    let pattern = this.patterns.get(key);
    if (!pattern) {
      const t = Math.round(step * Math.SQRT2), tile = document.createElement('canvas'), g = tile.getContext('2d');
      tile.width = tile.height = t; g.fillStyle = color;
      for (const [x, y] of [[0, 0], [t, 0], [0, t], [t, t], [t / 2, t / 2]]) { g.beginPath(); g.arc(x, y, radius, 0, TAU); g.fill(); }
      this.patterns.set(key, pattern = this.c.createPattern(tile, 'repeat'));
    }
    const c = this.c; c.save(); c.globalAlpha *= alpha; c.fillStyle = pattern; c.fill(); c.restore();
  }
  // 코믹스 글자: 먹색 그림자를 오른쪽 아래로 밀어 두고, 굵은 먹선 위에 노랑에서 주황으로 넘어가는 글자를 얹는다.
  letter(text, x, y, px, width = px * .2, top = '#fff36a', bottom = '#ff5a1f') {
    const c = this.c; c.lineJoin = 'round';
    c.fillStyle = INK; c.strokeStyle = INK; c.lineWidth = width; c.strokeText(text, x + px * .07, y + px * .07); c.fillText(text, x + px * .07, y + px * .07);
    c.strokeText(text, x, y);
    const fill = c.createLinearGradient(0, y - px * .8, 0, y); fill.addColorStop(0, top); fill.addColorStop(1, bottom);
    c.fillStyle = fill; c.fillText(text, x, y);
  }
  sounds(dt) {
    const c = this.c, at = [0, 0];
    for (const w of this.words) {
      w.life += dt; const k = ease(Math.min(1, w.life / 5)), fade = Math.min(1, (w.max - w.life) / 8);
      this.stage.project(w.x - 640, -w.y, 60, at);
      c.save(); c.translate(at[0] + w.dx, at[1] - 130 - w.life * .6); c.rotate(w.tilt); c.scale(lerp(1.9, 1, k) * w.size, lerp(1.9, 1, k) * w.size); c.globalAlpha = Math.max(0, fade);
      c.font = `italic 900 48px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
      const half = c.measureText(w.text).width / 2 + 34;
      if (w.balloon) {
        // 뾰족한 폭발 말풍선. 꼭짓점 길이는 글자마다 정해 둔 씨앗으로 흔든다.
        let r = w.seed; const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647, n = 14;
        c.beginPath();
        for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * TAU, out = i % 2 ? .7 : 1 + rnd() * .28; c.lineTo(Math.cos(a) * half * out, Math.sin(a) * (half * .62 + 18) * out); }
        c.closePath(); c.lineJoin = 'miter'; c.lineWidth = 6; c.strokeStyle = INK; c.stroke(); c.fillStyle = '#fffbe6'; c.fill();
        this.dots('#ff9a3d', 9, 2.6, .5);
      }
      c.transform(1, 0, -.12, 1, 0, 0); this.letter(w.text, 0, 4, 48);
      c.restore();
    }
    c.globalAlpha = 1; c.textBaseline = 'alphabetic';
    this.words = this.words.filter(w => w.life < w.max);
  }

  // 초필살기 컷인: 화면을 가로지르는 비스듬한 띠에 얼굴과 기술 이름이 미끄러져 들어온다.
  cutIn(id, side, name) { this.cut = { id, side, name, life: 0, max: 46 }; }
  // 집중선: 맞은 자리로 화면 가장자리에서 쐐기 선이 모여든다.
  burst(x, y, max = 10, color = '#fff') { this.bursts.push({ x, y, life: 0, max, color: color || '#fff' }); }

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
    this.focus(dt); this.cutScene(dt);
    this.floaters(dt); this.sounds(dt);
    if (this.flash > 0) { c.fillStyle = `rgba(255,255,255,${Math.min(1, this.flash / 22)})`; c.fillRect(0, 0, W, H); this.flash -= dt; }
    if (o.dim) { c.fillStyle = `rgba(22,8,20,${o.dim})`; c.fillRect(0, 0, W, H); }
    if (sim && o.bars) this.bars(sim, o, dt, frame);
    if (o.banner) this.banner(o.banner);
  }

  focus(dt) {
    const c = this.c, at = [0, 0];
    for (const b of this.bursts) {
      b.life += dt; const k = b.life / b.max; if (k >= 1) continue;
      this.stage.project(b.x - 640, -b.y, 40, at);
      c.save(); c.translate(at[0], at[1]); c.globalAlpha = (1 - k) * .9;
      for (let i = 0; i < 34; i++) {
        const a = i / 34 * TAU + Math.random() * .12, near = 150 + Math.random() * 130 + k * 60, wide = .012 + Math.random() * .022;
        c.fillStyle = i % 3 ? '#fff' : b.color;
        c.beginPath(); c.moveTo(Math.cos(a) * near, Math.sin(a) * near); c.lineTo(Math.cos(a - wide) * 1500, Math.sin(a - wide) * 1500); c.lineTo(Math.cos(a + wide) * 1500, Math.sin(a + wide) * 1500); c.closePath(); c.fill();
      }
      c.restore();
    }
    c.globalAlpha = 1;
    this.bursts = this.bursts.filter(b => b.life < b.max);
  }

  cutScene(dt) {
    const cut = this.cut; if (!cut) return;
    cut.life += dt; if (cut.life >= cut.max) { this.cut = null; return; }
    const c = this.c, char = CHARS[cut.id], s = cut.side === 0 ? 1 : -1, face = this.portraitOf?.(cut.id);
    const enter = ease(Math.min(1, cut.life / 7)), leave = Math.max(0, (cut.life - (cut.max - 8)) / 8), open = enter * (1 - leave), Y = 300, BH = 190 * open;
    c.save(); c.translate(W / 2, Y); c.rotate(-.07 * s);
    // 띠: 캐릭터 색 바탕에 위아래 금색 줄, 안쪽으로 흐르는 속도선.
    const band = c.createLinearGradient(0, -BH / 2, 0, BH / 2);
    band.addColorStop(0, INK); band.addColorStop(.18, char.dark || char.color); band.addColorStop(.5, char.color); band.addColorStop(.82, char.dark || char.color); band.addColorStop(1, INK);
    if (COMIC) {
      // 만화 칸: 캐릭터 색을 평평하게 깔고 진한 색 망점, 위아래로 흰 여백과 먹선 테두리, 둘레에 검은 에너지 방울(커비 크래클).
      c.fillStyle = char.color; c.fillRect(-W, -BH / 2, W * 2, BH);
      c.beginPath(); c.rect(-W, -BH / 2, W * 2, BH); this.dots(char.dark || INK, 11, 3.4, .55);
      for (const edge of [-1, 1]) { const y = edge * BH / 2; c.fillStyle = '#fff'; c.fillRect(-W, y - (edge > 0 ? 0 : 10), W * 2, 10); c.fillStyle = INK; c.fillRect(-W, y - 3, W * 2, 6); }
      let r = 7; const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < 26; i++) {
        const x = (rnd() - .5) * W * 1.6, y = (rnd() < .5 ? -1 : 1) * (BH / 2 - 14 - rnd() * 26), big = 4 + rnd() * 11;
        c.beginPath(); c.arc(x, y, big + 2.5, 0, TAU); c.fillStyle = '#fff'; c.fill();
        c.beginPath(); c.arc(x, y, big, 0, TAU); c.fillStyle = INK; c.fill();
      }
    } else {
      c.fillStyle = band; c.fillRect(-W, -BH / 2, W * 2, BH);
      c.fillStyle = GOLD; c.fillRect(-W, -BH / 2, W * 2, 4); c.fillRect(-W, BH / 2 - 4, W * 2, 4);
    }
    c.save(); c.beginPath(); c.rect(-W, -BH / 2 + 4, W * 2, Math.max(0, BH - 8)); c.clip();
    c.globalAlpha = .5; c.fillStyle = '#fff';
    for (let i = 0; i < 16; i++) { const w = 120 + (i * 97) % 260, x = ((i * 331 + cut.life * 70 * s) % (W + 600) + W + 600) % (W + 600) - W / 2 - 300; c.fillRect(x, -BH / 2 + 10 + (i * 53) % 170 * open, w, 2 + i % 3); }
    c.globalAlpha = 1;
    if (face) {
      const h = 330, w = h * face.width / face.height, slide = (1 - enter) * 420 + leave * 300;
      c.save(); c.translate(-s * (360 + slide), 0); c.scale(s, 1); c.drawImage(face, -w / 2, -h * .46, w, h); c.restore();
    }
    c.restore();
    c.globalAlpha = open; c.textAlign = 'center'; c.textBaseline = 'middle';
    const tx = s * (150 + (1 - enter) * 260);
    if (COMIC) {
      c.font = `italic 900 78px ${FONT}`; this.letter(cut.name, tx, 6, 78, 16);
      this.caption('초필살기', tx, -70, 20);
    } else {
      c.font = `italic 900 78px ${FONT}`; this.ink(cut.name, tx, 6, '#fff', 12);
      c.font = `italic 900 20px ${FONT}`; this.ink('초필살기', tx, -62, GOLD, 6);
    }
    c.textBaseline = 'alphabetic'; c.globalAlpha = 1;
    c.restore();
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

  // 코믹스 캡션 상자: 노란 네모에 먹선 테두리, 오른쪽 아래로 먹색 그림자. (x, y)가 글자 가운데.
  caption(text, x, y, px) {
    const c = this.c; c.save(); c.font = `900 ${px}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    const w = c.measureText(text).width + px * 1.1, h = px * 1.55;
    c.translate(x, y); c.rotate(-.035);
    c.fillStyle = INK; c.fillRect(-w / 2 + 5, -h / 2 + 5, w, h);
    c.fillStyle = '#ffe14a'; c.fillRect(-w / 2, -h / 2, w, h); c.lineWidth = 3.5; c.strokeStyle = INK; c.strokeRect(-w / 2, -h / 2, w, h);
    c.fillStyle = INK; c.fillText(text, 0, px * .06);
    c.restore();
  }

  floaters(dt) {
    const c = this.c, at = [0, 0];
    c.textAlign = 'center';
    for (const t of this.texts) {
      c.font = `900 ${t.size}px ${FONT}`;
      t.life += dt; this.stage.project(t.x - 640, -t.y, 40, at);
      c.globalAlpha = Math.max(0, Math.min(1, (t.max - t.life) / 14));
      const k = ease(Math.min(1, t.life / 8));
      // 기술 이름 상자는 화면이 가까이 잡혀도 체력바 아래에 둔다.
      if (t.caption) at[1] = Math.max(at[1], 150 + t.life * .8);
      c.save(); c.translate(at[0], at[1] - t.life * .8); c.scale(lerp(1.6, 1, k), lerp(1.6, 1, k));
      if (COMIC && t.caption) this.caption(t.text, 0, -t.size * .35, t.size); else this.ink(t.text, 0, 0, t.color);
      c.restore();
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
      if (sim.adv[i] > 1) { c.textAlign = left ? 'left' : 'right'; c.font = `700 13px ${FONT}`; this.ink(`상성 유리 (${TYPES[sim.f[1 - i].char.type]})`, tx, ny + 21, GOOD, 4); }
      // 상태 이상: 남은 시간이 줄어드는 알약 모양 표시.
      let sx = tx;
      for (const [key, label, color] of STATUS) {
        const remain = f.status?.[key] || 0; if (remain <= 0) continue;
        c.font = `800 13px ${FONT}`; const sw = c.measureText(label).width + 22, x = left ? sx : sx - sw, y = ny + (sim.adv[i] > 1 ? 32 : 10);
        c.beginPath(); c.roundRect(x, y, sw, 22, 11); c.fillStyle = '#1b0a14d9'; c.fill(); c.lineWidth = 1.5; c.strokeStyle = color; c.stroke();
        c.save(); c.beginPath(); c.roundRect(x, y, sw, 22, 11); c.clip(); c.fillStyle = color + '40'; c.fillRect(x, y, sw * Math.min(1, remain / 300), 22); c.restore();
        c.textAlign = 'center'; c.fillStyle = color; c.fillText(label, x + sw / 2, y + 16);
        sx += s * (sw + 6);
      }

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
