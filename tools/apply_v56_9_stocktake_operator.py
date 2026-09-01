from pathlib import Path
import re

stock_path = Path('stocktake.html')
s = stock_path.read_text(encoding='utf-8')

assert 'function resolveStocktakeSearch(raw)' in s, 'V56.8 barcode resolver missing'
assert 'function restoreFilterStrip()' in s, 'V56.8 strip restore missing'
assert 'function render()' in s and 'function bindUi(readonly)' in s, 'stocktake render anchors missing'

STYLE = r'''
<style id="v56-9-operator-ux">
:root{--op-ink:#1c1917;--op-muted:#78716c;--op-line:#e7e5e4;--op-bg:#f7f7f6;--op-soft:#fafaf9;--op-ok:#15803d;--op-ok-bg:#f0fdf4;--op-bad:#b91c1c;--op-bad-bg:#fef2f2;--op-info:#0369a1;--op-info-bg:#f0f9ff}
html,body{background:var(--op-bg);color:var(--op-ink)}
.app{max-width:820px;padding:10px 12px max(32px,env(safe-area-inset-bottom))}
.top{background:rgba(247,247,246,.96);border-bottom:1px solid rgba(231,229,228,.9);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
.head{gap:10px}.back{width:44px;height:44px;border:1px solid var(--op-line);border-radius:12px;background:#fff;box-shadow:none}.title{font-size:20px;line-height:1.35;letter-spacing:0}.sub{font-size:12px;color:var(--op-muted);line-height:1.6}.net{font-size:10px;padding:7px 10px;background:var(--op-ok-bg);color:var(--op-ok)}
.scopeBar,.summaryPanel,.operatorPanel,.completedPanel{background:#fff;border:1px solid var(--op-line);border-radius:18px;box-shadow:0 2px 10px rgba(28,25,23,.035)}
.scopeBar{padding:13px 14px;margin-top:12px}.scopeLabel{font-size:10px;color:var(--op-muted);font-weight:600}.scopeName{font-size:15px;font-weight:700;line-height:1.55;margin-top:2px}.scopeMeta{font-size:11px;color:var(--op-muted);line-height:1.6;margin-top:3px}.testBadge{display:inline-flex;align-items:center;height:24px;padding:0 8px;border-radius:999px;border:1px solid #fde68a;background:#fffbeb;color:#92400e;font-size:10px;font-weight:700;margin-inline-start:6px}
.teamselect{height:46px;border-radius:12px;margin-top:10px}
.summaryPanel{padding:14px;margin-top:12px}.summaryHead{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}.summaryTitle{font-size:14px;font-weight:700}.summaryText{font-size:11px;color:var(--op-muted)}.summaryProgress{font-size:13px;font-weight:700;font-variant-numeric:tabular-nums}
.stats{grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.stat{background:var(--op-soft);border:1px solid var(--op-line);border-radius:12px;padding:9px 5px}.stat b{font-size:19px}.stat span{font-size:9px}.progress{height:6px;background:#efedeb;margin-top:10px}.progress>i{background:var(--op-ok);box-shadow:none}
.operatorPanel{padding:14px;margin-top:12px}.operatorHead{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:10px}.operatorTitle{font-size:16px;font-weight:700}.operatorSub{font-size:11px;color:var(--op-muted);margin-top:2px}.readyBadge{font-size:10px;font-weight:700;color:var(--op-ok);background:var(--op-ok-bg);border:1px solid #dcfce7;border-radius:999px;padding:6px 9px;white-space:nowrap}
.searchWrap{position:relative;margin-top:4px}.searchWrap .search{width:100%;height:52px;border:1px solid var(--op-line);border-radius:12px;background:#fff;padding:0 14px 0 58px;font-size:16px;font-weight:600;box-shadow:none}.searchWrap .search:focus{border-color:#b45309;box-shadow:0 0 0 3px rgba(180,83,9,.07)}
.inventoryScanButton{position:absolute;left:7px;top:50%;transform:translateY(-50%);width:38px;height:38px;display:flex;align-items:center;justify-content:center;border-radius:9px;color:#57534e;background:#fafaf9;border:1px solid var(--op-line);transition:background .15s,border-color .15s,color .15s}.inventoryScanButton:hover,.inventoryScanButton:focus-visible{color:#b45309;border-color:#d6a56b;background:#fff}.inventoryScanButton svg{width:19px;height:19px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.operatorHint{font-size:10.5px;color:var(--op-muted);line-height:1.7;margin-top:8px}.activeResult{margin-top:12px}.searchEmpty{margin-top:12px;padding:22px 14px;border:1px dashed #d6d3d1;border-radius:14px;background:#fcfcfb;text-align:center;color:#a8a29e;font-size:12px;line-height:1.8}
.card{border:1px solid var(--op-line);border-radius:16px;padding:14px;box-shadow:none}.sku{font-size:19px}.name{font-size:12px}.blind{background:#fafaf9;border:1px solid var(--op-line);border-radius:13px;padding:12px;font-size:11px}.blind:before{content:"العد الأول · مخفي";display:block;color:#1c1917;font-weight:700;margin-bottom:3px}.btn.entry{background:#1c1917;border-color:#1c1917;box-shadow:none}.save{background:#1c1917}.scanPrompt,.mission{display:none!important}
.completedPanel{padding:14px;margin-top:12px}.completedHead{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}.completedTitle{font-size:15px;font-weight:700}.completedSub{font-size:10.5px;color:var(--op-muted);margin-top:2px}.completedCount{font-size:11px;color:var(--op-muted);font-variant-numeric:tabular-nums}
.filters{gap:7px;padding:1px 0 8px;scroll-snap-type:x proximity;overscroll-behavior-inline:contain}.chip{scroll-snap-align:center;min-height:38px;padding:0 12px;border-color:var(--op-line);background:#fff;color:#57534e;font-size:11px;box-shadow:none}.chip.active{background:#1c1917;color:#fff;border-color:#1c1917;box-shadow:none}
.completedList{display:grid;gap:7px}.completedRow{display:grid;grid-template-columns:46px minmax(0,1fr) auto;align-items:center;gap:10px;border:1px solid var(--op-line);border-radius:13px;background:#fff;padding:10px}.completedOpen{width:40px;height:40px;border:1px solid var(--op-line);border-radius:10px;background:#fafaf9;color:#57534e;font-size:20px}.completedSku{font-size:15px;font-weight:700;direction:ltr;unicode-bidi:isolate}.completedName{font-size:10.5px;color:var(--op-muted);line-height:1.55;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.completedNumbers{display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin-top:5px}.mini{font-size:9px;padding:3px 6px;border:1px solid var(--op-line);border-radius:999px;background:#fafaf9;color:#57534e;white-space:nowrap}.completedStatus{font-size:10px;font-weight:700;padding:5px 7px;border-radius:999px;white-space:nowrap}.completedStatus.matched{background:var(--op-ok-bg);color:var(--op-ok)}.completedStatus.shortage{background:var(--op-bad-bg);color:var(--op-bad)}.completedStatus.surplus{background:var(--op-info-bg);color:var(--op-info)}.historyMore{width:100%;height:44px;border:1px solid var(--op-line);border-radius:12px;background:#fff;font-size:11px;font-weight:700;margin-top:9px}
@media(max-width:520px){.app{padding-left:10px;padding-right:10px}.title{font-size:19px}.net{padding:6px 8px}.scopeBar,.summaryPanel,.operatorPanel,.completedPanel{border-radius:16px}.summaryPanel,.operatorPanel,.completedPanel{padding:12px}.stats{gap:5px}.stat{padding:8px 3px}.stat b{font-size:18px}.completedRow{grid-template-columns:40px minmax(0,1fr) auto;padding:9px 8px;gap:8px}.completedOpen{width:36px;height:36px}.completedStatus{font-size:9px}.searchWrap .search{height:50px}}
</style>
'''

s = re.sub(r'\n<style id="v56-9-operator-ux">[\s\S]*?</style>\n', '\n', s)
s = s.replace('</head>', STYLE + '\n</head>', 1)

s = s.replace('filterScroll:0,unsubs:[]', 'filterScroll:0,historyVisible:12,unsubs:[]')

NEW_FEEDBACK = r'''let stocktakeAudioCtx=null;
function ensureFeedbackAudio(){try{const A=window.AudioContext||window.webkitAudioContext;if(!A)return null;if(!stocktakeAudioCtx)stocktakeAudioCtx=new A();if(stocktakeAudioCtx.state==='suspended')stocktakeAudioCtx.resume().catch(()=>{});return stocktakeAudioCtx}catch{return null}}
function feedbackTone(freq,duration=.13,delay=0,gainValue=.055){try{const ctx=ensureFeedbackAudio();if(!ctx)return;const o=ctx.createOscillator(),g=ctx.createGain(),t=ctx.currentTime+delay;o.connect(g);g.connect(ctx.destination);o.type='sine';o.frequency.value=freq;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(gainValue,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.start(t);o.stop(t+duration+.025)}catch{}}
function feedback(status,finishedAll=false){try{if(navigator.vibrate)navigator.vibrate(finishedAll?[90,55,90]:(status==='matched'?[40]:[65,45,65]))}catch{}if(finishedAll){feedbackTone(740,.14,0,.06);feedbackTone(990,.18,.16,.06);return}feedbackTone(status==='matched'?880:status==='shortage'?370:560,.14,0,.055)}
window.addEventListener('pointerdown',ensureFeedbackAudio,{passive:true});'''
s, n1 = re.subn(r'function feedback\(status\)\{[\s\S]*?\}\nconst teamMemberIds=', NEW_FEEDBACK + '\nconst teamMemberIds=', s, count=1)
assert n1 == 1, 'feedback replacement failed'

NEW_RENDER = r'''function completedMatches(i){if((i.countStatus||'pending')==='pending')return false;if(state.filter==='matched')return i.countStatus==='matched';if(state.filter==='variance')return ['shortage','surplus'].includes(i.countStatus);if(state.filter==='notes')return Boolean(String(i.note||'').trim());return true}
function recentStamp(i){return Number(i.lastCountAt?.seconds||i.updatedAt?.seconds||i.firstCountAt?.seconds||0)}
function cleanUiName(v){return String(v||'').replace(/^[^\u0600-\u06FFA-Za-z0-9]+/,'').trim()}
function render(){if(!state.control||!canAccess(state.control))return;if(!state.campaign){app.innerHTML=lockHtml('جاري تجهيز حملة الجرد','انتظر لحظات...');return}const teams=accessibleTeams();if(!state.team){app.innerHTML=lockHtml(teams.length?'جاري فتح المجموعة':'لا توجد مجموعة جرد مسندة لك','راجع توزيع لجنة الجرد مع الإدارة.');return}const items=state.items,total=items.length,counted=items.filter(i=>(i.countStatus||'pending')!=='pending').length,pending=total-counted,short=items.filter(i=>i.countStatus==='shortage').length,surplus=items.filter(i=>i.countStatus==='surplus').length,progress=total?Math.round(counted/total*100):0,readonly=state.campaign.status==='closed',active=state.activeEditId?items.find(i=>i.id===state.activeEditId):null,completed=items.filter(completedMatches).sort((a,b)=>recentStamp(b)-recentStamp(a)||(b.orderIndex??0)-(a.orderIndex??0)),historyShown=completed.slice(0,state.historyVisible||12),roster=[...teamMemberNames(state.team),...(state.team.extraMemberNames||[])].filter(Boolean),campaignName=cleanUiName(state.campaign.name||`ملف الجرد لمستودع ${state.campaign.warehouse||''}`),teamName=cleanUiName(state.team.name||'المجموعة'),isTest=Boolean(state.campaign.isTest||state.campaign.testMode||state.campaign.sourceMode==='test');const activeHtml=active?`<div class="activeResult">${cardHtml(active,readonly)}</div>`:(state.search?'<div class="searchEmpty">لم يتم العثور على صنف مطابق. تأكد من رقم الصنف أو امسح الباركود مرة أخرى.</div>':'<div class="searchEmpty">اكتب رقم الصنف أو امسح الباركود. لن تظهر بقية الأصناف هنا حتى لا تربك عملية الجرد.</div>');app.innerHTML=`<div class="top"><div class="head"><button class="back" id="backBtn">‹</button><div class="grow"><div class="title">${esc(campaignName)}</div><div class="sub">${esc(teamName)} · ${esc(state.team.scope||state.team.zone||'بدون نطاق')}</div></div><span class="net ${navigator.onLine?'':'off'}">${navigator.onLine?'متصل':'بدون اتصال'}</span></div></div><div class="scopeBar"><div class="scopeLabel">المجموعة الحالية ${isTest?'<span class="testBadge">وضع اختبار</span>':''}</div><div class="scopeName">${esc(teamName)} · ${esc(state.team.scope||state.team.zone||'بدون نطاق')}</div>${roster.length?`<div class="scopeMeta">عضو اللجنة / المساعد: ${esc(roster.join('، '))}</div>`:''}${teams.length>1?`<select id="teamSelect" class="teamselect">${teams.map(t=>`<option value="${t.id}" ${t.id===state.team.id?'selected':''}>${esc(cleanUiName(t.name))} · ${esc(t.scope||t.zone||'')}</option>`).join('')}</select>`:''}</div><div class="summaryPanel"><div class="summaryHead"><div><div class="summaryTitle">ملخص الجرد</div><div class="summaryText">${counted===total&&total?'اكتملت أصناف المجموعة':`تم ${counted} من ${total} صنف`}</div></div><div class="summaryProgress">${progress}%</div></div><div class="stats"><div class="stat"><b>${total}</b><span>الأصناف</span></div><div class="stat"><b>${counted}</b><span>تم الجرد</span></div><div class="stat"><b>${pending}</b><span>متبقي</span></div><div class="stat"><b>${short+surplus}</b><span>فروقات</span></div></div><div class="progress"><i style="width:${progress}%"></i></div></div><div class="operatorPanel"><div class="operatorHead"><div><div class="operatorTitle">إدخال الجرد</div><div class="operatorSub">رقم الصنف أو الباركود فقط</div></div><span class="readyBadge">${readonly?'مغلق':'جاهز'}</span></div><div class="searchWrap"><input id="search" class="search" value="${esc(state.search)}" inputmode="text" autocomplete="off" placeholder="اكتب رقم الصنف"><button id="scanBtn" class="inventoryScanButton" title="مسح الباركود بالكاميرا" aria-label="مسح الباركود بالكاميرا"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M7 12h10M7 9v6M10 9v6M14 9v6M17 9v6"/></svg></button></div><div class="operatorHint">يمكن مسح الباركود الطويل مباشرة؛ النظام يستخرج رقم الصنف منه تلقائيًا مثل بحث المخزون. كمية النظام تبقى مخفية حتى اعتماد العد الأول.</div>${activeHtml}</div><div class="completedPanel"><div class="completedHead"><div><div class="completedTitle">المنجز حديثًا</div><div class="completedSub">يظهر هنا فقط ما تم جرده ويمكن فتحه للتعديل عند العثور على كمية لاحقًا.</div></div><div class="completedCount">${counted} منجز</div></div><div class="filters">${chip('all','المنجز',counted)}${chip('matched','مطابق',items.filter(i=>i.countStatus==='matched').length)}${chip('variance','الفروقات',short+surplus)}${chip('notes','ملاحظات',items.filter(i=>(i.countStatus||'pending')!=='pending'&&String(i.note||'').trim()).length)}</div><div class="completedList">${historyShown.length?historyShown.map(completedCardHtml).join(''):'<div class="empty">لا توجد أصناف منجزة ضمن هذا القسم بعد.</div>'}</div>${historyShown.length<completed.length?'<button id="loadMoreHistory" class="historyMore">إظهار المزيد</button>':''}</div>`;bindUi(readonly);restoreFilterStrip();if(state.activeEditId)setTimeout(()=>{const el=$(`#actual_${CSS.escape(state.activeEditId)}`);if(el){el.focus();el.select();el.scrollIntoView({block:'center',behavior:'smooth'})}},50)}
function chip(id,label,count){return `<button class="chip ${state.filter===id?'active':''}" data-filter="${id}">${label} <span>${count}</span></button>`}
function completedCardHtml(i){const st=i.countStatus||'pending',diff=Number(i.actualQty)-Number(i.expectedQty);return `<article class="completedRow"><button class="completedOpen" data-open="${i.id}" aria-label="فتح الصنف">‹</button><div><div class="completedSku">${esc(i.sku)}</div><div class="completedName">${esc(i.name||'')}${i.pack!==''&&i.pack!=null?` · الشد: ${esc(i.pack)}`:''}</div><div class="completedNumbers"><span class="mini">الفعلي ${fmt(i.actualQty)}</span><span class="mini">النظام ${fmt(i.expectedQty)}</span><span class="mini">الفرق ${diff>0?'+':''}${fmt(diff)}</span>${i.note?'<span class="mini">ملاحظة</span>':''}</div></div><span class="completedStatus ${st}">${statusLabel(st)}</span></article>`}'''
s, n2 = re.subn(r'function render\(\)\{[\s\S]*?\}\nfunction chip\(id,label,count\)\{[\s\S]*?\}\nfunction cardHtml', NEW_RENDER + '\nfunction cardHtml', s, count=1)
assert n2 == 1, 'render replacement failed'

NEW_BIND = r'''function bindUi(readonly){$('#backBtn')?.addEventListener('click',()=>location.href='./index.html?employee=1');$('#teamSelect')?.addEventListener('change',e=>{state.activeEditId='';state.search='';state.historyVisible=12;pickTeam(e.target.value)});document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{const strip=b.closest('.filters');if(strip)state.filterScroll=strip.scrollLeft;state.filter=b.dataset.filter;state.historyVisible=12;render()});const se=$('#search');if(se){se.oninput=e=>{const resolved=resolveStocktakeSearch(e.target.value);state.search=e.target.value;state.activeEditId=resolved.item?.id||'';if(resolved.item&&resolved.fromBarcode)state.search=resolved.query;render();const next=$('#search');if(next&&!state.activeEditId){next.focus();try{next.setSelectionRange(next.value.length,next.value.length)}catch{}}};se.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();const resolved=resolveStocktakeSearch(se.value);if(resolved.item){state.search=resolved.query;state.activeEditId=resolved.item.id;render()}else toast('لم يتم العثور على الصنف')}}}$('#scanBtn')?.addEventListener('click',()=>{ensureFeedbackAudio();startScanner()});$('#loadMoreHistory')?.addEventListener('click',()=>{state.historyVisible=(state.historyVisible||12)+12;render()});document.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>{state.activeEditId=b.dataset.open;state.search=String(state.items.find(i=>i.id===b.dataset.open)?.sku||'');render()});if(readonly)return;document.querySelectorAll('[data-entry]').forEach(b=>b.onclick=()=>{ensureFeedbackAudio();state.activeEditId=b.dataset.entry;render()});document.querySelectorAll('[data-save]').forEach(b=>b.onclick=()=>saveActual(b.dataset.save));document.querySelectorAll('[data-note]').forEach(b=>b.onclick=()=>openNote(b.dataset.note));document.querySelectorAll('[data-found]').forEach(b=>b.onclick=()=>openFound(b.dataset.found));document.querySelectorAll('.actual').forEach(inp=>inp.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();const id=inp.id.replace('actual_','');saveActual(id)}})}'''
s, n3 = re.subn(r'function bindUi\(readonly\)\{[\s\S]*?\}\nasync function writeCount', NEW_BIND + '\nasync function writeCount', s, count=1)
assert n3 == 1, 'bindUi replacement failed'

NEW_WRITE = r'''async function writeCount(item,actual,source){if(state.campaign?.status==='closed')return toast('الحملة مغلقة');if(!Number.isFinite(actual)||actual<0)return toast('أدخل كمية صحيحة');const wasCounted=(item.countStatus||'pending')!=='pending',before={actualQty:item.actualQty??null,countStatus:item.countStatus||'pending',difference:item.difference??null,note:item.note||'',revision:item.revision||0},status=statusOf(actual,item.expectedQty),difference=actual-Number(item.expectedQty),now=firebase.firestore.FieldValue.serverTimestamp(),patch={actualQty:actual,countStatus:status,difference,counted:true,updatedAt:now,lastCountAt:now,updatedByEmployeeId:user.employeeId||ROOT_ID,updatedByName:user.name,revision:firebase.firestore.FieldValue.increment(1),lastInputSource:source};if(!wasCounted){patch.firstCountAt=now;patch.firstCountByEmployeeId=user.employeeId||ROOT_ID;patch.firstCountByName=user.name}try{const batch=db.batch();batch.set(db.collection('stocktake_items').doc(item.id),patch,{merge:true});batch.set(db.collection('stocktake_audit').doc(),{campaignId:item.campaignId,teamId:item.teamId,itemId:item.id,sku:item.sku,action:wasCounted?'count_revised':'count_created',before,after:{actualQty:actual,countStatus:status,difference},actorEmployeeId:user.employeeId||ROOT_ID,actorName:user.name,createdAt:now,source,userAgent:navigator.userAgent||''});await batch.commit();const finishedAll=!wasCounted&&state.items.length>0&&state.items.every(i=>i.id===item.id||(i.countStatus||'pending')!=='pending');feedback(status,finishedAll);toast(finishedAll?'تم إنهاء جميع أصناف المجموعة':status==='matched'?'تم الاعتماد · مطابق':status==='shortage'?`تم الاعتماد · نقص ${fmt(Math.abs(difference))}`:`تم الاعتماد · زيادة ${fmt(difference)}`);state.activeEditId='';state.search='';setTimeout(()=>$('#search')?.focus(),80);return true}catch(e){console.error(e);toast('تعذر الحفظ، حاول مرة أخرى');return false}}'''
s, n4 = re.subn(r'async function writeCount\(item,actual,source\)\{[\s\S]*?\}\nfunction saveActual', NEW_WRITE + '\nfunction saveActual', s, count=1)
assert n4 == 1, 'writeCount replacement failed'
s = s.replace("function saveActual(id){const it=state.items.find(x=>x.id===id),inp=$(`#actual_${CSS.escape(id)}`);if(!it||!inp)return;writeCount", "function saveActual(id){ensureFeedbackAudio();const it=state.items.find(x=>x.id===id),inp=$(`#actual_${CSS.escape(id)}`);if(!it||!inp)return;writeCount", 1)

# Keep the proven V56.8 resolver/scanner cadence but unlock audio before scanning.
s = s.replace("async function startScanner(){if(state.scanner)return;", "async function startScanner(){ensureFeedbackAudio();if(state.scanner)return;", 1)

stock_path.write_text(s, encoding='utf-8')

shell_path = Path('admin-stocktake-shell.html')
shell = shell_path.read_text(encoding='utf-8').replace('stocktake.html?v=56.8','stocktake.html?v=56.9')
shell_path.write_text(shell, encoding='utf-8')

# Update existing regressions to the new employee cache key and V56.9 operator contract.
p = Path('tests/v56-5-stocktake-direct-mobile.mjs')
t = p.read_text(encoding='utf-8').replace("shellHas('stocktake.html?v=56.8','employee stocktake link must use the current V56.8 cache key');", "shellHas('stocktake.html?v=56.9','employee stocktake link must use the current V56.9 cache key');")
p.write_text(t, encoding='utf-8')

p = Path('tests/v56-8-stocktake-field-ux.mjs')
t = r'''import fs from 'node:fs';
import assert from 'node:assert/strict';
const employee=fs.readFileSync('stocktake.html','utf8');
const admin=fs.readFileSync('admin-stocktake.html','utf8');
const shell=fs.readFileSync('admin-stocktake-shell.html','utf8');
const has=(src,x,m)=>assert.ok(src.includes(x),m||`missing ${x}`);

has(employee,"filterScroll:0",'employee filter strip needs persistent scroll state');
has(employee,'function restoreFilterStrip()','employee filter strip must restore after rerender');
has(employee,"b.closest('.filters')",'employee filter click must capture strip position before rerender');
has(admin,"tabScroll:0",'admin tabs need persistent scroll state');
has(admin,'function restoreAdminTabs()','admin tabs must restore after rerender');
has(admin,"b.closest('.tabs')",'admin tab click must capture strip position before rerender');

has(employee,'function cleanDigits(value)','stocktake must normalize numeric barcode content');
has(employee,'function resolveStocktakeSearch(raw)','stocktake must resolve scanned barcodes to SKUs');
has(employee,'clean.includes(d)','barcode must support SKU embedded inside a long barcode');
has(employee,'cleanDigits(b.sku).length-cleanDigits(a.sku).length','embedded barcode resolution must prefer the longest SKU match');
has(employee,'const resolved=resolveStocktakeSearch(value)','camera scanner must use the same barcode resolver');
has(employee,'const resolved=resolveStocktakeSearch(e.target.value)','manual/pasted barcode search must use the same resolver');
has(employee,'fps:10','scanner must retain the proven inventory scanning cadence');
has(employee,'disableFlip:true','scanner must retain proven decode behavior');

has(employee,'id="v56-9-operator-ux"','employee stocktake must use the V56.9 operator UX');
has(employee,'class="searchWrap"','scanner/search control must mirror inventory search composition');
has(employee,'class="inventoryScanButton"','scanner must be an embedded icon button, not a separate oversized CTA');
has(employee,'المنجز حديثًا','completed items must be separated from the active count flow');
has(employee,'لن تظهر بقية الأصناف هنا','pending inventory must not be dumped below the search field');
has(employee,'function completedCardHtml','completed items must use compact operator rows');
has(employee,'let stocktakeAudioCtx=null','audio context must persist across asynchronous Firestore save');
has(employee,'function ensureFeedbackAudio()','audio must be unlocked from a user gesture');
has(employee,"window.addEventListener('pointerdown',ensureFeedbackAudio",'audio context must be primed before async save');
has(employee,'feedback(status,finishedAll)','save must trigger sound/haptic feedback after success');
has(employee,'العد الأول أعمى','blind-count control must remain intact');
has(employee,'كمية النظام تبقى مخفية حتى اعتماد العد الأول','expected quantity must remain hidden before first count');
assert.ok(!employee.includes('class="panel mission"'),'AI-like dark mission scoreboard must be removed from employee render');
has(admin,'id="v56-8-admin-polish"','admin stocktake should retain its proven responsive polish');
has(shell,'stocktake.html?v=56.9','employee stocktake cache key must be V56.9');
has(shell,'admin-stocktake.html?embedded=1&v=56.8','admin stocktake cache key remains V56.8');

console.log('V56.9 stocktake operator UX + barcode parity + feedback regression: OK');
'''
p.write_text(t, encoding='utf-8')

print('V56.9 stocktake operator patch applied')
