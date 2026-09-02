from pathlib import Path
import re

ADMIN=Path('admin-stocktake.html')
RUNTIME=Path('runtime/index-v37-source.txt')
DASH=Path('admin-dashboard.html')
INDEX=Path('index.html')

html=ADMIN.read_text(encoding='utf-8')

# 1) Test mode is now the full warehouse snapshot, no sample/count control.
html=re.sub(
 r'<div id="testModal" class="modalbg">.*?<div id="teamModal"',
 '''<div id="testModal" class="modalbg"><div class="modal"><h3>🧪 تجربة الجرد</h3><div class="success">وضع اختبار معزول: ينسخ جميع أصناف المخزون المختار حتى تستطيع التدريب والشرح بأي رقم صنف، ولا يغيّر المخزون الحقيقي.</div><div class="fields section"><div class="field"><label>المخزون المستخدم في التجربة</label><select id="testWarehouse" class="select"><option value="jeddah">مخزون جدة</option><option value="riyadh">مخزون الرياض</option></select></div></div><div class="muted section">ستستخدم نفس واجهة الجرد الحقيقية على كامل أصناف المستودع. التجربة تبقى معزولة عن المخزون والتسوية المحاسبية.</div><div class="modalactions"><button id="testCancel" class="btn">إلغاء</button><button id="testCreate" class="btn info">إنشاء تجربة كاملة</button></div></div></div>\n<div id="teamModal"''',
 html, count=1, flags=re.S)

html=html.replace(
 "const $=s=>document.querySelector(s),root=$('#root');const state={control:{enabled:false,accessMode:'none',allowedEmployeeIds:[],allowedEmployeeNames:[],activeCampaignId:''},employees:[],campaigns:[],campaign:null,teams:[],items:[],audit:[],tab:'all',search:'',editTeamId:'',tabScroll:0,import:",
 "const $=s=>document.querySelector(s),root=$('#root');const state={control:{enabled:false,accessMode:'none',allowedEmployeeIds:[],allowedEmployeeNames:[],activeCampaignId:''},accountantControl:{enabled:false,accessMode:'none',allowedEmployeeIds:[],allowedEmployeeNames:[]},employees:[],campaigns:[],campaign:null,teams:[],items:[],audit:[],tab:'all',search:'',editTeamId:'',tabScroll:0,import:"
)
html=html.replace("$('#back').onclick=()=>location.href='./admin-dashboard.html';$('#employeeView').onclick=()=>location.href='./stocktake.html?v=56.8';", "$('#back').onclick=()=>location.href='./admin-dashboard.html';$('#employeeView').onclick=()=>location.href='./stocktake.html?v=56.12';")

old_start=re.compile(r"function start\(\)\{state\.unsubs\.push\(db\.collection\('system_controls'\)\.doc\('stocktake_feature'\).*?\}\)\)\}start\(\);", re.S)
new_start="""function start(){
state.unsubs.push(db.collection('system_controls').doc('stocktake_feature').onSnapshot(d=>{state.control={...state.control,...(d.exists?d.data():{})};if(!state.campaign&&state.control.activeCampaignId)state.campaign=state.campaigns.find(x=>x.id===state.control.activeCampaignId)||null;render();bindSelected()},()=>{}));
state.unsubs.push(db.collection('system_controls').doc('stocktake_accountant_access').onSnapshot(d=>{state.accountantControl={...state.accountantControl,...(d.exists?d.data():{})};render()},()=>{}));
state.unsubs.push(db.collection('employee_accounts').onSnapshot(s=>{state.employees=s.docs.map(d=>({id:d.id,...d.data()})).filter(x=>x.status!=='suspended').sort((a,b)=>empName(a).localeCompare(empName(b),'ar'));render()},()=>{}));
state.unsubs.push(db.collection('stocktake_campaigns').onSnapshot(s=>{state.campaigns=s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>ms(b.createdAt)-ms(a.createdAt));if(state.campaign)state.campaign=state.campaigns.find(x=>x.id===state.campaign.id)||null;else if(state.control.activeCampaignId)state.campaign=state.campaigns.find(x=>x.id===state.control.activeCampaignId)||null;render();bindSelected();cleanupLegacyTestsOnce()},()=>{}))}
start();"""
html,n=old_start.subn(new_start,html,count=1)
if n!=1: raise SystemExit('start anchor failed')
html=html.replace("while(state.unsubs.length>3)", "while(state.unsubs.length>4)")

# 2) Add accountant permission panel to root render.
old_render="root.innerHTML=`<div class=\"grid g2 screenOnly\"><section class=\"panel\">${campaignsHtml(cp)}</section><section class=\"panel\">${cp?campaignSummary(cp,total,counted,pending,matched,short,surplus,notes):'<div class=\"empty\">أنشئ ملف جرد جديد للبدء.</div>'}</section></div>${cp?`<section class=\"panel screenOnly\">${teamsHtml(cp)}${importHtml(cp)}${reviewHtml(cp)}</section>${printHtml(cp)}`:''}`;"
new_render="root.innerHTML=`<div class=\"grid g2 screenOnly\"><section class=\"panel\">${campaignsHtml(cp)}</section><section class=\"panel\">${cp?campaignSummary(cp,total,counted,pending,matched,short,surplus,notes):'<div class=\"empty\">أنشئ ملف جرد جديد للبدء.</div>'}</section></div><section class=\"panel screenOnly\">${accountantAccessHtml()}</section>${cp?`<section class=\"panel screenOnly\">${teamsHtml(cp)}${importHtml(cp)}${reviewHtml(cp)}</section>${printHtml(cp)}`:''}`;"
if old_render not in html: raise SystemExit('render anchor failed')
html=html.replace(old_render,new_render,1)

# 3) Insert accountant permission helpers before bindUi.
anchor="function bindUi(){"
accountant_js=r'''function accountantAccessHtml(){const c=state.accountantControl||{},selected=new Set(c.allowedEmployeeIds||[]);return `<div class="row"><div class="grow"><h3>منظور المحاسب</h3><div class="muted">صفحة مستقلة للمتابعة فقط: المنجز، المتبقي، النواقص، الزيادات، الملاحظات وكل تفاصيل العد بدون أي صلاحية تعديل.</div></div><button id="previewAccountant" class="btn info">معاينة منظور المحاسب</button></div><div class="field section"><label style="display:flex;align-items:center;gap:8px"><input id="accountantEnabled" type="checkbox" ${c.enabled?'checked':''}> إظهار الميزة للحسابات المحددة</label></div><div class="field section"><label>الحسابات المسموح لها</label><div class="members">${state.employees.length?state.employees.map(e=>`<label><input type="checkbox" data-accountant-member="${e.id}" ${selected.has(e.id)?'checked':''}><span>${esc(empName(e))}</span></label>`).join(''):'<div class="muted">لا توجد حسابات موظفين متاحة.</div>'}</div></div><div class="row section"><button id="saveAccountantAccess" class="btn primary">حفظ صلاحية المحاسب</button><span class="pill ${c.enabled?'ok':''}">${c.enabled?`${selected.size} حساب مفعل`:'الميزة مخفية'}</span></div>`}
async function saveAccountantAccess(){const enabled=Boolean($('#accountantEnabled')?.checked),ids=[...document.querySelectorAll('[data-accountant-member]:checked')].map(x=>x.dataset.accountantMember),names=state.employees.filter(e=>ids.includes(e.id)).map(empName).filter(Boolean);if(enabled&&!ids.length)return toast('حدد حسابًا واحدًا على الأقل أو أوقف ظهور الميزة');try{await db.collection('system_controls').doc('stocktake_accountant_access').set({enabled,accessMode:enabled?'selected':'none',allowedEmployeeIds:ids,allowedEmployeeNames:names,updatedAt:firebase.firestore.FieldValue.serverTimestamp(),updatedBy:ROOT_ID},{merge:true});await auditAdmin('accountant_access_updated',{enabled,allowedEmployeeIds:ids,allowedEmployeeNames:names});toast(enabled?'تم حفظ حسابات المحاسب':'تم إخفاء منظور المحاسب')}catch(e){console.error(e);toast('تعذر حفظ صلاحية المحاسب')}}
'''
if anchor not in html: raise SystemExit('bindUi anchor failed')
html=html.replace(anchor,accountant_js+anchor,1)

# extend bindUi with new actions
html=html.replace("function bindUi(){$('#testCampaign')", "function bindUi(){$('#saveAccountantAccess')?.addEventListener('click',saveAccountantAccess);$('#previewAccountant')?.addEventListener('click',()=>window.open('./stocktake-accountant.html?preview=1&v=56.12','_blank','noopener'));$('#testCampaign')",1)

# 4) Test = full snapshot, chunked writes (Firestore batch safe).
html=re.sub(r"function pickTestInventoryRows\(rows,count\)\{.*?\}\nfunction activeStocktakeCampaign", "function pickTestInventoryRows(rows){const dedup=new Map();for(const r of rows){const k=norm(r.sku);if(k)dedup.set(k,r)}return [...dedup.values()]}\nfunction activeStocktakeCampaign", html, count=1, flags=re.S)
html=html.replace("function openTestModal(){const active=activeStocktakeCampaign();if(active)return toast(`أنه الجرد النشط «${active.name||'الحالي'}» أولًا قبل إنشاء تجربة`);$('#testWarehouse').value='jeddah';$('#testCount').value='12';$('#testModal').classList.add('open');setTimeout(()=>$('#testWarehouse').focus(),60)}", "function openTestModal(){const active=activeStocktakeCampaign();if(active)return toast(`أنه الجرد النشط «${active.name||'الحالي'}» أولًا قبل إنشاء تجربة`);$('#testWarehouse').value='jeddah';$('#testModal').classList.add('open');setTimeout(()=>$('#testWarehouse').focus(),60)}")

new_test=r'''async function createTestCampaign(){const key=$('#testWarehouse').value,source=TEST_INVENTORY_SOURCES[key]||TEST_INVENTORY_SOURCES.jeddah,button=$('#testCreate');button.disabled=true;button.textContent='جاري نسخ كامل المخزون...';let campaignRef=null;try{const active=activeStocktakeCampaign();if(active)throw new Error('ACTIVE_STOCKTAKE_EXISTS');const response=await fetch(`${source.url}?test=${Date.now()}`,{cache:'no-store'});if(!response.ok)throw new Error(`INVENTORY_HTTP_${response.status}`);const rows=pickTestInventoryRows(parseTestInventoryTsv(await response.text()));if(!rows.length)throw new Error('NO_TEST_INVENTORY_ROWS');campaignRef=db.collection('stocktake_campaigns').doc();const teamRef=db.collection('stocktake_teams').doc(),now=firebase.firestore.FieldValue.serverTimestamp(),stocktakeDate=new Date(Date.now()+3*3600*1000).toISOString().slice(0,10),name=`🧪 تجربة الجرد — ${source.label}`,scope=`تجربة كاملة من المخزون الحالي — ${source.label}`,campaignPayload={name,warehouse:source.label,stocktakeDate,status:'draft',isTest:true,testMode:true,testSource:'current_inventory_full',testWarehouseKey:key,testSampleSize:rows.length,inventorySnapshotCount:rows.length,schemaVersion:4,createdAt:now,createdBy:'مهند'},teamPayload={campaignId:campaignRef.id,name:'🧪 مجموعة الاختبار',scope,zone:scope,memberEmployeeIds:[ROOT_ID],memberEmployeeNames:['مهند'],extraMemberNames:[],status:'active',isTest:true,testMode:true,testSource:'current_inventory_full',orderIndex:0,updatedAt:now,updatedBy:'مهند',createdAt:now,createdBy:'مهند',schemaVersion:4};const first=db.batch();first.set(campaignRef,campaignPayload);first.set(teamRef,teamPayload);await first.commit();for(let x=0;x<rows.length;x+=350){const b=db.batch();rows.slice(x,x+350).forEach((r,j)=>b.set(db.collection('stocktake_items').doc(itemId(campaignRef.id,r.sku)),{campaignId:campaignRef.id,campaignName:name,teamId:teamRef.id,teamName:teamPayload.name,scope,zone:scope,sku:r.sku,normalizedSku:norm(r.sku),name:r.name,expectedQty:Number(r.qty),pack:r.pack,countStatus:'pending',actualQty:null,difference:null,note:'',hasNote:false,revision:0,orderIndex:x+j,updatedAt:now,importedAt:now,importedBy:'مهند',importFileName:'',sourceMode:'current_inventory',isTest:true,testMode:true,schemaVersion:4}));await b.commit()}state.campaign={id:campaignRef.id,...campaignPayload,createdAt:null};state.import={file:null,rows:[],headers:[],map:{sku:'',qty:'',pack:'',name:''},teamId:'',errors:[],headerRow:0};$('#testCancel').click();bindSelected();render();await auditAdmin('test_campaign_created',{campaignId:campaignRef.id,teamId:teamRef.id,warehouse:source.label,testSource:'current_inventory_full',itemCount:rows.length});toast(`تم إنشاء تجربة كاملة من ${source.label}: ${rows.length} صنف`)}catch(e){console.error(e);if(campaignRef)campaignRef.delete().catch(()=>{});toast(e.message==='ACTIVE_STOCKTAKE_EXISTS'?'لا يمكن إنشاء تجربة أثناء وجود جرد نشط':e.message==='NO_TEST_INVENTORY_ROWS'?'لا توجد أصناف صالحة للتجربة في المخزون الحالي':'تعذر تجهيز تجربة الجرد الكاملة')}finally{button.disabled=false;button.textContent='إنشاء تجربة كاملة'}}
'''
html,n=re.subn(r"async function createTestCampaign\(\)\{.*?\}\nfunction openCampaignModal", new_test+"function openCampaignModal", html, count=1, flags=re.S)
if n!=1: raise SystemExit('createTestCampaign anchor failed')

# 5) One-time root cleanup of all pre-V56.12 test campaigns and their related rows.
cleanup_js=r'''
let legacyTestCleanupStarted=false;
async function deleteQueryInBatches(query){const snap=await query.get();for(let x=0;x<snap.docs.length;x+=350){const b=db.batch();snap.docs.slice(x,x+350).forEach(d=>b.delete(d.ref));await b.commit()}return snap.size}
async function cleanupLegacyTestsOnce(){if(legacyTestCleanupStarted)return;legacyTestCleanupStarted=true;try{const markerRef=db.collection('system_controls').doc('stocktake_test_cleanup_v5612'),marker=await markerRef.get();if(marker.exists&&marker.data()?.done)return;const snap=await db.collection('stocktake_campaigns').get(),tests=snap.docs.filter(d=>{const c=d.data()||{};return c.isTest||c.testMode});const ids=new Set(tests.map(d=>d.id));if(ids.has(String(state.control?.activeCampaignId||'')))await db.collection('system_controls').doc('stocktake_feature').set({enabled:false,accessMode:'none',activeCampaignId:'',updatedAt:firebase.firestore.FieldValue.serverTimestamp(),updatedBy:ROOT_ID},{merge:true});let removedItems=0,removedTeams=0,removedAudit=0;for(const d of tests){removedItems+=await deleteQueryInBatches(db.collection('stocktake_items').where('campaignId','==',d.id));removedTeams+=await deleteQueryInBatches(db.collection('stocktake_teams').where('campaignId','==',d.id));removedAudit+=await deleteQueryInBatches(db.collection('stocktake_audit').where('campaignId','==',d.id));await d.ref.delete()}await markerRef.set({done:true,version:'56.12',campaignsRemoved:tests.length,itemsRemoved:removedItems,teamsRemoved:removedTeams,auditRemoved:removedAudit,completedAt:firebase.firestore.FieldValue.serverTimestamp(),completedBy:ROOT_ID},{merge:true});if(tests.length)toast(`تم تنظيف ${tests.length} من تجارب الجرد السابقة`)}catch(e){legacyTestCleanupStarted=false;console.warn('V56.12 test cleanup failed',e)}}
'''
insert_before="function teamIds(t)"
if insert_before not in html: raise SystemExit('cleanup anchor failed')
html=html.replace(insert_before,cleanup_js+insert_before,1)

# Update test wording and versions.
html=html.replace('🧪 وضع اختبار معزول — لا يغيّر المخزون الحقيقي.','🧪 تجربة كاملة على أصناف المستودع — لا تغيّر المخزون الحقيقي.')
ADMIN.write_text(html,encoding='utf-8')

# Patch employee runtime with accountant access button + current stocktake cache versions.
r=RUNTIME.read_text(encoding='utf-8')
stock_hook="""const STOCKTAKE_ACCOUNTANT_CONTROL_DOC = 'stocktake_accountant_access';
const DEFAULT_STOCKTAKE_ACCOUNTANT_CONTROL = { enabled:false, accessMode:'none', allowedEmployeeIds:[], allowedEmployeeNames:[] };
const useStocktakeAccountantControl = () => {
    const [control, setControl] = useState(DEFAULT_STOCKTAKE_ACCOUNTANT_CONTROL);
    useEffect(() => {
        let active = true, unsubscribe = null;
        (async () => {
            try {
                const db = await getDb(); if (!active) return;
                unsubscribe = db.collection('system_controls').doc(STOCKTAKE_ACCOUNTANT_CONTROL_DOC).onSnapshot(snap => { if(active) setControl({...DEFAULT_STOCKTAKE_ACCOUNTANT_CONTROL,...(snap.exists?snap.data():{})}); });
            } catch(e) { console.warn('accountant control unavailable',e); }
        })();
        return () => { active=false; try{unsubscribe?.()}catch{} };
    }, []);
    return control;
};

"""
needle="const STOCKTAKE_CONTROL_DOC = 'stocktake_feature';"
if stock_hook not in r:
    if needle not in r: raise SystemExit('runtime stocktake hook anchor failed')
    r=r.replace(needle,stock_hook+needle,1)
r=r.replace("const stocktakeControl = useStocktakeControl();", "const stocktakeControl = useStocktakeControl();\n    const stocktakeAccountantControl = useStocktakeAccountantControl();",1)
r=r.replace("const currentStocktakeAccessAllowed = stocktakeAccessAllowed(stocktakeControl,{name:sessionName,employeeId:currentEmployeeId,isAdmin});", "const currentStocktakeAccessAllowed = stocktakeAccessAllowed(stocktakeControl,{name:sessionName,employeeId:currentEmployeeId,isAdmin});\n    const currentStocktakeAccountantAccessAllowed = stocktakeAccessAllowed(stocktakeAccountantControl,{name:sessionName,employeeId:currentEmployeeId,isAdmin});",1)
old_button="""                            ) : (currentStocktakeAccessAllowed && stocktakeControl.activeCampaignId && (
                                <button onClick={() => { window.location.href = './stocktake.html?v=56.0'; }} title=\"فتح الجرد\"
                                        className=\"flex items-center justify-center gap-7 h-48 px-12 rounded-12 bg-successSoft border border-success/20 text-success hover:bg-success hover:text-white transition-colors animate-flip\">
                                    <Icon.Archive className=\"w-20 h-20\" />
                                    <span className=\"hidden md:inline text-[12px] font-bold whitespace-nowrap\">الجرد</span>
                                </button>
                            ))}"""
new_button="""                            ) : (currentStocktakeAccessAllowed && stocktakeControl.activeCampaignId && (
                                <button onClick={() => { window.location.href = './stocktake.html?v=56.12'; }} title=\"فتح الجرد\"
                                        className=\"flex items-center justify-center gap-7 h-48 px-12 rounded-12 bg-successSoft border border-success/20 text-success hover:bg-success hover:text-white transition-colors animate-flip\">
                                    <Icon.Archive className=\"w-20 h-20\" />
                                    <span className=\"hidden md:inline text-[12px] font-bold whitespace-nowrap\">الجرد</span>
                                </button>
                            ))}
                            {!isAdmin && currentStocktakeAccountantAccessAllowed && (
                                <button onClick={() => { window.location.href = './stocktake-accountant.html?v=56.12'; }} title=\"متابعة الجرد\"
                                        className=\"flex items-center justify-center gap-7 h-48 px-12 rounded-12 bg-infoSoft border border-info/20 text-info hover:bg-info hover:text-white transition-colors animate-flip\">
                                    <Icon.Eye className=\"w-20 h-20\" />
                                    <span className=\"hidden md:inline text-[12px] font-bold whitespace-nowrap\">متابعة الجرد</span>
                                </button>
                            )}"""
if old_button not in r: raise SystemExit('runtime button anchor failed')
r=r.replace(old_button,new_button,1)
r=r.replace("window.location.href = './admin-stocktake.html?v=56.0';", "window.location.href = './admin-stocktake.html?v=56.12';")
RUNTIME.write_text(r,encoding='utf-8')

# Admin dashboard copy/link cleanup.
d=DASH.read_text(encoding='utf-8')
d=d.replace("window.location.href='./admin-stocktake.html?v=56.0'", "window.location.href='./admin-stocktake.html?v=56.12'")
d=d.replace('حملات الجرد، الفرق، رفع ملفات Excel، صلاحيات الموظفين، النواقص، الملاحظات وسجل التعديلات.','الجرد من المخزون الحالي، فرق الجرد، صلاحيات الموظفين والمحاسب، النواقص، الزيادات، الملاحظات وسجل التعديلات.')
DASH.write_text(d,encoding='utf-8')

# Force fresh runtime after deployment.
i=INDEX.read_text(encoding='utf-8')
i=re.sub(r"const CORE='./runtime/index-v37-source\.txt\?v=[^']+';", "const CORE='./runtime/index-v37-source.txt?v=56.16';", i, count=1)
INDEX.write_text(i,encoding='utf-8')

print('V56.12 patch applied')