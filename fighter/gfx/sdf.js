// 캐릭터 몸통을 "거리 함수"로 빚는다. 공·캡슐·상자 같은 덩어리를 부드럽게 이어 붙인 뒤 표면을 그물(메시)로 뽑는다.
// three.js와 무관한 순수 계산이라 node에서도 돌아간다.
const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);
const RAD = Math.PI / 180;

// 회전(도 단위, X→Y→Z 순). 돌려준 행렬 m은 로컬→월드, 월드→로컬은 전치.
function rotation([rx = 0, ry = 0, rz = 0] = []) {
  const cx = Math.cos(rx * RAD), sx = Math.sin(rx * RAD), cy = Math.cos(ry * RAD), sy = Math.sin(ry * RAD), cz = Math.cos(rz * RAD), sz = Math.sin(rz * RAD);
  return [cz * cy, cz * sy * sx - sz * cx, cz * sy * cx + sz * sx, sz * cy, sz * sy * sx + cz * cx, sz * sy * cx - cz * sx, -sy, cy * sx, cy * cx];
}
// 중심 c와 회전 rot을 가진 덩어리의 로컬 거리 함수 local(x,y,z)를 월드 거리 함수로 감싼다.
function placed(c, rot, local) {
  if (!rot) return (x, y, z) => local(x - c[0], y - c[1], z - c[2]);
  const m = rotation(rot);
  return (x, y, z) => {
    const px = x - c[0], py = y - c[1], pz = z - c[2];
    return local(m[0] * px + m[3] * py + m[6] * pz, m[1] * px + m[4] * py + m[7] * pz, m[2] * px + m[5] * py + m[8] * pz);
  };
}

// 덩어리들. 모두 { f: 거리 함수, b: [중심x, y, z, 반지름](대략 감싸는 공) }을 돌려준다.
export const ball = (c, r, rot) => {
  const [rx, ry, rz] = typeof r === 'number' ? [r, r, r] : r, small = Math.min(rx, ry, rz);
  if (rx === ry && ry === rz) return { f: (x, y, z) => Math.hypot(x - c[0], y - c[1], z - c[2]) - rx, b: [...c, rx] };
  const local = (x, y, z) => {
    const k0 = Math.hypot(x / rx, y / ry, z / rz), k1 = Math.hypot(x / (rx * rx), y / (ry * ry), z / (rz * rz));
    return k1 < 1e-9 ? -small : k0 * (k0 - 1) / k1;
  };
  return { f: placed(c, rot, local), b: [...c, Math.max(rx, ry, rz)] };
};
// a에서 b로 가는 캡슐. 반지름을 [ra, rb]로 주면 끝으로 갈수록 가늘어진다.
export const cap = (a, b, r) => {
  const [ra, rb] = typeof r === 'number' ? [r, r] : r;
  const bx = b[0] - a[0], by = b[1] - a[1], bz = b[2] - a[2], len2 = bx * bx + by * by + bz * bz || 1;
  return {
    f: (x, y, z) => {
      const px = x - a[0], py = y - a[1], pz = z - a[2], t = clamp01((px * bx + py * by + pz * bz) / len2);
      return Math.hypot(px - bx * t, py - by * t, pz - bz * t) - (ra + (rb - ra) * t);
    },
    b: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, Math.sqrt(len2) / 2 + Math.max(ra, rb)],
  };
};
// 모서리가 둥근 상자. taper를 주면 위(+y)로 갈수록 x·z가 넓어지거나(양수) 좁아진다.
export const box = (c, half, round = 0, rot, taper = 0) => {
  const [hx, hy, hz] = half;
  const local = (x, y, z) => {
    const s = 1 + taper * (y / hy);
    const qx = Math.abs(x) / s - hx + round, qy = Math.abs(y) - hy + round, qz = Math.abs(z) / s - hz + round;
    return (Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - round) * Math.min(1, s);
  };
  return { f: placed(c, rot, local), b: [...c, Math.hypot(hx, hy, hz) * (1 + Math.abs(taper))] };
};
// 도넛. 기본은 xz 평면에 누운 고리. scaleY로 납작하게 만들 수 있다.
export const torus = (c, R, r, rot) => {
  const local = (x, y, z) => Math.hypot(Math.hypot(x, z) - R, y) - r;
  return { f: placed(c, rot, local), b: [...c, R + r] };
};
// y축을 따라 선 둥근 원뿔대(컵 모양). r1=아래 반지름, r2=위 반지름, h=전체 높이.
export const cone = (c, h, r1, r2, round = 0, rot) => {
  const hh = h / 2, slope = (r2 - r1) / h, norm = Math.hypot(1, slope);
  const local = (x, y, z) => {
    const q = Math.hypot(x, z), radius = r1 + (r2 - r1) * clamp01((y + hh) / h);
    const side = (q - radius) / norm + round, capd = Math.abs(y) - hh + round;
    return Math.hypot(Math.max(side, 0), Math.max(capd, 0)) + Math.min(Math.max(side, capd), 0) - round;
  };
  return { f: placed(c, rot, local), b: [...c, Math.hypot(hh, Math.max(r1, r2))] };
};

const hex = color => { const n = parseInt(color.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };

export class Shape {
  constructor() { this.items = []; }
  // k: 이어 붙는 곳이 얼마나 부드럽게 녹는지(픽셀). 색은 좁게 섞어 경계가 또렷하다.
  add(prim, color, k = 0, colorBlend = 1.6) { this.items.push({ op: 0, f: prim.f, b: prim.b, c: hex(color), k, cb: colorBlend }); return this; }
  cut(prim, k = 0, color) { this.items.push({ op: 1, f: prim.f, b: prim.b, c: color ? hex(color) : null, k }); return this; }
  // 모양은 그대로 두고 덩어리 안쪽 표면만 색칠한다(띠, 무늬).
  paint(prim, color, soft = 1.2) { this.items.push({ op: 2, f: prim.f, b: prim.b, c: hex(color), k: soft }); return this; }

  dist(x, y, z) {
    let d = 1e9;
    for (const it of this.items) {
      if (it.op === 2) continue;
      const b = it.b;
      if (it.op === 0) {
        // 이 덩어리가 지금 값보다 가까워질 수 없으면 건너뛴다.
        if (Math.hypot(x - b[0], y - b[1], z - b[2]) - b[3] > d + it.k) continue;
        const v = it.f(x, y, z);
        if (it.k > 0) { const h = clamp01(.5 + .5 * (v - d) / it.k); d = v + (d - v) * h - it.k * h * (1 - h); }
        else if (v < d) d = v;
      } else {
        if (Math.hypot(x - b[0], y - b[1], z - b[2]) - b[3] > it.k - d) continue;
        const v = -it.f(x, y, z);
        if (it.k > 0) { const h = clamp01(.5 - .5 * (v - d) / it.k); d = v + (d - v) * h + it.k * h * (1 - h); }
        else if (v > d) d = v;
      }
    }
    return d;
  }
  color(x, y, z, out) {
    let d = 1e9, r = 1, g = 1, bl = 1;
    for (const it of this.items) {
      const v = it.f(x, y, z), c = it.c;
      if (it.op === 0) {
        const hc = clamp01(.5 + .5 * (v - d) / it.cb);
        r = c[0] + (r - c[0]) * hc; g = c[1] + (g - c[1]) * hc; bl = c[2] + (bl - c[2]) * hc;
        if (it.k > 0) { const h = clamp01(.5 + .5 * (v - d) / it.k); d = v + (d - v) * h - it.k * h * (1 - h); } else if (v < d) d = v;
      } else if (it.op === 1) {
        const w = -v;
        if (c) { const hc = clamp01(.5 + .5 * (w - d) / 1.6); r += (c[0] - r) * hc; g += (c[1] - g) * hc; bl += (c[2] - bl) * hc; }
        if (it.k > 0) { const h = clamp01(.5 - .5 * (w - d) / it.k); d = w + (d - w) * h + it.k * h * (1 - h); } else if (w > d) d = w;
      } else {
        const hc = clamp01(.5 - v / it.k);
        r += (c[0] - r) * hc; g += (c[1] - g) * hc; bl += (c[2] - bl) * hc;
      }
    }
    out[0] = r; out[1] = g; out[2] = bl;
  }
  normal(x, y, z, out, e = .6) {
    const nx = this.dist(x + e, y, z) - this.dist(x - e, y, z), ny = this.dist(x, y + e, z) - this.dist(x, y - e, z), nz = this.dist(x, y, z + e) - this.dist(x, y, z - e);
    const len = Math.hypot(nx, ny, nz) || 1;
    out[0] = nx / len; out[1] = ny / len; out[2] = nz / len;
  }
  bounds(pad = 0) {
    const min = [1e9, 1e9, 1e9], max = [-1e9, -1e9, -1e9];
    for (const it of this.items) {
      if (it.op !== 0) continue;
      for (let a = 0; a < 3; a++) { min[a] = Math.min(min[a], it.b[a] - it.b[3] - pad); max[a] = Math.max(max[a], it.b[a] + it.b[3] + pad); }
    }
    return [min, max];
  }
  // (x, y)에서 정면(+z)에서 뒤로 쏜 광선이 표면과 만나는 점과 법선. 얼굴 부품을 표면에 붙일 때 쓴다.
  surface(x, y, from = 200, dir = [0, 0, -1]) {
    let px = x - dir[0] * from, py = y - dir[1] * from, pz = -dir[2] * from;
    for (let i = 0; i < 160; i++) {
      const d = this.dist(px, py, pz);
      if (d < .05) { const n = [0, 0, 1]; this.normal(px, py, pz, n); return { p: [px, py, pz], n }; }
      px += dir[0] * d * .9; py += dir[1] * d * .9; pz += dir[2] * d * .9;
      if (Math.abs(pz) > from + 1 || Math.abs(px) > 400 || Math.abs(py) > 400) break;
    }
    return null;
  }
}

// 표면 그물 뽑기(surface nets). cell=격자 한 칸 크기(픽셀). 작을수록 곱지만 느리다.
export function mesh(shape, cell = 2.4) {
  const [min, max] = shape.bounds(cell * 2);
  const n = [0, 1, 2].map(a => Math.ceil((max[a] - min[a]) / cell) + 1), [nx, ny, nz] = n;
  const vals = new Float32Array(nx * ny * nz);
  let at = 0;
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) vals[at++] = shape.dist(min[0] + i * cell, min[1] + j * cell, min[2] + k * cell);

  const cellVertex = new Int32Array(nx * ny * nz).fill(-1), pos = [], stride = [1, nx, nx * ny];
  const corner = new Float32Array(8);
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const base = i + j * nx + k * nx * ny;
    let mask = 0;
    for (let c = 0; c < 8; c++) { const v = vals[base + (c & 1) + (c >> 1 & 1) * nx + (c >> 2 & 1) * nx * ny]; corner[c] = v; if (v < 0) mask |= 1 << c; }
    if (mask === 0 || mask === 255) continue;
    let sx = 0, sy = 0, sz = 0, count = 0;
    for (let c = 0; c < 8; c++) for (let a = 0; a < 3; a++) {
      const o = c | (1 << a);
      if (o === c) continue;
      const v0 = corner[c], v1 = corner[o];
      if ((v0 < 0) === (v1 < 0)) continue;
      const t = v0 / (v0 - v1);
      sx += (c & 1) + (a === 0 ? t : 0); sy += (c >> 1 & 1) + (a === 1 ? t : 0); sz += (c >> 2 & 1) + (a === 2 ? t : 0); count++;
    }
    cellVertex[base] = pos.length / 3;
    pos.push(min[0] + (i + sx / count) * cell, min[1] + (j + sy / count) * cell, min[2] + (k + sz / count) * cell);
  }

  // 꼭짓점을 실제 표면으로 한 번 더 당기고, 법선과 색을 거리 함수에서 직접 얻는다(면이 거칠어도 음영은 매끈하다).
  const count = pos.length / 3, position = new Float32Array(pos), normal = new Float32Array(count * 3), color = new Float32Array(count * 3), tmp = [0, 0, 0];
  for (let v = 0; v < count; v++) {
    let x = position[v * 3], y = position[v * 3 + 1], z = position[v * 3 + 2];
    for (let pass = 0; pass < 2; pass++) {
      shape.normal(x, y, z, tmp); const d = shape.dist(x, y, z);
      x -= tmp[0] * d; y -= tmp[1] * d; z -= tmp[2] * d;
    }
    position[v * 3] = x; position[v * 3 + 1] = y; position[v * 3 + 2] = z;
    shape.normal(x, y, z, tmp); normal.set(tmp, v * 3);
    shape.color(x, y, z, tmp); color.set(tmp, v * 3);
  }

  const index = [];
  const quad = (a, b, c, d) => {
    // 면이 바깥을 보도록 감는 방향을 법선과 맞춘다.
    const ux = position[b * 3] - position[a * 3], uy = position[b * 3 + 1] - position[a * 3 + 1], uz = position[b * 3 + 2] - position[a * 3 + 2];
    const vx = position[d * 3] - position[a * 3], vy = position[d * 3 + 1] - position[a * 3 + 1], vz = position[d * 3 + 2] - position[a * 3 + 2];
    const facing = (uy * vz - uz * vy) * normal[a * 3] + (uz * vx - ux * vz) * normal[a * 3 + 1] + (ux * vy - uy * vx) * normal[a * 3 + 2];
    if (facing >= 0) index.push(a, b, c, a, c, d); else index.push(a, d, c, a, c, b);
  };
  for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
    const base = i + j * nx + k * nx * ny, v0 = vals[base];
    for (let a = 0; a < 3; a++) {
      if ((v0 < 0) === (vals[base + stride[a]] < 0)) continue;
      const u = stride[(a + 1) % 3], w = stride[(a + 2) % 3];
      const q = [cellVertex[base], cellVertex[base - u], cellVertex[base - u - w], cellVertex[base - w]];
      if (q.every(id => id >= 0)) quad(...q);
    }
  }
  return { position, normal, color, index: new Uint32Array(index) };
}
