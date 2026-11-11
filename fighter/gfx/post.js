// 화면 마무리: 다 그린 화면을 그대로 떠서 밝은 곳만 번지게 하고(빛 번짐), 가장자리를 살짝 어둡게, 색 대비를 조금 올린다.
// 세게 맞는 순간에는 kick 값만큼 화면 가장자리의 색이 잠깐 갈라진다. 초상 촬영은 이 과정을 거치지 않는다.
import * as THREE from '../../vendor/three.module.js';

const VS = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }';
const BRIGHT = `uniform sampler2D tMap; uniform vec2 uPx; uniform float uCut; varying vec2 vUv;
void main() {
  vec3 c = (texture2D(tMap, vUv + uPx * vec2(1., 1.)).rgb + texture2D(tMap, vUv + uPx * vec2(-1., 1.)).rgb + texture2D(tMap, vUv + uPx * vec2(1., -1.)).rgb + texture2D(tMap, vUv + uPx * vec2(-1., -1.)).rgb) * .25;
  float l = max(c.r, max(c.g, c.b));
  gl_FragColor = vec4(c * smoothstep(uCut, uCut + .22, l), 1.);
}`;
const BLUR = `uniform sampler2D tMap; uniform vec2 uStep; varying vec2 vUv;
void main() {
  vec3 c = texture2D(tMap, vUv).rgb * .227;
  c += (texture2D(tMap, vUv + uStep * 1.385).rgb + texture2D(tMap, vUv - uStep * 1.385).rgb) * .316;
  c += (texture2D(tMap, vUv + uStep * 3.231).rgb + texture2D(tMap, vUv - uStep * 3.231).rgb) * .070;
  gl_FragColor = vec4(c, 1.);
}`;
const FINAL = `uniform sampler2D tMap, tGlow; uniform float uGlow, uVig, uSat, uCon, uKick; varying vec2 vUv;
void main() {
  vec2 d = vUv - .5; vec2 off = d * dot(d, d) * uKick * .022;
  vec3 c = vec3(texture2D(tMap, vUv + off).r, texture2D(tMap, vUv).g, texture2D(tMap, vUv - off).b);
  c = 1. - (1. - c) * (1. - texture2D(tGlow, vUv).rgb * uGlow);
  c = mix(vec3(dot(c, vec3(.299, .587, .114))), c, uSat);
  c = (c - .5) * uCon + .5;
  c *= 1. - smoothstep(.42, 1.05, length(d * vec2(1.5, 1.25))) * uVig;
  gl_FragColor = vec4(clamp(c, 0., 1.), 1.);
}`;

export class Post {
  constructor(gl) {
    this.gl = gl; this.on = true; this.kick = 0; this.size = new THREE.Vector2();
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); this.quad.frustumCulled = false;
    this.scene = new THREE.Scene(); this.scene.add(this.quad);
    const mat = (fragmentShader, uniforms) => new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader, uniforms, depthTest: false, depthWrite: false, toneMapped: false });
    this.bright = mat(BRIGHT, { tMap: { value: null }, uPx: { value: new THREE.Vector2() }, uCut: { value: .74 } });
    this.blur = mat(BLUR, { tMap: { value: null }, uStep: { value: new THREE.Vector2() } });
    this.final = mat(FINAL, { tMap: { value: null }, tGlow: { value: null }, uGlow: { value: .62 }, uVig: { value: .34 }, uSat: { value: 1.08 }, uCon: { value: 1.05 }, uKick: { value: 0 } });
  }
  fit() {
    const s = this.gl.getDrawingBufferSize(new THREE.Vector2());
    if (this.grab && s.equals(this.size)) return;
    this.size.copy(s);
    for (const t of [this.grab, this.a, this.b]) t?.dispose();
    this.grab = new THREE.FramebufferTexture(s.x, s.y); this.grab.magFilter = this.grab.minFilter = THREE.LinearFilter;
    const w = Math.max(2, s.x >> 2), h = Math.max(2, s.y >> 2), rt = () => new THREE.WebGLRenderTarget(w, h, { depthBuffer: false });
    this.a = rt(); this.b = rt(); this.low = new THREE.Vector2(1 / w, 1 / h);
  }
  pass(material, target) { this.quad.material = material; this.gl.setRenderTarget(target); this.gl.render(this.scene, this.cam); }
  render(dt = 1) {
    if (!this.on) return;
    this.fit();
    const gl = this.gl, { bright, blur, final } = this;
    gl.copyFramebufferToTexture(this.grab);
    bright.uniforms.tMap.value = this.grab; bright.uniforms.uPx.value.set(1 / this.size.x, 1 / this.size.y); this.pass(bright, this.a);
    // 좁게 한 번, 넓게 한 번 번지게 해서 속은 또렷하고 가장자리는 부드럽게.
    for (const reach of [1, 2.4]) {
      blur.uniforms.tMap.value = this.a.texture; blur.uniforms.uStep.value.set(this.low.x * reach, 0); this.pass(blur, this.b);
      blur.uniforms.tMap.value = this.b.texture; blur.uniforms.uStep.value.set(0, this.low.y * reach); this.pass(blur, this.a);
    }
    final.uniforms.tMap.value = this.grab; final.uniforms.tGlow.value = this.a.texture; final.uniforms.uKick.value = this.kick;
    this.pass(final, null);
    this.kick *= .78 ** dt; if (this.kick < .01) this.kick = 0;
  }
}
