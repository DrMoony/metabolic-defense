import { World, THREE } from './world.js?v=a3';
import { QuizBank, shuffled, storage } from './quiz.js?v=a3';

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
  syrup:{hp:16,speed:.8,score:1500,impact:18,sugar:true,boss:true,names:['과당 시럽통 · 위쪽 밸브가 약점','Syrup Drum · shoot the top valve']},
  cancer:{hp:26,speed:.95,score:2000,impact:24,boss:true,names:['암세포 · 격파 후 3조각으로 분열','Cancer Cell · splits into 3 fragments']},
  plaque:{hp:34,speed:1.25,score:2600,impact:32,boss:true,names:['죽상경화 플라크 · 방어선 돌진','Atherosclerotic Plaque · charging the core']},
  fragment:{hp:2,speed:3.4,score:150,impact:5,names:['암세포 조각','Cancer Fragment']},
};
const DIFFICULTY = {easy:{speed:.75,impact:.5,gap:1.5,hp:.7},mid:{speed:.88,impact:.72,gap:1.25,hp:.85},hard:{speed:1,impact:1,gap:1,hp:1}};
const WAVES = [
  {duration:40,bossAt:31,boss:'syrup',quiz:[16],spawns:[['soda',2.3,1],['fries',4.6,3],['icecream',7,8]]},
  {duration:60,bossAt:47,boss:'cancer',quiz:[24,49],spawns:[['soda',1.9,1],['fries',3.4,2],['burger',10,6],['pizza',9,8],['icecream',6.5,4],['donut',10,9],['wing',15,26]]},
  {duration:70,bossAt:53,boss:'plaque',quiz:[14,36],spawns:[['soda',1.6,1],['fries',3,2],['burger',8.5,5],['pizza',7.5,3],['icecream',6,4.5],['donut',8,6],['wing',11,13]]},
];
const freshState = () => ({phase:'home',victory:false,lang:'ko',difficulty:'mid',wave:0,waveTime:0,elapsed:0,score:0,core:100,liver:0,pancreas:100,sugar:8,strain:0,failed:false,weapon:0,unlocked:0,ammo:WEAPONS.map(w=>w.mag),reload:0,cooldown:0,pulse:4,insulin:1,shots:0,hits:0,combo:0,correct:0,quizTotal:0,quizTime:18,quiz:null,selection:null,answered:false,feedbackTime:0,nextUpgrade:18000,bosses:[],killedBosses:[],slow:0,boost:0,paused:false,shooting:false});
const state = freshState();
state.lang=new URLSearchParams(location.search).get('lang')==='en'?'en':'ko';
const bank=new QuizBank();
const enemies=[];
let world;
let manual=false,events=new Set(),spawnTimers=[],lastTime=performance.now(),noticeTime=0,hitTime=0,flashTime=0;
let pendingShots=[],quizTransition=false,loading=false,loadFailed=false,loadGeneration=0;
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
function unlockAudio(){try{audioContext??=new(window.AudioContext||window.webkitAudioContext)();audioContext.resume().catch(()=>{});}catch{}}
function notice(ko,en,seconds=2.7){$('notice').textContent=text(ko,en);noticeTime=seconds;$('notice').classList.add('show');}
function stageOfLiver(){return Math.min(3,Math.floor(state.liver/25));}
function pancreaticPower(){return state.failed?0:state.pancreas>60?1:state.pancreas>30?.7:state.pancreas>10?.45:.2;}
function weaponName(index=state.weapon){return WEAPONS[index].names[state.lang==='ko'?0:1];}
function updateLanguage(){
  document.documentElement.lang=state.lang;
  document.querySelectorAll('[data-i18n]').forEach(el=>el.textContent=text(...strings[el.dataset.i18n]));
  document.querySelectorAll('[data-lang]').forEach(el=>el.classList.toggle('selected',el.dataset.lang===state.lang));
  document.querySelectorAll('[data-diff]').forEach(el=>el.classList.toggle('selected',el.dataset.diff===state.difficulty));
  document.querySelector('h1').innerHTML=text('작은 한 발.<br>커다란 <em>방어.</em>','One small shot.<br>A greater <em>defense.</em>');
  if(state.lang==='en')document.querySelector('h1').style.fontSize='6.6cqh';else document.querySelector('h1').style.fontSize='';
  $('intro-text').innerHTML=text('몸속 최후의 방어선, 당신이 지켜주세요.<br>정크푸드를 막고, 지식으로 장기를 회복하세요.','Protect the last line of defense within.<br>Stop junk-food invaders. Let knowledge heal.');
  $('difficulty-hint').textContent=state.difficulty==='easy'?text('무제한 탄약 · 느린 적 · 첫 플레이에 추천','Unlimited ammo · slower enemies · a gentle first mission'):text('누르고 있으면 연사 · 탄약 소진 시 자동 재장전','Hold to fire · automatic reload when empty');
  $('guide-cards').replaceChildren();
  for(const pair of [
    [['01 / 조준하고 쏘기','다가오는 정크푸드를 쏘세요. 방아쇠를 누르면 연사합니다. 재장전·무기 교체는 화면 버튼으로!'],['01 / Point and shoot','Shoot approaching junk food. Hold the trigger to fire. Use the on-screen reload and weapon buttons.']],
    [['02 / 장기와 함께 방어','간은 정화 파동, 췌장은 당류 자동 요격. 고혈당이 지속되면 췌장이 지쳐 부전에 빠집니다. 당류 적부터 제거하세요.'],['02 / Protect your allies','The liver pulses; the pancreas targets sugar enemies. Sustained overload can cause permanent failure. Clear sugar enemies first.']],
    [['03 / 지식으로 회복','퀴즈 정답은 무기 승급과 장기 회복! 웨이브 끝의 보스를 처치하고 심장·콩팥·뇌혈관을 지키세요.'],['03 / Knowledge restores','Correct answers upgrade weapons and heal organs. Defeat each wave boss to protect the heart, kidneys and brain.']],
  ]){
    const [title,body]=pair[state.lang==='ko'?0:1],card=document.createElement('div');const b=document.createElement('b'),p=document.createElement('p');b.textContent=title;p.textContent=body;card.append(b,p);$('guide-cards').append(card);
  }
  updateLoadUI();updateHUD();
}
function updateLoadUI(){
  $('start').disabled=loading||(!bank.ready&&!loadFailed);
  $('start').textContent=loading?text(...strings.loading):loadFailed?text('문제은행 다시 불러오기 ↻','Retry question banks ↻'):text('방어 시작하기 →','Start defense →');
  $('load-status').textContent=loadFailed?text('문제은행을 읽지 못했습니다. 서버 연결을 확인하고 다시 불러오세요.','Could not load the question banks. Check the server and retry.'):'';
}
async function loadBanks(){
  const generation=++loadGeneration;loading=true;loadFailed=false;updateLoadUI();
  try{await bank.load(state.lang);}catch{if(generation===loadGeneration)loadFailed=true;}
  if(generation===loadGeneration){loading=false;updateLoadUI();}
}
function setPhase(phase){
  state.phase=phase;state.shooting=false;pendingShots=[];
  for(const name of ['home','guide','admin','result'])show(name,phase===name);
  show('quiz-screen',phase==='quiz');show('hud',['combat','quiz','result'].includes(phase));show('pause',['combat','quiz'].includes(phase));
  $('world').style.cursor=phase==='combat'?'none':'default';$('reticle').style.display=phase==='combat'?'block':'none';
}
async function fullscreen(){try{if(!document.fullscreenElement)await $('stage').requestFullscreen({navigationUI:'hide'});else await document.exitFullscreen();}catch{notice('전체화면을 사용할 수 없어 창 모드로 진행합니다.','Fullscreen unavailable. Continuing in windowed mode.');}}
function resetGame(){
  const {lang,difficulty}=state;Object.assign(state,freshState(),{lang,difficulty});
  enemies.length=0;world.clear();pendingShots=[];bank.reset();quizTransition=false;world.buildGun(0);world.shake=0;
  startWave(0);
}
function startWave(index){
  state.wave=index;state.waveTime=0;events=new Set();spawnTimers=WAVES[index].spawns.map(([type,interval,next])=>({type,interval,next}));
  setPhase('combat');notice(`${index===2?'최종 ':''}웨이브 ${index+1} · 방어선을 지켜주세요`,`${index===2?'FINAL ':''}WAVE ${index+1} · Hold the line`,3);
}
function spawn(type='soda',options={}){
  const definition=TYPES[type];if(!definition)throw new Error(`Unknown enemy: ${type}`);
  const model=world.addEnemy(type,definition.boss);const lane=options.lane??Math.floor(Math.random()*(state.wave===0?2:3))-(state.wave===0?0:1);
  const hp=definition.hp*(definition.boss?1:DIFFICULTY[state.difficulty].hp);
  const enemy={type,...definition,model,hp,maxHp:hp,lane,progress:options.progress??0,seed:Math.random()*100,scale:definition.boss?2:type==='fragment'?.7:1,flash:0,dead:false,guarded:false};
  enemies.push(enemy);positionEnemy(enemy);
  if(definition.boss){state.bosses.push(type);world.shake=1.5;world.ring(model.position,0xffa56e,10);notice(...definition.names,4);sound(95,.45,'sawtooth',.05);}
  return enemy;
}
function positionEnemy(enemy){
  // Equal travel time on all lanes; projection naturally enlarges approaching meshes.
  const p=enemy.progress,z=enemy.boss?-53+p*57:-75+p*79;
  const x=enemy.lane*(12-8*p)+Math.sin(p*Math.PI*2+enemy.seed)*(.45+(enemy.fly?1.5:0));
  enemy.model.position.set(x,enemy.fly?3.5+Math.sin(p*18+enemy.seed)*.8:Math.abs(Math.sin(world.time*5+enemy.seed))*.12,z);
  enemy.model.rotation.y=Math.sin(p*3+enemy.seed)*.11;
}
function removeEnemy(enemy){enemy.dead=true;const index=enemies.indexOf(enemy);if(index>=0)enemies.splice(index,1);world.remove(enemy.model);}
function upgrade(){
  if(state.unlocked>=WEAPONS.length-1){state.liver=clamp(state.liver-15);return;}
  state.unlocked++;state.weapon=state.unlocked;state.reload=0;state.ammo[state.weapon]=WEAPONS[state.weapon].mag;world.buildGun(state.weapon);
  notice(`무기 승급 · ${weaponName()}`,`WEAPON UPGRADE · ${weaponName()}`);sound(850,.22);
}
function damage(enemy,amount,byPlayer=true,point){
  if(enemy.dead)return;
  enemy.hp-=amount;enemy.flash=1;world.burst(point||enemy.model.position.clone().add(new THREE.Vector3(0,1.2,0)),byPlayer?0xffd395:0x9dedb7,byPlayer?5:3);
  if(enemy.hp>0)return;
  const position=enemy.model.position.clone();removeEnemy(enemy);
  if(byPlayer){state.score+=Math.round(enemy.score*Math.min(4,1+state.combo*.12));world.shake=Math.max(world.shake,enemy.boss?2:.25);hitTime=enemy.boss?.13:enemy.maxHp>=5?.075:.045;}
  world.burst(position,enemy.boss?0xffad7f:0xffdc9b,enemy.boss?45:13);
  if(enemy.boss){
    state.killedBosses.push(enemy.type);state.slow=.55;world.ring(position,0xffd39b,22);sound(65,.5,'sawtooth',.06);
    // Non-drug recovery keeps the default booth experience neutral.
    state.liver=clamp(state.liver-12);if(!state.failed)state.pancreas=clamp(state.pancreas+15);state.boost=5;
    notice('보스 격파! 정화 지원 · 간과 췌장 회복','BOSS DEFEATED · Purification support & organ recovery',3.5);
    if(enemy.type==='cancer')for(let i=0;i<3;i++)spawn('fragment',{progress:clamp((position.z+75)/79,0,.9),lane:i-1});
  }else if(byPlayer&&Math.random()<.08){state.core=clamp(state.core+2);state.liver=clamp(state.liver-2);world.ring(position,0xb8e88a,3);}
}
function reload(){
  if(state.phase!=='combat'||state.paused||state.difficulty==='easy'||state.reload>0||state.ammo[state.weapon]===WEAPONS[state.weapon].mag)return;
  state.reload=WEAPONS[state.weapon].reload*(1+stageOfLiver()*.16)*(state.shots>5&&state.hits/state.shots>.7?.88:1);
  sound(330,.12,'sine');
}
function swap(){
  if(state.phase!=='combat'||state.paused||state.unlocked<1)return;
  state.weapon=state.weapon===0?state.unlocked:state.weapon-1;state.reload=0;pendingShots=[];world.buildGun(state.weapon);updateHUD();
}
function shot(clientX,clientY,extra=false){
  if(state.phase!=='combat'||state.paused||state.reload>0||(!extra&&state.cooldown>0))return false;
  const rect=$('world').getBoundingClientRect();if(clientX<rect.left||clientX>rect.right||clientY<rect.top||clientY>rect.bottom)return false;
  const weapon=WEAPONS[state.weapon];
  if(state.difficulty!=='easy'&&state.ammo[state.weapon]<=0){reload();return false;}
  if(!extra)state.cooldown=weapon.delay;
  if(state.difficulty!=='easy')state.ammo[state.weapon]--;
  state.shots++;
  const picked=world.pick(clientX,clientY,enemies);let enemy=picked.enemy;
  if(weapon.homing&&!enemy){
    enemy=enemies.reduce((best,candidate)=>{
      const p=world.project(candidate.model);if(!p.visible)return best;
      const distance=Math.hypot(p.x-clientX,p.y-clientY);return !best||distance<best.distance?{enemy:candidate,distance}:best;
    },null)?.enemy;
  }
  world.shot(enemy?picked.enemy?picked.point:enemy.model.position.clone().add(new THREE.Vector3(0,1,0)):picked.point,state.weapon);
  sound(weapon.homing?140:600-state.weapon*37,.06+state.weapon*.008,state.weapon>8?'sawtooth':'triangle',.035);
  if(enemy){
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
      if(weapon.splash){for(const other of [...enemies])if(other!==enemy&&other.model.position.distanceTo(hitPosition)<weapon.splash)damage(other,3);world.ring(hitPosition,0xffba79,weapon.splash);}
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
    button.addEventListener('click',()=>{
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
    $('feedback').textContent=text('정답! 무기 승급 · 생명 +8 · 간 회복', 'Correct! Weapon upgrade · life +8 · liver restored');sound(950,.2);
  }else{
    $('feedback').textContent=text(`정답: ${state.quiz.a[state.quiz.correct]}`,`Correct answer: ${state.quiz.a[state.quiz.correct]}`);sound(150,.2,'sine');
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
  $('result-title').textContent=victory?text('방어 성공. 지식이 몸을 지켰습니다.','Defense complete. Knowledge protected the body.'):text('방어선이 무너졌습니다. 다시 도전하세요.','The line has fallen. Try again.');
  $('result-score').textContent=state.score.toLocaleString();$('result-stats').replaceChildren();
  for(const [label,value] of [[text('코어 생명','CORE LIFE'),`${Math.round(state.core)}%`],[text('명중률','ACCURACY'),`${state.shots?Math.round(state.hits/state.shots*100):0}%`],[text('퀴즈 정답','QUIZ CORRECT'),`${state.correct} / ${state.quizTotal}`]]){
    const div=document.createElement('div'),b=document.createElement('b'),p=document.createElement('p');b.textContent=value;p.textContent=label;div.append(b,p);$('result-stats').append(div);
  }
  $('result-note').textContent=text(`보스 ${state.killedBosses.length}/3 · 생존 보너스 ${bonus.toLocaleString()} · 최종 무기 ${weaponName()} · ${Math.floor(state.elapsed/60)}분 ${Math.floor(state.elapsed%60)}초`, `Bosses ${state.killedBosses.length}/3 · survival bonus ${bonus.toLocaleString()} · ${weaponName()} · ${Math.floor(state.elapsed/60)}m ${Math.floor(state.elapsed%60)}s`)+(state.failed?text(' / 췌장부전: 무력화 단계에서 당류 적을 먼저 정리하세요.',' / Pancreatic failure: prioritize sugar enemies during resistance.'):'');
  updateHUD();sound(victory?680:100,.5,'sine');
}
function combat(dt){
  state.waveTime+=dt;state.cooldown=Math.max(0,state.cooldown-dt);state.boost=Math.max(0,state.boost-dt);
  if(state.reload>0){state.reload=Math.max(0,state.reload-dt);if(!state.reload){state.ammo[state.weapon]=WEAPONS[state.weapon].mag;sound(500,.055);}}
  for(let i=pendingShots.length-1;i>=0;i--){pendingShots[i].in-=dt;if(pendingShots[i].in<=0){const p=pendingShots.splice(i,1)[0];shot(p.x,p.y,true);}}
  if(state.shooting)shot(aim.x,aim.y);
  const wave=WAVES[state.wave],tuning=DIFFICULTY[state.difficulty];
  if(state.waveTime<wave.bossAt){for(const timer of spawnTimers)if(state.waveTime>=timer.next){spawn(timer.type);timer.next+=timer.interval*tuning.gap;}}
  if(state.waveTime>=wave.bossAt&&!events.has('boss')){events.add('boss');spawn(wave.boss);}
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
      notice('방어선 돌파! 심장·콩팥·뇌혈관이 공격받습니다.','BREACH! Heart, kidneys and brain under attack.');sound(80,.2,'sawtooth');removeEnemy(enemy);
    }
  }
  state.pulse-=dt;
  if(state.pulse<=0){
    state.pulse=[9.5,11.5,13.5,17][stageOfLiver()]*(state.boost>0?.5:1);
    const origin=world.liver.position;world.ring(origin,0xd5ef9c,25);sound(390,.14,'sine',.018);
    for(const enemy of [...enemies])if(!enemy.fly&&enemy.model.position.distanceTo(origin)<25)damage(enemy,1,false);
  }
  if(!state.failed){
    const targets=enemies.filter(e=>e.sugar&&e.model.position.z>-28).sort((a,b)=>b.model.position.z-a.model.position.z);
    state.pancreas=clamp(state.pancreas+dt*(targets.length?.4:2.2));
    if(state.sugar>70&&targets.length)state.pancreas=clamp(state.pancreas-dt*1.4);
    if(state.pancreas<=5&&targets.length)state.strain+=dt;else if(state.pancreas>30)state.strain=Math.max(0,state.strain-dt*.5);
    if(state.strain>=12){state.failed=true;state.pancreas=0;notice('췌장부전 · 이번 판 인슐린 지원이 중단됩니다.','PANCREATIC FAILURE · Insulin support lost for this run.',4);}
    state.insulin-=dt;
    if(targets.length&&state.insulin<=0&&!state.failed){
      state.insulin=1+stageOfLiver()*.25;state.pancreas=clamp(state.pancreas-(state.sugar>70?5:2.2));
      const target=targets[0];world.turret.lookAt(target.model.position.clone().setY(2.8));
      world.bolt(world.tip.getWorldPosition(new THREE.Vector3()),target,1.2*pancreaticPower(),(e,d)=>damage(e,d,false));
    }
  }
  world.advanceProjectiles(dt);
  while(state.score>=state.nextUpgrade){state.nextUpgrade+=18000;upgrade();}
  if(state.core<=0){finish(false);return;}
  for(const time of wave.quiz){if(state.waveTime>=time&&!events.has(time)){events.add(time);openQuiz();return;}}
  // Never discard a living boss on a timeout; success requires all three kills.
  if(state.waveTime>=wave.duration&&enemies.length===0){
    if(!state.killedBosses.includes(wave.boss)){finish(false);return;}
    if(state.wave===2)finish(true);else openQuiz(true);
  }
}
function updateHUD(){
  $('score').textContent=String(state.score).padStart(6,'0');$('combo').textContent=state.combo>1?`${state.combo} COMBO / ×${Math.min(4,1+state.combo*.12).toFixed(1)}`:'';
  $('core').textContent=`${Math.round(state.core)}%`;$('core-fill').style.width=`${state.core}%`;$('accuracy').textContent=state.shots?`${Math.round(state.hits/state.shots*100)}%`:'—';$('quiz-count').textContent=`${state.correct}/${state.quizTotal}`;
  $('wave-name').textContent=`${state.wave===2?'FINAL ':''}WAVE ${String(state.wave+1).padStart(2,'0')} / 03`;
  $('wave-progress').style.width=`${clamp(state.waveTime/WAVES[state.wave].duration*100)}%`;
  $('wave-clock').textContent=`${Math.floor(state.waveTime)}s / ${WAVES[state.wave].duration}s`;
  $('liver-state').textContent=text(['건강 · 정화 파동 정상','MASLD · 파동 둔화','MASH · 보급 저하','섬유화 · 방어 약화'][stageOfLiver()],['Healthy · purification online','MASLD · slower pulses','MASH · reduced support','Fibrosis · weakened defense'][stageOfLiver()]);
  $('liver-fill').style.width=`${100-state.liver}%`;$('pulse-time').textContent=text(`다음 정화 ${Math.ceil(state.pulse)}초`,`Next pulse ${Math.ceil(state.pulse)}s`);
  $('pancreas-state').textContent=state.failed?text('췌장부전 · 지원 중단','Failure · support offline'):text(`기능 ${Math.round(state.pancreas)}% · 인슐린 ${Math.round(pancreaticPower()*100)}%`,`Function ${Math.round(state.pancreas)}% · insulin ${Math.round(pancreaticPower()*100)}%`);
  $('pancreas-fill').style.width=`${state.pancreas}%`;$('strain').textContent=state.strain>0?text(`부전 부담 ${state.strain.toFixed(1)} / 12초`,`Failure strain ${state.strain.toFixed(1)} / 12s`):text('당류 적 자동 요격','Auto-targeting sugar enemies');
  $('warning').textContent=state.failed?text('췌장부전 · 이번 판 회복 불가','PANCREATIC FAILURE · irreversible this run'):state.pancreas<=10?text('인슐린 무력화! 당류 적을 먼저 제거하세요','INSULIN RESISTANCE · clear sugar enemies'):state.sugar>70?text('고혈당 · 간과 췌장 부담 증가','HIGH GLUCOSE · liver & pancreas under strain'):'';
  $('weapon-tier').textContent=`ARSENAL ${String(state.weapon+1).padStart(2,'0')} / 12`;$('weapon-name').textContent=weaponName();
  $('ammo').textContent=state.difficulty==='easy'?text('∞ 무제한 탄약','∞ UNLIMITED AMMO'):state.reload>0?text(`재장전 ${state.reload.toFixed(1)}초`,`RELOAD ${state.reload.toFixed(1)}s`):`${state.ammo[state.weapon]} / ${WEAPONS[state.weapon].mag}`;
  $('reload').disabled=state.difficulty==='easy'||state.reload>0||state.ammo[state.weapon]===WEAPONS[state.weapon].mag;$('swap').disabled=state.unlocked<1;
  const boss=enemies.find(e=>e.boss);show('boss',!!boss);
  if(boss){$('boss-name').textContent=boss.names[state.lang==='ko'?0:1];$('boss-fill').style.width=`${clamp(boss.hp/boss.maxHp*100)}%`;$('boss').classList.toggle('critical',boss.hp/boss.maxHp<.25);}
  $('quiz-time').style.width=`${clamp(state.quizTime/18*100)}%`;$('quiz-seconds').textContent=`${Math.ceil(state.quizTime)}s`;
}
function step(seconds=1/60){
  if(!Number.isFinite(seconds)||seconds<0||seconds>600)throw new Error('step requires 0–600 seconds');
  let remaining=seconds;
  while(remaining>1e-7){const dt=Math.min(remaining,1/60);remaining-=dt;
    if(state.paused)continue;
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
  updateHUD();world.render();
}
function pause(force){
  if(!['combat','quiz'].includes(state.phase))return;
  state.paused=force??!state.paused;state.shooting=false;pendingShots=[];show('paused',state.paused);
}
function bindUI(){
  document.querySelectorAll('[data-lang]').forEach(button=>button.addEventListener('click',()=>{state.lang=button.dataset.lang;updateLanguage();loadBanks();}));
  document.querySelectorAll('[data-diff]').forEach(button=>button.addEventListener('click',()=>{state.difficulty=button.dataset.diff;updateLanguage();}));
  $('start').onclick=()=>{unlockAudio();if(loadFailed){loadBanks();return;}if(bank.ready)setPhase('guide');};
  $('deploy').onclick=()=>{unlockAudio();if(!document.fullscreenElement)$('stage').requestFullscreen?.({navigationUI:'hide'}).catch(()=>{});resetGame();};
  $('fullscreen').onclick=fullscreen;
  $('sound').textContent=muted?'♪ OFF':'♪ ON';$('sound').onclick=()=>{unlockAudio();muted=!muted;storage.set('muted',muted);$('sound').textContent=muted?'♪ OFF':'♪ ON';};
  $('reload').onclick=reload;$('swap').onclick=swap;$('pause').onclick=()=>pause();$('resume').onclick=()=>pause(false);
  $('submit').onclick=()=>{if(state.selection!==null)answerQuiz();};$('quiz-next').onclick=continueQuiz;
  $('restart').onclick=()=>{world.clear();enemies.length=0;state.paused=false;setPhase('home');updateLanguage();};
  $('admin-open').onclick=()=>{
    $('mix').value=bank.mix;$('drug').checked=bank.drug;
    $('bank-info').textContent=text(`공유 문제은행: MASLD ${bank.sets.masld.length}문 · Obesity ${bank.sets.obesity.length}문 / 최근 24문항 중복 회피`,`Shared banks: MASLD ${bank.sets.masld.length} · Obesity ${bank.sets.obesity.length} / avoids the last 24 questions`);setPhase('admin');
  };
  $('admin-close').onclick=()=>{
    const saved=bank.configure(Number($('mix').value),$('drug').checked);setPhase('home');
    if(!saved)notice('저장 공간이 차단되어 이 페이지에서만 설정이 유지됩니다.','Storage is blocked; settings apply only to this page.');
  };
  $('world').addEventListener('pointermove',event=>{
    aim={x:event.clientX,y:event.clientY};const rect=$('stage').getBoundingClientRect();$('reticle').style.left=`${event.clientX-rect.left}px`;$('reticle').style.top=`${event.clientY-rect.top}px`;
  });
  $('world').addEventListener('pointerdown',event=>{
    if(event.button!==0||state.phase!=='combat'||state.paused)return;
    event.preventDefault();unlockAudio();aim={x:event.clientX,y:event.clientY};state.shooting=true;shot(aim.x,aim.y);
  });
  window.addEventListener('pointerup',()=>state.shooting=false);window.addEventListener('pointercancel',()=>state.shooting=false);
  $('world').addEventListener('pointerleave',()=>state.shooting=false);
  $('world').addEventListener('contextmenu',event=>{event.preventDefault();swap();});
  window.addEventListener('blur',()=>{state.shooting=false;if(!manual)pause(true);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&!manual)pause(true);});
  $('world').addEventListener('webglcontextlost',event=>{event.preventDefault();pause(true);$('fatal-text').textContent=text('그래픽 연결이 중단됐습니다. 다시 불러와 주세요.','Graphics context lost. Please reload.');show('fatal',true);});
}
try{
  world=new World($('world'));bindUI();updateLanguage();loadBanks();
  // Manual mode makes headless stepping deterministic and independent of rAF.
  window.ASTRA={state,enemies,world,bank,WEAPONS,TYPES,WAVES,spawn,shot,reload,swap,start:resetGame,openQuiz,answerQuiz,continueQuiz,pause,step,project:enemy=>world.project(enemy.model),setManual(value=true){manual=value;lastTime=performance.now();},damage,finish};
  function frame(now){const dt=Math.min(.05,(now-lastTime)/1000);lastTime=now;if(!manual)step(dt);requestAnimationFrame(frame);}requestAnimationFrame(frame);
}catch(error){console.error(error);$('fatal-text').textContent=text('3D 화면을 시작하지 못했습니다. WebGL2를 지원하는 브라우저에서 서버 주소로 열어 주세요.','Could not start 3D graphics. Open the HTTP server URL in a browser supporting WebGL2.');show('fatal',true);}
