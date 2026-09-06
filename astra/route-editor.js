import { groundPoint, routeDocument, validateRoutes, loadRoutes } from './plate.js?v=a12';
const $=id=>document.getElementById(id);
const clone=value=>JSON.parse(JSON.stringify(value));
export class RouteEditor {
  constructor(world,onChange){
    this.world=world;this.onChange=onChange;this.active=false;this.selected=null;this.history=[];
    $('route-editor-panel-toggle').onclick=()=>this.togglePanel();
    $('route-editor-close').onclick=()=>this.toggle(false);
    $('route-editor-save').onclick=()=>this.save();
    $('route-editor-export').onclick=()=>this.exportJSON();
    $('route-editor-undo').onclick=()=>this.undo();
    $('route-editor-default').onclick=()=>this.replace(routeDocument(this.world.map));
    $('route-editor-reload').onclick=()=>this.replace(loadRoutes(this.world.map,this.world.camera).doc);
    $('route-editor-import').onclick=()=>{try{this.replace(JSON.parse($('route-editor-json').value));}catch(e){this.status(e.message);}};
    $('route-editor-route').onchange=()=>{this.selected=null;this.draw();};
    const svg=$('route-editor-canvas');
    svg.addEventListener('pointerdown',e=>this.pointerDown(e));
    svg.addEventListener('pointermove',e=>{if(this.dragging){this.move(this.pointer(e));}});
    const finish=()=>{this.dragging=false;};svg.addEventListener('pointerup',finish);svg.addEventListener('pointercancel',finish);
    window.addEventListener('keydown',e=>{
      if(['INPUT','SELECT','TEXTAREA'].includes(e.target?.tagName))return;
      if(e.code==='KeyD'&&!e.repeat){e.preventDefault();this.toggle();return;}
      if(!this.active)return;
      if(e.code==='KeyH'&&!e.repeat){e.preventDefault();this.togglePanel();}
      if(e.code==='Escape'){e.preventDefault();this.toggle(false);}
      if(e.code==='KeyS'&&(e.ctrlKey||e.metaKey)){e.preventDefault();this.save();}
      if(e.code==='KeyZ'&&(e.ctrlKey||e.metaKey)){e.preventDefault();this.undo();}
      if(e.code==='Delete'||e.code==='Backspace'){e.preventDefault();this.remove();}
    });
  }
  togglePanel(){const hidden=$('route-editor-panel').classList.toggle('hidden');$('route-editor-panel-toggle').textContent=hidden?'패널 보기 · H':'패널 숨기기 · H';}
  get doc(){return this.world.terrain.document;}
  get paths(){return [...this.doc.routes,...(this.doc.trunk.length?[{id:'trunk',points:this.doc.trunk}]:[])];}
  path(index=this.pathIndex,doc=this.doc){return index<doc.routes.length?doc.routes[index].points:doc.trunk;}
  get pathIndex(){return Number($('route-editor-route').value)||0;}
  status(message){$('route-editor-status').textContent=message;}
  toggle(force){
    const next=force??!this.active;if(next&&!this.world.map.plate)return false;
    this.active=next;$('route-editor').classList.toggle('hidden',!next);$('stage').classList.toggle('route-editing',next);
    this.onChange?.(next);
    if(next){
      this.history=[];this.selected=null;this.wasDebug=this.world.terrain.debug.visible;this.world.terrain.debug.visible=false;
      $('route-editor-route').replaceChildren();
      this.paths.forEach((r,i)=>{const option=document.createElement('option');option.value=i;option.textContent=r.id;$('route-editor-route').append(option);});
      $('route-editor-route').value='0';this.status(`${this.world.map.key} · ${this.world.terrain.storageStatus}`);this.draw();
    }else{this.world.terrain.debug.visible=this.wasDebug||false;this.world.render();}
    return next;
  }
  draw(){
    if(!this.active)return;
    const colors=['#64ffff','#ff8cd4','#fff281','#99ffb4'];
    let markup='';
    for(const [i,r] of this.world.terrain.routes.items.entries()){
      const points=Array.from({length:301},(_,n)=>{const p=this.world.terrain.routes.sample(r.id,n/300).project(this.world.camera);return `${(p.x+1)*836},${(1-p.y)*470.5}`;}).join(' ');
      markup+=`<polyline points="${points}" fill="none" stroke="${colors[i]}" stroke-width="3" opacity=".9" pointer-events="none"/>`;
    }
    this.paths.forEach((r,path)=>r.points.forEach(([x,y],index)=>{
      const selected=this.selected?.path===path&&this.selected.index===index;
      markup+=`<circle cx="${x*1672}" cy="${y*941}" r="${selected?10:7}" fill="${selected?'#fff':colors[path]}" stroke="#271322" stroke-width="3" data-path="${path}" data-index="${index}"/><text x="${x*1672+10}" y="${y*941-9}" fill="${colors[path]}" stroke="#201022" stroke-width="2" paint-order="stroke" font-size="15" pointer-events="none">${r.id}:${index+1}</text>`;
    }));
    $('route-editor-canvas').innerHTML=markup;
    $('route-editor-counts').textContent=this.paths.map(r=>`${r.id}: ${r.points.length}`).join(' / ');
    $('route-editor-json').value=JSON.stringify(this.doc,null,2);
    this.world.gun.visible=false;this.world.render();
  }
  pointer(event){const rect=$('route-editor-canvas').getBoundingClientRect();return [Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width)),Math.max(0,Math.min(1,(event.clientY-rect.top)/rect.height))].map(n=>Number(n.toFixed(6)));}
  snapshot(){this.history.push(clone(this.doc));if(this.history.length>80)this.history.shift();}
  pointerDown(e){
    if(e.button!==0)return;e.preventDefault();
    if(e.target.dataset.index!==undefined){
      this.selected={path:Number(e.target.dataset.path),index:Number(e.target.dataset.index)};$('route-editor-route').value=String(this.selected.path);
      if(e.altKey){this.remove();return;}
      this.snapshot();this.dragging=true;$('route-editor-canvas').setPointerCapture?.(e.pointerId);this.draw();return;
    }
    if(e.shiftKey){
      const doc=clone(this.doc),points=this.path(this.pathIndex,doc),index=this.selected?.path===this.pathIndex?Math.min(this.selected.index+1,points.length-1):points.length-1;
      points.splice(index,0,this.pointer(e));if(this.replace(doc))this.selected={path:this.pathIndex,index};this.draw();
    }else if(this.selected){this.snapshot();this.move(this.pointer(e));}
  }
  move(point){
    if(!this.selected)return false;
    try{
      groundPoint(this.world.camera,point);
      const doc=clone(this.doc),{path,index}=this.selected,points=this.path(path,doc);points[index]=point;
      if(doc.trunk.length&&((path===doc.routes.length&&index===0)||(path<doc.routes.length&&index===points.length-1))){doc.trunk[0]=[...point];doc.routes.forEach(r=>r.points[r.points.length-1]=[...point]);}
      if(doc.topology==='radial'&&index===points.length-1)doc.routes.forEach(r=>r.points[r.points.length-1]=[...point]);
      this.world.terrain.applyRoutes(doc);this.status('수정한 경로를 미리 보고 있어요. 저장하면 다음 판에도 적용돼요.');this.draw();return true;
    }catch(e){this.status(e.message);return false;}
  }
  replace(doc){
    try{validateRoutes(this.world.map,doc,this.world.camera);this.snapshot();this.world.terrain.applyRoutes(doc);this.selected=null;this.draw();this.status('경로를 적용했어요. 저장 버튼으로 이 기기에 남길 수 있어요.');return true;}catch(e){this.status(e.message);return false;}
  }
  remove(){
    if(!this.selected)return;
    const doc=clone(this.doc),{path,index}=this.selected,points=this.path(path,doc);
    if(points.length<=2||index===0||index===points.length-1){this.status('시작점과 도착점은 드래그로 옮길 수 있어요.');return;}
    points.splice(index,1);this.replace(doc);
  }
  undo(){const doc=this.history.pop();if(doc){this.world.terrain.applyRoutes(doc);this.selected=null;this.draw();this.status('이전 경로로 돌아왔어요.');}}
  save(){
    try{const doc=validateRoutes(this.world.map,this.doc,this.world.camera);localStorage.setItem(`astra_routes_${this.world.map.key}`,JSON.stringify(doc));this.world.terrain.storageStatus='saved';this.status(`저장했어요 · astra_routes_${this.world.map.key}`);return true;}
    catch(e){this.status(`저장하지 못했어요. JSON 내보내기로 경로를 보관해 주세요. (${e.message})`);return false;}
  }
  exportJSON(){
    const json=JSON.stringify(this.doc,null,2);$('route-editor-json').value=json;
    const url=URL.createObjectURL(new Blob([json],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download=`astra_routes_${this.world.map.key}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);this.status('JSON 파일을 내보냈어요. 아래 내용도 복사할 수 있어요.');return json;
  }
}
