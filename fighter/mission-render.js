import * as THREE from '../vendor/three.module.js';
import { Puppet } from './gfx/puppet.js';
import { CHARS } from './data.js';
import { EN } from './locale.js';
import { setView } from './gfx/comic.js';
const mats=new Map(), geoms=new Map();
const mat=(color,glow=false)=>{const key=color+glow;if(!mats.has(key))mats.set(key,new THREE.MeshStandardMaterial({color,roughness:.65,metalness:.12,...(glow?{emissive:color,emissiveIntensity:1.1}:{})}));return mats.get(key);};
const geo=(kind,a=1,b=1,c=1)=>{const key=[kind,a,b,c].join(':');if(!geoms.has(key))geoms.set(key,kind==='ball'?new THREE.SphereGeometry(a,14,10):kind==='cylinder'?new THREE.CylinderGeometry(a,b,c,12):new THREE.BoxGeometry(a,b,c));return geoms.get(key);};
function box(parent,x,y,z,w,h,d,color,glow=false){const m=new THREE.Mesh(geo('box',w,h,d),mat(color,glow));m.position.set(x,y,z);parent.add(m);return m;}
function ball(parent,x,y,z,r,color,scale=[1,1,1]){const m=new THREE.Mesh(geo('ball',r),mat(color));m.position.set(x,y,z);m.scale.set(...scale);parent.add(m);return m;}
function label(parent,text,x,y,color,size=26,w=240){const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const c=canvas.getContext('2d');c.fillStyle='#142e3c';c.fillRect(0,0,512,128);c.strokeStyle=color;c.lineWidth=9;c.strokeRect(5,5,502,118);c.font=`900 ${Math.min(58,450/text.length*1.5)}px system-ui`;c.textAlign='center';c.textBaseline='middle';c.fillStyle=color;c.fillText(text,256,66,470);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;const m=new THREE.Mesh(new THREE.PlaneGeometry(w,size*2),new THREE.MeshBasicMaterial({map:texture}));m.position.set(x,y,-105);parent.add(m);return m;}
function dropPuppet(p){if(!p)return;p.root.removeFromParent();for(const m of p.flashers)m.dispose();for(const hose of Object.values(p.hoses))hose.mesh.geometry.dispose();for(const g of p.owned||[])g.dispose();}
export class MissionRenderer {
  constructor(canvas) {
    this.gl=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});this.gl.setPixelRatio(Math.min(devicePixelRatio,1.5));this.gl.setSize(1280,720,false);this.gl.outputColorSpace=THREE.SRGBColorSpace;this.gl.toneMapping=THREE.ACESFilmicToneMapping;this.gl.toneMappingExposure=1.3;
    this.scene=new THREE.Scene();this.camera=new THREE.OrthographicCamera(-640,640,610,-110,.1,4000);setView(1280,720);
    this.scene.add(new THREE.HemisphereLight('#cceef6','#33304e',2.5));const key=new THREE.DirectionalLight('#fff3d8',3.5);key.position.set(-500,900,1200);this.scene.add(key);const rim=new THREE.DirectionalLight('#77e4ff',2);rim.position.set(600,500,-700);this.scene.add(rim);
    this.objects=new Map();this.particles=[];this.stage=-1;this.hero=null;this.boss=null;this.frame=0;this.kick=0;this.viewScale=1;
  }
  scenery(sim) {
    if(this.world){this.world.traverse(o=>{if(o.material?.map){o.material.map.dispose();o.material.dispose();o.geometry.dispose();}});this.world.removeFromParent();}
    for(const o of this.objects.values())o.removeFromParent();this.objects.clear();
    dropPuppet(this.boss);this.boss=null;this.stage=sim.stage;this.world=new THREE.Group();this.scene.add(this.world);
    const conf=sim.config;this.scene.background=new THREE.Color(conf.sky);this.scene.fog=new THREE.Fog(conf.sky,2000,3400);
    this.far=new THREE.Group();this.world.add(this.far);
    // A layered skyline, pipes, windows and signs keep the scrolling world legible.
    for(let i=-4;i<26;i++){const x=i*240,h=160+((i+4)*173)%290,w=120+((i+4)*47)%110;box(this.far,x,h/2+80,-950,w,h,100,'#193a50');box(this.far,x,h+90,-950,w+12,8,110,'#315769');
      for(let y=120;y<h+60;y+=43)for(let a=-1;a<=1;a++)box(this.far,x+a*28,y,-890,9,17,3,i%3?'#4b7883':conf.accent,true);
      if(i%3===0){box(this.far,x,h+150,-940,8,120,8,'#527888');ball(this.far,x,h+212,-938,7,conf.accent);}
    }
    for(let i=-1;i<24;i++){const x=i*230;box(this.world,x,-45,-50,232,90,320,'#28424c');box(this.world,x,0,-35,232,12,310,'#6d8b8a');box(this.world,x,-12,120,232,12,12,conf.color);box(this.world,x,-60,121,212,11,12,'#152b39');
      box(this.world,x+80,35,-220,28,70,24,'#537782');box(this.world,x+80,76,-220,80,10,32,conf.accent);for(let a=0;a<4;a++)box(this.world,x-68+a*36,-33,122,9,9,4,'#6f999b');
      if(i%4===1){const g=new THREE.Group();this.world.add(g);box(g,x,170,-360,120,330,100,'#2a4d5a');box(g,x-48,170,-298,15,300,24,conf.color);box(g,x+48,170,-298,15,300,24,conf.color);label(g,i%8===1?'METABOLIC':'SECTOR '+(sim.stage+1),x,300,conf.accent);}
      if(i%4===3){box(this.world,x,200,-470,180,28,50,'#456574');box(this.world,x-65,100,-470,14,200,14,'#456574');box(this.world,x+65,100,-470,14,200,14,'#456574');}
    }
    for(const p of sim.platforms){box(this.world,p.x,p.y-12,-25,p.w,24,120,'#4d747c');box(this.world,p.x,p.y+2,5,p.w+8,7,150,conf.color);for(const d of [-1,1])box(this.world,p.x+d*(p.w/2-22),p.y/2-15,-55,12,p.y-20,15,'#31515e');}
    this.hazardMeshes=sim.hazards.map(h=>{const g=new THREE.Group();g.position.x=h.x;this.world.add(g);box(g,0,3,0,h.w,10,90,'#3c272e');for(let j=-2;j<3;j++)box(g,j*20,9,0,9,9,80,conf.accent,true);return g;});
    this.gate=new THREE.Group();this.gate.position.x=sim.gate+75;this.world.add(this.gate);box(this.gate,0,140,-40,18,280,25,conf.color);box(this.gate,0,280,-35,120,18,40,conf.color);label(this.gate,'BOSS →',-35,320,conf.accent,25,190);
    this.tellMark=new THREE.Group();this.world.add(this.tellMark);box(this.tellMark,0,6,0,170,10,95,'#ff9978',true);box(this.tellMark,0,75,0,5,130,5,'#ff9978',true);
    this.gateBeam=box(this.gate,0,135,0,12,260,5,conf.accent,true);
    label(this.world,EN?'CHECKPOINT':'체크포인트',3890,355,conf.color,25,260);
    label(this.world,'0'+(sim.stage+1)+' / '+conf.name[1].toUpperCase(),1050,410,conf.accent,35,450);
  }
  minion(e){const g=new THREE.Group(), color=e.kind==='runner'?'#f8a9bf':e.kind==='gunner'?'#a6dbe9':'#e8b25e';
    if(e.kind==='runner'){const b=box(g,0,58,0,54,56,45,color);b.rotation.z=.12;box(g,-8,88,0,14,8,16,'#fff0dd');}
    else if(e.kind==='gunner'){const b=box(g,0,58,0,48,68,43,color);b.rotation.z=-.09;box(g,0,98,0,35,12,40,'#eaf9fa');box(g,-28,52,22,34,14,16,'#2b526a');box(g,-47,52,22,8,20,20,'#ffdc88');}
    else{ball(g,0,57,0,48,color,[1.05,1.1,.7]);ball(g,0,82,0,35,'#f8d38a',[1,.6,.8]);box(g,0,46,35,54,10,8,'#bf753e');}
    for(const d of [-1,1]){ball(g,d*17,10,8,13,'#223345',[1.3,.6,1.4]);ball(g,d*13,68,29,8,'#fff9e5');ball(g,d*13-2,68,36,4,'#152638');const brow=box(g,d*13,81,35,18,4,4,'#152638');brow.rotation.z=d*.2;}
    g.userData.body=g.children[0];this.scene.add(g);return g;
  }
  entity(id,make){if(!this.objects.has(id))this.objects.set(id,make());return this.objects.get(id);}
  puff(event,color){for(let i=0;i<(event.type==='kill'?20:5);i++){const mesh=new THREE.Mesh(geo('ball',3),mat(color,true));mesh.position.set(event.x,event.y,55);this.scene.add(mesh);const a=i*2.4;this.particles.push({mesh,vx:Math.cos(a)*(2+i%4),vy:Math.sin(a)*4+3,life:20+i%12});}while(this.particles.length>220)this.particles.shift().mesh.removeFromParent();}
  event(e){if(['hit','kill','crate','hurt','pickup','shield','warp','globland'].includes(e.type))this.puff(e,e.type==='hurt'?'#ff7b77':e.type==='pickup'?'#aaffd2':'#ffe49a');if(['hurt','kill','slam','super'].includes(e.type))this.kick=e.type==='super'?12:5;}
  actor(p,puppet,boss=false){const c=CHARS[boss?p.char.id:this.sim.hero],attack=boss?p.mode==='attack':p.attack>0,move=c.moves[boss?p.key:p.attackKey]||c.moves.jab;
    puppet.update({char:c,side:boss?1:0,x:p.x,y:-p.y,vx:p.vx||0,vy:-p.vy,facing:p.facing,state:attack?'attack':!boss&&this.sim.phase==='dead'?'down':!boss&&p.h===70?'crouch':Math.abs(p.vx||0)>1?'walk':'idle',t:boss?p.t:Math.max(1,20-p.attack),flash:boss?p.flash:p.invuln>58?4:0,move:attack?move:null},this.frame);
    const scale=boss?.85:this.sim.preview?.92:.58;puppet.root.scale.multiplyScalar(scale);puppet.root.position.set(p.x,p.y,20);if(p.y===0||(!boss&&p.grounded)){const bottom=puppet.getBounds(true).min.y;puppet.root.position.y+=Math.max(0,p.y-bottom);}
    puppet.root.visible=boss||!p.invuln||Math.floor(this.frame/5)%2===0;
  }
  draw(sim) {
    this.sim=sim;this.frame++;if(this.stage!==sim.stage)this.scenery(sim);
    if(!this.hero||this.hero.id!==sim.hero){dropPuppet(this.hero);this.hero=new Puppet(sim.hero);this.scene.add(this.hero.root);}
    this.actor(sim.player,this.hero);
    if(sim.boss){if(!this.boss||this.boss.id!==sim.boss.char.id){dropPuppet(this.boss);this.boss=new Puppet(sim.boss.char.id);this.scene.add(this.boss.root);}this.actor(sim.boss,this.boss,true);this.boss.root.visible=sim.boss.hp>0||this.frame%6<3;}else if(this.boss)this.boss.root.visible=false;
    const alive=new Set();
    for(const e of sim.enemies){if(e.hp<=0||!e.active)continue;alive.add(e.id);const g=this.entity(e.id,()=>this.minion(e));g.position.set(e.x,e.y+Math.sin(this.frame*.17+e.id)*2,10);g.rotation.z=Math.sin(this.frame*.13+e.id)*.035;g.scale.x=e.facing===-1?1:-1;g.visible=!e.flash||this.frame%3!==0;g.userData.body.scale.y=e.wind?1+Math.sin(this.frame)*.06:1;}
    for(const c of sim.crates){if(c.hp<=0)continue;alive.add(c.id);const g=this.entity(c.id,()=>{const g=new THREE.Group();box(g,0,30,0,54,60,48,'#537b77');box(g,0,30,27,44,44,5,'#e2b67a');box(g,0,30,31,32,7,5,'#3f5b54');box(g,0,30,31,7,32,5,'#3f5b54');this.scene.add(g);return g;});g.position.x=c.x;}
    for(const p of sim.pickups){alive.add(p.id);const g=this.entity(p.id,()=>{const g=new THREE.Group(),color=p.kind==='med'?'#a2ffbb':p.kind==='spread'?'#ffd475':'#9cdaff';box(g,0,0,0,32,32,22,color,true);box(g,0,0,14,20,5,3,'#203b43');box(g,0,0,14,5,p.kind==='med'?20:5,3,'#203b43');this.scene.add(g);return g;});g.position.set(p.x,p.y+15+Math.sin(this.frame*.08)*6,40);g.rotation.y=this.frame*.025;}
    for(const s of sim.shots){alive.add(s.id);const g=this.entity(s.id,()=>{const m=new THREE.Mesh(geo('ball',s.r),mat(s.enemy?({fizz:'#a9eaff',oil:'#ffcb6f',broth:'#ffd3a1',flame:'#8fd6ff',ember:'#ff9d73',cheese:'#ffe19a',glob:'#f3a1bc'}[s.kind]||'#ff9c79'):'#a9fff2',true));this.scene.add(m);return m;});g.position.set(s.x,s.y,45);g.scale.set(s.enemy?1:2.5,s.kind==='wave'?.65:1,1);}
    for(const [id,o] of this.objects)if(!alive.has(id)){o.removeFromParent();this.objects.delete(id);}
    for(const p of this.particles){p.mesh.position.x+=p.vx;p.mesh.position.y+=p.vy;p.vy-=.25;p.life--;p.mesh.scale.setScalar(Math.max(.1,p.life/25));if(p.life<=0)p.mesh.removeFromParent();}
    this.particles=this.particles.filter(p=>p.life>0);this.far.position.x=sim.camera*.32;
    this.tellMark.visible=!!sim.boss&&sim.boss.mode==='tell';if(sim.boss){this.tellMark.position.x=sim.boss.cycle%3===2?sim.boss.target:sim.boss.x;this.tellMark.scale.x=1+Math.sin(this.frame*.4)*.13;}
    this.gateBeam.visible=!sim.bossStarted;this.hazardMeshes.forEach((g,i)=>g.scale.y=1+Math.sin(this.frame*.15+i)*.3);
    // Keep rising attacks below the boss bar; widen immediately and ease back in.
    const bounds=[this.hero.getBounds(),...(sim.boss&&this.boss?[this.boss.getBounds()]:[])],top=Math.max(...bounds.map(b=>b.max.y));
    const reach=Math.max(...bounds.map(b=>Math.max(sim.camera-b.min.x,b.max.x-sim.camera))),target=Math.max(1,top/400,reach/610);
    this.viewScale=target>this.viewScale?target:this.viewScale+(target-this.viewScale)*.08;
    const scale=this.viewScale;this.camera.left=-640*scale;this.camera.right=640*scale;this.camera.top=610*scale;this.camera.bottom=-110*scale;this.camera.updateProjectionMatrix();
    const shake=(Math.random()-.5)*this.kick;this.kick*=.84;this.camera.position.set(sim.camera+shake,130,1700);this.camera.lookAt(sim.camera,0,0);
    this.gl.render(this.scene,this.camera);
  }
}
