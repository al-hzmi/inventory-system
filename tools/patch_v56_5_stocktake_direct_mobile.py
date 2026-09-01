from pathlib import Path
import re

ADMIN = Path('admin-stocktake.html')
SHELL = Path('admin-stocktake-shell.html')
TEST = Path('tests/v56-5-stocktake-direct-mobile.mjs')
REGRESSION = Path('.github/workflows/v56-3-stocktake-regression.yml')

admin = ADMIN.read_text(encoding='utf-8')
shell = SHELL.read_text(encoding='utf-8')
regression = REGRESSION.read_text(encoding='utf-8')


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, found {count}')
    return text.replace(old, new, 1)


def replace_regex(text, pattern, repl, label):
    out, count = re.subn(pattern, repl, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one regex match, found {count}')
    return out


# ---------------------------------------------------------------------------
# Mobile-first admin presentation. Desktop remains intact above 720px.
# ---------------------------------------------------------------------------
mobile_css = r'''
.mobileOnly{display:none}.campaignActions,.reportActions{align-items:stretch}.moreActions{margin-top:9px}.moreActions summary{cursor:pointer;font-size:11px;font-weight:700;color:var(--s);padding:9px 0}.reviewTable,.auditTable{width:100%}
@media(max-width:719px){
html,body{overflow-x:hidden}.wrap{max-width:100%;padding:8px 8px 28px}.grid{gap:9px}.g2{display:flex;flex-direction:column}.campaignSummaryPanel{order:1}.campaignListPanel{order:2}.panel{padding:13px;border-radius:14px}.panel h2{font-size:18px;line-height:1.45}.panel h3{font-size:16px;line-height:1.5}.title{font-size:19px}.sub{font-size:12px}.muted,.roster,.success,.warning{font-size:13px;line-height:1.65}.success,.warning{padding:11px}.row{gap:7px}.btn{min-height:44px;height:auto;padding:10px 12px;font-size:13px;line-height:1.3}.pill{font-size:11px;padding:6px 9px}.stats{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.stat{padding:11px 7px}.stat b{font-size:22px}.stat span{font-size:12px}.campaignActions{display:grid;grid-template-columns:1fr 1fr;width:100%}.campaignActions .btn{width:100%}.campaignActions #activateCampaign,.campaignActions #closeCampaign{grid-column:1/-1}.moreActions{border-top:1px solid var(--b);margin-top:12px}.moreActions summary{font-size:13px;padding:11px 0}.reportActions{display:grid;grid-template-columns:1fr 1fr}.reportActions .btn{width:100%}.campaigns{max-height:250px;overflow:auto;padding-left:1px}.card{padding:12px}.card b{font-size:15px!important}.tabs{margin:10px 0;gap:6px}.tab{height:42px;font-size:12px;padding:0 11px}.input,.select{height:48px}.textarea{min-height:105px}.field label{font-size:13px;margin-bottom:6px}.members{grid-template-columns:1fr;max-height:310px}.members label{font-size:13px;padding:10px}.mapgrid{grid-template-columns:1fr}.modal{padding:17px 14px max(20px,env(safe-area-inset-bottom))}.modal h3{font-size:18px}.modalactions button{min-height:46px;font-size:14px}#reviewSearch{max-width:none!important;height:48px;margin-top:7px}.tablewrap.reviewTable,.tablewrap.auditTable{border:0;background:transparent;overflow:visible}.reviewTable .table,.auditTable .table{min-width:0;display:block}.reviewTable thead,.auditTable thead{display:none}.reviewTable tbody,.auditTable tbody{display:grid;gap:9px}.reviewTable tr,.auditTable tr{display:grid;background:#fff;border:1px solid var(--b);border-radius:14px;padding:12px;gap:9px}.reviewTable tr{grid-template-columns:repeat(2,minmax(0,1fr))}.reviewTable td,.auditTable td{display:block;border:0;padding:0;white-space:normal;min-width:0;font-size:13px}.reviewTable td:nth-child(2),.reviewTable td:nth-child(4),.reviewTable td:nth-child(10),.reviewTable td:nth-child(11){display:none}.reviewTable td:nth-child(3){grid-column:1/-1;font-size:15px}.reviewTable td:nth-child(8){display:flex;align-items:flex-end}.reviewTable td:nth-child(9){grid-column:1/-1;max-width:none!important}.reviewTable td:nth-child(1)::before,.reviewTable td:nth-child(5)::before,.reviewTable td:nth-child(6)::before,.reviewTable td:nth-child(7)::before,.reviewTable td:nth-child(8)::before,.reviewTable td:nth-child(9)::before,.auditTable td:nth-child(1)::before,.auditTable td:nth-child(2)::before,.auditTable td:nth-child(3)::before,.auditTable td:nth-child(4)::before{display:block;font-size:10px;color:var(--m);font-weight:600;margin-bottom:3px}.reviewTable td:nth-child(1)::before{content:"المجموعة"}.reviewTable td:nth-child(5)::before{content:"كمية النظام"}.reviewTable td:nth-child(6)::before{content:"الفعلي"}.reviewTable td:nth-child(7)::before{content:"الفرق"}.reviewTable td:nth-child(8)::before{content:"الحالة";margin-left:6px}.reviewTable td:nth-child(9)::before{content:"الملاحظة"}.auditTable tr{grid-template-columns:repeat(2,minmax(0,1fr))}.auditTable td:nth-child(5),.auditTable td:nth-child(6){display:none}.auditTable td:nth-child(3),.auditTable td:nth-child(4){grid-column:1/-1}.auditTable td:nth-child(1)::before{content:"الوقت"}.auditTable td:nth-child(2)::before{content:"الصنف"}.auditTable td:nth-child(3)::before{content:"الحركة"}.auditTable td:nth-child(4)::before{content:"بواسطة"}.note{max-width:none}.toast{font-size:13px;max-width:94%}.empty{font-size:13px;padding:28px 12px}
}
'''
admin = replace_once(admin, '@media(min-width:720px){', mobile_css + '\n@media(min-width:720px){', 'insert mobile CSS')

admin = replace_once(
    admin,
    '<div class="sub">ملف الجرد · لجان الجرد · ملفات Excel · الفروقات والتسوية</div>',
    '<div class="sub">الجرد من المخزون الحالي · اللجان · الفروقات والتسوية</div>',
    'admin subtitle',
)

old_modal = '<div id="campaignModal" class="modalbg"><div class="modal"><h3>إنشاء ملف جرد</h3><div class="fields"><div class="field"><label>المستودع</label><input id="campaignWarehouse" class="input" placeholder="جدة"></div><div class="field"><label>تاريخ الجرد</label><input id="campaignDate" class="input" type="date"></div><div class="field" style="grid-column:1/-1"><label>اسم الملف</label><input id="campaignName" class="input" placeholder="سيُقترح تلقائيًا: ملف الجرد لمستودع جدة"></div></div><div class="modalactions"><button id="campaignCancel" class="btn">إلغاء</button><button id="campaignCreate" class="btn primary">إنشاء ملف الجرد</button></div></div></div>'
new_modal = '<div id="campaignModal" class="modalbg"><div class="modal"><h3>إنشاء جرد من المخزون الحالي</h3><div class="success">لا تحتاج Excel. اختر المستودع بعد آخر تحديث مسائي أو تحديث الصباح، وسيأخذ النظام لقطة ثابتة من المخزون الحالي لحظة الإنشاء.</div><div class="fields section"><div class="field"><label>المستودع</label><select id="campaignWarehouse" class="select"><option value="jeddah">مخزون جدة</option><option value="riyadh">مخزون الرياض</option></select></div><div class="field"><label>تاريخ الجرد</label><input id="campaignDate" class="input" type="date"></div><div class="field" style="grid-column:1/-1"><label>اسم الجرد (اختياري)</label><input id="campaignName" class="input" placeholder="مثال: جرد جدة الصباحي"></div></div><div class="modalactions"><button id="campaignCancel" class="btn">إلغاء</button><button id="campaignCreate" class="btn primary">أخذ لقطة وإنشاء الجرد</button></div></div></div>'
admin = replace_once(admin, old_modal, new_modal, 'campaign modal')

admin = replace_once(admin, "$('#employeeView').onclick=()=>location.href='./stocktake.html?v=56.0';", "$('#employeeView').onclick=()=>location.href='./stocktake.html?v=56.5';", 'employee view cache bust')
admin = replace_once(admin, '<section class="panel">${campaignsHtml(cp)}</section><section class="panel">', '<section class="panel campaignListPanel">${campaignsHtml(cp)}</section><section class="panel campaignSummaryPanel">', 'mobile panel ordering')

campaigns_fn = r'''function campaignsHtml(cp){return `<div class="row"><div class="grow"><h2>ملفات الجرد</h2><div class="muted">أنشئ الجرد بعد تحديث المخزون ليلًا أو صباحًا. النظام يأخذ لقطة مباشرة من المخزون الحالي ولا يطلب ملف Excel.</div></div><button id="testCampaign" class="btn info">🧪 تجربة</button><button id="newCampaign" class="btn primary">+ جرد جديد</button></div><div class="campaigns section">${state.campaigns.length?state.campaigns.slice(0,10).map(c=>`<button data-campaign="${c.id}" class="card ${cp?.id===c.id?'active':''}" style="text-align:right"><div class="cardtop"><div class="grow"><b style="font-size:12px">${esc(c.name||`ملف الجرد لمستودع ${c.warehouse||''}`)}</b><div class="muted">${esc(c.warehouse||'—')} · ${esc(c.stocktakeDate||'بدون تاريخ')}</div></div>${c.isTest?'<span class="pill info">اختبار</span>':''}${c.sourceMode==='current_inventory'&&!c.isTest?'<span class="pill ok">مخزون حالي</span>':''}<span class="pill ${c.status==='active'?'ok':c.status==='closed'?'bad':c.status==='ready'?'info':''}">${campaignStatus(c.status)}</span></div></button>`).join(''):'<div class="empty">لا توجد ملفات جرد بعد.</div>'}</div>`}'''
admin = replace_regex(admin, r'function campaignsHtml\(cp\)\{[^\n]*\}', campaign_fn := campaigns_fn, 'campaignsHtml')

summary_fn = r'''function campaignSummary(cp,total,counted,pending,matched,short,surplus,notes){const direct=cp.sourceMode==='current_inventory';return `<div class="row"><div class="grow"><h2>${esc(cp.name||`ملف الجرد لمستودع ${cp.warehouse||''}`)}</h2><div class="muted">${esc(cp.warehouse||'—')} · تاريخ ${esc(cp.stocktakeDate||'—')} · ${campaignStatus(cp.status)}</div></div><span class="pill ${cp.status==='active'?'ok':cp.status==='closed'?'bad':cp.status==='ready'?'info':''}">${campaignStatus(cp.status)}</span></div><div class="stats section">${stat('الأصناف',total)}${stat('تم الجرد',counted)}${stat('متبقي',pending)}${stat('مطابق',matched)}${stat('نواقص',short)}${stat('زيادات',surplus)}</div>${direct?`<div class="success section">${cp.isTest?'🧪 تجربة':'✓ المصدر: المخزون الحالي مباشرة'} · لقطة الكميات ثابتة لهذا الجرد · لا يحتاج رفع Excel.</div>`:''}<div class="row section campaignActions"><button id="markReady" class="btn info" ${!['draft','ready'].includes(cp.status)||cp.status==='ready'?'disabled':''}>اعتماد التجهيز</button><button id="activateCampaign" class="btn ok" ${cp.status==='active'||cp.status==='closed'?'disabled':''}>بدء الجرد الآن</button><button id="closeCampaign" class="btn bad" ${cp.status!=='active'?'disabled':''}>${cp.isTest?'إنهاء التجربة':'إنهاء الجرد وإرساله للتسوية'}</button></div><details class="moreActions"><summary>التقارير والتصدير</summary><div class="row reportActions">${cp.status==='closed'?'<button id="reopenCampaign" class="btn">إعادة فتح الجرد</button>':''}<button id="printReport" class="btn">طباعة محضر الجرد</button><button id="exportDiff" class="btn bad">Excel الفروقات</button><button id="exportAll" class="btn info">Excel كامل</button></div></details><div class="muted section">لا يوجد أي تعديل تلقائي للمخزون. النتائج هنا مرجع للمحاسب فقط، والتسوية الفعلية تبقى من صلاحيات المحاسب في النظام المحاسبي.</div>`}'''
admin = replace_regex(admin, r'function campaignSummary\(cp,total,counted,pending,matched,short,surplus,notes\)\{[^\n]*\}', summary_fn, 'campaignSummary')

teams_fn = r'''function teamsHtml(cp){const canEdit=cp.status!=='closed',direct=cp.sourceMode==='current_inventory';return `<div class="section"><div class="row"><div class="grow"><h3>لجان / مجموعة الجرد</h3><div class="muted">${direct?'في الجرد المباشر توجد مجموعة موحدة لكل مخزون المستودع لمنع تكرار الصنف بين اللجان. عدّل أعضاء اللجنة والمساعدين والنطاق عند الحاجة.':'كل مجموعة لها نطاق حر وملف Excel مستقل. عدد الأعضاء غير محدود ولا توجد مسميات إلزامية داخل المجموعة.'}</div></div>${direct?'':`<button id="newTeam" class="btn" ${canEdit?'':'disabled'}>+ مجموعة</button>`}</div><div class="teams section">${state.teams.length?state.teams.map(t=>{const its=state.items.filter(i=>i.teamId===t.id),done=its.filter(i=>(i.countStatus||'pending')!=='pending').length,p=its.length?Math.round(done/its.length*100):0,v=its.filter(i=>['shortage','surplus'].includes(i.countStatus)).length;return `<div class="card"><div class="cardtop"><div class="grow"><b style="font-size:12px">${esc(t.name)}</b><div class="muted">${esc(t.scope||t.zone||'بدون نطاق')}</div><div class="roster">عضو اللجنة / المساعد: ${teamRoster(t).length?esc(teamRoster(t).join('، ')):'لم يحدد أعضاء بعد'}</div></div><span class="pill ${p===100&&its.length?'ok':''}">${done}/${its.length}</span></div><div class="progress"><i style="width:${p}%"></i></div><div class="row" style="margin-top:8px"><span class="pill">${p}%</span>${v?`<span class="pill bad">${v} فروقات</span>`:''}<button data-edit-team="${t.id}" class="btn" ${canEdit?'':'disabled'}>تعديل الأعضاء والنطاق</button>${!direct&&['draft','ready'].includes(cp.status)?`<button data-delete-team="${t.id}" class="btn bad">حذف</button>`:''}</div></div>`}).join(''):'<div class="empty">لم تتم إضافة مجموعات بعد.</div>'}</div></div>`}'''
admin = replace_regex(admin, r'function teamsHtml\(cp\)\{[^\n]*\}', teams_fn, 'teamsHtml')

admin = replace_once(
    admin,
    "function importHtml(cp){if(cp.isTest)return '<div class=\"success section\">🧪 أصناف هذه التجربة مأخوذة تلقائيًا من المخزون الحالي؛ رفع Excel غير مطلوب في وضع الاختبار.</div>';",
    "function importHtml(cp){if(cp.sourceMode==='current_inventory')return '<div class=\"success section\">✓ أصناف الجرد مأخوذة تلقائيًا من لقطة المخزون الحالي؛ لا يوجد ملف Excel مطلوب للإدخال.</div>';if(cp.isTest)return '<div class=\"success section\">🧪 أصناف هذه التجربة مأخوذة تلقائيًا من المخزون الحالي؛ رفع Excel غير مطلوب في وضع الاختبار.</div>';",
    'direct inventory bypasses Excel',
)

admin = replace_once(admin, "state.tab==='audit'?auditHtml():`<div class=\"tablewrap\"><table class=\"table\">", "state.tab==='audit'?auditHtml():`<div class=\"tablewrap reviewTable\"><table class=\"table\">", 'review mobile table class')
admin = replace_once(admin, 'return `<div class="tablewrap"><table class="table"><thead><tr><th>الوقت</th>', 'return `<div class="tablewrap auditTable"><table class="table"><thead><tr><th>الوقت</th>', 'audit mobile table class')

# ---------------------------------------------------------------------------
# Real campaigns now freeze the current inventory source directly.
# Legacy Excel import functions are retained only for historical campaigns.
# ---------------------------------------------------------------------------
new_campaign_block = r'''function openCampaignModal(){const d=new Date(Date.now()+3*3600*1000).toISOString().slice(0,10);$('#campaignDate').value=d;$('#campaignWarehouse').value='jeddah';$('#campaignName').value='';$('#campaignModal').classList.add('open');setTimeout(()=>$('#campaignWarehouse').focus(),60)}
$('#campaignCancel').onclick=()=>$('#campaignModal').classList.remove('open');$('#campaignModal').onclick=e=>{if(e.target.id==='campaignModal')$('#campaignCancel').click()};$('#campaignCreate').onclick=()=>createCurrentInventoryCampaign();
async function cleanupCurrentInventoryCampaign(campaignId,teamId){try{const snap=await db.collection('stocktake_items').where('campaignId','==',campaignId).get(),docs=snap.docs;for(let x=0;x<docs.length;x+=400){const b=db.batch();docs.slice(x,x+400).forEach(d=>b.delete(d.ref));await b.commit()}if(teamId)await db.collection('stocktake_teams').doc(teamId).delete().catch(()=>{});if(campaignId)await db.collection('stocktake_campaigns').doc(campaignId).delete().catch(()=>{})}catch(e){console.error('[stocktake cleanup]',e)}}
async function createCurrentInventoryCampaign(){const key=$('#campaignWarehouse').value,source=INVENTORY_SOURCES[key]||INVENTORY_SOURCES.jeddah,stocktakeDate=$('#campaignDate').value,name=$('#campaignName').value.trim()||`جرد ${source.label} — ${stocktakeDate}`,button=$('#campaignCreate');if(!stocktakeDate)return toast('حدد تاريخ الجرد');if(activeStocktakeCampaign())return toast('أنه الجرد النشط أولًا قبل أخذ لقطة جديدة');button.disabled=true;button.textContent='جاري أخذ لقطة المخزون...';let campaignRef=null,teamRef=null;try{const response=await fetch(`${source.url}?stocktake=${Date.now()}`,{cache:'no-store'});if(!response.ok)throw new Error(`INVENTORY_HTTP_${response.status}`);const rows=parseTestInventoryTsv(await response.text());if(!rows.length)throw new Error('NO_INVENTORY_ROWS');const seen=new Set();for(const r of rows){const k=norm(r.sku);if(seen.has(k))throw new Error('DUPLICATE_INVENTORY_SKU');seen.add(k)}campaignRef=db.collection('stocktake_campaigns').doc();teamRef=db.collection('stocktake_teams').doc();const now=firebase.firestore.FieldValue.serverTimestamp(),scope=`كامل مخزون ${source.label}`,campaignPayload={name,warehouse:source.label,stocktakeDate,status:'building',sourceMode:'current_inventory',inventorySourceKey:key,snapshotItemCount:rows.length,snapshotComplete:false,singleTeamMode:true,schemaVersion:3,createdAt:now,createdBy:'مهند'},teamPayload={campaignId:campaignRef.id,name:`مجموعة الجرد — ${source.label}`,scope,zone:scope,memberEmployeeIds:[ROOT_ID],memberEmployeeNames:['مهند'],extraMemberNames:[],status:'active',sourceMode:'current_inventory',singleTeamMode:true,orderIndex:0,updatedAt:now,updatedBy:'مهند',createdAt:now,createdBy:'مهند',schemaVersion:3},head=db.batch();head.set(campaignRef,campaignPayload);head.set(teamRef,teamPayload);await head.commit();for(let x=0;x<rows.length;x+=350){const b=db.batch();rows.slice(x,x+350).forEach((r,j)=>b.set(db.collection('stocktake_items').doc(itemId(campaignRef.id,r.sku)),{campaignId:campaignRef.id,campaignName:name,teamId:teamRef.id,teamName:teamPayload.name,scope,zone:scope,sku:r.sku,normalizedSku:norm(r.sku),name:r.name,expectedQty:Number(r.qty),pack:r.pack,countStatus:'pending',actualQty:null,difference:null,note:'',hasNote:false,revision:0,orderIndex:x+j,updatedAt:now,importedAt:now,importedBy:'مهند',importFileName:'',sourceMode:'current_inventory',schemaVersion:3}));await b.commit()}await campaignRef.set({status:'draft',snapshotComplete:true,snapshotCapturedAt:firebase.firestore.FieldValue.serverTimestamp(),snapshotItemCount:rows.length},{merge:true});state.campaign={id:campaignRef.id,...campaignPayload,status:'draft',snapshotComplete:true};state.import={file:null,rows:[],headers:[],map:{sku:'',qty:'',pack:'',name:''},teamId:'',errors:[],headerRow:0};$('#campaignCancel').click();bindSelected();render();await auditAdmin('campaign_created',{campaignId:campaignRef.id,name,warehouse:source.label,stocktakeDate,sourceMode:'current_inventory',snapshotItemCount:rows.length});toast(`تم إنشاء جرد ${source.label}: ${rows.length} صنف من المخزون الحالي`)}catch(e){console.error(e);if(campaignRef)await cleanupCurrentInventoryCampaign(campaignRef.id,teamRef?.id||'');toast(e.message==='NO_INVENTORY_ROWS'?'لا توجد أصناف صالحة في المخزون الحالي':e.message==='DUPLICATE_INVENTORY_SKU'?'تعذر الإنشاء: يوجد رقم صنف مكرر في مصدر المخزون':'تعذر أخذ لقطة المخزون الحالية')}finally{button.disabled=false;button.textContent='أخذ لقطة وإنشاء الجرد'}}
function openTeam(id)'''
admin = replace_regex(admin, r'function openCampaignModal\(\)\{[\s\S]*?\nfunction openTeam\(id\)', new_campaign_block, 'real campaign creation')

admin = replace_once(
    admin,
    "const TEST_INVENTORY_SOURCES={jeddah:{label:'جدة',url:'./data/jeddah.tsv'},riyadh:{label:'الرياض',url:'./data/riyadh.tsv'}};",
    "const INVENTORY_SOURCES={jeddah:{label:'جدة',url:'./data/jeddah.tsv'},riyadh:{label:'الرياض',url:'./data/riyadh.tsv'}};const TEST_INVENTORY_SOURCES=INVENTORY_SOURCES;",
    'inventory source aliases',
)

readiness_fn = r'''function campaignReadiness(){const problems=[];if(state.campaign?.sourceMode==='current_inventory'&&!state.campaign?.snapshotComplete)problems.push('لقطة المخزون لم تكتمل');if(!state.teams.length)problems.push('لا توجد مجموعات');for(const t of state.teams){const count=state.items.filter(i=>i.teamId===t.id).length;if(!count)problems.push(state.campaign?.sourceMode==='current_inventory'?`${t.name}: لا توجد أصناف في لقطة المخزون`:state.campaign?.isTest?`${t.name}: لا توجد أصناف اختبار`:`${t.name}: لم يرفع ملف Excel`);if(!teamIds(t).length)problems.push(`${t.name}: لا يوجد عضو صاحب حساب يستطيع التسجيل`)}return problems}'''
admin = replace_regex(admin, r'function campaignReadiness\(\)\{[^\n]*\}', readiness_fn, 'campaign readiness')

old_start = "const startMessage=state.campaign.isTest?'بدء تجربة الجرد الآن؟ ستستخدم نفس واجهة الجرد الحقيقية، لكن الحملة موسومة كتجربة ولا تغيّر المخزون الحقيقي.':'بدء الجرد الآن؟ ستظهر الميزة لأعضاء اللجان أصحاب الحسابات وتثبت ملفات Excel كمرجع للجرد.';"
new_start = "const startMessage=state.campaign.isTest?'بدء تجربة الجرد الآن؟ ستستخدم نفس واجهة الجرد الحقيقية، لكن الحملة موسومة كتجربة ولا تغيّر المخزون الحقيقي.':state.campaign.sourceMode==='current_inventory'?'بدء الجرد الآن؟ ستظهر الميزة لأعضاء اللجنة وتبقى لقطة المخزون التي أُخذت عند إنشاء الجرد هي المرجع الثابت للمقارنة.':'بدء الجرد الآن؟ ستظهر الميزة لأعضاء اللجان أصحاب الحسابات وتثبت ملفات Excel كمرجع للجرد.';"
admin = replace_once(admin, old_start, new_start, 'activate direct source message')

# ---------------------------------------------------------------------------
# Shell: larger mobile controls and cache-bust the new stocktake UI.
# ---------------------------------------------------------------------------
shell = replace_once(shell, 'href="./stocktake.html?v=56.0"', 'href="./stocktake.html?v=56.5"', 'shell employee link')
shell = replace_once(shell, 'src="./admin-stocktake.html?embedded=1&v=56.0"', 'src="./admin-stocktake.html?embedded=1&v=56.5"', 'shell admin frame')
shell = replace_once(
    shell,
    '@media(max-width:780px){.context{height:48px}.context span{display:none}.frame{height:calc(100dvh - var(--v51-shell-h,108px) - 48px)}}',
    '@media(max-width:780px){.context{height:54px;padding:0 12px}.context b{font-size:16px}.context span{display:none}.action{height:40px;padding:0 12px;font-size:13px}.frame{height:calc(100dvh - var(--v51-shell-h,108px) - 54px)}}',
    'shell mobile sizes',
)

# ---------------------------------------------------------------------------
# Persistent regression coverage for the new operating model and mobile UX.
# ---------------------------------------------------------------------------
test = r'''import fs from 'node:fs';
import assert from 'node:assert/strict';

const admin=fs.readFileSync('admin-stocktake.html','utf8');
const shell=fs.readFileSync('admin-stocktake-shell.html','utf8');
const has=(s,x,msg)=>assert.ok(s.includes(x),msg||`missing ${x}`);

// Real stocktake no longer depends on an accountant Excel upload.
has(admin,'إنشاء جرد من المخزون الحالي','real campaign modal must say current inventory');
has(admin,'<select id="campaignWarehouse"','warehouse must be a controlled source selection');
has(admin,"const INVENTORY_SOURCES={jeddah:{label:'جدة',url:'./data/jeddah.tsv'},riyadh:{label:'الرياض',url:'./data/riyadh.tsv'}}",'real stocktake must use canonical Jeddah/Riyadh sources');
has(admin,"sourceMode:'current_inventory'",'real stocktake snapshot must identify its source mode');
has(admin,'singleTeamMode:true','direct inventory campaign must use a single-team safety model');
has(admin,"memberEmployeeIds:[ROOT_ID]",'new direct campaign must remain manageable by root until members are edited');
has(admin,"if(cp.sourceMode==='current_inventory')return '<div",'direct campaigns must bypass Excel input UI');
has(admin,"snapshotComplete:true",'real campaign must only become ready after the snapshot finishes');
has(admin,"state.campaign?.sourceMode==='current_inventory'&&!state.campaign?.snapshotComplete",'readiness must reject incomplete snapshots');

const fn=admin.match(/async function createCurrentInventoryCampaign\(\)\{[\s\S]*?\nfunction openTeam\(id\)/);
assert.ok(fn,'createCurrentInventoryCampaign function must exist');
has(fn[0],"fetch(`${source.url}?stocktake=${Date.now()}`,{cache:'no-store'})",'real snapshot must bypass stale browser cache');
has(fn[0],'expectedQty:Number(r.qty)','current quantity must be frozen as expected quantity');
has(fn[0],'for(let x=0;x<rows.length;x+=350)','full warehouse snapshot must be chunked below Firestore batch limits');
has(fn[0],"status:'building'",'campaign must stay non-ready while snapshot is being built');
has(fn[0],"status:'draft',snapshotComplete:true",'campaign must transition only after the full snapshot is written');
assert.ok(!fn[0].includes('XLSX.read'),'real campaign creation must not parse Excel');

// Mobile admin must be readable without browser zoom and must not expose the 860px table layout.
has(admin,'@media(max-width:719px)','dedicated phone breakpoint required');
has(admin,'.campaignSummaryPanel{order:1}','active campaign summary must lead on mobile');
has(admin,'.panel h2{font-size:18px','mobile headings must be phone-readable');
has(admin,'.btn{min-height:44px','mobile touch targets must be at least 44px');
has(admin,'.stats{grid-template-columns:repeat(2,minmax(0,1fr))','mobile stats must use a readable two-column grid');
has(admin,'class="tablewrap reviewTable"','review table must have a mobile-specific presentation hook');
has(admin,'.reviewTable .table{min-width:0;display:block}','review results must drop the wide desktop minimum on mobile');
has(admin,'.reviewTable td:nth-child(2),.reviewTable td:nth-child(4),.reviewTable td:nth-child(10),.reviewTable td:nth-child(11){display:none}','secondary review columns must be removed from phone cards');
has(admin,'التقارير والتصدير','secondary report actions must be collapsed away from primary counting controls');
has(shell,'admin-stocktake.html?embedded=1&v=56.5','shell must cache-bust the redesigned admin page');
has(shell,'stocktake.html?v=56.5','shell must cache-bust the employee stocktake link');
has(shell,'.context b{font-size:16px}','shell title must be readable on mobile');

console.log('V56.5 direct stocktake + mobile admin regression: OK');
'''
TEST.write_text(test, encoding='utf-8')

if 'node tests/v56-5-stocktake-direct-mobile.mjs' not in regression:
    regression = replace_once(
        regression,
        '          node tests/v56-3-stocktake-test-mode.mjs\n',
        '          node tests/v56-3-stocktake-test-mode.mjs\n          node tests/v56-5-stocktake-direct-mobile.mjs\n',
        'wire V56.5 regression',
    )

ADMIN.write_text(admin, encoding='utf-8')
SHELL.write_text(shell, encoding='utf-8')
REGRESSION.write_text(regression, encoding='utf-8')
print('V56.5 patch applied')
