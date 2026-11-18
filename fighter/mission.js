import { MissionSim, MISSIONS, EMPTY } from './mission-sim.js';
import { MissionRenderer } from './mission-render.js';
import { CHARS, ORGANS } from './data.js';
import { readPlayer, Controller } from './input.js';
import { t, EN, LANG, languageLinks, languageURL } from './locale.js';
import { sfx } from './sfx.js';
import { music } from './snd/music.js';
const $=id=>document.getElementById(id), stage=$('mission-stage');
languageLinks();document.title=t('메타볼릭 파이터 · 돌파 작전','Metabolic Fighter · Mission');
const words={
  'back-link':t('← 대전게임으로','← Fighting game'), 'pause-button':t('일시정지 · Esc','Pause · Esc'),
  'mission-title':t('몸속 돌파 작전','BODY\nBREAKTHROUGH'), 'mission-brief':t('장기 대원과 함께 빌런의 거점을 뚫고 나아가요. 작은 침입자를 정리하면 각 구역의 보스가 모습을 드러내요.','Take an organ operative behind enemy lines. Run, jump and shoot through the invasion, then bring down the boss guarding each sector.'),
  'mission-length':t('7개 구역 · 보스 7종','7 SECTORS / 7 BOSSES'),'mission-checkpoint':t('보스 앞 체크포인트','BOSS CHECKPOINTS'),'mission-loadout':t('무한 사격 · 근접공격','UNLIMITED PULSE / MELEE'),
  'hero-prompt':t('함께할 장기 대원을 골라요','CHOOSE YOUR OPERATIVE'),'start':t('작전 시작 →','DEPLOY OPERATIVE →'),
  'controls':t('A / D 이동 · W 또는 Space 점프 · S 앉기 · G 사격 · H 근접공격\n게이지가 차면 G + H로 화면 공격 · Esc 일시정지 · M 소리 전환\n방향키와 Z / X도 사용할 수 있어요. 게임패드와 아래 화면 버튼도 지원해요.','A / D move · W or Space jump · S crouch · Hold G to fire · H melee\nFull meter: G + H screen blast · Esc pause · M sound\nAlso: arrows + Z / X, gamepad, or the on-screen buttons.'),
  'touch-jump':t('점프','JUMP'),'touch-melee':t('근접','MELEE'),'touch-shoot':t('사격','FIRE'),'touch-super':t('초필살기','SUPER'),'return-briefing':t('대원 선택으로 돌아가기','Return to operative selection'),
};
for(const [id,value]of Object.entries(words))$(id).textContent=value;
$('mission-title').style.whiteSpace='pre-line';$('back-link').href=languageURL(LANG,'./');
const abilities={heart:t('빠른 연사','Rapid pulse'),kidney:t('방어막으로 출발','Starts shielded'),liver:t('치유 보급 강화','Stronger healing'),pancreas:t('사격 피해 +18%','Pulse damage +18%'),muscle:t('근접 피해 +35%','Melee damage +35%')};
function preview(id){const s=new MissionSim(id);s.preview=true;s.player.x=1020;s.player.y=100;s.player.invuln=0;return s;}
let hero='heart',sim=preview(hero),renderer=new MissionRenderer($('world')),playing=false,paused=false,debugFrozen=false,shown='',toastLife=0,acc=0,last=performance.now();
const touch=new Set(),keys=new Set(),pad=new Controller(()=>readPlayer(0));
function fit(){stage.style.transform=`translate(-50%,-50%) scale(${Math.min(innerWidth/1280,innerHeight/720)})`;}
addEventListener('resize',fit);fit();
function buttons(){const box=$('heroes');box.replaceChildren(...ORGANS.map(id=>{const b=document.createElement('button');b.type='button';b.setAttribute('aria-pressed',String(id===hero));b.innerHTML=`${CHARS[id].name}<small>${abilities[id]}</small>`;b.addEventListener('click',()=>{hero=id;sim=preview(id);buttons();sfx.move();});return b;}));}buttons();
function start(){toastLife=0;$('toast').textContent='';sim=new MissionSim(hero);playing=true;paused=false;shown='';$('mission-overlay').hidden=true;$('mission-hud').hidden=false;$('pause-button').hidden=false;$('objective').hidden=false;$('ability').hidden=false;document.body.classList.add('playing');music.play(sim.config.music);sfx.fight();clearInput();}
function clearInput(){keys.clear();touch.clear();document.querySelectorAll('#touch-controls .held').forEach(b=>b.classList.remove('held'));pad.prev={x:0,y:0,p:false,k:false};}
function toast(text,frames=100){$('toast').textContent=text;toastLife=frames;}
function panel(kind){$('toast').textContent='';toastLife=0;shown=kind;const dead=kind==='dead',clear=kind==='clear',victory=kind==='victory';$('mission-overlay').hidden=false;$('briefing').hidden=true;$('end-panel').hidden=false;document.body.classList.remove('playing');
  $('end-kicker').textContent=paused?'PAUSED':clear?'SECTOR SECURED':victory?'ALL SECTORS SECURED':'OPERATIVE DOWN';
  $('end-title').textContent=paused?t('잠깐 쉬어가요','Operation paused'):clear?t('구역을 돌파했어요','Sector cleared'):victory?t('몸속을 지켜냈어요','Body defended'):sim.lives?t('다시 일어나요','Back into the fight'):t('작전이 끝났어요','Mission over');
  $('end-copy').textContent=paused?t('준비되면 이어서 출발해요.','Resume when you’re ready.'):clear?t(`${CHARS[sim.config.boss].name} 보스를 물리쳤어요. 다음 구역에서 체력을 회복해 출발해요.`,`${CHARS[sim.config.boss].name} defeated. Deploy into the next sector with full health.`):victory?t('일곱 보스를 모두 물리치고 침입을 막았어요.','All seven bosses defeated. The invasion is over.'):sim.lives?t(sim.bossStarted?'보스 앞 체크포인트에서 이어가요.':'이번 구역의 출발점에서 다시 도전해요.',sim.bossStarted?'Resume at the boss checkpoint.':'Retry from the start of this sector.'):t('대원을 다시 골라 첫 구역부터 도전해요.','Choose an operative and start a new campaign.');
  $('end-stats').textContent=`${t('점수','SCORE')} ${sim.score.toLocaleString()}   /   ${t('남은 목숨','LIVES')} ${sim.lives}`;
  $('continue').textContent=paused?t('계속하기 →','RESUME →'):clear?t(sim.stage===6?'작전 완료 →':'다음 구역 →',sim.stage===6?'COMPLETE OPERATION →':'NEXT SECTOR →'):victory||!sim.lives?t('새 작전 시작 →','NEW CAMPAIGN →'):t('다시 출발 →','REDEPLOY →');
}
function proceed(){clearInput();if(paused){paused=false;shown='';$('mission-overlay').hidden=true;document.body.classList.add('playing');music.play(sim.config.music);return;}
  if(sim.phase==='clear'){sim.next();if(sim.phase==='victory'){panel('victory');music.play('clear');return;}}
  else if(sim.phase==='dead'&&sim.lives>0)sim.retry();else{start();return;}
  shown='';$('mission-overlay').hidden=true;document.body.classList.add('playing');music.play(sim.config.music);if(sim.phase==='warning')for(const e of sim.events)event(e);
}
function pause(){if(!playing||['dead','clear','victory'].includes(sim.phase))return;if(paused){proceed();return;}paused=true;music.stop(.1);panel('pause');clearInput();}
$('start').addEventListener('click',start);$('continue').addEventListener('click',proceed);$('pause-button').addEventListener('click',pause);
$('return-briefing').addEventListener('click',()=>{playing=false;paused=false;shown='';$('toast').textContent='';toastLife=0;$('end-panel').hidden=true;$('briefing').hidden=false;$('mission-hud').hidden=true;$('boss-hud').hidden=true;$('objective').hidden=true;$('ability').hidden=true;$('pause-button').hidden=true;sim=preview(hero);clearInput();music.play('select');});
const prevented=['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyZ','KeyX'];
addEventListener('keydown',e=>{keys.add(e.code);if(prevented.includes(e.code))e.preventDefault();if(e.repeat)return;if(e.code==='Escape'||e.code==='KeyP')pause();if(e.code==='KeyM'){sfx.cycle();toast(sfx.label());}if(e.code==='Enter'){if(!playing)start();else if(shown)proceed();}});
addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',()=>{clearInput();if(playing&&!paused)pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();if(playing&&!paused)pause();}last=performance.now();acc=0;});
for(const b of document.querySelectorAll('[data-action]')){const a=b.dataset.action;b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);touch.add(a);b.classList.add('held');});for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>{touch.delete(a);b.classList.remove('held');});}
function input(p){return {...p,x:Math.max(-1,Math.min(1,p.x+(keys.has('ArrowRight')||touch.has('right')?1:0)-(keys.has('ArrowLeft')||touch.has('left')?1:0))),y:keys.has('ArrowDown')||touch.has('down')?1:p.y,jump:keys.has('Space')||keys.has('ArrowUp')||touch.has('jump'),p:p.p||keys.has('KeyZ')||touch.has('shoot'),k:p.k||keys.has('KeyX')||touch.has('melee'),super:touch.has('super')};}
function event(e){renderer.event(e);if(e.type==='shoot')sfx.play({type:'swing',char:sim.hero});if(e.type==='hit')sfx.play({type:'hit',char:sim.hero,key:'jab'});if(e.type==='hurt')sfx.play({type:'hit',heavy:true,char:sim.config.boss},0,sim.hero);if(e.type==='kill')sfx.play({type:'slam',big:e.boss});if(e.type==='super'){sfx.play({type:'super',char:sim.hero});toast(t('전방 일제 공격!','SCREEN BLAST!'),65);}if(e.type==='pickup'){sfx.confirm();toast(e.kind==='med'?t(`체력 +${sim.hero==='liver'?35:25}`,`HEALTH +${sim.hero==='liver'?35:25}`):e.kind==='spread'?t('확산탄 · 15초','SPREAD SHOT · 15s'):t('방어막 획득','SHIELD ACQUIRED'));}if(e.type==='boss'){music.play('vs');toast(t(`경고 · ${CHARS[sim.config.boss].name}`,`WARNING · ${CHARS[sim.config.boss].name.toUpperCase()}`),130);}if(e.type==='bossattack')sfx.play({type:'special',char:e.char,key:e.key});}
function tick(){const control=pad.poll();if(!playing){if(control.dir==='left'||control.dir==='right'){const at=ORGANS.indexOf(hero);hero=ORGANS[(at+(control.dir==='left'?4:1))%5];sim=preview(hero);buttons();sfx.move();}if(control.pp)start();return;}if(paused||shown){if(control.pp)proceed();return;}if(debugFrozen)return;const phase=sim.phase;sim.step(input(control));for(const e of sim.events)event(e);if(phase==='warning'&&sim.phase==='boss')music.play(sim.config.music);if(toastLife>0&&!--toastLife)$('toast').textContent='';
  if(['dead','clear'].includes(sim.phase)&&sim.phaseTick>65&&shown!==sim.phase){panel(sim.phase);music.play(sim.phase==='clear'?'win':'lose');}
}
function hud(){const p=sim.player;$('hero-label').textContent=`1P / ${CHARS[sim.hero].name}`;$('health-fill').style.width=`${p.hp}%`;$('hp-number').textContent=`${Math.ceil(p.hp)} / 100`;$('lives').textContent=`${t('목숨','LIVES')} × ${sim.lives}`;$('power').textContent=p.shield?t('방어막','SHIELD'):p.spread?`${t('확산탄','SPREAD')} ${Math.ceil(p.spread/60)}s`:'';
  $('stage-number').textContent=`SECTOR 0${sim.stage+1} / 07`;$('stage-name').textContent=sim.config.name[EN?1:0];$('route-fill').style.width=`${Math.min(100,p.x/sim.length*100)}%`;$('score').textContent=String(sim.score).padStart(6,'0');$('kill-count').textContent=`${sim.kills} ${t('처치','ELIMINATED')}`;
  $('super-label').textContent=p.meter>=100?t('초필살기 준비 · G + H','SUPER READY · G + H'):`${t('초필살기','SUPER')} ${Math.floor(p.meter)}%`;$('super-fill').style.width=`${p.meter}%`;
  $('objective').textContent=sim.bossStarted?t('보스의 공격 예고를 보고 피하며 공격해요.','Watch the wind-up. Dodge, then return fire.'):p.x>3100&&sim.enemies.some(e=>e.hp>0)?t(`남은 침입자 ${sim.enemies.filter(e=>e.hp>0).length}명을 정리하면 길이 열려요.`,`Eliminate ${sim.enemies.filter(e=>e.hp>0).length} remaining invaders to open the boss gate.`):t('앞으로 이동해 침입자를 처치해요. 보급상자는 앉아서 쏘거나 근접공격으로 열어요.','Advance and eliminate invaders. Crouch-fire or melee supply crates.');
  $('boss-hud').hidden=!playing||!sim.boss||paused;if(sim.boss){$('boss-label').textContent=`BOSS / ${sim.boss.char.name}`;$('boss-hp').textContent=`${Math.ceil(sim.boss.hp)} / ${sim.boss.maxHp}`;$('boss-fill').style.width=`${sim.boss.hp/sim.boss.maxHp*100}%`;}
}
function loop(now){acc+=Math.min(100,now-last);last=now;let n=0;while(acc>=1000/60&&n++<5){tick();acc-=1000/60;}renderer.draw(sim);hud();requestAnimationFrame(loop);}
$('loading').hidden=true;requestAnimationFrame(loop);
// Development handles use the same simulation and controls as the playable route.
window.MISSION={get freeze(){return debugFrozen;},set freeze(value){debugFrozen=!!value;},get sim(){return sim;},renderer,start,pause,proceed,get paused(){return paused;},run(n,i=EMPTY){for(let k=0;k<n;k++){sim.step(i);for(const e of sim.events)renderer.event(e);}hud();return {phase:sim.phase,hp:sim.player.hp,stage:sim.stage};}};
