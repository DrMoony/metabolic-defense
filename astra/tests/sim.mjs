// 난이도 흐름 시뮬레이션. 부트스트랩(하니스)은 verify.mjs 1~65행과 동일하게 유지한다.
// 실행: node --experimental-vm-modules astra/tests/sim.mjs --maps=coronary --diffs=easy,mid,hard --personas=novice,average,expert --seeds=2
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
context.window=context;context.listeners={};context.addEventListener=(name,handler)=>{context.listeners[name]=handler;};
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

// ---------------- 시뮬레이션 본체 ----------------
const args=Object.fromEntries(process.argv.slice(2).map(a=>a.replace(/^--/,'').split('=')));
const MAPS=(args.maps||'coronary')==='all'?A.MAPS.map(m=>m.key):(args.maps||'coronary').split(',');
const DIFFS=(args.diffs||'easy,mid,hard').split(',');
const SEEDS=Number(args.seeds||2);
const OUT=args.out||'';
// --tune='{"hard":{"hp":1.25,"ramp":.6}}' 난이도 배율 덮어쓰기, --panc='{"drain":1.4}' 췌장 수지 덮어쓰기
if(args.tune)for(const [k,v] of Object.entries(JSON.parse(args.tune)))Object.assign(A.DIFFICULTY[k],v);
if(args.panc)Object.assign(A.PANCREAS,JSON.parse(args.panc));
// 가상 플레이어: 조준 오차(σ px, 720p 기준) · 재조준 반응 · 클릭 간격 하한 · 퀴즈 정답률 · 보급/덫 사격 확률
const PERSONAS={
  novice:{sigma:42,react:.55,clickCap:.30,quiz:.5,pickup:.35},
  average:{sigma:24,react:.30,clickCap:.20,quiz:.7,pickup:.7},
  expert:{sigma:10,react:.15,clickCap:.15,quiz:.9,pickup:.95},
  afk:{sigma:0,react:1,clickCap:1e9,quiz:0,pickup:0},   // 대조군: 아무것도 안 쏨
};
const PERSONA_KEYS=(args.personas||'novice,average,expert').split(',');
function seeded(seed){let s=(seed*2654435761)>>>0||1;return()=>{s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;return s/4294967296;};}
function gauss(r){let u=0,v=0;while(!u)u=r();while(!v)v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);}

function run(map,diff,personaName,seed){
  const P=PERSONAS[personaName];const r=seeded(seed*7919+map.length*31+diff.length);Math.random=r;
  A.state.difficulty=diff;A.selectMap(map);A.start();
  const S=A.state;const log={map,diff,persona:personaName,seed,waves:[],quiz:{ok:0,total:0}};
  let target=null,retargetAt=0,nextClick=0,nextPickup=0,t=0,lastCore=S.core,leak=0,maxEnemies=0,quizAt=0,lastWave=0,minCore=S.core;
  let waveStart={leak:0,t:0,shots:0,hits:0},bossSpawn=null,bossKill=null;
  const TICK=.1;
  const record=()=>{log.waves.push({wave:lastWave+1,core:Math.round(S.core),leak:Math.round(leak-waveStart.leak),dur:Math.round(t-waveStart.t),weapon:S.unlocked,liver:Math.round(S.liver),panc:Math.round(S.pancreas),bossTTK:bossKill!==null&&bossSpawn!==null?Math.round((bossKill-bossSpawn)*10)/10:null,acc:S.shots-waveStart.shots?Math.round((S.hits-waveStart.hits)/(S.shots-waveStart.shots)*100):0});waveStart={leak,t,shots:S.shots,hits:S.hits};bossSpawn=bossKill=null;};
  const pickTarget=()=>{
    const alive=A.enemies.filter(e=>!e.dead&&!e.cloaked);if(!alive.length)return null;
    const boss=alive.find(e=>e.waveBoss);
    const sorted=alive.sort((a,b)=>b.progress-a.progress);
    // 보스가 중반을 넘으면 보스 우선, 아니면 가장 앞선 적
    if(boss&&boss.progress>.4)return boss;
    return sorted[0];
  };
  while(S.phase==='combat'||S.phase==='quiz'){
    if(S.phase==='combat'){
      if(S.wave!==lastWave){record();lastWave=S.wave;}
      const boss=A.enemies.find(e=>e.waveBoss);
      if(boss&&bossSpawn===null)bossSpawn=t;
      if(bossSpawn!==null&&bossKill===null&&S.killedBosses.includes(A.WAVES[S.wave].boss))bossKill=t;
      if(t>=retargetAt){target=pickTarget();retargetAt=t+P.react;}
      if(target&&(target.dead||!A.enemies.includes(target)))target=null;
      if(t>=nextPickup){nextPickup=t+1.2;const prop=A.world.props.find(p=>p.lock);if(prop&&r()<P.pickup&&S.cooldown<=0&&S.reload<=0){const pos=A.world.project(prop.lock,0);if(pos.visible){A.shot(pos.x+gauss(r)*P.sigma*.6,pos.y+gauss(r)*P.sigma*.6);nextClick=t+P.clickCap;}}}
      if(target&&t>=nextClick&&S.cooldown<=0&&S.reload<=0){
        const pos=A.world.project(target.model);
        if(pos.visible){A.shot(pos.x+gauss(r)*P.sigma,pos.y+gauss(r)*P.sigma);nextClick=t+P.clickCap;}
      }
      maxEnemies=Math.max(maxEnemies,A.enemies.length);
    }else if(S.phase==='quiz'&&!S.answered){
      if(!quizAt)quizAt=t+3+r()*5;
      else if(t>=quizAt){const ok=r()<P.quiz;S.selection=ok?S.quiz.correct:(S.quiz.correct+1+Math.floor(r()*3))%4;A.answerQuiz();log.quiz.total++;if(ok)log.quiz.ok++;quizAt=t;}
    }else if(S.phase==='quiz'&&S.answered&&t>=quizAt+2){A.continueQuiz();quizAt=0;}
    A.step(TICK);t+=TICK;
    if(S.phase==='combat'){const d=S.core-lastCore;if(d<0)leak-=d;}
    lastCore=S.core;minCore=Math.min(minCore,S.core);
    if(t>1200)break;
  }
  record();
  Object.assign(log,{result:S.victory?'WIN':'LOSS',core:Math.round(S.core),minCore:Math.round(minCore),wave:S.wave+1,time:Math.round(S.elapsed),bosses:S.killedBosses.length,weapon:S.unlocked,liver:Math.round(S.liver),pancFail:S.failed,maxEnemies,acc:S.shots?Math.round(S.hits/S.shots*100):0,shots:S.shots,score:S.score});
  return log;
}

const results=[];
const started=Date.now();
for(const map of MAPS)for(const diff of DIFFS)for(const persona of PERSONA_KEYS)for(let seed=1;seed<=SEEDS;seed++){
  const log=run(map,diff,persona,seed);results.push(log);
  console.log(`${map.padEnd(10)} ${diff.padEnd(4)} ${persona.padEnd(7)} s${seed} ${log.result.padEnd(4)} wave ${log.wave}/5 core ${String(log.core).padStart(3)} min ${String(log.minCore).padStart(3)} weapon ${String(log.weapon).padStart(2)} liver ${String(log.liver).padStart(3)} acc ${log.acc}% quiz ${log.quiz.ok}/${log.quiz.total} panc ${log.pancFail?'FAIL':'ok'} max ${log.maxEnemies} t ${log.time}s | `+log.waves.map(w=>`W${w.wave}:${w.core}(-${w.leak})${w.bossTTK!==null?' b'+w.bossTTK+'s':''}`).join(' '));
}
console.log(`elapsed ${Math.round((Date.now()-started)/1000)}s`);
if(OUT)await fs.writeFile(OUT,JSON.stringify(results,null,1));
