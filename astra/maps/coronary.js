export default {
  key:'coronary', ready:true, chapter:'01', names:['관상동맥','Coronary artery'],
  title:['박동을 지켜라','Guard the heartbeat'], core:['심장','Heart'],
  subtitle:['붉은 분지 너머, 심장으로 이어지는 두 갈래 길','Two crimson branches. One beating heart.'],
  briefing:['분지부의 흐름을 따라 적이 다가와요. 길 가장자리의 플라크를 쏘아 협착 구간을 열고 심장을 지켜가요.','Invaders follow the arterial branches. Shoot the plaques along the road to clear the narrowed segments and protect the heart.'],
  fact:['혈관 분지부의 낮거나 교란된 전단응력은 플라크가 생기기 쉬운 환경과 관련돼요.','Low or disturbed wall shear stress at arterial branches is associated with plaque-prone regions.'],
  palette:{background:0x301226,fog:0x572438,road:0xa44550,edge:0xe49079,tissue:0xa53351,accent:0xffce81,floor:0x582331},
  fog:.012, seed:4291, width:5.8,
  routes:[
    {id:'left',names:['좌측 분지','Left branch'],points:[[-20,0,-79],[-18,0,-59],[-9,0,-46],[-12,0,-32],[0,0,-23],[0,0,-17]]},
    {id:'right',names:['우측 분지','Right branch'],points:[[22,0,-78],[18,0,-58],[7,0,-46],[12,0,-32],[0,0,-23],[0,0,-17]]},
  ],
  trunk:[[0,0,-17],[0,0,-11],[1,0,-3],[0,0,6]],
  landmarks:[
    {kind:'plaque',route:'left',at:.50,side:-1,hp:8,names:['플라크 협착','Plaque stenosis']},
    {kind:'plaque',route:'right',at:.65,side:1,hp:10,names:['플라크 협착','Plaque stenosis']},
    {kind:'bifurcation',position:[0,0,-23],names:['혈관 분지부','Arterial bifurcation']},
  ],
  gate:['관상동맥 분지','Coronary branches'],
};
