(()=>{'use strict';
const HASH='1jh297-spgf2z',LOCAL=['localhost','127.0.0.1'].includes(location.hostname);
function adminOK(){try{const p=JSON.parse(localStorage.getItem('inventory_login_photo_proof_v2')||'null');return String(localStorage.getItem('inventory_user_name_v2')||'').trim()==='مهند'&&String(localStorage.getItem('inventory_admin_token_v2')||'')===HASH&&(LOCAL||(p?.role==='admin'&&Boolean(p?.photoId)))}catch{return false}}
if(!adminOK()){location.replace('./index.html?employee=1');throw Error('ADMIN_ONLY')}
const AR='٠١٢٣٤٥٦٧٨٩',FA='۰۱۲۳۴۵۶۷۸۹',MAX=500,PAGE=24,BATCH=25,ALBUM_MAX_DIM=1600,ALBUM_QUALITY=.86;
const S={ready:false,images:new Map,digits:new Map,known:new Set,prices:new Map,packs:new Map,historical:new Map,bindings:{},bindingsReady:false,bindingsPromise:null,names:new Map,results:[],missing:[],duplicates:0,invalid:0,overflow:0,busy:false,page:0,shareOffset:0,sharePrepared:null};
const $=id=>document.getElementById(id),E={input:$('skuInput'),counter:$('inputCounter'),extract:$('extractBtn'),paste:$('pasteBtn'),clear:$('clearBtn'),stats:$('stats'),requested:$('requestedCount'),found:$('foundCount'),missingCount:$('missingCount'),duplicates:$('duplicateCount'),toolbar:$('toolbar'),share:$('shareImagesBtn'),zip:$('downloadZipBtn'),priceToggle:$('priceStampToggle'),priceCoverage:$('priceCoverage'),copy:$('copyMissingBtn'),fresh:$('newSearchBtn'),progress:$('progress'),bar:$('progressBar'),progressText:$('progressText'),resultsSection:$('resultsSection'),grid:$('resultGrid'),pager:$('resultPager'),chip:$('resultChip'),missingSection:$('missingSection'),missingList:$('missingList'),missingHint:$('missingHint'),empty:$('emptyState'),toast:$('toast')};
const digits=s=>String(s??'').replace(/[٠-٩۰-۹]/g,d=>{const a=AR.indexOf(d);return a>-1?String(a):String(FA.indexOf(d))});
const norm=s=>digits(s).trim().toUpperCase().replace(/\.(WEBP|PNG|JPE?G)$/i,'').replace(/\s+/g,'').replace(/[^A-Z0-9_\-]/g,'');
const nums=s=>digits(s).replace(/\D/g,'');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const url=f=>'./images/'+String(f).split('/').map(encodeURIComponent).join('/');
const ext=f=>(String(f).match(/\.([a-z0-9]+)$/i)||[])[1]?.toLowerCase()||'webp';
const safe=s=>String(s||'').replace(/[\\/:*?"<>|]+/g,'_').slice(0,90);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function fetchTimed(path,ms,options={}){const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);try{return await fetch(path,{...options,signal:c.signal})}finally{clearTimeout(t)}}
async function text(path){const r=await fetchTimed(path,12000,{cache:'no-store'});if(!r.ok)throw Error(path+' '+r.status);return r.text()}
function toast(m,err=false){E.toast.textContent=m;E.toast.className='bulk-toast on'+(err?' err':'');clearTimeout(toast.t);toast.t=setTimeout(()=>E.toast.className='bulk-toast',3300)}
function parseImages(raw){for(const line of String(raw).split(/\r?\n/)){const t=line.trim();if(!t||t.startsWith('#'))continue;const p=t.split('\t').map(x=>x.trim()).filter(Boolean),key=norm(p.length>1?p[0]:p.at(-1)),file=p.at(-1);if(!key||!file)continue;const row={key,file};S.images.set(key,row);S.known.add(key);const fileSku=norm(file);if(fileSku)S.known.add(fileSku);const d=nums(key);if(d){if(!S.digits.has(d))S.digits.set(d,[]);S.digits.get(d).push(row)}}}
function parseInv(raw){const l=String(raw).split(/\r?\n/).filter(Boolean);if(l.length<2)return;const h=l[0].split('\t').map(x=>x.trim());let si=h.findIndex(x=>/رقم|كود|sku|item/i.test(x)),ni=h.findIndex(x=>/اسم|وصف|name/i.test(x)),pi=h.findIndex(x=>/شد|pack|bundle|case/i.test(x));if(si<0)si=0;for(const line of l.slice(1)){const c=line.split('\t'),sku=norm(c[si]),name=String(c[ni>=0?ni:1]||'').trim(),packRaw=String(c[pi>=0?pi:4]||'').trim();if(sku)S.known.add(sku);if(sku&&name&&!S.names.has(sku))S.names.set(sku,name);if(sku&&packRaw&&!S.packs.has(sku)){const pack=Number(digits(packRaw).replace(/[^0-9.]/g,''));if(Number.isFinite(pack)&&pack>0)S.packs.set(sku,pack)}}}
function parsePricing(raw){const lines=String(raw||'').split(/\r?\n/);let header=-1,pairs=[];for(let i=0;i<Math.min(6,lines.length);i++){if(lines[i].includes('سعر')&&(lines[i].includes('رقم')||lines[i].includes('صنف'))){header=i;break}}if(header<0)return;const h=lines[header].split('\t').map(x=>x.trim());h.forEach((x,i)=>{if(/رقم|كود|صنف/i.test(x)){if(i>0&&/سعر|بيع/i.test(h[i-1]))pairs.push([i,i-1]);else if(i<h.length-1&&/سعر|بيع/i.test(h[i+1]))pairs.push([i,i+1])}});for(const line of lines.slice(header+1)){const c=line.split('\t');for(const [si,pi] of pairs){const sku=norm(c[si]||''),price=String(c[pi]||'').trim();if(sku&&price&&!S.prices.has(sku))S.prices.set(sku,price)}}}
function parseHistoricalPricing(raw){
  const lines=String(raw||'').split(/\r?\n/).filter(Boolean);if(lines.length<2)return;
  const h=lines[0].split('\t').map(x=>x.trim()),idx=name=>h.indexOf(name);
  const si=idx('SKU'),spi=idx('SalePrice'),pki=idx('PackQty'),udi=idx('UnitPrice'),pdi=idx('PriceDate'),pkdi=idx('PackDate'),pci=idx('PriceCommit'),pkci=idx('PackCommit'),ai=idx('HistoricalAlias'),ni=idx('Name');
  for(const line of lines.slice(1)){
    const c=line.split('\t'),sku=norm(c[si]||'');if(!sku)continue;
    const rec={sku,salePrice:String(c[spi]||'').trim(),packQty:String(c[pki]||'').trim(),unitPrice:String(c[udi]||'').trim(),priceDate:String(c[pdi]||'').trim(),packDate:String(c[pkdi]||'').trim(),priceCommit:String(c[pci]||'').trim(),packCommit:String(c[pkci]||'').trim(),alias:norm(c[ai]||''),name:String(c[ni]||'').trim()};
    S.historical.set(sku,rec);if(rec.alias&&!S.historical.has(rec.alias))S.historical.set(rec.alias,rec)
  }
}

function numberValue(value){const n=Number(digits(String(value??'')).replace(/,/g,'').replace(/[^0-9.\-]/g,''));return Number.isFinite(n)?n:NaN}
function unitPriceLabel(salePrice,packQty){const sale=numberValue(salePrice),pack=numberValue(packQty);if(!(sale>0)||!(pack>0))return'';const unit=sale/pack;if(!(unit>0)||!Number.isFinite(unit))return'';return Number(unit.toFixed(2)).toString()+' ⃁'}
function unitPriceFor(sku,img){
  const candidates=[sku,img?.key,norm(img?.file||'')].filter(Boolean);
  for(const key of candidates){
    const salePrice=S.prices.get(key)||'',packQty=S.packs.get(key)||'',unitPrice=unitPriceLabel(salePrice,packQty);
    if(unitPrice)return{salePrice,packQty,unitPrice,priceKey:key,priceSource:'current',historyName:''}
  }
  for(const key of candidates){
    const h=S.historical.get(key);if(!h)continue;
    const unitPrice=h.unitPrice?Number(numberValue(h.unitPrice).toFixed(2)).toString()+' ⃁':unitPriceLabel(h.salePrice,h.packQty);
    if(unitPrice)return{salePrice:h.salePrice,packQty:h.packQty,unitPrice,priceKey:key,priceSource:'historical',historyName:h.name||'',historyAlias:h.alias||'',priceDate:h.priceDate||'',packDate:h.packDate||''}
  }
  return{salePrice:S.prices.get(sku)||'',packQty:S.packs.get(sku)||'',unitPrice:'',priceKey:'',priceSource:'none',historyName:''}
}
async function loadBindings(){try{const r=await fetchTimed('./api/image-admin?action=bindings',3500,{cache:'no-store'});if(!r.ok)return{};const d=await r.json();return d?.bindings&&typeof d.bindings==='object'?d.bindings:{}}catch(e){console.warn('[V56.78 bindings skipped]',e?.name||e);return{}}}
function startBindings(){S.bindingsPromise=loadBindings().then(b=>{S.bindings=b;S.bindingsReady=true;return b}).catch(()=>{S.bindingsReady=true;return{}})}
async function boot(){E.extract.disabled=true;E.extract.textContent='جاري تجهيز بيانات الصور…';startBindings();try{const [i,j,r,p,h]=await Promise.all([text('./data/images_list.txt'),text('./data/jeddah.tsv'),text('./data/riyadh.tsv'),text('./data/pricing.tsv').catch(()=> ''),text('./data/historical_pricing.tsv').catch(()=> '')]);parseImages(i);parseInv(j);parseInv(r);parsePricing(p);parseHistoricalPricing(h);S.ready=true;E.extract.disabled=false;E.extract.textContent='استخراج الصور'}catch(e){console.error('[V56.78 boot]',e);E.extract.disabled=false;E.extract.textContent='إعادة المحاولة';E.extract.onclick=()=>location.reload();toast('تعذر تحميل بيانات الصور خلال المهلة. تحقق من الاتصال ثم أعد المحاولة.',true)}}
const INVISIBLE_FORMATTING=/[\u00AD\u034F\u061C\u180E\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g;
function repairRepeatedPrefix(token){
  let value=String(token||'');
  const m=value.match(/^([A-Z]{2,5}[_-])\1(.+)$/);
  if(!m)return value;
  const candidate=m[1]+m[2];
  return S.known.has(candidate)?candidate:value;
}
function splitMergedSku(token){
  const marked=String(token||'').replace(/(\d)(?=[A-Z]{2,5}[_-])/g,'$1 ');
  const parts=marked.split(/\s+/).filter(Boolean).map(repairRepeatedPrefix);
  return parts.length>1?parts:[repairRepeatedPrefix(token)];
}
function plausibleSku(token){return /\d/.test(token)&&/^(?:\d+|[A-Z0-9]+(?:[_-][A-Z0-9]+)*)$/.test(token)}
function inputTokens(raw){
  const prepared=digits(String(raw??'')).normalize('NFKC').toUpperCase()
    .replace(INVISIBLE_FORMATTING,'')
    .replace(/\r\n?/g,'\n');
  const primary=prepared.split(/[\s,،;؛|]+/).map(x=>x.trim()).filter(Boolean);
  const out=[];
  for(const rawToken of primary){
    const cleaned=repairRepeatedPrefix(norm(rawToken));
    if(!cleaned)continue;
    for(const part of splitMergedSku(cleaned)){
      const fixed=repairRepeatedPrefix(part);
      if(fixed)out.push(fixed);
    }
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
function resolve(sku){const m=norm(S.bindings?.[sku]||'');if(m&&S.images.has(m))return{...S.images.get(m),mode:'يدوي'};if(S.images.has(sku))return{...S.images.get(sku),mode:'مباشر'};const a=S.digits.get(nums(sku))||[];return a.length===1?{...a[0],mode:'مطابقة آمنة'}:null}
async function run(){if(!S.ready)return toast('بيانات الصور لم تجهز بعد.',true);if(S.bindingsPromise&&!S.bindingsReady)await Promise.race([S.bindingsPromise,wait(700)]);const p=parsed();if(!p.items.length){E.input.focus();return toast('أدخل رقم صنف واحدًا على الأقل.',true)}S.results=[];S.missing=[];S.duplicates=p.duplicates;S.invalid=p.invalid;S.overflow=p.overflow;S.page=0;S.shareOffset=0;S.sharePrepared=null;p.items.forEach((sku,index)=>{const img=resolve(sku);if(img){const pricing=unitPriceFor(sku,img);S.results.push({sku,index,name:S.names.get(sku)||pricing.historyName||'',...pricing,...img})}else S.missing.push({sku,index,name:S.names.get(sku)||''})});render(p.items.length);toast(p.overflow?'تمت معالجة أول 500 صنف فقط.':'تم العثور على '+S.results.length+' صورة من '+p.items.length+'.',Boolean(p.overflow))}
function card(x,resultIndex,displayNo){const src=url(x.file),priceOn=Boolean(E.priceToggle?.checked),priceBadge=priceOn&&x.unitPrice?'<span class="bulk-price-preview">'+esc(x.unitPrice)+'</span>':'';return '<article class="bulk-image-card"><a class="bulk-image-wrap" href="'+esc(src)+'" target="_blank" rel="noopener"><img loading="lazy" decoding="async" src="'+esc(src)+'" alt="صورة الصنف '+esc(x.sku)+'"><span class="bulk-order">'+String(displayNo).padStart(2,'0')+'</span><span class="bulk-mode">'+esc(x.mode)+'</span>'+priceBadge+'</a><div class="bulk-body"><div class="bulk-sku">'+esc(x.sku)+'</div><div class="bulk-name">'+esc(x.name||'اسم الصنف غير متوفر في المخزون الحالي')+'</div><div class="bulk-file">'+esc(x.file)+'</div><div class="bulk-card-actions"><button class="bulk-mini save" data-save="'+resultIndex+'">حفظ الصورة</button><a class="bulk-mini" href="'+esc(src)+'" target="_blank" rel="noopener">فتح الأصلية</a></div></div></article>'}
function renderCards(){const total=S.results.length,pages=Math.max(1,Math.ceil(total/PAGE));if(S.page>=pages)S.page=pages-1;const start=S.page*PAGE,visible=S.results.slice(start,start+PAGE);E.grid.innerHTML=visible.map((x,i)=>card(x,start+i,start+i+1)).join('');E.grid.querySelectorAll('[data-save]').forEach(b=>b.onclick=()=>saveOne(Number(b.dataset.save),b));if(total>PAGE){E.pager.innerHTML='<button id="pagePrev" class="bulk-btn" '+(S.page===0?'disabled':'')+'>السابق</button><span class="bulk-page-info">صفحة '+(S.page+1)+' / '+pages+' · '+Math.min(start+1,total)+'–'+Math.min(start+PAGE,total)+' من '+total+'</span><button id="pageNext" class="bulk-btn" '+(S.page===pages-1?'disabled':'')+'>التالي</button>';$('pagePrev').onclick=()=>{if(S.page>0){S.page--;renderCards();scrollResults()}};$('pageNext').onclick=()=>{if(S.page<pages-1){S.page++;renderCards();scrollResults()}}}else E.pager.innerHTML=''}
function scrollResults(){requestAnimationFrame(()=>window.scrollTo({top:Math.max(0,E.resultsSection.offsetTop-90),behavior:'smooth'}))}
function updatePriceCoverage(){
  if(!E.priceCoverage)return;
  if(!priceStampEnabled()||!S.results.length){E.priceCoverage.hidden=true;E.priceCoverage.className='bulk-price-coverage';E.priceCoverage.textContent='';return}
  const current=S.results.filter(x=>x.unitPrice&&x.priceSource==='current').length,historical=S.results.filter(x=>x.unitPrice&&x.priceSource==='historical').length,priced=current+historical,unpriced=S.results.length-priced;
  E.priceCoverage.hidden=false;E.priceCoverage.className='bulk-price-coverage'+(unpriced?' warn':'');
  if(unpriced)E.priceCoverage.textContent='سعر الحبة جاهز لـ '+priced+' صورة ('+current+' حالي + '+historical+' تاريخي) · '+unpriced+' صورة بلا سعر موثوق.';
  else if(historical)E.priceCoverage.textContent='سعر الحبة متوفر لكل الصور: '+current+' حالي + '+historical+' تاريخي موثق.';
  else E.priceCoverage.textContent='سعر الحبة متوفر لكل الصور من البيانات الحالية.';
}
function render(total){E.empty.hidden=true;E.stats.hidden=false;E.toolbar.hidden=false;E.requested.textContent=total;E.found.textContent=S.results.length;E.missingCount.textContent=S.missing.length;E.duplicates.textContent=S.duplicates;E.zip.disabled=!S.results.length;E.copy.disabled=!S.missing.length;E.zip.textContent='تنزيل الكل — ZIP واحد';updateShareButton();E.resultsSection.hidden=!S.results.length;E.missingSection.hidden=!S.missing.length;E.chip.textContent=S.results.length+' صورة';renderCards();updatePriceCoverage();E.missingList.innerHTML=S.missing.map(x=>'<span class="bulk-missing-chip">'+esc(x.sku)+'</span>').join('');E.missingHint.textContent=S.missing.length+' رقم'+(S.invalid?' · تم تجاهل '+S.invalid+' مدخل غير صالح':'');requestAnimationFrame(()=>window.scrollTo({top:Math.max(0,E.stats.offsetTop-100),behavior:'smooth'}))}
async function blob(row){const r=await fetchTimed(url(row.file),30000,{cache:'force-cache'});if(!r.ok)throw Error('IMAGE_'+r.status);return r.blob()}
function priceStampEnabled(){return Boolean(E.priceToggle?.checked)}
function outputName(row){return safe(row.sku)+(priceStampEnabled()&&row.unitPrice?'-unit-price':'')+'.'+ext(row.file)}
function rr(ctx,x,y,w,h,r){const q=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+q,y);ctx.arcTo(x+w,y,x+w,y+h,q);ctx.arcTo(x+w,y+h,x,y+h,q);ctx.arcTo(x,y+h,x,y,q);ctx.arcTo(x,y,x+w,y,q);ctx.closePath()}
async function stampPrice(source,row){
  if(!priceStampEnabled()||!row.unitPrice)return source;
  const u=URL.createObjectURL(source),img=new Image();
  await new Promise((ok,no)=>{img.onload=ok;img.onerror=no;img.src=u});
  try{
    const w=img.naturalWidth,h=img.naturalHeight,c=document.createElement('canvas');c.width=w;c.height=h;
    const x=c.getContext('2d');if(!x)throw Error('CANVAS');
    x.drawImage(img,0,0,w,h);
    const minSide=Math.min(w,h),m=Math.max(6,Math.round(minSide*.012)),fs=Math.max(12,Math.min(26,Math.round(minSide*.021))),px=Math.max(5,Math.round(fs*.38)),py=Math.max(2,Math.round(fs*.18)),label=row.unitPrice;
    x.font='700 '+fs+'px system-ui, -apple-system, Arial, sans-serif';x.textAlign='right';x.textBaseline='middle';x.direction='rtl';
    const tw=Math.ceil(x.measureText(label).width),bw=tw+px*2,bh=fs+py*2,bx=w-m-bw,by=h-m-bh;
    x.save();x.shadowColor='rgba(0,0,0,.10)';x.shadowBlur=Math.max(2,Math.round(fs*.10));x.shadowOffsetY=1;x.fillStyle='rgba(255,255,255,.86)';rr(x,bx,by,bw,bh,Math.max(4,Math.round(fs*.20)));x.fill();x.restore();
    x.fillStyle='#17211c';x.fillText(label,w-m-px,by+bh/2);
    const mime=['image/jpeg','image/png','image/webp'].includes(source.type)?source.type:'image/webp';
    return await new Promise((ok,no)=>c.toBlob(b=>b?ok(b):no(Error('STAMP_BLOB')),mime,mime==='image/png'?undefined:.96));
  }finally{URL.revokeObjectURL(u)}
}
async function outputBlob(row){return stampPrice(await blob(row),row)}
function albumOutputName(row){return safe(row.sku)+(priceStampEnabled()&&row.unitPrice?'-unit-price':'')+'.jpg'}
async function albumBlob(row){
  const source=await blob(row),u=URL.createObjectURL(source),img=new Image();
  await new Promise((ok,no)=>{img.onload=ok;img.onerror=no;img.src=u});
  try{
    const sw=img.naturalWidth,sh=img.naturalHeight,scale=Math.min(1,ALBUM_MAX_DIM/Math.max(sw,sh)),w=Math.max(1,Math.round(sw*scale)),h=Math.max(1,Math.round(sh*scale));
    const c=document.createElement('canvas');c.width=w;c.height=h;
    const x=c.getContext('2d');if(!x)throw Error('ALBUM_CANVAS');
    x.fillStyle='#fff';x.fillRect(0,0,w,h);x.drawImage(img,0,0,w,h);
    if(priceStampEnabled()&&row.unitPrice){
      const minSide=Math.min(w,h),m=Math.max(5,Math.round(minSide*.011)),fs=Math.max(11,Math.min(24,Math.round(minSide*.020))),px=Math.max(4,Math.round(fs*.36)),py=Math.max(2,Math.round(fs*.16)),label=row.unitPrice;
      x.font='700 '+fs+'px system-ui, -apple-system, Arial, sans-serif';x.textAlign='right';x.textBaseline='middle';x.direction='rtl';
      const tw=Math.ceil(x.measureText(label).width),bw=tw+px*2,bh=fs+py*2,bx=w-m-bw,by=h-m-bh;
      x.save();x.shadowColor='rgba(0,0,0,.08)';x.shadowBlur=Math.max(2,Math.round(fs*.08));x.shadowOffsetY=1;x.fillStyle='rgba(255,255,255,.86)';rr(x,bx,by,bw,bh,Math.max(4,Math.round(fs*.18)));x.fill();x.restore();
      x.fillStyle='#17211c';x.fillText(label,w-m-px,by+bh/2);
    }
    return await new Promise((ok,no)=>c.toBlob(b=>b?ok(b):no(Error('ALBUM_BLOB')),'image/jpeg',ALBUM_QUALITY));
  }finally{URL.revokeObjectURL(u)}
}
function shareSupported(){return typeof navigator.share==='function'&&typeof File==='function'}
function updateShareButton(){
  if(!E.share)return;
  if(!S.results.length){E.share.disabled=true;E.share.textContent='حفظ الكل للألبوم';return}
  if(!shareSupported()){E.share.disabled=true;E.share.textContent='الحفظ للألبوم غير مدعوم';return}
  E.share.disabled=Boolean(S.busy);
  if(S.sharePrepared){E.share.textContent='فتح المشاركة — '+S.sharePrepared.files.length+' صورة';return}
  E.share.textContent='تجهيز الكل للألبوم — '+S.results.length+' صورة';
}
async function prepareAllForAlbum(){
  if(S.busy||!S.results.length)return;
  if(!shareSupported()){toast('المتصفح الحالي لا يدعم مشاركة ملفات الصور مباشرة. استخدم Safari على الآيفون أو ZIP.',true);return}
  S.busy=true;E.extract.disabled=true;E.zip.disabled=true;updateShareButton();
  const files=[];let totalBytes=0;
  try{
    progress(0,S.results.length,'جاري تجهيز كل الصور للألبوم…');
    for(let i=0;i<S.results.length;i++){
      const row=S.results[i],b=await albumBlob(row);
      files.push(new File([b],albumOutputName(row),{type:'image/jpeg',lastModified:Date.now()}));
      totalBytes+=b.size;progress(i+1,S.results.length,'تجهيز الصور: '+(i+1)+' / '+S.results.length);
      if(i%4===3)await wait(0);
    }
    if(!files.length)throw Error('NO_ALBUM_FILES');
    const payload={files,title:'صور الأصناف'};
    if(typeof navigator.canShare==='function'&&!navigator.canShare(payload))throw Error('ALL_FILES_SHARE_UNSUPPORTED');
    S.sharePrepared={files,totalBytes,all:true};
    const mb=(totalBytes/1024/1024).toFixed(1);
    toast('تم تجهيز '+files.length+' صورة ('+mb+' MB). اضغط الزر مرة ثانية ثم اختر «حفظ الصور».');
  }catch(e){
    console.error('[V56.78 prepare all album]',e);
    S.sharePrepared=null;
    toast('تعذر تجهيز كل الصور دفعة واحدة على هذا الجهاز. ZIP الواحد ما زال متاحًا.',true);
  }finally{
    S.busy=false;E.extract.disabled=false;E.zip.disabled=!S.results.length;updateShareButton();setTimeout(()=>{E.progress.classList.remove('on');E.bar.style.width='0'},700);
  }
}
async function openPreparedShare(){
  const pack=S.sharePrepared;if(!pack)return;
  try{
    await navigator.share({files:pack.files,title:'صور الأصناف'});
    S.sharePrepared=null;
    toast('تم إرسال كل الصور إلى نافذة المشاركة. اختر «حفظ الصور» لإضافتها للألبوم.');
  }catch(e){
    if(e?.name==='AbortError')toast('تم إلغاء المشاركة. كل الصور ما زالت جاهزة.');
    else{console.error('[V56.78 native all share]',e);toast('رفض iOS مشاركة العدد كاملًا. ZIP الواحد متاح كبديل.',true)}
  }finally{updateShareButton()}
}
async function shareImages(){if(S.sharePrepared)return openPreparedShare();return prepareAllForAlbum()}
function download(data,name){const u=URL.createObjectURL(data),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),5000)}
async function saveOne(i,b){const x=S.results[i];if(!x)return;const old=b.textContent;b.disabled=true;b.textContent='جاري الحفظ…';try{download(await outputBlob(x),outputName(x));toast('تم تجهيز صورة الصنف '+x.sku+(priceStampEnabled()&&x.unitPrice?' مع سعر الحبة':'')+' للحفظ.')}catch(e){console.error(e);toast('تعذر حفظ صورة '+x.sku+'. افتح الأصلية وحاول حفظها يدويًا.',true)}finally{b.disabled=false;b.textContent=old}}
function progress(done,total,msg){E.progress.classList.add('on');E.bar.style.width=Math.round(done/Math.max(1,total)*100)+'%';E.progressText.textContent=msg||done+' / '+total}
function loadScript(src,ms=8000){return new Promise((resolve,reject)=>{const el=document.createElement('script'),timer=setTimeout(()=>{el.remove();reject(Error('SCRIPT_TIMEOUT'))},ms);el.src=src;el.async=true;el.onload=()=>{clearTimeout(timer);resolve()};el.onerror=()=>{clearTimeout(timer);el.remove();reject(Error('SCRIPT_LOAD'))};document.head.appendChild(el)})}
async function ensureZip(){if(window.JSZip)return true;for(const src of ['https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js','https://unpkg.com/jszip@3.10.1/dist/jszip.min.js']){try{await loadScript(src);if(window.JSZip)return true}catch{}}return false}
async function zipAll(){if(S.busy||!S.results.length)return;S.busy=true;E.zip.disabled=true;E.share.disabled=true;E.extract.disabled=true;try{progress(0,S.results.length,'جاري تجهيز ملف واحد لكل الصور…');if(!(await ensureZip()))throw Error('ZIP_LIBRARY');const z=new JSZip();let done=0;for(const x of S.results){z.file(String(x.index+1).padStart(3,'0')+'-'+outputName(x),await outputBlob(x));done++;progress(done,S.results.length,'تجهيز الصور: '+done+' / '+S.results.length);await wait(0)}z.file('_manifest.tsv','SKU\tImage File\tName\tSale Price\tPack\tUnit Price\tPrice Source\tPrice Date\tPack Date\n'+S.results.map(x=>x.sku+'\t'+x.file+'\t'+(x.name||'')+'\t'+(x.salePrice||'')+'\t'+(x.packQty||'')+'\t'+(x.unitPrice||'')+'\t'+(x.priceSource||'')+'\t'+(x.priceDate||'')+'\t'+(x.packDate||'')).join('\n'));progress(S.results.length,S.results.length,'إنشاء ملف ZIP الواحد…');const out=await z.generateAsync({type:'blob',compression:'STORE'},m=>{E.progressText.textContent='إنشاء الملف الواحد: '+Math.round(m.percent)+'%'});download(out,priceStampEnabled()?'صور-الأصناف-سعر-الحبة.zip':'صور-الأصناف.zip');toast('تم تجهيز '+S.results.length+' صورة في ملف ZIP واحد.')}catch(e){console.error('[V56.78 single zip]',e);toast('تعذر إكمال التنزيل الكامل. جرّب مرة أخرى أو استخدم المشاركة.',true)}finally{S.busy=false;E.zip.disabled=!S.results.length;E.share.disabled=!S.results.length;E.extract.disabled=false;updateShareButton();setTimeout(()=>{E.progress.classList.remove('on');E.bar.style.width='0'},1200)}}
async function copyMissing(){const v=S.missing.map(x=>x.sku).join('\n');if(!v)return;try{await navigator.clipboard.writeText(v)}catch{const t=document.createElement('textarea');t.value=v;document.body.appendChild(t);t.select();document.execCommand('copy');t.remove()}toast('تم نسخ '+S.missing.length+' رقمًا مفقودًا.')}
async function paste(){try{const v=await navigator.clipboard.readText();if(!v)return toast('الحافظة فارغة.',true);E.input.value=v;count();E.input.focus()}catch{toast('الصق يدويًا داخل المربع.',true)}}
function reset(){if(S.busy)return;E.input.value='';S.results=[];S.missing=[];S.invalid=0;S.page=0;S.shareOffset=0;S.sharePrepared=null;E.stats.hidden=true;E.toolbar.hidden=true;E.resultsSection.hidden=true;E.missingSection.hidden=true;E.empty.hidden=false;E.grid.innerHTML='';E.pager.innerHTML='';E.missingList.innerHTML='';if(E.priceCoverage){E.priceCoverage.hidden=true;E.priceCoverage.textContent=''}count();window.scrollTo({top:0,behavior:'smooth'});E.input.focus()}
E.input.oninput=count;E.extract.onclick=run;E.paste.onclick=paste;E.clear.onclick=reset;E.fresh.onclick=reset;E.copy.onclick=copyMissing;E.share.onclick=shareImages;E.zip.onclick=zipAll;E.priceToggle.onchange=()=>{S.shareOffset=0;S.sharePrepared=null;renderCards();updatePriceCoverage();updateShareButton();toast(E.priceToggle.checked?'سيتم استخدام السعر الحالي أولًا، ثم آخر سعر و شد تاريخيين موثقين عند نفاد الصنف.':'تم إيقاف سعر الحبة على الصور.')};E.input.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter')run()});count();boot();
})();