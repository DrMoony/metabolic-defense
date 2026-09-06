// Traced against the original 1672 × 941 plates. Stored/exported coordinates are normalized.
const point=([x,y])=>[x/1672,y/941];
const route=(id,names,points)=>({id,names,points:points.map(point)});
// 간 가디언·췌장 포탑은 플레이트 기준 측정치보다 30% 크게 세운다 (사용자 피드백)
const ORGAN_SCALE=1.3;
const organ=(at,height)=>({at:point(at),height:height*ORGAN_SCALE/941});
const landmark=(kind,at,size,hp=0)=>({kind,at:point(at),size:size.map((n,i)=>n/(i?941:1672)),hp,names:({plaque:['플라크 협착','Plaque stenosis'],fat:['지방 둔덕','Fat mound'],stone:['징검다리','Stepping stone'],bridge:['섬 연결 다리','Island bridge'],fibrosis:['섬유화 띠','Fibrosis band'],macrophage:['대식세포 군집','Macrophage cluster'],crystal:['요산 결석','Urate stone']})[kind]});
const mask=(id,at,points)=>({id,at:point(at),points:points.map(point)});
// A standing regular enemy occupies 15% of the plate at these foreground anchors.
// Keep physical height fixed along a route so depth, not route progress, sets perspective.
const ACTORS={villi:[700,859],coronary:[835,825],omentum:[873,821],sinusoid:[837,735],carotid:[826,823],stomach:[988,844],glomerulus:[780,818],islet:[820,829]};
export const PLATES={
  coronary:{
    topology:'Y',camera:{height:18,fov:46,targetZ:-25},
    routes:[route('left',['좌측 혈관','Left artery'],[[132,60],[158,104],[270,158],[347,218],[389,310],[420,365],[540,414],[680,459],[787,510],[835,550]]),route('right',['우측 혈관','Right artery'],[[1541,54],[1510,102],[1400,148],[1320,205],[1280,284],[1246,355],[1140,406],[986,459],[876,510],[835,550]])],
    trunk:[[835,550],[831,631],[820,730],[824,825],[835,924]].map(point),
    organs:{liver:organ([832,315],212),pancreas:organ([1497,471],209)},
    landmarks:[landmark('plaque',[420,283],[103,104],8),landmark('plaque',[1260,297],[122,111],10)],
    occluders:[mask('left-vessel-wall',[530,726],[[0,540],[210,472],[322,409],[385,416],[520,467],[650,520],[669,575],[621,697],[565,806],[486,941],[0,941]]),mask('right-dais',[1460,615],[[1123,617],[1181,555],[1326,518],[1500,530],[1672,560],[1672,941],[1373,941],[1230,802],[1153,722]])],
  },
  omentum:{
    briefing:['적이 우측 위에서 출발해 지방 언덕 사이 S자 길을 따라 내려와요. 길가의 지방 둔덕을 쏘고 전경까지 방어선을 이어가요.','Invaders descend from the upper right along one S-shaped road. Shoot the fat mounds along its bends and defend the foreground.'],
    topology:'S',camera:{height:19,fov:44,targetZ:-27},
    routes:[route('s-road',['지방 언덕 S자 길','Adipose S road'],[[1444,106],[1330,116],[1244,136],[1270,171],[1324,200],[1336,226],[1298,254],[1180,278],[1053,296],[963,317],[969,343],[1086,378],[1210,414],[1230,443],[1158,470],[1000,499],[811,535],[725,574],[806,646],[884,725],[873,821],[801,925]])],trunk:[],
    organs:{liver:organ([136,387],170),pancreas:organ([1497,470],208)},
    landmarks:[landmark('fat',[1114,356],[77,61],8),landmark('fat',[923,566],[114,84],8),landmark('macrophage',[1372,442],[63,57])],
    occluders:[mask('left-fat-hill',[504,696],[[0,397],[203,393],[360,442],[493,475],[590,569],[651,702],[580,836],[387,941],[0,941]]),mask('right-fat-dais',[1424,631],[[1253,620],[1356,595],[1520,607],[1672,634],[1672,941],[1159,941],[1110,812],[1186,709]])],
  },
  sinusoid:{
    topology:'radial',camera:{height:21,fov:45,targetZ:-29},
    routes:[route('portal-left',['좌측 수로','Left inlet'],[[167,129],[215,213],[309,358],[423,500],[567,628],[727,703],[837,735]]),route('portal-top',['중앙 수로','Middle inlet'],[[841,97],[839,220],[839,351],[839,499],[837,626],[837,735]]),route('portal-right',['우측 수로','Right inlet'],[[1517,124],[1452,227],[1349,369],[1232,505],[1080,631],[926,704],[837,735]])],trunk:[],
    organs:{liver:organ([608,355],182),pancreas:organ([993,403],212)},
    landmarks:[landmark('fibrosis',[490,503],[121,37]),landmark('fibrosis',[1140,489],[124,34]),landmark('bridge',[812,237],[61,16]),landmark('bridge',[360,458],[87,24])],
    occluders:[mask('left-hepatocytes',[286,846],[[0,728],[154,675],[307,654],[430,716],[529,825],[560,941],[0,941]]),mask('central-well-rim',[837,826],[[556,734],[617,778],[760,818],[942,803],[1054,751],[1075,792],[1005,850],[916,874],[699,870],[599,822]]),mask('right-hepatocyte-dais',[1492,661],[[1265,722],[1379,642],[1507,622],[1672,650],[1672,941],[1210,941]])],
  },
  carotid:{
    topology:'inverse-Y',camera:{height:17,fov:47,targetZ:-24},
    title:['분기부의 방어선','At the arterial fork'],subtitle:['먼 분기부에서 전경까지 이어지는 한 길','One road from the distant fork to the foreground'],
    briefing:['먼 분기부의 두 혈관에서 적이 내려와요. 플라크를 쏘고 중앙 광장 앞의 길을 지켜가요.','Enemies descend from the distant fork. Clear its plaque and defend the road in front of the central plaza.'],
    routes:[route('left',['좌측 원경 분지','Distant left branch'],[[501,91],[564,120],[660,160],[741,219],[801,278],[856,339],[902,373]]),route('right',['우측 원경 분지','Distant right branch'],[[1359,67],[1306,102],[1177,146],[1103,197],[1029,263],[965,332],[902,373]])],
    trunk:[[902,373],[896,441],[887,511],[866,605],[846,718],[826,823],[810,925]].map(point),
    organs:{liver:organ([1520,399],191),pancreas:organ([200,470],208)},
    landmarks:[landmark('plaque',[904,296],[155,134],14)],
    occluders:[mask('left-platform',[218,645],[[0,603],[176,591],[326,616],[432,666],[453,738],[409,855],[370,941],[0,941]]),mask('right-vessel-rim',[1220,799],[[1080,487],[1120,503],[1133,571],[1216,679],[1382,746],[1672,821],[1672,941],[1190,941],[1112,744],[1052,615]])],
  },
  stomach:{
    topology:'diagonal',camera:{height:23,fov:43,targetZ:-26},
    title:['위산 호수를 건너','Across the acid lake'],subtitle:['왼쪽 벽길에서 사선 징검다리로','From the wall path to diagonal stepping stones'],
    briefing:['유문 게이트를 지난 적이 왼쪽 벽을 따라 내려와 징검다리를 건너요. 호수의 섬에 선 간 가디언과 함께 전경을 지켜가요.','Enemies follow the left wall from the pyloric gate and cross the stepping stones. Defend the foreground with the guardian on the lake island.'],
    routes:[route('stones',['위산 호수 징검다리','Acid lake stepping stones'],[[223,141],[286,173],[222,207],[154,259],[128,300],[207,340],[306,371],[418,421],[536,463],[657,512],[775,568],[874,649],[964,755],[988,844],[994,925]])],trunk:[],
    organs:{liver:organ([1240,395],206),pancreas:organ([1497,469],219)},
    landmarks:[[306,373,126,28],[429,422,140,34],[541,467,159,45],[665,518,177,54],[781,574,200,65],[887,658,241,91],[969,768,278,110]].map(([x,y,w,h])=>landmark('stone',[x,y],[w,h])),
    occluders:[mask('left-gastric-fold',[451,841],[[0,497],[89,534],[176,638],[196,727],[335,712],[491,760],[632,790],[673,941],[0,941]]),mask('right-island',[1480,672],[[1267,648],[1423,608],[1569,639],[1672,665],[1672,941],[1178,941],[1181,769]])],
  },
  glomerulus:{
    topology:'switchback',camera:{height:25,fov:43,targetZ:-28},
    title:['요세관 스위치백','The tubule switchbacks'],subtitle:['세 단 테라스를 지그재그로 내려와요','Three stepped terraces, two hairpins'],
    briefing:['보먼주머니에서 나온 적이 위 테라스를 가로지른 뒤 헤어핀을 두 번 돌아 전경으로 내려와요. 가운데 헤어핀 안쪽 결정 바위에 선 간 가디언과 오른쪽 단상의 췌장 포탑이 함께 막아요.','Invaders leave the Bowman capsule, cross the upper terrace and take two hairpins down to the foreground. The guardian stands on the crystal shelf inside the middle hairpin, with the turret on the right dais.'],
    routes:[route('tubule',['요세관 내리막','Tubular descent'],[[335,160],[435,224],[619,231],[819,231],[1010,221],[1161,226],[1292,255],[1376,297],[1361,351],[1252,385],[1080,381],[900,391],[719,391],[540,412],[390,424],[312,440],[277,463],[300,490],[382,507],[501,543],[671,553],[843,557],[989,567],[1092,594],[1160,637],[937,765],[859,803],[771,822]])],trunk:[],
    organs:{liver:organ([1520,521],186),pancreas:organ([168,413],213)},
    landmarks:[landmark('crystal',[1155,227],[96,84],10),landmark('crystal',[719,392],[92,78],8)],
    occluders:[mask('left-bank',[150,780],[[0,640],[120,610],[250,662],[300,760],[248,880],[120,941],[0,941]]),mask('right-dais',[1450,638],[[1290,620],[1400,570],[1560,575],[1672,620],[1672,941],[1240,941]])],
  },
  villi:{
    topology:'blender-s',camera:{height:20,fov:45,targetZ:-27},
    title:['융모 계곡','The villi valley'],subtitle:['흡수의 최전선을 지나는 한 줄기 길','One road through the absorptive frontier'],
    briefing:['소장 융모 사이로 난 길을 따라 적이 내려와요. Blender에서 지형과 길을 함께 지어, 그림 위의 길과 몬스터가 걷는 길이 정확히 같아요.','Invaders descend the single road carved between the villi. Terrain and route were built together in Blender, so the painted road and the walked path are identical.'],
    routes:[route('villi-road',['융모 계곡 길','Villi valley road'],[[134,160],[261,172],[388,183],[515,193],[643,202],[771,210],[897,221],[1024,234],[1147,256],[1264,284],[1367,327],[1371,399],[1277,444],[1164,478],[1045,506],[923,528],[801,551],[684,580],[582,623],[518,680],[529,750],[615,805],[700,859],[786,913]])],trunk:[],
    organs:{liver:organ([152,454],196),pancreas:organ([1497,302],208)},
    landmarks:[landmark('fat',[1040,300],[104,86],9),landmark('fat',[660,592],[96,80],8)],
    occluders:[mask('left-villi',[120,700],[[0,520],[150,505],[236,560],[250,700],[196,860],[92,941],[0,941]]),mask('right-villi',[1440,620],[[1200,600],[1330,560],[1500,566],[1672,600],[1672,941],[1180,941]])],
  },
  islet:{
    beta:true,topology:'parallel-3',camera:{height:24,fov:44,targetZ:-28},
    title:['세 갈래의 섬','Three roads through the islets'],subtitle:['합류하지 않는 세 방어선','Three independent defenses'],
    briefing:['좌우 길과 함께 중앙 섬에서도 적이 내려와요. 보스는 중앙 섬 길로 옵니다. 간 가디언과 췌장 포탑이 세 방어선을 함께 지켜요.','Enemies descend the left and right roads and also from the core island; the boss always takes the island road. The guardian and turret cover all three.'],
    bossRoute:'islet-core',
    routes:[route('islet-left',['왼쪽 섬길','Left island road'],[[456,89],[403,111],[408,144],[420,170],[374,206],[294,236],[246,272],[252,311],[310,350],[281,383],[208,433],[197,484],[243,538],[310,600],[340,673],[331,752],[350,829],[429,922]]),route('islet-right',['오른쪽 섬길','Right island road'],[[1243,92],[1315,124],[1328,157],[1290,184],[1310,222],[1393,260],[1441,310],[1437,360],[1391,398],[1443,440],[1497,481],[1483,530],[1411,576],[1368,638],[1357,708],[1319,783],[1260,848],[1200,922]]),route('islet-core',['중앙 섬 길','Core island road'],[[868,578],[840,622],[812,668],[780,716],[744,766],[706,818],[668,872],[634,922]])],trunk:[],
    organs:{liver:organ([472,494],202),pancreas:organ([1241,502],196)},
    landmarks:[landmark('bridge',[1207,403],[139,21]),landmark('bridge',[450,356],[126,25]),landmark('bridge',[478,613],[131,38])],
    occluders:[mask('central-island',[850,355],[[540,373],[613,294],[778,247],[962,270],[1112,348],[1186,442],[1107,517],[942,571],[709,553],[576,481]]),mask('left-island',[219,575],[[51,501],[111,470],[178,491],[202,552],[246,585],[207,628],[92,632]]),mask('right-island',[1505,705],[[1475,542],[1553,519],[1645,549],[1672,595],[1672,733],[1470,721],[1411,661]])],
  },
};
export function withPlate(base){
  const layout=PLATES[base.key];
  return {...base,title:base.title||base.names,subtitle:base.subtitle||['그림 속 길을 따라 방어해요','Defend the roads through the plate'],briefing:base.briefing||['다가오는 적을 막고 장기와 함께 방어해요.','Stop the invaders with your organ allies.'],fact:base.fact||['몸속 구조를 바탕으로 만든 게임 공간이에요.','A game environment inspired by structures inside the body.'],...layout,actors:{at:point(ACTORS[base.key]),height:.15},ready:true,plate:`../assets/maps/map_${base.key}.jpg`,legacy:base};
}
