// 시작 로고(Axino): 펜을 떼지 않는 한 줄 그리기. 좌표는 400×206 기준.
// 새 머리 → 목 → 대각선 → A 오른쪽 획 위로 → 꼭대기 → 왼쪽 획 → 가로획 → 오른쪽 획 아래로 → ino.
// back:true 구간은 이미 그린 선을 되짚는 길이라 화면엔 새로 생기지 않으므로 빠르게 지나간다.
const INO=[[222,180],[234,176],[243,160],[248,140],[246,162],[249,178],[258,176],[264,156],[274,141],[286,141],[293,154],[296,178],[308,180],[322,172],[334,156],[350,138],[372,134],[388,144],[388,166],[372,182],[350,186],[333,176],[332,156],[348,140],[372,134],[396,134]];
const SEGMENTS=[
  {pts:[[151,58],[154,42],[162,28],[178,18],[197,17],[212,25],[222,42],[222,65],[212,88],[195,113],[168,142]],curve:true},
  {pts:[[168,142],[90,195]]},
  {pts:[[90,195],[168,142]],back:true},
  {pts:[[168,142],[158,112]]},
  {pts:[[158,112],[152,85],[146,50],[140,32],[132,34],[120,48],[95,82],[60,138]],curve:true},
  {pts:[[60,138],[26,194]]},
  {pts:[[26,194],[60,138]],back:true},
  {pts:[[60,138],[10,151.4]]},
  {pts:[[10,151.4],[60,138]],back:true},
  {pts:[[60,138],[158,112]]},
  {pts:[[158,112],[168,142]],back:true},
  {pts:[[168,142],[185,166],[205,179],...INO],curve:true},
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
  // 구간별 길이를 재서, 되짚는 구간은 시간을 1/5만 쓰는 키프레임을 만든다.
  let d=`M${SEGMENTS[0].pts[0]}`;const marks=[0],weights=[0];
  const probe=el('path',{},svg);
  for(const seg of SEGMENTS){
    const before=marks.at(-1);d+=segmentPath(seg);probe.setAttribute('d',d);const after=probe.getTotalLength();
    marks.push(after);weights.push(weights.at(-1)+(after-before)*(seg.back?.2:1));
  }
  probe.remove();
  const line=el('path',{d,...ink},svg),len=marks.at(-1),total=weights.at(-1);
  line.style.strokeDasharray=`${len} ${len}`;line.style.strokeDashoffset=len;
  const frames=marks.map((m,i)=>({strokeDashoffset:len-m,offset:weights[i]/total}));
  const DRAW=3000,at=i=>300+DRAW*weights[i]/total;
  const eye=el('circle',{cx:205,cy:48,r:5,fill:'#1b1b1f'},svg);
  const accents=ACCENTS.map(([tag,d,attrs])=>el(tag,{d,...attrs},svg));
  for(const node of [eye,...accents]){node.style.transformBox='fill-box';node.style.transformOrigin='center';node.style.transform='scale(0)';}
  const pop=(node,delay)=>node.animate([{transform:'scale(0)'},{transform:'scale(1.2)',offset:.65},{transform:'scale(1)'}],{duration:260,delay,easing:'ease-out',fill:'forwards'});
  let timer=0;
  return new Promise(resolve=>{
    const done=()=>{if(root.classList.contains('out'))return;clearTimeout(timer);root.classList.add('out');setTimeout(()=>{root.remove();resolve();},520);};
    root.addEventListener('pointerdown',done);
    const draw=line.animate(frames,{duration:DRAW,delay:300,fill:'forwards'});
    // 머리를 다 그리면 눈·부리·물방울, ino를 쓰기 시작하면 하트가 톡 튀어나온다.
    pop(eye,at(1)-200);pop(accents[0],at(1)-80);pop(accents[1],at(1)+60);pop(accents[2],at(11)+300);
    draw.finished.then(()=>{timer=setTimeout(done,1200);},()=>{});
  });
}
