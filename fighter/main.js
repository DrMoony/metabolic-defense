// 장면 흐름: 처음 화면 → 캐릭터 고르기 → 대진 → 퀴즈 → 대전 → (퀴즈 → 대전)… → 결과.
import { CHARS, ORGANS, VILLAINS, BOSS, TYPES, ARROWS } from './data.js';
import { readPlayer, Controller, NEUTRAL } from './input.js';
import { Sim } from './sim.js';
import { CpuBrain } from './ai.js';
import { Renderer, drawPortrait } from './render.js';
import { sfx } from './sfx.js';
import { music } from './snd/music.js';
import { QuizBank } from './quiz.js';

const params = new URLSearchParams(location.search);
const $ = id => document.getElementById(id);
const stage = $('stage'), renderer = new Renderer($('game'), { debug: params.has('debug') });
const SCENES = ['title', 'select', 'vs', 'quiz', 'result'];
// 아케이드 단계별 CPU 실력(0 쉬움~1 어려움)과 주먹 세기. 첫 판은 기술을 익히는 판이라 덜 막고 덜 아프게 때린다.
const STEP = 1000 / 60, WINS_NEEDED = 2, CPU_LEVELS = [.04, .14, .26, .38], CPU_POWER = [.75, .85, .95, 1];
const READ_FRAMES = 120, ANSWER_FRAMES = 720, DIRS = ['up', 'left', 'right', 'down'];
// 받침이 있으면 앞, 없으면 뒤 조사를 붙인다. josa('췌장', '은', '는') → '췌장은'
const josa = (word, withFinal, without) => word + ((word.charCodeAt(word.length - 1) - 0xac00) % 28 ? withFinal : without);
const pick = list => list[Math.floor(Math.random() * list.length)];
const shuffle = list => { const out = [...list]; for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; } return out; };

// 문제은행: ?bank=이름&lang=ko → ../assets/<이름>_<언어>.json. 못 읽으면 퀴즈 없이 대전만 한다.
const bank = new QuizBank();
let bankReady = false;
const clean = (value, fallback) => (value || fallback).replace(/[^\w-]/g, '') || fallback;
bank.load(clean(params.get('bank'), 'quiz_dm_empa'), clean(params.get('lang'), 'ko'))
  .then(() => { bankReady = true; })
  .catch(error => console.warn('문제은행을 읽지 못해 퀴즈 없이 진행해요.', error));

const fit = () => { stage.style.transform = `translate(-50%,-50%) scale(${Math.min(innerWidth / 1280, innerHeight / 720)})`; };
addEventListener('resize', () => { fit(); renderer.resize(); }); fit();

const pads = [0, 1].map(player => new Controller(() => readPlayer(player)));
const game = { scene: '', t: 0, mode: 'arcade', picks: ['heart', 'liver'], wins: [0, 0], round: 1, stage: 0, ladder: [], score: 0, quizRight: 0, quizCount: 0, potion: [false, false] };
const DBG = window.DBG = { cpu: [false, false] };
let sim = null, cpu = [null, null], overTick = 0, idle = 0, enter = false;
let menuIndex = 0, sel = null, quiz = null;

const versus = () => game.mode === 'versus';
const players = () => (versus() ? [0, 1] : [0]);
const opponent = () => (versus() ? game.picks[1] : game.ladder[game.stage]);
// 어디서 싸울지: 상대가 장기면 그 장기의 홈, 정크 푸드가 쳐들어오면 내 홈, 보스전은 야식 골목.
const arenaOf = (mine, foe) => params.get('stage') || (ORGANS.includes(foe) ? foe : foe !== BOSS && ORGANS.includes(mine) ? mine : 'alley');
const cpuController = (level, side) => { const brain = new CpuBrain(level); return new Controller(() => brain.think(sim, side)); };

function go(name) {
  for (const id of SCENES) $(id).hidden = id !== name;
  $('proto').hidden = name !== 'title';
  game.scene = name; game.t = 0; idle = 0;
  music.hot(false); $('sound').classList.toggle('on', name === 'title');
  resetStage();
  scenes[name].enter?.();
}

// 대전 이벤트를 소리로 옮긴다. 두 선수 한가운데를 기준으로 왼쪽·오른쪽에서 들리게 한다.
function play(event) {
  const mid = (sim.f[0].x + sim.f[1].x) / 2, x = event.x ?? sim.f[event.side]?.x ?? mid;
  sfx.play(event, Math.max(-.7, Math.min(.7, (x - mid) / 460)), event.type === 'hit' ? sim.f[1 - event.side]?.char.id : null);
  if (event.type === 'super') music.duck();
  if (event.type === 'timeup' || (event.type === 'hit' && event.ko)) music.stop(.4);
}
function stepSim(inputs, loud) {
  sim.step(inputs);
  for (const event of sim.events) { renderer.onEvent(event); if (loud) play(event); }
}
function resetStage() { renderer.reset(); }

// 처음 화면 뒤에서 도는 CPU 대 CPU 시범 경기.
function startDemo() {
  const organ = pick(ORGANS), food = pick([...VILLAINS, BOSS]);
  sim = new Sim(CHARS[organ], CHARS[food], { seconds: 40 }); sim.arena = arenaOf(organ, food);
  sim.live = true; cpu = [cpuController(.6, 0), cpuController(.6, 1)]; resetStage();
}

function paintMenu() { [...$('menu').children].forEach((item, index) => item.classList.toggle('on', index === menuIndex)); }
function chooseMode(index) { sfx.confirm(); game.mode = index ? 'versus' : 'arcade'; go('select'); }

// 기술표: 방향(세로) × 주먹·킥(가로). 위 두 줄은 모두가 같은 방향이고, 셋째 줄만 캐릭터 고유 방향이다.
function cmdGrid(char) {
  const rows = [...new Set(char.commands.filter(c => c.motion).map(c => c.motion))], of = (motion, button) => char.commands.find(c => c.motion === motion && c.button === button)?.name || '';
  const sup = char.commands.find(c => c.key === 'super');
  return `<table class="cmds"><thead><tr><th></th><th>주먹</th><th>킥</th></tr></thead><tbody>${rows.map((m, i) => `<tr${i === 2 ? ' class="own"' : ''}><th>${ARROWS[m]}</th><td>${of(m, 'p')}</td><td>${of(m, 'k')}</td></tr>`).join('')}<tr class="sup"><th>${sup.cmd}</th><td colspan="2">${sup.name}</td></tr></tbody></table>`;
}
// 고르기 화면: 가운데 얼굴 칸 격자(윗줄 장기, 아랫줄 빌런), 양옆 판에 1P·2P가 올려 둔 캐릭터의 설명과 기술표.
const ROWS = [ORGANS, [...VILLAINS, BOSS]], ROSTER = ROWS.flat();
const rowOf = index => { let n = index; for (let r = 0; r < ROWS.length; r++) { if (n < ROWS[r].length) return [r, n]; n -= ROWS[r].length; } return [0, 0]; };
const indexOf = (r, c) => ROWS.slice(0, r).reduce((n, row) => n + row.length, 0) + Math.min(c, ROWS[r].length - 1);
const strongAgainst = type => [...VILLAINS, BOSS].map(id => CHARS[id]).find(char => char.type === type);
const weakTo = type => ORGANS.map(id => CHARS[id]).find(char => char.strong === type);
function matchup(char) {
  if (char.kind === 'organ') return `${TYPES[char.strong]}에 강해요 (${strongAgainst(char.strong).name})`;
  const organ = weakTo(char.type);
  return `${TYPES[char.type]} 덩어리라 ${josa(organ.name, '을', '를')} 조심해요`;
}
function buildCards() {
  $('cards').style.setProperty('--cols', Math.max(...ROWS.map(row => row.length)));
  $('cards').replaceChildren(...ROWS.flatMap((row, r) => [
    Object.assign(document.createElement('b'), { className: 'rowname', textContent: r ? '빌런' : '장기' }),
    ...row.map((id, c) => {
      const char = CHARS[id], tile = document.createElement('div'), index = indexOf(r, c);
      tile.className = 'card'; tile.style.setProperty('--tint', char.color);
      tile.innerHTML = `<div class="tags"><i class="t0">1P</i><i class="t1">2P</i></div><canvas width="200" height="220"></canvas><strong>${char.name}</strong>`;
      drawPortrait(tile.querySelector('canvas'), char);
      tile.addEventListener('click', () => { if (game.scene === 'select' && !versus() && !sel.ready[0]) { sel.cursor[0] = index; confirmPick(0); } });
      return tile;
    }),
  ]));
}
// 옆 판: 커서가 올라간 캐릭터가 바뀔 때만 다시 그린다.
function paintPane(p) {
  const pane = $(`pane${p}`), on = players().includes(p);
  pane.classList.toggle('off', !on); pane.classList.toggle('ready', on && sel.ready[p]);
  if (!on) {
    // 아케이드: 1P가 장기에 있으면 정크 푸드 셋, 빌런에 있으면 장기 셋과 싸운다고 미리 보여 준다.
    const villain = CHARS[ROSTER[sel.cursor[0]]].kind !== 'organ';
    pane.innerHTML = p ? `<i class="who">CPU</i><strong class="vs3">${villain ? '장기 3연전' : '정크 푸드 3연전'}</strong><p>${villain ? '몸속 장기 셋을 차례로 쓰러뜨려요. 마지막은 심장이에요.' : '정크 푸드 둘을 이기면 대왕버거가 나와요.'}</p>` : '';
    pane.dataset.id = ''; return;
  }
  const id = ROSTER[sel.cursor[p]];
  if (pane.dataset.id === id) return;
  const char = CHARS[id]; pane.dataset.id = id;
  pane.innerHTML = `<i class="who">${p + 1}P</i><canvas width="240" height="264"></canvas><strong>${char.name}</strong><small>${char.style}</small><p>${char.trait}</p>${cmdGrid(char)}<em>${matchup(char)}</em>`;
  drawPortrait(pane.querySelector('canvas'), char);
}
function paintSelect() {
  [...$('cards').querySelectorAll('.card')].forEach((card, index) => {
    for (const p of [0, 1]) {
      const here = players().includes(p) && sel.cursor[p] === index;
      card.classList.toggle(`c${p}`, here); card.classList.toggle(`r${p}`, here && sel.ready[p]);
    }
  });
  paintPane(0); paintPane(1);
}
function confirmPick(p) { sel.ready[p] = true; sfx.confirm(); paintSelect(); }

function beginMatch() {
  game.picks = [ROSTER[sel.cursor[0]], ROSTER[sel.cursor[1]]];
  Object.assign(game, { wins: [0, 0], round: 1, stage: 0, score: 0, quizRight: 0, quizCount: 0, potion: [false, false] });
  // 장기를 고르면 정크 푸드 셋, 빌런을 고르면 장기 셋과 싸운다(마지막은 심장, 심장이 나 자신이면 간).
  const villain = CHARS[game.picks[0]].kind !== 'organ', last = 'heart';
  game.ladder = villain ? [...shuffle(ORGANS.filter(id => id !== last)).slice(0, 2), last] : [...shuffle(VILLAINS).slice(0, 2), BOSS];
  go('vs');
}
const beforeFight = () => go(bankReady ? 'quiz' : 'fight');

function paintQuiz() {
  const list = $('choices'), reveal = quiz.phase === 'reveal';
  list.classList.toggle('wait', quiz.phase === 'read');
  [...list.children].forEach((item, index) => {
    item.querySelector('span').textContent = quiz.item.choices[index];
    const who = players().filter(p => quiz.picked[p] === index).map(p => `${p + 1}P`).join(' ');
    item.querySelector('i').textContent = versus() ? who : '';
    item.classList.toggle('correct', reveal && index === quiz.item.correct);
    item.classList.toggle('wrong', quiz.picked.includes(index) && index !== quiz.item.correct);
  });
  $('quizQ').textContent = quiz.item.q;
  $('quizRule').textContent = versus() ? '먼저 맞힌 쪽이 포션을 가져가요. 틀리면 답할 기회가 없어져요.' : '맞히면 체력 회복 포션을 들고 싸워요.';
  let status = quiz.phase === 'read' ? '문제를 먼저 읽어요. 곧 보기가 열려요.' : '스틱 방향으로 답을 골라요.';
  if (reveal) {
    if (quiz.winner >= 0) status = versus() ? `${quiz.winner + 1}P가 먼저 맞혀서 포션을 얻었어요.` : '정답이에요. 포션을 얻었어요.';
    else status = quiz.picked.some(choice => choice >= 0) ? '아쉽게 틀렸어요. 이번에는 포션 없이 싸워요.' : '시간이 다 됐어요. 이번에는 포션 없이 싸워요.';
  }
  $('quizStatus').textContent = status;
  $('quizExp').textContent = reveal ? quiz.item.exp : '';
}
function revealQuiz() { quiz.phase = 'reveal'; quiz.t = 0; music.hot(false); $('quizBar').style.transform = 'scaleX(0)'; paintQuiz(); }
function answer(p, choice) {
  if (game.scene !== 'quiz' || quiz.phase !== 'answer' || quiz.locked[p]) return;
  quiz.locked[p] = true; quiz.picked[p] = choice;
  if (choice === quiz.item.correct) {
    quiz.winner = p; game.potion[p] = true; game.quizRight++;
    if (!versus()) game.score += 500;
    sfx.correct(); revealQuiz();
  } else { sfx.wrong(); paintQuiz(); }
}

function fightBanner() {
  const t = game.t;
  if (sim.over) {
    const age = t - overTick, winner = sim.over.winner;
    const sub = sim.overFrames > 60 ? (winner < 0 ? '무승부' : `${sim.f[winner].char.name} 승리`) : '';
    return { text: sim.over.reason === 'ko' ? 'K.O.' : 'TIME UP', sub, age };
  }
  if (t < 70) return { text: versus() ? `ROUND ${game.round}` : `STAGE ${game.stage + 1}`, sub: `${sim.f[0].char.name} 대 ${sim.f[1].char.name}`, age: t };
  if (t < 118) return { text: 'FIGHT!', age: t - 70 };
  return null;
}

function finishRound() {
  const winner = sim.over.winner;
  if (versus()) {
    if (winner >= 0) game.wins[winner]++;
    if (game.wins.some(count => count >= WINS_NEEDED) || game.round >= 5) return go('result');
    game.round++; beforeFight();
  } else {
    if (winner !== 0) return go('result');
    const me = sim.f[0];
    game.score += Math.round(1000 + 1000 * me.hp / me.char.hp + Math.ceil(sim.timer / 60) * 20);
    game.stage++;
    go(game.stage >= game.ladder.length ? 'result' : 'vs');
  }
}

const scenes = {
  title: {
    enter() { menuIndex = 0; paintMenu(); startDemo(); music.play('title'); },
    tick(inp) {
      stepSim(cpu.map(controller => controller.poll()), false);
      if (sim.over && sim.overFrames > 150) startDemo();
      for (const i of inp) {
        if (i.dir === 'up' || i.dir === 'down') { menuIndex = 1 - menuIndex; sfx.move(); paintMenu(); }
        if (i.pp) return chooseMode(menuIndex);
      }
    },
  },

  select: {
    enter() {
      sel = { cursor: [0, 2], ready: [false, false], done: 0 };
      $('selectTitle').textContent = versus() ? '각자 캐릭터를 골라요' : '캐릭터를 골라요';
      $('selectHint').textContent = '상하좌우로 고르고 주먹 버튼으로 정해요. 킥 버튼은 취소예요.';
      for (const p of [0, 1]) $(`pane${p}`).dataset.id = '';
      paintSelect(); music.play('select');
    },
    tick(inp) {
      if (idle > 60 * 40) return go('title');
      if (players().every(p => sel.ready[p])) { if (++sel.done > 40) beginMatch(); return; }
      for (const p of players()) {
        const i = inp[p];
        if (sel.ready[p]) { if (i.pk) { sel.ready[p] = false; paintSelect(); } continue; }
        if (i.dir) {
          // 좌우는 줄 안에서 돌고, 위아래는 다른 줄의 같은 칸(없으면 끝 칸)으로 간다.
          let [r, c] = rowOf(sel.cursor[p]);
          if (i.dir === 'left' || i.dir === 'right') c = (c + (i.dir === 'left' ? -1 : 1) + ROWS[r].length) % ROWS[r].length;
          else r = (r + (i.dir === 'up' ? -1 : 1) + ROWS.length) % ROWS.length;
          sel.cursor[p] = indexOf(r, c); sfx.move(); paintSelect();
        }
        if (i.pp) confirmPick(p);
        else if (i.pk && !sel.ready.some(Boolean)) return go('title');
      }
    },
  },

  vs: {
    enter() {
      const a = CHARS[game.picks[0]], b = CHARS[opponent()];
      drawPortrait($('vsA'), a); drawPortrait($('vsB'), b);
      $('vsNameA').textContent = a.name; $('vsNameB').textContent = b.name;
      $('vsTagA').textContent = '1P'; $('vsTagB').textContent = versus() ? '2P' : b.kind === 'organ' ? b.style : `${TYPES[b.type]} 속성`;
      $('vsLabel').textContent = versus() ? '2P 대전' : `STAGE ${game.stage + 1} / ${game.ladder.length}`;
      $('vsNote').textContent = a.strong && a.strong === b.type ? `${josa(a.name, '은', '는')} ${TYPES[b.type]}에 강해서 주는 피해가 20% 늘어요.`
        : b.strong && b.strong === a.type ? `${josa(b.name, '은', '는')} ${TYPES[a.type]}에 강해서 받는 피해가 20% 늘어요. 조심해요.` : '';
      music.play('vs');
    },
    tick(inp) { if (game.t > 150 || (game.t > 40 && inp.some(i => i.pp))) beforeFight(); },
  },

  quiz: {
    enter() {
      quiz = { item: bank.draw(), phase: 'read', t: 0, locked: [false, false], picked: [-1, -1], winner: -1 };
      game.potion = [false, false]; game.quizCount++;
      $('quizBar').style.transform = 'scaleX(1)';
      paintQuiz(); music.play('quiz');
    },
    tick(inp) {
      quiz.t++;
      if (quiz.phase === 'read') { if (quiz.t >= READ_FRAMES) { quiz.phase = 'answer'; quiz.t = 0; paintQuiz(); } return; }
      if (quiz.phase === 'reveal') { if (quiz.t > 260 || (quiz.t > 50 && inp.some(i => i.pp))) go('fight'); return; }
      $('quizBar').style.transform = `scaleX(${1 - quiz.t / ANSWER_FRAMES})`;
      music.hot(quiz.t > ANSWER_FRAMES * .6);
      for (const p of players()) { const choice = DIRS.indexOf(inp[p].dir); if (choice >= 0) answer(p, choice); }
      if (quiz.phase === 'answer' && (quiz.t >= ANSWER_FRAMES || players().every(p => quiz.locked[p]))) revealQuiz();
    },
  },

  fight: {
    enter() {
      sim = new Sim(CHARS[game.picks[0]], CHARS[opponent()], { seconds: versus() ? 45 : 60 });
      sim.arena = arenaOf(game.picks[0], opponent());
      sim.f.forEach((f, i) => { f.potion = game.potion[i]; });
      if (!versus()) sim.adv[1] *= CPU_POWER[game.stage] ?? 1;
      cpu = [DBG.cpu[0] ? cpuController(.6, 0) : null, versus() ? (DBG.cpu[1] ? cpuController(.6, 1) : null) : cpuController(CPU_LEVELS[game.stage] ?? .4, 1)];
      overTick = 0; resetStage(); music.stop(.2); sfx.round();
    },
    tick(inp) {
      if (game.t === 70) { sfx.fight(); music.play(sim.arena); }
      if (game.t === 100) sim.live = true;
      // KO 직후에는 잠깐 느리게 보여 준다.
      if (sim.over?.reason === 'ko' && sim.overFrames < 30 && game.t % 2) return;
      const wasOver = !!sim.over;
      stepSim([0, 1].map(i => (cpu[i] ? cpu[i].poll() : sim.live ? inp[i] : NEUTRAL)), true);
      if (sim.over && !wasOver) overTick = game.t;
      // 체력이 얼마 안 남았거나 시간이 15초 아래면 음악이 급해지고, 승부가 나면 이긴 쪽 팡파르가 울린다.
      if (!sim.over) music.hot(sim.live && (sim.timer < 15 * 60 || sim.f.some(f => f.hp < f.char.hp * .3)));
      else if (sim.overFrames === 40 && (versus() ? sim.over.winner >= 0 : sim.over.winner === 0)) music.play('win');
      if (sim.over && sim.overFrames > 170) finishRound();
    },
  },

  result: {
    enter() {
      const stats = [];
      let title, sub, face;
      if (versus()) {
        const [a, b] = game.wins, winner = a > b ? 0 : b > a ? 1 : -1;
        title = winner < 0 ? '무승부예요' : `${winner + 1}P가 이겼어요`;
        sub = `${CHARS[game.picks[0]].name} ${a} : ${b} ${CHARS[game.picks[1]].name}`;
        face = game.picks[Math.max(0, winner)];
        stats.push(['라운드', game.round], ['퀴즈 정답', `${game.quizRight} / ${game.quizCount}`]);
      } else {
        const cleared = game.stage >= game.ladder.length;
        const villain = CHARS[game.picks[0]].kind !== 'organ';
        title = cleared ? (villain ? '장기를 모두 물리쳤어요' : '정크 푸드를 모두 물리쳤어요') : `${CHARS[opponent()].name}에게 졌어요`;
        sub = cleared ? (villain ? `${josa(CHARS[game.picks[0]].name, '이', '가')} 몸을 점령했어요.` : `${josa(CHARS[game.picks[0]].name, '이', '가')} 몸을 지켜 냈어요.`) : '다시 도전해 봐요.';
        face = cleared ? game.picks[0] : opponent();
        stats.push(['점수', game.score.toLocaleString('ko-KR')], ['돌파한 스테이지', `${game.stage} / ${game.ladder.length}`], ['퀴즈 정답', `${game.quizRight} / ${game.quizCount}`]);
      }
      drawPortrait($('resultArt'), CHARS[face], 'win');
      $('resultLabel').textContent = versus() ? 'VERSUS' : game.stage >= game.ladder.length ? 'ALL CLEAR' : 'GAME OVER';
      $('resultTitle').textContent = title; $('resultSub').textContent = sub;
      $('resultStats').innerHTML = stats.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('');
      if (versus() || game.stage >= game.ladder.length) music.play('clear', 'select'); else music.play('lose');
    },
    tick(inp) { if (game.t > 60 * 25 || (game.t > 60 && inp.some(i => i.pp))) go('title'); },
  },
};

function tick() {
  const inp = pads.map(pad => pad.poll());
  if (enter) { if (game.scene !== 'fight') inp[0] = { ...inp[0], pp: true }; enter = false; }
  idle = inp.some(i => i.x || i.y || i.p || i.k) ? 0 : idle + 1;
  game.t++;
  scenes[game.scene].tick(inp);
}

function draw() {
  if (game.scene === 'fight') {
    renderer.draw(sim, {
      bars: true, labels: ['1P', versus() ? '2P' : 'CPU'], wins: game.wins, winsNeeded: versus() ? WINS_NEEDED : 0,
      caption: versus() ? `ROUND ${game.round}` : `STAGE ${game.stage + 1} / ${game.ladder.length}`, banner: fightBanner(),
    });
  } else if (game.scene === 'title') renderer.draw(sim, { dim: .35 });
  else renderer.draw(null, { dim: .3 });
}

let last = performance.now(), acc = 0;
function loop(now) {
  acc += Math.min(100, now - last); last = now;
  let steps = 0;
  while (acc >= STEP && steps < 5 && !DBG.pause) { tick(); acc -= STEP; steps++; if (DBG.watch?.()) DBG.pause = true; }
  if (DBG.pause) renderer.last = performance.now();
  if (steps === 5) acc = 0;
  draw();
  requestAnimationFrame(loop);
}

// 마우스·터치와 Enter 키도 메뉴에서는 주먹 버튼처럼 쓴다.
addEventListener('keydown', event => { if (event.code === 'Enter' && !event.repeat) enter = true; });
// M 키로 소리를 전부 → 효과음만 → 끔 순서로 바꾼다. 처음 화면 말고는 바꿀 때만 잠깐 보여 준다.
let soundTimer = 0;
function paintSound() { $('sound').textContent = `M 키 · ${sfx.label()}`; }
addEventListener('keydown', event => {
  if (event.code !== 'KeyM' || event.repeat) return;
  sfx.cycle(); paintSound(); $('sound').classList.add('on');
  clearTimeout(soundTimer); soundTimer = setTimeout(() => $('sound').classList.toggle('on', game.scene === 'title'), 1800);
});
[...$('menu').children].forEach((item, index) => item.addEventListener('click', () => { if (game.scene === 'title') chooseMode(index); }));
[...$('choices').children].forEach((item, index) => item.addEventListener('click', () => { if (!versus()) answer(0, index); }));
$('result').addEventListener('click', () => { if (game.scene === 'result' && game.t > 60) go('title'); });

// 시험용 손잡이: DBG.cpu=[true,true]로 양쪽을 CPU에 맡기고 DBG.run(프레임 수)으로 빨리 감는다.
Object.assign(DBG, {
  run(frames) { for (let i = 0; i < frames; i++) tick(); return DBG.state(); },
  emit(event) { renderer.onEvent(event); },
  state: () => ({ scene: game.scene, t: game.t, mode: game.mode, round: game.round, stage: game.stage, wins: [...game.wins], score: game.score, potion: [...game.potion], hp: sim ? sim.f.map(f => Math.round(f.hp)) : null, over: sim?.over || null }),
  start(mode, a = 'heart', b = 'liver') { game.mode = mode; sel = { cursor: [ROSTER.indexOf(a), ROSTER.indexOf(b)], ready: [true, true], done: 0 }; beginMatch(); },
  answer, go, game,
});
Object.defineProperty(DBG, 'sim', { get: () => sim });

buildCards(); paintSound();
go('title');
requestAnimationFrame(loop);
