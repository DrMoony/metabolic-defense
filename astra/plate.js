import * as T from '../vendor/three.module.js';
import { Routes } from './routes.js?v=a6';

export function configurePlateCamera(camera,map){
  camera.fov=map.camera.fov;camera.near=.1;camera.far=1500;
  camera.position.set(0,map.camera.height,20);camera.lookAt(0,0,map.camera.targetZ);
  camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
}
export function groundPoint(camera,[x,y]){
  const ray=new T.Raycaster();ray.setFromCamera(new T.Vector2(x*2-1,1-y*2),camera);
  if(ray.ray.direction.y>=-.001)throw new Error('Route point is above the ground horizon');
  return ray.ray.intersectPlane(new T.Plane(new T.Vector3(0,1,0),0),new T.Vector3());
}
export const routeDocument=map=>({version:1,map:map.key,space:'normalized-screen',topology:map.topology,routes:map.routes.map(r=>({id:r.id,points:r.points.map(p=>[...p])})),trunk:(map.trunk||[]).map(p=>[...p])});
export function validateRoutes(map,doc,camera){
  if(!doc||doc.version!==1||doc.map!==map.key||doc.space!=='normalized-screen'||doc.topology!==map.topology||!Array.isArray(doc.routes)||doc.routes.length!==map.routes.length)throw new Error('Route document does not match this map');
  const points=(list,min)=>{
    if(!Array.isArray(list)||list.length<min||list.length>200)throw new Error('A path needs 2–200 points');
    list.forEach((p,i)=>{if(!Array.isArray(p)||p.length!==2||!p.every(n=>Number.isFinite(n)&&n>=0&&n<=1))throw new Error('Invalid screen point');if(camera)groundPoint(camera,p);if(i&&Math.hypot(p[0]-list[i-1][0],p[1]-list[i-1][1])<.0001)throw new Error('Adjacent points must be distinct');});
  };
  doc.routes.forEach((r,i)=>{if(r.id!==map.routes[i].id)throw new Error('Route IDs must stay in order');points(r.points,2);});
  points(doc.trunk,map.trunk.length?2:0);
  if(!map.trunk.length&&doc.trunk.length)throw new Error('This map has no shared trunk');
  if(doc.trunk.length){for(const r of doc.routes)if(Math.hypot(...r.points.at(-1).map((v,i)=>v-doc.trunk[0][i]))>1e-7)throw new Error('Branches must meet the shared trunk');}
  if(map.topology==='radial'){const end=doc.routes[0].points.at(-1);if(doc.routes.some(r=>r.points.at(-1).some((v,i)=>v!==end[i])))throw new Error('Radial paths must meet at the well');}
  if(map.topology==='parallel'&&Math.abs(doc.routes[0].points.at(-1)[0]-doc.routes[1].points.at(-1)[0])<.1)throw new Error('Parallel exits must stay separate');
  return JSON.parse(JSON.stringify(doc));
}
export function loadRoutes(map,camera){
  try{const value=localStorage.getItem(`astra_routes_${map.key}`);if(value)return {doc:validateRoutes(map,JSON.parse(value),camera),status:'saved'};}
  catch(error){return {doc:routeDocument(map),status:`default (${error.message})`};}
  return {doc:routeDocument(map),status:'default'};
}
function projectedMap(map,doc,camera){return {...map,routes:doc.routes.map((r,i)=>({...map.routes[i],points:r.points.map(p=>groundPoint(camera,p).toArray())})),trunk:doc.trunk.map(p=>groundPoint(camera,p).toArray())};}
function disposeObject(root){
  const geometries=new Set(),materials=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);if(o.isInstancedMesh)o.dispose();});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());root.clear();
}
export function buildPlateTerrain(scene,map,camera){
  const root=new T.Group();root.name=`plate-${map.key}`;scene.add(root);
  const loaded=loadRoutes(map,camera);
  const terrain={root,mode:'plate',document:loaded.doc,storageStatus:loaded.status,landmarks:[],occluders:[],density:[],fibers:[],cores:[],debug:new T.Group()};
  root.add(terrain.debug);terrain.debug.visible=false;
  terrain.applyRoutes=doc=>{
    terrain.document=validateRoutes(map,doc,camera);
    terrain.routes=new Routes(projectedMap(map,terrain.document,camera));
    disposeObject(terrain.debug);
    for(const [i,r] of terrain.routes.items.entries()){
      const positions=Array.from({length:301},(_,n)=>terrain.routes.sample(r.id,n/300));
      const line=new T.Line(new T.BufferGeometry().setFromPoints(positions),new T.LineBasicMaterial({color:[0x60ffff,0xff78ce,0xffef76][i],depthTest:false}));line.renderOrder=20;terrain.debug.add(line);
    }
    terrain.cores.forEach((core,i)=>core.position.copy(terrain.routes.sample(terrain.routes.items[i].id,1)));
  };
  terrain.applyRoutes(loaded.doc);
  const ground=new T.Mesh(new T.PlaneGeometry(2400,2400),new T.MeshBasicMaterial({colorWrite:false}));ground.rotation.x=-Math.PI/2;ground.position.y=-.08;ground.renderOrder=-20;root.add(ground);
  // Screen silhouettes at an explicit foreground depth: depth test hides only actors behind them.
  for(const data of map.occluders){
    const anchor=groundPoint(camera,data.at),forward=camera.getWorldDirection(new T.Vector3()),depth=anchor.clone().sub(camera.position).dot(forward);
    const vertices=data.points.map(p=>{const ray=new T.Raycaster();ray.setFromCamera(new T.Vector2(p[0]*2-1,1-p[1]*2),camera);return camera.position.clone().addScaledVector(ray.ray.direction,depth/ray.ray.direction.dot(forward));});
    const indices=T.ShapeUtils.triangulateShape(data.points.map(p=>new T.Vector2(...p)),[]).flat();
    const geometry=new T.BufferGeometry().setFromPoints(vertices);geometry.setIndex(indices);
    const mask=new T.Mesh(geometry,new T.MeshBasicMaterial({colorWrite:false,side:T.DoubleSide}));mask.name=data.id;mask.renderOrder=-10;root.add(mask);terrain.occluders.push(mask);
  }
  const material=color=>new T.MeshStandardMaterial({color,roughness:.39,metalness:.12});
  for(const [index,data] of map.landmarks.entries()){
    const group=new T.Group();group.position.copy(groundPoint(camera,data.at));root.add(group);
    const width=groundPoint(camera,[data.at[0]+data.size[0]/2,data.at[1]]).distanceTo(groundPoint(camera,[data.at[0]-data.size[0]/2,data.at[1]]));
    const heightPoint=group.position.clone().add(new T.Vector3(0,1,0)).project(camera),base=group.position.clone().project(camera);
    const height=data.size[1]/Math.abs((heightPoint.y-base.y)/2);
    const item={...data,model:group,hp:data.hp,maxHp:data.hp,dead:false,anchor:new T.Object3D()};group.add(item.anchor);terrain.landmarks.push(item);
    if(['plaque','fat','macrophage'].includes(data.kind)){
      const count=data.kind==='macrophage'?16:28,mesh=new T.InstancedMesh(new T.SphereGeometry(1,12,8),material(data.kind==='macrophage'?0xa35d9e:0xf7b331),count),dummy=new T.Object3D();
      for(let i=0;i<count;i++){
        const a=i*2.399,r=Math.sqrt((i+.5)/count),s=.095+(i%4)*.011;
        dummy.position.set(Math.cos(a)*r*width*.39,height*(.12+(1-r)*.7),Math.sin(a)*r*width*.16);
        dummy.scale.set(width*s,height*(.16+(i%3)*.025),width*s*.7);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
      }
      group.add(mesh);mesh.castShadow=true;mesh.receiveShadow=true;
      if(!data.hp){mesh.userData.fullCount=count;terrain.density.push(mesh);}
      item.anchor.position.y=height*1.1;
      if(data.hp){
        const bar=new T.Group();bar.position.y=height*1.04;group.add(bar);
        const bg=new T.Mesh(new T.BoxGeometry(1,1,1),new T.MeshBasicMaterial({color:0x301a24}));bg.scale.set(width,.12,.04);bg.userData.decorative=true;bar.add(bg);
        const fill=new T.Mesh(new T.BoxGeometry(1,1,1),new T.MeshBasicMaterial({color:0xffd875}));fill.position.z=.035;fill.scale.set(width,.08,.035);fill.userData.decorative=true;bar.add(fill);item.bar=bar;item.fill=fill;item.barWidth=width;
      }
    }else{
      // Deck footprints are unprojected independently so their outline sits on the painted stones/bridges.
      const count=data.kind==='stone'?12:4;
      const pts=Array.from({length:count},(_,i)=>{
        const a=i/count*Math.PI*2+(count===4?Math.PI/4:0),k=count===4?Math.SQRT2:1;
        return groundPoint(camera,[data.at[0]+Math.cos(a)*data.size[0]*.5*k,data.at[1]+Math.sin(a)*data.size[1]*.5*k]).sub(group.position);
      });
      const shape=new T.Shape(pts.map(p=>new T.Vector2(p.x,-p.z)));
      const geometry=new T.ExtrudeGeometry(shape,{depth:.16,bevelEnabled:true,bevelSize:.06,bevelThickness:.03,bevelSegments:1,steps:1});geometry.rotateX(-Math.PI/2);
      const deck=new T.Mesh(geometry,material(data.kind==='fibrosis'?0xedd0b0:0xd99983));deck.position.y=-.13;deck.receiveShadow=true;group.add(deck);item.anchor.position.y=.22;
      if(data.kind==='fibrosis')terrain.fibers.push(deck);
    }
  }
  for(const r of terrain.routes.items){
    const core=new T.Group();core.position.copy(terrain.routes.sample(r.id,1));root.add(core);terrain.cores.push(core);
    if(terrain.cores.length>1&&map.topology!=='parallel')continue;
    const ring=new T.Mesh(new T.TorusGeometry(.9,.05,6,36),new T.MeshBasicMaterial({color:map.palette.accent,transparent:true,opacity:.65}));ring.rotation.x=-Math.PI/2;ring.position.y=.03;core.add(ring);
  }
  terrain.core=terrain.cores[0];
  terrain.setQuality=level=>{for(const mesh of terrain.density)mesh.count=Math.ceil(mesh.userData.fullCount*[1,.75,.5,.25][level]);};
  terrain.animate=(t,wave,view)=>{for(const l of terrain.landmarks)if(l.bar){l.bar.quaternion.copy(view.quaternion);l.fill.scale.x=l.barWidth*Math.max(0,l.hp/l.maxHp);}for(const fiber of terrain.fibers)fiber.scale.y=1+wave*.4;};
  terrain.dispose=()=>{root.removeFromParent();disposeObject(root);};
  return terrain;
}
