// 키보드와 게임패드(조이스틱)를 한 형태로 읽는다. 0번 패드=1P, 1번 패드=2P.
const KEYS = [
  { left: ['KeyA'], right: ['KeyD'], up: ['KeyW'], down: ['KeyS'], p: ['KeyF'], k: ['KeyG'], s: ['KeyH'] },
  { left: ['ArrowLeft'], right: ['ArrowRight'], up: ['ArrowUp'], down: ['ArrowDown'], p: ['KeyK', 'Numpad1'], k: ['KeyL', 'Numpad2'], s: ['Semicolon', 'Numpad3'] },
];
const held = new Set();
const GAME_KEYS = new Set(KEYS.flatMap(map => Object.values(map).flat()));
addEventListener('keydown', event => { held.add(event.code); if (GAME_KEYS.has(event.code)) event.preventDefault(); });
addEventListener('keyup', event => held.delete(event.code));
addEventListener('blur', () => held.clear());

const any = codes => codes.some(code => held.has(code));
// 표준 배열 기준: 0·2번=주먹, 1번=킥, 3·5번=필살기. 부스 장비가 정해지면 여기만 맞추면 된다.
const PAD = { p: [0, 2], k: [1], s: [3, 5] };

export function readPlayer(player) {
  const map = KEYS[player];
  let x = (any(map.right) ? 1 : 0) - (any(map.left) ? 1 : 0), y = (any(map.down) ? 1 : 0) - (any(map.up) ? 1 : 0);
  let p = any(map.p), k = any(map.k), s = any(map.s);
  const pad = navigator.getGamepads?.()[player];
  if (pad) {
    const on = index => !!pad.buttons[index]?.pressed;
    const ax = pad.axes[0] || 0, ay = pad.axes[1] || 0;
    x = x || (ax > .5 || on(15) ? 1 : 0) - (ax < -.5 || on(14) ? 1 : 0);
    y = y || (ay > .5 || on(13) ? 1 : 0) - (ay < -.5 || on(12) ? 1 : 0);
    p = p || PAD.p.some(on); k = k || PAD.k.some(on); s = s || PAD.s.some(on);
  }
  return { x, y, p, k, s };
}

export const NEUTRAL = Object.freeze({ x: 0, y: 0, p: false, k: false, s: false, pp: false, pk: false, ps: false, dir: null });

// 눌린 순간(pp·pk·ps)과 방향을 새로 넣은 순간(dir)을 뽑는다. source는 {x,y,p,k,s}를 돌려주는 함수.
export class Controller {
  constructor(source) { this.source = source; this.prev = { x: 0, y: 0, p: false, k: false, s: false }; }
  poll() {
    const raw = this.source(), prev = this.prev;
    let dir = null;
    if (raw.y < 0 && prev.y >= 0) dir = 'up'; else if (raw.y > 0 && prev.y <= 0) dir = 'down';
    else if (raw.x < 0 && prev.x >= 0) dir = 'left'; else if (raw.x > 0 && prev.x <= 0) dir = 'right';
    const state = { ...raw, pp: raw.p && !prev.p, pk: raw.k && !prev.k, ps: raw.s && !prev.s, dir };
    this.prev = raw;
    return state;
  }
}
