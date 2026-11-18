// One locale for menus, character data, canvas captions and quiz selection.
export const LANG = typeof location !== 'undefined' && new URLSearchParams(location.search).get('lang') === 'en' ? 'en' : 'ko';
export const EN = LANG === 'en';
export const t = (ko, en) => EN ? en : ko;
export function languageURL(lang, path = location.pathname) {
  const url = new URL(path, location.href); url.search = location.search; url.searchParams.set('lang', lang); return url.href;
}
export function languageLinks() {
  document.documentElement.lang = LANG;
  document.querySelectorAll('[data-lang]').forEach(a => { a.href = languageURL(a.dataset.lang); a.setAttribute('aria-current', a.dataset.lang === LANG ? 'true' : 'false'); });
}
export const CHAR_EN = {
  heart: ['Heart', 'Rushdown boxer', 'Close in without projectiles and land a four-hit rush.',
    ['Heartbeat Rush','Leaping Knee','Systolic Uppercut','Weaving Step','Breakthrough','Defibrillator Shock','Cardiac Overdrive'],
    ['Rush forward with three punches.','Leap forward and launch with a knee.','Intercept jumping opponents.','Slip under projectiles.','Cross the gap in a single dash.','Release an electric shock around you.','Super move.']],
  kidney: ['Kidney','Defensive zoner','Keep opponents out with water shots and reflect their projectiles.',
    ['Water Shot','Rapid Surf','Fountain','Filtration Shield','Kidney Stone','Retreat Kick','Great Flood'],
    ['Fire a straight projectile.','Ride a wave forward.','Launch with a rising water column.','Reflect projectiles and push back armored foes.','Lob a stone. Block standing.','Kick while retreating.','Super move.']],
  liver: ['Liver','Heavy grappler','Move slowly, throw at close range and gradually recover health.',
    ['Detox Slam','Headlong Charge','Heavy Lift','Regenerative Breath','Liver Clap','Ground Slam','Total Detox'],
    ['Grab through a guard and slam.','Charge with one-hit armor.','Lift with one-hit armor.','Pause to recover health.','Leave the opponent stunned.','Send a ground shockwave. Block crouching.','Super move. Rush in and grab.']],
  pancreas: ['Pancreas','Long-reach technician','Strike from a distance with a syringe and counter incoming attacks.',
    ['Insulin Thrust','Syringe Dive','Rising Slash','Counter Stance','Insulin Injection','Floor Reaper','Insulin Barrage'],
    ['Thrust twice at long range.','Leap and strike down. Block standing.','An anti-air slash with vertical reach.','Parry and counter; also deflect projectiles.','Drain the opponent’s super meter.','Sweep at long range. Block crouching.','Super move.']],
  soda: ['Soda','Mobile trickster','Slip behind opponents, then dive in from the air.',
    ['Soda Spray','Fizz Rocket','Shake & Burst','Bubble Slip','Bottle-cap Bomb','Dive Kick','Soda Geyser'],
    ['Spray multiple hits at close range.','Rocket forward just above the ground.','Burst around your body with brief invulnerability.','Slide through to the other side.','Throw a cap diagonally down while airborne.','Dive diagonally from the air.','Super move.']],
  fries: ['Fries','Trap slider','Lay oil traps and slide in along the ground.',
    ['Fry Darts','Oil Slide','Potato Spear','Fry Fan','Oil Puddle','Oil Ignition','Oil Tsunami'],
    ['Throw three fries in a fan.','Slide low and knock down. Block crouching.','Thrust upward to intercept jumps.','Sweep away incoming projectiles.','Leave a slippery puddle for three seconds.','Ignite the ground; a puddle becomes a pillar of flame.','Super move.']],
  ramen: ['Ramen','Mid-range whip fighter','Pull enemies in with noodles and control space with steam.',
    ['Noodle Whip','Chopstick Flurry','Rising Chopsticks','Steam Cloud','Noodle Reel','Broth Wave','Noodle Vortex'],
    ['Pull from afar; crouch beneath the whip.','Land a series of fast kicks.','Leap up with two rising strikes.','Leave a lingering, multi-hit steam cloud.','Reel in and slam a distant opponent.','Send a wave along the floor. Block crouching.','Super move.']],
  burger: ['Big Burger','Superheavy bruiser','Roll through attacks and crush opponents from above.',
    ['Double Hammer','Body Press','Bun Uppercut','Roar','Cheese Grab','Whole-body Roll','King-size Crush'],
    ['Slam both hands down for a knockdown.','Leap and crush from above. Block standing.','Launch with a rising bun.','Push opponents away and erase projectiles.','Grab and slam from longer range.','Roll with two-hit armor.','Super move.']],
  muscle: ['Muscle','Power wrestler','Power up with a roar and grab opponents out of the air.',
    ['Lariat','Dropkick','Power Bomb','Pump Up','Dumbbell Toss','Shoulder Tackle','Giant Swing'],
    ['Rush with an armored lariat.','Fly in feet first and launch the opponent.','Catch even an airborne opponent and slam.','Boost all attacks for seven seconds.','Lob a dumbbell. Block standing.','Charge with two-hit armor.','Super move. Rush in, grab and spin.']],
  soju: ['Soju','Drunken trickster','Sway past attacks; intoxicated opponents have reversed controls.',
    ['Fire Breath','Staggering Rush','Bottle Spin','Drunken Sway','Glass Toss','Feign Collapse','Drunken Rampage'],
    ['Breathe slow blue flames that intoxicate.','Stagger forward while evading projectiles.','Swing a bottle overhead.','Parry and retaliate with a hiccup.','Lob an intoxicating glass.','Lie down, then kick upward.','Super move.']],
  smoke: ['Smoke','Smoke ninja','Vanish into smoke and wear opponents down with burning embers.',
    ['Ember Star','Smoke Warp','Rising Flame Kick','Smokescreen','Ash Sweep','Nicotine Snare','Smoke Storm'],
    ['A fast projectile that poisons on hit.','Vanish and reappear behind the opponent.','Leap with an anti-air kick.','Leave damaging smoke in front of you.','Send ash along the ground. Block crouching.','Grab and inflict lasting poison.','Super move.']],
  visceral: ['Visceral Fat','Final boss','Resist damage with a bulky body, then squeeze foes to steal health.',
    ['Fat Glob','Belly Bump','Jiggling Uppercut','Quaking Leap','Crushing Embrace','Lard Slick','Full-body Compression'],
    ['Lob a glob that leaves oil on landing.','Bump with armor and heavy knockback.','Launch with a rising belly.','Leap and shake the ground on landing.','Grab, squeeze and drain health.','Leave a slick that slows opponents.','Super move. Rush in and squeeze.']],
};
export function localizeCharacters(chars, types, arrows) {
  if (!EN) return;
  Object.assign(types,{sugar:'Sugar',fat:'Fat',salt:'Salt',overeat:'Overeating',alcohol:'Alcohol',smoke:'Tobacco',visceral:'Visceral fat'});
  arrows.air = 'Air ↓';
  for (const [id, c] of Object.entries(chars)) {
    const [name,style,trait,names,notes] = CHAR_EN[id]; Object.assign(c,{name,style,trait});
    c.commands.forEach((cmd,i) => { cmd.name=names[i];cmd.note=notes[i];cmd.cmd=cmd.key==='super'?'Punch + Kick':`${arrows[cmd.motion]} + ${cmd.button==='p'?'Punch':'Kick'}`; });
  }
}
export function localizePage() {
  languageLinks();
  if (!EN) return;
  document.title = 'Metabolic Fighter';
  const pairs = [
    ['메타볼릭','METABOLIC'],['파이터','FIGHTER'],
    ['몸을 지키는 장기와 몸을 노리는 정크 푸드가 맞붙어요.','Your organs take on the junk-food invasion.'],
    ['1P 아케이드','1P Arcade'],['4연전, 장기나 빌런으로','Four fights. Pick any fighter.'],['2P 대전','2P Versus'],['누구든 골라서 3판 2선승','Local battle. Best of three.'],
    ['1P 돌파 작전','1P Mission'],['잔몹을 돌파하고 보스까지','Run, shoot and defeat 7 bosses.'],
    ['위아래로 고르고 주먹 버튼으로 시작해요.','Choose with ↑ / ↓ and press Punch or Enter.'],
    ['이동, 점프, 앉기','Move / Jump / Crouch'],['주먹','Punch'],['킥','Kick'],['필살기','Specials'],['고유 기술','Unique moves'],['기술표','Move list'],['연속기','Combos'],['초필살기','Super'],['가드, 잡기','Guard / Throw'],
    ['↓ → 또는 ↓ ← 뒤에 주먹이나 킥을 눌러요 (모두 같아요)','↓ → or ↓ ←, then Punch or Kick (all fighters)'],
    ['캐릭터마다 방향 두 번짜리가 하나씩 더 있어요 (심장은 → →)','Each fighter has a unique two-direction input (Heart: → →).'],
    ['캐릭터마다 기술이 달라서 고르는 화면에서 보여 줘요','See each fighter’s move list on the selection screen.'],
    ['주먹 연타, 맞힌 뒤 킥이나 필살기로 이어요','Chain punches, then cancel a hit into a kick or special.'],
    ['게이지가 가득 차면 주먹과 킥을 함께 눌러요','When your meter is full, press Punch + Kick.'],
    ['뒤로 당기면 가드, 붙어서 → + 주먹은 잡기','Hold back to guard. At close range: → + Punch to throw.'],
    ['조이스틱(게임패드)을 꽂으면 첫 번째가 1P, 두 번째가 2P예요.','Gamepads: the first controls 1P; the second controls 2P.'],
    ['캐릭터를 골라요','Choose your fighter'],['포션 퀴즈','Potion Quiz'],
    ['주먹 버튼을 누르면 처음으로 돌아가요.','Press Punch or Enter to return to the title.'],
    ['시제품이에요. 기술 수치와 균형은 계속 다듬고 있어요.','Prototype. Moves and balance are still being tuned.'],
  ];
  const dict = new Map(pairs), walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  while(walker.nextNode()) { const n=walker.currentNode,key=n.textContent.trim();if(dict.has(key)) n.textContent=n.textContent.replace(key,dict.get(key)); }
}
