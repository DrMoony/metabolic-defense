import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const inspect=lang=>JSON.parse(execFileSync(process.execPath,['--input-type=module','-e',`globalThis.location={search:'?lang=${lang}'};const {CHARS,TYPES,ARROWS}=await import('./fighter/data.js');console.log(JSON.stringify({CHARS,TYPES,ARROWS}));`],{cwd:new URL('../../',import.meta.url),encoding:'utf8'}));
const ko=inspect('ko'),en=inspect('en');
assert.equal(Object.keys(en.CHARS).length,12);let commands=0;
for(const [id,c]of Object.entries(en.CHARS)){
  assert.ok(!/[가-힣]/.test(JSON.stringify([c.name,c.style,c.trait,c.commands])));
  commands+=c.commands.length;
  const mechanics=c=>{const {name,style,trait,commands,...rest}=c;return rest;};
  assert.deepEqual(mechanics(c),mechanics(ko.CHARS[id]),`${id}: localization must preserve combat mechanics`);
  assert.deepEqual(c.commands.map(x=>[x.key,x.button,x.motion]),ko.CHARS[id].commands.map(x=>[x.key,x.button,x.motion]));
}
assert.equal(commands,84);assert.ok(!/[가-힣]/.test(JSON.stringify([en.TYPES,en.ARROWS])));
const rows=JSON.parse(readFileSync(new URL('../../assets/quiz_dm_empa_en.json',import.meta.url),'utf8'));
assert.equal(rows.length,23);
for(const row of rows){assert.ok(!/[가-힣]/.test(JSON.stringify([row.q,row.a,row.exp])));assert.ok(row.correct>=0&&row.correct<4);}
assert.deepEqual(inspect('unsupported'),ko);
console.log('PASS 12 localized fighters, 84 move names/descriptions and 23 displayed English quizzes; combat mechanics unchanged.');
