from pathlib import Path

ADMIN = Path('admin-stocktake.html')
GATE = Path('.github/workflows/site-quality-gate.yml')

s = ADMIN.read_text()


def once(old: str, new: str, label: str) -> None:
    global s
    count = s.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one anchor, found {count}')
    s = s.replace(old, new, 1)


test_modal = r'''
<div id="testModal" class="modalbg"><div class="modal"><h3>🧪 تجربة الجرد</h3><div class="success">وضع اختبار معزول: يأخذ عينة مباشرة من المخزون الحالي، بدون Excel، ولا يغيّر كميات المخزون الحقيقي.</div><div class="fields section"><div class="field"><label>المخزون المستخدم في التجربة</label><select id="testWarehouse" class="select"><option value="jeddah">مخزون جدة</option><option value="riyadh">مخزون الرياض</option></select></div><div class="field"><label>عدد أصناف التجربة</label><input id="testCount" class="input" type="number" inputmode="numeric" min="1" max="30" value="12"></div></div><div class="muted section">سيُنشأ ملف جرد باسم «🧪 تجربة الجرد» ومجموعة اختبار مرتبطة بحساب مهند. بعدها استخدم نفس زر «بدء الجرد الآن» ونفس واجهة الجرد الحقيقية.</div><div class="modalactions"><button id="testCancel" class="btn">إلغاء</button><button id="testCreate" class="btn info">إنشاء التجربة</button></div></div></div>
'''
once('\n<div id="teamModal" class="modalbg">', test_modal + '<div id="teamModal" class="modalbg">', 'test modal')

once(
    '</div><button id="newCampaign" class="btn primary">+ ملف جديد</button></div><div class="campaigns section">',
    '</div><button id="testCampaign" class="btn info">🧪 تجربة الجرد</button><button id="newCampaign" class="btn primary">+ ملف جديد</button></div><div class="campaigns section">',
    'test button',
)

once(
    '<span class="pill ${c.status===\'active\'?\'ok\':c.status===\'closed\'?\'bad\':c.status===\'ready\'?\'info\':\'\'}">${campaignStatus(c.status)}</span>',
    '${c.isTest?\'<span class="pill info">اختبار</span>\':\'\'}<span class="pill ${c.status===\'active\'?\'ok\':c.status===\'closed\'?\'bad\':c.status===\'ready\'?\'info\':\'\'}">${campaignStatus(c.status)}</span>',
    'test campaign list badge',
)

once(
    '</div><div class="muted section">لا يوجد أي تعديل تلقائي للمخزون. النتائج هنا مرجع للمحاسب فقط، والتسوية الفعلية تبقى من صلاحيات المحاسب في النظام المحاسبي.</div>`}',
    '</div>${cp.isTest?\'<div class="success">🧪 وضع اختبار — المصدر هو المخزون الحالي مباشرة، ولا يحتاج Excel، ولا يغيّر كميات المخزون الحقيقي.</div>\':\'\'}<div class="muted section">لا يوجد أي تعديل تلقائي للمخزون. النتائج هنا مرجع للمحاسب فقط، والتسوية الفعلية تبقى من صلاحيات المحاسب في النظام المحاسبي.</div>`}',
    'test campaign banner',
)

once(
    '<button id="closeCampaign" class="btn bad" ${cp.status!==\'active\'?\'disabled\':\'\'}>إنهاء الجرد وإرساله للتسوية</button>',
    '<button id="closeCampaign" class="btn bad" ${cp.status!==\'active\'?\'disabled\':\'\'}>${cp.isTest?\'إنهاء التجربة\':\'إنهاء الجرد وإرساله للتسوية\'}</button>',
    'test close label',
)

once(
    "function importHtml(cp){const im=state.import,canImport=['draft','ready'].includes(cp.status);",
    "function importHtml(cp){if(cp.isTest)return '<div class=\"success section\">🧪 أصناف هذه التجربة مأخوذة تلقائيًا من المخزون الحالي؛ رفع Excel غير مطلوب في وضع الاختبار.</div>';const im=state.import,canImport=['draft','ready'].includes(cp.status);",
    'test import bypass',
)

once(
    "function bindUi(){$('#newCampaign')?.addEventListener('click',openCampaignModal);",
    "function bindUi(){$('#testCampaign')?.addEventListener('click',openTestModal);$('#newCampaign')?.addEventListener('click',openCampaignModal);",
    'bind test button',
)

test_logic = r'''const TEST_INVENTORY_SOURCES={jeddah:{label:'جدة',url:'./data/jeddah.tsv'},riyadh:{label:'الرياض',url:'./data/riyadh.tsv'}};
function parseTestInventoryTsv(text){const lines=String(text||'').replace(/^\uFEFF/,'').split(/\r?\n/).filter(x=>x.trim());if(lines.length<2)return[];const headers=lines[0].split('\t').map(x=>String(x||'').trim()),find=tests=>headers.findIndex(h=>tests.some(rx=>rx.test(h))),skuIdx=find([/رقم\s*الصنف/i,/كود\s*الصنف/i,/item\s*(?:no|code)/i,/sku/i]),qtyIdx=find([/الكمية\s*المتوفرة/i,/كمية\s*النظام/i,/الكمية/i,/الرصيد/i,/qty/i,/quantity/i]),nameIdx=find([/اسم\s*الصنف/i,/الوصف/i,/description/i,/name/i]),packIdx=find([/الشد/i,/pack/i]);if(skuIdx<0||qtyIdx<0)return[];return lines.slice(1).map((line,i)=>{const c=line.split('\t'),sku=String(c[skuIdx]??'').trim(),qty=num(c[qtyIdx]);return{row:i+2,sku,qty,name:nameIdx>=0?String(c[nameIdx]??'').trim():'',pack:packIdx>=0?String(c[packIdx]??'').trim():''}}).filter(r=>r.sku&&Number.isFinite(r.qty)&&r.qty>=0)}
function pickTestInventoryRows(rows,count){const wanted=Math.min(30,Math.max(1,Math.trunc(Number(count)||12))),positive=rows.filter(r=>r.qty>0),pool=positive.length>=wanted?positive:rows;if(!pool.length)return[];const step=Math.max(1,Math.floor(pool.length/wanted)),out=[],seen=new Set();for(let i=0;i<pool.length&&out.length<wanted;i+=step){const r=pool[i],k=norm(r.sku);if(k&&!seen.has(k)){seen.add(k);out.push(r)}}if(out.length<wanted){for(const r of pool){const k=norm(r.sku);if(k&&!seen.has(k)){seen.add(k);out.push(r);if(out.length>=wanted)break}}}return out}
function activeStocktakeCampaign(){const activeId=String(state.control?.activeCampaignId||'').trim();return activeId?state.campaigns.find(c=>c.id===activeId&&c.status==='active')||null:null}
function openTestModal(){const active=activeStocktakeCampaign();if(active)return toast(`أنه الجرد النشط «${active.name||'الحالي'}» أولًا قبل إنشاء تجربة`);$('#testWarehouse').value='jeddah';$('#testCount').value='12';$('#testModal').classList.add('open');setTimeout(()=>$('#testWarehouse').focus(),60)}
$('#testCancel').onclick=()=>$('#testModal').classList.remove('open');$('#testModal').onclick=e=>{if(e.target.id==='testModal')$('#testCancel').click()};$('#testCreate').onclick=()=>createTestCampaign();
async function createTestCampaign(){const key=$('#testWarehouse').value,source=TEST_INVENTORY_SOURCES[key]||TEST_INVENTORY_SOURCES.jeddah,wanted=Math.min(30,Math.max(1,Math.trunc(Number($('#testCount').value)||12))),button=$('#testCreate'];button.disabled=true;button.textContent='جاري تجهيز التجربة...';try{const active=activeStocktakeCampaign();if(active)throw new Error('ACTIVE_STOCKTAKE_EXISTS');const response=await fetch(`${source.url}?test=${Date.now()}`,{cache:'no-store'});if(!response.ok)throw new Error(`INVENTORY_HTTP_${response.status}`);const rows=pickTestInventoryRows(parseTestInventoryTsv(await response.text()),wanted);if(!rows.length)throw new Error('NO_TEST_INVENTORY_ROWS');const campaignRef=db.collection('stocktake_campaigns').doc(),teamRef=db.collection('stocktake_teams').doc(),now=firebase.firestore.FieldValue.serverTimestamp(),stocktakeDate=new Date(Date.now()+3*3600*1000).toISOString().slice(0,10),name=`🧪 تجربة الجرد — ${source.label}`,scope=`تجربة من المخزون الحالي — ${source.label}`,campaignPayload={name,warehouse:source.label,stocktakeDate,status:'draft',isTest:true,testMode:true,testSource:'current_inventory',testWarehouseKey:key,testSampleSize:rows.length,schemaVersion:2,createdAt:now,createdBy:'مهند'},teamPayload={campaignId:campaignRef.id,name:'🧪 مجموعة الاختبار',scope,zone:scope,memberEmployeeIds:[ROOT_ID],memberEmployeeNames:['مهند'],extraMemberNames:[],status:'active',isTest:true,testMode:true,testSource:'current_inventory',orderIndex:0,updatedAt:now,updatedBy:'مهند',createdAt:now,createdBy:'مهند',schemaVersion:2},batch=db.batch();batch.set(campaignRef,campaignPayload);batch.set(teamRef,teamPayload);rows.forEach((r,index)=>batch.set(db.collection('stocktake_items').doc(itemId(campaignRef.id,r.sku)),{campaignId:campaignRef.id,campaignName:name,teamId:teamRef.id,teamName:teamPayload.name,scope,zone:scope,sku:r.sku,normalizedSku:norm(r.sku),name:r.name,expectedQty:Number(r.qty),pack:r.pack,countStatus:'pending',actualQty:null,difference:null,note:'',hasNote:false,revision:0,orderIndex:index,updatedAt:now,importedAt:now,importedBy:'مهند',importFileName:'',sourceMode:'current_inventory',isTest:true,testMode:true,schemaVersion:2}));await batch.commit();state.campaign={id:campaignRef.id,...campaignPayload,createdAt:null};state.import={file:null,rows:[],headers:[],map:{sku:'',qty:'',pack:'',name:''},teamId:'',errors:[],headerRow:0};$('#testCancel').click();bindSelected();render();await auditAdmin('test_campaign_created',{campaignId:campaignRef.id,teamId:teamRef.id,warehouse:source.label,testSource:'current_inventory',itemCount:rows.length});toast(`تم إنشاء تجربة الجرد من ${source.label}: ${rows.length} صنف`)}catch(e){console.error(e);toast(e.message==='ACTIVE_STOCKTAKE_EXISTS'?'لا يمكن إنشاء تجربة أثناء وجود جرد نشط':e.message==='NO_TEST_INVENTORY_ROWS'?'لا توجد أصناف صالحة للتجربة في المخزون الحالي':'تعذر تجهيز تجربة الجرد من المخزون الحالي')}finally{button.disabled=false;button.textContent='إنشاء التجربة'}}
'''
once('function openCampaignModal(){', test_logic + 'function openCampaignModal(){', 'test implementation')

once(
    "function campaignReadiness(){const problems=[];if(!state.teams.length)problems.push('لا توجد مجموعات');for(const t of state.teams){const count=state.items.filter(i=>i.teamId===t.id).length;if(!count)problems.push(`${t.name}: لم يرفع ملف Excel`);",
    "function campaignReadiness(){const problems=[];if(!state.teams.length)problems.push('لا توجد مجموعات');for(const t of state.teams){const count=state.items.filter(i=>i.teamId===t.id).length;if(!count)problems.push(state.campaign?.isTest?`${t.name}: لا توجد أصناف اختبار`:`${t.name}: لم يرفع ملف Excel`);",
    'test readiness message',
)

once(
    "if(!confirm('بدء الجرد الآن؟ ستظهر الميزة لأعضاء اللجان أصحاب الحسابات وتثبت ملفات Excel كمرجع للجرد.'))return;",
    "const otherActive=activeStocktakeCampaign();if(state.campaign.isTest&&otherActive&&otherActive.id!==state.campaign.id)return toast('لا يمكن بدء تجربة أثناء وجود جرد نشط');const startMessage=state.campaign.isTest?'بدء تجربة الجرد الآن؟ ستستخدم نفس واجهة الجرد الحقيقية، لكن الحملة موسومة كتجربة ولا تغيّر المخزون الحقيقي.':'بدء الجرد الآن؟ ستظهر الميزة لأعضاء اللجان أصحاب الحسابات وتثبت ملفات Excel كمرجع للجرد.';if(!confirm(startMessage))return;",
    'test activation copy and safety',
)

once(
    "if(!confirm('إنهاء الجرد وإقفاله للموظفين؟ ستبقى النتائج والفروقات محفوظة للمحاسب.'))return;",
    "const closeMessage=state.campaign.isTest?'إنهاء تجربة الجرد؟ ستتوقف واجهة التجربة وتبقى النتائج محفوظة للمراجعة فقط.':'إنهاء الجرد وإقفاله للموظفين؟ ستبقى النتائج والفروقات محفوظة للمحاسب.';if(!confirm(closeMessage))return;",
    'test close confirmation',
)

once(
    "toast('تم إغلاق الجرد — النتائج جاهزة للتسوية')",
    "toast(state.campaign?.isTest?'تم إنهاء تجربة الجرد':'تم إغلاق الجرد — النتائج جاهزة للتسوية')",
    'test close toast',
)

once(
    "campaign_created:'إنشاء ملف الجرد',",
    "campaign_created:'إنشاء ملف الجرد',test_campaign_created:'إنشاء تجربة جرد',",
    'test audit label',
)

ADMIN.write_text(s)

g = GATE.read_text()
old_files = "files=['index.html','customer.html','runtime/index-v37-source.txt','runtime/customer-v37-source.txt','admin-dashboard.html','stocktake.html','admin-stocktake.html','security-center.html','customer-sw.js','tests/v56-stocktake-workflow.mjs']"
new_files = "files=['index.html','customer.html','runtime/index-v37-source.txt','runtime/customer-v37-source.txt','admin-dashboard.html','stocktake.html','admin-stocktake.html','security-center.html','customer-sw.js','tests/v56-stocktake-workflow.mjs','tests/v56-3-stocktake-test-mode.mjs']"
if g.count(old_files) != 1:
    raise SystemExit('quality file list anchor mismatch')
g = g.replace(old_files, new_files, 1)

invariant = "            'stocktake V56 immutable root': \"ROOT_ID='admin_mohanad'\" in stock and \"ROOT_ID='admin_mohanad'\" in stockadm,"
new_invariant = "            'stocktake V56 test mode from current inventory': 'تجربة الجرد' in stockadm and \"testSource:'current_inventory'\" in stockadm and './data/jeddah.tsv' in stockadm and './data/riyadh.tsv' in stockadm,\n" + invariant
if g.count(invariant) != 1:
    raise SystemExit('quality invariant anchor mismatch')
g = g.replace(invariant, new_invariant, 1)

node_line = '          node tests/v56-stocktake-workflow.mjs\n'
if g.count(node_line) != 1:
    raise SystemExit('quality node anchor mismatch')
g = g.replace(node_line, node_line + '          node tests/v56-3-stocktake-test-mode.mjs\n', 1)
GATE.write_text(g)
