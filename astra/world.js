import * as THREE from '../vendor/three.module.js';
export { THREE };
import { contact, glow, reflections } from './art.js?v=a7';
import { buildTerrain } from './terrain.js?v=a7';
import { buildPlateTerrain, configurePlateCamera, groundPoint } from './plate.js?v=a7';
import { cutout, enemyBillboard, animateEnemy, disposeBillboard, screenHeight, WEAPON_ART, spriteLoads, preloadSprites } from './sprites.js?v=a7';
import { getMap } from './maps/index.js?v=a7';
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const materials = new Map();
const shapes = {
  sphere: new THREE.SphereGeometry(1, 20, 14),
  ico: new THREE.IcosahedronGeometry(1, 1),
};
Object.values(shapes).forEach(g=>g.userData.shared=true);
function material(color, glow = 0, metal = .15) {
  const key = `${color}:${glow}:${metal}`;
  if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: glow, roughness: .25, metalness: metal }));
  return materials.get(key);
}
export class World {
  constructor(canvas) {
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.15;
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color(0x381a31);this.scene.fog=new THREE.FogExp2(0x54283f,.017);
    this.camera=new THREE.PerspectiveCamera(49,16/9,.1,160);
    this.scene.add(this.camera);
    this.camera.position.set(0,8,16);this.camera.lookAt(0,2,-24);
    reflections(this.scene);
    this.scene.add(new THREE.HemisphereLight(0xffddba,0x51243b,1.5));
    const key=new THREE.DirectionalLight(0xffd8a1,3.6);key.position.set(-14,26,7);key.castShadow=true;
    Object.assign(key.shadow.camera,{left:-23,right:23,top:29,bottom:-29,near:1,far:100});key.shadow.mapSize.set(1024,1024);key.shadow.bias=-.0004;key.shadow.normalBias=.05;
    key.target.position.set(0,0,-22);this.scene.add(key,key.target);this.key=key;
    const rim=new THREE.DirectionalLight(0xff98b3,2.2);rim.position.set(8,18,-40);this.scene.add(rim);
    const fill=new THREE.DirectionalLight(0x9cceff,.65);fill.position.set(17,8,9);this.scene.add(fill);
    for(const [x,y,z,color,power] of [[-8,6,-9,0xffb934,220],[9,4,-5,0x53dded,180],[0,9,-35,0xff886f,480]]){
      const light=new THREE.PointLight(color,power,45,2);light.position.set(x,y,z);this.scene.add(light);
    }
    this.hitLight=new THREE.PointLight(0xffd98b,0,20);this.scene.add(this.hitLight);
    this.root=new THREE.Group();this.scene.add(this.root);this.fx=[];this.projectiles=[];
    this.ray=new THREE.Raycaster();this.aim=new THREE.Vector2();this.time=0;this.shake=0;this.kick=0;
    this.quality=0;this.contacts=new Map();this.particles=[];this.deaths=[];this.rewards=[];this.props=[];this.spriteLoads=spriteLoads;this.assetsReady=preloadSprites();this.assetsReady.catch(()=>{});
    this.sparks=new THREE.InstancedMesh(shapes.ico,new THREE.MeshBasicMaterial({color:0xffffff,toneMapped:false}),128);this.sparks.count=0;this.sparks.frustumCulled=false;this.scene.add(this.sparks);this.buildEnvironment();this.buildOrgans();this.placeOrgans();this.buildGun(0);
    this.resize();window.addEventListener('resize',()=>this.resize());
  }
  buildEnvironment(){
    this.map=getMap('coronary');this.configureMap();this.flight=0;
    this.dust=new THREE.InstancedMesh(shapes.sphere,material(0xffdb87,.9),72);
    this.dustData=Array.from({length:72},()=>({x:(Math.random()-.5)*42,y:1+Math.random()*21,z:Math.random()*95-80,s:.025+Math.random()*.07}));
    this.scene.add(this.dust);this.dummy=new THREE.Object3D();
  }
  buildOrgans(){
    for(const name of ['liver','pancreas']){
      const root=new THREE.Group(),body=cutout(`organ_${name}`,1);
      root.add(body);root.userData.body=body;this.scene.add(root);this[name]=root;
    }
    this.liverBody=this.liver.userData.body;
    this.turret=new THREE.Object3D();this.pancreas.add(this.turret);
    this.tip=new THREE.Object3D();this.tip.position.set(-.32,.57,.03);this.pancreas.add(this.tip);
  }
  configureMap(){
    if(this.map.plate){
      configurePlateCamera(this.camera,this.map);
      this.scene.background=null;this.scene.fog=null;
      this.renderer.domElement.style.backgroundImage=`url("${this.map.plate}")`;
      this.terrain=buildPlateTerrain(this.scene,this.map,this.camera);
    }else{
      this.renderer.domElement.style.backgroundImage='none';
      const map=this.map.legacy?.ready?this.map.legacy:this.map;
      this.camera.fov=49;this.camera.far=160;this.camera.updateProjectionMatrix();
      this.scene.background=new THREE.Color(map.palette.background);this.scene.fog=new THREE.FogExp2(map.palette.fog||map.palette.background,map.fog||.012);
      this.terrain=buildTerrain(this.scene,map);
    }
  }
  placeOrgans(){
    for(const name of ['liver','pancreas']){
      const model=this[name];
      if(this.map.plate){
        const data=this.map.organs[name];model.position.copy(groundPoint(this.camera,data.at));
        model.userData.baseScale=screenHeight(this.camera,model.position,data.height);
      }else{model.position.set(name==='liver'?-8.3:9.2,0,name==='liver'?-9:-6);model.userData.baseScale=name==='liver'?7.5:5;}
      model.quaternion.copy(this.camera.quaternion);model.scale.setScalar(model.userData.baseScale);
      // The source turret points right; turn it toward the playable road on right-hand islands.
      if(name==='pancreas'){
        const facing=this.map.plate&&this.map.organs.pancreas.at[0]<.5?1:-1;
        model.userData.body.scale.x=Math.abs(model.userData.body.scale.x)*facing;this.tip.position.x=.32*facing;
      }
    }
    const calibration=this.map.actors;
    this.actorScale=this.map.plate?screenHeight(this.camera,groundPoint(this.camera,calibration.at),calibration.height)/3:1;
  }
  selectMap(key){
    this.clear();this.terrain.dispose();this.map=getMap(key);this.configureMap();
    this.terrain.setQuality(this.quality);this.key.color.setHex(this.map.palette.accent);
    this.flight=this.map.plate?0:1;if(!this.map.plate)this.camera.position.set(14,17,34);
    this.placeOrgans();this.layoutGun();
  }
  routePoint(id,p){return this.terrain.routes.sample(id,p);}
  toggleRoutes(){this.terrain.debug.visible=!this.terrain.debug.visible;return this.terrain.debug.visible;}
  damageLandmark(landmark,amount){
    if(landmark.dead||!landmark.maxHp)return false;
    landmark.hp=Math.max(0,landmark.hp-amount);this.burst(landmark.model.position.clone().setY(1.5),0xffce74,6);
    if(landmark.hp===0){landmark.dead=true;landmark.model.visible=false;this.ring(landmark.model.position,0xffde91,4);return true;}
    return false;
  }

  buildGun(tier){
    if(this.gun)disposeBillboard(this.gun);
    const group=new THREE.Group();this.gun=group;this.camera.add(group);
    const body=cutout(WEAPON_ART[tier],1,'center');body.material.depthTest=false;body.material.depthWrite=false;body.renderOrder=100;
    group.add(body);group.userData.body=body;group.userData.tier=tier;
    this.gunMuzzle=new THREE.Object3D();group.add(this.gunMuzzle);
    this.muzzleFlash=glow(group,tier>9?0x79efff:0xffcf72,[0,0,.01],.2,0);
    this.muzzleFlash.material.depthTest=false;this.muzzleFlash.renderOrder=101;
    this.layoutGun();
  }
  layoutGun(){
    if(!this.gun)return;
    const group=this.gun,body=group.userData.body,tier=group.userData.tier;
    const viewHeight=2*1.5*Math.tan(THREE.MathUtils.degToRad(this.camera.fov/2)),viewWidth=viewHeight*this.camera.aspect;
    const aspect=body.scale.x/body.scale.y;
    const height=Math.min(viewHeight*(tier===0?.43:.49),viewWidth*.44/aspect),width=height*aspect;
    body.scale.set(width,height,1);
    group.position.set(viewWidth*.5-width*.47,-viewHeight*.5+height*.43,-1.5);
    group.userData.rest=group.position.clone();
    // Barrel-tip coordinates in each source image, normalized from top-left.
    const tips=[[.5,.29],[.13,.12],[.09,.06],[.47,.05],[.10,.06],[.08,.07],[.11,.06],[.06,.06],[.06,.06],[.05,.10],[.08,.06],[.07,.08]];
    const [x,y]=tips[tier];this.gunMuzzle.position.set((x-.5)*width,(.5-y)*height,.02);
    this.muzzleFlash.position.copy(this.gunMuzzle.position);this.muzzleFlash.scale.setScalar(height*.24);
  }
  setQuality(level){
    const next=Math.max(0,Math.min(3,level));if(next===this.quality)return;
    this.quality=next;
    this.terrain.setQuality(next);
    // First degradation spends only decorative density; preserve road edges and HP targets.
    const resolution=[1024,1024,512,0][next];
    this.renderer.shadowMap.enabled=resolution>0;
    if(resolution){this.key.shadow.mapSize.set(resolution,resolution);if(this.key.shadow.map){this.key.shadow.map.dispose();this.key.shadow.map=null;}if(this.key.shadow.mapPass){this.key.shadow.mapPass.dispose();this.key.shadow.mapPass=null;}this.renderer.shadowMap.needsUpdate=true;}
    this.dust.count=[72,72,40,8][next];
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,[1.5,1.5,1,.8][next]));this.resize();
  }
  resize(){
    const rect=this.renderer.domElement.getBoundingClientRect();
    this.renderer.setSize(rect.width,rect.height,false);
    this.camera.aspect=this.map.plate?16/9:rect.width/Math.max(1,rect.height);this.camera.updateProjectionMatrix();this.layoutGun();
  }
  addEnemy(type,boss){const model=enemyBillboard(type,boss);this.root.add(model);this.contacts.set(model,contact(this.scene,boss?6:3,.65));return model;}
  remove(model,dying=false){
    const shadow=this.contacts.get(model);if(shadow){shadow.removeFromParent();shadow.material.dispose();shadow.geometry.dispose();this.contacts.delete(model);}
    if(dying){model.userData.bar.visible=false;this.deaths.push({model,life:.38,scale:model.scale.clone()});}
    else disposeBillboard(model);
  }
  center(model){return model.localToWorld(V(0,model.userData.anchor==='center'?0:(model.userData.height||2.4)*.5,0));}
  project(model,offset){
    model.updateWorldMatrix(true,true);
    const p=offset===undefined?this.center(model):model.getWorldPosition(new THREE.Vector3()).add(V(0,offset,0));p.project(this.camera);
    const rect=this.renderer.domElement.getBoundingClientRect();return {x:rect.left+(p.x+1)*rect.width/2,y:rect.top+(1-p.y)*rect.height/2,visible:p.z<1&&Math.abs(p.x)<1&&Math.abs(p.y)<1};
  }
  reward(position,key='item_glp1'){
    const model=new THREE.Group();model.add(cutout(key,2.5));model.position.copy(position);model.scale.setScalar(this.actorScale);model.quaternion.copy(this.camera.quaternion);this.scene.add(model);
    this.rewards.push({model,life:1.5});
  }
  spawnTrap(routeId=this.terrain.routes.items[0].id){
    const model=new THREE.Group();model.position.copy(this.routePoint(routeId,.7));model.quaternion.copy(this.camera.quaternion);model.scale.setScalar(this.actorScale);
    const cage=cutout('trapcage',3.4),lock=cutout('traplock',1.05);lock.position.set(.15,.35,.04);model.add(cage,lock);this.scene.add(model);
    const prop={model,lock,life:12};this.props.push(prop);return prop;
  }
  freeTrap(prop){disposeBillboard(prop.model);this.props.splice(this.props.indexOf(prop),1);this.reward(prop.model.position,'item_gcgr');}
  pick(x,y,enemies){
    const rect=this.renderer.domElement.getBoundingClientRect();
    this.aim.set((x-rect.left)/rect.width*2-1,1-(y-rect.top)/rect.height*2);
    this.scene.updateMatrixWorld(true);this.ray.setFromCamera(this.aim,this.camera);
    const obstacles=this.terrain.landmarks.filter(l=>l.maxHp&&!l.dead);
    const meshes=[...(this.terrain.occluders||[]),...enemies.map(e=>e.model),...obstacles.map(l=>l.model),...this.props.map(p=>p.model)];
    const hit=this.ray.intersectObjects(meshes,true).find(h=>!h.object.userData.decorative);
    if(hit&&this.terrain.occluders?.includes(hit.object))return {point:hit.point,enemy:null,occluded:true};
    if(!hit)return {point:this.ray.ray.at(70,new THREE.Vector3()),enemy:null};
    const prop=this.props.find(p=>p.lock===hit.object);if(prop)return {point:hit.point,enemy:null,prop};
    let parent=hit.object;while(parent){const landmark=obstacles.find(l=>l.model===parent);if(landmark)return {point:hit.point,enemy:null,landmark};parent=parent.parent;}
    let object=hit.object;let enemy;
    while(object&&!enemy){enemy=enemies.find(e=>e.model===object);object=object.parent;}
    return {point:hit.point,enemy,weak:hit.object.userData.weak===true};
  }
  beam(from,to,color=0xd5ef9c,width=.045){
    const delta=to.clone().sub(from);const mesh=new THREE.Mesh(new THREE.CylinderGeometry(width,width,delta.length(),6),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.9}));
    mesh.position.copy(from).addScaledVector(delta,.5);mesh.quaternion.setFromUnitVectors(V(0,1,0),delta.normalize());this.scene.add(mesh);
    this.fx.push({mesh,life:.12,max:.12,kind:'beam'});
  }
  shot(point,tier){this.kick=1;this.hitLight.position.copy(point);this.hitLight.intensity=110;this.beam(this.gunMuzzle.getWorldPosition(new THREE.Vector3()),point,tier>9?0x8deaff:0xffd39b,tier>8?.095:.035);}
  burst(position,color=0xffcf8c,count=14){
    const limit=[128,128,64,16][this.quality];count=Math.ceil(count*[1,1,.6,.15][this.quality]);
    for(let i=0;i<count&&this.particles.length<limit;i++){
      const life=.35+Math.random()*.65;
      this.particles.push({position:position.clone(),velocity:V((Math.random()-.5)*10,2+Math.random()*7,(Math.random()-.5)*10),life,max:life,size:.06+Math.random()*.17,color:new THREE.Color(color)});
    }
  }
  ring(position,color=0xc9ef93,radius=25){
    const mesh=new THREE.Mesh(new THREE.TorusGeometry(1,.055,6,64),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.8}));
    mesh.rotation.x=-Math.PI/2;mesh.position.copy(position);mesh.position.y=.3;this.scene.add(mesh);
    this.fx.push({mesh,life:1.1,max:1.1,kind:'ring',radius});
  }
  bolt(from,target,damage,onHit,homing=false){
    const mesh=new THREE.Mesh(shapes.sphere,material(homing?0xffb95f:0x76eaff,1.8));mesh.scale.setScalar(homing?.22:.13);mesh.position.copy(from);this.scene.add(mesh);
    this.projectiles.push({mesh,target,damage,onHit,life:3,homing});
  }
  clear(){
    for(const model of [...this.root.children])this.remove(model);
    for(const entry of [...this.rewards,...this.props])disposeBillboard(entry.model);this.deaths=[];this.rewards=[];this.props=[];
    this.particles=[];this.sparks.count=0;
    for(const p of this.projectiles)this.scene.remove(p.mesh);this.projectiles=[];
    for(const p of this.fx)this.disposeFx(p);this.fx=[];
  }
  disposeFx(fx){this.scene.remove(fx.mesh);fx.mesh.material.dispose();fx.mesh.geometry.dispose();}
  animate(dt,state,enemies){
    this.time+=dt;const t=this.time;
    const active=['combat','quiz'].includes(state.phase);
    this.flight=Math.max(0,this.flight-dt*.48);
    this.terrain.animate(t,state.phase==='home'?0:state.wave,this.camera);
    const desired=active?V(Math.sin(t*.29)*.10,9.4+Math.sin(t*.37)*.075,19):state.phase==='guide'?V(4+Math.sin(t*.15)*.4,13,26):V(8+Math.sin(t*.13)*1.2,14+Math.sin(t*.21)*.25,29);
    if(this.flight>0){desired.x+=this.flight*8;desired.y+=this.flight*5;desired.z+=this.flight*12;}
    if(!this.map.plate){
    this.camera.position.lerp(desired,Math.min(1,dt*2));
    this.shake=Math.max(0,this.shake-dt*2.5);
    this.camera.position.x+=Math.sin(t*83)*this.shake*.14;this.camera.position.y+=Math.cos(t*71)*this.shake*.10;
    this.camera.lookAt(active?V(0,1,-26):V(0,1,-30));
    }else{this.shake=0;}
    this.camera.updateMatrixWorld(true);
    this.kick=Math.max(0,this.kick-dt*7);this.gun.visible=active&&state.phase!=='result';this.gun.position.copy(this.gun.userData.rest);this.gun.position.z+=this.kick*.08;this.gun.position.y-=this.kick*.025;this.gun.rotation.z=-this.kick*.045;this.muzzleFlash.material.opacity=this.kick*.95;
    this.hitLight.intensity*=Math.exp(-dt*20);
    this.liver.quaternion.copy(this.camera.quaternion);this.pancreas.quaternion.copy(this.camera.quaternion);this.liver.scale.setScalar(this.liver.userData.baseScale*(1+Math.sin(t*1.8)*.015));
    this.liverBody.material.color.setHex(0xffffff).lerp(new THREE.Color(0x66503b),state.liver/100);
    this.pancreas.scale.setScalar(this.pancreas.userData.baseScale*(1+Math.sin(t*2.4)*.015));
    for(let i=0;i<this.dust.count;i++){
      const d=this.dustData[i];d.z+=dt*.65;if(d.z>14)d.z=-80;
      this.dummy.position.set(d.x+Math.sin(t*.3+i)*.3,d.y,d.z);this.dummy.scale.setScalar(d.s);this.dummy.updateMatrix();this.dust.setMatrixAt(i,this.dummy.matrix);
    }this.dust.instanceMatrix.needsUpdate=true;
    for(const e of enemies){
      const g=e.model;e.flash=Math.max(0,(e.flash||0)-dt*6);
      animateEnemy(g,this.camera,t,e.seed,e.flash);
      g.userData.bar.visible=e.hp<e.maxHp&&!e.boss;
      g.userData.fill.scale.x=1.42*Math.max(.01,e.hp/e.maxHp);
      g.scale.setScalar(this.actorScale*e.scale*(.96+e.progress*.08));
      const shadow=this.contacts.get(g);if(shadow){shadow.position.set(g.position.x,.065,g.position.z);const size=this.actorScale*e.scale*(2+e.progress*.5)*(e.fly?1.2:1);shadow.scale.set(size,size*.67,1);shadow.material.opacity=(e.fly?.24:.48)+e.progress*.19;}
    }
    for(let i=this.deaths.length-1;i>=0;i--){const d=this.deaths[i];d.life-=dt;d.model.rotateZ(dt*4);d.model.scale.copy(d.scale).multiplyScalar(Math.max(0,d.life/.38));if(d.life<=0){disposeBillboard(d.model);this.deaths.splice(i,1);}}
    for(let i=this.rewards.length-1;i>=0;i--){const r=this.rewards[i];r.life-=dt;r.model.position.y+=dt*this.actorScale*2;r.model.quaternion.copy(this.camera.quaternion);if(r.life<=0){disposeBillboard(r.model);this.rewards.splice(i,1);}}
    for(let i=this.props.length-1;i>=0;i--){const p=this.props[i];p.life-=dt;p.model.quaternion.copy(this.camera.quaternion);if(p.life<=0){disposeBillboard(p.model);this.props.splice(i,1);}}
    for(let i=this.particles.length-1;i>=0;i--){const p=this.particles[i];p.life-=dt;if(p.life<=0){this.particles.splice(i,1);continue;}p.velocity.y-=dt*12;p.position.addScaledVector(p.velocity,dt);}
    this.sparks.count=this.particles.length;
    for(let i=0;i<this.particles.length;i++){const p=this.particles[i];this.dummy.position.copy(p.position);this.dummy.rotation.set(t*3+i,t*2,0);this.dummy.scale.setScalar(p.size*Math.min(1,p.life/p.max*2));this.dummy.updateMatrix();this.sparks.setMatrixAt(i,this.dummy.matrix);this.sparks.setColorAt(i,p.color);}
    this.sparks.instanceMatrix.needsUpdate=true;if(this.sparks.instanceColor)this.sparks.instanceColor.needsUpdate=true;
    for(let i=this.fx.length-1;i>=0;i--){
      const fx=this.fx[i];fx.life-=dt;fx.mesh.material.opacity=Math.max(0,fx.life/fx.max);
      if(fx.kind==='ring')fx.mesh.scale.setScalar(1+(1-fx.life/fx.max)*fx.radius);
      if(fx.life<=0){this.disposeFx(fx);this.fx.splice(i,1);}
    }
  }
  advanceProjectiles(dt){
    for(let i=this.projectiles.length-1;i>=0;i--){
      const p=this.projectiles[i];p.life-=dt;
      if(!p.target.dead){const dest=this.center(p.target.model);const delta=dest.sub(p.mesh.position);const travel=dt*(p.homing?43:30);
        if(delta.length()<travel){p.onHit(p.target,p.damage);p.life=0;}else p.mesh.position.addScaledVector(delta.normalize(),travel);}
      else p.life=0;
      if(p.life<=0){this.scene.remove(p.mesh);this.projectiles.splice(i,1);}
    }
  }
  render(){this.renderer.render(this.scene,this.camera);}
}
