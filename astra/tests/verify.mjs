// No dependencies. Actual Three.js geometry/raycasting + simulated DOM/renderer.
// This checks game logic; it intentionally does not claim WebGL/browser coverage.
import assert from 'node:assert/strict';
import {readPNG} from './png.mjs';
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
  getContext(){return {drawImage:image=>this.image=image,getImageData:()=>({data:this.image.pixels})};}
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
const context=vm.createContext({console:{...console,error:(...e)=>errors.push(e.map(v=>v?.stack||v).join(' '))},document,location:{search:''},innerWidth:1280,innerHeight:720,devicePixelRatio:1,performance:clock,URLSearchParams,URL,Blob,setTimeout,Math,Set,Map,Array,Float32Array,Uint16Array,Uint32Array,Int32Array,Uint8Array,Uint8ClampedArray,Int16Array,Int8Array,Float64Array,ArrayBuffer,DataView,Number,JSON,Promise,Error,requestAnimationFrame(callback){nextFrame=callback;},localStorage:{getItem:key=>stored.get(key)??null,setItem:(key,value)=>stored.set(key,value)},fetch:async url=>({ok:true,json:async()=>JSON.parse(await fs.readFile(path.resolve(root,'astra',url),'utf8'))})});
context.window=context;context.addEventListener=()=>{};
const cache=new Map();
async function load(file){
  file=path.resolve(file);if(cache.has(file))return cache.get(file);
  // Cache the pending load BEFORE reading: concurrent imports must share module identity.
  const pending=(async()=>{
    const module=new vm.SourceTextModule(await fs.readFile(file,'utf8'),{context,identifier:file});
    await module.link((specifier,parent)=>load(path.resolve(path.dirname(parent.identifier),specifier.split('?')[0])));return module;
  })();cache.set(file,pending);return pending;
}
const three=await load(path.join(root,'vendor/three.module.js'));await three.evaluate();
const T=three.namespace;
class Renderer {
  constructor({canvas}){this.domElement=canvas;this.shadowMap={};this.info={render:{calls:0}};}
  setPixelRatio(){}setSize(){}getDrawingBufferSize(v){return v.set(1280,720);}setRenderTarget(){}
  render(scene,camera){scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);}
}
class TextureLoader {
  load(url,onLoad,onProgress,onError){const map=new T.Texture();readPNG(path.resolve(root,'astra',url)).then(image=>{map.image=image;onLoad(map);}).catch(onError);return map;}
}
const exports=Object.keys(T);
const replacement=new vm.SyntheticModule(exports,function(){exports.forEach(name=>this.setExport(name,name==='WebGLRenderer'?Renderer:name==='TextureLoader'?TextureLoader:T[name]));},{context});
await replacement.link(()=>{});await replacement.evaluate();cache.set(path.join(root,'vendor/three.module.js'),replacement);
const main=await load(path.join(root,'astra/main.js'));await main.evaluate();
for(let i=0;i<100&&!context.ASTRA?.bank.ready;i++)await new Promise(resolve=>setTimeout(resolve,10));
assert.deepEqual(errors,[],'initialization errors');assert(context.ASTRA,'debug handle initialized');
const A=context.ASTRA;await Promise.all(A.world.spriteLoads);A.setManual(true);assert(A.bank.ready);
const spriteModule=await load(path.join(root,'astra/sprites.js'));await spriteModule.evaluate();
const {ENEMY_ART,WEAPON_ART,animateEnemy}=spriteModule.namespace;
const projectedHeight=model=>{
  model.updateWorldMatrix(true,true);
  const body=model.userData.body,center=model.userData.anchor==='center';
  const bottom=body.localToWorld(new T.Vector3(0,center?-.5:0,0)).project(A.world.camera);
  const top=body.localToWorld(new T.Vector3(0,center?.5:1,0)).project(A.world.camera);
  return Math.abs(top.y-bottom.y)/2;
};
// Every source frame is decoded, cached and alpha-tested before simulation begins.
for(const [type,art] of Object.entries(ENEMY_ART)){
  const enemy=A.spawn(type,{progress:.7}),data=enemy.model.userData;
  assert.equal(data.maps.length,art.frames.length);assert.equal(data.anchor,art.anchor);
  for(const map of data.maps){assert(map.image.width>0);assert(map.userData.pixels.some((v,i)=>i%4===3&&v===0));}
  assert.equal(data.body.geometry.type,'PlaneGeometry');assert.equal(data.body.material.transparent,false);
  assert(data.body.material.depthWrite&&data.body.material.depthTest&&data.body.material.alphaTest>0);
  animateEnemy(enemy.model,A.world.camera,0,0);const first=data.body.material.map;
  animateEnemy(enemy.model,A.world.camera,.21,0,.8);
  assert.equal(data.body.material.map,data.maps[art.frames.length===2?1:0]);
  assert(data.body.material.color.g<1,'damage tints the image');
  if(art.frames.length===2)assert.notEqual(first,data.body.material.map);
}
A.start();
const front=A.spawn('fries',{progress:.8});front.model.updateWorldMatrix(true,true);
const body=front.model.userData.body;
const corner=body.localToWorld(new T.Vector3(-.49,.99,0)).project(A.world.camera);
const ray=new T.Raycaster();ray.setFromCamera(new T.Vector2(corner.x,corner.y),A.world.camera);
const transparentHits=[];body.raycast(ray,transparentHits);assert.equal(transparentHits.length,0,'transparent PNG corner does not absorb shots');
const shared=body.material.map;let disposed=false;body.material.addEventListener('dispose',()=>disposed=true);
A.damage(front,100);assert(A.world.deaths.some(d=>d.model===front.model));const rotation=front.model.quaternion.clone();
A.step(.1);assert(!front.model.quaternion.equals(rotation),'death rotates before removal');A.step(.5);assert(disposed);assert.equal(front.model.parent,null);
const another=A.spawn('fries',{progress:.8});assert.equal(another.model.userData.maps[0],shared,'per-actor cleanup preserves cached textures');
for(let tier=0;tier<12;tier++){
  A.world.buildGun(tier);A.world.scene.updateMatrixWorld(true);
  assert.equal(A.world.gun.parent,A.world.camera);assert.equal(A.world.gun.userData.body.material.map.userData.key,WEAPON_ART[tier]);
  assert.equal(A.world.gun.userData.body.material.depthTest,false);
  const tip=A.world.gunMuzzle.getWorldPosition(new T.Vector3()).project(A.world.camera);
  assert(Math.abs(tip.x)<1&&Math.abs(tip.y)<1,'muzzle stays inside the view');
}
A.start();const trap=A.world.spawnTrap();await Promise.all(A.world.spriteLoads);A.world.scene.updateMatrixWorld(true);
const lock=trap.lock.localToWorld(new T.Vector3(0,.5,0)).project(A.world.camera);
assert.equal(A.world.pick((lock.x+1)*640,(1-lock.y)*360,[]).prop,trap,'lock sprite can be shot');
const rewardScore=A.state.score;A.shot((lock.x+1)*640,(1-lock.y)*360);assert.equal(A.state.score,rewardScore+250);assert.equal(A.world.props.length,0);
assert.equal(A.world.rewards.at(-1).model.children[0].material.map.userData.key,'item_gcgr');
A.start();assert.equal(A.world.rewards.length,0);assert.equal(A.world.deaths.length,0);
console.log('PASS: 13 two-frame enemies, 3 bosses, real PNG alpha picking, tint/death cleanup, 12 weapons, lock reward and shared textures');
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
assert.equal(A.world.terrain.mode,'plate');assert.equal(A.world.scene.background,null);assert(!A.world.target,'direct render has no full-frame post target');
for(let i=0;i<20;i++)A.world.burst(new T.Vector3(),0xffcc88,45);
assert(A.world.particles.length<=128,'instanced spark pool has a hard cap');
A.world.remove(near.model);assert(!A.world.contacts.has(near.model),'enemy removal frees contact shadow');
console.log(`PASS: real rAF adaptive quality, recovery, approach shadows, instancing (${sceneryDraws} draw objects including two enemies)`);
// Exercise actual ray intersections: a projected center must damage its 3D model.
A.start();A.step(.1);
const target=A.spawn('burger',{lane:0,progress:.7});A.step(.02);
await Promise.all(A.world.spriteLoads);const position=A.project(target);const hp=target.hp;A.shot(position.x,position.y);assert(target.hp<hp,'real Three.js raycast hits a target');assert.equal(A.state.hits,1);
// Boss weak-point raycast doubles the initial 1-damage slingshot shot.
A.start();const syrup=A.spawn('syrup',{lane:0,progress:.65});A.step(.02);await Promise.all(A.world.spriteLoads);
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
// Every plate is available; legacy terrain remains a separately tested fallback.
elements.get('restart').click();
assert.equal(elements.get('map-list').children.length,7);
assert.equal(elements.get('map-pending').children.length,0);
const plateModule=await load(path.join(root,'astra/plate.js'));await plateModule.evaluate();
const {groundPoint,routeDocument,validateRoutes}=plateModule.namespace;
const scaleReport=[];
for(const map of A.MAPS){
  elements.get('restart').click();
  const previous=A.world.terrain.root;
  elements.get('map-list').children.find(b=>b.dataset.map===map.key).click();
  assert.equal(A.state.map,map.key);assert.equal(previous.parent,null);
  elements.get('start').click();assert.equal(A.state.phase,'guide');
  assert.equal(elements.get('brief-title').textContent,map.title[0]);
  elements.get('deploy').click();assert.equal(A.state.phase,'combat');
  assert.equal(elements.get('core-label').textContent,map.core[0]);
  const scaleProbe=A.spawn('fries',{progress:.5});
  scaleProbe.model.position.copy(groundPoint(A.world.camera,map.actors.at));scaleProbe.model.scale.setScalar(A.world.actorScale);
  assert(Math.abs(projectedHeight(scaleProbe.model)-.15)<1e-6,`${map.key}: calibrated regular enemy is 15% tall`);
  A.damage(scaleProbe,100);A.start();
  const heights=[.1,.55,.99].map(progress=>{const e=A.spawn('fries',{progress});const h=projectedHeight(e.model);A.damage(e,100);return h;});
  assert(heights[2]>=.12&&heights[2]<=.18,`${map.key}: foreground height ${heights[2]}`);
  assert(heights[2]>heights[1]&&heights[1]>heights[0],`${map.key}: depth produces increasing screen size`);
  scaleReport.push({map:map.key,far:heights[0],middle:heights[1],foreground:heights[2]});
  A.start();
  const terrain=A.world.terrain,routes=terrain.routes;
  assert.equal(terrain.mode,'plate');assert.equal(routes.items.length,map.routes.length);
  for(const route of routes.items){
    const screen=map.routes.find(r=>r.id===route.id);
    assert(routes.sample(route.id,0).distanceTo(groundPoint(A.world.camera,screen.points[0]))<1e-7);
    assert(routes.sample(route.id,1).distanceTo(groundPoint(A.world.camera,map.trunk.at(-1)||screen.points.at(-1)))<1e-7);
    // All traced control points round-trip through the fixed camera, including far spawn points.
    for(const xy of screen.points){const p=groundPoint(A.world.camera,xy).project(A.world.camera);assert(Math.hypot((p.x+1)/2-xy[0],(1-p.y)/2-xy[1])<1e-7);}
    for(const progress of [.05,.35,.65,.9]){
      const ground=A.spawn('fries',{routeId:route.id,progress}),air=A.spawn('wing',{routeId:route.id,progress});
      const p=routes.sample(route.id,progress);
      assert(Math.hypot(ground.model.position.x-p.x,ground.model.position.z-p.z)<1e-7);
      assert(air.model.position.y-ground.model.position.y>2);
      A.world.remove(ground.model);A.world.remove(air.model);
    }
    if(map.trunk.length){const junction=route.branchLength/route.length;assert(routes.sample(route.id,junction-.00001).distanceTo(routes.sample(route.id,junction+.00001))<.05);}
  }
  if(map.topology==='parallel')assert(routes.sample(routes.items[0].id,1).distanceTo(routes.sample(routes.items[1].id,1))>4);
  if(map.topology==='radial')for(const r of routes.items)assert(routes.sample(r.id,1).distanceTo(routes.sample(routes.items[0].id,1))<1e-7);
  for(const name of ['liver','pancreas']){const p=A.world[name].position.clone().project(A.world.camera),xy=map.organs[name].at;assert(Math.hypot((p.x+1)/2-xy[0],(1-p.y)/2-xy[1])<1e-7);}
  const camera=A.world.camera.matrixWorld.clone();A.step(.2);assert.deepEqual(A.world.camera.matrixWorld.elements,camera.elements,'plate alignment survives animation');
  const masks=terrain.occluders.length,targets=terrain.landmarks.filter(l=>l.maxHp).length;
  A.world.setQuality(3);assert.equal(terrain.occluders.length,masks);assert.equal(terrain.landmarks.filter(l=>l.maxHp).length,targets);A.world.setQuality(0);
  assert(masks>=2);assert(terrain.occluders.every(m=>m.material.colorWrite===false&&m.material.depthWrite));
  // Actual depth-only raycasting: the same screen-space target is hittable in front, hidden behind.
  const mask=terrain.occluders[0],g=mask.geometry,tri=[0,1,2].map(i=>new T.Vector3().fromBufferAttribute(g.attributes.position,g.index.getX(i)));
  const center=tri.reduce((sum,p)=>sum.add(p),new T.Vector3()).multiplyScalar(1/3),ndc=center.clone().project(A.world.camera);
  const direction=center.clone().sub(A.world.camera.position).normalize(),depth=center.distanceTo(A.world.camera.position);
  const probe={model:new T.Mesh(new T.SphereGeometry(.5,8,6),new T.MeshBasicMaterial())};
  A.world.scene.add(probe.model);probe.model.position.copy(A.world.camera.position).addScaledVector(direction,depth*.25);
  assert.equal(A.world.pick((ndc.x+1)*640,(1-ndc.y)*360,[probe]).enemy,probe);
  probe.model.position.copy(A.world.camera.position).addScaledVector(direction,depth*2);
  assert.equal(A.world.pick((ndc.x+1)*640,(1-ndc.y)*360,[probe]).occluded,true);
  probe.model.removeFromParent();probe.model.geometry.dispose();probe.model.material.dispose();
  elements.get('routes-toggle').click();assert(terrain.debug.visible);elements.get('routes-toggle').click();assert(!terrain.debug.visible);
  A.start();const parent=A.spawn('cancer',{routeId:routes.items.at(-1).id,progress:.61});A.damage(parent,100);
  const fragments=A.enemies.filter(e=>e.type==='fragment');assert.equal(fragments.length,3);assert(fragments.every(e=>e.routeId===parent.routeId));
  A.start();A.step(.02);
  for(const landmark of A.world.terrain.landmarks.filter(l=>l.maxHp)){
    // Find a visible lobe using the real pick path, never bypass occlusion.
    let aim;
    const rect=elements.get('stage').getBoundingClientRect();
    for(let yi=0;yi<10&&!aim;yi++)for(let xi=0;xi<10&&!aim;xi++){
      const x=(landmark.at[0]+(xi/9-.5)*landmark.size[0])*rect.width,y=(landmark.at[1]-yi/10*landmark.size[1])*rect.height;
      if(A.world.pick(x,y,A.enemies).landmark===landmark)aim={x,y};
    }
    assert(aim,`${map.key}: plaque/mound has an exposed hittable surface`);
    const initial=landmark.hp;A.state.cooldown=0;A.shot(aim.x,aim.y);assert(landmark.hp<initial);
    const score=A.state.score;let shots=0;
    while(!landmark.dead&&shots++<50){A.state.cooldown=0;A.state.ammo[0]=9;A.state.reload=0;A.shot(aim.x,aim.y);}
    assert(landmark.dead);assert.equal(A.state.score,score+250);
  }
  A.start();A.state.difficulty='mid';let ticks=0;
  while(A.state.phase!=='result'&&ticks++<4000){
    if(A.state.phase==='quiz'){A.state.selection=A.state.quiz.correct;A.answerQuiz();A.continueQuiz();}
    else{const enemy=[...A.enemies].sort((a,b)=>b.progress-a.progress)[0];if(enemy){const p=A.project(enemy);if(p.visible)A.shot(p.x,p.y);}A.step(.1);}
  }
  assert(A.state.victory,`${map.key}: all three waves must remain winnable (core ${A.state.core}, bosses ${A.state.killedBosses})`);
  // Editor pauses game clocks, moves controls, validates topology, persists and reloads per map.
  A.start();const editor=A.editor;editor.toggle(true);const before=A.state.waveTime;A.step(2);assert.equal(A.state.waveTime,before);
  editor.selected={path:0,index:1};const old=cloneDoc(editor.doc);assert(editor.move([old.routes[0].points[1][0]+.002,old.routes[0].points[1][1]+.002]));assert(editor.save());
  const saved=stored.get(`astra_routes_${map.key}`);assert(saved);editor.toggle(false);A.start();assert.equal(JSON.stringify(A.world.terrain.document),saved);
  editor.toggle(true);
  // UI insertion/removal and undo preserve endpoints and the selected branch.
  const count=editor.doc.routes[0].points.length;editor.selected={path:0,index:1};
  const p0=editor.doc.routes[0].points[1],p1=editor.doc.routes[0].points[2];
  editor.pointerDown({button:0,target:{dataset:{}},shiftKey:true,clientX:(p0[0]+p1[0])*640,clientY:(p0[1]+p1[1])*360,preventDefault(){}});
  assert.equal(editor.doc.routes[0].points.length,count+1);editor.remove();assert.equal(editor.doc.routes[0].points.length,count);editor.undo();assert.equal(editor.doc.routes[0].points.length,count+1);
  editor.replace(old);
  if(old.trunk.length){editor.selected={path:0,index:old.routes[0].points.length-1};const join=old.trunk[0].map((v,i)=>v+(i?.001:0));assert(editor.move(join));assert(editor.doc.routes.every(r=>r.points.at(-1).every((v,i)=>v===editor.doc.trunk[0][i])));}
  if(old.topology==='radial'){editor.selected={path:0,index:old.routes[0].points.length-1};const end=old.routes[0].points.at(-1).map((v,i)=>v+(i?.001:0));assert(editor.move(end));assert(editor.doc.routes.every(r=>r.points.at(-1).every((v,i)=>v===end[i])));}
  editor.replace(old);assert.equal(editor.exportJSON(),JSON.stringify(editor.doc,null,2));
  const setter=context.localStorage.setItem;context.localStorage.setItem=()=>{throw new Error('quota denied');};assert.equal(editor.save(),false);context.localStorage.setItem=setter;
  editor.save();editor.toggle(false);
  const bad=cloneDoc(old);bad.routes[0].points[0]=[NaN,2];assert.throws(()=>validateRoutes(map,bad,A.world.camera));
  stored.set(`astra_routes_${map.key}`,'{invalid');A.start();assert.equal(A.world.terrain.storageStatus.startsWith('default'),true);stored.delete(`astra_routes_${map.key}`);
  console.log(`PASS: ${map.key}: ${map.routes.map(r=>r.points.length).join('+')} + trunk ${map.trunk.length}; projection, organs, occlusion, raycast obstacles, all bosses, editor storage`);
}
function cloneDoc(doc){return JSON.parse(JSON.stringify(doc));}
// Original three procedural worlds remain intact when plate is absent.
for(const map of A.MAPS.filter(m=>m.legacy.ready)){
  elements.get('restart').click();A.selectMap(map.key);const plate=map.plate;delete map.plate;
  A.world.selectMap(map.key);assert(A.world.terrain.fat.count>1000);assert(A.world.scene.background);A.step(.1);
  map.plate=plate;A.world.selectMap(map.key);
}
assert.deepEqual(errors,[]);
await fs.writeFile(path.join(root,'astra/tests/sprite-scale-report.json'),JSON.stringify(scaleReport,null,2)+'\n');
console.log('ALL LOGIC CHECKS PASSED (WebGL rendering and browser layout require a real browser)');
