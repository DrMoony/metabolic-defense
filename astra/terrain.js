import * as T from '../vendor/three.module.js';
import {finish,roundedBox,bakeStatic,glow} from './art.js?v=a24';
import {cutout} from './sprites.js?v=a24';
import {Routes} from './routes.js?v=a24';
const v=(x,y,z)=>new T.Vector3(x,y,z);
const orb=new T.SphereGeometry(1,12,8),box=roundedBox();
orb.userData.shared=box.userData.shared=true;
// Shared repeating relief retains the polished tissue surface of the previous art pass.
const reliefData=new Uint8Array(64*64*4);
for(let y=0;y<64;y++)for(let x=0;x<64;x++){
  const u=x/64*Math.PI*2,w=y/64*Math.PI*2,i=(y*64+x)*4,n=128+34*Math.sin(u*7+Math.sin(w*3))*Math.sin(w*9)+14*Math.cos(u*17-w*13);
  reliefData[i]=reliefData[i+1]=reliefData[i+2]=n;reliefData[i+3]=255;
}
const relief=new T.DataTexture(reliefData,64,64);relief.wrapS=relief.wrapT=T.RepeatWrapping;relief.needsUpdate=true;
const material=(color,emission=0)=>{const m=finish(color,.22,emission);m.bumpMap=relief;m.bumpScale=.08;return m;};
function mesh(root,geometry,color,at,scale=[1,1,1],emission=0){
  const m=new T.Mesh(geometry,material(color,emission));m.position.set(...at);m.scale.set(...scale);m.receiveShadow=true;root.add(m);return m;
}
function tube(root,points,r,color,emission=0){return mesh(root,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>Array.isArray(p)?v(...p):p)),48,r,6,false),color,[0,0,0],[1,1,1],emission);}
function instances(root,geometry,color,transforms){
  const m=new T.InstancedMesh(geometry,material(color),transforms.length),dummy=new T.Object3D();
  transforms.forEach((d,i)=>{dummy.position.set(...d.at);dummy.rotation.set(...(d.rotation||[0,0,0]));dummy.scale.set(...d.scale);dummy.updateMatrix();m.setMatrixAt(i,dummy.matrix);if(d.color)m.setColorAt(i,new T.Color(d.color));});
  m.receiveShadow=true;root.add(m);m.userData.fullCount=transforms.length;return m;
}
export function buildTerrain(scene,map){
  const root=new T.Group();scene.add(root);
  const routes=new Routes(map),p=map.palette,staticRoot=new T.Group();root.add(staticRoot);
  let seed=map.seed;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  mesh(staticRoot,box,p.floor,[0,-1.35,-40],[110,2,135]);
  const segments=[...routes.items.map(r=>r.path),routes.trunk],tiles=[],roadSamples=[];
  for(const path of segments){
    const count=Math.ceil(path.getLength()/1.3),edges=[[],[]];
    for(let i=0;i<=count;i++){
      const at=path.getPointAt(i/count),dir=path.getTangentAt(i/count),normal=v(dir.z,0,-dir.x).normalize();roadSamples.push(at);
      if(i<count)tiles.push({at:[at.x,-.12,at.z],rotation:[0,Math.atan2(dir.x,dir.z),0],scale:[map.width,.3,path.getLength()/count+ .12],color:new T.Color(p.road).multiplyScalar(.85+random()*.3)});
      for(let side=0;side<2;side++)edges[side].push(at.clone().addScaledVector(normal,(side?1:-1)*map.width/2).setY(.22));
    }
    for(const edge of edges){tube(staticRoot,edge,.27,p.tissue);tube(staticRoot,edge.map(q=>q.clone().setY(.49)),.035,p.edge,.65);}
  }
  const road=instances(root,box,0xffffff,tiles);
  // Keep silhouettes away from the playable road; shuffle order so density changes stay spatially uniform.
  const distance=(x,z)=>{let d=Infinity;for(const q of roadSamples)d=Math.min(d,Math.hypot(q.x-x,q.z-z));return d;};
  const hills=[];
  for(let i=0;i<1900;i++){
    const x=(random()-.5)*88,z=14-random()*112,d=distance(x,z);
    if(d<map.width/2+1.7)continue;
    const size=.7+random()*1.8,side=Math.abs(x)>30?1.7:1;
    const height=map.key==='omentum'?2.4:map.key==='sinusoid'?1.25:1.7;
    hills.push({at:[x,Math.min(6,(d-3)*.3)*random()*side-.45,z],scale:[size,size*height*(.55+random()*.5),size],color:new T.Color(p.tissue).lerp(new T.Color(map.key==='coronary'?0xe8a751:0xffd477),random()*(map.key==='sinusoid'?.18:.65))});
  }
  const fat=instances(root,orb,0xffffff,hills),density=[fat];
  // Tall background architecture frames open roads, rather than enclosing a blank tube.
  const walls=new T.Group();root.add(walls);
  if(map.key==='coronary'){
    for(let i=0;i<7;i++){
      const z=-12-i*14;
      tube(walls,[[-34,0,z],[-34,15,z],[-24,25,z-3],[-7,30,z-7],[19,27,z-4],[35,13,z],[36,0,z]],1.05,p.tissue);
      for(const s of [-1,1])tube(staticRoot,[[s*33,2,z],[s*31,9,z-3],[s*25,15,z-7]],.23,p.edge,.08);
    }
    // The visible Y matches the two far arterial branches, with an elevated parent vessel.
    for(const s of [-1,1])tube(staticRoot,[[0,16,-96],[s*5,13,-84],[s*16,8,-73],[s*20,1,-65]],2.3,p.tissue);
    mesh(staticRoot,orb,0xad304b,[-26,16,-64],[5,7,4]);
  }else if(map.key==='omentum'){
    for(let i=0;i<8;i++){
      const z=-15-i*12;
      tube(staticRoot,[[-35,9,z],[-22,16,z-2],[0,21,z-9],[23,17,z],[36,6,z]],.16,0xf8b68b,.15);
      tube(staticRoot,[[-34,3,z],[-23,6,z-2],[-18,3,z-10]],.4,0xbb4f63);
    }
  }else{
    // Hepatocyte plates form honeycomb silhouettes around the radial sinusoids.
    const plates=[];
    for(let z=-88;z<6;z+=7)for(let x=-35;x<=35;x+=6){if(distance(x,z)<6)continue;plates.push({at:[x,1.2,z],scale:[2.7,2.1+random()*1.7,2.7],rotation:[0,Math.PI/6,0]});}
    const hex=new T.CylinderGeometry(1,1,1,6);density.push(instances(root,hex,0x98576c,plates));
    for(const s of [-1,1])tube(staticRoot,[[s*34,0,-69],[s*33,11,-77],[s*24,19,-87],[0,24,-96]],.8,0x975a85);
  }
  bakeStatic(walls);bakeStatic(staticRoot);
  const landmarks=[],fibers=[];let fiberWave=-1;
  for(const data of map.landmarks){
    const group=new T.Group();root.add(group);
    let pos=data.position?v(...data.position):routes.sample(data.route,data.at);
    if(data.route){const tangent=routes.tangent(data.route,data.at);pos.addScaledVector(v(tangent.z,0,-tangent.x),data.side*map.width*.48);}
    group.position.copy(pos);
    const landmark={...data,model:group,hp:data.hp||0,maxHp:data.hp||0,dead:false,anchor:new T.Object3D()};
    landmark.anchor.position.y=data.hp?3.3:4.5;group.add(landmark.anchor);landmarks.push(landmark);
    if(data.hp){
      group.add(cutout('fatwall',2.6));landmark.billboard=true;
      const bar=new T.Group();bar.position.y=2.9;group.add(bar);
      const bg=mesh(bar,box,0x301a24,[0,0,0],[2.4,.14,.07]);bg.userData.decorative=true;
      const fill=mesh(bar,box,0xffd875,[0,0,.06],[2.32,.09,.05],.6);fill.userData.decorative=true;landmark.bar=bar;landmark.fill=fill;
    }else if(['macrophage','kupffer'].includes(data.kind)){
      const body=cutout('fatwall',3);body.material.color.setHex(data.kind==='kupffer'?0x7bbfaf:0xc46d86);group.add(body);landmark.billboard=true;
    }else if(data.kind==='fibrosis'){
      for(let j=0;j<6;j++){
        const band=tube(group,[[-2.8,j*.25,-3],[-1,.8+j*.24,-1],[1,.5+j*.24,1],[2.8,j*.24,3]],.11,0xf0d7bc);
        fibers.push(band);
      }
    }else{
      const swirl=[];for(let i=0;i<60;i++){const a=i*.21,r=.3+i*.035;swirl.push([Math.cos(a)*r,.2,Math.sin(a)*r]);}tube(group,swirl,.06,p.edge,.6);
      // Low endothelial seams follow the confluence without blocking the walking surface.
      for(const s of [-1,1])tube(group,[[0,-.05,0],[s*1.5,-.05,-3],[s*3,-.05,-7]],.10,p.edge,.3);
    }
  }
  // A map-specific core gate is physically at the shared route endpoint.
  const core=new T.Group();core.position.copy(routes.sample(routes.items[0].id,1));root.add(core);
  mesh(core,new T.CylinderGeometry(3.5,3.7,.5,32),0x775433,[0,-.05,0]);
  const crown=mesh(core,new T.TorusGeometry(3.2,.12,8,64),p.accent,[0,.25,0],[1,1,1],.6);crown.rotation.x=Math.PI/2;
  if(map.key==='coronary'){
    for(const s of [-1,1]){const lobe=mesh(core,orb,0xe65467,[s*.4,1.2,0],[.64,.9,.65],.15);lobe.rotation.z=-s*.4;}
    tube(core,[[0,1.7,0],[.1,2.25,0],[.6,2.45,0]],.16,p.accent,.7);
  }else{
    const portal=mesh(core,new T.TorusGeometry(1.65,.28,10,48),p.accent,[0,1.85,0],[1,1,1],.5);
    const lining=mesh(core,new T.CylinderGeometry(1.4,1.4,.5,32,1,true),map.key==='sinusoid'?0x649fa0:0x8471b3,[0,1.85,0]);lining.rotation.x=Math.PI/2;
    portal.rotation.y=.08;
  }
  glow(core,p.accent,[0,1.5,0],7,.3);
  // Cheap additive shafts: no fullscreen postprocessing or volumetric render target.
  for(const [x,y,z] of [[-22,17,-48],[10,24,-72],[26,12,-33]]){
    const shaft=mesh(root,new T.PlaneGeometry(5,28),p.accent,[x,y,z]);
    shaft.material=new T.MeshBasicMaterial({color:p.accent,transparent:true,opacity:.035,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending});shaft.rotation.z=-.34;
    glow(root,p.accent,[x,y+6,z],13,.14);
  }
  const debug=new T.Group();debug.visible=false;root.add(debug);
  for(const [i,r] of routes.items.entries()){
    const points=Array.from({length:181},(_,n)=>routes.sample(r.id,n/180).add(v(0,.7+i*.06,0)));
    debug.add(new T.Line(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color:[0x66ffff,0xff79b9,0xffff6a][i],depthTest:false})));
  }
  return {root,routes,tiles:road,fat,density,landmarks,core,debug,fibers,walls,
    setQuality(level){for(const m of density)m.count=Math.floor(m.userData.fullCount*[1,.68,.42,.24][level]);},
    animate(t,wave,camera){
      for(const l of landmarks)if(l.billboard)l.model.quaternion.copy(camera.quaternion);
      walls.scale.set(1+Math.sin(t*2)*.006,1+Math.sin(t*2)*.013,1);
      core.scale.setScalar(1+Math.sin(t*2)*.025);
      if(wave!==fiberWave){for(const band of fibers){const path=band.geometry.parameters.path;band.geometry.dispose();band.geometry=new T.TubeGeometry(path,48,.11*(1+wave*.9),6,false);}fiberWave=wave;}
      for(const l of landmarks)if(l.bar){l.bar.quaternion.copy(l.model.quaternion).invert().multiply(camera.quaternion);l.fill.scale.x=2.32*Math.max(0,l.hp/l.maxHp);}
    },
    dispose(){root.removeFromParent();const geometries=new Set(),materials=new Set();root.traverse(o=>{if(o.geometry&&!o.geometry.userData.shared)geometries.add(o.geometry);if(o.isSprite||o.material?.isMeshBasicMaterial||o.material?.isLineBasicMaterial)materials.add(o.material);if(o.isInstancedMesh)o.dispose();});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());},
  };
}
