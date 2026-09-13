from pathlib import Path
import re

p=Path('image-distribution.html')
s=p.read_text(encoding='utf-8')

old="const state={images:[],items:[],bindings:{},tab:'unassigned',selected:null,assignment:new Map(),busy:false,liveKeys:new Set()};"
new="const PAGE_SIZE=120;const state={images:[],items:[],bindings:{},tab:'unassigned',selected:null,assignment:new Map(),assignmentDirty:true,busy:false,liveKeys:new Set(),limit:PAGE_SIZE};let albumSearchTimer=0;"
if old not in s: raise SystemExit('state anchor missing')
s=s.replace(old,new,1)

# Native tab/panel scrolling and bounded overscroll.
s=s.replace('.tabs{display:flex;gap:7px;margin:10px 0;overflow:auto}', '.tabs{display:flex;gap:7px;margin:10px 0;overflow:auto;-webkit-overflow-scrolling:touch;overscroll-behavior-inline:contain;touch-action:pan-x pan-y;scroll-behavior:auto}',1)
s=s.replace('.panel{width:100%;max-width:650px;max-height:88dvh;background:#fff;border-radius:22px 22px 0 0;padding:16px;overflow:auto}', '.panel{width:100%;max-width:650px;max-height:88dvh;background:#fff;border-radius:22px 22px 0 0;padding:16px;overflow:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain}',1)

pattern=r"function refresh\(\)\{.*?\}\nfunction openSheet"
replacement=r'''function captureAlbumView(){const tabs=document.querySelector('.tabs'),active=document.activeElement;return{y:window.scrollY||0,tabsLeft:tabs?.scrollLeft||0,focus:active?.id||'',caret:active?.id==='q'?active.selectionStart:null}}
function restoreAlbumView(v){if(!v)return;requestAnimationFrame(()=>{const tabs=document.querySelector('.tabs');if(tabs)tabs.scrollLeft=v.tabsLeft||0;window.scrollTo({top:v.y||0,behavior:'auto'});if(v.focus==='q'){q.focus({preventScroll:true});try{const p=Math.min(v.caret??q.value.length,q.value.length);q.setSelectionRange(p,p)}catch{}}})}
function ensureAssignment(){if(!state.assignmentDirty)return;buildAssignment();state.assignmentDirty=false}
function refresh(){const view=captureAlbumView();ensureAssignment();const qv=norm(q.value);let rows=state.images;if(state.tab==='unassigned')rows=rows.filter(x=>!state.assignment.has(x.key));if(state.tab==='assigned')rows=rows.filter(x=>state.assignment.has(x.key));if(state.tab==='manual')rows=rows.filter(x=>state.assignment.get(x.key)?.manual);if(qv)rows=rows.filter(x=>x.key.includes(qv)||norm(x.file).includes(qv)||(state.assignment.get(x.key)?.owners||[]).some(o=>o.key.includes(qv)||norm(o.name).includes(qv)));const assignedCount=state.assignment.size;total.textContent=state.images.length;unassigned.textContent=state.images.length-assignedCount;assigned.textContent=assignedCount;const visible=rows.slice(0,state.limit),frag=document.createDocumentFragment();empty.style.display=rows.length?'none':'block';visible.forEach(x=>{const info=state.assignment.get(x.key),ownerText=ownerSummary(info),hasLive=info?.owners?.some(o=>state.liveKeys.has(o.key)),mode=info?(info.manual?'يدوي':'تلقائي'):'غير موزعة',badgeClass=info?(info.manual?'manual':'auto'):'';const el=document.createElement('div');el.className='card';el.innerHTML=`<div class="pic"><img loading="lazy" decoding="async" src="./images/${encodeURIComponent(x.file)}"><span class="badge ${badgeClass}">${info?'موزعة '+mode:'غير موزعة'}</span></div><div class="body"><div class="key">${x.key}</div><div class="muted">${x.file}</div><button class="btn" style="width:100%;margin-top:8px">${info?'إعادة توزيع':'توزيع على صنف'}</button>${info?`<div class="owner">مرتبطة فعليًا بـ <b>${ownerText}</b> · ${info.manual?'ربط يدوي':'ربط تلقائي آمن'}${!hasLive?' · <span class="catalog">الصنف محفوظ في الكتالوج وقد يكون نافدًا حاليًا</span>':''}</div>`:''}</div>`;el.querySelector('button').onclick=()=>openSheet(x);frag.appendChild(el)});if(rows.length>state.limit){const holder=document.createElement('div');holder.style.cssText='grid-column:1/-1;display:flex;justify-content:center;padding:8px 0 2px';const more=document.createElement('button');more.id='albumMore';more.className='btn secondary';more.textContent=`عرض ${Math.min(PAGE_SIZE,rows.length-state.limit)} صورة إضافية من ${rows.length}`;more.onclick=()=>{state.limit+=PAGE_SIZE;refresh()};holder.appendChild(more);frag.appendChild(holder)}grid.replaceChildren(frag);restoreAlbumView(view)}
function openSheet'''
s2,n=re.subn(pattern,replacement,s,count=1,flags=re.S)
if n!=1: raise SystemExit('refresh function anchor missing')
s=s2

# Rebuild assignments only when bindings/catalog data change.
old_bind="state.bindings=await persistImageBinding(sku,imageKey);state.busy=false;closeSheet();"
new_bind="state.bindings=await persistImageBinding(sku,imageKey);state.assignmentDirty=true;state.busy=false;closeSheet();"
if old_bind not in s: raise SystemExit('bind anchor missing')
s=s.replace(old_bind,new_bind,1)

old_handlers="q.oninput=refresh;skuq.oninput=renderSkus;document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.remove('on'));b.classList.add('on');state.tab=b.dataset.tab;refresh()});"
new_handlers="q.oninput=()=>{state.limit=PAGE_SIZE;clearTimeout(albumSearchTimer);albumSearchTimer=setTimeout(refresh,140)};skuq.oninput=renderSkus;document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.remove('on'));b.classList.add('on');state.tab=b.dataset.tab;state.limit=PAGE_SIZE;refresh()});"
if old_handlers not in s: raise SystemExit('handler anchor missing')
s=s.replace(old_handlers,new_handlers,1)

old_init="state.bindings=bindings;refresh()"
new_init="state.bindings=bindings;state.assignmentDirty=true;refresh()"
if old_init not in s: raise SystemExit('init anchor missing')
s=s.replace(old_init,new_init,1)

# Ensure the common admin interaction layer is loaded on the album page too.
if './v46-admin-nav.js?v=56.53' not in s:
    s=s.replace('</body></html>','<script src="./v46-admin-nav.js?v=56.53"></script></body></html>',1)

p.write_text(s,encoding='utf-8')

Path('tests/v56-54-image-album-performance.mjs').write_text(r'''import fs from 'node:fs';
import assert from 'node:assert/strict';
const s=fs.readFileSync('image-distribution.html','utf8');
assert.ok(s.includes('const PAGE_SIZE=120'),'image album must cap initial DOM work');
assert.ok(s.includes("rows.slice(0,state.limit)"),'image album must render only the visible chunk');
assert.ok(s.includes("id='albumMore'")||s.includes("more.id='albumMore'"),'image album must offer incremental reveal');
assert.ok(s.includes('state.assignmentDirty'),'assignment graph must not rebuild on every search keystroke');
assert.ok(s.includes('ensureAssignment()'),'album assignment cache guard missing');
assert.ok(s.includes('albumSearchTimer=setTimeout(refresh,140)'),'album search must be debounced');
assert.ok(s.includes('captureAlbumView()')&&s.includes('restoreAlbumView(view)'),'album rerenders must preserve page/tab/focus state');
assert.ok(s.includes("decoding=\"async\""),'album images should decode asynchronously');
assert.ok(s.includes('touch-action:pan-x pan-y')&&s.includes('scroll-behavior:auto'),'album horizontal tabs must use native non-jumping scrolling');
assert.ok(s.includes('./v46-admin-nav.js?v=56.53'),'album must load the shared admin interaction layer');
assert.ok(!s.includes('q.oninput=refresh'),'search must not synchronously rebuild the full album per keypress');
console.log('V56.54 image album performance regression: PASS');
''',encoding='utf-8')
print('V56.54 image album performance patch applied')
