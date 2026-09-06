export default {
  key:'sinusoid',ready:true,chapter:'03',names:['간 소엽 · 시누소이드','Liver lobule & sinusoids'],
  title:['간의 중심으로','Into the heart of the liver'],core:['중심정맥','Central vein'],
  subtitle:['세 문맥 유입로가 하나의 중심정맥으로','Three portal inlets. A single central vein.'],
  briefing:['문맥 쪽에서 시작한 적이 방사형 혈류를 따라 중심정맥으로 모여요. 웨이브마다 굵어지는 섬유화 띠 사이에서 남은 길을 지켜가요.','Invaders travel from portal inlets along radial channels toward the central vein. Hold the remaining paths as fibrosis bands thicken with each wave.'],
  fact:['MASLD에서 염증과 섬유화가 동반될 수 있어요. 쿠퍼세포와 간세포판 사이 혈류를 풍경으로 표현했어요.','MASLD can involve inflammation and fibrosis. The scenery depicts Kupffer cells and flow between hepatocyte plates.'],
  palette:{background:0x221b33,fog:0x4b3754,road:0x805777,edge:0x82dccb,tissue:0x9f5368,accent:0x8affd4,floor:0x462b48},
  fog:.012,seed:9537,width:5.4,
  routes:[
    {id:'portal-left',names:['좌측 문맥 유입로','Left portal inlet'],points:[[-29,0,-66],[-22,0,-55],[-17,0,-40],[-9,0,-28],[0,0,-23],[0,0,-17]]},
    {id:'portal-top',names:['상부 문맥 유입로','Upper portal inlet'],points:[[0,0,-85],[4,0,-65],[-2,0,-45],[2,0,-30],[0,0,-23],[0,0,-17]]},
    {id:'portal-right',names:['우측 문맥 유입로','Right portal inlet'],points:[[29,0,-66],[23,0,-55],[17,0,-40],[9,0,-28],[0,0,-23],[0,0,-17]]},
  ],
  trunk:[[0,0,-17],[0,0,-11],[1,0,-3],[0,0,6]],
  landmarks:[
    {kind:'kupffer',position:[-10,0,-40],names:['쿠퍼세포','Kupffer cells']},
    {kind:'kupffer',position:[11,0,-43],names:['쿠퍼세포','Kupffer cells']},
    {kind:'fibrosis',position:[-8,0,-30],names:['섬유화 띠','Fibrosis bands']},
    {kind:'fibrosis',position:[9,0,-52],names:['간세포판 · 섬유화','Hepatocyte plates · fibrosis']},
  ],gate:['중심정맥 게이트','Central vein gate'],
};
