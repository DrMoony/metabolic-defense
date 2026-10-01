import * as T from '../vendor/three.module.js';
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
