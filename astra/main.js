import { healthColor, weaponColor } from './feedback.js?v=a15';
import { RouteEditor } from './route-editor.js?v=a15';
import { World, THREE } from './world.js?v=a15';
import { QuizBank, shuffled, storage } from './quiz.js?v=a15';

import { MAPS, getMap } from './maps/index.js?v=a15';
const $ = id => document.getElementById(id);
const show = (id, visible) => $(id).classList.toggle('hidden', !visible);
const clamp = (n, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, n));
const text = (ko, en) => state.lang === 'ko' ? ko : en;
const strings = {
  pause:['일시정지','Pause'],score:['방어 점수','DEFENSE SCORE'],core:['심장 · 콩팥 · 뇌혈관','HEART · KIDNEYS · BRAIN'],accuracy:['명중률','ACCURACY'],quiz:['퀴즈','QUIZ'],liver:['간 가디언','Liver Guardian'],pancreas:['췌장 포탑','Pancreas Turret'],reload:['재장전','Reload'],swap:['무기 교체','Switch weapon'],difficulty:['난이도','DIFFICULTY'],loading:['문제은행 불러오는 중…','Loading question banks…'],admin:['운영자 설정 ↗','Operator settings ↗'],mouse:['마우스 · 라이트건 전용 / 키보드 없이 플레이','MOUSE · LIGHTGUN / NO KEYBOARD NEEDED'],guideTitle:['몸속 방어에 오신 것을 환영합니다','Welcome to the inner frontier'],deploy:['방어선 진입 →','Enter the defense →'],adminTitle:['문제은행 운영 설정','Question bank settings'],mix:['MASLD : Clinical Obesity 비율','MASLD : Clinical Obesity ratio'],drug:['특정 약물 문항 포함 (기본: 숨김)','Include drug-specific questions (default: hidden)'],drugNote:['공정경쟁규약을 고려해 기본 출제에서 제외합니다. 이 설정은 이 기기에 저장됩니다.','Drug-specific questions are excluded by default for fair-competition compliance. Settings are saved on this device.'],save:['저장하고 돌아가기','Save and return'],quizHint:['정답을 고른 뒤 제출을 한 번 더 쏘세요. 정답이면 무기 승급 + 장기 회복!','Select an answer, then shoot Submit. Correct answers upgrade your weapon and restore organs!'],submit:['정답 제출 →','Submit answer →'],continue:['계속하기 →','Continue →'],paused:['방어선 대기 중','Defense on hold'],pauseNote:['전투와 퀴즈 시간이 멈췄습니다.','Combat and quiz timers are paused.'],resume:['계속 방어하기 →','Resume defense →'],restart:['다시 도전하기 →','Play again →'],
};
// Beta reference values are balance data; simulation, meshes and input are rebuilt.
export const WEAPONS = [
  {names:['새총','Slingshot'],damage:1,delay:.46,mag:9,reload:1.3},
  {names:['석궁','Crossbow'],damage:1,delay:.28,mag:8,reload:1.5},
  {names:['화승총','Matchlock'],damage:2,delay:.42,mag:6,reload:1.7},
  {names:['권총','Pistol'],damage:2,delay:.18,mag:18,reload:1.2},
  {names:['샷건','Shotgun'],damage:1,delay:.55,mag:9,reload:1.9,pellets:5},
  {names:['매그넘','Magnum'],damage:3,delay:.5,mag:6,reload:1.8,pierce:3},
  {names:['기관단총','SMG'],damage:1,delay:.08,mag:45,reload:1.6},
  {names:['소총','Rifle'],damage:3,delay:.14,mag:30,reload:1.6},
  {names:['기관총','Machine Gun'],damage:2,delay:.36,mag:68,reload:2.3,burst:3},
  {names:['바주카','Bazooka'],damage:5,delay:.55,mag:7,reload:1.85,splash:4.5},
  {names:['유도미사일','Homing Missile'],damage:4,delay:.32,mag:8,reload:2,homing:true,splash:3.2},
  {names:['레이저','Laser'],damage:4,delay:.10,mag:60,reload:1.4,pierce:5},
];
const TYPES = {
  soda:{hp:2,speed:3.2,score:150,impact:5,sugar:true,names:['소용돌이 캔디','Swirl Candy']},
  fries:{hp:3,speed:2.2,score:200,impact:7,names:['트랜스 프라이','Trans Fries']},
  burger:{hp:8,speed:1.35,score:400,impact:13,names:['미드나잇 버거','Midnight Burger']},
  pizza:{hp:5,speed:1.8,score:300,impact:9,names:['기름진 피자','Greasy Pizza']},
  icecream:{hp:2,speed:2.8,score:200,impact:6,sugar:true,names:['아이스크림 콘','Ice Cream Cone']},
  donut:{hp:1,speed:3.4,score:250,impact:6,sugar:true,fly:true,names:['슈가 도넛','Sugar Donut']},
  wing:{hp:2,speed:5,score:340,impact:8,fly:true,names:['프라이드 치킨윙','Fried Chicken Wing']},
  ramen:{hp:6,speed:1.5,score:350,impact:11,names:['나트륨 컵라면','Sodium Cup Noodles']},
  ciga:{hp:3,speed:2.5,score:250,impact:8,names:['꽁초 니코틴','Nicotine Butt']},
  soju:{hp:4,speed:2,score:320,impact:6,names:['초록 소주병','Green Soju Bottle']},
  moth:{hp:1,speed:4.2,score:250,impact:6,fly:true,names:['날아온 과자봉지','Flying Chip Bag']},
  bat:{hp:2,speed:3.6,score:300,impact:7,sugar:true,fly:true,names:['초콜릿 박쥐','Chocolate Bat']},
  cancerlet:{hp:2,speed:3.4,score:150,impact:5,names:['암세포 조각','Cancer Fragment']},
  syrup:{hp:16,speed:.8,score:1500,impact:18,sugar:true,boss:true,names:['과당 시럽통 · 위쪽 밸브가 약점','Syrup Drum · shoot the top valve']},
  cancer:{hp:26,speed:.95,score:2000,impact:24,boss:true,names:['암세포 · 격파 후 3조각으로 분열','Cancer Cell · splits into 3 fragments']},
  plaque:{hp:34,speed:1.25,score:2600,impact:32,boss:true,names:['죽상경화 플라크 · 방어선 돌진','Atherosclerotic Plaque · charging the core']},
  wingking:{hp:22,speed:2.4,score:1800,impact:20,fly:true,boss:true,names:['치킨윙 대장 · 상공에서 급습','Wing Commander · strikes from the air']},
  pizzaking:{hp:30,speed:1.05,score:2200,impact:28,boss:true,names:['대왕 피자 · 기름 장벽','Pizza Colossus · a wall of grease']},
  fragment:{hp:2,speed:4.1,score:150,impact:5,fly:true,names:['암세포 조각 · 흩어져 날아온다','Cancer Fragment · scatters through the air']},
};
const DIFFICULTY = {easy:{speed:.78,impact:.55,gap:1.35,hp:.75,pulse:.85},mid:{speed:1.02,impact:.98,gap:.94,hp:1.12,pulse:1.1},hard:{speed:1.26,impact:1.45,gap:.7,hp:1.45,pulse:1.35}};
const WAVES = [
  {duration:42,bossAt:32,boss:'syrup',quiz:[17],spawns:[['soda',2.1,1],['fries',4.2,3],['icecream',6.5,7],['donut',9,11]]},
  {duration:55,bossAt:43,boss:'wingking',quiz:[21,44],spawns:[['soda',2,1],['fries',3.8,2],['icecream',6,5],['donut',6.5,4],['wing',7.5,8],['burger',11,9]]},
  {duration:62,bossAt:48,boss:'cancer',quiz:[18,40],spawns:[['soda',1.9,1],['fries',3.4,2],['burger',9.5,6],['pizza',9,8],['icecream',6.2,4],['donut',6,3],['wing',6.5,7]]},
  {duration:68,bossAt:53,boss:'pizzaking',quiz:[16,35,57],spawns:[['soda',1.7,1],['fries',3.1,2],['burger',8.5,5],['pizza',8,4],['icecream',5.8,3],['donut',5.5,3],['wing',5.5,6],['ramen',12,10]]},
  {duration:76,bossAt:58,boss:'plaque',quiz:[14,32,52,70],spawns:[['soda',1.5,1],['fries',2.8,2],['burger',7.5,5],['pizza',7,3],['icecream',5.4,4],['donut',5,2],['wing',4.8,5],['ramen',10,8]]},
];
const freshState = () => ({phase:'home',map:'coronary',victory:false,lang:'ko',difficulty:'mid',wave:0,waveTime:0,elapsed:0,score:0,core:100,liver:0,pancreas:100,sugar:8,strain:0,glucagon:0,failed:false,weapon:0,unlocked:0,ammo:WEAPONS.map(w=>w.mag),reload:0,reloadTotal:0,reloadFlash:0,reticleKick:0,cooldown:0,pulse:4,insulin:1,shots:0,hits:0,combo:0,correct:0,quizTotal:0,quizTime:18,quiz:null,selection:null,answered:false,feedbackTime:0,nextUpgrade:18000,bosses:[],killedBosses:[],slow:0,boost:0,paused:false,shooting:false});
const state = freshState();
state.lang=new URLSearchParams(location.search).get('lang')==='en'?'en':'ko';
const bank=new QuizBank();
const enemies=[];
let world,editor;
let manual=false,events=new Set(),spawnTimers=[],lastTime=performance.now(),noticeTime=0,hitTime=0,flashTime=0;
let pendingShots=[],quizTransition=false,loading=false,loadFailed=false,loadGeneration=0;
let upgradeTime=0;
let audioContext=null,muted=storage.get('muted',false)===true;
let aim={x:innerWidth/2,y:innerHeight/2};
function sound(frequency=240,duration=.09,type='triangle',volume=.035){
  if(muted||!audioContext)return;
  const oscillator=audioContext.createOscillator(),gain=audioContext.createGain(),now=audioContext.currentTime;
  oscillator.type=type;oscillator.frequency.setValueAtTime(frequency,now);oscillator.frequency.exponentialRampToValueAtTime(Math.max(35,frequency*.4),now+duration);
  gain.gain.setValueAtTime(volume,now);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
  oscillator.connect(gain).connect(audioContext.destination);oscillator.start();oscillator.stop(now+duration+.01);
  oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
}
// 실녹음 효과음(CC0 · ../assets/sfx, 출처는 CREDITS.md). 로드 전이나 실패 시엔 sound() 합성음으로 폴백
const SFX_DIR='../assets/sfx/';
const SFX_NAMES=[...Array(12).keys()].map(i=>'shot_'+String(i).padStart(2,'0')).concat(['explode_big','explode_small','boss_die','hit','hit_squish','kill_pop','kill_splat','reload_click','reload_done','weapon_get','quiz_ok','quiz_no','pulse','insulin','rescue','damage']);
const sfxBuffers={};let sfxMaster=null;
function loadSfx(){
  if(!audioContext)return;
  for(const name of SFX_NAMES){
    if(sfxBuffers[name]!==undefined)continue;sfxBuffers[name]=null;
    fetch(`${SFX_DIR}${name}.mp3?v=1`).then(r=>r.arrayBuffer()).then(b=>audioContext.decodeAudioData(b)).then(d=>{sfxBuffers[name]=d;}).catch(()=>{sfxBuffers[name]=false;});
  }
}
function sample(name,gain=1,rate=1){
  try{
    const buffer=sfxBuffers[name];if(!buffer||!audioContext||muted)return false;
    if(!sfxMaster){sfxMaster=audioContext.createGain();sfxMaster.gain.value=.9;sfxMaster.connect(audioContext.destination);}
    const src=audioContext.createBufferSource();src.buffer=buffer;src.playbackRate.value=rate*(.96+Math.random()*.08);
    const g=audioContext.createGain();g.gain.value=gain;src.connect(g).connect(sfxMaster);src.start();return true;
  }catch{return false;}
}
function unlockAudio(){try{audioContext??=new(window.AudioContext||window.webkitAudioContext)();audioContext.resume().catch(()=>{});loadSfx();}catch{}}
function notice(ko,en,seconds=2.7){$('notice').textContent=text(ko,en);noticeTime=seconds;$('notice').classList.add('show');}
function stageOfLiver(){return Math.min(3,Math.floor(state.liver/25));}
function pancreaticPower(){return state.failed?0:state.pancreas>60?1:state.pancreas>30?.7:state.pancreas>10?.45:.2;}
function weaponName(index=state.weapon){return WEAPONS[index].names[state.lang==='ko'?0:1];}
function updateLanguage(){
  document.documentElement.lang=state.lang;
  document.querySelectorAll('[data-i18n]').forEach(el=>el.textContent=text(...strings[el.dataset.i18n]));
  document.querySelectorAll('[data-lang]').forEach(el=>el.classList.toggle('selected',el.dataset.lang===state.lang));
  document.querySelectorAll('[data-diff]').forEach(el=>el.classList.toggle('selected',el.dataset.diff===state.difficulty));
  document.querySelector('h1').textContent='ASTRA';

  $('intro-text').textContent=text('몸속으로 이어지는 여정, 지식으로 지키는 방어선','A journey within. A defense powered by knowledge.');
  $('difficulty-hint').textContent=state.difficulty==='easy'?text('무제한 탄약 · 느린 적 · 첫 플레이에 추천','Unlimited ammo · slower enemies · a gentle first mission'):text('누르고 있으면 연사 · 탄약 소진 시 자동 재장전','Hold to fire · automatic reload when empty');
  $('guide-cards').replaceChildren();
  for(const pair of [
    [['01 / 조준하고 쏘기','다가오는 정크푸드를 쏘세요. 방아쇠를 누르면 연사합니다. 재장전·무기 교체는 화면 버튼으로!'],['01 / Point and shoot','Shoot approaching junk food. Hold the trigger to fire. Use the on-screen reload and weapon buttons.']],
    [['02 / 장기와 함께 방어','간은 정화 파동, 췌장은 당류 자동 요격. 고혈당이 지속되면 췌장이 지쳐 부전에 빠집니다. 당류 적부터 제거하세요.'],['02 / Protect your allies','The liver pulses; the pancreas targets sugar enemies. Sustained overload can cause permanent failure. Clear sugar enemies first.']],
    [['03 / 지식으로 회복','퀴즈 정답은 무기 승급과 장기 회복! 웨이브 끝의 보스를 처치하고 선택한 맵의 코어를 지켜가요.'],['03 / Knowledge restores','Correct answers upgrade weapons and heal organs. Defeat each wave boss to protect the selected core.']],
  ]){
    const [title,body]=pair[state.lang==='ko'?0:1],card=document.createElement('div');const b=document.createElement('b'),p=document.createElement('p');b.textContent=title;p.textContent=body;card.append(b,p);$('guide-cards').append(card);
  }
  updateMapUI();updateLoadUI();updateHUD();
}
function selectMap(key){
  const map=MAPS.find(m=>m.key===key&&m.ready);
  if(editor?.active)editor.toggle(false);
  if(!map||!['home','guide','admin','result'].includes(state.phase))return false;
  state.map=map.key;enemies.length=0;world.selectMap(map.key);updateMapUI();updateHUD();return true;
}
function updateMapUI(){
  $('routes-toggle').textContent=text(world.terrain.debug.visible?'경로선 끄기':'경로선 보기',world.terrain.debug.visible?'Hide routes':'Show routes');
  const map=getMap(state.map);$('map-list').replaceChildren();$('map-pending').replaceChildren();
  for(const entry of MAPS){
    const button=document.createElement('button');button.dataset.map=entry.key;button.disabled=!entry.ready;
    button.classList.toggle('selected',entry.key===map.key);button.ariaPressed=String(entry.key===map.key);
    const small=document.createElement('small'),title=document.createElement('b'),description=document.createElement('span');
    small.textContent=entry.ready?`SECTOR ${entry.chapter} / ${entry.routes.length} ROUTES`:text('준비 중','IN DEVELOPMENT');
    title.textContent=text(...entry.names);description.textContent=entry.ready?text(...entry.core):'';
    button.append(small,title,description);tap(button,()=>selectMap(entry.key));
    $(entry.ready?'map-list':'map-pending').append(button);
  }
  $('map-chapter').textContent=`THE INNER FRONTIER / ${map.chapter}`;
  $('map-title').textContent=text(...map.title);$('map-subtitle').textContent=text(...map.subtitle);
  $('map-core').textContent=`${text('방어 대상','DEFEND')} / ${text(...map.core)}`;
  $('brief-title').textContent=text(...map.title);$('brief-location').textContent=`${map.chapter} / ${text(...map.names)}`;
  $('brief-text').textContent=text(...map.briefing);$('brief-fact').textContent=text(...map.fact);
  $('map-hud').textContent=`${map.chapter} / ${text(...map.names)}`;
  $('route-summary').textContent=map.routes.map(r=>text(...r.names)).join(' · ');
  $('landmark-labels').replaceChildren();
  world.terrain.landmarks.forEach(l=>{const el=document.createElement('div');el.classList.add('landmark-label');if(l.maxHp)el.classList.add('destructible');$('landmark-labels').append(el);l.label=el;});
}
function updateLandmarkLabels(){
  const combat=state.phase==='combat';
  for(const l of world.terrain.landmarks){
    if(!l.label)continue;
    const point=world.project(l.anchor,0),rect=$('stage').getBoundingClientRect();
    const visible=combat&&!l.dead&&point.visible&&point.y>rect.top+rect.height*.2&&point.y<rect.top+rect.height*.8;
    l.label.classList.toggle('hidden',!visible);
    if(visible){l.label.style.left=`${point.x-rect.left}px`;l.label.style.top=`${point.y-rect.top}px`;l.label.textContent=text(...l.names)+(l.maxHp?` · ${Math.ceil(l.hp)}/${l.maxHp}`:'');}
  }
}
function updateLoadUI(){
  $('start').disabled=loading||(!bank.ready&&!loadFailed);
  $('start').textContent=loading?text(...strings.loading):loadFailed?text('문제은행 다시 불러오기 ↻','Retry question banks ↻'):text('방어 시작하기 →','Start defense →');
  $('load-status').textContent=loadFailed?text('문제은행을 읽지 못했습니다. 서버 연결을 확인하고 다시 불러오세요.','Could not load the question banks. Check the server and retry.'):'';
}
async function loadBanks(){
  const generation=++loadGeneration;loading=true;loadFailed=false;updateLoadUI();
  try{await Promise.all([bank.load(state.lang),world.assetsReady]);}catch{if(generation===loadGeneration)loadFailed=true;}
  if(generation===loadGeneration){loading=false;updateLoadUI();}
}
function setPhase(phase){
  state.phase=phase;state.shooting=false;pendingShots=[];
  for(const name of ['home','guide','admin','result'])show(name,phase===name);
  show('quiz-screen',phase==='quiz');show('hud',['combat','quiz'].includes(phase));show('pause',['combat','quiz'].includes(phase));
  $('world').style.cursor=phase==='combat'?'none':'default';$('reticle').style.display=phase==='combat'?'block':'none';
}
async function fullscreen(){try{if(!document.fullscreenElement)await $('stage').requestFullscreen({navigationUI:'hide'});else await document.exitFullscreen();}catch{notice('전체화면을 사용할 수 없어 창 모드로 진행합니다.','Fullscreen unavailable. Continuing in windowed mode.');}}
function resetGame(){
  const {lang,difficulty,map}=state;Object.assign(state,freshState(),{lang,difficulty,map});
  const arrival=world.camera.position.clone();world.selectMap(map);world.flight=0;if(!world.map.plate)world.camera.position.copy(arrival);
  enemies.length=0;world.clear();upgradeTime=0;show('weapon-banner',false);pendingShots=[];bank.reset();quizTransition=false;hitTime=flashTime=0;world.buildGun(0);world.shake=0;
  updateMapUI();startWave(0);
}
function startWave(index){
  state.wave=index;state.waveTime=0;events=new Set();spawnTimers=WAVES[index].spawns.map(([type,interval,next])=>({type,interval,next}));
  setPhase('combat');notice(`${index===WAVES.length-1?'최종 ':''}웨이브 ${index+1} · 방어선을 지켜주세요`,`${index===WAVES.length-1?'FINAL ':''}WAVE ${index+1} · Hold the line`,3);
}
function spawn(type='soda',options={}){
  const definition=TYPES[type];if(!definition)throw new Error(`Unknown enemy: ${type}`);
  const model=world.addEnemy(type,definition.boss);
  const routes=world.terrain.routes.items,lane=options.lane??Math.floor(Math.random()*routes.length);
  const routeId=world.terrain.routes.get(options.routeId??routes[((lane%routes.length)+routes.length)%routes.length].id).id;
  const hp=definition.hp*(definition.boss?1:DIFFICULTY[state.difficulty].hp);
  const enemy={type,...definition,waveBoss:definition.boss===true&&options.waveBoss===true,showHealth:definition.hp>=2,model,hp,maxHp:hp,lane,routeId,progress:options.progress??0,seed:Math.random()*100,scale:definition.boss?2:['fragment','cancerlet'].includes(type)?.7:1,flash:0,dead:false,guarded:false};
  if(definition.fly)planFlight(enemy,options.from);
  enemies.push(enemy);positionEnemy(enemy);world.updateHealth(enemy);
  if(definition.boss){if(enemy.waveBoss)state.bosses.push(type);world.shake=1.5;world.ring(model.position,0xffa56e,10);notice(...definition.names,4);sound(95,.45,'sawtooth',.05);}
  updateBossHUD();return enemy;
}
// 날아다니는 적은 길을 따라가지 않는다. 맵 위쪽 아무 데서나 들어와 방어선까지 곧장 가로지른다.
function planFlight(enemy,origin){
  const exit=world.routePoint(enemy.routeId,1).clone();
  let from=origin?origin.clone().add(new THREE.Vector3((Math.random()-.5)*10,0,(Math.random()-.5)*8)):null;
  for(let tries=0;tries<8&&!from;tries++)from=world.platePoint(.04+Math.random()*.92,.05+Math.random()*.22);
  if(!from)from=world.routePoint(enemy.routeId,0).clone();
  enemy.flyFrom=from;
  enemy.flyTo=exit.add(new THREE.Vector3((Math.random()-.5)*14,0,(Math.random()-.5)*6));
  // 중간 제어점을 크게 흔들어 개체마다 다른 곡선을 그린다
  const mid=enemy.flyFrom.clone().lerp(enemy.flyTo,.5);
  const dir=enemy.flyTo.clone().sub(enemy.flyFrom).setY(0).normalize();
  const side=(Math.random()-.5)*enemy.flyFrom.distanceTo(enemy.flyTo)*.55;
  enemy.flyCtrl=mid.add(new THREE.Vector3(-dir.z*side,0,dir.x*side));
  enemy.swayAmp=1.1+Math.random()*2.6;enemy.swayFreq=1.5+Math.random()*2.2;
  enemy.flyHeight=2.9+Math.random()*1.9;enemy.bobFreq=12+Math.random()*10;
}
function positionEnemy(enemy){
  const p=enemy.progress;
  let position;
  if(enemy.fly&&enemy.flyFrom&&enemy.flyTo){
    // 2차 베지어로 휘어 날고, 개체마다 다른 진폭·주기로 좌우로 흔들린다
    const q=1-p,c=enemy.flyCtrl||enemy.flyFrom;
    position=enemy.flyFrom.clone().multiplyScalar(q*q).addScaledVector(c,2*q*p).addScaledVector(enemy.flyTo,p*p);
    const dir=enemy.flyTo.clone().sub(enemy.flyFrom).setY(0).normalize();
    const sway=Math.sin(p*Math.PI*(enemy.swayFreq||2.4)+enemy.seed)*world.actorScale*(enemy.swayAmp||2.4);
    position.x+=-dir.z*sway;position.z+=dir.x*sway;
  }else position=world.routePoint(enemy.routeId,p);
  enemy.model.position.copy(position);
  enemy.model.position.y+=enemy.fly?world.actorScale*((enemy.flyHeight||3.5)+Math.sin(p*(enemy.bobFreq||18)+enemy.seed)*.28):.10;
  // Recoil moves the actor away along the same route, preserving its ground contact.
  if(enemy.flash>0){
    const tangent=enemy.fly&&enemy.flyFrom&&enemy.flyTo?enemy.flyTo.clone().sub(enemy.flyFrom).setY(0).normalize():world.terrain.routes.tangent(enemy.routeId,p);
    enemy.model.position.addScaledVector(tangent,-enemy.flash*world.actorScale*.4);
  }
  enemy.model.quaternion.copy(world.camera.quaternion);
  enemy.model.scale.setScalar(world.actorScale*enemy.scale*(.96+p*.08));
}
function removeEnemy(enemy,dying=false){enemy.dead=true;const index=enemies.indexOf(enemy);if(index>=0)enemies.splice(index,1);world.remove(enemy.model,dying);updateBossHUD();}

function upgrade(){
  if(state.unlocked>=WEAPONS.length-1){state.liver=clamp(state.liver-15);return;}
  state.unlocked++;state.weapon=state.unlocked;state.reload=0;state.reloadTotal=0;state.reloadFlash=0;state.ammo[state.weapon]=WEAPONS[state.weapon].mag;world.buildGun(state.weapon);
  upgradeTime=3;$('weapon-banner').textContent=text(`무기 획득 · ${weaponName()} · 탄창 ${WEAPONS[state.weapon].mag}`,`WEAPON ACQUIRED · ${weaponName()} · ${WEAPONS[state.weapon].mag} rounds`);$('weapon-banner').style.borderColor=weaponColor(state.weapon);show('weapon-banner',true);
  notice(`무기 승급 · ${weaponName()}`,`WEAPON UPGRADE · ${weaponName()}`);if(!sample('weapon_get',.8))sound(850,.22);
}
function damage(enemy,amount,byPlayer=true,point){
  if(enemy.dead)return;
  enemy.hp-=amount;enemy.flash=1;if(byPlayer)sample(Math.random()<.5?'hit':'hit_squish',.5);world.burst(point||enemy.model.position.clone().add(new THREE.Vector3(0,1.2,0)),byPlayer?0xffd395:0x9dedb7,byPlayer?5:3);
  world.updateHealth(enemy);updateBossHUD();
  if(enemy.hp>0)return;
  const position=enemy.model.position.clone();removeEnemy(enemy,true);
  if(byPlayer){state.score+=Math.round(enemy.score*Math.min(4,1+state.combo*.12));world.shake=Math.max(world.shake,enemy.boss?2:.25);hitTime=enemy.boss?.13:enemy.maxHp>=5?.075:.045;}
  world.burst(position,enemy.boss?0xffad7f:0xffdc9b,enemy.boss?45:13);if(!enemy.boss)sample(Math.random()<.5?'kill_pop':'kill_splat',.8);
  if(enemy.boss){
    if(enemy.waveBoss)state.killedBosses.push(enemy.type);state.slow=.55;world.ring(position,0xffd39b,22);if(!sample('boss_die',1))sound(65,.5,'sawtooth',.06);
    // Sprites visualize the existing immediate recovery reward.
    state.liver=clamp(state.liver-12);if(!state.failed)state.pancreas=clamp(state.pancreas+15);state.boost=5;
    const gcgr=enemy.type==='cancer';if(gcgr)state.glucagon=10;world.reward(position,gcgr?'item_gcgr':'item_glp1');
    notice('보스 격파! 정화 지원 · 간과 췌장 회복','BOSS DEFEATED · Purification support & organ recovery',3.5);
    if(enemy.type==='cancer')for(let i=0;i<5;i++)spawn('fragment',{progress:Math.max(.12,enemy.progress-.30-Math.random()*.12),routeId:enemy.routeId,lane:enemy.lane,from:position});
  }else if(byPlayer&&Math.random()<.08){
    const gcgr=Math.random()<.3;
    state.core=clamp(state.core+2);state.liver=clamp(state.liver-2);world.ring(position,gcgr?0xffc46b:0xb8e88a,3);
    if(gcgr){state.glucagon=Math.max(state.glucagon,7);world.reward(position,'item_gcgr');notice('글루카곤 획득 · 정화 파동 증폭','GLUCAGON · purification amplified',2);}
    else world.reward(position);
  }
}
function reload(){
  if(state.phase!=='combat'||state.paused||state.difficulty==='easy'||state.reload>0||state.ammo[state.weapon]===WEAPONS[state.weapon].mag)return;
  state.reload=WEAPONS[state.weapon].reload*(1+stageOfLiver()*.16)*(state.shots>5&&state.hits/state.shots>.7?.88:1);
  state.reloadTotal=state.reload;state.reloadFlash=0;updateReticle();if(!sample('reload_click',.7))sound(330,.12,'sine');
}
function swap(){
  if(state.phase!=='combat'||state.paused||state.unlocked<1)return;
  state.weapon=state.weapon===0?state.unlocked:state.weapon-1;state.reload=0;state.reloadTotal=0;state.reloadFlash=0;pendingShots=[];world.buildGun(state.weapon);if(state.ammo[state.weapon]<=0)reload();updateHUD();
}
function shot(clientX,clientY,extra=false){
  if(editor?.active||state.phase!=='combat'||state.paused||state.reload>0||(!extra&&state.cooldown>0))return false;
  const rect=$('world').getBoundingClientRect();if(clientX<rect.left||clientX>rect.right||clientY<rect.top||clientY>rect.bottom)return false;
  const weapon=WEAPONS[state.weapon];
  if(state.difficulty!=='easy'&&state.ammo[state.weapon]<=0){reload();return false;}
  if(!extra)state.cooldown=weapon.delay;
  if(state.difficulty!=='easy')state.ammo[state.weapon]--;
  state.shots++;state.reticleKick=.07;updateReticle();
  const picked=world.pick(clientX,clientY,enemies);let enemy=picked.enemy;
  if(weapon.homing&&!enemy&&!picked.landmark&&!picked.prop&&!picked.occluded){
    enemy=enemies.reduce((best,candidate)=>{
      const p=world.project(candidate.model);if(!p.visible)return best;
      const distance=Math.hypot(p.x-clientX,p.y-clientY);return !best||distance<best.distance?{enemy:candidate,distance}:best;
    },null)?.enemy;
  }
  world.shot(enemy?picked.enemy?picked.point:enemy.model.position.clone().add(new THREE.Vector3(0,1,0)):picked.point,state.weapon);
  if(!sample('shot_'+String(state.weapon).padStart(2,'0'),state.weapon>=9?.9:.75))sound(weapon.homing?140:600-state.weapon*37,.06+state.weapon*.008,state.weapon>8?'sawtooth':'triangle',.035);
  if(picked.prop){state.hits++;state.score+=250;state.core=clamp(state.core+2);world.freeTrap(picked.prop);if(state.ammo[state.weapon]<=0)reload();updateHUD();return true;}
  if(picked.landmark){
    state.hits++;state.combo++;$('reticle').classList.add('hit');
    if(world.damageLandmark(picked.landmark,weapon.damage*(weapon.pellets||1))){
      state.score+=250;state.core=clamp(state.core+2);
      notice('길을 열었어요 · +250 · 코어 +2','Passage cleared · +250 · core +2');
    }
  }else if(enemy){
    state.hits++;state.combo++;$('reticle').classList.add('hit');
    const hitPosition=enemy.model.position.clone();
    if(weapon.homing){
      const blastRadius=weapon.splash;
      world.bolt(world.gunMuzzle.getWorldPosition(new THREE.Vector3()),enemy,weapon.damage,(target,dmg)=>{
        const center=target.model.position.clone();damage(target,dmg);for(const other of [...enemies])if(other!==target&&other.model.position.distanceTo(center)<blastRadius)damage(other,2);
        world.ring(center,0xffc78b,blastRadius);
      },true);
    }else{
      damage(enemy,weapon.damage*(picked.weak?2:1),true,picked.point);
      if(weapon.pellets)for(let i=1;i<weapon.pellets;i++){
        const pellet=world.pick(clientX+(Math.random()-.5)*rect.height*.027,clientY+(Math.random()-.5)*rect.height*.027,enemies);
        if(pellet.enemy)damage(pellet.enemy,weapon.damage,true,pellet.point);
      }
      if(weapon.pierce){
        const behind=enemies.filter(other=>other!==enemy&&other.model.position.z<hitPosition.z&&Math.abs(other.model.position.x-hitPosition.x)<2.3).sort((a,b)=>b.model.position.z-a.model.position.z);
        behind.slice(0,weapon.pierce-1).forEach(other=>damage(other,weapon.damage));
      }
      if(weapon.splash){for(const other of [...enemies])if(other!==enemy&&other.model.position.distanceTo(hitPosition)<weapon.splash)damage(other,3);world.ring(hitPosition,0xffba79,weapon.splash);sample(weapon.homing?'explode_small':'explode_big',weapon.homing?.8:1);}
    }
  }else state.combo=0;
  if(weapon.burst&&!extra)for(let i=1;i<weapon.burst;i++)pendingShots.push({in:i*.075,x:clientX,y:clientY});
  if(state.difficulty!=='easy'&&state.ammo[state.weapon]<=0)reload();
  updateHUD();return true;
}
function openQuiz(transition=false){
  if(!bank.ready)return;
  state.quiz=bank.draw(state.difficulty);state.quizTotal++;state.quizTime=18;state.selection=null;state.answered=false;state.feedbackTime=0;quizTransition=transition;
  setPhase('quiz');$('answers').replaceChildren();$('question').textContent=state.quiz.q;$('feedback').textContent='';$('source').textContent='';$('submit').disabled=true;show('submit',true);show('quiz-next',false);
  $('quiz-tag').textContent=`KNOWLEDGE / ${state.quiz.set==='masld'?'MASLD · MASH':'CLINICAL OBESITY'} / ${state.quiz.diff.toUpperCase()}`;
  shuffled([0,1,2,3]).forEach((answer,index)=>{
    const button=document.createElement('button');button.dataset.answer=answer;button.textContent=`${String(index+1).padStart(2,'0')}  ${state.quiz.a[answer]}`;
    tap(button,()=>{
      if(state.answered||state.paused)return;state.selection=answer;
      [...$('answers').children].forEach(b=>b.classList.toggle('selected',b===button));$('submit').disabled=false;sound(550,.04);
    });$('answers').append(button);
  });updateHUD();
}
function answerQuiz(){
  if(state.phase!=='quiz'||state.answered||state.paused)return;
  const correct=state.selection===state.quiz.correct;state.answered=true;state.feedbackTime=4;
  [...$('answers').children].forEach(button=>{button.disabled=true;button.classList.remove('selected');button.classList.toggle('correct',Number(button.dataset.answer)===state.quiz.correct);button.classList.toggle('wrong',Number(button.dataset.answer)===state.selection&&!correct);});
  if(correct){
    state.correct++;state.score+=1500+Math.round(state.quizTime/18*500);state.core=clamp(state.core+8);state.liver=clamp(state.liver-25);state.sugar=clamp(state.sugar-20);
    if(!state.failed){state.pancreas=clamp(state.pancreas+30);state.strain=Math.max(0,state.strain-6);}upgrade();
    $('feedback').textContent=text('정답! 무기 승급 · 생명 +8 · 간 회복', 'Correct! Weapon upgrade · life +8 · liver restored');if(!sample('quiz_ok',.8))sound(950,.2);
  }else{
    $('feedback').textContent=text(`정답: ${state.quiz.a[state.quiz.correct]}`,`Correct answer: ${state.quiz.a[state.quiz.correct]}`);if(!sample('quiz_no',.7))sound(150,.2,'sine');
  }
  $('source').textContent=state.quiz.src?`${text('출처','Source')}: ${state.quiz.src}`:'';
  show('submit',false);show('quiz-next',true);updateHUD();
}
function continueQuiz(){
  if(state.phase!=='quiz'||!state.answered||state.paused)return;
  if(quizTransition)startWave(state.wave+1);else setPhase('combat');
}
function finish(victory){
  state.core=clamp(state.core);setPhase('result');state.victory=victory;
  const bonus=victory?Math.round(state.core*25+(100-state.liver)*15+state.pancreas*15):0;state.score+=bonus;
  const previous=storage.get('best',0);storage.set('best',Math.max(Number.isFinite(previous)?previous:0,state.score));
  $('result-title').textContent=victory?text('다시 흐르는 생명','Life flows again'):text('끝나지 않은 여정','The journey continues');
  $('result-map').textContent=`${text(...getMap(state.map).names)} / ${text(...getMap(state.map).core)}`;
  $('result-score').textContent=state.score.toLocaleString();$('result-stats').replaceChildren();
  for(const [label,value] of [[text('코어 생명','CORE LIFE'),`${Math.round(state.core)}%`],[text('명중률','ACCURACY'),`${state.shots?Math.round(state.hits/state.shots*100):0}%`],[text('퀴즈 정답','QUIZ CORRECT'),`${state.correct} / ${state.quizTotal}`]]){
    const div=document.createElement('div'),b=document.createElement('b'),p=document.createElement('p');b.textContent=value;p.textContent=label;div.append(b,p);$('result-stats').append(div);
  }
  $('result-note').textContent=text(`보스 ${state.killedBosses.length}/${WAVES.length} · 생존 보너스 ${bonus.toLocaleString()} · 최종 무기 ${weaponName()} · ${Math.floor(state.elapsed/60)}분 ${Math.floor(state.elapsed%60)}초`, `Bosses ${state.killedBosses.length}/${WAVES.length} · survival bonus ${bonus.toLocaleString()} · ${weaponName()} · ${Math.floor(state.elapsed/60)}m ${Math.floor(state.elapsed%60)}s`)+(state.failed?text(' / 췌장부전: 무력화 단계에서 당류 적을 먼저 정리하세요.',' / Pancreatic failure: prioritize sugar enemies during resistance.'):'');
  updateHUD();sound(victory?680:100,.5,'sine');
}
function combat(dt){
  state.waveTime+=dt;state.cooldown=Math.max(0,state.cooldown-dt);state.boost=Math.max(0,state.boost-dt);state.glucagon=Math.max(0,state.glucagon-dt);
  if(state.reload>0){state.reload=Math.max(0,state.reload-dt);if(!state.reload){state.ammo[state.weapon]=WEAPONS[state.weapon].mag;state.reloadFlash=.18;if(!sample('reload_done',.7))sound(500,.055);}}
  for(let i=pendingShots.length-1;i>=0;i--){pendingShots[i].in-=dt;if(pendingShots[i].in<=0){const p=pendingShots.splice(i,1)[0];shot(p.x,p.y,true);}}
  if(state.shooting)shot(aim.x,aim.y);
  const wave=WAVES[state.wave],tuning=DIFFICULTY[state.difficulty];
  if(state.waveTime<wave.bossAt){for(const timer of spawnTimers)if(state.waveTime>=timer.next){const variants={fries:['fries','ciga','soju'],burger:['burger','ramen'],donut:['donut','moth','bat']};
    const choices=state.wave>0?variants[timer.type]:null;spawn(choices?choices[(timer.count||0)%choices.length]:timer.type);timer.count=(timer.count||0)+1;timer.next+=timer.interval*tuning.gap;}}
  if(state.waveTime>=wave.bossAt&&!events.has('boss')){events.add('boss');spawn(wave.boss,{waveBoss:true,routeId:world.map.bossRoute});}
  if(state.waveTime>=10&&!events.has('trap')){events.add('trap');world.spawnTrap();notice('지방 덫 · 자물쇠를 쏘면 코어가 회복돼요','FAT TRAP · Shoot the lock to restore the core');}
  const sugarCount=enemies.filter(e=>e.sugar).length;
  state.sugar=clamp(state.sugar+(sugarCount*2.2-3)*dt);
  if(state.sugar>70)state.liver=clamp(state.liver+dt*1.1);
  for(const enemy of [...enemies]){
    // Bosses advance in 28s; regular soda lane travel is approximately 28s on NORMAL.
    const travel=enemy.boss?28:25*(3.2/enemy.speed);
    enemy.progress+=dt/travel*tuning.speed*(enemy.type==='plaque'&&enemy.progress>.7?1.9:1);
    positionEnemy(enemy);
    if(enemy.progress>.86&&!enemy.guarded&&!enemy.fly){
      enemy.guarded=true;state.liver=clamp(state.liver+enemy.impact*.35*tuning.impact);
      if(!enemy.boss&&stageOfLiver()<3){damage(enemy,[1.5,1,.5][stageOfLiver()]||0,false);}
    }
    if(!enemy.dead&&enemy.progress>=1){
      state.core=clamp(state.core-enemy.impact*tuning.impact);state.combo=0;flashTime=.35;world.shake=1;
      notice(`${getMap(state.map).core[0]} 방어선이 공격받고 있어요`,`${getMap(state.map).core[1]} under attack!`);if(!sample('damage',1))sound(80,.2,'sawtooth');removeEnemy(enemy);
    }
  }
  state.pulse-=dt;
  if(state.pulse<=0){
    // 맵 전체를 훑는 대신 한 번의 피해는 작다. 글루카곤을 얻으면 더 자주, 더 세게 돈다.
    const rate=state.glucagon>0?.42:state.boost>0?.6:1;
    state.pulse=[7,8.5,10,13][stageOfLiver()]*rate*DIFFICULTY[state.difficulty].pulse;
    world.pulse();if(!sample('pulse',.6))sound(390,.14,'sine',.018);
    const power=state.glucagon>0?1.5:.5;
    for(const enemy of [...enemies])if(!enemy.fly)damage(enemy,power,false);   // 땅을 걷는 적은 맵 어디에 있든 맞는다
  }
  if(!state.failed){
    const targets=enemies.filter(e=>e.sugar&&!e.dead).sort((a,b)=>b.progress-a.progress);
    world.aimTurret(targets[0],Math.max(0,1-state.insulin/.25));
    state.pancreas=clamp(state.pancreas+dt*(targets.length?.4:2.2));
    if(state.sugar>70&&targets.length)state.pancreas=clamp(state.pancreas-dt*1.4);
    if(state.pancreas<=5&&targets.length)state.strain+=dt;else if(state.pancreas>30)state.strain=Math.max(0,state.strain-dt*.5);
    if(state.strain>=12){state.failed=true;state.pancreas=0;notice('췌장부전 · 이번 판 인슐린 지원이 중단됩니다.','PANCREATIC FAILURE · Insulin support lost for this run.',4);}
    state.insulin-=dt;
    if(targets.length&&state.insulin<=0&&!state.failed){
      state.insulin=1+stageOfLiver()*.25;state.pancreas=clamp(state.pancreas-(state.sugar>70?5:2.2));
      const target=targets[0];world.fireTurret();
      sample('insulin',.35);world.bolt(world.tip.getWorldPosition(new THREE.Vector3()),target,1.2*pancreaticPower(),(e,d)=>damage(e,d,false));
    }
  }else world.aimTurret(null,0);
  world.advanceProjectiles(dt);
  while(state.score>=state.nextUpgrade){state.nextUpgrade+=18000;upgrade();}
  if(state.core<=0){finish(false);return;}
  for(const time of wave.quiz){if(state.waveTime>=time&&!events.has(time)){events.add(time);openQuiz();return;}}
  // Never discard a living boss on a timeout; success requires all three kills.
  if(state.waveTime>=wave.duration&&enemies.length===0){
    if(!state.killedBosses.includes(wave.boss)){finish(false);return;}
    if(state.wave===WAVES.length-1)finish(true);else openQuiz(true);
  }
}
function updateReticle(){
  const reticle=$('reticle'),progress=state.reload>0?clamp(1-state.reload/(state.reloadTotal||1),0,1):state.reloadFlash>0?1:0;
  $('reload-ring').style.background=`conic-gradient(${weaponColor(state.weapon)} ${progress*360}deg, #ffffff18 0deg)`;
  reticle.dataset.progress=String(progress);
  reticle.classList.toggle('reloading',state.reload>0);reticle.classList.toggle('ready',state.reloadFlash>0);
  reticle.style.transform=`translate(-50%,-50%) scale(${1+.18*state.reticleKick/.07})`;
}
function updateBossHUD(){
  const boss=enemies.find(e=>e.waveBoss&&!e.dead)||enemies.find(e=>e.boss&&!e.dead);
  show('boss',!!boss);
  if(boss){
    const ratio=clamp(boss.hp/boss.maxHp,0,1);
    $('boss-name').textContent=`${boss.waveBoss?'BOSS':'ELITE'} / ${boss.names[state.lang==='ko'?0:1]} · ${Math.ceil(Math.max(0,boss.hp))}/${Math.ceil(boss.maxHp)}`;
    $('boss-fill').style.width=`${ratio*100}%`;$('boss-fill').style.background=`#${healthColor(ratio).toString(16)}`;
    $('boss').classList.toggle('critical',ratio<=.25);
  }
  const left=`${(world?.hudLeft??42).toFixed(1)}%`;
  $('mission').style.left=left;$('boss').style.left=left;
}
function updateHUD(){
  $('score').textContent=String(state.score).padStart(6,'0');$('combo').textContent=state.combo>1?`${state.combo} COMBO / ×${Math.min(4,1+state.combo*.12).toFixed(1)}`:'';
  $('core-label').textContent=text(...getMap(state.map).core);
  $('core').textContent=`${Math.round(state.core)}%`;$('core-fill').style.width=`${state.core}%`;$('accuracy').textContent=state.shots?`${Math.round(state.hits/state.shots*100)}%`:'—';$('quiz-count').textContent=`${state.correct}/${state.quizTotal}`;
  $('wave-name').textContent=`${state.wave===WAVES.length-1?'FINAL ':''}WAVE ${String(state.wave+1).padStart(2,'0')} / ${String(WAVES.length).padStart(2,'0')}`;
  $('wave-progress').style.width=`${clamp(state.waveTime/WAVES[state.wave].duration*100)}%`;
  $('wave-clock').textContent=`${Math.floor(state.waveTime)}s / ${WAVES[state.wave].duration}s`;
  $('liver-state').textContent=text(['건강 · 정화 파동 정상','MASLD · 파동 둔화','MASH · 보급 저하','섬유화 · 방어 약화'][stageOfLiver()],['Healthy · purification online','MASLD · slower pulses','MASH · reduced support','Fibrosis · weakened defense'][stageOfLiver()]);
  $('liver-fill').style.width=`${100-state.liver}%`;$('pulse-time').textContent=state.glucagon>0?text(`글루카곤 증폭 · 다음 정화 ${Math.ceil(state.pulse)}초`,`Glucagon boost · next pulse ${Math.ceil(state.pulse)}s`):text(`다음 정화 ${Math.ceil(state.pulse)}초`,`Next pulse ${Math.ceil(state.pulse)}s`);
  $('pancreas-state').textContent=state.failed?text('췌장부전 · 지원 중단','Failure · support offline'):text(`기능 ${Math.round(state.pancreas)}% · ${state.pancreas>60?'지원 사격 중':state.pancreas>30?'인슐린 약화':state.pancreas>10?'과로 상태':'인슐린 저항성 · 무력화'}`,`Function ${Math.round(state.pancreas)}% · ${state.pancreas>60?'supporting fire':state.pancreas>30?'insulin weakening':state.pancreas>10?'overworked':'insulin resistance'}`);
  $('pancreas-fill').style.width=`${state.pancreas}%`;$('strain').textContent=state.strain>0?text(`부전 부담 ${state.strain.toFixed(1)} / 12초`,`Failure strain ${state.strain.toFixed(1)} / 12s`):text('당류 적 자동 요격','Auto-targeting sugar enemies');
  $('warning').textContent=state.failed?text('췌장부전 · 이번 판 회복 불가','PANCREATIC FAILURE · irreversible this run'):state.pancreas<=10?text('인슐린 무력화! 당류 적을 먼저 제거하세요','INSULIN RESISTANCE · clear sugar enemies'):state.sugar>70?text('고혈당 · 간과 췌장 부담 증가','HIGH GLUCOSE · liver & pancreas under strain'):'';
  $('weapon-tier').textContent=`ARSENAL ${String(state.weapon+1).padStart(2,'0')} / 12`;$('weapon-name').textContent=weaponName();
  $('ammo').textContent=state.difficulty==='easy'?text('∞ 무제한 탄약','∞ UNLIMITED AMMO'):state.reload>0?text(`재장전 ${state.reload.toFixed(1)}초`,`RELOAD ${state.reload.toFixed(1)}s`):`${state.ammo[state.weapon]} / ${WEAPONS[state.weapon].mag}`;
  $('reload').disabled=state.difficulty==='easy'||state.reload>0||state.ammo[state.weapon]===WEAPONS[state.weapon].mag;$('swap').disabled=state.unlocked<1;
  updateBossHUD();updateReticle();
  $('quiz-time').style.width=`${clamp(state.quizTime/18*100)}%`;$('quiz-seconds').textContent=`${Math.ceil(state.quizTime)}s`;
}
function step(seconds=1/60){
  if(!Number.isFinite(seconds)||seconds<0||seconds>600)throw new Error('step requires 0–600 seconds');
  let remaining=seconds;
  while(remaining>1e-7){const dt=Math.min(remaining,1/60);remaining-=dt;
    if(state.paused||editor?.active)continue;
    upgradeTime=Math.max(0,upgradeTime-dt);if(!upgradeTime)show('weapon-banner',false);
    state.reticleKick=Math.max(0,state.reticleKick-dt);state.reloadFlash=Math.max(0,state.reloadFlash-dt);
    noticeTime=Math.max(0,noticeTime-dt);if(!noticeTime)$('notice').classList.remove('show');
    flashTime=Math.max(0,flashTime-dt);$('flash').style.opacity=flashTime*.8;
    if(hitTime<=0)$('reticle').classList.remove('hit');
    let simulationDt=dt;
    if(hitTime>0){hitTime=Math.max(0,hitTime-dt);simulationDt=0;}
    else if(state.slow>0){state.slow=Math.max(0,state.slow-dt);simulationDt=dt*.3;}
    if(['combat','quiz'].includes(state.phase))state.elapsed+=dt;
    if(state.phase==='combat')combat(simulationDt);
    else if(state.phase==='quiz'){
      if(state.answered){state.feedbackTime-=dt;if(state.feedbackTime<=0)continueQuiz();}
      else{state.quizTime=Math.max(0,state.quizTime-dt);if(state.quizTime<=0)answerQuiz();}
    }
    world.animate(dt,state,enemies);
  }
  updateHUD();world.render();updateLandmarkLabels();
}
function pause(force){
  if(!['combat','quiz'].includes(state.phase))return;
  state.paused=force??!state.paused;state.shooting=false;pendingShots=[];show('paused',state.paused);
}
// XGunner 라이트건은 절대좌표 마우스다. 방아쇠를 당길 때 눌림과 뗌이 다른 픽셀에 찍히면
// click 이벤트가 아예 발생하지 않으므로, UI는 pointerdown 으로 받고 click 은 중복만 막아 함께 받는다.
function tap(element,handler){
  if(!element)return element;
  let last=0;
  element.addEventListener('pointerdown',event=>{if(event.button&&event.button!==0)return;last=performance.now();handler(event);});
  element.addEventListener('click',event=>{if(performance.now()-last<700)return;handler(event);});
  return element;
}
function bindUI(){
  document.querySelectorAll('[data-lang]').forEach(button=>tap(button,()=>{state.lang=button.dataset.lang;updateLanguage();loadBanks();}));
  document.querySelectorAll('[data-diff]').forEach(button=>tap(button,()=>{state.difficulty=button.dataset.diff;updateLanguage();}));
  tap($('start'),()=>{unlockAudio();if(loadFailed){loadBanks();return;}if(bank.ready)setPhase('guide');});
  tap($('guide-back'),()=>setPhase('home'));
  tap($('routes-toggle'),()=>{const on=world.toggleRoutes();$('routes-toggle').textContent=text(on?'경로선 끄기':'경로선 보기',on?'Hide routes':'Show routes');});
  window.addEventListener('keydown',event=>{if(!editor?.active&&event.code==='KeyR'&&!event.repeat&&!['INPUT','SELECT','TEXTAREA'].includes(event.target?.tagName))$('routes-toggle').click();});
  tap($('deploy'),()=>{unlockAudio();if(!document.fullscreenElement)$('stage').requestFullscreen?.({navigationUI:'hide'}).catch(()=>{});resetGame();});
  tap($('fullscreen'),fullscreen);
  $('sound').textContent=muted?'♪ OFF':'♪ ON';tap($('sound'),()=>{unlockAudio();muted=!muted;storage.set('muted',muted);$('sound').textContent=muted?'♪ OFF':'♪ ON';});
  tap($('reload'),reload);tap($('swap'),swap);tap($('pause'),()=>pause());tap($('resume'),()=>pause(false));
  tap($('submit'),()=>{if(state.selection!==null)answerQuiz();});tap($('quiz-next'),continueQuiz);
  tap($('restart'),()=>{world.clear();enemies.length=0;state.paused=false;world.selectMap(state.map);setPhase('home');updateLanguage();});
  tap($('admin-open'),()=>{
    $('mix').value=bank.mix;$('drug').checked=bank.drug;
    $('bank-info').textContent=text(`공유 문제은행: MASLD ${bank.sets.masld.length}문 · Obesity ${bank.sets.obesity.length}문 / 최근 24문항 중복 회피`,`Shared banks: MASLD ${bank.sets.masld.length} · Obesity ${bank.sets.obesity.length} / avoids the last 24 questions`);setPhase('admin');
  });
  tap($('admin-close'),()=>{
    const saved=bank.configure(Number($('mix').value),$('drug').checked);setPhase('home');
    if(!saved)notice('저장 공간이 차단되어 이 페이지에서만 설정이 유지됩니다.','Storage is blocked; settings apply only to this page.');
  });
  // 라이트건은 화면 어디를 겨눠도 방아쇠가 들어온다. 조준·사격은 창 전체에서 받고, 실제 UI 위만 비켜준다.
  const overUI=target=>!!(target&&target.closest&&target.closest('button,select,input,textarea,a,#route-editor,.panel,#admin'));
  window.addEventListener('pointermove',event=>{
    aim={x:event.clientX,y:event.clientY};const rect=$('stage').getBoundingClientRect();$('reticle').style.left=`${event.clientX-rect.left}px`;$('reticle').style.top=`${event.clientY-rect.top}px`;
  });
  window.addEventListener('pointerdown',event=>{
    if(editor?.active||state.phase!=='combat'||state.paused)return;
    if(event.button===2){swap();return;}
    if(event.button!==0||overUI(event.target))return;
    event.preventDefault();unlockAudio();aim={x:event.clientX,y:event.clientY};state.shooting=true;shot(aim.x,aim.y);
  });
  window.addEventListener('pointerup',()=>state.shooting=false);window.addEventListener('pointercancel',()=>state.shooting=false);
  $('world').addEventListener('pointerleave',()=>state.shooting=false);
  // 부스 키오스크: 우클릭 메뉴·조준 중 텍스트 끌기·이미지 드래그를 전부 막는다
  window.addEventListener('contextmenu',event=>{event.preventDefault();});
  window.addEventListener('selectstart',event=>{if(state.phase==='combat')event.preventDefault();});
  window.addEventListener('dragstart',event=>event.preventDefault());
  window.addEventListener('blur',()=>{state.shooting=false;if(!manual)pause(true);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&!manual)pause(true);});
  $('world').addEventListener('webglcontextlost',event=>{event.preventDefault();pause(true);$('fatal-text').textContent=text('그래픽 연결이 중단됐습니다. 다시 불러와 주세요.','Graphics context lost. Please reload.');show('fatal',true);});
}
try{
  world=new World($('world'));editor=new RouteEditor(world,()=>{state.shooting=false;pendingShots=[];});bindUI();updateLanguage();loadBanks();
  // Measure real rAF intervals, independent of capped simulation dt and ASTRA.step().
  const performanceStats={fps:60,frameMs:16.67,p95Ms:16.67,drawCalls:0,triangles:0,quality:0,samples:0};
  let frameSamples=[],sampleStart=performance.now(),slowWindows=0,goodWindows=0,lastQualityChange=0;
  function measureFrame(now,ms){
    if(manual||editor?.active||document.hidden||state.paused||ms>250||ms<=0){frameSamples=[];sampleStart=now;slowWindows=0;goodWindows=0;return;}
    frameSamples.push(ms);
    if(now-sampleStart<1000)return;
    const sum=frameSamples.reduce((a,b)=>a+b,0),sorted=[...frameSamples].sort((a,b)=>a-b);
    performanceStats.fps=Math.round(frameSamples.length*1000/sum);
    performanceStats.frameMs=Number((sum/frameSamples.length).toFixed(2));
    performanceStats.p95Ms=Number(sorted[Math.floor((sorted.length-1)*.95)].toFixed(2));
    performanceStats.drawCalls=world.renderer.info.render.calls;
    performanceStats.triangles=world.renderer.info.render.triangles;
    performanceStats.samples++;
    slowWindows=performanceStats.fps<60?slowWindows+1:0;
    goodWindows=performanceStats.fps>=60&&performanceStats.p95Ms<18?goodWindows+1:0;
    if(slowWindows>=2&&world.quality<3){world.setQuality(world.quality+1);lastQualityChange=now;slowWindows=goodWindows=0;}
    else if(goodWindows>=20&&world.quality>0&&now-lastQualityChange>30000){world.setQuality(world.quality-1);lastQualityChange=now;goodWindows=0;}
    performanceStats.quality=world.quality;
    $('fps').textContent=`${performanceStats.fps} FPS`;
    $('fps').dataset.quality=String(world.quality);
    frameSamples=[];sampleStart=now;
  }
  window.ASTRA={loadSfx,sample,sfxBuffers,unlockAudio,editor,MAPS,selectMap,state,enemies,world,bank,WEAPONS,TYPES,WAVES,performance:performanceStats,spawn,shot,reload,swap,start:resetGame,openQuiz,answerQuiz,continueQuiz,pause,step,project:enemy=>world.project(enemy.model),setManual(value=true){manual=value;lastTime=performance.now();frameSamples=[];sampleStart=lastTime;slowWindows=goodWindows=0;},damage,finish};
  function frame(now){const elapsed=now-lastTime;lastTime=now;measureFrame(now,elapsed);if(!manual)step(Math.min(.05,elapsed/1000));requestAnimationFrame(frame);}requestAnimationFrame(frame);

}catch(error){console.error(error);$('fatal-text').textContent=text('3D 화면을 시작하지 못했습니다. WebGL2를 지원하는 브라우저에서 서버 주소로 열어 주세요.','Could not start 3D graphics. Open the HTTP server URL in a browser supporting WebGL2.');show('fatal',true);}
