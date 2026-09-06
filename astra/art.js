import * as T from '../vendor/three.module.js';
const v=(x,y,z)=>new T.Vector3(x,y,z);
const palette=new Map();
export function finish(color,metalness=.15,emission=0){
  const key=`${color}/${metalness}/${emission}`;
  if(!palette.has(key))palette.set(key,new T.MeshStandardMaterial({color,metalness,roughness:metalness>.5?.23:.3,emissive:color,emissiveIntensity:emission}));
  return palette.get(key);
}
export function roundedBox(){
  const s=new T.Shape(),r=.13;
  s.moveTo(-.5+r,-.5);s.lineTo(.5-r,-.5);s.quadraticCurveTo(.5,-.5,.5,-.5+r);s.lineTo(.5,.5-r);s.quadraticCurveTo(.5,.5,.5-r,.5);s.lineTo(-.5+r,.5);s.quadraticCurveTo(-.5,.5,-.5,.5-r);s.lineTo(-.5,-.5+r);s.quadraticCurveTo(-.5,-.5,-.5+r,-.5);
  const g=new T.ExtrudeGeometry(s,{depth:.74,bevelEnabled:true,bevelThickness:.13,bevelSize:.06,bevelSegments:3,steps:1,curveSegments:4});g.translate(0,0,-.37);return g;
}
const sphere=new T.SphereGeometry(1,20,12),ring=new T.TorusGeometry(1,.09,8,64),cylinder=new T.CylinderGeometry(1,1,1,48),gem=new T.OctahedronGeometry(1),box=roundedBox();
for(const g of [sphere,ring,cylinder,gem,box])g.userData.shared=true;
function mesh(root,geometry,color,at,scale,metal=.15,emission=0){const m=new T.Mesh(geometry,finish(color,metal,emission));m.position.set(...at);m.scale.set(...scale);m.castShadow=true;m.receiveShadow=true;root.add(m);return m;}
function line(root,points,r,color,emission=0,metal=.2){const g=new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>v(...p))),Math.max(16,points.length*8),r,7,false);return mesh(root,g,color,[0,0,0],[1,1,1],metal,emission);}
// Static ornaments become one draw per shared material, with transforms baked once.
// Dynamic limbs, hit regions and health bars are deliberately kept separate.
export function bakeStatic(root,accept=()=>true){
  root.updateMatrixWorld(true);const inverse=root.matrixWorld.clone().invert(),batches=new Map();
  root.traverse(m=>{if(!m.isMesh||m.isInstancedMesh||!accept(m)||Array.isArray(m.material))return;const key=`${m.material.uuid}:${m.castShadow}:${m.receiveShadow}`;if(!batches.has(key))batches.set(key,[]);batches.get(key).push(m);});
  for(const list of batches.values()){
    if(list.length<2)continue;
    const positions=[],normals=[],uvs=[];
    for(const m of list){const g=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();g.applyMatrix4(inverse.clone().multiply(m.matrixWorld));positions.push(...g.attributes.position.array);normals.push(...g.attributes.normal.array);if(g.attributes.uv)uvs.push(...g.attributes.uv.array);g.dispose();}
    const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));if(uvs.length===positions.length/3*2)geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));
    const combined=new T.Mesh(geometry,list[0].material);combined.castShadow=list[0].castShadow;combined.receiveShadow=list[0].receiveShadow;combined.userData.baked=true;root.add(combined);list.forEach(m=>{m.removeFromParent();if(!m.geometry.userData.shared)m.geometry.dispose();});
  }
}
const radialData=new Uint8Array(64*64*4);
for(let y=0;y<64;y++)for(let x=0;x<64;x++){const r=Math.hypot((x-31.5)/31.5,(y-31.5)/31.5),i=(y*64+x)*4;radialData[i]=radialData[i+1]=radialData[i+2]=255;radialData[i+3]=Math.round(Math.pow(Math.max(0,1-r),2.5)*255);}
const radial=new T.DataTexture(radialData,64,64);radial.needsUpdate=true;radial.magFilter=T.LinearFilter;radial.minFilter=T.LinearFilter;
export function glow(root,color,at,size,opacity=.6){const m=new T.Sprite(new T.SpriteMaterial({map:radial,color,transparent:true,opacity,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false}));m.position.set(...at);m.scale.set(size,size,1);m.userData.decorative=true;root.add(m);return m;}
export function contact(root,size=2,opacity=.4){const m=new T.Mesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial({map:radial,color:0x260917,transparent:true,opacity,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}));m.rotation.x=-Math.PI/2;m.scale.set(size,size*.7,1);m.position.y=.065;m.userData.decorative=true;root.add(m);return m;}
// Small analytic studio environment gives curved surfaces broad reflected highlights.
// No downloaded texture, screen-space reflection, or full-frame bloom pass.
export function reflections(scene){
  const w=128,h=64,data=new Uint8Array(w*h*4);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const u=x/w,t=y/h,spot=(cx,cy,sx,sy)=>Math.exp(-(((u-cx)/sx)**2+((t-cy)/sy)**2));
    const gold=spot(.22,.3,.065,.14),white=spot(.72,.25,.14,.035),rose=spot(.48,.5,.1,.13),i=(y*w+x)*4;
    data[i]=Math.min(255,32+gold*220+white*220+rose*100);data[i+1]=Math.min(255,15+gold*165+white*215+rose*24);data[i+2]=Math.min(255,24+gold*75+white*210+rose*50);data[i+3]=255;
  }
  const map=new T.DataTexture(data,w,h);map.mapping=T.EquirectangularReflectionMapping;map.colorSpace=T.SRGBColorSpace;map.needsUpdate=true;scene.environment=map;scene.environmentIntensity=.9;
}
export function guardian(scene){
  const root=new T.Group();root.position.set(-8.3,0,-12);root.rotation.y=.12;scene.add(root);
  contact(root,9,.65);
  const ornaments=new T.Group();root.add(ornaments);
  for(const [y,r,h,color] of [[.2,3.1,.4,0x945321],[.5,3.25,.28,0xffc64b],[.77,2.75,.36,0x075643],[1,2.8,.15,0xffd469]])mesh(ornaments,cylinder,color,[0,y,0],[r,h,r],.72);
  for(let i=0;i<8;i++){const a=i*Math.PI/4;const fin=mesh(ornaments,gem,0xeab447,[Math.sin(a)*2.5,1.25,Math.cos(a)*2.5],[.36,.94,.38],.73);fin.rotation.z=-Math.sin(a)*.28;mesh(ornaments,gem,0x29e1a3,[Math.sin(a)*2.54,1.1,Math.cos(a)*2.54],[.2,.43,.21],.45,.22);}
  const shape=new T.Shape();shape.moveTo(-3.3,2.2);shape.bezierCurveTo(-4.1,3.5,-3.65,6.45,-1.65,6.65);shape.bezierCurveTo(.1,7,1.55,6,3.7,6.15);shape.bezierCurveTo(4.5,6.1,3.65,4.85,2.75,4.25);shape.bezierCurveTo(1.9,3.6,.65,4.05,.05,3.35);shape.bezierCurveTo(-1.05,2.75,-2.8,.9,-3.3,2.2);
  const geo=new T.ExtrudeGeometry(shape,{depth:1,bevelEnabled:true,bevelThickness:.47,bevelSize:.34,bevelSegments:5,curveSegments:20,steps:1});geo.translate(0,0,-.6);
  const body=new T.Mesh(geo,new T.MeshPhysicalMaterial({color:0xcd4316,metalness:.26,roughness:.24,clearcoat:1,clearcoatRoughness:.16,emissive:0x79200b,emissiveIntensity:.13}));body.castShadow=true;body.receiveShadow=true;root.add(body);
  const outline=shape.getPoints(65).map(p=>[p.x,p.y,.69]);outline.push(outline[0]);line(ornaments,outline,.095,0xffc85e,0,.72);
  for(const [points,r] of [
    [[[-2.9,2.45,.84],[-1.9,3.5,.98],[-1.5,4.35,1.04],[-.6,5.45,.95]],.047],
    [[[-1.5,4.35,1.04],[-2.55,4.8,1],[-3.3,5.65,.85]],.04],
    [[[-2,3.4,.97],[-2.8,3.65,.97],[-3.05,4.1,.97]],.025],
    [[[-1.4,4.45,1.04],[-1.1,5.5,.98],[-1.65,6.4,.8]],.028],
    [[[.6,4.2,.96],[1.2,4.9,1],[2.1,5.15,1],[3.3,5.9,.83]],.045],
    [[[1.2,4.9,1],[1.25,5.6,1],[.9,6.1,.86]],.027],
    [[[2.05,5.1,1],[2.75,4.9,.96],[3.3,5.1,.87]],.025]
  ])line(ornaments,points,r,0x8bff9e,2);
  for(const sign of [-1,1]){
    line(ornaments,[[sign*.65,1,1],[sign*.95,1.8,1],[sign*.36,2.6,1.1],[sign*.43,3.8,1.12],[sign*.73,4.8,1.11],[sign*.25,6,1],[sign*.3,6.85,.7]],.13,0xffc952,0,.72);
    const leaf=mesh(ornaments,gem,0xf5c45b,[sign*.76,4.45,1.14],[.25,.83,.22],.7);leaf.rotation.z=-sign*.55;
  }
  for(const y of [1.1,2.9,4,6.85]){mesh(ornaments,gem,0xffd274,[0,y,1.12],[.41,.62,.27],.75);mesh(ornaments,gem,0x2aeda4,[0,y,1.38],[.22,.39,.12],.35,.6);}
  mesh(ornaments,ring,0xffd375,[0,5.2,1.12],[.75,.75,1.5],.72);
  mesh(ornaments,sphere,0xffb521,[0,5.2,1.15],[.58,.58,.35],.6,1);
  bakeStatic(ornaments);glow(root,0xffcd49,[0,5.2,1.6],3,.55);glow(root,0x70ffb0,[0,1.2,0],6,.17);
  return {root,body};
}
export function pancreas(scene){
  const root=new T.Group();root.position.set(9.2,0,-6);scene.add(root);contact(root,6,.6);
  const ornaments=new T.Group();root.add(ornaments);
  mesh(ornaments,cylinder,0x6d3655,[0,.35,0],[2.5,.55,2.5],.55);
  for(const y of [.13,.65])mesh(ornaments,ring,0xf7c875,[0,y,0],[2.45,2.45,1.3],.7).rotation.x=Math.PI/2;
  line(ornaments,[[0,.7,0],[.75,1.5,0],[.3,2.4,0]],.48,0xba5366);
  for(let i=0;i<34;i++){const a=i*2.399,x=-2.35+(i%9)*.57,y=3+Math.sin(a)*.4;mesh(ornaments,sphere,i%3?0xefae4e:0xf7c175,[x,y,Math.cos(a)*.43],[.55,.48,.55],.12);}
  for(let i=0;i<4;i++){line(ornaments,[[2.15,2.75+i*.14,.2],[2.5+i*.1,3.6+i*.15,.1],[2.1+i*.25,4.3+i*.14,.1]],.1,0xe16e89);}
  line(ornaments,[[-2.4,3.25,.5],[-1,3,.82],[0,3.35,.75],[1,2.8,.7],[.4,1.4,.4],[0,.75,0]],.063,0x56eaff,1.5);
  bakeStatic(ornaments);
  const turret=new T.Group();turret.position.set(-1.35,3.15,0);root.add(turret);
  const barrel=mesh(turret,cylinder,0x368992,[0,0,-.9],[.34,1.8,.34],.6);barrel.rotation.x=Math.PI/2;
  for(const z of [-.3,-1,-1.7])mesh(turret,ring,0x72eeff,[0,0,z],[.37,.37,.65],.3,1.5);
  glow(turret,0x35dfff,[0,0,-1.85],1.8,.7);const tip=new T.Object3D();tip.position.set(0,0,-1.85);turret.add(tip);glow(root,0x41dfff,[0,3,.8],3,.3);
  return {root,turret,tip};
}
