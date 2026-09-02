from pathlib import Path
import re

ROOT=Path('.')

def read(path): return (ROOT/path).read_text()
def write(path,s): (ROOT/path).write_text(s)
def replace_once(path,old,new,label):
    s=read(path)
    n=s.count(old)
    if n!=1: raise SystemExit(f'{label}: expected 1 anchor in {path}, got {n}')
    write(path,s.replace(old,new,1))
def regex_once(path,pattern,repl,label,flags=re.S):
    s=read(path)
    out,n=re.subn(pattern,repl,s,count=1,flags=flags)
    if n!=1: raise SystemExit(f'{label}: expected 1 match in {path}, got {n}')
    write(path,out)
def insert_before(path,anchor,addition,label):
    s=read(path)
    if addition in s: return
    n=s.count(anchor)
    if n!=1: raise SystemExit(f'{label}: expected 1 anchor in {path}, got {n}')
    write(path,s.replace(anchor,addition+anchor,1))

admin=Path('admin-stocktake.html')

# Cache/direct navigation versions.
replace_once(admin,"$('#back').onclick=()=>location.href='./admin-dashboard.html';$('#employeeView').onclick=()=>location.href='./stocktake.html?v=56.8';","$('#back').onclick=()=>location.href='./admin-dashboard.html';$('#employeeView').onclick=()=>location.href='./stocktake.html?v=56.16';",'admin stocktake employee view version')

# Test modal: full inventory, no sample/count selector.
old_test_modal='''<div id="testModal" class="modalbg"><div class="modal"><h3>🧪 تجربة الجرد</h3><div class="success">وضع اختبار معزول: يأخذ عينة مباشرة من المخزون الحالي، بدون Excel، ولا يغيّر كميات المخزون الحقيقي.</div><div class="fields section"><div class="field"><label>المخزون المستخدم في التجربة</label><select id="testWarehouse" class="select"><option value="jeddah">مخزون جدة</option><option value="riyadh">مخزون الرياض</option></select></div><div class="field"><label>عدد أصناف التجربة</label><input id="testCount" class="input" type="number" inputmode="numeric" min="1" max="30" value="12"></div></div><div class="muted section">سيُنشأ ملف جرد باسم «🧪 تجربة الجرد» ومجموعة اختبار مرتبطة بحساب مهند. بعدها استخدم نفس زر «بدء الجرد الآن» ونفس واجهة الجرد الحقيقية.</div><div class="modalactions"><button id="testCancel" class="btn">إلغاء</button><button id="testCreate" class="btn info">إنشاء التجربة</button></div></div></div>'''
new_test_modal='''<div id="testModal" class="modalbg"><div class="modal"><h3>🧪 تجربة الجرد</h3><div class="success">وضع اختبار معزول على كامل أصناف المخزون المختار، بدون Excel، ولا يغيّر كميات المخزون الحقيقي.</div><div class="fields section"><div class="field" style="grid-column:1/-1"><label>المخزون المستخدم في التجربة</label><select id="testWarehouse" class="select"><option value="jeddah">مخزون جدة</option><option value="riyadh">مخزون الرياض</option></select></div></div><div class="muted section">التجربة تستخدم نفس واجهة الجرد الحقيقية وكل الأصناف، حتى تستطيع التدريب والشرح على أي صنف موجود في المستودع.</div><div class="modalactions"><button id="testCancel" class="btn">إلغاء</button><button id="testCreate" class="btn info">إنشاء التجربة الكاملة</button></div></div></div>'''
replace_once(admin,old_test_modal,new_test_modal,'full-inventory test modal')

# Admin state gains a dedicated read-only accounting access control.
old_state="const $=s=>document.querySelector(s),root=$('#root');const state={control:{enabled:false,accessMode:'none',allowedEmployeeIds:[],allowedEmployeeNames:[],activeCampaignId:''},employees:[],campaigns:[],campaign:null,teams:[],items:[],audit:[],tab:'all',search:'',editTeamId:'',tabScroll:0,import:{file:null,rows:[],headers:[],map:{sku:'',qty:'',pack:'',name:''},teamId:'',errors:[],headerRow:0},unsubs:[]};"
new_state="const $=s=>document.querySelector(s),root=$('#root');const state={control:{enabled:false,accessMode:'none',allowedEmployeeIds:[],allowedEmployeeNames:[],activeCampaignId:''},accountingControl:{enabled:false,accessMode:'none',allowedEmployeeIds:[],allowedEmployeeNames:[],campaignId:''},employees:[],campaigns:[],campaign:null,teams:[],items:[],audit:[],tab:'all',search:'',editTeamId:'',tabScroll:0,import:{file:null,rows:[],headers:[],map:{sku:'',qty:'',pack:'',name:''},teamId:'',errors:[],headerRow:0},unsubs:[]};"
replace_once(admin,old_state,new_state,'accounting control state')

new_start="""function start(){
state.unsubs.push(db.collection('system_controls').doc('stocktake_feature').onSnapshot(d=>{state.control={...state.control,...(d.exists?d.data():{})};if(!state.campaign&&state.control.activeCampaignId)state.campaign=state.campaigns.find(x=>x.id===state.control.activeCampaignId)||null;render();bindSelected()},()=>{}));
state.unsubs.push(db.collection('system_controls').doc('stocktake_accounting').onSnapshot(d=>{state.accountingControl={enabled:false,accessMode:'none',allowedEmployeeIds:[],allowedEmployeeNames:[],campaignId:'',...(d.exists?d.data():{})};render()},()=>{}));
state.unsubs.push(db.collection('employee_accounts').onSnapshot(s=>{state.employees=s.docs.map(d=>({id:d.id,...d.data()})).filter(x=>x.status!=='suspended').sort((a,b)=>empName(a).localeCompare(empName(b),'ar'));render()},()=>{}));
state.unsubs.push(db.collection('stocktake_campaigns').onSnapshot(s=>{state.campaigns=s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>ms(b.createdAt)-ms(a.createdAt));if(state.campaign)state.campaign=state.campaigns.find(x=>x.id===state.campaign.id)||null;else if(state.control.activeCampaignId)state.campaign=state.campaigns.find(x=>x.id===state.control.activeCampaignId)||null;render();bindSelected()},()=>{}))}start();
let selectedId"""
regex_once(admin,r"function start\(\)\{.*?\}start\(\);\nlet selectedId",new_start,'admin base subscriptions')
replace_once(admin,'while(state.unsubs.length>3)','while(state.unsubs.length>4)','admin subscription base count')

new_render="""function render(){const cp=state.campaign,items=state.items,total=items.length,counted=items.filter(i=>(i.countStatus||'pending')!=='pending').length,short=items.filter(i=>i.countStatus==='shortage').length,surplus=items.filter(i=>i.countStatus==='surplus').length,matched=items.filter(i=>i.countStatus==='matched').length,notes=items.filter(i=>String(i.note||'').trim()).length,pending=total-counted;root.innerHTML=`<div class=\"grid g2 screenOnly\"><section class=\"panel\">${campaignsHtml(cp)}</section><section class=\"panel\">${cp?campaignSummary(cp,total,counted,pending,matched,short,surplus,notes):'<div class=\"empty\">أنشئ ملف جرد جديد للبدء.</div>'}</section></div>${accountingAccessHtml(cp)}${cp?`<section class=\"panel screenOnly\">${teamsHtml(cp)}${importHtml(cp)}${reviewHtml(cp)}</section>${printHtml(cp)}`:''}`;bindUi();restoreAdminTabs()}
function campaignsHtml"""
regex_once(admin,r"function render\(\)\{.*?\}\nfunction campaignsHtml",new_render,'admin render accounting panel')

new_campaigns="""function campaignsHtml(cp){const testCount=state.campaigns.filter(c=>c.isTest).length;return `<div class=\"row\"><div class=\"grow\"><h2>ملفات الجرد</h2><div class=\"muted\">الجرد الجديد يأخذ لقطة مباشرة من المخزون الحالي. جهّز الفريق ثم ابدأ صباحًا أو ليلًا بعد اكتمال تحديث المخزون.</div></div>${testCount?`<button id=\"purgeTests\" class=\"btn bad\">تنظيف التجارب (${testCount})</button>`:''}<button id=\"testCampaign\" class=\"btn info\">🧪 تجربة</button><button id=\"newCampaign\" class=\"btn primary\">+ جرد جديد</button></div><div class=\"campaigns section\">${state.campaigns.length?state.campaigns.slice(0,10).map(c=>`<button data-campaign=\"${c.id}\" class=\"card ${cp?.id===c.id?'active':''}\" style=\"text-align:right\"><div class=\"cardtop\"><div class=\"grow\"><b style=\"font-size:12px\">${esc(c.name||`جرد ${c.warehouse||''}`)}</b><div class=\"muted\">${esc(c.warehouse||'—')} · ${esc(c.stocktakeDate||'بدون تاريخ')}</div></div>${c.isTest?'<span class=\"pill info\">اختبار</span>':c.sourceMode==='current_inventory'?'<span class=\"pill ok\">المخزون الحالي</span>':''}<span class=\"pill ${c.status==='active'?'ok':c.status==='closed'?'bad':c.status==='ready'?'info':''}\">${campaignStatus(c.status)}</span></div></button>`).join(''):'<div class=\"empty\">لا توجد ملفات جرد بعد.</div>'}</div>`}
function campaignSummary"""
regex_once(admin,r"function campaignsHtml\(cp\)\{.*?\}\nfunction campaignSummary",new_campaigns,'campaign list maintenance action')

accounting_block=r'''function accountingAccessHtml(cp){const c=state.accountingControl||{},selected=new Set(c.allowedEmployeeIds||[]),campaignId=String(c.campaignId||cp?.id||''),enabled=Boolean(c.enabled&&campaignId),campaignOptions=state.campaigns.slice(0,30).map(x=>`<option value="${x.id}" ${x.id===campaignId?'selected':''}>${esc(x.name||`جرد ${x.warehouse||''}`)}${x.isTest?' — اختبار':''}</option>`).join('');return `<section class="panel screenOnly noPrint"><div class="row"><div class="grow"><h2>منظور المحاسب · قراءة فقط</h2><div class="muted">اختر من تظهر له متابعة الجرد. الحساب المختار يشاهد المنجز والمتبقي والنواقص والزيادات والملاحظات وكل تفاصيل الأصناف بدون أي زر تعديل.</div></div><span class="pill ${enabled?'ok':'bad'}">${enabled?'مفعّل':'متوقف'}</span></div><div class="fields section"><div class="field"><label>الحملة المعروضة للمحاسب</label><select id="accountingCampaign" class="select"><option value="">اختر حملة</option>${campaignOptions}</select></div><div class="field"><label>الحسابات المخولة</label><div class="muted">يمكن اختيار حساب واحد أو أكثر، وإزالة الصلاحية في أي وقت.</div></div></div><div class="members section">${state.employees.length?state.employees.map(e=>`<label><input type="checkbox" data-accountant-member="${e.id}" ${selected.has(e.id)?'checked':''}><span>${esc(empName(e))}</span></label>`).join(''):'<div class="muted">لا توجد حسابات موظفين متاحة.</div>'}</div><div class="summaryActions section"><button id="saveAccountingAccess" class="btn primary primaryAction">حفظ صلاحية المتابعة</button><button id="previewAccounting" class="btn info" ${campaignId?'':'disabled'}>فتح منظور المحاسب</button>${enabled?'<button id="disableAccountingAccess" class="btn bad">إيقاف الميزة عن الجميع</button>':''}</div></section>`}
async function saveAccountingAccess(){const campaignId=String($('#accountingCampaign')?.value||'').trim(),ids=[...document.querySelectorAll('[data-accountant-member]:checked')].map(x=>x.dataset.accountantMember).filter(Boolean);if(!campaignId)return toast('اختر الحملة التي سيشاهدها المحاسب');if(!ids.length)return toast('حدد حسابًا واحدًا على الأقل');const names=ids.map(id=>empName(state.employees.find(e=>e.id===id))).filter(Boolean);try{await db.collection('system_controls').doc('stocktake_accounting').set({enabled:true,accessMode:'selected',allowedEmployeeIds:[...new Set(ids)],allowedEmployeeNames:[...new Set(names)],campaignId,updatedAt:firebase.firestore.FieldValue.serverTimestamp(),updatedBy:'مهند'},{merge:true});await auditAdmin('accounting_access_updated',{campaignId,allowedEmployeeIds:ids,allowedEmployeeNames:names});toast('تم تفعيل منظور المحاسب للحسابات المحددة')}catch(e){console.error(e);toast('تعذر حفظ صلاحية المحاسب')}}
async function disableAccountingAccess(){if(!confirm('إيقاف منظور المحاسب وإخفاؤه عن جميع الحسابات؟'))return;try{await db.collection('system_controls').doc('stocktake_accounting').set({enabled:false,accessMode:'none',allowedEmployeeIds:[],allowedEmployeeNames:[],campaignId:'',updatedAt:firebase.firestore.FieldValue.serverTimestamp(),updatedBy:'مهند'},{merge:true});await auditAdmin('accounting_access_disabled',{});toast('تم إيقاف منظور المحاسب')}catch(e){console.error(e);toast('تعذر إيقاف الصلاحية')}}
function previewAccounting(){const campaignId=String($('#accountingCampaign')?.value||state.accountingControl?.campaignId||state.campaign?.id||'').trim();if(!campaignId)return toast('اختر حملة أولًا');location.href=`./accountant-stocktake.html?preview=1&campaign=${encodeURIComponent(campaignId)}&v=56.16`}
'''
insert_before(admin,'function campaignSummary',accounting_block,'accounting access functions')

new_bind=r'''function bindUi(){$('#testCampaign')?.addEventListener('click',openTestModal);$('#newCampaign')?.addEventListener('click',openCampaignModal);$('#purgeTests')?.addEventListener('click',purgeTestCampaigns);$('#saveAccountingAccess')?.addEventListener('click',saveAccountingAccess);$('#disableAccountingAccess')?.addEventListener('click',disableAccountingAccess);$('#previewAccounting')?.addEventListener('click',previewAccounting);document.querySelectorAll('[data-campaign]').forEach(b=>b.onclick=()=>{state.campaign=state.campaigns.find(c=>c.id===b.dataset.campaign)||null;state.import.teamId='';state.search='';state.tab='all';bindSelected();render()});$('#markReady')?.addEventListener('click',markReady);$('#activateCampaign')?.addEventListener('click',activateCampaign);$('#closeCampaign')?.addEventListener('click',closeCampaign);$('#reopenCampaign')?.addEventListener('click',reopenCampaign);$('#newTeam')?.addEventListener('click',()=>openTeam(''));document.querySelectorAll('[data-edit-team]').forEach(b=>b.onclick=()=>openTeam(b.dataset.editTeam));document.querySelectorAll('[data-delete-team]').forEach(b=>b.onclick=()=>deleteTeam(b.dataset.deleteTeam));$('#importTeam')?.addEventListener('change',e=>{state.import.teamId=e.target.value;validateImport();render()});$('#importFile')?.addEventListener('change',e=>readFile(e.target.files?.[0]));document.querySelectorAll('[data-map]').forEach(s=>s.onchange=e=>{state.import.map[e.target.dataset.map]=e.target.value;validateImport();render()});$('#importNow')?.addEventListener('click',importRows);document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{const strip=b.closest('.tabs');if(strip)state.tabScroll=strip.scrollLeft;state.tab=b.dataset.tab;render()});$('#reviewSearch')?.addEventListener('input',e=>{state.search=e.target.value;render();const n=$('#reviewSearch');if(n){n.focus();try{n.setSelectionRange(n.value.length,n.value.length)}catch{}}});$('#exportAll')?.addEventListener('click',()=>exportExcel(false));$('#exportDiff')?.addEventListener('click',()=>exportExcel(true));$('#printReport')?.addEventListener('click',()=>window.print())}
const TEST_INVENTORY_SOURCES'''
regex_once(admin,r"function bindUi\(\)\{.*?\}\nconst TEST_INVENTORY_SOURCES",new_bind,'bind accountant and cleanup UI')

new_test_logic=r'''function activeStocktakeCampaign(){const activeId=String(state.control?.activeCampaignId||'').trim();return activeId?state.campaigns.find(c=>c.id===activeId&&c.status==='active')||null:null}
function openTestModal(){const active=activeStocktakeCampaign();if(active)return toast(`أنه الجرد النشط «${active.name||'الحالي'}» أولًا قبل إنشاء تجربة`);$('#testWarehouse').value='jeddah';$('#testModal').classList.add('open');setTimeout(()=>$('#testWarehouse').focus(),60)}
$('#testCancel').onclick=()=>$('#testModal').classList.remove('open');$('#testModal').onclick=e=>{if(e.target.id==='testModal')$('#testCancel').click()};$('#testCreate').onclick=()=>createTestCampaign();
async function createTestCampaign(){const key=$('#testWarehouse').value,source=TEST_INVENTORY_SOURCES[key]||TEST_INVENTORY_SOURCES.jeddah,button=$('#testCreate');button.disabled=true;button.textContent='جاري تجهيز كامل الأصناف...';let campaignRef=null;try{const active=activeStocktakeCampaign();if(active)throw new Error('ACTIVE_STOCKTAKE_EXISTS');const response=await fetch(`${source.url}?test=${Date.now()}`,{cache:'no-store'});if(!response.ok)throw new Error(`INVENTORY_HTTP_${response.status}`);const raw=parseTestInventoryTsv(await response.text()),dedup=new Map();raw.forEach(r=>dedup.set(norm(r.sku),r));const rows=[...dedup.values()];if(!rows.length)throw new Error('NO_TEST_INVENTORY_ROWS');campaignRef=db.collection('stocktake_campaigns').doc();const teamRef=db.collection('stocktake_teams').doc(),now=firebase.firestore.FieldValue.serverTimestamp(),stocktakeDate=new Date(Date.now()+3*3600*1000).toISOString().slice(0,10),name=`🧪 تجربة الجرد — ${source.label}`,scope=`كامل المخزون التجريبي — ${source.label}`,campaignPayload={name,warehouse:source.label,warehouseKey:key,stocktakeDate,status:'draft',isTest:true,testMode:true,testSource:'current_inventory',testWarehouseKey:key,sourceMode:'current_inventory',inventorySnapshotStatus:'loading',inventorySnapshotCount:0,schemaVersion:3,createdAt:now,createdBy:'مهند'},teamPayload={campaignId:campaignRef.id,name:'🧪 مجموعة الاختبار',scope,zone:scope,memberEmployeeIds:[ROOT_ID],memberEmployeeNames:['مهند'],extraMemberNames:[],status:'active',isTest:true,testMode:true,testSource:'current_inventory',sourceMode:'current_inventory',orderIndex:0,updatedAt:now,updatedBy:'مهند',createdAt:now,createdBy:'مهند',schemaVersion:3};const first=db.batch();first.set(campaignRef,campaignPayload);first.set(teamRef,teamPayload);await first.commit();for(let x=0;x<rows.length;x+=350){const b=db.batch();rows.slice(x,x+350).forEach((r,j)=>b.set(db.collection('stocktake_items').doc(itemId(campaignRef.id,r.sku)),{campaignId:campaignRef.id,campaignName:name,teamId:teamRef.id,teamName:teamPayload.name,scope,zone:scope,sku:r.sku,normalizedSku:norm(r.sku),name:r.name,expectedQty:Number(r.qty),pack:r.pack,countStatus:'pending',actualQty:null,difference:null,note:'',hasNote:false,revision:0,orderIndex:x+j,updatedAt:now,importedAt:now,importedBy:'مهند',importFileName:'',sourceMode:'current_inventory',inventorySnapshot:true,isTest:true,testMode:true,schemaVersion:3}));await b.commit()}await campaignRef.set({inventorySnapshotStatus:'ready',inventorySnapshotCount:rows.length,inventorySnapshotCapturedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});state.campaign={id:campaignRef.id,...campaignPayload,inventorySnapshotStatus:'ready',inventorySnapshotCount:rows.length,createdAt:null};state.import={file:null,rows:[],headers:[],map:{sku:'',qty:'',pack:'',name:''},teamId:'',errors:[],headerRow:0};$('#testCancel').click();bindSelected();render();await auditAdmin('test_campaign_created',{campaignId:campaignRef.id,teamId:teamRef.id,warehouse:source.label,testSource:'current_inventory',itemCount:rows.length,fullInventory:true});toast(`تم إنشاء تجربة كاملة من ${source.label}: ${rows.length} صنف`)}catch(e){console.error(e);if(campaignRef)campaignRef.set({inventorySnapshotStatus:'error',inventorySnapshotError:String(e?.message||e),updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true}).catch(()=>{});toast(e.message==='ACTIVE_STOCKTAKE_EXISTS'?'لا يمكن إنشاء تجربة أثناء وجود جرد نشط':e.message==='NO_TEST_INVENTORY_ROWS'?'لا توجد أصناف صالحة للتجربة في المخزون الحالي':'تعذر تجهيز تجربة الجرد الكاملة')}finally{button.disabled=false;button.textContent='إنشاء التجربة الكاملة'}}
function openCampaignModal'''
regex_once(admin,r"function pickTestInventoryRows\(.*?\nfunction openCampaignModal",new_test_logic,'full inventory test campaign logic')

# When a real/test campaign starts, the accounting view follows that campaign but preserves its independent enable/allow list.
old_activate="async function activateCampaign(){if(!state.campaign)return;const p=campaignReadiness();if(p.length)return toast(`لا يمكن البدء: ${p[0]}`);const otherActive=activeStocktakeCampaign();if(state.campaign.isTest&&otherActive&&otherActive.id!==state.campaign.id)return toast('لا يمكن بدء تجربة أثناء وجود جرد نشط');const startMessage=state.campaign.isTest?'بدء تجربة الجرد الآن؟ ستستخدم نفس واجهة الجرد الحقيقية، لكن الحملة موسومة كتجربة ولا تغيّر المخزون الحقيقي.':'بدء الجرد الآن؟ ستظهر الميزة لأعضاء فريق الجرد، وتبقى لقطة المخزون المحفوظة هي المرجع حتى نهاية الجرد.';if(!confirm(startMessage))return;try{await db.collection('stocktake_campaigns').doc(state.campaign.id).set({status:'active',activatedAt:firebase.firestore.FieldValue.serverTimestamp(),activatedBy:'مهند'},{merge:true});await syncAccess(true);await auditAdmin('campaign_activated',{campaignId:state.campaign.id});toast('تم بدء الجرد وتفعيل الوصول للجان')}catch(e){console.error(e);toast('تعذر بدء الجرد')}}"
new_activate="async function activateCampaign(){if(!state.campaign)return;const p=campaignReadiness();if(p.length)return toast(`لا يمكن البدء: ${p[0]}`);const otherActive=activeStocktakeCampaign();if(state.campaign.isTest&&otherActive&&otherActive.id!==state.campaign.id)return toast('لا يمكن بدء تجربة أثناء وجود جرد نشط');const startMessage=state.campaign.isTest?'بدء تجربة الجرد الآن؟ ستستخدم نفس واجهة الجرد الحقيقية، لكن الحملة موسومة كتجربة ولا تغيّر المخزون الحقيقي.':'بدء الجرد الآن؟ ستظهر الميزة لأعضاء فريق الجرد، وتبقى لقطة المخزون المحفوظة هي المرجع حتى نهاية الجرد.';if(!confirm(startMessage))return;try{const now=firebase.firestore.FieldValue.serverTimestamp();await db.collection('stocktake_campaigns').doc(state.campaign.id).set({status:'active',activatedAt:now,activatedBy:'مهند'},{merge:true});await syncAccess(true);await db.collection('system_controls').doc('stocktake_accounting').set({campaignId:state.campaign.id,updatedAt:now,updatedBy:'مهند'},{merge:true});await auditAdmin('campaign_activated',{campaignId:state.campaign.id});toast('تم بدء الجرد وتفعيل الوصول للجان')}catch(e){console.error(e);toast('تعذر بدء الجرد')}}"
replace_once(admin,old_activate,new_activate,'accounting campaign follows activation')

purge_block=r'''async function deleteCampaignQueryDocs(collection,campaignId){const snap=await db.collection(collection).where('campaignId','==',campaignId).get(),docs=snap.docs;for(let x=0;x<docs.length;x+=400){const b=db.batch();docs.slice(x,x+400).forEach(d=>b.delete(d.ref));await b.commit()}return docs.length}
async function purgeTestCampaigns(){const activeId=String(state.control?.activeCampaignId||'').trim(),targets=state.campaigns.filter(c=>c.isTest&&c.id!==activeId);if(!targets.length)return toast(activeId&&state.campaigns.find(c=>c.id===activeId)?.isTest?'أنهِ التجربة النشطة أولًا':'لا توجد تجارب سابقة للحذف');if(!confirm(`حذف ${targets.length} تجربة سابقة نهائيًا مع أصنافها وفرقها وسجلها؟ لن يتم حذف أي جرد حقيقي.`))return;try{const ids=new Set(targets.map(c=>c.id));for(const c of targets){await deleteCampaignQueryDocs('stocktake_items',c.id);await deleteCampaignQueryDocs('stocktake_teams',c.id);await deleteCampaignQueryDocs('stocktake_audit',c.id);await db.collection('stocktake_campaigns').doc(c.id).delete()}if(ids.has(String(state.accountingControl?.campaignId||'')))await db.collection('system_controls').doc('stocktake_accounting').set({enabled:false,accessMode:'none',allowedEmployeeIds:[],allowedEmployeeNames:[],campaignId:'',updatedAt:firebase.firestore.FieldValue.serverTimestamp(),updatedBy:'مهند'},{merge:true});state.campaign=null;selectedId='';render();toast(`تم حذف ${targets.length} تجربة سابقة نهائيًا`)}catch(e){console.error(e);toast('تعذر حذف بعض بيانات التجارب')}}
'''
insert_before(admin,'function exportExcel',purge_block,'test campaign cleanup functions')

# Runtime: independent accounting control and employee entry point.
runtime=Path('runtime/index-v37-source.txt')
account_hook=r'''const STOCKTAKE_ACCOUNTING_CONTROL_DOC = 'stocktake_accounting';
const DEFAULT_STOCKTAKE_ACCOUNTING_CONTROL = { enabled:false, accessMode:'none', allowedEmployeeIds:[], allowedEmployeeNames:[], campaignId:'' };
const useStocktakeAccountingControl = () => {
    const [control, setControl] = useState(DEFAULT_STOCKTAKE_ACCOUNTING_CONTROL);
    useEffect(() => {
        let active = true, unsubscribe = null;
        (async () => {
            try {
                const db = await getDb();
                if (!active) return;
                unsubscribe = db.collection('system_controls').doc(STOCKTAKE_ACCOUNTING_CONTROL_DOC).onSnapshot(doc => {
                    if (!active) return;
                    const raw = doc.exists ? doc.data() : {};
                    setControl({
                        ...DEFAULT_STOCKTAKE_ACCOUNTING_CONTROL,
                        ...raw,
                        enabled: !!raw.enabled,
                        accessMode: ['none','selected','all'].includes(raw.accessMode) ? raw.accessMode : 'none',
                        allowedEmployeeIds: Array.isArray(raw.allowedEmployeeIds) ? raw.allowedEmployeeIds : [],
                        allowedEmployeeNames: Array.isArray(raw.allowedEmployeeNames) ? raw.allowedEmployeeNames : [],
                        campaignId: String(raw.campaignId || '')
                    });
                }, () => active && setControl(DEFAULT_STOCKTAKE_ACCOUNTING_CONTROL));
            } catch (e) { if (active) setControl(DEFAULT_STOCKTAKE_ACCOUNTING_CONTROL); }
        })();
        return () => { active = false; if (unsubscribe) unsubscribe(); };
    }, []);
    return control;
};
const stocktakeAccountingAccessAllowed = (control, { name = '', employeeId = '', isAdmin = false } = {}) => {
    if (isAdmin) return true;
    if (!control?.enabled) return false;
    const mode = control?.accessMode || 'none';
    if (mode === 'all') return true;
    if (mode !== 'selected') return false;
    const ids = new Set(Array.isArray(control?.allowedEmployeeIds) ? control.allowedEmployeeIds : []);
    const names = new Set((Array.isArray(control?.allowedEmployeeNames) ? control.allowedEmployeeNames : []).map(normalizeText));
    return ids.has(employeeId) || names.has(normalizeText(name));
};

'''
insert_before(runtime,'const employeeSiteAccessAllowed =',account_hook,'employee accounting access hook')
replace_once(runtime,'    const stocktakeControl = useStocktakeControl();\n    const [isOnline, setIsOnline] = useState(navigator.onLine);','    const stocktakeControl = useStocktakeControl();\n    const stocktakeAccountingControl = useStocktakeAccountingControl();\n    const [isOnline, setIsOnline] = useState(navigator.onLine);','app accounting control hook')
replace_once(runtime,'    const currentStocktakeAccessAllowed = stocktakeAccessAllowed(stocktakeControl,{name:sessionName,employeeId:currentEmployeeId,isAdmin});\n    const currentSiteAccessAllowed = employeeSiteAccessAllowed(employeeSiteControl,{name:sessionName,employeeId:currentEmployeeId,isAdmin});','    const currentStocktakeAccessAllowed = stocktakeAccessAllowed(stocktakeControl,{name:sessionName,employeeId:currentEmployeeId,isAdmin});\n    const currentStocktakeAccountingAccessAllowed = stocktakeAccountingAccessAllowed(stocktakeAccountingControl,{name:sessionName,employeeId:currentEmployeeId,isAdmin});\n    const currentSiteAccessAllowed = employeeSiteAccessAllowed(employeeSiteControl,{name:sessionName,employeeId:currentEmployeeId,isAdmin});','app accounting access resolution')
account_button=r'''                            {!isAdmin && currentStocktakeAccountingAccessAllowed && stocktakeAccountingControl.campaignId && (
                                <button onClick={() => { window.location.href = './accountant-stocktake.html?v=56.16'; }} title="متابعة الجرد"
                                        className="flex items-center justify-center gap-7 h-48 px-12 rounded-12 bg-surface border border-border text-secondary hover:border-info/30 hover:text-info transition-colors animate-flip">
                                    <Icon.Eye className="w-20 h-20" />
                                    <span className="hidden md:inline text-[12px] font-bold whitespace-nowrap">متابعة الجرد</span>
                                </button>
                            )}
'''
insert_before(runtime,'                            {isAdmin ? (\n                                <button onClick={() => { window.location.href = \'./admin-stocktake.html?v=56.0\'; }} title="إدارة الجرد"',account_button,'employee accounting navigation')
replace_once(runtime,"window.location.href = './admin-stocktake.html?v=56.0';","window.location.href = './admin-stocktake.html?v=56.16';",'admin stocktake runtime version')
replace_once(runtime,"window.location.href = './stocktake.html?v=56.0';","window.location.href = './stocktake.html?v=56.16';",'employee stocktake runtime version')

# Cache/version references.
replace_once(Path('index.html'),"const CORE='./runtime/index-v37-source.txt?v=56.15';","const CORE='./runtime/index-v37-source.txt?v=56.16';",'employee core cache bust')
replace_once(Path('admin-dashboard.html'),"window.location.href='./admin-stocktake.html?v=56.0'","window.location.href='./admin-stocktake.html?v=56.16'",'dashboard stocktake version')
replace_once(Path('admin-stocktake-shell.html'),'./stocktake.html?v=56.11','./stocktake.html?v=56.16','stocktake shell employee version')
replace_once(Path('admin-stocktake-shell.html'),'./admin-stocktake.html?embedded=1&v=56.11','./admin-stocktake.html?embedded=1&v=56.16','stocktake shell admin version')

# Keep the existing durable-notification regression aligned to actual cache generations.
test=Path('tests/v56-11-ops-fixes.mjs')
s=read(test)
s=s.replace("assert.ok(boot.includes('index-v37-source.txt?v=56.12'),'employee runtime cache bust missing');","assert.ok(boot.includes('index-v37-source.txt?v=56.16'),'employee runtime cache bust missing');")
s=s.replace("assert.ok(custBoot.includes('customer-v37-source.txt?v=56.12'),'customer runtime cache bust missing');","assert.ok(custBoot.includes('customer-v37-source.txt?v=56.15'),'customer runtime cache bust missing');")
write(test,s)

print('V56.16 stocktake/accounting patch applied')
