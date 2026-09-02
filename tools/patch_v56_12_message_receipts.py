from pathlib import Path

def replace_once(path, old, new, label):
    p=Path(path)
    s=p.read_text(encoding='utf-8')
    n=s.count(old)
    if n!=1:
        raise SystemExit(f'{label}: expected 1 marker, found {n}')
    p.write_text(s.replace(old,new,1),encoding='utf-8')

employee='runtime/index-v37-source.txt'
customer='runtime/customer-v37-source.txt'

replace_once(employee,
"""const EMPLOYEE_NOTIFICATION_LEGACY_ONCE_CUTOFF_MS=Date.parse('2026-09-02T02:24:00+03:00');
const EMPLOYEE_NOTIFICATION_RECEIPT_PREFIX='batco_employee_notification_receipts_v2_';
const readEmployeeNotificationLedger=key=>{try{const v=JSON.parse(localStorage.getItem(key)||'{}');return v&&typeof v==='object'?v:{}}catch{return{}}};
const employeeLocalNotificationShows=(key,id)=>Math.max(0,Number(readEmployeeNotificationLedger(key)[id])||0);
const bumpEmployeeLocalNotificationShows=(key,id)=>{try{const v=readEmployeeNotificationLedger(key);v[id]=Math.max(0,Number(v[id])||0)+1;localStorage.setItem(key,JSON.stringify(v));return v[id]}catch{return 0}};""",
"""const EMPLOYEE_NOTIFICATION_RECEIPT_PREFIX='batco_employee_notification_receipts_v2_';
const EMPLOYEE_NOTIFICATION_RECEIPT_GLOBAL_KEY='batco_employee_notification_receipts_v3';
const readEmployeeNotificationLedger=key=>{try{const v=JSON.parse(localStorage.getItem(key)||'{}');return v&&typeof v==='object'?v:{}}catch{return{}}};
const employeeLocalNotificationShows=(key,id)=>Math.max(0,Number(readEmployeeNotificationLedger(key)[id])||0);
const bumpEmployeeLocalNotificationShows=(key,id)=>{try{const v=readEmployeeNotificationLedger(key);v[id]=Math.max(0,Number(v[id])||0)+1;localStorage.setItem(key,JSON.stringify(v));return v[id]}catch{return 0}};""",
'employee constants')

replace_once(employee,
"""        const receiptKey=EMPLOYEE_NOTIFICATION_RECEIPT_PREFIX+(employeeId||normalizeText(sessionName)||'unknown');
        const localShows=id=>employeeLocalNotificationShows(receiptKey,id);
        const rememberShow=row=>bumpEmployeeLocalNotificationShows(receiptKey,row.id);
        const rowTime=v=>v?.toMillis?v.toMillis():new Date(v||0).getTime()||0;""",
"""        const receiptKey=EMPLOYEE_NOTIFICATION_RECEIPT_PREFIX+(employeeId||normalizeText(sessionName)||'unknown');
        const localShows=id=>Math.max(employeeLocalNotificationShows(receiptKey,id),employeeLocalNotificationShows(EMPLOYEE_NOTIFICATION_RECEIPT_GLOBAL_KEY,id));
        const rememberShow=row=>Math.max(bumpEmployeeLocalNotificationShows(receiptKey,row.id),bumpEmployeeLocalNotificationShows(EMPLOYEE_NOTIFICATION_RECEIPT_GLOBAL_KEY,row.id));
        const legacyOnce=row=>Math.max(1,Number(row.maxShows)||1)===1&&Math.max(0,Number(row.receiptPolicyVersion)||0)<2;
        const rowTime=v=>v?.toMillis?v.toMillis():new Date(v||0).getTime()||0;""",
'employee receipt scope')

replace_once(employee,
"""        const due=(row,serverOnly=false)=>{if(row.status!=='active'||!matchesTarget(row))return false;const max=Math.max(1,Number(row.maxShows)||1),serverShown=Math.max(0,Number(row.shownCount)||0),localShown=serverOnly?0:localShows(row.id),shown=Math.max(serverShown,localShown);if(shown>=max)return false;if(!serverOnly&&max===1&&row.deliveryMode!=='scheduled'&&serverShown===0&&localShown===0){const created=rowTime(row.createdAt);if(created&&created<EMPLOYEE_NOTIFICATION_LEGACY_ONCE_CUTOFF_MS)return false}if(row.deliveryMode==='scheduled'){const ms=rowTime(row.scheduledAt);if(!ms||ms>Date.now())return false;}return true};""",
"""        const due=(row,serverOnly=false)=>{if(row.status!=='active'||!matchesTarget(row))return false;const max=Math.max(1,Number(row.maxShows)||1),serverShown=Math.max(0,Number(row.shownCount)||0),localShown=serverOnly?0:localShows(row.id),shown=Math.max(serverShown,localShown);if(shown>=max)return false;if(!serverOnly&&legacyOnce(row))return false;if(row.deliveryMode==='scheduled'){const ms=rowTime(row.scheduledAt);if(!ms||ms>Date.now())return false;}return true};""",
'employee due')

replace_once(employee,
"""        const markShown=async candidate=>{const db=dbRef.current;if(!db)return;""",
"""        const retireLegacy=async candidate=>{const db=dbRef.current;if(!db)return;const ref=db.collection(EMPLOYEE_NOTIFICATION_COLLECTION).doc(candidate.id);try{await db.runTransaction(async tx=>{const snap=await tx.get(ref);if(!snap.exists)return;const row={id:snap.id,...snap.data()},max=Math.max(1,Number(row.maxShows)||1),policy=Math.max(0,Number(row.receiptPolicyVersion)||0);if(row.status!=='active'||max!==1||policy>=2)return;tx.set(ref,{status:'completed',legacyReceiptSuppressed:true,legacyReceiptSuppressedAt:firebase.firestore.FieldValue.serverTimestamp(),updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true})})}catch(e){console.warn('[Employee legacy notification cleanup]',e)}};
        const markShown=async candidate=>{const db=dbRef.current;if(!db)return;""",
'employee retire helper')

replace_once(employee,
"""        const evaluate=()=>{if(!active||currentRef.current)return;const all=[...feedsRef.current.values()].flat(),dedup=[...new Map(all.map(r=>[r.id,r])).values()],at=x=>x?.toMillis?x.toMillis():new Date(x||0).getTime()||0;const candidates=dedup.filter(due).filter(r=>!claimedRef.current.has(r.id)).sort((a,b)=>(a.deliveryMode==='scheduled'?at(a.scheduledAt):at(a.createdAt))-(b.deliveryMode==='scheduled'?at(b.scheduledAt):at(b.createdAt)));const candidate=candidates[0];if(!candidate)return;claimedRef.current.add(candidate.id);currentRef.current=candidate;rememberShow(candidate);setNotification(candidate);markShown(candidate)};""",
"""        const evaluate=()=>{if(!active||currentRef.current)return;const all=[...feedsRef.current.values()].flat(),dedup=[...new Map(all.map(r=>[r.id,r])).values()],at=x=>x?.toMillis?x.toMillis():new Date(x||0).getTime()||0;dedup.filter(r=>r.status==='active'&&matchesTarget(r)&&legacyOnce(r)).forEach(r=>{if(claimedRef.current.has(r.id))return;claimedRef.current.add(r.id);retireLegacy(r)});const candidates=dedup.filter(due).filter(r=>!claimedRef.current.has(r.id)).sort((a,b)=>(a.deliveryMode==='scheduled'?at(a.scheduledAt):at(a.createdAt))-(b.deliveryMode==='scheduled'?at(b.scheduledAt):at(b.createdAt)));const candidate=candidates[0];if(!candidate)return;claimedRef.current.add(candidate.id);currentRef.current=candidate;rememberShow(candidate);setNotification(candidate);markShown(candidate)};""",
'employee evaluate')

replace_once(customer,
"""const CUSTOMER_NOTIFICATION_LEGACY_ONCE_CUTOFF_MS=Date.parse('2026-09-02T02:24:00+03:00');
const CUSTOMER_NOTIFICATION_RECEIPT_PREFIX='batco_customer_notification_receipts_v2_';
const readCustomerNotificationLedger=key=>{try{const v=JSON.parse(localStorage.getItem(key)||'{}');return v&&typeof v==='object'?v:{}}catch{return{}}};
const customerLocalNotificationShows=(key,id)=>Math.max(0,Number(readCustomerNotificationLedger(key)[id])||0);
const bumpCustomerLocalNotificationShows=(key,id)=>{try{const v=readCustomerNotificationLedger(key);v[id]=Math.max(0,Number(v[id])||0)+1;localStorage.setItem(key,JSON.stringify(v));return v[id]}catch{return 0}};""",
"""const CUSTOMER_NOTIFICATION_RECEIPT_PREFIX='batco_customer_notification_receipts_v2_';
const CUSTOMER_NOTIFICATION_RECEIPT_GLOBAL_KEY='batco_customer_notification_receipts_v3';
const readCustomerNotificationLedger=key=>{try{const v=JSON.parse(localStorage.getItem(key)||'{}');return v&&typeof v==='object'?v:{}}catch{return{}}};
const customerLocalNotificationShows=(key,id)=>Math.max(0,Number(readCustomerNotificationLedger(key)[id])||0);
const bumpCustomerLocalNotificationShows=(key,id)=>{try{const v=readCustomerNotificationLedger(key);v[id]=Math.max(0,Number(v[id])||0)+1;localStorage.setItem(key,JSON.stringify(v));return v[id]}catch{return 0}};""",
'customer constants')

replace_once(customer,
"""    const receiptKey=CUSTOMER_NOTIFICATION_RECEIPT_PREFIX+(customerVisitorId||'unknown');
    const localShows=id=>customerLocalNotificationShows(receiptKey,id);
    const rememberShow=row=>bumpCustomerLocalNotificationShows(receiptKey,row.id);
    const rowTime=v=>v?.toMillis?v.toMillis():new Date(v||0).getTime()||0;""",
"""    const receiptKey=CUSTOMER_NOTIFICATION_RECEIPT_PREFIX+(customerVisitorId||'unknown');
    const localShows=id=>Math.max(customerLocalNotificationShows(receiptKey,id),customerLocalNotificationShows(CUSTOMER_NOTIFICATION_RECEIPT_GLOBAL_KEY,id));
    const rememberShow=row=>Math.max(bumpCustomerLocalNotificationShows(receiptKey,row.id),bumpCustomerLocalNotificationShows(CUSTOMER_NOTIFICATION_RECEIPT_GLOBAL_KEY,row.id));
    const legacyOnce=row=>Math.max(1,Number(row.maxShows)||1)===1&&Math.max(0,Number(row.receiptPolicyVersion)||0)<2;
    const rowTime=v=>v?.toMillis?v.toMillis():new Date(v||0).getTime()||0;""",
'customer receipt scope')

replace_once(customer,
"""    const due=(row,serverOnly=false)=>{if(row.status!=='active'||!matches(row))return false;const max=Math.max(1,Number(row.maxShows)||1),serverShown=Math.max(0,Number(row.shownCount)||0),localShown=serverOnly?0:localShows(row.id),shown=Math.max(serverShown,localShown);if(shown>=max)return false;if(!serverOnly&&max===1&&row.deliveryMode!=='scheduled'&&serverShown===0&&localShown===0){const created=rowTime(row.createdAt);if(created&&created<CUSTOMER_NOTIFICATION_LEGACY_ONCE_CUTOFF_MS)return false}if(row.deliveryMode==='scheduled'){const ms=rowTime(row.scheduledAt);if(!ms||ms>Date.now())return false;}return true};""",
"""    const due=(row,serverOnly=false)=>{if(row.status!=='active'||!matches(row))return false;const max=Math.max(1,Number(row.maxShows)||1),serverShown=Math.max(0,Number(row.shownCount)||0),localShown=serverOnly?0:localShows(row.id),shown=Math.max(serverShown,localShown);if(shown>=max)return false;if(!serverOnly&&legacyOnce(row))return false;if(row.deliveryMode==='scheduled'){const ms=rowTime(row.scheduledAt);if(!ms||ms>Date.now())return false;}return true};""",
'customer due')

replace_once(customer,
"""    const markShown=async candidate=>{const ref=db.collection(CUSTOMER_NOTIFICATION_COLLECTION).doc(candidate.id);""",
"""    const retireLegacy=async candidate=>{const ref=db.collection(CUSTOMER_NOTIFICATION_COLLECTION).doc(candidate.id);try{await db.runTransaction(async tx=>{const snap=await tx.get(ref);if(!snap.exists)return;const row={id:snap.id,...snap.data()},max=Math.max(1,Number(row.maxShows)||1),policy=Math.max(0,Number(row.receiptPolicyVersion)||0);if(row.status!=='active'||max!==1||policy>=2)return;tx.set(ref,{status:'completed',legacyReceiptSuppressed:true,legacyReceiptSuppressedAt:firebase.firestore.FieldValue.serverTimestamp(),updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true})})}catch(e){console.warn('[Customer legacy notification cleanup]',e)}};
    const markShown=async candidate=>{const ref=db.collection(CUSTOMER_NOTIFICATION_COLLECTION).doc(candidate.id);""",
'customer retire helper')

replace_once(customer,
"""    const evaluate=()=>{if(!active||currentRef.current)return;const all=[...feedsRef.current.values()].flat(),dedup=[...new Map(all.map(r=>[r.id,r])).values()],at=x=>x?.toMillis?x.toMillis():new Date(x||0).getTime()||0,candidate=dedup.filter(due).filter(r=>!claimedRef.current.has(r.id)).sort((a,b)=>(a.deliveryMode==='scheduled'?at(a.scheduledAt):at(a.createdAt))-(b.deliveryMode==='scheduled'?at(b.scheduledAt):at(b.createdAt)))[0];if(!candidate)return;claimedRef.current.add(candidate.id);currentRef.current=candidate;rememberShow(candidate);setNotification(candidate);markShown(candidate)};""",
"""    const evaluate=()=>{if(!active||currentRef.current)return;const all=[...feedsRef.current.values()].flat(),dedup=[...new Map(all.map(r=>[r.id,r])).values()],at=x=>x?.toMillis?x.toMillis():new Date(x||0).getTime()||0;dedup.filter(r=>r.status==='active'&&matches(r)&&legacyOnce(r)).forEach(r=>{if(claimedRef.current.has(r.id))return;claimedRef.current.add(r.id);retireLegacy(r)});const candidate=dedup.filter(due).filter(r=>!claimedRef.current.has(r.id)).sort((a,b)=>(a.deliveryMode==='scheduled'?at(a.scheduledAt):at(a.createdAt))-(b.deliveryMode==='scheduled'?at(b.scheduledAt):at(b.createdAt)))[0];if(!candidate)return;claimedRef.current.add(candidate.id);currentRef.current=candidate;rememberShow(candidate);setNotification(candidate);markShown(candidate)};""",
'customer evaluate')

replace_once('index.html',"const CORE='./runtime/index-v37-source.txt?v=56.11';","const CORE='./runtime/index-v37-source.txt?v=56.12';",'employee cache bust')
replace_once('customer.html',"const CORE='./runtime/customer-v37-source.txt?v=56.11';","const CORE='./runtime/customer-v37-source.txt?v=56.12';",'customer cache bust')

test=Path('tests/v56-11-ops-fixes.mjs')
s=test.read_text(encoding='utf-8')
s=s.replace("assert.ok(src.includes('NOTIFICATION_LEGACY_ONCE_CUTOFF_MS'),`${name}: legacy once cutoff missing`);","assert.ok(src.includes('NOTIFICATION_RECEIPT_GLOBAL_KEY'),`${name}: identity-independent receipt ledger missing`);")
s=s.replace("  assert.ok(src.includes('if(!due(row,true))return'),`${name}: remote receipt must bypass local replay guard`);","  assert.ok(src.includes('if(!due(row,true))return'),`${name}: remote receipt must bypass local replay guard`);\n  assert.ok(src.includes('legacyReceiptSuppressed:true'),`${name}: legacy stuck once messages must retire server-side`);\n  assert.ok(src.includes('receiptPolicyVersion')&&src.includes('policy>=2'),`${name}: legacy detection must use receipt policy, not timestamps`);")
s=s.replace("assert.ok(boot.includes('index-v37-source.txt?v=56.11'),'employee runtime cache bust missing');","assert.ok(boot.includes('index-v37-source.txt?v=56.12'),'employee runtime cache bust missing');")
s=s.replace("assert.ok(custBoot.includes('customer-v37-source.txt?v=56.11'),'customer runtime cache bust missing');","assert.ok(custBoot.includes('customer-v37-source.txt?v=56.12'),'customer runtime cache bust missing');")
s=s.replace("console.log('V56.11 stocktake + one-time messaging regression: OK');","console.log('V56.12 durable one-time messaging regression: OK');")
test.write_text(s,encoding='utf-8')
