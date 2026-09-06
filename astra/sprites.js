import * as T from '../vendor/three.module.js';
import { SPRITE_SIZES } from './sprite-sizes.js?v=a12';

const loader=new T.TextureLoader(),textures=new Map();
export const spriteLoads=[];
export const ENEMY_ART=Object.fromEntries([
  ...['soda','fries','burger','pizza','ramen','icecream','ciga','soju','cancerlet'].map(key=>[key,{frames:[`${key}_0`,`${key}_1`],anchor:'bottom'}]),
  ...['donut','moth','bat','wing'].map(key=>[key,{frames:[`${key}_0`,`${key}_1`],anchor:'center'}]),
  ...['syrup','cancer','plaque'].map(key=>[key,{frames:[key],anchor:'bottom'}]),
]);
ENEMY_ART.fragment=ENEMY_ART.cancerlet;
export const WEAPON_ART=['slingshot','crossbow','matchlock','pistol','shotgun','magnum','smg','rifle','mg','bazooka','homing','laser'].map((name,i)=>`w${String(i).padStart(2,'0')}_${name}`);

export function texture(key){
  if(textures.has(key))return textures.get(key);
  const url=key.startsWith('organ_')?`../assets/${key.slice(6)}.png`:`../assets/sprites/${key}.png`;
  let done,failed;
  const ready=new Promise((resolve,reject)=>{done=resolve;failed=reject;});
  // Retain failures for diagnostics without an unhandled rejection during startup.
  ready.catch(error=>console.error(error));spriteLoads.push(ready);
  const map=loader.load(url,loaded=>{
    try{
    const canvas=document.createElement('canvas');canvas.width=loaded.image.width;canvas.height=loaded.image.height;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(loaded.image,0,0);
    loaded.userData.pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;
    loaded.userData.width=canvas.width;loaded.userData.height=canvas.height;done(loaded);
    }catch(error){failed(error);}
  },undefined,()=>failed(new Error(`Sprite failed to load: ${url}`)));
  map.colorSpace=T.SRGBColorSpace;map.userData.key=key;textures.set(key,map);return map;
}
export function preloadSprites(){
  for(const art of Object.values(ENEMY_ART))art.frames.forEach(texture);
  [...WEAPON_ART,'organ_liver','organ_pancreas','fatwall','trapcage','traplock','item_glp1','item_gcgr'].forEach(texture);
  return Promise.all(spriteLoads);
}

// Opaque cutouts participate in exactly the same depth pass as the plate masks.
// Raycasting follows the alpha silhouette as well as the visible geometry.
export function cutout(key,height=3,anchor='bottom'){
  const [w,h]=SPRITE_SIZES[key],geometry=new T.PlaneGeometry(1,1);
  if(anchor==='bottom')geometry.translate(0,.5,0);
  const mesh=new T.Mesh(geometry,new T.MeshBasicMaterial({map:texture(key),alphaTest:.12,transparent:false,depthWrite:true,side:T.DoubleSide,toneMapped:false}));
  mesh.scale.set(height*w/h,height,1);mesh.userData.art=key;mesh.userData.anchor=anchor;
  mesh.raycast=function(ray,hits){
    const candidates=[];T.Mesh.prototype.raycast.call(this,ray,candidates);
    const data=this.material.map.userData;
    for(const hit of candidates){
      if(data.pixels&&hit.uv){
        const x=Math.max(0,Math.min(data.width-1,Math.floor(hit.uv.x*data.width)));
        const y=Math.max(0,Math.min(data.height-1,Math.floor((1-hit.uv.y)*data.height)));
        if(data.pixels[(y*data.width+x)*4+3]<this.material.alphaTest*255)continue;
      }
      hits.push(hit);
    }
  };
  return mesh;
}
export function enemyBillboard(type,boss=false){
  const art=ENEMY_ART[type];if(!art)throw new Error(`Missing enemy art: ${type}`);
  const root=new T.Group(),body=cutout(art.frames[0],3,art.anchor);
  root.name=`sprite-${type}`;root.add(body);
  const maps=art.frames.map(texture),bar=new T.Group();bar.position.y=art.anchor==='center'?1.75:3.25;
  const bg=new T.Mesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial({color:0x30232b}));
  const fill=new T.Mesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial({color:0x80efad}));fill.position.z=.01;fill.scale.x=1.42;
  for(const mesh of [bg,fill]){mesh.userData.decorative=true;bar.add(mesh);}root.add(bar);bar.visible=false;
  // The valve region is a hit proxy only; the generated image supplies its appearance.
  if(type==='syrup'){
    const weak=new T.Mesh(new T.PlaneGeometry(.64,.45),new T.MeshBasicMaterial({colorWrite:false,depthWrite:false,side:T.DoubleSide}));
    weak.raycast=function(ray,hits){const silhouette=[];body.raycast(ray,silhouette);if(silhouette.length)T.Mesh.prototype.raycast.call(this,ray,hits);};
    weak.position.set(0,2.72,.025);weak.userData.weak=true;root.add(weak);
  }
  root.userData={body,maps,bar,bg,fill,anchor:art.anchor,height:3,baseWidth:body.scale.x,billboard:true,boss};
  return root;
}
export function animateEnemy(root,camera,time,seed,flash=0){
  const data=root.userData,phase=time*(5+Math.floor(seed)%5)+seed;
  data.body.material.map=data.maps[Math.floor(phase)%data.maps.length];
  const squash=Math.sin(phase*Math.PI*2)*(data.maps.length===1?.045:.018);
  data.body.scale.set(data.baseWidth*(1-squash),3*(1+squash),1);
  data.body.material.color.setHex(0xffffff).lerp(new T.Color(0xff6860),flash*.8);
  root.quaternion.copy(camera.quaternion);root.rotateZ(Math.sin(time*5+seed)*.025+flash*.06);
}
export function disposeBillboard(root){
  root.traverse(mesh=>{if(mesh.geometry&&!mesh.geometry.userData.shared)mesh.geometry.dispose();if(mesh.material)mesh.material.dispose();});
  root.removeFromParent();
}
export function screenHeight(camera,point,fraction){
  const depth=point.clone().sub(camera.position).dot(camera.getWorldDirection(new T.Vector3()));
  return 2*depth*Math.tan(T.MathUtils.degToRad(camera.fov/2))*fraction;
}
