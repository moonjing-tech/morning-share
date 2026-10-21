const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync(require('node:path').join(__dirname, '../fund.html'), 'utf8');
const code = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');
const row = { FCODE: '161725', SHORTNAME: '测试指数', GSZ: 1.23, GSZZL: 0, GZTIME: '2026-10-21 14:00', NAV: 1.23, PDATE: '2026-10-20' };
function setup(fetch) {
  const elements = new Map();
  const get = id => {
    if (id.startsWith('row-')) return null;
    if (!elements.has(id)) elements.set(id, { value: '', style: {}, classList: {add(){},remove(){}}, innerHTML: '', textContent: '' });
    return elements.get(id);
  };
  const ctx = vm.createContext({ fetch, URLSearchParams, AbortController, setTimeout, clearTimeout, Date, Map, Set,
    document: { addEventListener(){}, querySelectorAll(){return []}, getElementById:get },
    localStorage: { getItem(){return null}, setItem(){} }, LS_KEYS:{watchFunds:'test'}, showToast(){} });
  vm.runInContext(code, ctx);
  return { ctx, get, run: source => vm.runInContext(source, ctx) };
}
const ok = data => ({ ok:true, json:async()=>({success:true,data}) });
test('batch query maps values and retains zero change', async()=>{
  let calls=0;
  const {run}=setup(async(url,options)=>{calls++;assert.equal(options.credentials,'omit');assert.equal(new URL(url).searchParams.get('FCODES'),'161725,000001');return ok([row]);});
  const result=await run("fetchFundValuations(['161725','000001','161725'])");
  assert.equal(calls,1);assert.equal(result.get('161725').gszzl,'0');assert.equal(result.get('161725').nav,'1.23');
});
test('null/blank estimates stay absent and never become zero',()=>{
  const {run}=setup();
  for(const value of ['null',"''","' '"]){
    const result=run(`normalizeValuation({FCODE:'000001',NAV:1.068,PDATE:'2026-10-20',GSZ:${value},GSZZL:${value}})`);
    assert.equal(result.gsz,null);assert.equal(result.gszzl,null);assert.equal(result.nav,'1.068');
  }
});
test('primary HTTP error retries secondary domain',async()=>{
  const urls=[];const {run}=setup(async url=>{urls.push(url);return urls.length===1?{ok:false,status:503}:ok([row]);});
  assert.equal((await run("fetchFundValuation('161725')")).gsz,'1.23');
  assert.match(urls[1],/^https:\/\/fundcomapi.eastmoney.com\//);
});
test('malformed primary payload retries secondary',async()=>{
  let count=0;const {run}=setup(async()=>++count===1?{ok:true,json:async()=>({success:false})}:ok([row]));
  await run("fetchFundValuation('161725')");assert.equal(count,2);
});
test('both sources failing rejects without fabricating data',async()=>{
  const {run}=setup(async()=>{throw new Error('offline')});
  await assert.rejects(run("fetchFundValuation('161725')"),/offline/);
});
test('missing requested code rejects single lookup',async()=>{
  const {run}=setup(async()=>ok([row]));
  await assert.rejects(run("fetchFundValuation('000001')"),/未找到/);
});
test('full refresh failure preserves old data and exposes failure',async()=>{
  const {run,get}=setup(async()=>{throw new Error('offline')});
  run("watchList=[{code:'161725',name:'缓存',gsz:'1.2',gszzl:'2',gztime:'旧时间'}]");
  await run('refreshAll()');
  assert.equal(run('watchList[0].gsz'),'1.2');assert.equal(run('watchList[0].error'),'offline');
  assert.match(get('last-refresh-time').textContent,/刷新失败/);assert.equal(get('btn-refresh').disabled,false);
  assert.equal(run('isRefreshing'),false);assert.equal(get('sc-up').textContent,0);
});
test('successful no-estimate response clears cached estimate but keeps NAV',async()=>{
  const {run,get}=setup(async()=>ok([{...row,GSZ:null,GSZZL:null,GZTIME:null}]));
  run("watchList=[{code:'161725',gsz:'1.2',gszzl:'2',error:'old'}]");
  await run('refreshAll()');assert.equal(run('watchList[0].gsz'),null);assert.equal(run('watchList[0].error'),null);
  assert.match(get('fund-tbody').innerHTML,/暂无盘中估值/);assert.match(get('fund-tbody').innerHTML,/2026-10-20/);
});
test('partial batch response records failures per fund',async()=>{
  const {run,get}=setup(async()=>ok([row]));
  run("watchList=[{code:'161725'},{code:'000001',gsz:'9'}]");await run('refreshAll()');
  assert.equal(run('watchList[0].error'),null);assert.match(run('watchList[1].error'),/未返回/);
  assert.match(get('last-refresh-time').textContent,/更新 1 只，失败 1 只/);
});
test('older preview cannot overwrite newer fund selection',async()=>{
  const pending=[];const {run,get}=setup(url=>new Promise(resolve=>pending.push({url,resolve})));
  const first=run("previewFund('161725')");const second=run("previewFund('000001')");
  pending[1].resolve(ok([{...row,FCODE:'000001',SHORTNAME:'新选择'}]));await second;
  pending[0].resolve(ok([row]));await first;
  assert.equal(get('fp-name').textContent,'新选择');assert.equal(run('previewData.code'),'000001');
});
