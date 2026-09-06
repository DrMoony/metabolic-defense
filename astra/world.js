import * as THREE from '../vendor/three.module.js';
export { THREE };
import { roundedBox, bakeStatic, contact, glow, reflections, environment, guardian, pancreas } from './art.js?v=a4';
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const materials = new Map();
const shapes = {
  sphere: new THREE.SphereGeometry(1, 20, 14),
  box: roundedBox(),
  cylinder: new THREE.CylinderGeometry(1, 1, 1, 24),
  cone: new THREE.ConeGeometry(1, 1, 16),
  torus: new THREE.TorusGeometry(1, .13, 8, 48),
  ico: new THREE.IcosahedronGeometry(1, 1),
};
Object.values(shapes).forEach(g=>g.userData.shared=true);
function material(color, glow = 0, metal = .15) {
  const key = `${color}:${glow}:${metal}`;
  if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: glow, roughness: .25, metalness: metal }));
  return materials.get(key);
}
function part(root, kind, color, at, scale, glow = 0, metal = .15) {
  const mesh = new THREE.Mesh(shapes[kind], material(color, glow, metal));
  mesh.position.set(...at); mesh.scale.set(...scale); mesh.castShadow = true; mesh.receiveShadow = true; root.add(mesh); return mesh;
}
function tube(root, points, radius, color, glow = 0) {
  const path = new THREE.CatmullRomCurve3(points.map(p => V(...p)));
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(path, 64, radius, 8, false), material(color, glow));
  mesh.castShadow = true; mesh.receiveShadow = true; root.add(mesh); return mesh;
}
function face(group, z = .86, y = 1.2, gap = .35, boss = false) {
  for (const sign of [-1, 1]) {
    part(group,'sphere',0x632619,[gap*sign,y,z],[.28,.34,.12]);
    part(group,'sphere',0xfff6de,[gap*sign,y,z+.08],[.245,boss?.2:.30,.12]);
    part(group,'sphere',0x36170b,[gap*sign+.015,y-.015,z+.19],[.15,.205,.085],0,.05);
    part(group,'sphere',0xffffff,[gap*sign-.04,y+.085,z+.27],[.064,.074,.026],.25);
    part(group,'sphere',0xffffff,[gap*sign+.066,y-.085,z+.27],[.024,.03,.018],.1);
    const brow=part(group,'sphere',0x642817,[gap*sign,y+.37,z+.08],[.28,.057,.065]);brow.rotation.z=sign*(boss?-.35:.27);
    part(group,'sphere',0xff7470,[gap*sign*1.3,y-.32,z+.06],[.17,.11,.05],.04);
  }
  part(group,'sphere',0x64161d,[0,y-.37,z+.04],[.21,.23,.085]);
  part(group,'sphere',0xff797b,[0,y-.46,z+.11],[.13,.10,.036],.06);
}
export function foodModel(type, boss = false) {
  const group = new THREE.Group();
  const limbs = [];
  const warm = 0xffba22, red = 0xef291a;
  if (type === 'soda') {
    part(group, 'cylinder', 0xefe2ba, [0,.7,0], [.1,1.2,.1]);
    part(group, 'sphere', 0xffa751, [0,1.55,0], [.9,.9,.4]);
    const swirl=[];for(let i=0;i<100;i++){const a=i*.18,r=.04+i*.0077;swirl.push([Math.cos(a)*r,1.55+Math.sin(a)*r,.39+Math.sqrt(Math.max(0,1-r*r))*.08]);}tube(group,swirl,.07,0xfff8dc,.1);
    part(group,'torus',0xffe3a0,[0,1.55,.15],[.9,.9,1],.1);
    face(group,.47,1.6,.33);
  } else if (type === 'fries') {
    const pack=new THREE.Shape();pack.moveTo(-.66,.36);pack.lineTo(.66,.36);pack.lineTo(.91,1.68);pack.quadraticCurveTo(0,1.22,-.91,1.68);pack.closePath();
    const carton=new THREE.Mesh(new THREE.ExtrudeGeometry(pack,{depth:.75,bevelEnabled:true,bevelSegments:3,bevelSize:.08,bevelThickness:.09,curveSegments:12}),material(red,0,.15));carton.position.z=-.42;carton.castShadow=true;group.add(carton);
    for(let i=0;i<13;i++){const fry=part(group,'box',i%3?warm:0xffd655,[(i%5-2)*.31,1.85+(i%3)*.19,i<5?-.25:.04],[.24,1.25+(i%4)*.13,.25]);fry.rotation.z=(i%5-2)*-.15;fry.rotation.y=i*.43;}
    tube(group,[[-.89,1.69,.43],[-.5,1.48,.48],[0,1.39,.49],[.5,1.48,.48],[.89,1.69,.43]],.065,0xffd543);
    face(group,.57,.97,.34);
  } else if (type === 'burger') {
    part(group,'sphere',warm,[0,1.78,0],[1.25,.65,.96]);
    part(group,'cylinder',0x663d30,[0,1.04,0],[1.12,.46,.93]);
    part(group,'sphere',0x91b855,[0,1.4,0],[1.3,.14,1]);
    part(group,'box',0xffd55e,[0,1.3,0],[1.85,.16,1.5]).rotation.y=.3;
    part(group,'sphere',warm,[0,.65,0],[1.21,.32,.96]);
    for(let i=0;i<9;i++)part(group,'sphere',0xffe7b1,[Math.sin(i*2.4)*.8,2.18+Math.cos(i)*.08,Math.cos(i*2.4)*.5],[.05,.035,.1]);
    face(group,1,1.15,.45);
  } else if (type === 'pizza') {
    const slice=part(group,'cone',0xffd078,[0,1.2,0],[1,2,.42]);slice.rotation.z=Math.PI;
    part(group,'sphere',warm,[0,2.15,0],[1.12,.24,.48]);
    for(const [x,y] of [[-.4,1.8],[.35,1.72],[0,.8]])part(group,'sphere',red,[x,y,.4],[.19,.19,.055]);
    face(group,.47,1.4,.3);
  } else if (type === 'icecream') {
    part(group,'cone',warm,[0,.7,0],[.57,1.4,.57]).rotation.z=Math.PI;
    part(group,'sphere',0xa2e1b8,[0,1.7,0],[.85,.8,.8]);
    for(let i=0;i<7;i++)part(group,'sphere',0x604235,[Math.sin(i*2)*.65,1.9+Math.cos(i)*.3,.56],[.09,.1,.09]);
    face(group,.78,1.65,.3);
  } else if(type === 'donut') {
    part(group,'torus',warm,[0,1.3,0],[.85,.85,2.3]);
    part(group,'torus',0xf698b1,[0,1.3,.18],[.84,.84,1.4]);face(group,.55,1.45,.48);
  } else if(type === 'wing') {
    part(group,'sphere',0xc98842,[0,1.4,0],[.85,1,.7]);
    part(group,'cylinder',0xffe5c6,[0,.45,0],[.17,.8,.17]);
    for(let i=0;i<12;i++)part(group,'ico',warm,[Math.sin(i*2)*.7,1.4+Math.cos(i*2)*.7,Math.sin(i*4)*.5],[.2,.2,.2]);
    face(group,.72,1.4,.32);
  } else if(type === 'syrup') {
    part(group,'cylinder',0xca743a,[0,1.2,0],[1.12,2.4,1.12],.05,.55);
    for(const y of [.24,1.25,2.22])part(group,'torus',0x3e5655,[0,y,0],[1.13,1.13,1]).rotation.x=Math.PI/2;
    part(group,'cylinder',0xe5c480,[0,2.65,0],[.15,.6,.15],.2,.7);
    const weak=part(group,'torus',0xffe685,[0,2.95,0],[.48,.48,1],1.6);weak.userData.weak=true;
    part(group,'sphere',0xffe685,[0,2.95,0],[.25,.25,.18],1.6).userData.weak=true;
    face(group,1.12,1.3,.43,true);
  } else if(type === 'cancer' || type === 'fragment') {
    part(group,'ico',0xc85391,[0,1.25,0],[1.2,1.2,1],.12);
    for(let i=0;i<10;i++)part(group,'sphere',0xea6fa3,[Math.sin(i*2.4)*1.03,1.25+Math.cos(i*2.4)*1.02,Math.sin(i*4)*.55],[.4,.43,.4],.08);
    face(group,1.05,1.4,.42,boss);
  } else if(type === 'plaque') {
    part(group,'ico',0x9a4353,[0,1.15,0],[1.6,1.1,1.1],.08,.3);
    for(let i=0;i<9;i++){const shard=part(group,'cone',0xffe2b0,[Math.sin(i*2.4)*1.35,1.7+Math.cos(i*2.4)*.55,Math.cos(i)*.6],[.28,1.2,.27]);shard.rotation.z=Math.sin(i)*.6;}
    face(group,1.12,1.2,.5,true);
  }
  for(const sign of [-1,1]){
    part(group,'sphere',0xffc041,[sign*.48,.31,.02],[.18,.3,.2]);
    const shoe=new THREE.Group();shoe.position.set(sign*.48,.14,.19);group.add(shoe);
    part(shoe,'sphere',0xfff1d3,[0,-.02,.02],[.3,.17,.46]);part(shoe,'sphere',0xea3021,[0,.09,-.03],[.29,.22,.39]);limbs.push(shoe);
    const arm=part(group,'sphere',boss?0x975842:0xffbd35,[sign*1.03,1,.04],[.21,.45,.23]);arm.rotation.z=sign*.6;
    part(group,'sphere',0xffc348,[sign*1.15,.8,.23],[.28,.3,.27]);
    if(['donut','wing'].includes(type)){
      const wing=part(group,'sphere',0xf4e6ca,[sign*1.1,1.5,0],[.8,.15,.4]);limbs.push(wing);
    }
  }
  bakeStatic(group,m=>!limbs.some(l=>m===l||m.parent===l)&&!m.userData.weak);
  const bar=new THREE.Group();bar.position.y=3.5;
  part(bar,'box',0x19353b,[0,0,0],[1.45,.09,.035]);
  const fill=part(bar,'box',0xd5ef9c,[0,0,.03],[1.42,.06,.035],.6);
  bar.children.forEach(mesh=>mesh.userData.decorative=true);
  group.add(bar);bar.visible=false;
  group.userData={limbs,bar,fill};
  if(boss)group.scale.setScalar(2);
  if(type==='fragment')group.scale.setScalar(.7);
  return group;
}
export class World {
  constructor(canvas) {
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
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
    this.quality=0;this.contacts=new Map();this.particles=[];
    this.sparks=new THREE.InstancedMesh(shapes.ico,new THREE.MeshBasicMaterial({color:0xffffff,toneMapped:false}),128);this.sparks.count=0;this.sparks.frustumCulled=false;this.scene.add(this.sparks);this.buildEnvironment();this.buildOrgans();this.buildGun(0);
    this.resize();window.addEventListener('resize',()=>this.resize());
  }
  buildEnvironment(){
    this.terrain=environment(this.scene);
    this.dust=new THREE.InstancedMesh(shapes.sphere,material(0xffdb87,.9),72);
    this.dustData=Array.from({length:72},()=>({x:(Math.random()-.5)*42,y:1+Math.random()*21,z:Math.random()*95-80,s:.025+Math.random()*.07}));
    this.scene.add(this.dust);this.dummy=new THREE.Object3D();
  }
  buildOrgans(){
    const liver=guardian(this.scene);this.liver=liver.root;this.liverBody=liver.body;
    const insulin=pancreas(this.scene);this.pancreas=insulin.root;this.turret=insulin.turret;this.tip=insulin.tip;
    this.cores=[];
    for(let i=0;i<3;i++){
      const core=new THREE.Group();core.position.set((i-1)*2.1,1,6);this.scene.add(core);
      part(core,'cylinder',0x29484b,[0,-.6,0],[.8,.3,.8],0,.7);
      part(core,'ico',[0xff8293,0x9acfff,0xd5b1f4][i],[0,.3,0],[.57,.8,.57],.7,.5);
      part(core,'torus',0x9dcdc8,[0,.3,0],[.9,.9,.6],.6).rotation.x=.6;
      this.cores.push(core);
    }
  }
  buildGun(tier){
    if(this.gun){this.camera.remove(this.gun);this.gun.traverse(m=>{if(m.isMesh&& !Object.values(shapes).includes(m.geometry))m.geometry.dispose();if(m.isSprite)m.material.dispose();});}
    const group=new THREE.Group();this.gun=group;this.camera.add(group);
    group.position.set(.65,-.69,-1.5);group.scale.setScalar(.4);
    if(tier===0){
      group.position.set(.83,-.81,-1.6);group.scale.setScalar(.48);
      tube(group,[[0,-1,.1],[0,0,0],[-.15,.5,-.1],[-.57,1.25,-.2],[-.72,1.75,-.3]],.15,0x8b431c);
      tube(group,[[0,.15,0],[.29,.8,-.1],[.7,1.75,-.3]],.15,0x8b431c);
      for(const sign of [-1,1]){part(group,'torus',0xf1c05d,[sign*.7,1.6,-.27],[.17,.17,.7],0,.72).rotation.x=Math.PI/2;}
      tube(group,[[-.7,1.65,-.28],[0,.7,.4],[.7,1.65,-.28]],.036,0xf6d892);
      for(let i=0;i<6;i++)part(group,'torus',0x412632,[0,-.7+i*.11,.06],[.17,.17,.55]).rotation.x=Math.PI/2;
      part(group,'ico',0x6bffac,[0,.3,.19],[.18,.26,.11],1.1,.4);glow(group,0x73ffa7,[0,.3,.24],.8,.35);
      this.gunMuzzle=new THREE.Object3D();this.gunMuzzle.position.set(0,1,-.4);group.add(this.gunMuzzle);return;
    }
    const metal=tier<3?0x99764f:0x375659;
    part(group,'box',0x263b3d,[0,0,.3],[.38,.62,.62],0,.5).rotation.x=-.2;
    part(group,'box',metal,[0,.35,-.1],[.65,.42,1.5],0,.65);
    const barrels=tier===4?2:tier===10?4:1;
    for(let i=0;i<barrels;i++){
      const x=(i%2-(barrels>1?.5:0))*.36, y=.37+(i>1?.35:0);
      const b=part(group,'cylinder',metal,[x,y,-1],[tier>=9?.23:.13,1.7,tier>=9?.23:.13],0,.75);b.rotation.x=Math.PI/2;
      part(group,'torus',0xc6f3b0,[x,y,-1.85],[tier>=9?.25:.16,tier>=9?.25:.16,.4],.7);
    }
    if(tier<2){
      tube(group,[[-.7,.8,-.6],[-.4,.4,-.6],[0,.2,-.6],[.4,.4,-.6],[.7,.8,-.6]],.1,0xb18751);
      tube(group,[[-.7,.8,-.6],[0,.4,.2],[.7,.8,-.6]],.025,0xdfc695);
    }
    if(tier>=6)part(group,'box',0x1a3236,[0,-.22,-.3],[.22,.8,.35],0,.5);
    if(tier>=7)part(group,'cylinder',0x92dcca,[0,.74,-.5],[.12,.65,.12],.4).rotation.x=Math.PI/2;
    this.gunMuzzle=new THREE.Object3D();this.gunMuzzle.position.set(0,.4,-1.95);group.add(this.gunMuzzle);
  }
  setQuality(level){
    const next=Math.max(0,Math.min(3,level));if(next===this.quality)return;
    this.quality=next;
    const resolution=[1024,512,256,0][next];
    this.renderer.shadowMap.enabled=resolution>0;
    if(resolution){this.key.shadow.mapSize.set(resolution,resolution);if(this.key.shadow.map){this.key.shadow.map.dispose();this.key.shadow.map=null;}if(this.key.shadow.mapPass){this.key.shadow.mapPass.dispose();this.key.shadow.mapPass=null;}this.renderer.shadowMap.needsUpdate=true;}
    this.dust.count=[72,40,18,8][next];
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,[1.5,1.25,1,.8][next]));this.resize();
  }
  resize(){
    const rect=this.renderer.domElement.getBoundingClientRect();
    this.renderer.setSize(rect.width,rect.height,false);
    this.camera.aspect=rect.width/Math.max(1,rect.height);this.camera.updateProjectionMatrix();
  }
  addEnemy(type,boss){const model=foodModel(type,boss);this.root.add(model);this.contacts.set(model,contact(this.scene,boss?6:3,.65));return model;}
  remove(model){this.root.remove(model);const shadow=this.contacts.get(model);if(shadow){shadow.removeFromParent();shadow.material.dispose();shadow.geometry.dispose();this.contacts.delete(model);}model.traverse(m=>{if(m.isMesh&&!Object.values(shapes).includes(m.geometry))m.geometry.dispose();});}
  project(model,offset=1.2){
    const p=model.getWorldPosition(new THREE.Vector3());p.y+=offset;p.project(this.camera);
    const rect=this.renderer.domElement.getBoundingClientRect();return {x:rect.left+(p.x+1)*rect.width/2,y:rect.top+(1-p.y)*rect.height/2,visible:p.z<1&&Math.abs(p.x)<1&&Math.abs(p.y)<1};
  }
  pick(x,y,enemies){
    const rect=this.renderer.domElement.getBoundingClientRect();
    this.aim.set((x-rect.left)/rect.width*2-1,1-(y-rect.top)/rect.height*2);
    this.scene.updateMatrixWorld(true);this.ray.setFromCamera(this.aim,this.camera);
    const meshes=enemies.map(e=>e.model);
    const hit=this.ray.intersectObjects(meshes,true).find(h=>!h.object.userData.decorative);
    if(!hit)return {point:this.ray.ray.at(70,new THREE.Vector3()),enemy:null};
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
    const limit=[128,64,32,16][this.quality];count=Math.ceil(count*[1,.6,.3,.15][this.quality]);
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
    this.particles=[];this.sparks.count=0;
    for(const p of this.projectiles)this.scene.remove(p.mesh);this.projectiles=[];
    for(const p of this.fx)this.disposeFx(p);this.fx=[];
  }
  disposeFx(fx){this.scene.remove(fx.mesh);fx.mesh.material.dispose();fx.mesh.geometry.dispose();}
  animate(dt,state,enemies){
    this.time+=dt;const t=this.time;
    const active=!['home','guide','admin'].includes(state.phase);
    const desired=active?V(Math.sin(t*.29)*.13,6.6+Math.sin(t*.37)*.075,16):V(-3+Math.sin(t*.13)*.3,7,13);
    this.camera.position.lerp(desired,Math.min(1,dt*2));
    this.shake=Math.max(0,this.shake-dt*2.5);
    this.camera.position.x+=Math.sin(t*83)*this.shake*.14;this.camera.position.y+=Math.cos(t*71)*this.shake*.10;
    this.camera.lookAt(active?V(0,3,-29):V(-10,3.5,-21));
    this.kick=Math.max(0,this.kick-dt*7);this.gun.visible=active&&state.phase!=='result';this.gun.position.z=(state.weapon===0?-1.6:-1.5)+this.kick*.12;this.gun.rotation.x=this.kick*.12;
    this.hitLight.intensity*=Math.exp(-dt*20);
    this.liver.rotation.y=Math.sin(t*.7)*.025;this.liver.scale.setScalar(1+Math.sin(t*1.8)*.015);
    this.liverBody.material.color.setHex(0xcd4316).lerp(new THREE.Color(0x66503b),state.liver/100);
    this.pancreas.scale.setScalar(1+Math.sin(t*2.4)*.015);
    this.cores.forEach((core,i)=>{core.children[1].position.y=.3+Math.sin(t*2+i)*.13;core.children[2].rotation.y=t*.3+i;core.scale.setScalar(.7+state.core/333);});
    for(let i=0;i<this.dust.count;i++){
      const d=this.dustData[i];d.z+=dt*.65;if(d.z>14)d.z=-80;
      this.dummy.position.set(d.x+Math.sin(t*.3+i)*.3,d.y,d.z);this.dummy.scale.setScalar(d.s);this.dummy.updateMatrix();this.dust.setMatrixAt(i,this.dummy.matrix);
    }this.dust.instanceMatrix.needsUpdate=true;
    for(const e of enemies){
      const g=e.model;g.rotation.z=Math.sin(t*5+e.seed)*.045;g.userData.limbs.forEach((limb,i)=>limb.rotation.x=Math.sin(t*8+e.seed+i*Math.PI)*.45);
      g.userData.bar.visible=e.hp<e.maxHp&&!e.boss;g.userData.bar.quaternion.copy(g.quaternion).invert().multiply(this.camera.quaternion);
      g.userData.fill.scale.x=1.42*Math.max(.01,e.hp/e.maxHp);
      e.flash=Math.max(0,(e.flash||0)-dt*6);g.scale.setScalar(e.scale*(.86+e.progress*.22)*(1+e.flash*.14));
      const shadow=this.contacts.get(g);if(shadow){shadow.position.set(g.position.x,.065,g.position.z);const size=e.scale*(2.4+e.progress*.7)*(e.fly?1.5:1);shadow.scale.set(size,size*.67,1);shadow.material.opacity=(e.fly?.24:.48)+e.progress*.19;}
      // Only nearby actors cast the more expensive shadow; every actor retains contact.
      const casts=this.quality<3&&e.progress>(this.quality===0?.36:.65);
      if(g.userData.casts!==casts){g.traverse(m=>{if(m.isMesh&&!m.userData.decorative)m.castShadow=casts;});g.userData.casts=casts;}
    }
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
      if(!p.target.dead){const dest=p.target.model.position.clone().add(V(0,1.3,0));const delta=dest.sub(p.mesh.position);const travel=dt*(p.homing?43:30);
        if(delta.length()<travel){p.onHit(p.target,p.damage);p.life=0;}else p.mesh.position.addScaledVector(delta.normalize(),travel);}
      else p.life=0;
      if(p.life<=0){this.scene.remove(p.mesh);this.projectiles.splice(i,1);}
    }
  }
  render(){this.renderer.render(this.scene,this.camera);}
}
