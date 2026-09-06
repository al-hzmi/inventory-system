const crypto = require('crypto');
const API_VERSION = '2026-03-10';
const STATE_REF = 'new-arrivals-state';
const STATE_PATH = 'data/new_arrivals_overrides.json';
const AUTO_PATH = 'data/new-arrivals.json';
const ADMIN_TOKEN_SHA256 = 'f03cbd5064d744450fd61c889dabc2874a8acbb0005d06561db00159bfd3c0c7';
const RELEASE_VERSION = '56.35';

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}
function cfg() { return { token:process.env.GITHUB_TOKEN||'', owner:process.env.GITHUB_OWNER||process.env.VERCEL_GIT_REPO_OWNER||'', repo:process.env.GITHUB_REPO||process.env.VERCEL_GIT_REPO_SLUG||'', branch:process.env.GITHUB_BRANCH||'' }; }
async function gh(config,path,options={}) { const r=await fetch(`https://api.github.com${path}`,{...options,headers:{Accept:'application/vnd.github+json',Authorization:`Bearer ${config.token}`,'X-GitHub-Api-Version':API_VERSION,'User-Agent':'BATCO-New-Arrivals-Admin','Content-Type':'application/json',...(options.headers||{})}});const data=await r.json().catch(()=>({}));if(!r.ok){const err=new Error(data?.message||`GitHub API ${r.status}`);err.status=r.status;throw err}return data; }
const norm=value=>String(value||'').toUpperCase().replace(/[^A-Z0-9_-]/g,'');
const digits=value=>String(value||'').replace(/\D/g,'');
const base=config=>`/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}`;
const decode=row=>row?.content?Buffer.from(String(row.content).replace(/\s/g,''),'base64').toString('utf8'):'';
async function repoBranch(config){const info=await gh(config,base(config));return config.branch||info.default_branch||'main'}
async function readText(config,path,ref){try{const row=await gh(config,`${base(config)}/contents/${path}?ref=${encodeURIComponent(ref)}`);return{text:decode(row),sha:row.sha||''}}catch(err){if(err.status===404)return{text:'',sha:''};throw err}}
async function ensureStateBranch(config,mainBranch){try{const ref=await gh(config,`${base(config)}/git/ref/heads/${encodeURIComponent(STATE_REF)}`);return ref.object.sha}catch(err){if(err.status!==404)throw err;const main=await gh(config,`${base(config)}/git/ref/heads/${encodeURIComponent(mainBranch)}`);try{await gh(config,`${base(config)}/git/refs`,{method:'POST',body:JSON.stringify({ref:`refs/heads/${STATE_REF}`,sha:main.object.sha})})}catch(createErr){if(createErr.status!==422)throw createErr}const ref=await gh(config,`${base(config)}/git/ref/heads/${encodeURIComponent(STATE_REF)}`);return ref.object.sha}}
function sanitize(raw){const include=[...new Set((Array.isArray(raw?.include)?raw.include:[]).map(norm).filter(Boolean))];const exclude=[...new Set((Array.isArray(raw?.exclude)?raw.exclude:[]).map(norm).filter(Boolean))];const excluded=new Set(exclude);return{include:include.filter(id=>!excluded.has(id)),exclude}}
async function readState(config){const row=await readText(config,STATE_PATH,STATE_REF);if(!row.text)return{state:{include:[],exclude:[]},sha:''};try{return{state:sanitize(JSON.parse(row.text)),sha:row.sha}}catch{return{state:{include:[],exclude:[]},sha:row.sha}}}
async function readAutoSkus(config,mainBranch){const row=await readText(config,AUTO_PATH,mainBranch);if(!row.text)return[];try{const parsed=JSON.parse(row.text);return[...new Set((Array.isArray(parsed?.items)?parsed.items:[]).map(x=>norm(x?.sku)).filter(Boolean))]}catch{return[]}}
function effectiveNewArrivals(autoSkus,state){const excluded=new Set((state.exclude||[]).map(norm));return new Set([...autoSkus,...(state.include||[])].map(norm).filter(id=>id&&!excluded.has(id)))}
function sameOrigin(req){const origin=String(req.headers?.origin||'');if(!origin)return true;try{return new URL(origin).host===String(req.headers?.host||'')}catch{return false}}
function adminOK(req){const supplied=String(req.body?.adminToken||'');const digest=crypto.createHash('sha256').update(supplied).digest('hex');const proof=req.body?.adminProof||{};return sameOrigin(req)&&digest===ADMIN_TOKEN_SHA256&&proof?.role==='admin'&&Boolean(proof?.photoId)}
function parseSkus(raw){const lines=String(raw||'').split(/\r?\n/).filter(Boolean);if(!lines.length)return[];const headers=lines[0].split('\t');let idx=headers.findIndex(x=>/رقم|كود|sku|item/i.test(x));if(idx<0)idx=0;return lines.slice(1).map(line=>norm(line.split('\t')[idx]||'')).filter(Boolean)}
async function resolveCanonicalSku(config,mainBranch,suppliedSku,options={}){const requested=norm(suppliedSku);if(!requested){const err=new Error('رقم الصنف غير صالح.');err.status=400;throw err}const[j,r]=await Promise.all([readText(config,'data/jeddah.tsv',mainBranch),readText(config,'data/riyadh.tsv',mainBranch)]);const inventory=[...new Set([...parseSkus(j.text),...parseSkus(r.text)])];if(inventory.includes(requested))return requested;const shorthand=digits(requested);if(shorthand){const matches=inventory.filter(id=>digits(id)===shorthand);if(matches.length===1)return matches[0];if(matches.length>1){if(options.action==='remove'&&options.effective instanceof Set){const active=matches.filter(id=>options.effective.has(id));if(active.length===1)return active[0]}const err=new Error('رقم الصنف المختصر يطابق أكثر من صنف. اختر الصنف المطلوب من النتائج أو استخدم الرقم الكامل.');err.status=409;err.matches=matches;throw err}}const err=new Error('الصنف المطلوب غير موجود في المخزون الحالي.');err.status=400;throw err}
// Retain the public regression contract while V56.35 upgrades validation to canonical resolution.
async function validateSku(config,mainBranch,suppliedSku,options){return resolveCanonicalSku(config,mainBranch,suppliedSku,options)}
async function persist(config,state,updatedBy,message,existingSha){const body={message,content:Buffer.from(JSON.stringify({...sanitize(state),updatedAt:new Date().toISOString(),updatedBy:String(updatedBy||'مهند'),version:RELEASE_VERSION},null,2)+'\n','utf8').toString('base64'),branch:STATE_REF};if(existingSha)body.sha=existingSha;const result=await gh(config,`${base(config)}/contents/${STATE_PATH}`,{method:'PUT',body:JSON.stringify(body)});return result?.commit?.sha||null}
module.exports=async function handler(req,res){
 if(req.method==='OPTIONS'){res.setHeader('Allow','GET,POST,OPTIONS');return json(res,204,{})}
 const config=cfg();const action=req.method==='GET'?String(req.query?.action||'status'):String(req.body?.action||'');
 if(req.method==='GET'&&action==='status')return json(res,200,{configured:Boolean(config.token&&config.owner&&config.repo),owner:config.owner||null,repo:config.repo||null,version:RELEASE_VERSION});
 if(req.method==='GET'&&action==='overrides'){if(!config.token||!config.owner||!config.repo)return json(res,503,{error:'خدمة إدارة جديدنا غير مهيأة على الخادم.'});try{const{state}=await readState(config);return json(res,200,{...state,version:RELEASE_VERSION})}catch(err){console.error('[new-arrivals-admin read]',err);return json(res,500,{error:'تعذر تحميل تعديلات جديدنا.'})}}
 if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});if(!config.token||!config.owner||!config.repo)return json(res,503,{error:'خدمة إدارة جديدنا غير مهيأة على الخادم.'});if(!adminOK(req))return json(res,401,{error:'جلسة الإدارة غير صالحة لهذه العملية.'});if(!['add','remove','auto'].includes(action))return json(res,400,{error:'عملية غير معروفة.'});
 try{const mainBranch=await repoBranch(config);await ensureStateBranch(config,mainBranch);const{state,sha}=await readState(config);const autoSkus=action==='remove'?await readAutoSkus(config,mainBranch):[];const effective=action==='remove'?effectiveNewArrivals(autoSkus,state):null;const sku=await validateSku(config,mainBranch,req.body?.sku||'',{action,effective});let include=state.include.filter(id=>id!==sku),exclude=state.exclude.filter(id=>id!==sku);if(action==='add')include=[sku,...include];if(action==='remove')exclude=[sku,...exclude];const next=sanitize({include,exclude});const commitSha=await persist(config,next,req.body?.updatedBy,`state(new-arrivals): ${action} ${sku}`,sha);return json(res,200,{ok:true,...next,saved:sku,action,commitSha,version:RELEASE_VERSION})}catch(err){console.error('[new-arrivals-admin]',err);const status=[400,401,409].includes(err.status)?err.status:500;return json(res,status,{error:err.message||'تعذر تحديث جديدنا.',matches:Array.isArray(err.matches)?err.matches:undefined})}
};
