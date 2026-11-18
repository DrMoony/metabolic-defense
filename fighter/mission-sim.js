// Fixed-step run-and-gun simulation. No DOM/WebGL: the same rules run in tests.
import { CHARS, ORGANS } from './data.js';
export const MISSIONS = [
  { boss:'soda', name:['탄산 항구','Fizz Docks'], color:'#47d9df', sky:'#102e43', accent:'#ffd063', music:'kidney' },
  { boss:'fries', name:['기름 정제소','Oil Refinery'], color:'#ffbc59', sky:'#382939', accent:'#ff7955', music:'liver' },
  { boss:'ramen', name:['소금 수송로','Salt Freight'], color:'#ffc37d', sky:'#253549', accent:'#9dd7dc', music:'pancreas' },
  { boss:'soju', name:['네온 골목','Neon District'], color:'#75e7ab', sky:'#24223f', accent:'#f4a1e5', music:'alley' },
  { boss:'smoke', name:['연무 공장','Smoke Foundry'], color:'#bca7ed', sky:'#292b40', accent:'#fa936f', music:'liver' },
  { boss:'burger', name:['야식 요새','Midnight Fortress'], color:'#ffac6d', sky:'#302435', accent:'#f4d46c', music:'gym' },
  { boss:'visceral', name:['뱃속 심연','Visceral Core'], color:'#f29cb8', sky:'#302039', accent:'#a1e1d3', music:'belly' },
];
export const EMPTY = Object.freeze({x:0,y:0,p:false,k:false,pp:false,pk:false,jump:false,super:false});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const overlap=(a,b)=>Math.abs(a.x-b.x)<(a.w+b.w)/2 && a.y<b.y+b.h && a.y+a.h>b.y;
export class MissionSim {
  constructor(hero='heart') {
    this.hero=ORGANS.includes(hero)?hero:'heart';this.stage=0;this.lives=3;this.score=0;this.kills=0;this.frames=0;this.nextId=0;this.load();
  }
  id(){return ++this.nextId;}
  load() {
    this.config=MISSIONS[this.stage];this.length=4600;this.gate=3500;this.camera=640;this.phase='run';this.phaseTick=0;this.t=0;this.events=[];this.boss=null;this.bossStarted=false;
    this.player={id:0,x:180,y:0,w:48,h:124,vx:0,vy:0,hp:100,maxHp:100,facing:1,grounded:true,invuln:90,shot:0,melee:0,attack:0,attackKey:'jab',meter:0,spread:0,shield:this.hero==='kidney'?1:0};
    this.platforms=[{x:1020,y:100,w:260,h:18},{x:1870,y:155,w:300,h:18},{x:2740,y:105,w:300,h:18}];
    this.hazards=[{x:1430,y:0,w:110,h:14},{x:2360,y:0,w:120,h:14}];
    this.enemies=Array.from({length:15},(_,i)=>({id:this.id(),kind:['runner','gunner','brute'][i%3],x:650+i*177,y:0,w:i%3===2?68:44,h:i%3===2?130:100,hp:i%3===2?72:i%3===1?38:28,maxHp:i%3===2?72:i%3===1?38:28,active:false,shot:50+i%4*15,wind:0,flash:0,facing:-1}));
    this.crates=[900,1820,3050].map((x,i)=>({id:this.id(),x,y:0,w:54,h:60,hp:24,drop:['med','spread','shield'][i]}));
    this.shots=[];this.pickups=[];this.effects=[];this.previousJump=false;
  }
  emit(type,x,y,extra={}){this.events.push({type,x,y,...extra});}
  damagePlayer(n,sourceX) {
    const p=this.player;if(p.invuln||this.phase==='dead')return;
    if(p.shield){p.shield=0;p.invuln=60;this.emit('shield',p.x,p.y+70);return;}
    p.hp=Math.max(0,p.hp-n);p.invuln=65;p.vx=(p.x>=sourceX?1:-1)*7;
    this.emit('hurt',p.x,p.y+70);
    if(p.hp<=0){this.lives--;this.phase='dead';this.phaseTick=0;this.emit('death',p.x,p.y+50);}
  }
  damageEnemy(e,n,charge=true) {
    if(e.hp<=0)return;e.hp=Math.max(0,e.hp-n);e.flash=6;if(charge)this.player.meter=clamp(this.player.meter+2,0,100);this.emit('hit',e.x,e.y+e.h*.55);
    if(!e.hp){this.score+=e===this.boss?2500:100;this.kills++;if(charge)this.player.meter=clamp(this.player.meter+7,0,100);this.emit('kill',e.x,e.y+e.h*.5,{boss:e===this.boss});
      if(e===this.boss){this.phase='clear';this.phaseTick=0;this.shots=[];this.score+=this.player.hp*10;}
      else if(this.kills%5===0)this.pickups.push({id:this.id(),x:e.x,y:15,w:30,h:30,kind:'med',life:1200});
    }
  }
  bullet(x,y,vx,vy,enemy=false,damage=14,r=8,kind='pulse') {
    this.shots.push({id:this.id(),x,y,vx,vy,enemy,damage,r,kind,life:150});
  }
  startBoss() {
    this.bossStarted=true;this.phase='warning';this.phaseTick=0;
    const c=CHARS[this.config.boss];this.boss={id:this.id(),char:c,x:4150,y:0,w:130,h:220,hp:480+this.stage*65,maxHp:480+this.stage*65,facing:-1,t:0,cycle:0,mode:'idle',key:c.commands[0].key,flash:0,target:3900,vx:0,vy:0};
    this.emit('boss',4150,180);
  }
  next(){if(this.phase!=='clear')return false;this.stage++;if(this.stage>=MISSIONS.length){this.phase='victory';this.stage=MISSIONS.length-1;return true;}this.load();return true;}
  retry(){if(this.phase!=='dead'||this.lives<=0)return false;
    const atBoss=this.bossStarted;this.load();if(atBoss){this.player.x=3660;this.enemies=[];this.crates=[];this.camera=3960;this.startBoss();}return true;
  }
  updateBoss() {
    const b=this.boss,p=this.player;if(!b||b.hp<=0)return;b.t++;b.facing=p.x>b.x?1:-1;b.flash=Math.max(0,b.flash-1);
    if(b.mode==='idle'&&b.t>75){b.mode='tell';b.t=0;b.target=p.x;if(b.char.id==='smoke'){b.x=clamp(p.x+(p.x<3950?540:-440),3660,this.length-120);this.emit('warp',b.x,100);}this.emit('tell',b.x,120);}
    else if(b.mode==='tell'&&b.t>=42){b.mode='attack';b.t=0;const mode=b.cycle%3;
      b.key=b.char.commands[mode===0?0:mode===1?1:2].key;
      if(mode===0){
        const fire=(y,speed,kind,r=12,vy=0)=>this.bullet(b.x+b.facing*75,y,b.facing*speed,vy,true,15,r,kind);
        switch(b.char.id){
          case 'soda': for(let i=0;i<4;i++)fire(100+i*32,7.5,'fizz',10);break;
          case 'fries': fire(15,7,'oil',14);fire(18,4.5,'oil',14);break;
          case 'ramen': fire(16,7,'broth',15);fire(28,5,'broth',17);break;
          case 'soju': for(let i=0;i<3;i++)fire(100+i*30,3.8,'flame',18);break;
          case 'smoke': fire(100,9,'ember',9);fire(180,8,'ember',9);break;
          case 'burger': for(let i=0;i<3;i++)fire(100+i*50,4.5,'cheese',18);break;
          case 'visceral': for(let i=0;i<3;i++)fire(120,4+i*.8,'glob',16,7+i*1.2);break;
        }
      }
      if(mode===1){b.vx=b.facing*(b.char.id==='fries'?10:b.char.id==='soda'?9:7+this.stage*.4);}
      if(mode===2){b.vy=b.char.id==='burger'?16:13;b.vx=clamp((b.target-b.x)/42,-8,8);}
      this.emit('bossattack',b.x,100,{key:b.key,char:b.char.id});
    }
    if(b.mode==='attack'){
      const mode=b.cycle%3;
      if(mode===1){b.x+=b.vx;b.vx*=.98;}
      if(mode===2){b.y+=b.vy;b.vy-=.6;if(b.y<=0&&b.t>3){b.y=0;b.vy=0;b.vx=0;if(!b.landed){b.landed=true;for(const dir of [-1,1])this.bullet(b.x,12,dir*7,0,true,18,18,'wave');this.emit('slam',b.x,0);}}else b.x+=b.vx;}
      if(b.t>70&&b.y===0){b.mode='idle';b.t=0;b.cycle++;b.landed=false;b.vx=0;}
    }
    b.x=clamp(b.x,3660,this.length-120);
    if(overlap(p,b))this.damagePlayer(b.mode==='attack'?22:12,b.x);
  }
  step(input=EMPTY) {
    this.events=[];this.frames++;if(['dead','clear','victory'].includes(this.phase)){this.phaseTick++;return;}
    this.t++;this.phaseTick++;const p=this.player;
    if(this.phase==='warning'){if(this.phaseTick>130){this.phase='boss';this.phaseTick=0;}else return;}
    for(const k of ['invuln','shot','melee','attack','spread'])p[k]=Math.max(0,p[k]-1);
    const jumping=!!input.jump||input.y<0;
    if(jumping&&!this.previousJump&&p.grounded){p.vy=18;p.grounded=false;this.emit('jump',p.x,p.y);}
    this.previousJump=jumping;
    const crouch=input.y>0&&p.grounded;p.h=crouch?70:124;
    p.vx+=(input.x*(crouch?2.1:5.2)-p.vx)*.45;p.x+=p.vx;if(input.x)p.facing=input.x>0?1:-1;
    const oldY=p.y;p.vy-=.62;p.y+=p.vy;p.grounded=false;
    if(p.y<=0){p.y=0;p.vy=0;p.grounded=true;}
    for(const plat of this.platforms)if(p.vy<=0&&oldY>=plat.y&&p.y<=plat.y&&Math.abs(p.x-plat.x)<(p.w+plat.w)/2){p.y=plat.y;p.vy=0;p.grounded=true;}
    const maxX=this.bossStarted?this.length-180:this.gate;
    p.x=clamp(p.x,this.bossStarted?3560:165,maxX);
    this.camera=clamp(p.x+230,640,this.length-640);
    if((input.super||(input.p&&input.k))&&p.meter>=100){p.meter=0;p.invuln=100;this.emit('super',p.x,p.y+90);for(const e of [...this.enemies,this.boss].filter(Boolean))if(Math.abs(e.x-p.x)<850)this.damageEnemy(e,180,false);this.shots=this.shots.filter(s=>!s.enemy);}
    else {
      if(input.p&&p.shot===0){p.shot=this.hero==='heart'?7:9;p.attack=9;p.attackKey='jab';const d=14*(this.hero==='pancreas'?1.18:this.hero==='muscle'?1.1:1);
        for(const vy of p.spread?[-2.1,0,2.1]:[0])this.bullet(p.x+p.facing*54,p.y+(crouch?45:88),p.facing*15,vy,false,d);
        this.emit('shoot',p.x,p.y+88);
      }
      if((input.pk||input.k)&&p.melee===0){p.melee=28;p.attack=20;p.attackKey='kick';this.emit('melee',p.x,p.y+55);
        for(const e of [...this.enemies,...this.crates,this.boss].filter(Boolean))if(e.hp>0&&Math.abs(e.x-(p.x+p.facing*65))<125&&Math.abs(e.y-p.y)<120){if(e.drop)this.breakCrate(e,32);else this.damageEnemy(e,this.hero==='muscle'?65:48);}
      }
    }
    for(const h of this.hazards)if(overlap(p,h))this.damagePlayer(12,h.x);
    for(const e of this.enemies){if(e.hp<=0)continue;if(Math.abs(e.x-p.x)<820)e.active=true;if(!e.active)continue;e.flash=Math.max(0,e.flash-1);e.facing=p.x>e.x?1:-1;
      const dist=Math.abs(e.x-p.x);e.shot--;
      if(e.kind==='gunner'){if(dist>460)e.x+=e.facing*1.2;if(e.shot===25)e.wind=25;if(e.shot<=0){e.shot=125;this.bullet(e.x,e.y+52,e.facing*5.5,0,true,12,9,'salt');this.emit('enemyshot',e.x,e.y+52);}}
      else{if(dist>40)e.x+=e.facing*(e.kind==='brute'?1.15:2.2);}
      e.wind=Math.max(0,e.wind-1);if(overlap(p,e))this.damagePlayer(e.kind==='brute'?18:10,e.x);
    }
    this.updateBoss();
    for(const s of this.shots){if(s.life<=0)continue;s.x+=s.vx;s.y+=s.vy;if(s.kind==='glob')s.vy-=.18;s.life--;
      if(s.y<0||s.x<0||s.x>this.length){if(s.kind==='glob'&&s.y<0){this.emit('globland',s.x,8);for(const dir of [-1,1])this.bullet(s.x,12,dir*4.5,0,true,12,13,'oil');}s.life=0;continue;}
      const target={x:s.x,y:s.y-s.r,w:s.r*2,h:s.r*2};
      if(s.enemy){if(overlap(target,p)){this.damagePlayer(s.damage,s.x);s.life=0;}}
      else for(const e of [...this.enemies,...this.crates,this.boss].filter(Boolean)){if(e.hp<=0||!overlap(target,e))continue;if(e.drop)this.breakCrate(e,s.damage);else this.damageEnemy(e,s.damage);s.life=0;break;}
    }
    this.shots=this.shots.filter(s=>s.life>0);
    for(const item of this.pickups){item.life--;if(Math.abs(item.x-p.x)<60&&Math.abs(item.y-p.y)<100){item.life=0;if(item.kind==='med')p.hp=Math.min(100,p.hp+(this.hero==='liver'?35:25));if(item.kind==='spread')p.spread=900;if(item.kind==='shield')p.shield=1;this.emit('pickup',p.x,p.y+70,{kind:item.kind});}}
    this.pickups=this.pickups.filter(i=>i.life>0);
    if(this.phase==='run'&&p.x>=this.gate-15&&this.enemies.every(e=>e.hp<=0))this.startBoss();
    // A hit later in the frame cannot overwrite the player's death.
    if(p.hp<=0&&this.phase!=='dead'){this.phase='dead';this.phaseTick=0;}
  }
  breakCrate(c,n){if(c.hp<=0)return;c.hp-=n;if(c.hp<=0){this.pickups.push({id:this.id(),x:c.x,y:15,w:30,h:30,kind:c.drop,life:1800});this.emit('crate',c.x,30);this.score+=50;}}
}
