// Traced against the original 1672 × 941 plates. Stored/exported coordinates are normalized.
const point=([x,y])=>[x/1672,y/941];
const route=(id,names,points)=>({id,names,points:points.map(point)});
// ICDM2026: 콩팥 가디언·췌장 포탑이 화면을 가려 원래 1.3배에서 0.9배로 줄였다 (사용자 피드백)
const ORGAN_SCALE=0.9;
const organ=(at,height)=>({at:point(at),height:height*ORGAN_SCALE/941});
const landmark=(kind,at,size,hp=0)=>({kind,at:point(at),size:size.map((n,i)=>n/(i?941:1672)),hp,names:({plaque:['포도당 둔덕','Glucose mound'],crystal:['포도당 둔덕','Glucose mound'],bridge:['섬 연결 다리','Island bridge']})[kind]});
const mask=(id,at,points)=>({id,at:point(at),points:points.map(point)});
// A standing regular enemy occupies 15% of the plate at these foreground anchors.
// Keep physical height fixed along a route so depth, not route progress, sets perspective.
const ACTORS={coronary:[835,825],glomerulus:[780,818],islet:[820,829]};
export const PLATES={
  coronary:{
    topology:'Y',camera:{height:18,fov:46,targetZ:-25},
    routes:[route('left',['좌측 혈관','Left artery'],[[132,60],[158,104],[270,158],[347,218],[389,310],[420,365],[540,414],[680,459],[787,510],[835,550]]),route('right',['우측 혈관','Right artery'],[[1541,54],[1510,102],[1400,148],[1320,205],[1280,284],[1246,355],[1140,406],[986,459],[876,510],[835,550]])],
    trunk:[[835,550],[831,631],[820,730],[824,825],[835,924]].map(point),
    organs:{kidney:organ([832,315],212),pancreas:organ([1497,471],209)},
    landmarks:[landmark('plaque',[420,283],[103,104],8),landmark('plaque',[1260,297],[122,111],10)],
    occluders:[mask('left-vessel-wall',[530,726],[[0,540],[210,472],[322,409],[385,416],[520,467],[650,520],[669,575],[621,697],[565,806],[486,941],[0,941]]),mask('right-dais',[1460,615],[[1123,617],[1181,555],[1326,518],[1500,530],[1672,560],[1672,941],[1373,941],[1230,802],[1153,722]])],
  },
  glomerulus:{
    topology:'switchback',camera:{height:25,fov:43,targetZ:-28},
    title:['요세관 스위치백','The tubule switchbacks'],subtitle:['세 단 테라스를 지그재그로 내려와요','Three stepped terraces, two hairpins'],
    briefing:['보먼주머니에서 나온 적이 위 테라스를 가로지른 뒤 헤어핀을 두 번 돌아 전경으로 내려와요. 가운데 헤어핀 안쪽 결정 바위에 선 콩팥 가디언과 오른쪽 단상의 췌장 포탑이 함께 막아요.','Invaders leave the Bowman capsule, cross the upper terrace and take two hairpins down to the foreground. The guardian stands on the crystal shelf inside the middle hairpin, with the turret on the right dais.'],
    routes:[route('tubule',['요세관 내리막','Tubular descent'],[[335,160],[435,224],[619,231],[819,231],[1010,221],[1161,226],[1292,255],[1376,297],[1361,351],[1252,385],[1080,381],[900,391],[719,391],[540,412],[390,424],[312,440],[277,463],[300,490],[382,507],[501,543],[671,553],[843,557],[989,567],[1092,594],[1160,637],[937,765],[859,803],[771,822]])],trunk:[],
    organs:{kidney:organ([1520,521],186),pancreas:organ([168,413],213)},
    landmarks:[landmark('crystal',[1155,227],[96,84],10),landmark('crystal',[719,392],[92,78],8)],
    occluders:[mask('left-bank',[150,780],[[0,640],[120,610],[250,662],[300,760],[248,880],[120,941],[0,941]]),mask('right-dais',[1450,638],[[1290,620],[1400,570],[1560,575],[1672,620],[1672,941],[1240,941]])],
  },
  islet:{
    topology:'parallel-3',camera:{height:24,fov:44,targetZ:-28},
    title:['세 갈래의 섬','Three roads through the islets'],subtitle:['중앙 섬은 다리로 이어져요','The core island joins by bridge'],
    briefing:['좌우 길과 함께, 중앙 섬의 적이 오른쪽 다리를 건너 내려와요. 보스도 그 다리로 옵니다.','Enemies also cross the right-hand bridge from the core island; bosses take that bridge too.'],
    bossRoute:'islet-core',
    routes:[route('islet-left',['왼쪽 섬길','Left island road'],[[456,89],[403,111],[408,144],[420,170],[374,206],[294,236],[246,272],[252,311],[310,350],[281,383],[208,433],[197,484],[243,538],[310,600],[340,673],[331,752],[350,829],[429,922]]),route('islet-right',['오른쪽 섬길','Right island road'],[[1243,92],[1315,124],[1328,157],[1290,184],[1310,222],[1393,260],[1441,310],[1437,360],[1391,398],[1443,440],[1497,481],[1483,530],[1411,576],[1368,638],[1357,708],[1319,783],[1260,848],[1200,922]]),route('islet-core',['중앙 섬 다리길','Core island bridge road'],[[985,385],[1060,392],[1130,400],[1185,396],[1255,398],[1358,402],[1435,410],[1493,475],[1508,527],[1411,576],[1368,638],[1357,708],[1319,783],[1260,848],[1200,922]])],trunk:[],
    organs:{kidney:organ([472,494],202),pancreas:organ([1241,502],196)},
    // ICDM2026: 다리는 그림에 이미 그려져 있다. 축 정렬 덱(베이지 판)이 대각선 다리와 어긋나 물 위에 떠 보여서 뺐다.
    landmarks:[],
    occluders:[mask('central-island',[850,355],[[540,373],[613,294],[778,247],[962,270],[1112,348],[1186,442],[1107,517],[942,571],[709,553],[576,481]]),mask('left-island',[219,575],[[51,501],[111,470],[178,491],[202,552],[246,585],[207,628],[92,632]]),mask('right-island',[1505,705],[[1475,542],[1553,519],[1645,549],[1672,595],[1672,733],[1470,721],[1411,661]])],
  },
};
export function withPlate(base){
  const layout=PLATES[base.key];
  return {...base,title:base.title||base.names,subtitle:base.subtitle||['그림 속 길을 따라 방어해요','Defend the roads through the plate'],briefing:base.briefing||['다가오는 적을 막고 장기와 함께 방어해요.','Stop the invaders with your organ allies.'],fact:base.fact||['몸속 구조를 바탕으로 만든 게임 공간이에요.','A game environment inspired by structures inside the body.'],...layout,actors:{at:point(ACTORS[base.key]),height:.15},ready:true,plate:`../assets/maps/map_${base.key}.jpg`,legacy:base};
}
