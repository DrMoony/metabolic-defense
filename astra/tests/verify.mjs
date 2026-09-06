// No dependencies. Actual Three.js geometry/raycasting + simulated DOM/renderer.
// This checks game logic; it intentionally does not claim WebGL/browser coverage.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const stored=new Map();
class Classes {
  constructor(){this.values=new Set();}
  add(...names){names.forEach(n=>this.values.add(n));}
  remove(...names){names.forEach(n=>this.values.delete(n));}
  toggle(n,value){const on=value??!this.values.has(n);on?this.values.add(n):this.values.delete(n);return on;}
  contains(n){return this.values.has(n);}
}
class Element {
  constructor(tag='div'){this.tagName=tag;this.children=[];this.style={};this.dataset={};this.classList=new Classes();this.listeners={};this.disabled=false;this.textContent='';this.value='';}
  append(...nodes){this.children.push(...nodes);}
  addEventListener(name,handler){this.listeners[name]=handler;}
  replaceChildren(...nodes){this.children=[...nodes];}
  getBoundingClientRect(){return {left:0,top:0,width:1280,height:720};}
  click(){if(!this.disabled){this.onclick?.();this.listeners.click?.();}}
}
const html=await fs.readFile(path.join(root,'astra/index.html'),'utf8');
const elements=new Map([...html.matchAll(/id="([^"]+)"/g)].map(m=>[m[1],new Element()]));
const attributes={};
for(const name of ['i18n','lang','diff']){
  attributes[name]=[...html.matchAll(new RegExp(`data-${name}="([^"]+)"`,'g'))].map(m=>{const e=new Element();e.dataset[name]=m[1];return e;});
}
const title=new Element('h1');
const document={getElementById:id=>elements.get(id),documentElement:{lang:'ko'},addEventListener(){},querySelector:()=>title,querySelectorAll:selector=>attributes[selector.slice(6,-1)]||[],createElement:tag=>new Element(tag),hidden:false};
const errors=[];
let clockNow=0,nextFrame;
const clock={now:()=>clockNow};
const context=vm.createContext({console:{...console,error:(...e)=>errors.push(e.join(' '))},document,location:{search:''},innerWidth:1280,innerHeight:720,devicePixelRatio:1,performance:clock,URLSearchParams,Math,Set,Map,Array,Float32Array,Uint16Array,Uint32Array,Int32Array,Uint8Array,Uint8ClampedArray,Int16Array,Int8Array,Float64Array,ArrayBuffer,DataView,Number,JSON,Promise,Error,requestAnimationFrame(callback){nextFrame=callback;},localStorage:{getItem:key=>stored.get(key)??null,setItem:(key,value)=>stored.set(key,value)},fetch:async url=>({ok:true,json:async()=>JSON.parse(await fs.readFile(path.resolve(root,'astra',url),'utf8'))})});
context.window=context;context.addEventListener=()=>{};
const cache=new Map();
async function load(file){
  file=path.resolve(file);if(cache.has(file))return cache.get(file);
  const module=new vm.SourceTextModule(await fs.readFile(file,'utf8'),{context,identifier:file});cache.set(file,module);
  await module.link((specifier,parent)=>load(path.resolve(path.dirname(parent.identifier),specifier.split('?')[0])));return module;
}
const three=await load(path.join(root,'vendor/three.module.js'));await three.evaluate();
const T=three.namespace;
class Renderer {
  constructor({canvas}){this.domElement=canvas;this.shadowMap={};this.info={render:{calls:0}};}
  setPixelRatio(){}setSize(){}getDrawingBufferSize(v){return v.set(1280,720);}setRenderTarget(){}
  render(scene,camera){scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);}
}
const exports=Object.keys(T);
const replacement=new vm.SyntheticModule(exports,function(){exports.forEach(name=>this.setExport(name,name==='WebGLRenderer'?Renderer:T[name]));},{context});
await replacement.link(()=>{});await replacement.evaluate();cache.set(path.join(root,'vendor/three.module.js'),replacement);
const main=await load(path.join(root,'astra/main.js'));await main.evaluate();
for(let i=0;i<100&&!context.ASTRA?.bank.ready;i++)await new Promise(resolve=>setTimeout(resolve,10));
assert.deepEqual(errors,[],'initialization errors');assert(context.ASTRA,'debug handle initialized');
const A=context.ASTRA;A.setManual(true);assert(A.bank.ready);
assert.equal(A.bank.mix,70);assert.equal(A.bank.drug,false);
let rows=Array.from({length:10},()=>A.bank.draw('mid'));
assert.equal(rows.filter(q=>q.set==='masld').length,7);assert(rows.every(q=>q.drug!==true));assert.equal(new Set(rows.map(q=>q.id)).size,10);
const before=rows.map(q=>q.id);A.bank.reset();rows=Array.from({length:10},()=>A.bank.draw('mid'));assert(rows.every(q=>!before.includes(q.id)),'recent questions avoided');
for(const mix of [0,30,50,70,100]){A.bank.configure(mix,false);const picks=Array.from({length:10},()=>A.bank.draw('easy'));assert.equal(picks.filter(q=>q.set==='masld').length,mix/10);assert(picks.every(q=>!q.drug));}
A.bank.configure(100,true);assert(A.bank.visible('masld').some(q=>q.drug));A.bank.configure(70,false);
await A.bank.load('en');assert(A.bank.sets.masld[0].q);await A.bank.load('ko');
assert([...stored.keys()].every(k=>k.startsWith('astra_')));
console.log('PASS: shared KO/EN banks, drug exclusion/admin opt-in, exact mix, recent history, storage isolation');
// Exercise the real rAF governor with controlled wall-clock intervals, not step().
A.start();A.setManual(false);
for(let i=0;i<220;i++){clockNow+=1000/30;nextFrame(clockNow);}
assert.equal(A.world.quality,3,'sustained 30fps reduces all three quality levels');
assert.equal(A.world.renderer.shadowMap.enabled,false);
assert.equal(A.world.dust.count,8);
assert(A.performance.fps<=31);
for(let i=0;i<2700;i++){clockNow+=1000/60;nextFrame(clockNow);}
assert(A.world.quality<3,'sustained healthy frame pacing cautiously restores quality');
A.setManual(true);A.world.setQuality(0);A.start();
const near=A.spawn('fries',{lane:0,progress:.88}),far=A.spawn('fries',{lane:1,progress:.15});A.step(.1);
assert(A.world.contacts.get(near.model).material.opacity>A.world.contacts.get(far.model).material.opacity,'contact darkens as an actor approaches');
assert(near.model.scale.x>far.model.scale.x,'approach adds subtle physical scale change');
let sceneryDraws=0;A.world.scene.traverse(o=>{if(o.isMesh||o.isSprite)sceneryDraws++;});
assert(sceneryDraws<180,`batched scene stays bounded: ${sceneryDraws} draw objects with two enemies`);
assert.equal(A.world.terrain.fat.count,2100);assert(!A.world.target,'direct render has no full-frame post target');
for(let i=0;i<20;i++)A.world.burst(new T.Vector3(),0xffcc88,45);
assert(A.world.particles.length<=128,'instanced spark pool has a hard cap');
A.world.remove(near.model);assert(!A.world.contacts.has(near.model),'enemy removal frees contact shadow');
console.log(`PASS: real rAF adaptive quality, recovery, approach shadows, instancing (${sceneryDraws} draw objects including two enemies)`);
// Exercise actual ray intersections: a projected center must damage its 3D model.
A.start();A.step(.1);
const target=A.spawn('burger',{lane:0,progress:.7});A.step(.02);
const position=A.project(target);const hp=target.hp;A.shot(position.x,position.y);assert(target.hp<hp,'real Three.js raycast hits a target');assert.equal(A.state.hits,1);
// Boss weak-point raycast doubles the initial 1-damage slingshot shot.
A.start();const syrup=A.spawn('syrup',{lane:0,progress:.65});A.step(.02);
const valve=syrup.model.children.find(c=>c.userData.weak);const p=valve.getWorldPosition(new T.Vector3()).project(A.world.camera);
A.state.cooldown=0;A.shot((p.x+1)*640,(1-p.y)*360);assert.equal(syrup.hp,14,'syrup valve takes double damage');
console.log('PASS: 3D raycast hit detection and syrup weak point');
// Reload and mouse-only upgrade/swap controls.
A.start();A.state.ammo[0]=0;A.reload();assert(A.state.reload>0);A.step(2);assert.equal(A.state.ammo[0],9);
A.openQuiz();A.state.selection=A.state.quiz.correct;A.answerQuiz();assert.equal(A.state.unlocked,1);A.continueQuiz();A.swap();assert.equal(A.state.weapon,0);
A.state.difficulty='easy';A.state.ammo[0]=9;A.state.cooldown=0;A.shot(20,300);assert.equal(A.state.ammo[0],9);
console.log('PASS: reload, quiz reward, weapon switching, unlimited EASY ammunition');
// World and quiz clock freeze on pause; projectiles cannot hit behind the quiz UI.
A.openQuiz();const quizTime=A.state.quizTime,glucose=A.state.sugar;
A.pause(true);A.step(2);assert.equal(A.state.quizTime,quizTime);assert.equal(A.state.sugar,glucose);A.pause(false);
A.state.selection=null;A.step(19);assert(A.state.answered);assert.equal(A.state.correct,1);A.continueQuiz();
console.log('PASS: pause, quiz timeout and explicit answer submission');
// Full game through production input/raycast path (no debug damage or invulnerability).
A.state.difficulty='mid';A.start();let iterations=0;
while(A.state.phase!=='result'&&iterations++<4000){
  if(A.state.phase==='quiz'){
    A.state.selection=A.state.quiz.correct;A.answerQuiz();A.step(1);A.continueQuiz();
  }else{
    const target=[...A.enemies].sort((a,b)=>b.progress-a.progress)[0];
    if(target){const point=A.project(target);if(point.visible)A.shot(point.x,point.y);}
    A.step(.1);
  }
}
assert.equal(A.state.phase,'result');assert(A.state.victory,'normal mode is winnable with aimed shots');assert.equal(A.state.killedBosses.join(','),'syrup,cancer,plaque');
console.log(`PASS: all three waves and bosses via raycast shots (${A.state.elapsed.toFixed(1)}s, core ${A.state.core.toFixed(1)}, score ${A.state.score})`);
// A missed boss cannot produce a victory at the old wave timeout.
A.start();A.step(70);assert(!A.state.victory);assert(A.state.phase==='result'||A.state.wave===0);
// Failure remains permanent after a correct quiz, while overload threshold is 12 seconds.
A.start();A.state.pancreas=0;A.state.sugar=100;A.state.strain=11.9;A.state.insulin=100;A.state.pulse=100;
A.spawn('syrup',{progress:.65,lane:0});A.step(.2);assert(A.state.failed);A.openQuiz();A.state.selection=A.state.quiz.correct;A.answerQuiz();assert(A.state.failed);assert.equal(A.state.pancreas,0);
console.log('PASS: missed-boss loss and permanent pancreatic failure');
assert.deepEqual(errors,[]);
console.log('ALL LOGIC CHECKS PASSED (WebGL rendering and browser layout still require a real browser)');
