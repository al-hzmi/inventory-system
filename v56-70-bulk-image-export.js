(()=>{'use strict';
const HASH='1jh297-spgf2z',LOCAL=['localhost','127.0.0.1'].includes(location.hostname);
function adminOK(){try{const p=JSON.parse(localStorage.getItem('inventory_login_photo_proof_v2')||'null');return String(localStorage.getItem('inventory_user_name_v2')||'').trim()==='مهند'&&String(localStorage.getItem('inventory_admin_token_v2')||'')===HASH&&(LOCAL||(p?.role==='admin'&&Boolean(p?.photoId)))}catch{return false}}
if(!adminOK()){location.replace('./index.html?employee=1');throw Error('ADMIN_ONLY')}
const AR='٠١٢٣٤٥٦٧٨٩',FA='۰۱۲۳۴۵۶۷۸۹',MAX=500,PAGE=24,BATCH=25,SHARE_MAX_FILES=20,SHARE_MAX_BYTES=28*1024*1024;
const S={ready:false,images:new Map,imagesBySku:new Map,imagesByCompact:new Map,digits:new Map,known:new Set,knownByDigits:new Map,bindings:{},bindingsReady:false,bindingsPromise:null,names:new Map,results:[],missing:[],duplicates:0,invalid:0,overflow:0,busy:false,page:0,shareOffset:0,sharePrepared:null};
const $=id=>document.getElementById(id),E={input:$('skuInput'),counter:$('inputCounter'),extract:$('extractBtn'),paste:$('pasteBtn'),clear:$('clearBtn'),stats:$('stats'),requested:$('requestedCount'),found:$('foundCount'),missingCount:$('missingCount'),duplicates:$('duplicateCount'),toolbar:$('toolbar'),share:$('shareImagesBtn'),zip:$('downloadZipBtn'),copy:$('copyMissingBtn'),fresh:$('newSearchBtn'),progress:$('progress'),bar:$('progressBar'),progressText:$('progressText'),resultsSection:$('resultsSection'),grid:$('resultGrid'),pager:$('resultPager'),chip:$('resultChip'),missingSection:$('missingSection'),missingList:$('missingList'),missingHint:$('missingHint'),empty:$('emptyState'),toast:$('toast')};
const digits=s=>String(s??'').replace(/[٠-٩۰-۹]/g,d=>{const a=AR.indexOf(d);return a>-1?String(a):String(FA.indexOf(d))});
const norm=s=>digits(s).trim().toUpperCase().replace(/\.(WEBP|PNG|JPE?G)$/i,'').replace(/\s+/g,'').replace(/[^A-Z0-9_\-]/g,'');
const nums=s=>digits(s).replace(/\D/g,'');
const compact=s=>norm(s).replace(/[_-]/g,'');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const url=f=>'./images/'+String(f).split('/').map(encodeURIComponent).join('/');
const ext=f=>(String(f).match(/\.([a-z0-9]+)$/i)||[])[1]?.toLowerCase()||'webp';
const safe=s=>String(s||'').replace(/[\\/:*?"<>|]+/g,'_').slice(0,90);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function fetchTimed(path,ms,options={}){const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);try{return await fetch(path,{...options,signal:c.signal})}finally{clearTimeout(t)}}
async function text(path){const r=await fetchTimed(path,12000,{cache:'no-store'});if(!r.ok)throw Error(path+' '+r.status);return r.text()}
function toast(m,err=false){E.toast.textContent=m;E.toast.className='bulk-toast on'+(err?' err':'');clearTimeout(toast.t);toast.t=setTimeout(()=>E.toast.className='bulk-toast',3300)}
function parseImages(raw){for(const line of String(raw).split(/\r?\n/)){const t=line.trim();if(!t||t.startsWith('#'))continue;const p=t.split('\t').map(x=>x.trim()).filter(Boolean),key=norm(p.length>1?p[0]:p.at(-1)),file=p.at(-1),fileSku=norm(file);if(!key||!file||!fileSku)continue;const row={key,file,fileSku};S.images.set(key,row);S.imagesBySku.set(fileSku,row);S.known.add(fileSku);const c=compact(fileSku);if(c){if(!S.imagesByCompact.has(c))S.imagesByCompact.set(c,[]);S.imagesByCompact.get(c).push(row)}const d=nums(key);if(d){if(!S.digits.has(d))S.digits.set(d,[]);S.digits.get(d).push(row)}}}
function parseInv(raw){const l=String(raw).split(/\r?\n/).filter(Boolean);if(l.length<2)return;const h=l[0].split('\t').map(x=>x.trim());let si=h.findIndex(x=>/رقم|كود|sku|item/i.test(x)),ni=h.findIndex(x=>/اسم|وصف|name/i.test(x));if(si<0)si=0;for(const line of l.slice(1)){const c=line.split('\t'),sku=norm(c[si]),name=String(c[ni>=0?ni:1]||'').trim();if(!sku)continue;S.known.add(sku);const d=nums(sku);if(d){if(!S.knownByDigits.has(d))S.knownByDigits.set(d,new Set);S.knownByDigits.get(d).add(sku)}if(name&&!S.names.has(sku))S.names.set(sku,name)}}
async function loadBindings(){try{const r=await fetchTimed('./api/image-admin?action=bindings',3500,{cache:'no-store'});if(!r.ok)return{};const d=await r.json();return d?.bindings&&typeof d.bindings==='object'?d.bindings:{}}catch(e){console.warn('[V56.74 bindings skipped]',e?.name||e);return{}}}
function startBindings(){S.bindingsPromise=loadBindings().then(b=>{S.bindings=b;S.bindingsReady=true;return b}).catch(()=>{S.bindingsReady=true;return{}})}
async function boot(){E.extract.disabled=true;E.extract.textContent='جاري تجهيز بيانات الصور…';startBindings();try{const [i,j,r]=await Promise.all([text('./data/images_list.txt'),text('./data/jeddah.tsv'),text('./data/riyadh.tsv')]);parseImages(i);parseInv(j);parseInv(r);S.ready=true;E.extract.disabled=false;E.extract.textContent='استخراج الصور'}catch(e){console.error('[V56.74 boot]',e);E.extract.disabled=false;E.extract.textContent='إعادة المحاولة';E.extract.onclick=()=>location.reload();toast('تعذر تحميل بيانات الصور خلال المهلة. تحقق من الاتصال ثم أعد المحاولة.',true)}}
const INVISIBLE_FORMAT=/[\u00AD\u034F\u061C\u180E\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g;
function plausibleSku(token){return /\d/.test(token)&&/^(?:\d+|[A-Z0-9]+(?:[_-][A-Z0-9]+)*)$/.test(token)}
function segmentKnownSku(token){
  if(S.known.has(token))return[token];
  const memo=new Map;
  function walk(pos){
    if(pos===token.length)return[];
    if(memo.has(pos))return memo.get(pos);
    let best=null;
    for(let end=token.length;end>pos;end--){
      const part=token.slice(pos,end);
      if(!S.known.has(part))continue;
      const rest=walk(end);
      if(rest){best=[part,...rest];break}
    }
    memo.set(pos,best);return best;
  }
  const parts=walk(0);
  return parts&&parts.length>1?parts:[token];
}
function inputTokens(raw){
  const prepared=digits(String(raw??'')).normalize('NFKC').toUpperCase()
    .replace(INVISIBLE_FORMAT,'')
    .replace(/\r\n?/g,'\n');
  const primary=prepared.split(/[\n\t,،;؛| ]+/).map(x=>x.trim()).filter(Boolean);
  const out=[];
  for(const rawToken of primary){
    let cleaned=norm(rawToken);
    if(!cleaned)continue;
    cleaned=cleaned.replace(/^([A-Z]{2,})_\1_(?=[A-Z0-9])/,'$1_');
    for(const part of segmentKnownSku(cleaned))out.push(part);
  }
  return out;
}
function parsed(){
  const tokens=inputTokens(E.input.value),seen=new Set,items=[];let dup=0,invalid=0;
  for(const x of tokens){
    if(!plausibleSku(x)){invalid++;continue}
    if(seen.has(x)){dup++;continue}
    seen.add(x);items.push(x)
  }
  return{items:items.slice(0,MAX),duplicates:dup,invalid,overflow:Math.max(0,items.length-MAX)}
}
function count(){const p=parsed();E.counter.textContent=p.items.length+' / '+MAX+(p.overflow?' · +'+p.overflow+' زائد':'');E.counter.style.color=p.overflow?'#a13636':''}
function resolve(sku){const m=norm(S.bindings?.[sku]||'');if(m){if(S.imagesBySku.has(m))return{...S.imagesBySku.get(m),mode:'يدوي'};if(S.images.has(m))return{...S.images.get(m),mode:'يدوي'}}if(S.imagesBySku.has(sku))return{...S.imagesBySku.get(sku),mode:'مباشر'};if(S.images.has(sku))return{...S.images.get(sku),mode:'مباشر'};const cr=S.imagesByCompact.get(compact(sku))||[];if(cr.length===1)return{...cr[0],mode:'مطابقة اسم آمنة'};const d=nums(sku),known=[...(S.knownByDigits.get(d)||[])],rows=S.digits.get(d)||[];if(d&&known.length===1&&known[0]===sku&&rows.length===1)return{...rows[0],mode:'مطابقة رقمية آمنة'};if(/^\d+$/.test(sku)&&rows.length===1)return{...rows[0],mode:'مطابقة رقمية'};return null}
async function run(){if(!S.ready)return toast('بيانات الصور لم تجهز بعد.',true);if(S.bindingsPromise&&!S.bindingsReady)await Promise.race([S.bindingsPromise,wait(700)]);const p=parsed();if(!p.items.length){E.input.focus();return toast('أدخل رقم صنف واحدًا على الأقل.',true)}S.results=[];S.missing=[];S.duplicates=p.duplicates;S.invalid=p.invalid;S.overflow=p.overflow;S.page=0;S.shareOffset=0;S.sharePrepared=null;p.items.forEach((sku,index)=>{const img=resolve(sku);img?S.results.push({sku,index,name:S.names.get(sku)||'',...img}):S.missing.push({sku,index,name:S.names.get(sku)||''})});render(p.items.length);toast(p.overflow?'تمت معالجة أول 500 صنف فقط.':'تم العثور على '+S.results.length+' صورة من '+p.items.length+'.',Boolean(p.overflow))}
function card(x,resultIndex,displayNo){const src=url(x.file);return '<article class="bulk-image-card"><a class="bulk-image-wrap" href="'+esc(src)+'" target="_blank" rel="noopener"><img loading="lazy" decoding="async" src="'+esc(src)+'" alt="صورة الصنف '+esc(x.sku)+'"><span class="bulk-order">'+String(displayNo).padStart(2,'0')+'</span><span class="bulk-mode">'+esc(x.mode)+'</span></a><div class="bulk-body"><div class="bulk-sku">'+esc(x.sku)+'</div><div class="bulk-name">'+esc(x.name||'اسم الصنف غير متوفر في المخزون الحالي')+'</div><div class="bulk-file">'+esc(x.file)+'</div><div class="bulk-card-actions"><button class="bulk-mini save" data-save="'+resultIndex+'">حفظ الصورة</button><a class="bulk-mini" href="'+esc(src)+'" target="_blank" rel="noopener">فتح الأصلية</a></div></div></article>'}
function renderCards(){const total=S.results.length,pages=Math.max(1,Math.ceil(total/PAGE));if(S.page>=pages)S.page=pages-1;const start=S.page*PAGE,visible=S.results.slice(start,start+PAGE);E.grid.innerHTML=visible.map((x,i)=>card(x,start+i,start+i+1)).join('');E.grid.querySelectorAll('[data-save]').forEach(b=>b.onclick=()=>saveOne(Number(b.dataset.save),b));if(total>PAGE){E.pager.innerHTML='<button id="pagePrev" class="bulk-btn" '+(S.page===0?'disabled':'')+'>السابق</button><span class="bulk-page-info">صفحة '+(S.page+1)+' / '+pages+' · '+Math.min(start+1,total)+'–'+Math.min(start+PAGE,total)+' من '+total+'</span><button id="pageNext" class="bulk-btn" '+(S.page===pages-1?'disabled':'')+'>التالي</button>';$('pagePrev').onclick=()=>{if(S.page>0){S.page--;renderCards();scrollResults()}};$('pageNext').onclick=()=>{if(S.page<pages-1){S.page++;renderCards();scrollResults()}}}else E.pager.innerHTML=''}
function scrollResults(){requestAnimationFrame(()=>window.scrollTo({top:Math.max(0,E.resultsSection.offsetTop-90),behavior:'smooth'}))}
function render(total){E.empty.hidden=true;E.stats.hidden=false;E.toolbar.hidden=false;E.requested.textContent=total;E.found.textContent=S.results.length;E.missingCount.textContent=S.missing.length;E.duplicates.textContent=S.duplicates;E.zip.disabled=!S.results.length;E.copy.disabled=!S.missing.length;E.zip.textContent='ZIP';updateShareButton();E.resultsSection.hidden=!S.results.length;E.missingSection.hidden=!S.missing.length;E.chip.textContent=S.results.length+' صورة';renderCards();E.missingList.innerHTML=S.missing.map(x=>'<span class="bulk-missing-chip">'+esc(x.sku)+'</span>').join('');E.missingHint.textContent=S.missing.length+' رقم'+(S.invalid?' · تم تجاهل '+S.invalid+' مدخل غير صالح':'');requestAnimationFrame(()=>window.scrollTo({top:Math.max(0,E.stats.offsetTop-100),behavior:'smooth'}))}
async function blob(row){const r=await fetchTimed(url(row.file),30000,{cache:'force-cache'});if(!r.ok)throw Error('IMAGE_'+r.status);return r.blob()}
function shareSupported(){return typeof navigator.share==='function'&&typeof File==='function'}
function updateShareButton(){
  if(!E.share)return;
  if(!S.results.length){E.share.disabled=true;E.share.textContent='مشاركة / حفظ في الصور';return}
  if(!shareSupported()){E.share.disabled=true;E.share.textContent='المشاركة غير مدعومة';return}
  E.share.disabled=Boolean(S.busy);
  if(S.sharePrepared){E.share.textContent='فتح المشاركة — '+S.sharePrepared.files.length+' صورة';return}
  const start=S.shareOffset>=S.results.length?0:S.shareOffset,end=Math.min(start+SHARE_MAX_FILES,S.results.length);
  E.share.textContent=(S.shareOffset>=S.results.length?'إعادة المشاركة ':'مشاركة / حفظ ')+(start+1)+'–'+end+' من '+S.results.length;
}
async function prepareShareBatch(){
  if(S.busy||!S.results.length)return;
  if(!shareSupported()){toast('المتصفح الحالي لا يدعم مشاركة ملفات الصور مباشرة. استخدم Safari على الآيفون أو ZIP.',true);return}
  const start=S.shareOffset>=S.results.length?0:S.shareOffset;
  S.busy=true;E.extract.disabled=true;E.zip.disabled=true;updateShareButton();
  const files=[];let totalBytes=0,next=start;
  try{
    const goal=Math.min(SHARE_MAX_FILES,S.results.length-start);
    progress(0,goal,'جاري تجهيز صور المشاركة…');
    while(next<S.results.length&&files.length<SHARE_MAX_FILES){
      const row=S.results[next],b=await blob(row);
      if(files.length&&totalBytes+b.size>SHARE_MAX_BYTES)break;
      const type=b.type||({'jpg':'image/jpeg','jpeg':'image/jpeg','png':'image/png','webp':'image/webp'}[ext(row.file)]||'application/octet-stream');
      files.push(new File([b],safe(row.sku)+'.'+ext(row.file),{type,lastModified:Date.now()}));
      totalBytes+=b.size;next++;
      progress(files.length,goal,'تجهيز الصور: '+files.length+' / '+goal);
      if(totalBytes>=SHARE_MAX_BYTES)break;
      await wait(0);
    }
    if(!files.length)throw Error('NO_SHARE_FILES');
    const payload={files,title:'صور الأصناف'};
    if(typeof navigator.canShare==='function'&&!navigator.canShare(payload))throw Error('FILE_SHARE_UNSUPPORTED');
    S.sharePrepared={files,start,next,totalBytes};
    toast('تم تجهيز '+files.length+' صورة. اضغط الزر مرة ثانية لفتح المشاركة ثم اختر «حفظ الصور».');
  }catch(e){
    console.error('[V56.74 prepare share]',e);
    S.sharePrepared=null;
    toast('تعذر تجهيز مشاركة الصور على هذا المتصفح. يمكنك استخدام ZIP كخيار بديل.',true);
  }finally{
    S.busy=false;E.extract.disabled=false;E.zip.disabled=!S.results.length;updateShareButton();setTimeout(()=>{E.progress.classList.remove('on');E.bar.style.width='0'},700);
  }
}
async function openPreparedShare(){
  const pack=S.sharePrepared;if(!pack)return;
  try{
    await navigator.share({files:pack.files,title:'صور الأصناف'});
    S.shareOffset=pack.next;S.sharePrepared=null;
    if(S.shareOffset>=S.results.length)toast('تمت آخر دفعة. يمكنك إعادة المشاركة من البداية عند الحاجة.');
    else toast('تمت الدفعة. جهّز الدفعة التالية للحفظ أو المشاركة.');
  }catch(e){
    if(e?.name==='AbortError')toast('تم إلغاء المشاركة. الدفعة ما زالت جاهزة.');
    else{console.error('[V56.74 native share]',e);toast('تعذر فتح المشاركة. حاول مرة أخرى أو استخدم ZIP.',true)}
  }finally{updateShareButton()}
}
async function shareImages(){if(S.sharePrepared)return openPreparedShare();return prepareShareBatch()}
function download(data,name){const u=URL.createObjectURL(data),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),5000)}
async function saveOne(i,b){const x=S.results[i];if(!x)return;const old=b.textContent;b.disabled=true;b.textContent='جاري الحفظ…';try{download(await blob(x),safe(x.sku)+'-'+safe(x.file));toast('تم تجهيز صورة الصنف '+x.sku+' للحفظ.')}catch(e){console.error(e);toast('تعذر حفظ صورة '+x.sku+'. افتح الأصلية وحاول حفظها يدويًا.',true)}finally{b.disabled=false;b.textContent=old}}
function progress(done,total,msg){E.progress.classList.add('on');E.bar.style.width=Math.round(done/Math.max(1,total)*100)+'%';E.progressText.textContent=msg||done+' / '+total}
function loadScript(src,ms=8000){return new Promise((resolve,reject)=>{const el=document.createElement('script'),timer=setTimeout(()=>{el.remove();reject(Error('SCRIPT_TIMEOUT'))},ms);el.src=src;el.async=true;el.onload=()=>{clearTimeout(timer);resolve()};el.onerror=()=>{clearTimeout(timer);el.remove();reject(Error('SCRIPT_LOAD'))};document.head.appendChild(el)})}
async function ensureZip(){if(window.JSZip)return true;for(const src of ['https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js','https://unpkg.com/jszip@3.10.1/dist/jszip.min.js']){try{await loadScript(src);if(window.JSZip)return true}catch{}}return false}
async function zipAll(){if(S.busy||!S.results.length)return;S.busy=true;E.zip.disabled=true;E.extract.disabled=true;try{progress(0,S.results.length,'جاري تجهيز أداة ZIP…');if(!(await ensureZip()))throw Error('ZIP_LIBRARY');const batches=[];for(let i=0;i<S.results.length;i+=BATCH)batches.push(S.results.slice(i,i+BATCH));let done=0;for(let bi=0;bi<batches.length;bi++){const z=new JSZip,b=batches[bi];for(const x of b){z.file(String(x.index+1).padStart(3,'0')+'-'+safe(x.sku)+'.'+ext(x.file),await blob(x));done++;progress(done,S.results.length,'تجهيز الصور: '+done+' / '+S.results.length);await wait(0)}z.file('_manifest.tsv','SKU\tImage File\tName\n'+b.map(x=>x.sku+'\t'+x.file+'\t'+(x.name||'')).join('\n'));progress(done,S.results.length,'إنشاء ملف ZIP '+(bi+1)+' من '+batches.length+'…');const out=await z.generateAsync({type:'blob',compression:'STORE'});download(out,'صور-الأصناف'+(batches.length>1?'-'+String(bi+1).padStart(2,'0')+'-of-'+String(batches.length).padStart(2,'0'):'')+'.zip');await wait(250)}toast('تم تجهيز '+S.results.length+' صورة للتنزيل.')}catch(e){console.error('[V56.74 zip]',e);toast('تعذر إكمال ZIP. الصور ما زالت متاحة للحفظ الفردي أو فتح الأصلية.',true)}finally{S.busy=false;E.zip.disabled=!S.results.length;E.extract.disabled=false;setTimeout(()=>{E.progress.classList.remove('on');E.bar.style.width='0'},1200)}}
async function copyMissing(){const v=S.missing.map(x=>x.sku).join('\n');if(!v)return;try{await navigator.clipboard.writeText(v)}catch{const t=document.createElement('textarea');t.value=v;document.body.appendChild(t);t.select();document.execCommand('copy');t.remove()}toast('تم نسخ '+S.missing.length+' رقمًا مفقودًا.')}
async function paste(){try{const v=await navigator.clipboard.readText();if(!v)return toast('الحافظة فارغة.',true);E.input.value=v;count();E.input.focus()}catch{toast('الصق يدويًا داخل المربع.',true)}}
function reset(){if(S.busy)return;E.input.value='';S.results=[];S.missing=[];S.invalid=0;S.page=0;S.shareOffset=0;S.sharePrepared=null;E.stats.hidden=true;E.toolbar.hidden=true;E.resultsSection.hidden=true;E.missingSection.hidden=true;E.empty.hidden=false;E.grid.innerHTML='';E.pager.innerHTML='';E.missingList.innerHTML='';count();window.scrollTo({top:0,behavior:'smooth'});E.input.focus()}
E.input.oninput=count;E.extract.onclick=run;E.paste.onclick=paste;E.clear.onclick=reset;E.fresh.onclick=reset;E.copy.onclick=copyMissing;E.share.onclick=shareImages;E.zip.onclick=zipAll;E.input.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter')run()});count();boot();
})();