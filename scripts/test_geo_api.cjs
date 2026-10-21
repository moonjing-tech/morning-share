const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '../geo.html'), 'utf8');
const main = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(s=>s.includes('function getApiMode'));
const code = main.slice(0, main.indexOf('// ========== 初始化 ==========')) + `
window.apiTest = { getApiMode, getApiKey, getCustomApiConfig, normalizeApiBaseUrl, customProvider,
  getConfiguredProviders, readApiForm, fillApiForm, requestChatCompletion, testApiConnection,
  setProviders(value) { databaseProviders = value; } };
})();`;
function setup(fetch, initial={}) {
  const saved=new Map(Object.entries(initial));
  const fields=new Map();
  const field=id=>{if(!fields.has(id))fields.set(id,{value:'',textContent:'',disabled:false});return fields.get(id)};
  const window={supabase:{createClient(){return {}}}};
  const ctx=vm.createContext({window, SUPABASE_URL:'https://test.invalid',SUPABASE_KEY:'public-test',
    localStorage:{getItem:k=>saved.get(k)??null,setItem:(k,v)=>saved.set(k,v)},
    document:{querySelector:field,querySelectorAll(){return []}},
    fetch, URL, AbortController, TypeError, setTimeout, clearTimeout});
  vm.runInContext(code,ctx);
  return {api:window.apiTest,field,saved};
}
test('new endpoint defaults do not reuse legacy Ark key',()=>{
  const {api}=setup(null,{geo_ark_api_key:'legacy-test-key'});
  assert.equal(api.getApiMode(),'ark');
  assert.equal(api.getCustomApiConfig().base_url,'https://llm.htffund.com/v1');
  assert.equal(api.getCustomApiConfig().key,'');
  assert.equal(api.getApiKey(),'legacy-test-key');
});
test('custom configuration uses only its own key and model',()=>{
  const {api}=setup(null,{geo_ark_api_key:'legacy-test-key',geo_api_mode_v1:'custom',geo_custom_api_v1:JSON.stringify({base_url:'https://llm.htffund.com/v1',model_name:'deepseek-chat',key:'custom-test-key'})});
  assert.equal(api.getApiKey(),'custom-test-key');
  const providers=api.getConfiguredProviders([{provider_code:'doubao'}]);
  assert.equal(providers.length,1);assert.equal(providers[0].model_name,'deepseek-chat');assert.match(providers[0].provider_code,/llm.htffund.com/);
});
test('switching mode does not prefill another service key',()=>{
  const {api,field}=setup(null,{geo_ark_api_key:'legacy-test-key'});
  field('#apiModeInput').value='custom';api.fillApiForm();assert.equal(field('#apiKeyInput').value,'');
  field('#apiModeInput').value='ark';api.fillApiForm();assert.equal(field('#apiKeyInput').value,'legacy-test-key');
});
test('normalizes base URL or complete chat endpoint',()=>{
  const {api}=setup();
  assert.equal(api.normalizeApiBaseUrl('https://llm.htffund.com/v1/chat/completions/'),'https://llm.htffund.com/v1');
  for(const input of ['http://example.com/v1','https://name:password@example.com/v1','https://example.com/v1?token=x'])assert.throws(()=>api.normalizeApiBaseUrl(input));
});
test('form rejects placeholder key before sending a request',()=>{
  const {api,field}=setup();field('#apiModeInput').value='custom';field('#apiKeyInput').value='sk-xxxxxx';assert.throws(()=>api.readApiForm(),/占位符/);
});
test('OpenAI-compatible request uses configured host, model and bearer',async()=>{
  let request;
  const {api}=setup(async(url,options)=>{request={url,options};return {ok:true,json:async()=>({choices:[{message:{content:'OK'}}]})}});
  assert.equal(await api.requestChatCompletion({base_url:'https://llm.htffund.com/v1',model_name:'deepseek-chat'},[{role:'user',content:'test'}],'test-only-key'),'OK');
  assert.equal(request.url,'https://llm.htffund.com/v1/chat/completions');
  assert.equal(request.options.headers.Authorization,'Bearer test-only-key');
  assert.equal(request.options.redirect,'error');assert.equal(request.options.credentials,'omit');
  assert.equal(JSON.parse(request.options.body).model,'deepseek-chat');
});
test('error messages redact the key and empty answers fail',async()=>{
  let {api}=setup(async()=>({ok:false,status:401,text:async()=> 'invalid test-only-key'}));
  await assert.rejects(api.requestChatCompletion({base_url:'https://llm.htffund.com/v1',model_name:'deepseek-chat'},[],'test-only-key'),e=>e.message.includes('401')&&!e.message.includes('test-only-key'));
  ({api}=setup(async()=>({ok:true,json:async()=>({choices:[]})})));
  await assert.rejects(api.requestChatCompletion({base_url:'https://llm.htffund.com/v1',model_name:'deepseek-chat'},[],'test-only-key'),/有效/);
});
test('network and timeout errors explain next steps',async()=>{
  let {api}=setup(async()=>{throw new TypeError('Failed to fetch')});
  await assert.rejects(api.requestChatCompletion({base_url:'https://llm.htffund.com/v1',model_name:'deepseek-chat'},[],'test-only-key'),/CORS/);
  ({api}=setup(async()=>{const e=new Error('abort');e.name='AbortError';throw e}));
  await assert.rejects(api.requestChatCompletion({base_url:'https://llm.htffund.com/v1',model_name:'deepseek-chat'},[],'test-only-key'),/45秒/);
});
