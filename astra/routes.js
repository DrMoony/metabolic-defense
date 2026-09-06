import * as T from '../vendor/three.module.js';
const curve=points=>new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)),false,'centripetal');
// Distance along a branch then the SAME trunk, for exact visible confluence.
export class Routes {
  constructor(map){
    this.map=map;this.trunk=map.trunk?.length>1?curve(map.trunk):null;this.trunkLength=this.trunk?.getLength()||0;
    this.items=map.routes.map(data=>{const path=curve(data.points),branchLength=path.getLength();return {...data,path,branchLength,length:branchLength+this.trunkLength};});
  }
  get(id){return this.items.find(r=>r.id===id)||this.items[0];}
  sample(id,progress,target=new T.Vector3()){
    const r=this.get(id),distance=T.MathUtils.clamp(progress,0,1)*r.length;
    return !this.trunk||distance<r.branchLength?r.path.getPointAt(T.MathUtils.clamp(distance/r.branchLength,0,1),target):this.trunk.getPointAt(T.MathUtils.clamp((distance-r.branchLength)/this.trunkLength,0,1),target);
  }
  tangent(id,p,target=new T.Vector3()){
    return target.copy(this.sample(id,Math.min(1,p+.001))).sub(this.sample(id,Math.max(0,p-.001))).normalize();
  }
  distanceToRoad(x,z){
    let nearest=Infinity;
    for(const r of this.items)for(let i=0;i<=100;i++){const p=this.sample(r.id,i/100);nearest=Math.min(nearest,Math.hypot(x-p.x,z-p.z));}
    return nearest;
  }
}
