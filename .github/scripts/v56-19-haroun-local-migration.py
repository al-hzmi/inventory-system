from pathlib import Path


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'{label}: anchor missing')
    return text.replace(old, new, 1)

p = Path('customer.html')
s = p.read_text(encoding='utf-8')

old = """  const routeVisitorId=(()=>{try{return String(localStorage.getItem('batco_customer_visitor_id_v1')||'').trim()}catch{return''}})();
  const routeStickyVisitor=(()=>{try{return String(localStorage.getItem('batco_employee_onboarding_target_v1')||'').trim()}catch{return''}})();
  const redirectHarounToEmployee=()=>{try{sessionStorage.setItem('batco_employee_onboarding_notice_v1','haroon')}catch{}location.replace('./index.html?employee=1&onboard=haroon');};
  if(!employeeName&&routeVisitorId&&routeStickyVisitor===routeVisitorId){redirectHarounToEmployee();return;}
"""
new = """  const routeVisitorId=(()=>{try{return String(localStorage.getItem('batco_customer_visitor_id_v1')||'').trim()}catch{return''}})();
  const routeStickyVisitor=(()=>{try{return String(localStorage.getItem('batco_employee_onboarding_target_v1')||'').trim()}catch{return''}})();
  const redirectHarounToEmployee=()=>{try{sessionStorage.setItem('batco_employee_onboarding_notice_v1','haroon')}catch{}location.replace('./index.html?employee=1&onboard=haroon');};
  const routeKnownCustomerName=routeNormName(routeQuickProfile?.name||routeGuestName||'');
  const migrateHarounCustomerDevice=()=>{try{
    if(routeVisitorId)localStorage.setItem('batco_employee_onboarding_target_v1',routeVisitorId);
    localStorage.removeItem('batco_quick_customer_profile_v1');
    localStorage.removeItem('customer_guest_name_v1');
    localStorage.setItem('batco_haroun_customer_migrated_v1','1');
  }catch{}};
  // V56.19: Haroun was already saved as a passwordless customer. That old quickProfile.uid
  // must never suppress employee routing; migrate this device out of customer identity first.
  if(!employeeName&&params.get('employeeView')!=='1'&&routeKnownCustomerName==='هارون'){migrateHarounCustomerDevice();redirectHarounToEmployee();return;}
  if(!employeeName&&routeVisitorId&&routeStickyVisitor===routeVisitorId){redirectHarounToEmployee();return;}
"""
s = replace_once(s, old, new, 'Haroun local migration')

old_legacy = """  if(!employeeName&&params.get('employeeView')!=='1'&&!routeQuickProfile?.uid&&routeNormName(routeGuestName)==='هارون'){try{sessionStorage.setItem('batco_employee_onboarding_notice_v1','haroon')}catch{}location.replace('./index.html?employee=1&onboard=haroon');return;}
  const CORE='./runtime/customer-v37-source.txt?v=56.18';
"""
new_legacy = """  const CORE='./runtime/customer-v37-source.txt?v=56.19';
"""
s = replace_once(s, old_legacy, new_legacy, 'remove broken legacy Haroun gate')
p.write_text(s, encoding='utf-8')

for test_name in ['tests/v56-4-messaging.mjs','tests/v56-17-ops-polish.mjs','tests/v56-18-scroll-haroun.mjs']:
    p=Path(test_name)
    t=p.read_text(encoding='utf-8')
    t=t.replace('customer-v37-source.txt?v=56.18','customer-v37-source.txt?v=56.19')
    p.write_text(t,encoding='utf-8')

Path('tests/v56-19-haroun-local-migration.mjs').write_text(r'''import fs from 'node:fs';
import assert from 'node:assert/strict';
const customer=fs.readFileSync('customer.html','utf8');
assert.ok(customer.includes("const routeKnownCustomerName=routeNormName(routeQuickProfile?.name||routeGuestName||'');"),'routing must inspect an already-created quick customer profile');
assert.ok(customer.includes("routeKnownCustomerName==='هارون'"),'Haroun must be recognized even after becoming a passwordless customer');
assert.ok(customer.includes("localStorage.removeItem('batco_quick_customer_profile_v1')")&&customer.includes("localStorage.removeItem('customer_guest_name_v1')"),'migration must clear the stale customer identity on Haroun device');
assert.ok(customer.includes("localStorage.setItem('batco_employee_onboarding_target_v1',routeVisitorId)"),'migration must persist the visitor-specific employee route');
assert.ok(customer.includes("localStorage.setItem('batco_haroun_customer_migrated_v1','1')"),'migration must leave a durable local migration marker');
assert.ok(!customer.includes("!routeQuickProfile?.uid&&routeNormName(routeGuestName)==='هارون'"),'the broken quickProfile suppression gate must be removed');
assert.ok(customer.includes("customer-v37-source.txt?v=56.19"),'customer runtime cache bust must advance');
console.log('V56.19 Haroun local customer-to-employee migration: OK');
''',encoding='utf-8')
