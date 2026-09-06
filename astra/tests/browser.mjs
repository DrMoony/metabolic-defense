// Native Chrome DevTools pipe: no npm packages or build step.
// First run from repository root: python3 -m http.server 8765
// Then: node astra/tests/browser.mjs
import {spawn} from 'node:child_process';
import {mkdir,writeFile,mkdtemp,rm,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const output=fileURLToPath(new URL('./artifacts/',import.meta.url));
// Pipe mode serves a virtual origin over CDP Fetch: no listening socket required.
const pipeAssets=process.env.ASTRA_PIPE_ASSETS==='1';
const repo=fileURLToPath(new URL('../../',import.meta.url));
const url=pipeAssets?'http://astra.test/astra/':'http://localhost:8765/astra/';
if(!pipeAssets){try{const response=await fetch(url);if(!response.ok)throw new Error(`HTTP ${response.status}`);}
catch{throw new Error('Start python3 -m http.server 8765, or use ASTRA_PIPE_ASSETS=1 for socket-free local asset loading.');}}
await mkdir(output,{recursive:true});
const profile=await mkdtemp(path.join(output,'chrome-'));
const chrome=spawn(process.env.ASTRA_CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',[
  '--headless=new','--remote-debugging-pipe','--no-first-run','--no-default-browser-check',`--user-data-dir=${profile}`,'--window-size=1440,810','--autoplay-policy=no-user-gesture-required',
],{stdio:['ignore','ignore','pipe','pipe','pipe']});
let sequence=0,buffer='',stderr='',session;const pending=new Map(),errors=[],samples=[];
chrome.stderr.on('data',data=>stderr+=data);
const rejectPending=error=>{for(const p of pending.values()){clearTimeout(p.timer);p.reject(error);}pending.clear();};
chrome.stdio[3].on('error',rejectPending);chrome.stdio[4].on('error',rejectPending);
chrome.on('error',rejectPending);chrome.on('exit',(code,signal)=>rejectPending(new Error(`Chrome exited (${code??signal}). ${stderr.slice(-1500)}`)));
chrome.stdio[4].on('data',data=>{
  buffer+=data.toString();let end;
  while((end=buffer.indexOf('\0'))>=0){const message=JSON.parse(buffer.slice(0,end));buffer=buffer.slice(end+1);
    if(message.id){const p=pending.get(message.id);if(p){clearTimeout(p.timer);pending.delete(message.id);message.error?p.reject(new Error(message.error.message)):p.resolve(message.result);}}
    if(message.method==='Fetch.requestPaused')serveAsset(message.params,message.sessionId).catch(error=>errors.push(String(error)));
    if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails);
    if(message.method==='Runtime.consoleAPICalled'&&message.params.type==='error')errors.push(message.params.args);
    if(message.method==='Network.loadingFailed'&&!message.params.canceled)errors.push(message.params);
    if(message.method==='Network.responseReceived'&&message.params.response.status>=400)errors.push(message.params.response);
  }
});
function send(method,params={},sessionId=session){return new Promise((resolve,reject)=>{const id=++sequence,timer=setTimeout(()=>{pending.delete(id);reject(new Error(`CDP timeout: ${method}`));},15000);pending.set(id,{resolve,reject,timer});chrome.stdio[3].write(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})})+'\0');});}
async function serveAsset(request,sessionId){
  const asset=new URL(request.request.url),relative=decodeURIComponent(asset.pathname).replace(/^\/+/,'');
  const file=path.resolve(repo,relative.endsWith('/')?relative+'index.html':relative);
  const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.jpg':'image/jpeg','.png':'image/png','.css':'text/css','.ico':'image/x-icon'};
  if(!file.startsWith(repo))throw new Error('Invalid asset path');
  try{const body=await readFile(file);await send('Fetch.fulfillRequest',{requestId:request.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:mime[path.extname(file)]||'application/octet-stream'}],body:body.toString('base64')},sessionId);}
  catch(error){await send('Fetch.fulfillRequest',{requestId:request.requestId,responseCode:404,body:''},sessionId);if(!file.endsWith('favicon.ico'))errors.push(String(error));}
}
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
try{
  const {targetId}=await send('Target.createTarget',{url:'about:blank'});({sessionId:session}=await send('Target.attachToTarget',{targetId,flatten:true}));
  await send('Page.enable');await send('Runtime.enable');await send('Network.enable');if(pipeAssets)await send('Fetch.enable',{patterns:[{urlPattern:'http://astra.test/*'}]});
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:810,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url});
  let loaded=false;for(let i=0;i<100;i++){if(await evaluate("Boolean(window.ASTRA?.bank.ready)&&!document.getElementById('start').disabled")){loaded=true;break;}await delay(100);}
  if(!loaded)throw new Error('ASTRA failed to initialize');
  const maps=await evaluate('ASTRA.MAPS.map(m=>m.key)');
  for(const key of maps){
    await evaluate(`ASTRA.setManual(true);ASTRA.finish(false);ASTRA.selectMap(${JSON.stringify(key)});ASTRA.start();
      ['soda','fries','burger','wing','soju'].forEach((type,i)=>ASTRA.spawn(type,{lane:i%ASTRA.world.terrain.routes.items.length,progress:.22+i*.17}));
      ASTRA.spawn('syrup',{progress:.55});ASTRA.world.spawnTrap();ASTRA.world.buildGun(9);ASTRA.step(.01);`);
    await evaluate('Promise.all(ASTRA.world.spriteLoads).then(()=>ASTRA.world.render())');
    await evaluate('new Promise(resolve=>{const img=new Image();img.onload=resolve;img.src=ASTRA.world.map.plate;})');
    const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(path.join(output,`${key}-sprites.png`),Buffer.from(shot.data,'base64'));
    console.log(`Captured ${key}: generated sprites, organs, props and bazooka`);
  }
  await evaluate(`ASTRA.finish(false);ASTRA.selectMap('coronary');ASTRA.start();ASTRA.setManual(false);`);
  // Production rAF + production raycast shots; no manual time, debug damage, or invulnerability.
  await evaluate(`window.astraSmoke=setInterval(()=>{const a=ASTRA;if(a.state.paused)a.pause(false);if(a.state.phase==='quiz'){if(!a.state.answered){a.state.selection=a.state.quiz.correct;a.answerQuiz();}a.continueQuiz();}else if(a.state.phase==='combat'){const enemy=[...a.enemies].sort((x,y)=>y.progress-x.progress)[0];if(enemy){const p=a.project(enemy);if(p.visible)a.shot(p.x,p.y);}}},65)`);
  let completed=false;
  for(let i=0;i<100;i++){
    await delay(1000);const status=await evaluate('({wave:ASTRA.state.wave,phase:ASTRA.state.phase,bosses:ASTRA.state.killedBosses,performance:{...ASTRA.performance}})');samples.push(status.performance);
    if(i===10){const image=await send('Page.captureScreenshot',{format:'png'});await writeFile(path.join(output,'combat.png'),Buffer.from(image.data,'base64'));}
    if(status.wave>=1&&status.bosses.includes('syrup')){completed=true;break;}
    if(status.phase==='result')throw new Error('Defense ended before the first wave cleared');
  }
  await evaluate('clearInterval(window.astraSmoke)');
  const image=await send('Page.captureScreenshot',{format:'png'});await writeFile(path.join(output,'wave-clear.png'),Buffer.from(image.data,'base64'));
  await writeFile(path.join(output,'browser-report.json'),JSON.stringify({completed,errors,samples},null,2));
  if(!completed)throw new Error('First-wave smoke test timed out');if(errors.length)throw new Error(`Browser errors: ${JSON.stringify(errors)}`);
  console.log('PASS: localhost load, console/network checks, real-time first wave and syrup boss.');
  console.log(`FPS range: ${Math.min(...samples.map(s=>s.fps))}–${Math.max(...samples.map(s=>s.fps))}. Evidence: ${output}`);
}finally{
  chrome.kill();await new Promise(resolve=>{if(!chrome.pid||chrome.exitCode!==null||chrome.signalCode!==null)resolve();else chrome.once('exit',resolve);});await rm(profile,{recursive:true,force:true});
}
