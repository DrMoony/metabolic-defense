import * as THREE from '../vendor/three.module.js';
export { THREE };
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const materials = new Map();
const shapes = {
  sphere: new THREE.SphereGeometry(1, 20, 14),
  box: new THREE.BoxGeometry(1, 1, 1),
  cylinder: new THREE.CylinderGeometry(1, 1, 1, 24),
  cone: new THREE.ConeGeometry(1, 1, 16),
  torus: new THREE.TorusGeometry(1, .13, 8, 48),
  ico: new THREE.IcosahedronGeometry(1, 1),
};
function material(color, glow = 0, metal = .15) {
  const key = `${color}:${glow}:${metal}`;
  if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: glow, roughness: .32, metalness: metal }));
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
    part(group, 'sphere', 0xfff6dd, [gap * sign, y, z], [.22, boss ? .13 : .27, .13], .1);
    part(group, 'sphere', 0x132832, [gap * sign + .035, y - .015, z + .12], [.105, .15, .06]);
    part(group, 'sphere', 0xffffff, [gap * sign + .065, y + .06, z + .17], [.035, .04, .025], .4);
    const brow = part(group, 'box', 0x512d32, [gap * sign, y + .33, z], [.43, .10, .12]); brow.rotation.z = sign * (boss ? -.35 : -.15);
  }
  part(group, 'sphere', 0x462b38, [0, y - .36, z], [.2, .10, .08]);
}
export function foodModel(type, boss = false) {
  const group = new THREE.Group();
  const limbs = [];
  const warm = 0xeaaa54, red = 0xe66a55;
  if (type === 'soda') {
    part(group, 'cylinder', 0xefe2ba, [0,.7,0], [.1,1.2,.1]);
    part(group, 'sphere', 0xffa751, [0,1.55,0], [.9,.9,.4]);
    for (let i = 0; i < 3; i++) part(group,'torus', i % 2 ? 0xffb856 : 0xffeed1,[0,1.55,.35],[.25+i*.21,.25+i*.21,.5]);
    face(group,.47,1.6,.33);
  } else if (type === 'fries') {
    part(group,'box',red,[0,.9,0],[1.45,1.5,1]);
    for(let i=0;i<7;i++){const fry=part(group,'box',warm,[(i%4-1.5)*.31,1.85+(i%3)*.17,(i>3?-.23:.2)],[.24,1.35,.24]);fry.rotation.z=(i-3)*.045;}
    part(group,'torus',0xf8d280,[0,.92,.52],[.32,.32,.3]); face(group,.58,.95,.36);
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
    limbs.push(part(group,'sphere',0x644e43,[sign*.48,.15,.12],[.25,.26,.43]));
    const arm=part(group,'sphere',boss?0x975842:0xe9b475,[sign*1.03,1,.04],[.21,.45,.23]);arm.rotation.z=sign*.6;
    if(['donut','wing'].includes(type)){
      const wing=part(group,'sphere',0xf4e6ca,[sign*1.1,1.5,0],[.8,.15,.4]);limbs.push(wing);
    }
  }
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
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.25;
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color(0x102d36);this.scene.fog=new THREE.FogExp2(0x16353e,.019);
    this.camera=new THREE.PerspectiveCamera(53,16/9,.1,160);
    this.scene.add(this.camera);
    this.camera.position.set(0,8,16);this.camera.lookAt(0,2,-24);
    this.scene.add(new THREE.HemisphereLight(0xb9eaf0,0x563d38,2.1));
    const key=new THREE.DirectionalLight(0xffd2a4,3.1);key.position.set(-16,30,8);key.castShadow=true;
    Object.assign(key.shadow.camera,{left:-32,right:32,top:35,bottom:-35,near:1,far:100});key.shadow.mapSize.set(2048,2048);key.shadow.bias=-.0004;key.shadow.normalBias=.05;
    key.target.position.set(0,0,-22);this.scene.add(key,key.target);
    for(const [x,y,z,color,power] of [[-11,8,-5,0xff9868,1000],[10,7,-13,0x53dded,1300],[-4,10,-38,0xff816f,1100],[0,10,-63,0x61c0be,1200]]){
      const light=new THREE.PointLight(color,power,45,2);light.position.set(x,y,z);this.scene.add(light);
    }
    this.hitLight=new THREE.PointLight(0xffd98b,0,20);this.scene.add(this.hitLight);
    this.root=new THREE.Group();this.scene.add(this.root);this.fx=[];this.projectiles=[];
    this.ray=new THREE.Raycaster();this.aim=new THREE.Vector2();this.time=0;this.shake=0;this.kick=0;
    this.buildEnvironment();this.buildOrgans();this.buildGun(0);this.buildPost();
    this.resize();window.addEventListener('resize',()=>this.resize());
  }
  buildEnvironment(){
    const floor=part(this.scene,'box',0x315657,[0,-1.1,-35],[75,2,120],0,.35);
    floor.castShadow=false;
    // Three receding vessel arches, physical tissue, and raised vascular pathways.
    for(let i=0;i<10;i++){
      const z=8-i*9;
      tube(this.scene,[[-20,-1,z],[-20,10,z],[-14,18,z],[0,22,z],[14,18,z],[20,10,z],[20,-1,z]],.72,0x685359);
      tube(this.scene,[[-19,0,z-.3],[-19,10,z-.3],[-13,17,z-.3],[0,21,z-.3],[13,17,z-.3],[19,10,z-.3],[19,0,z-.3]],.085,i%2?0x7cb7ae:0xd89d79,.6);
      for(const side of [-1,1]){
        part(this.scene,'sphere',i%2?0x795956:0x986957,[side*(21+(i%3)),1.3,z],[5.5,4+(i%3),6]);
        part(this.scene,'sphere',0xc39369,[side*17.5,.25,z-2],[2.2,1.4,2.5]);
      }
    }
    for(let lane=-1;lane<=1;lane++){
      const x=lane*7;
      for(const edge of [-1,1]){
        tube(this.scene,[[x*1.7+edge*1.7,.08,-77],[x*1.3+edge*1.7,.08,-48],[x+edge*1.7,.08,-24],[lane*3.8+edge*1.7,.08,6]],.09,0x91c9bc,.7);
      }
      for(let i=0;i<19;i++){
        const z=5-i*4.2;const xx=lane*(3.8+(5-z)*.12);
        const tile=part(this.scene,'box',i%2?0x41686a:0x365d60,[xx,-.02,z],[3.1,.12,3.65],0,.38);tile.rotation.y=lane*-.11;
      }
    }
    tube(this.scene,[[-24,8,7],[-22,10,-15],[-26,12,-38],[-12,17,-68]],1.15,0x9a545c);
    tube(this.scene,[[23,5,5],[24,7,-25],[23,14,-47],[9,18,-70]],.85,0x56878e);
    // Visible defense boundary: passing this plane always damages the core.
    for(let x=-13;x<=13;x+=2)part(this.scene,'box',0xa4e0be,[x,.1,3],[1,.12,.28],1.3);
    this.dust=new THREE.InstancedMesh(shapes.sphere,material(0xc9c59a,.6),90);
    this.dustData=Array.from({length:90},()=>({x:(Math.random()-.5)*39,y:Math.random()*19,z:Math.random()*95-80,s:.035+Math.random()*.09}));
    this.scene.add(this.dust);this.dummy=new THREE.Object3D();
  }
  buildOrgans(){
    this.liver=new THREE.Group();this.liver.position.set(-10,0,-7);this.scene.add(this.liver);
    part(this.liver,'cylinder',0x243e3f,[0,.2,0],[3.2,.6,3.2],0,.6);
    for(const r of [2.8,3.3])part(this.liver,'torus',0xb4d98b,[0,.55,0],[r,r,.8],.9).rotation.x=Math.PI/2;
    const body=part(this.liver,'sphere',0xb86a48,[-.5,3.15,0],[3.4,2.2,1.5],.05);body.rotation.z=-.25;
    part(this.liver,'sphere',0xc27953,[2,2.7,.1],[1.7,1.3,1.3],.05).rotation.z=.5;
    tube(this.liver,[[-3,3,1],[-1,3.8,1.4],[0,3,1.5],[2,3.1,1]],.06,0xd5ef9c,1.2);
    tube(this.liver,[[-1,3.8,1.4],[-.7,2.6,1.5],[-2,1.8,1]],.055,0xd5ef9c,1.2);
    part(this.liver,'ico',0xc8ef97,[.2,3.1,1.65],[.55,.7,.35],1.3,.6);
    body.material=body.material.clone();this.liverBody=body;
    this.pancreas=new THREE.Group();this.pancreas.position.set(10,0,-5);this.scene.add(this.pancreas);
    part(this.pancreas,'cylinder',0x294950,[0,.3,0],[2.5,.7,2.5],0,.6);
    part(this.pancreas,'torus',0x76d7e2,[0,.75,0],[2.2,2.2,.8],1).rotation.x=Math.PI/2;
    for(let i=0;i<6;i++)part(this.pancreas,'sphere',0xe7b177,[-2+i*.75,2.1+Math.sin(i)*.25,0],[.9,.75,.9]);
    this.turret=new THREE.Group();this.turret.position.set(0,2.8,0);this.pancreas.add(this.turret);
    const barrel=part(this.turret,'cylinder',0x366f78,[0,.1,-1],[.42,2.8,.42],0,.7);barrel.rotation.x=Math.PI/2;
    for(const z of [-.4,-1.2,-2])part(this.turret,'torus',0x81e9eb,[0,.1,z],[.46,.46,.6],1.3);
    this.tip=new THREE.Object3D();this.tip.position.set(0,.1,-2.5);this.turret.add(this.tip);
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
    if(this.gun)this.camera.remove(this.gun);
    const group=new THREE.Group();this.gun=group;this.camera.add(group);
    group.position.set(.65,-.69,-1.5);group.scale.setScalar(.4);
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
  buildPost(){
    this.target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType});
    this.target.depthTexture=new THREE.DepthTexture(1,1,THREE.UnsignedIntType);
    this.postScene=new THREE.Scene();this.postCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
    this.postMat=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{map:{value:this.target.texture},depth:{value:this.target.depthTexture},pixel:{value:new THREE.Vector2()},focus:{value:36},near:{value:.1},far:{value:160}},vertexShader:'varying vec2 uvp; void main(){uvp=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`
      uniform sampler2D map;uniform sampler2D depth;uniform vec2 pixel;uniform float focus;uniform float near;uniform float far;varying vec2 uvp;
      float distanceAt(vec2 uv){float d=texture2D(depth,uv).r;return near*far/(far-d*(far-near));}
      void main(){
        vec3 base=texture2D(map,uvp).rgb;float z=distanceAt(uvp);
        float blur=smoothstep(48.,110.,z)*1.6;vec3 soft=vec3(0.);vec3 glow=vec3(0.);
        for(int i=0;i<8;i++){float a=float(i)*.785398;vec2 off=vec2(cos(a),sin(a))*pixel;
          soft+=texture2D(map,uvp+off*blur).rgb;
          vec3 light=texture2D(map,uvp+off*5.).rgb;glow+=max(light-.78,0.);
        }
        vec3 color=mix(base,soft/8.,.6)+glow*.065;
        gl_FragColor=vec4(color,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`});
    this.postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),this.postMat));
  }
  resize(){
    const rect=this.renderer.domElement.getBoundingClientRect();
    this.renderer.setSize(rect.width,rect.height,false);
    const size=this.renderer.getDrawingBufferSize(new THREE.Vector2());this.target.setSize(size.x,size.y);this.postMat.uniforms.pixel.value.set(1/size.x,1/size.y);
  }
  addEnemy(type,boss){const model=foodModel(type,boss);this.root.add(model);return model;}
  remove(model){this.root.remove(model);}
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
    for(let i=0;i<count;i++){
      if(this.fx.length>280)break;
      const mesh=new THREE.Mesh(shapes.ico,new THREE.MeshBasicMaterial({color,transparent:true}));
      mesh.position.copy(position);mesh.scale.setScalar(.08+Math.random()*.19);this.scene.add(mesh);
      const life=.35+Math.random()*.65;
      this.fx.push({mesh,life,max:life,kind:'particle',velocity:V((Math.random()-.5)*10,2+Math.random()*7,(Math.random()-.5)*10)});
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
    this.root.clear();
    for(const p of this.projectiles)this.scene.remove(p.mesh);this.projectiles=[];
    for(const p of this.fx)this.disposeFx(p);this.fx=[];
  }
  disposeFx(fx){this.scene.remove(fx.mesh);fx.mesh.material.dispose();if(fx.kind!=='particle')fx.mesh.geometry.dispose();}
  animate(dt,state,enemies){
    this.time+=dt;const t=this.time;
    const active=!['home','guide','admin'].includes(state.phase);
    const desired=active?V(Math.sin(t*.29)*.13,8+Math.sin(t*.37)*.10,16):V(-17+Math.sin(t*.13)*.3,7,8);
    this.camera.position.lerp(desired,Math.min(1,dt*2));
    this.shake=Math.max(0,this.shake-dt*2.5);
    this.camera.position.x+=Math.sin(t*83)*this.shake*.14;this.camera.position.y+=Math.cos(t*71)*this.shake*.10;
    this.camera.lookAt(active?V(0,2,-25):V(-12,3,-20));
    this.kick=Math.max(0,this.kick-dt*7);this.gun.visible=active&&state.phase!=='result';this.gun.position.z=-1.5+this.kick*.12;this.gun.rotation.x=this.kick*.12;
    this.hitLight.intensity*=Math.exp(-dt*20);
    this.liver.rotation.y=Math.sin(t*.7)*.025;this.liver.scale.setScalar(1+Math.sin(t*1.8)*.015);
    this.liverBody.material.color.setHex(0xb86a48).lerp(new THREE.Color(0x65614b),state.liver/100);
    this.pancreas.scale.setScalar(1+Math.sin(t*2.4)*.015);
    this.cores.forEach((core,i)=>{core.children[1].position.y=.3+Math.sin(t*2+i)*.13;core.children[2].rotation.y=t*.3+i;core.scale.setScalar(.7+state.core/333);});
    for(let i=0;i<this.dustData.length;i++){
      const d=this.dustData[i];d.z+=dt*.65;if(d.z>14)d.z=-80;
      this.dummy.position.set(d.x+Math.sin(t*.3+i)*.3,d.y,d.z);this.dummy.scale.setScalar(d.s);this.dummy.updateMatrix();this.dust.setMatrixAt(i,this.dummy.matrix);
    }this.dust.instanceMatrix.needsUpdate=true;
    for(const e of enemies){
      const g=e.model;g.rotation.z=Math.sin(t*5+e.seed)*.045;g.userData.limbs.forEach((limb,i)=>limb.rotation.x=Math.sin(t*8+e.seed+i*Math.PI)*.45);
      g.userData.bar.visible=e.hp<e.maxHp&&!e.boss;g.userData.bar.quaternion.copy(g.quaternion).invert().multiply(this.camera.quaternion);
      g.userData.fill.scale.x=1.42*Math.max(.01,e.hp/e.maxHp);
      e.flash=Math.max(0,(e.flash||0)-dt*6);g.scale.setScalar(e.scale*(1+e.flash*.14));
    }
    for(let i=this.fx.length-1;i>=0;i--){
      const fx=this.fx[i];fx.life-=dt;fx.mesh.material.opacity=Math.max(0,fx.life/fx.max);
      if(fx.kind==='particle'){fx.velocity.y-=dt*12;fx.mesh.position.addScaledVector(fx.velocity,dt);fx.mesh.rotation.x+=dt*3;}
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
  render(){this.renderer.setRenderTarget(this.target);this.renderer.render(this.scene,this.camera);this.renderer.setRenderTarget(null);this.renderer.render(this.postScene,this.postCamera);}
}
