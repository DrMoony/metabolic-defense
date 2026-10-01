export default {
  key:'omentum',ready:true,chapter:'02',names:['내장지방 · 장간막','Omentum & mesentery'],
  title:['황금 골목의 파수꾼','Beyond the golden maze'],core:['간 문맥','Portal vein'],
  subtitle:['지방 언덕 사이, 간으로 향하는 길을 지켜요','Between golden hills, defend the passage to the liver.'],
  briefing:['지방세포 사이로 세 갈래 골목이 이어져요. 염증 대식세포 군집을 지나오는 적을 막고 간 문맥까지 방어선을 이어가요.','Three winding alleys weave between adipocytes. Stop invaders passing inflammatory macrophage clusters before they reach the portal vein.'],
  fact:['내장지방 조직의 염증은 대사 이상과 연결돼요. 이곳의 대식세포는 지형 장식으로 표시해요.','Inflammation in visceral adipose tissue is linked to metabolic dysfunction. Macrophages here are scenery.'],
  palette:{background:0x36202a,fog:0x79503c,road:0xbb7244,edge:0xffd782,tissue:0xe5a638,accent:0xffdf85,floor:0x754133},
  fog:.011,seed:8302,width:5.4,
  routes:[
    {id:'west',names:['서쪽 지방 골목','West adipose alley'],points:[[-24,0,-78],[-22,0,-59],[-10,0,-51],[-17,0,-36],[-7,0,-26],[0,0,-23],[0,0,-17]]},
    {id:'middle',names:['중앙 지방 골목','Central adipose alley'],points:[[0,0,-85],[7,0,-64],[-1,0,-48],[4,0,-31],[0,0,-23],[0,0,-17]]},
    {id:'east',names:['동쪽 지방 골목','East adipose alley'],points:[[25,0,-79],[23,0,-60],[15,0,-50],[21,0,-36],[8,0,-24],[0,0,-23],[0,0,-17]]},
  ],
  trunk:[[0,0,-17],[0,0,-11],[1,0,-3],[0,0,6]],
  landmarks:[
    {kind:'fat',route:'west',at:.6,side:-1,hp:8,names:['지방 둔덕','Fat mound']},
    {kind:'fat',route:'east',at:.57,side:1,hp:8,names:['지방 둔덕','Fat mound']},
    {kind:'macrophage',position:[-6,0,-40],names:['염증 대식세포 군집','Inflammatory macrophages']},
    {kind:'macrophage',position:[12,0,-58],names:['지방 조직 면역세포','Adipose immune cells']},
  ],gate:['간 문맥 게이트','Portal vein gate'],
};
