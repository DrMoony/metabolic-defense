// 캐릭터 인형. sdf.js로 빚은 몸통 위에 얼굴을 표면에 붙이고, 팔다리는 휘는 호스로, 손발은 장갑과 신발로 단다.
import * as THREE from '../../vendor/three.module.js';
import { mesh as sdfMesh } from './sdf.js';
import { MODELS, PARTS, PROPS, INK } from './chars.js';
import { poseFor, blend } from './poses.js';
import { built, stamp, material } from './models.js';

const RAD = Math.PI / 180;
const lin = v => (v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const shapes = new Map(), geoms = new Map(), faces = new Map();
export const shapeOf = id => shapes.get(id) || shapes.set(id, MODELS[id].shape()).get(id);
// 블렌더 모델이 있으면 그쪽 조형 값(built)을 덮어쓴다. classic이면 옛 몸을 그대로 쓴다.
const modelOf = (id, classic) => (!classic && built(id) && MODELS[id].built ? { ...MODELS[id], ...MODELS[id].built } : MODELS[id]);
const cached = (key, make) => geoms.get(key) || geoms.set(key, make()).get(key);

function toGeometry(m) {
  const g = new THREE.BufferGeometry();
  for (let i = 0; i < m.color.length; i++) m.color[i] = lin(m.color[i]);
  g.setAttribute('position', new THREE.BufferAttribute(m.position, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(m.normal, 3));
  g.setAttribute('color', new THREE.BufferAttribute(m.color, 3));
  g.setIndex(new THREE.BufferAttribute(m.index, 1));
  g.computeBoundingSphere();
  return g;
}
export const bodyGeometry = id => cached('body:' + id, () => toGeometry(sdfMesh(shapeOf(id), MODELS[id].cell || 2.1)));
const partGeometry = (kind, color) => cached(kind + color, () => toGeometry(sdfMesh((PARTS[kind] || PROPS[kind])(color), 1.3)));

function merge(list) {
  list = list.filter(Boolean);
  let nv = 0, ni = 0;
  for (const g of list) { nv += g.attributes.position.count; ni += g.index.count; }
  const P = new Float32Array(nv * 3), N = new Float32Array(nv * 3), I = new Uint32Array(ni);
  let ov = 0, oi = 0;
  for (const g of list) {
    P.set(g.attributes.position.array, ov * 3); N.set(g.attributes.normal.array, ov * 3);
    const src = g.index.array; for (let i = 0; i < src.length; i++) I[oi++] = src[i] + ov;
    ov += g.attributes.position.count; g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(P, 3)); out.setAttribute('normal', new THREE.BufferAttribute(N, 3)); out.setIndex(new THREE.BufferAttribute(I, 1));
  return out;
}

// 몸 표면에 붙는 둥근 딱지(눈 흰자, 눈동자, 입 안). 정면에서 본 타원을 표면에 투영하고 법선 쪽으로 살짝 띄운다.
function patch(shape, cx, cy, rx, ry, { lift = .5, dome = 0, clip, rings = 5, segs = 24 } = {}) {
  const pos = [], idx = [];
  let last = shape.surface(cx, cy);
  if (!last) return null;
  const put = (x, y, rho) => {
    if (clip) y = Math.min(y, clip(x));
    const hit = shape.surface(x, y) || last, up = lift + dome * Math.sqrt(Math.max(0, 1 - rho * rho));
    last = hit;
    pos.push(hit.p[0] + hit.n[0] * up, hit.p[1] + hit.n[1] * up, hit.p[2] + hit.n[2] * up);
  };
  put(cx, cy, 0);
  for (let r = 1; r <= rings; r++) for (let a = 0; a < segs; a++) {
    const ang = a / segs * Math.PI * 2;
    put(cx + Math.cos(ang) * rx * r / rings, cy + Math.sin(ang) * ry * r / rings, r / rings);
  }
  for (let a = 0; a < segs; a++) idx.push(0, 1 + a, 1 + (a + 1) % segs);
  for (let r = 1; r < rings; r++) for (let a = 0; a < segs; a++) {
    const i0 = 1 + (r - 1) * segs + a, i1 = 1 + (r - 1) * segs + (a + 1) % segs;
    idx.push(i0, i0 + segs, i1 + segs, i0, i1 + segs, i1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3)); g.setIndex(idx); g.computeVertexNormals();
  g.setIndex(new THREE.BufferAttribute(new Uint32Array(idx), 1));
  return g;
}
// 표면을 따라 그은 굵은 선(눈썹, 감은 눈, 입꼬리).
function stroke(shape, pts, r, lift = r * .3) {
  const v = [];
  for (const [x, y] of pts) { const h = shape.surface(x, y); if (h) v.push(new THREE.Vector3(h.p[0] + h.n[0] * lift, h.p[1] + h.n[1] * lift, h.p[2] + h.n[2] * lift)); }
  if (v.length < 2) return null;
  const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(v), Math.max(8, v.length * 5), r, 7, false);
  const ends = [v[0], v[v.length - 1]].map(p => new THREE.SphereGeometry(r, 9, 7).translate(p.x, p.y, p.z));
  return merge([tube, ...ends]);
}
const arc = (cx, cy, w, h, n = 7) => Array.from({ length: n }, (_, i) => { const u = i / (n - 1) * 2 - 1; return [cx + u * w, cy + h * (1 - u * u)]; });

// 얼굴 부품 틀. 표정마다 [재질 이름, 지오메트리] 묶음을 만들어 두고 인형마다 메시로 찍어낸다.
function faceParts(key, M, S) {
  if (faces.has(key)) return faces.get(key);
  const F = M.face, [ex, ey] = F.eyes, [rx, ry] = F.eye, [mx, my] = F.mouth, villain = F.brow === 'villain';
  const look = rx * .3, both = make => merge([make(-1), make(1)]);
  const lid = (s, base, slope) => x => ey + ry * base + slope * s * (x - s * ex);
  const eye = (scale, pupil, clipOf) => {
    const o = s => ({ clip: clipOf && clipOf(s) });
    return [
      ['ink', both(s => patch(S, s * ex, ey, rx * scale + 1.9, ry * scale + 1.9, { lift: .25, dome: 2.4, ...o(s) }))],
      ['white', both(s => patch(S, s * ex, ey, rx * scale, ry * scale, { lift: .6, dome: 2.4, ...o(s) }))],
      ['pupil', both(s => patch(S, s * ex + look, ey - ry * .08, rx * pupil, ry * pupil * 1.04, { lift: 2.9, ...o(s) }))],
      ['shine', both(s => merge([patch(S, s * ex + look - rx * .2, ey + ry * .26, rx * .21, rx * .21, { lift: 3.3, rings: 2, segs: 12, ...o(s) }), patch(S, s * ex + look + rx * .2, ey - ry * .3, rx * .09, rx * .09, { lift: 3.3, rings: 1, segs: 8 })]))],
    ];
  };
  const calmLid = villain ? s => lid(s, .62, .22) : null, angry = s => lid(s, .4, villain ? .62 : .5);
  const browLine = (s, inY, outY, r) => stroke(S, [[s * (ex - rx * 1.05), ey + inY], [s * ex, ey + (inY + outY) / 2 + .8], [s * (ex + rx * 1.0), ey + outY]], r, r * .55);
  const eyes = {
    open: eye(1, .56, calmLid),
    fierce: eye(1, .5, angry),
    wide: eye(1.1, .34),
    shut: [['ink', both(s => stroke(S, [[s * (ex + rx * .8), ey + ry * .5], [s * (ex - rx * .55), ey], [s * (ex + rx * .8), ey - ry * .5]], 2.3))]],
    blink: [['ink', both(s => stroke(S, arc(s * ex, ey - 1, rx * .9, -3), 2.1))]],
    happy: [['ink', both(s => stroke(S, arc(s * ex, ey - ry * .3, rx * .85, ry * .6), 2.4))]],
    ko: [['ink', both(s => merge([stroke(S, [[s * ex - rx * .7, ey + ry * .55], [s * ex + rx * .7, ey - ry * .55]], 2.3), stroke(S, [[s * ex - rx * .7, ey - ry * .55], [s * ex + rx * .7, ey + ry * .55]], 2.3)]))]],
  };
  const top = ry + 3;
  const brow = {
    calm: [['ink', both(s => browLine(s, villain ? ry * .62 + 1.5 : top - 1, villain ? top + 5 : top + 3.5, villain ? 3 : 2.5))]],
    fierce: [['ink', both(s => browLine(s, ry * .4 - rx * (villain ? .62 : .5) + 2.2, ry * .4 + rx * (villain ? .62 : .5) + 2.2, 3.1))]],
    worry: [['ink', both(s => browLine(s, top + 6, top + 1.5, 2.3))]],
    none: [],
  };
  const hole = (w, h, clip) => [['ink', patch(S, mx, my, w + 1.7, h + 1.7, { lift: .25, clip: clip && (x => clip(x) + 1.7) })], ['mouth', patch(S, mx, my, w, h, { lift: .55, clip })]];
  const mouth = {
    smile: [['ink', stroke(S, arc(mx, my + 3, 10, -6.5), 2.1)]],
    smirk: [['ink', stroke(S, [[mx - 8, my - 1.5], [mx - 1, my - 3.5], [mx + 7, my - 1], [mx + 11.5, my + 4.5]], 2.1)]],
    frown: [['ink', stroke(S, arc(mx, my - 4, 9, 5), 2.1)]],
    open: [...hole(9.5, 8.5), ['tongue', patch(S, mx, my - 4.8, 6.4, 3.6, { lift: .85 })], ['white', patch(S, mx, my + 6.2, 6.6, 2.2, { lift: .85, rings: 2 })]],
    grin: [...hole(12.5, 10.5, () => my + 2.6), ['tongue', patch(S, mx, my - 5.6, 7.6, 4.2, { lift: .85 })], ['white', patch(S, mx, my + .9, 9.4, 2.4, { lift: .85, rings: 2, clip: () => my + 2.3 })]],
    grit: [['ink', patch(S, mx, my, 12.7, 6.9, { lift: .25 })], ['white', patch(S, mx, my, 11, 5.2, { lift: .55 })], ['ink', merge([stroke(S, [[mx - 10.5, my], [mx + 10.5, my]], .8, .9), ...[-5, 0, 5].map(dx => stroke(S, [[mx + dx, my + 4.6], [mx + dx, my - 4.6]], .7, .9))])]],
    o: hole(4.6, 5.6),
    wavy: [['ink', stroke(S, Array.from({ length: 9 }, (_, i) => [mx - 10 + i * 2.5, my + Math.sin(i * 1.57) * 2.2]), 2)]],
  };
  const out = { eyes, brow, mouth };
  faces.set(key, out);
  return out;
}

const MATS = {
  white: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .22, emissive: '#3c3838' }),
  shine: new THREE.MeshBasicMaterial({ color: '#ffffff' }),
  ink: new THREE.MeshStandardMaterial({ color: INK, roughness: .55 }),
  pupil: new THREE.MeshStandardMaterial({ color: '#160610', roughness: .2 }),
  mouth: new THREE.MeshStandardMaterial({ color: '#571023', roughness: .6 }),
  tongue: new THREE.MeshStandardMaterial({ color: '#ff8496', roughness: .45 }),
};
const SKIN = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: .4, clearcoat: .6, clearcoatRoughness: .28 });
const limbMats = new Map();
const limbMaterial = color => limbMats.get(color) || limbMats.set(color, new THREE.MeshStandardMaterial({ color, roughness: .62, envMapIntensity: .5 })).get(color);

// 휘는 호스. 시작점 a에서 조절점 c를 거쳐 b로 가는 곡선을 따라 관을 매 프레임 다시 세운다.
// profile을 주면 굵기를 [자리, 반지름] 표로 읽고(근육), bands를 주면 [시작, 끝, 색] 구간을 꼭짓점 색으로 칠한다(바지 자락).
const along = (profile, t) => {
  let i = 1; while (i < profile.length - 1 && profile[i][0] < t) i++;
  const [t0, r0] = profile[i - 1], [t1, r1] = profile[i], k = clamp((t - t0) / (t1 - t0 || 1), 0, 1), s = k * k * (3 - 2 * k);
  return r0 + (r1 - r0) * s;
};
class Hose {
  constructor(material, { segs = 12, radial = 9, profile = null, color = null, bands = [] } = {}) {
    this.segs = segs; this.radial = radial; this.profile = profile;
    const count = (segs + 1) * radial, index = [];
    this.pos = new Float32Array(count * 3); this.nor = new Float32Array(count * 3);
    for (let i = 0; i < segs; i++) for (let j = 0; j < radial; j++) {
      const a = i * radial + j, b = i * radial + (j + 1) % radial;
      index.push(a, a + radial, b + radial, a, b + radial, b);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(this.nor, 3)); g.setIndex(index);
    if (color) {
      const tint = new Float32Array(count * 3), base = new THREE.Color(color), paint = new THREE.Color();
      for (let i = 0; i <= segs; i++) {
        const t = i / segs, band = bands.find(b => t >= b[0] && t <= b[1]);
        if (band) paint.set(band[2]); else paint.copy(base);
        for (let j = 0; j < radial; j++) paint.toArray(tint, (i * radial + j) * 3);
      }
      g.setAttribute('color', new THREE.BufferAttribute(tint, 3));
      // 재질을 둘 주면 칠한 구간은 둘째 재질(천)로 그린다. 구간은 호스 첫머리부터 이어져 있어야 한다.
      if (Array.isArray(material)) {
        const cut = Math.round((bands[0] ? bands[0][1] : 0) * segs) * radial * 6;
        g.addGroup(0, cut, 1); g.addGroup(cut, index.length - cut, 0);
      }
    }
    this.mesh = new THREE.Mesh(g, material); this.mesh.frustumCulled = false; this.mesh.castShadow = true;
  }
  set(a, c, b, r0, r1) {
    const { segs, radial, pos, nor, profile } = this;
    let at = 0;
    for (let i = 0; i <= segs; i++) {
      const t = i / segs, u = 1 - t;
      const px = u * u * a.x + 2 * u * t * c.x + t * t * b.x, py = u * u * a.y + 2 * u * t * c.y + t * t * b.y, pz = u * u * a.z + 2 * u * t * c.z + t * t * b.z;
      let tx = u * (c.x - a.x) + t * (b.x - c.x), ty = u * (c.y - a.y) + t * (b.y - c.y), tz = u * (c.z - a.z) + t * (b.z - c.z);
      const tl = Math.hypot(tx, ty, tz) || 1; tx /= tl; ty /= tl; tz /= tl;
      // 접선에 수직인 두 축. 기준은 z축, 접선이 z와 나란하면 y축.
      let nx = ty, ny = -tx, nz = 0, nl = Math.hypot(nx, ny);
      if (nl < .2) { nx = 0; ny = tz; nz = -ty; nl = Math.hypot(ny, nz) || 1; }
      nx /= nl; ny /= nl; nz /= nl;
      const bx = ty * nz - tz * ny, by = tz * nx - tx * nz, bz = tx * ny - ty * nx, r = profile ? along(profile, t) : r0 + (r1 - r0) * t;
      for (let j = 0; j < radial; j++) {
        const ang = j / radial * Math.PI * 2, cs = Math.cos(ang), sn = Math.sin(ang), ox = nx * cs + bx * sn, oy = ny * cs + by * sn, oz = nz * cs + bz * sn;
        pos[at] = px + ox * r; pos[at + 1] = py + oy * r; pos[at + 2] = pz + oz * r;
        nor[at] = ox; nor[at + 1] = oy; nor[at + 2] = oz; at += 3;
      }
    }
    const g = this.mesh.geometry; g.attributes.position.needsUpdate = true; g.attributes.normal.needsUpdate = true;
  }
}

const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(), T = new THREE.Vector3(), V = new THREE.Vector3(), X = new THREE.Vector3(1, 0, 0), Q = new THREE.Quaternion();

export class Puppet {
  constructor(id, { classic = false } = {}) {
    const M = this.model = modelOf(id, classic), B = M === MODELS[id] ? null : built(id), mats = {};
    this.id = id; this.P = null; this.last = '';
    this.root = new THREE.Group();
    this.lean = new THREE.Group(); this.turn = new THREE.Group(); this.squash = new THREE.Group();
    this.root.add(this.lean); this.lean.add(this.turn); this.turn.add(this.squash);
    this.flashers = [];
    if (B) this.squash.add(stamp(B, 'body', mats, this.flashers));
    else {
      const skin = SKIN.clone(), body = new THREE.Mesh(bodyGeometry(id), skin); body.castShadow = true;
      this.flashers.push(skin); this.squash.add(body);
    }

    // 얼굴: 표정 묶음을 전부 만들어 두고 보이기만 바꾼다.
    this.face = {}; this.shown = {};
    const parts = faceParts(B ? id + '+' : id, M, B ? B.shape : shapeOf(id));
    for (const kind in parts) {
      this.face[kind] = {};
      for (const name in parts[kind]) {
        const group = new THREE.Group(); group.visible = false;
        for (const [mat, geometry] of parts[kind][name]) if (geometry) group.add(new THREE.Mesh(geometry, MATS[mat]));
        this.squash.add(group); this.face[kind][name] = group;
      }
    }

    const glove = M.glove || M.limb, shoe = M.shoe || M.limb;
    if (B) {
      // 블렌더 몸: 팔다리도 몸과 같은 윤기를 내고, 굵기 표를 따라 근육이 잡힌다.
      const use = kind => { if (!mats[kind]) this.flashers.push(mats[kind] = material(kind)); return mats[kind]; };
      const limb = use('limb'), thigh = M.legBands ? [limb, use('cloth')] : limb;
      const arm = { segs: 22, radial: 14, color: M.limb, profile: M.armShape, bands: M.armBands }, leg = { segs: 22, radial: 14, color: M.limb, profile: M.legShape, bands: M.legBands };
      this.hoses = { hf: new Hose(limb, arm), hb: new Hose(limb, arm), ff: new Hose(thigh, leg), fb: new Hose(thigh, leg) };
    } else {
      const limb = limbMaterial(M.limb);
      this.hoses = { hf: new Hose(limb), hb: new Hose(limb), ff: new Hose(limb), fb: new Hose(limb) };
    }
    const piece = (kind, color, scale = 1) => {
      let m;
      if (B && (kind === M.hand || kind === M.foot)) m = stamp(B, kind === M.hand ? 'hand' : 'foot', mats, this.flashers);
      else {
        const material = SKIN.clone(); m = new THREE.Mesh(partGeometry(kind, color), material);
        m.castShadow = true; this.flashers.push(material);
      }
      m.scale.setScalar(scale); this.root.add(m);
      return m;
    };
    this.hands = { hf: piece(M.hand, glove, M.handScale || 1), hb: piece(M.hand, glove, M.handScale || 1) };
    this.feet = { ff: piece(M.foot, shoe, M.footScale || 1), fb: piece(M.foot, shoe, M.footScale || 1) };
    for (const key in this.hoses) this.root.add(this.hoses[key].mesh);
    // 소품은 손에 쥔다. 손의 +x(뻗는 방향)를 따라 놓인다.
    this.props = (M.props || (M.prop ? [M.prop] : [])).map(d => {
      const material = SKIN.clone(), m = new THREE.Mesh(partGeometry(d.kind, d.color || '#ffffff'), material);
      m.castShadow = true; if (d.at) m.position.set(...d.at); if (d.rot) m.rotation.set(...d.rot.map(v => v * RAD)); if (d.scale) m.scale.setScalar(d.scale);
      this.flashers.push(material); this.hands[d.hand || 'hf'].add(m);
      // hang이 있으면 평소에는 그 방향으로 늘어뜨리고, 자세가 prop을 올릴 때만 손이 뻗는 쪽을 따라간다(채찍).
      if (d.hang) { m.userData.hang = new THREE.Vector3(...d.hang).normalize(); m.userData.dir = m.userData.hang.clone(); m.userData.hand = this.hands[d.hand || 'hf']; m.userData.stretch = d.stretch || 0; m.userData.scale = d.scale || 1; }
      return m;
    });
  }

  show(kind, name) {
    const set = this.face[kind];
    if (!set[name]) name = Object.keys(set)[0];
    if (this.shown[kind] === name) return;
    if (this.shown[kind]) set[this.shown[kind]].visible = false;
    set[name].visible = true; this.shown[kind] = name;
  }

  // 몸통 좌표의 점을 발밑 기준 좌표로 옮긴다(어깨·골반 자리 계산).
  anchor(x, y, z, out) {
    const P = this.P, a = P.turn * RAD + P.spin, ca = Math.cos(a), sa = Math.sin(a), r = -(P.lean + P.roll), cr = Math.cos(r), sr = Math.sin(r);
    const k = this.model.girth || 1;
    x *= P.sx * k; y *= P.sy * k; z *= P.sx * k;
    const x1 = x * ca + z * sa, z1 = -x * sa + z * ca;
    return out.set(x1 * cr - y * sr + P.bx, x1 * sr + y * cr + P.by + (this.model.rise || 0), z1);
  }

  // 관절에서 손발까지 호스를 놓고 끝 방향을 T에 담는다. pref는 팔꿈치·무릎이 꺾이고 싶은 방향.
  limb(hose, a, b, length, px, py, pz, r0, r1) {
    const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, d = Math.hypot(dx, dy, dz) || 1, ax = dx / d, ay = dy / d, az = dz / d;
    const dot = px * ax + py * ay + pz * az;
    let ox = px - ax * dot, oy = py - ay * dot, oz = pz - az * dot, ol = Math.hypot(ox, oy, oz);
    if (ol < .05) { ox = -ay; oy = ax; oz = 0; ol = Math.hypot(ox, oy) || 1; }
    // 다 뻗어도 자처럼 곧지 않게 살짝 휜다.
    const h = d < length ? Math.max(Math.sqrt(length * length - d * d) * .75, d * .05) : d * .05;
    C.set((a.x + b.x) / 2 + ox / ol * h, (a.y + b.y) / 2 + oy / ol * h, (a.z + b.z) / 2 + oz / ol * h);
    hose.set(a, C, b, r0, r1);
    T.set(b.x - C.x, b.y - C.y, b.z - C.z).normalize();
  }

  update(f, frame) {
    const M = this.model, target = poseFor(f, frame, M);
    const key = f.state + (f.move ? f.move.pose || f.move.name || '' : '');
    if (!this.P) this.P = target;
    else {
      const P = this.P, rate = key === this.last ? target.rate : Math.max(target.rate, .5);
      for (const k of ['bx', 'by', 'lean', 'turn', 'sx', 'sy', 'prop']) P[k] += (target[k] - P[k]) * rate;
      for (const k of ['hf', 'hb', 'ff', 'fb']) for (let i = 0; i < 3; i++) P[k][i] += (target[k][i] - P[k][i]) * rate;
      P.spin = target.spin; P.roll = target.roll; P.eyes = target.eyes; P.mouth = target.mouth;
    }
    this.last = key;
    const P = this.P, size = M.size || 1;
    this.root.position.set(f.x - 640, -f.y, f.side ? -5 : 5);
    this.root.scale.set(f.facing * size, size, size);
    this.lean.position.set(P.bx, P.by + (M.rise || 0), 0); this.lean.rotation.z = -(P.lean + P.roll);
    this.turn.rotation.y = P.turn * RAD + P.spin;
    const girth = M.girth || 1;
    this.squash.scale.set(P.sx * girth, P.sy * girth, P.sx * girth);

    // 표정. 가만히 있을 때는 가끔 눈을 깜빡인다.
    let eyes = P.eyes;
    if (eyes === 'open' && (frame + (f.side ? 71 : 0)) % 190 < 6) eyes = 'blink';
    this.show('eyes', eyes);
    this.show('mouth', P.mouth === 'calm' ? M.face.calm : P.mouth);
    this.show('brow', eyes === 'fierce' ? 'fierce' : eyes === 'open' || eyes === 'blink' || eyes === 'happy' ? 'calm' : 'worry');

    // 팔: 팔꿈치는 아래·뒤로, 앞팔은 화면 안쪽으로 뒤팔은 바깥쪽으로 살짝 벌어진다.
    const [sx, sy, sz] = M.shoulder, [hx, hy, hz] = M.hip, reach = M.reach || 96, stride = M.stride || 80;
    for (const [key, side] of [['hf', 1], ['hb', -1]]) {
      this.anchor(sx * side, sy, sz, A); B.set(...P[key]);
      // 고무 팔이라 늘어나긴 하지만 한도를 넘으면 손을 당겨 온다.
      const far = B.distanceTo(A), most = reach * (M.stretch || 1.6);
      if (far > most) B.sub(A).multiplyScalar(most / far).add(A);
      this.limb(this.hoses[key], A, B, reach, -.35, -1, -.5 * side, M.arm[0], M.arm[1]);
      const hand = this.hands[key];
      hand.position.copy(B); hand.quaternion.setFromUnitVectors(X, T);
    }
    // 다리: 무릎은 앞으로. 발이 땅에 닿아 있으면 바닥에 붙이고, 떠 있으면 정강이 방향을 따라 꺾는다.
    for (const [key, side] of [['ff', 1], ['fb', -1]]) {
      this.anchor(hx * side, hy, hz, A);
      const foot = this.feet[key], p = B.set(...P[key]), lift = clamp(p.y / 14, 0, 1), ankle = M.ankle || 15;
      // 다리도 한도까지만 늘어난다.
      const far = p.distanceTo(A), most = stride * (M.legStretch || 1.7);
      if (far > most) p.sub(A).multiplyScalar(most / far).add(A);
      const px = p.x, py = p.y, pz = p.z;
      V.set(px - A.x, py + ankle - A.y, pz - A.z).normalize();
      const pitch = clamp(Math.atan2(V.y, V.x) + Math.PI / 2, -1.1, 2.2) * lift;
      foot.position.set(px, py, pz); foot.rotation.set(0, (side > 0 ? 8 : -34) * RAD * (1 - lift * .6), pitch, 'YZX');
      B.set(px - Math.sin(pitch) * ankle - 3 * Math.cos(pitch), py + Math.cos(pitch) * ankle - 3 * Math.sin(pitch), pz);
      this.limb(this.hoses[key], A, B, stride, 1, .25, .3 * -side, M.leg[0], M.leg[1]);
    }

    // 늘어뜨리는 소품: 걸으면 뒤로 끌리고, 방향은 한 박자 늦게 따라온다.
    for (const m of this.props) {
      const u = m.userData; if (!u.hang) continue;
      const w = clamp(P.prop, 0, 1);
      T.set(1, 0, 0).applyQuaternion(u.hand.quaternion);
      V.copy(u.hang); V.x -= clamp((f.vx || 0) * f.facing * .05, -.5, .5); V.normalize().lerp(T, w).normalize();
      u.dir.lerp(V, w > .5 ? .6 : .22).normalize();
      Q.copy(u.hand.quaternion).invert(); m.quaternion.setFromUnitVectors(X, u.dir).premultiply(Q);
      m.scale.set(u.scale * (1 + u.stretch * w), u.scale, u.scale);
    }

    // 맞은 순간 하얗게 번쩍인다.
    const glow = f.flash > 0 ? .3 : 0;
    if (glow !== this.glow) { this.glow = glow; for (const m of this.flashers) m.emissive.setScalar(glow); }
  }
}
