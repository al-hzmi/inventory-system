from pathlib import Path

ROOT=Path('.')

def replace_once(path,old,new,label):
    p=ROOT/path
    s=p.read_text()
    if old not in s:
        raise SystemExit(f'{label}: anchor missing in {path}')
    if s.count(old)!=1:
        raise SystemExit(f'{label}: expected one anchor in {path}, got {s.count(old)}')
    p.write_text(s.replace(old,new,1))

def insert_once(path,anchor,addition,label,before=False):
    p=ROOT/path
    s=p.read_text()
    if addition in s:
        return
    if anchor not in s:
        raise SystemExit(f'{label}: anchor missing in {path}')
    if s.count(anchor)!=1:
        raise SystemExit(f'{label}: expected one anchor in {path}, got {s.count(anchor)}')
    p.write_text(s.replace(anchor,(addition+anchor) if before else (anchor+addition),1))

# ---------------------------------------------------------------------------
# Stocktake V56.11 — mobile edit safety, numeric-first keyboard, root override,
# and intentionally terse field copy.
# ---------------------------------------------------------------------------
stock=Path('stocktake.html')
s=stock.read_text()

replace_once(Path('stocktake.html'),
"const STORAGE={NAME:'inventory_user_name_v2',TOKEN:'inventory_admin_token_v2',EMPLOYEE_ID:'inventory_employee_id_v2',AUTH_VERSION:'inventory_employee_auth_version_v2',PHOTO:'inventory_login_photo_proof_v2'};const ADMIN_HASH='1jh297-spgf2z',ROOT_ID='admin_mohanad',CONTROL_DOC='stocktake_feature',DEFAULT_CONTROL={enabled:false,accessMode:'none',allowedEmployeeIds:[],allowedEmployeeNames:[],activeCampaignId:''};",
"const STORAGE={NAME:'inventory_user_name_v2',TOKEN:'inventory_admin_token_v2',EMPLOYEE_ID:'inventory_employee_id_v2',AUTH_VERSION:'inventory_employee_auth_version_v2',PHOTO:'inventory_login_photo_proof_v2'};const ADMIN_HASH='1jh297-spgf2z',ROOT_ID='admin_mohanad',CONTROL_DOC='stocktake_feature',DEFAULT_CONTROL={enabled:false,accessMode:'none',allowedEmployeeIds:[],allowedEmployeeNames:[],activeCampaignId:'',searchKeyboardMode:'numeric'};",
'stocktake keyboard control default')

mobile_style='''\n<style id="v56-11-mobile-fix">\nhtml,body{overflow-x:hidden}\n.editrow{grid-template-columns:minmax(0,1fr) auto!important;align-items:stretch}\n.actual{width:100%;min-width:0}\n.operatorActions{display:flex;align-items:center;gap:7px;flex-wrap:wrap;justify-content:flex-end}\n.keyboardModeBtn{height:32px;min-width:46px;padding:0 10px;border:1px solid #e7e5e4;border-radius:9px;background:#fff;color:#57534e;font-size:10px;font-weight:700;direction:ltr}\n@media(max-width:520px){.editrow{grid-template-columns:minmax(0,1fr)!important}.save{width:100%;min-width:0}.actual{width:100%;min-width:0}}\n</style>\n'''
insert_once(Path('stocktake.html'),'</head>',mobile_style,'stocktake V56.11 mobile style',before=True)

replace_once(Path('stocktake.html'),
"isTest=Boolean(state.campaign.isTest||state.campaign.testMode||state.campaign.sourceMode==='test');const activeHtml=active?`<div class=\"activeResult\">${cardHtml(active,readonly)}</div>`:(state.search?'<div class=\"searchEmpty\">لم يتم العثور على صنف مطابق. تأكد من رقم الصنف أو امسح الباركود مرة أخرى.</div>':'<div class=\"searchEmpty\">اكتب رقم الصنف أو امسح الباركود. لن تظهر بقية الأصناف هنا حتى لا تربك عملية الجرد.</div>');",
"isTest=Boolean(state.campaign.isTest||state.campaign.testMode||state.campaign.sourceMode==='test'),keyboardMode=state.control?.searchKeyboardMode==='text'?'text':'numeric';const activeHtml=active?`<div class=\"activeResult\">${cardHtml(active,readonly)}</div>`:(state.search?'<div class=\"searchEmpty\">الصنف غير موجود</div>':'');",
'stocktake concise empty state and keyboard mode')

replace_once(Path('stocktake.html'),
"<div class=\"operatorHead\"><div><div class=\"operatorTitle\">إدخال الجرد</div><div class=\"operatorSub\">رقم الصنف أو الباركود فقط</div></div><span class=\"readyBadge\">${readonly?'مغلق':'جاهز'}</span></div><div class=\"searchWrap\"><input id=\"search\" class=\"search\" value=\"${esc(state.search)}\" inputmode=\"text\" autocomplete=\"off\" placeholder=\"اكتب رقم الصنف\">",
"<div class=\"operatorHead\"><div><div class=\"operatorTitle\">إدخال الجرد</div><div class=\"operatorSub\">رقم الصنف أو الباركود</div></div><div class=\"operatorActions\"><span class=\"readyBadge\">${readonly?'مغلق':'جاهز'}</span>${user.isAdmin?`<button id=\"keyboardModeBtn\" class=\"keyboardModeBtn\" type=\"button\" title=\"تبديل لوحة الإدخال لجميع لجان الجرد\">${keyboardMode==='text'?'ABC':'123'}</button>`:''}</div></div><div class=\"searchWrap\"><input id=\"search\" class=\"search\" value=\"${esc(state.search)}\" inputmode=\"${keyboardMode}\" enterkeyhint=\"search\" autocomplete=\"off\" placeholder=\"اكتب رقم الصنف\">",
'stocktake numeric keyboard and root toggle')

replace_once(Path('stocktake.html'),
"</button></div><div class=\"operatorHint\">يمكن مسح الباركود الطويل مباشرة؛ النظام يستخرج رقم الصنف منه تلقائيًا مثل بحث المخزون. كمية النظام تبقى مخفية حتى اعتماد العد الأول.</div>${activeHtml}</div>",
"</button></div>${activeHtml}</div>",
'remove generated-looking operator hint')

replace_once(Path('stocktake.html'),
"<div class=\"completedTitle\">المنجز حديثًا</div><div class=\"completedSub\">يظهر هنا فقط ما تم جرده ويمكن فتحه للتعديل عند العثور على كمية لاحقًا.</div>",
"<div class=\"completedTitle\">المنجز حديثًا</div>",
'remove completed guidance copy')

replace_once(Path('stocktake.html'),
"`<div class=\"blind\">العد الأول أعمى: أدخل الموجود فعليًا أولًا، وبعد الاعتماد سيظهر مقدار النقص أو الزيادة تلقائيًا.</div>`",
"`<div class=\"blind\"></div>`",
'remove blind-count prose')

replace_once(Path('stocktake.html'),
"<div class=\"editbox ${state.activeEditId===i.id?'open':''}\" id=\"edit_${i.id}\"><div class=\"editrow\"><input class=\"actual\" id=\"actual_${i.id}\" inputmode=\"decimal\" value=\"${counted?esc(i.actualQty):''}\" placeholder=\"الكمية الفعلية\"><button class=\"save\" data-save=\"${i.id}\">اعتماد</button></div><div class=\"hint\" id=\"preview_${i.id}\">${counted?'يمكن تعديل الإجمالي النهائي. سيُحفظ التعديل كاملًا في سجل الجرد.':'لن تظهر كمية النظام أو الفرق قبل الاعتماد الأول.'}</div></div>",
"<div class=\"editbox ${state.activeEditId===i.id?'open':''}\" id=\"edit_${i.id}\"><div class=\"editrow\"><input class=\"actual\" id=\"actual_${i.id}\" inputmode=\"decimal\" value=\"${counted?esc(i.actualQty):''}\" placeholder=\"الكمية الفعلية\"><button class=\"save\" data-save=\"${i.id}\">اعتماد</button></div></div>",
'remove edit guidance copy')

replace_once(Path('stocktake.html'),
"if(state.activeEditId)setTimeout(()=>{const el=$(`#actual_${CSS.escape(state.activeEditId)}`);if(el){el.focus();el.select();el.scrollIntoView({block:'center',behavior:'smooth'})}},50)",
"if(state.activeEditId)setTimeout(()=>{const el=$(`#actual_${CSS.escape(state.activeEditId)}`);if(el){try{el.focus({preventScroll:true})}catch{el.focus()}el.select()}},50)",
'avoid iOS forced scroll during edit')

keyboard_handler="""$('#keyboardModeBtn')?.addEventListener('click',async()=>{if(!user.isAdmin)return;const next=state.control?.searchKeyboardMode==='text'?'numeric':'text';try{state.control.searchKeyboardMode=next;render();await db.collection('system_controls').doc(CONTROL_DOC).set({searchKeyboardMode:next,searchKeyboardUpdatedAt:firebase.firestore.FieldValue.serverTimestamp(),searchKeyboardUpdatedBy:ROOT_ID},{merge:true});toast(next==='numeric'?'لوحة الأرقام مفعلة':'لوحة الإدخال الكاملة مفعلة')}catch(e){console.error(e);toast('تعذر تغيير لوحة الإدخال')}});"""
insert_once(Path('stocktake.html'),"$('#scanBtn')?.addEventListener('click',()=>{ensureFeedbackAudio();startScanner()});",keyboard_handler,'root keyboard mode handler',before=True)

# Cache-bust the stocktake shell after the mobile/keyboard changes.
replace_once(Path('admin-stocktake-shell.html'),'stocktake.html?v=56.9','stocktake.html?v=56.11','employee stocktake cache key')
replace_once(Path('admin-stocktake-shell.html'),'admin-stocktake.html?embedded=1&v=56.9','admin-stocktake.html?embedded=1&v=56.11','admin stocktake cache key')

# ---------------------------------------------------------------------------
# Messaging V56.11 — local delivery receipt is authoritative for replay
# prevention; Firestore update remains a best-effort second layer. Legacy
# one-time next-open messages created before this fix are quarantined.
# ---------------------------------------------------------------------------
EMP_HELPER="""
const EMPLOYEE_NOTIFICATION_LEGACY_ONCE_CUTOFF_MS=Date.parse('2026-09-02T02:24:00+03:00');
const EMPLOYEE_NOTIFICATION_RECEIPT_PREFIX='batco_employee_notification_receipts_v2_';
const readEmployeeNotificationLedger=key=>{try{const v=JSON.parse(localStorage.getItem(key)||'{}');return v&&typeof v==='object'?v:{}}catch{return{}}};
const employeeLocalNotificationShows=(key,id)=>Math.max(0,Number(readEmployeeNotificationLedger(key)[id])||0);
const bumpEmployeeLocalNotificationShows=(key,id)=>{try{const v=readEmployeeNotificationLedger(key);v[id]=Math.max(0,Number(v[id])||0)+1;localStorage.setItem(key,JSON.stringify(v));return v[id]}catch{return 0}};
"""
insert_once(Path('runtime/index-v37-source.txt'),"const EMPLOYEE_NOTIFICATION_COLLECTION = 'employee_notifications';",EMP_HELPER,'employee local notification receipt')

replace_once(Path('runtime/index-v37-source.txt'),
"const targetKeys=employeeAliasVariants(sessionName);\n        const matchesTarget=row=>",
"const targetKeys=employeeAliasVariants(sessionName);\n        const receiptKey=EMPLOYEE_NOTIFICATION_RECEIPT_PREFIX+(employeeId||normalizeText(sessionName)||'unknown');\n        const localShows=id=>employeeLocalNotificationShows(receiptKey,id);\n        const rememberShow=row=>bumpEmployeeLocalNotificationShows(receiptKey,row.id);\n        const rowTime=v=>v?.toMillis?v.toMillis():new Date(v||0).getTime()||0;\n        const matchesTarget=row=>",
'employee receipt scope')

old_emp_due="const due=row=>{if(row.status!=='active'||!matchesTarget(row))return false;const max=Math.max(1,Number(row.maxShows)||1),shown=Math.max(0,Number(row.shownCount)||0);if(shown>=max)return false;if(row.deliveryMode==='scheduled'){const ms=row.scheduledAt?.toMillis?row.scheduledAt.toMillis():new Date(row.scheduledAt||0).getTime();if(!ms||ms>Date.now())return false;}return true};"
new_emp_due="const due=(row,serverOnly=false)=>{if(row.status!=='active'||!matchesTarget(row))return false;const max=Math.max(1,Number(row.maxShows)||1),serverShown=Math.max(0,Number(row.shownCount)||0),localShown=serverOnly?0:localShows(row.id),shown=Math.max(serverShown,localShown);if(shown>=max)return false;if(!serverOnly&&max===1&&row.deliveryMode!=='scheduled'&&serverShown===0&&localShown===0){const created=rowTime(row.createdAt);if(created&&created<EMPLOYEE_NOTIFICATION_LEGACY_ONCE_CUTOFF_MS)return false}if(row.deliveryMode==='scheduled'){const ms=rowTime(row.scheduledAt);if(!ms||ms>Date.now())return false;}return true};"
replace_once(Path('runtime/index-v37-source.txt'),old_emp_due,new_emp_due,'employee due policy')
replace_once(Path('runtime/index-v37-source.txt'),'if(!due(row))return;const shown=','if(!due(row,true))return;const shown=','employee server receipt bypass')
replace_once(Path('runtime/index-v37-source.txt'),'claimedRef.current.add(candidate.id);currentRef.current=candidate;setNotification(candidate);markShown(candidate)','claimedRef.current.add(candidate.id);currentRef.current=candidate;rememberShow(candidate);setNotification(candidate);markShown(candidate)','employee local receipt before display')

CUST_HELPER="""
const CUSTOMER_NOTIFICATION_LEGACY_ONCE_CUTOFF_MS=Date.parse('2026-09-02T02:24:00+03:00');
const CUSTOMER_NOTIFICATION_RECEIPT_PREFIX='batco_customer_notification_receipts_v2_';
const readCustomerNotificationLedger=key=>{try{const v=JSON.parse(localStorage.getItem(key)||'{}');return v&&typeof v==='object'?v:{}}catch{return{}}};
const customerLocalNotificationShows=(key,id)=>Math.max(0,Number(readCustomerNotificationLedger(key)[id])||0);
const bumpCustomerLocalNotificationShows=(key,id)=>{try{const v=readCustomerNotificationLedger(key);v[id]=Math.max(0,Number(v[id])||0)+1;localStorage.setItem(key,JSON.stringify(v));return v[id]}catch{return 0}};
"""
insert_once(Path('runtime/customer-v37-source.txt'),"const CUSTOMER_NOTIFICATION_COLLECTION='customer_notifications';",CUST_HELPER,'customer local notification receipt')

replace_once(Path('runtime/customer-v37-source.txt'),
"let active=true,visitorUnsub=null,uidUnsub=null,authUnsub=null,timer=null;\n    const matches=row=>",
"let active=true,visitorUnsub=null,uidUnsub=null,authUnsub=null,timer=null;\n    const receiptKey=CUSTOMER_NOTIFICATION_RECEIPT_PREFIX+(customerVisitorId||'unknown');\n    const localShows=id=>customerLocalNotificationShows(receiptKey,id);\n    const rememberShow=row=>bumpCustomerLocalNotificationShows(receiptKey,row.id);\n    const rowTime=v=>v?.toMillis?v.toMillis():new Date(v||0).getTime()||0;\n    const matches=row=>",
'customer receipt scope')

old_cust_due="const due=row=>{if(row.status!=='active'||!matches(row))return false;const max=Math.max(1,Number(row.maxShows)||1),shown=Math.max(0,Number(row.shownCount)||0);if(shown>=max)return false;if(row.deliveryMode==='scheduled'){const ms=row.scheduledAt?.toMillis?row.scheduledAt.toMillis():new Date(row.scheduledAt||0).getTime();if(!ms||ms>Date.now())return false;}return true};"
new_cust_due="const due=(row,serverOnly=false)=>{if(row.status!=='active'||!matches(row))return false;const max=Math.max(1,Number(row.maxShows)||1),serverShown=Math.max(0,Number(row.shownCount)||0),localShown=serverOnly?0:localShows(row.id),shown=Math.max(serverShown,localShown);if(shown>=max)return false;if(!serverOnly&&max===1&&row.deliveryMode!=='scheduled'&&serverShown===0&&localShown===0){const created=rowTime(row.createdAt);if(created&&created<CUSTOMER_NOTIFICATION_LEGACY_ONCE_CUTOFF_MS)return false}if(row.deliveryMode==='scheduled'){const ms=rowTime(row.scheduledAt);if(!ms||ms>Date.now())return false;}return true};"
replace_once(Path('runtime/customer-v37-source.txt'),old_cust_due,new_cust_due,'customer due policy')
replace_once(Path('runtime/customer-v37-source.txt'),'if(!due(row))return;const shown=','if(!due(row,true))return;const shown=','customer server receipt bypass')
replace_once(Path('runtime/customer-v37-source.txt'),'claimedRef.current.add(candidate.id);currentRef.current=candidate;setNotification(candidate);markShown(candidate)','claimedRef.current.add(candidate.id);currentRef.current=candidate;rememberShow(candidate);setNotification(candidate);markShown(candidate)','customer local receipt before display')

# New messages carry a receipt policy marker for diagnostics/future migrations.
replace_once(Path('admin-dashboard.html'),"deliveryMode:mode,scheduledAt,maxShows:shows,shownCount:0,status:'active',createdBy:'مهند'","deliveryMode:mode,scheduledAt,maxShows:shows,shownCount:0,status:'active',receiptPolicyVersion:2,createdBy:'مهند'",'employee message receipt policy marker')
# The same literal appears once more for customer notifications after the first replacement.
replace_once(Path('admin-dashboard.html'),"deliveryMode:mode,scheduledAt,maxShows:shows,shownCount:0,status:'active',createdBy:'مهند'","deliveryMode:mode,scheduledAt,maxShows:shows,shownCount:0,status:'active',receiptPolicyVersion:2,createdBy:'مهند'",'customer message receipt policy marker')

# Runtime cache keys must move so the delivery fix cannot be hidden by an old core cache.
replace_once(Path('index.html'),"const CORE='./runtime/index-v37-source.txt?v=56.4';","const CORE='./runtime/index-v37-source.txt?v=56.11';",'employee runtime cache key')
replace_once(Path('customer.html'),"const CORE='./runtime/customer-v37-source.txt?v=56.4';","const CORE='./runtime/customer-v37-source.txt?v=56.11';",'customer runtime cache key')

# Existing regressions intentionally track the current cache contract.
replace_once(Path('tests/v56-4-messaging.mjs'),"setNotification(candidate);markShown(candidate)","rememberShow(candidate);setNotification(candidate);markShown(candidate)",'employee messaging regression local receipt')
# Same assertion string occurs for customer after first replacement.
replace_once(Path('tests/v56-4-messaging.mjs'),"setNotification(candidate);markShown(candidate)","rememberShow(candidate);setNotification(candidate);markShown(candidate)",'customer messaging regression local receipt')
replace_once(Path('tests/v56-4-messaging.mjs'),"index-v37-source.txt?v=56.4","index-v37-source.txt?v=56.11",'employee messaging cache regression')
replace_once(Path('tests/v56-4-messaging.mjs'),"customer-v37-source.txt?v=56.4","customer-v37-source.txt?v=56.11",'customer messaging cache regression')
replace_once(Path('tests/v56-5-stocktake-direct-mobile.mjs'),"admin-stocktake.html?embedded=1&v=56.9","admin-stocktake.html?embedded=1&v=56.11",'admin stocktake regression cache')
replace_once(Path('tests/v56-5-stocktake-direct-mobile.mjs'),"stocktake.html?v=56.9","stocktake.html?v=56.11",'employee stocktake regression cache')
replace_once(Path('tests/v56-10-critical-ux.mjs'),"admin-stocktake.html?embedded=1&v=56.9","admin-stocktake.html?embedded=1&v=56.11",'V56.10 admin stocktake cache')
replace_once(Path('tests/v56-10-critical-ux.mjs'),"stocktake.html?v=56.9","stocktake.html?v=56.11",'V56.10 employee stocktake cache')

# New regression dedicated to the four user-reported failures.
Path('tests/v56-11-ops-fixes.mjs').write_text(r'''import fs from 'node:fs';
import assert from 'node:assert/strict';
const stock=fs.readFileSync('stocktake.html','utf8');
const shell=fs.readFileSync('admin-stocktake-shell.html','utf8');
const idx=fs.readFileSync('runtime/index-v37-source.txt','utf8');
const cust=fs.readFileSync('runtime/customer-v37-source.txt','utf8');
const admin=fs.readFileSync('admin-dashboard.html','utf8');
const boot=fs.readFileSync('index.html','utf8');
const custBoot=fs.readFileSync('customer.html','utf8');
assert.ok(stock.includes('grid-template-columns:minmax(0,1fr) auto!important'),'edit row must shrink safely');
assert.ok(stock.includes('@media(max-width:520px){.editrow{grid-template-columns:minmax(0,1fr)!important}.save{width:100%'),'mobile edit must stack the save button');
assert.ok(stock.includes('.actual{width:100%;min-width:0}'),'quantity input must never force horizontal overflow');
assert.ok(stock.includes("searchKeyboardMode:'numeric'"),'numeric keyboard must be the stocktake default');
assert.ok(stock.includes("user.isAdmin?`<button id=\"keyboardModeBtn\""),'keyboard override must be root/admin-only');
assert.ok(stock.includes("searchKeyboardMode:next")&&stock.includes("searchKeyboardUpdatedBy:ROOT_ID"),'root keyboard override must be global through stocktake control');
assert.ok(stock.includes('inputmode=\"${keyboardMode}\"'),'search input must use central keyboard mode');
assert.ok(!stock.includes('يمكن مسح الباركود الطويل مباشرة؛ النظام يستخرج رقم الصنف منه تلقائيًا مثل بحث المخزون.'),'verbose operator hint must be removed');
assert.ok(!stock.includes('لن تظهر بقية الأصناف هنا حتى لا تربك عملية الجرد.'),'empty-state guidance must be removed');
assert.ok(!stock.includes('يمكن تعديل الإجمالي النهائي. سيُحفظ التعديل كاملًا في سجل الجرد.'),'edit guidance must be removed');
assert.ok(shell.includes('stocktake.html?v=56.11')&&shell.includes('admin-stocktake.html?embedded=1&v=56.11'),'stocktake cache keys must be V56.11');
for(const [name,src] of [['employee',idx],['customer',cust]]){
  assert.ok(src.includes('NOTIFICATION_LEGACY_ONCE_CUTOFF_MS'),`${name}: legacy once cutoff missing`);
  assert.ok(src.includes('LocalNotificationShows'),`${name}: local receipt ledger missing`);
  assert.ok(src.includes('rememberShow(candidate);setNotification(candidate);markShown(candidate)'),`${name}: local receipt must be persisted before display`);
  assert.ok(src.includes('if(!due(row,true))return'),`${name}: remote receipt must bypass local replay guard`);
}
assert.ok(admin.match(/receiptPolicyVersion:2/g)?.length>=2,'new employee and customer messages must carry receipt policy v2');
assert.ok(boot.includes('index-v37-source.txt?v=56.11'),'employee runtime cache bust missing');
assert.ok(custBoot.includes('customer-v37-source.txt?v=56.11'),'customer runtime cache bust missing');
console.log('V56.11 stocktake + one-time messaging regression: OK');
''')

# Final structural sanity.
for p in ['stocktake.html','runtime/index-v37-source.txt','runtime/customer-v37-source.txt','admin-dashboard.html','index.html','customer.html','admin-stocktake-shell.html']:
    text=Path(p).read_text()
    if '<<<<<<<' in text or '>>>>>>>' in text:
        raise SystemExit(f'merge marker in {p}')
print('V56.11 patch applied')
