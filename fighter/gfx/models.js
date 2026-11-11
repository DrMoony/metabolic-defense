// 블렌더로 빚은 모델(assets/<id>.glb). 여기 적힌 캐릭터만 읽고, 나머지는 sdf.js로 빚은 몸을 그대로 쓴다.
// glb 안에는 body·hand·foot 세 덩어리가 들어 있고, 얼굴을 붙일 앞면 높이는 같은 이름의 json에 적혀 있다.
import * as THREE from '../../vendor/three.module.js';
import { GLTFLoader } from '../../vendor/addons/GLTFLoader.js';

const BUILT = ['heart'];
const base = new URL('../assets/', import.meta.url);
const store = new Map();

// 재질은 glb에 적힌 이름만 보고 게임 쪽에서 다시 만든다(색은 꼭짓점에 구워져 있다).
const LOOK = {
  skin: { roughness: .36, clearcoat: .75, clearcoatRoughness: .22 },
  leather: { roughness: .3, clearcoat: .9, clearcoatRoughness: .16 },
  // 팔다리는 가는 원통이라 윤기가 세면 쇠파이프처럼 번들거린다. 몸보다 훨씬 덜 반짝이게.
  limb: { roughness: .52, clearcoat: .22, clearcoatRoughness: .5, envMapIntensity: .55 },
  cloth: { roughness: .86, clearcoat: 0 },
  gold: { roughness: .3, metalness: .85, clearcoat: .3, clearcoatRoughness: .2 },
  matte: { roughness: .68, clearcoat: 0 },
};
export const material = kind => new THREE.MeshPhysicalMaterial({ vertexColors: true, ...(LOOK[kind] || LOOK.matte) });

// 정면에서 본 (x, y) 자리의 표면 점과 법선. 높이표를 두 방향으로 이어 읽는다.
function surfaceOf({ x0, y0, step, nx, ny, z }) {
  const at = (i, j) => (i < 0 || j < 0 || i >= nx || j >= ny ? null : z[j * nx + i]);
  const height = (x, y) => {
    const u = (x - x0) / step, v = (y - y0) / step, i = Math.floor(u), j = Math.floor(v), a = at(i, j), b = at(i + 1, j), c = at(i, j + 1), d = at(i + 1, j + 1);
    if (a == null || b == null || c == null || d == null) return null;
    const s = u - i, t = v - j;
    return (a * (1 - s) + b * s) * (1 - t) + (c * (1 - s) + d * s) * t;
  };
  return (x, y) => {
    const h = height(x, y);
    if (h == null) return null;
    const e = step, l = height(x - e, y) ?? h, r = height(x + e, y) ?? h, d = height(x, y - e) ?? h, u = height(x, y + e) ?? h;
    const gx = (l - r) / (2 * e), gy = (d - u) / (2 * e), k = 1 / Math.hypot(gx, gy, 1);
    return { p: [x, y, h], n: [gx * k, gy * k, k] };
  };
}

// glb에는 자리·법선·색이 정수로 눌려 있고 배율은 노드에 적혀 있다. 읽자마자 배율을 먹인 실수 배열로 풀어 둔다.
function plain(source, matrix) {
  const g = new THREE.BufferGeometry(), v = new THREE.Vector3();
  for (const name of ['position', 'normal', 'color']) {
    const from = source.attributes[name], to = new Float32Array(from.count * 3);
    for (let i = 0; i < from.count; i++) {
      v.fromBufferAttribute(from, i);
      if (name === 'position') v.applyMatrix4(matrix); else if (name === 'normal') v.normalize();
      v.toArray(to, i * 3);
    }
    g.setAttribute(name, new THREE.BufferAttribute(to, 3));
  }
  g.setIndex(source.index); g.computeBoundingSphere();
  return g;
}

async function load(id) {
  const [gltf, grid] = await Promise.all([
    new GLTFLoader().loadAsync(new URL(id + '.glb', base).href),
    fetch(new URL(id + '.json', base)).then(r => r.json()),
  ]);
  const parts = {};
  gltf.scene.updateMatrixWorld(true);
  for (const name of ['body', 'hand', 'foot']) {
    const node = gltf.scene.getObjectByName(name), list = parts[name] = [];
    node.traverse(o => { if (o.isMesh) list.push({ geometry: plain(o.geometry, o.matrixWorld), kind: o.material.name }); });
  }
  store.set(id, { parts, shape: { surface: surfaceOf(grid) } });
}

// 인형은 만들 때 바로 몸이 있어야 하므로, 이 모듈을 읽는 쪽은 모델이 다 올 때까지 기다린다.
await Promise.all(BUILT.map(id => load(id).catch(error => console.warn('모델을 못 읽어 옛 몸으로 그려요:', id, error))));

export const built = id => store.get(id) || null;
// 한 덩어리를 인형 하나 몫으로 찍어낸다. 재질은 인형마다 따로 둔다(맞을 때 번쩍임).
export function stamp(model, name, materials, flashers) {
  const group = new THREE.Group();
  for (const { geometry, kind } of model.parts[name]) {
    let m = materials[kind];
    if (!m) { m = materials[kind] = material(kind); flashers.push(m); }
    const mesh = new THREE.Mesh(geometry, m); mesh.castShadow = true; group.add(mesh);
  }
  return group;
}
