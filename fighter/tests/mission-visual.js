import * as THREE from '../../vendor/three.module.js';
import { MissionSim, MISSIONS } from '../mission-sim.js';
import { MissionRenderer } from '../mission-render.js';
import { ORGANS } from '../data.js';
const renderer=new MissionRenderer(document.getElementById('world')),failures=[],results=[];
window.MISSION_VISUAL={renderer,failures,results,done:false};
let sampled=0;
const check=(condition,message)=>{if(!condition)failures.push(message);};
function assertActor(puppet,label,floor,framed=true){
  const bounds=puppet.getBounds(true);
  check(Number.isFinite(bounds.min.x)&&Number.isFinite(bounds.max.y),`${label}: nonfinite geometry`);
  check(bounds.min.y>=floor-.001,`${label}: floor penetration ${bounds.min.y-floor}`);
  if(!framed)return;
  for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
    const v=new THREE.Vector3(x,y,z).project(renderer.camera),sx=(v.x+1)*640,sy=(1-v.y)*360;
    check(sx>=4&&sx<=1276&&sy>=185&&sy<=640,`${label}: actor outside playfield ${sx.toFixed(1)},${sy.toFixed(1)}`);
  }
}
try{
  for(const hero of ORGANS){
    const s=new MissionSim(hero);s.player.x=500;s.player.invuln=0;
    for(const key of ['jab','kick'])for(const at of [1,5,10,15,19]){
      Object.assign(s.player,{attackKey:key,attack:20-at,y:0,grounded:true});renderer.draw(s);assertActor(renderer.hero,`${hero}/${key}/${at}`,0);sampled++;
    }
    s.player.y=250;s.player.grounded=false;renderer.draw(s);assertActor(renderer.hero,`${hero}/jump apex`,0);sampled++;
    // Both horizontal edges, with the forward hand fully extended.
    for(const [x,facing]of [[165,-1],[4420,1]]){s.player.x=x;s.player.y=0;s.player.grounded=true;s.player.facing=facing;s.player.attack=10;s.camera=x===165?640:3960;renderer.draw(s);assertActor(renderer.hero,`${hero}/edge/${x}`,0);sampled++;}
    await new Promise(requestAnimationFrame);
  }
  results.push('Five operatives: ground attacks, jumping and both stage edges passed.');
  for(let st=0;st<MISSIONS.length;st++){
    const s=new MissionSim('heart');s.stage=st;s.load();s.player.x=3710;s.player.invuln=0;s.enemies=[];s.startBoss();s.phase='boss';s.camera=3960;
    for(let cycle=0;cycle<3;cycle++)for(const time of [1,8,16,24,40,60]){
      Object.assign(s.boss,{mode:'attack',cycle,t:time,key:s.boss.char.commands[cycle].key,y:cycle===2?120:0});renderer.draw(s);assertActor(renderer.boss,`${s.config.boss}/${cycle}/${time}`,0);sampled++;
    }
    for(const [x,facing]of [[3660,1],[4480,-1]])for(let cycle=0;cycle<3;cycle++)for(const time of [8,24]){
      s.player.x=x===3660?4420:3560;s.camera=Math.min(3960,s.player.x+230);
      Object.assign(s.boss,{x,facing,mode:'attack',cycle,t:time,key:s.boss.char.commands[cycle].key,y:0});renderer.draw(s);assertActor(renderer.boss,`${s.config.boss}/edge/${x}/${cycle}/${time}`,0);sampled++;
    }
    results.push(`${s.config.boss}: 30 boss attack and edge frames passed.`);await new Promise(requestAnimationFrame);
  }
  results.push(`${sampled} real-WebGL actor frames checked.`);
}catch(error){failures.push(error.stack);}
results.push(failures.length?`FAIL: ${failures.length}\n${failures.slice(0,30).join('\n')}`:'ALL MISSION VISUAL REGRESSIONS PASSED');
window.MISSION_VISUAL.done=true;document.getElementById('results').textContent=results.join('\n');
