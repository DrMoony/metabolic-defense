// 만화(코믹스) 화풍: 굵은 먹선 외곽선, 명암을 몇 단으로 끊는 셀 음영, 인쇄 망점.
// 주소에 ?comic=0을 붙이면 예전 매끈한 3D 화풍으로 돌아간다(비교용).
import * as THREE from '../../vendor/three.module.js';

export const COMIC = typeof location === 'object' ? new URLSearchParams(location.search).get('comic') !== '0' : true;
export const INK = '#120a12';

// 셀 음영 단계: 그늘 · 중간 · 밝은 면. 가까운 값만 골라 쓰게(NearestFilter) 해서 경계가 딱 끊긴다.
const ramp = (() => {
  const t = new THREE.DataTexture(new Uint8Array([80, 80, 80, 255, 175, 175, 175, 255, 255, 255, 255, 255]), 3, 1);
  t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true;
  return t;
})();

// 재질 설정(MeshPhysical용)을 받아 만화풍이면 셀 음영 재질로 바꿔 준다. 금속·유리는 반짝임 대신 밝기로 살린다.
// 그늘진 면에는 인쇄 망점을 찍는다. 빛을 덜 받을수록 점이 커진다(점 간격은 setView가 화면 크기에 맞춘다).
const dotSize = { value: 5.5 };
function halftone(shader) {
  shader.uniforms.uDot = dotSize;
  shader.fragmentShader = shader.fragmentShader.replace('void main() {', 'uniform float uDot;\nvoid main() {').replace('#include <opaque_fragment>', `
    float lit = dot(reflectedLight.directDiffuse, vec3(.333)) / max(dot(diffuseColor.rgb, vec3(.333)), .02);
    vec2 hp = mat2(.7071, -.7071, .7071, .7071) * gl_FragCoord.xy / uDot;
    float hr = clamp((1.15 - lit) * .42, 0., .44), hd = 1. - smoothstep(hr - .07, hr + .07, length(fract(hp) - .5));
    outgoingLight *= 1. - hd * .42;
    #include <opaque_fragment>`);
}
export function toonOf(options) {
  const { roughness, metalness, clearcoat, clearcoatRoughness, envMapIntensity, ...rest } = options;
  const m = new THREE.MeshToonMaterial({ gradientMap: ramp, ...rest });
  if (metalness > .5) m.color.setScalar(1.25);
  m.onBeforeCompile = halftone; m.customProgramCacheKey = () => 'comic-dots';
  return m;
}

// 먹선: 뒷면만 그리고 화면 기준으로 일정한 굵기(px)만큼 바깥으로 밀어낸다. 몸이 커도 작아도 선 굵기가 같다.
const inkMaterial = new THREE.ShaderMaterial({
  uniforms: { uWidth: { value: 3.2 }, uView: { value: new THREE.Vector2(1280, 720) }, uColor: { value: new THREE.Color(INK) } },
  vertexShader: `uniform float uWidth; uniform vec2 uView;
    void main() {
      vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.);
      vec3 n = normalize(normalMatrix * normal);
      vec2 dir = (projectionMatrix * vec4(n, 0.)).xy;
      float len = length(dir);
      if (len > 1e-4) clip.xy += dir / len * uWidth * 2. / uView * clip.w;
      gl_Position = clip;
    }`,
  fragmentShader: 'uniform vec3 uColor; void main() { gl_FragColor = vec4(uColor, 1.); }',
  side: THREE.BackSide,
});
// 면이 안쪽을 향하게 감긴 관(팔다리 호스)은 반대쪽 면으로 그려야 먹선이 뒤로 숨는다. 굵기 값은 함께 쓴다.
const inkInside = new THREE.ShaderMaterial({ uniforms: inkMaterial.uniforms, vertexShader: inkMaterial.vertexShader, fragmentShader: inkMaterial.fragmentShader, side: THREE.FrontSide });
// w·h는 실제 그리는 화소 크기. 선 굵기는 720줄 화면에서 4.4px, 망점 간격은 5.5px이 되게 맞춘다.
export function setView(w, h) { inkMaterial.uniforms.uView.value.set(w, h); inkMaterial.uniforms.uWidth.value = 4.4 * h / 720; dotSize.value = 5.5 * h / 720; }

// root 아래 메시마다 같은 모양을 공유하는 먹선 메시를 붙인다(팔다리처럼 매 프레임 모양이 바뀌어도 그대로 따라간다).
// skip(mesh)이 참이면 건너뛴다(얼굴 그림처럼 표면에 붙은 얇은 조각).
export function outline(root, skip = () => false) {
  if (!COMIC) return;
  const list = [];
  root.traverse(o => { if (o.isMesh && !o.userData.ink && !skip(o) && o.geometry.attributes.normal) list.push(o); });
  for (const mesh of list) {
    const ink = new THREE.Mesh(mesh.geometry, mesh.userData.inside ? inkInside : inkMaterial);
    ink.userData.ink = true; ink.frustumCulled = false; ink.castShadow = false; ink.renderOrder = mesh.renderOrder;
    mesh.add(ink);
  }
}
