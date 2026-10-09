// 시작 로고(Axino): 펜이 한붓그리기로 지나가듯 획 순서대로 드러낸다. 좌표는 로고 원본 400×206 기준.
// 순서는 원본 프레임을 따른다: 왼쪽 획 → A 오른쪽 획 → 가로획 → 새 머리 → 눈 → 부리·물방울 → 하트 → ino.
const STROKES=[
  ['ink','M26 194 L45 160 L65 128 L83 100 L103 70 L120 47 L133 33 L143 35',380],
  ['ink','M143 34 L148 67 L155 100 L165 133 L180 160 L200 177 L218 181',420],
  ['ink','M8 150 L50 133 L90 120 L136 112',300],
  ['ink','M90 195 L120 177 L150 155 L175 135 L195 113 L212 88 L222 65 L222 42 L212 25 L197 17 L178 18 L162 28 L154 42 L151 58',620],
  ['ink','M205 40 L205 60',120],
  ['pop',240,50,30,200],['pop',272,28,22,150],['pop',284,41,18,150],
  ['pop',252,112,22,220],
  ['ink','M218 181 L232 178 L242 165 L247 148 L247 138 L246 160 L247 175 L252 180 L258 176 L262 160 L266 147 L275 140 L285 141 L292 152 L295 168 L297 178 L305 180 L318 175 L330 163 L335 145 L350 136 L370 134 L385 138 L390 150 L385 168 L370 180 L350 185 L332 180 L325 165 L330 148 L345 138 L370 133 L394 135',820],
];
const NS='http://www.w3.org/2000/svg';
const el=(tag,attrs={},parent)=>{const node=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))node.setAttribute(k,v);parent?.append(node);return node;};

export function playSplash(root=document.getElementById('splash')){
  if(!root)return Promise.resolve();
  const svg=el('svg',{viewBox:'0 0 400 206','aria-label':'Axino'},root),defs=el('defs',{},svg);
  const full=el('image',{href:'./assets/axino.png',width:400,height:206,opacity:0},svg);
  const popMask=el('mask',{id:'axino-pop-mask',maskUnits:'userSpaceOnUse',x:0,y:0,width:400,height:206},defs);
  const accent=el('image',{href:'./assets/axino-accent.png',width:400,height:206,mask:'url(#axino-pop-mask)'},svg);
  // 획마다 그 획에 속한 픽셀만 담은 레이어(axino-sN.png)를 자기 경로 마스크로만 드러내, 엇갈리는 획이 미리 비치지 않게 한다.
  let n=0;
  const steps=STROKES.map(([kind,...rest])=>{
    if(kind==='ink'){
      const [d,ms]=rest,id=`axino-s${++n}`,mask=el('mask',{id:`${id}-mask`,maskUnits:'userSpaceOnUse',x:0,y:0,width:400,height:206},defs);
      el('image',{href:`./assets/${id}.png`,width:400,height:206,mask:`url(#${id}-mask)`},svg);
      const path=el('path',{d,fill:'none',stroke:'#fff','stroke-width':34,'stroke-linecap':'round','stroke-linejoin':'round'},mask);
      const len=path.getTotalLength();path.style.strokeDasharray=`${len} ${len}`;path.style.strokeDashoffset=len;
      return {ms,run:()=>path.animate([{strokeDashoffset:len},{strokeDashoffset:0}],{duration:ms,easing:'cubic-bezier(.45,.05,.4,1)',fill:'forwards'})};
    }
    const [cx,cy,r,ms]=rest,dot=el('circle',{cx,cy,r},popMask);dot.style.fill='#fff';dot.style.transformOrigin=`${cx}px ${cy}px`;dot.style.transform='scale(0)';
    return {ms,run:()=>dot.animate([{transform:'scale(0)'},{transform:'scale(1.15)',offset:.7},{transform:'scale(1)'}],{duration:ms,easing:'ease-out',fill:'forwards'})};
  });
  let skipped=false,timer=0;
  return new Promise(resolve=>{
    const done=()=>{if(root.classList.contains('out'))return;clearTimeout(timer);root.classList.add('out');setTimeout(()=>{root.remove();resolve();},520);};
    root.addEventListener('pointerdown',()=>{skipped=true;done();});
    (async()=>{
      await new Promise(r=>setTimeout(r,350));
      for(const step of steps){if(skipped)return;await step.run().finished;}
      // 마스크 경계에 남는 잔털까지 확실히 보이도록 마지막엔 원본 한 장으로 바꾼다.
      svg.append(full);full.animate([{opacity:0},{opacity:1}],{duration:200,fill:'forwards'});
      timer=setTimeout(done,1100);
    })();
  });
}
