// 시작 로고(Axino): 단순한 한 줄 선으로 글씨 쓰는 순서대로 그린다. 좌표는 400×206 기준.
// A 왼쪽 획 → 오른쪽 획에서 ino까지 한 번에 → 가로획 → 대각선에서 새 머리 → 눈. 그은 선은 다시 지나가지 않고, 끝에 주황 부리·물방울·하트가 붙는다.
const INO=[[218,181],[234,176],[243,160],[248,140],[246,162],[249,178],[258,176],[264,156],[274,141],[286,141],[293,154],[296,178],[308,180],[322,172],[334,156],[350,138],[372,134],[388,144],[388,166],[372,182],[350,186],[333,176],[332,156],[348,140],[372,134],[396,134]];
const STROKES=[
  {pts:[[26,194],[60,138],[95,82],[120,48],[132,34],[140,32],[146,50],[152,85],[158,112],[168,142],[185,166],[202,178],...INO],curve:true},
  {pts:[[10,151],[60,138],[136,118]]},
  {pts:[[90,195],[130,170],[168,142],[195,113],[212,88],[222,65],[222,42],[212,25],[197,17],[178,18],[162,28],[154,42],[151,58]],curve:true},
  {pts:[[205,46],[205,50]]},
];
const ACCENTS=[
  ['path','M222 42 L242 50 L221 59 Z',{fill:'#f5a312'}],
  ['path','M262 26 L270 14 M274 42 L290 36',{fill:'none',stroke:'#f5a312','stroke-width':5,'stroke-linecap':'round'}],
  ['path','M252 124 C238 112 238 98 247 98 C251 98 252 102 252 105 C252 102 253 98 257 98 C266 98 266 112 252 124 Z',{fill:'#f5a312'}],
];
const NS='http://www.w3.org/2000/svg';
const el=(tag,attrs={},parent)=>{const node=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))node.setAttribute(k,v);parent?.append(node);return node;};
// 점들을 Catmull-Rom 곡선으로 매끄럽게 잇는다(curve가 아니면 직선). 시작점(M)은 붙이지 않는다.
function segmentPath({pts,curve}){
  if(!curve)return pts.slice(1).map(p=>` L${p}`).join('');
  let d='';
  for(let i=0;i<pts.length-1;i++){
    const p0=pts[i-1]||pts[i],p1=pts[i],p2=pts[i+1],p3=pts[i+2]||p2;
    const c1=[p1[0]+(p2[0]-p0[0])/6,p1[1]+(p2[1]-p0[1])/6],c2=[p2[0]-(p3[0]-p1[0])/6,p2[1]-(p3[1]-p1[1])/6];
    d+=` C${c1.map(n=>n.toFixed(1))} ${c2.map(n=>n.toFixed(1))} ${p2}`;
  }
  return d;
}

export function playSplash(root=document.getElementById('splash')){
  if(!root)return Promise.resolve();
  const svg=el('svg',{viewBox:'-8 0 416 214','aria-label':'Axino'},root);
  const ink={fill:'none',stroke:'#1b1b1f','stroke-width':6.5,'stroke-linecap':'round','stroke-linejoin':'round'};
  // 펜 속도를 일정하게: 획마다 길이에 비례한 시간을 주고, 획 사이엔 펜을 떼는 짧은 쉼을 둔다.
  const SPEED=.55,LIFT=110;let clock=300;
  const lines=STROKES.map(seg=>{
    const path=el('path',{d:`M${seg.pts[0]}${segmentPath(seg)}`,...ink},svg),len=path.getTotalLength();
    path.style.strokeDasharray=`${len} ${len}`;path.style.strokeDashoffset=len;path.style.opacity=0;
    const duration=Math.max(120,len/SPEED),delay=clock;clock+=duration+LIFT;
    return {path,len,duration,delay};
  });
  const accents=ACCENTS.map(([tag,d,attrs])=>el(tag,{d,...attrs},svg));
  for(const node of accents){node.style.transformBox='fill-box';node.style.transformOrigin='center';node.style.transform='scale(0)';}
  const pop=(node,delay)=>node.animate([{transform:'scale(0)'},{transform:'scale(1.2)',offset:.65},{transform:'scale(1)'}],{duration:260,delay,easing:'ease-out',fill:'forwards'});
  let timer=0;
  return new Promise(resolve=>{
    const done=()=>{if(root.classList.contains('out'))return;clearTimeout(timer);root.classList.add('out');setTimeout(()=>{root.remove();resolve();},520);};
    root.addEventListener('pointerdown',done);
    const draws=lines.map(({path,len,duration,delay})=>path.animate([{strokeDashoffset:len,opacity:1},{strokeDashoffset:0,opacity:1}],{duration,delay,easing:'cubic-bezier(.35,0,.45,1)',fill:'forwards'}));
    // 검은 선을 다 그린 뒤에 주황 부리·물방울·하트를 차례로 톡 붙인다.
    pop(accents[0],clock);pop(accents[1],clock+140);pop(accents[2],clock+300);
    draws.at(-1).finished.then(()=>{timer=setTimeout(done,1500);},()=>{});
  });
}
