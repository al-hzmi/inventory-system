import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';

const read=(path)=>fs.readFileSync(path,'utf8');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const stock=(id)=>id==='riyadh'?read('data/riyadh.tsv'):read('data/jeddah.tsv');
const url='https://inventory-system-coral-nu.vercel.app/';
const js=read('v61-employee-pilot.js');
const dom=new JSDOM('<!doctype html><html lang="ar"><body><main id="legacy"><div class="sticky"><div><input id="searchInput" /></div></div><section id="legacy-results">Legacy search results intact</section></main></body></html>',{url,runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window;
w.localStorage.setItem('inventory_user_name_v2','موظف حقيقي');
w.localStorage.setItem('inventory_employee_id_v2','101049');
w.localStorage.setItem('inventory_employee_auth_version_v2','2');
w.localStorage.setItem('inventory_login_photo_proof_v2',JSON.stringify({role:'employee',employeeId:'101049',photoId:'proof'}));
let notify;
w.firebase={
 apps:[{}],
 firestore:()=>({
  collection:()=>({
   doc:()=>({
    onSnapshot(fn){
     notify=fn;
     fn({exists:true,data:()=>({mode:'open',employeeHomePilot:{enabled:true,allowedEmployeeIds:['101049']}})});
     return ()=>{};
    }
   })
  })
 })
};
w.fetch=async path=>({ok:true,text:async()=>stock(path.includes('riyadh')?'riyadh':'jeddah')});
w.eval(js);
w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
await wait(480);
const panel=w.document.getElementById('batco61-pilot');
assert.ok(panel,'Opted-in employee must see experimental workspace');
assert.equal(panel.previousElementSibling.classList.contains('sticky'),true,'Pilot must be placed after sticky search');
assert.ok(w.document.querySelector('#legacy-results'),'Legacy search must remain available');
assert.equal(panel.querySelectorAll('[data-tab]').length,3,'All three pilot sections must be visible');
const firstSku='ARM_10015';
w.dispatchEvent(new w.CustomEvent('batco61:product-open',{detail:{sku:firstSku,warehouse:'jeddah'}}));
assert.ok(panel.textContent.includes(firstSku),'Opened search product must appear in recents');
assert.equal(w.document.querySelectorAll('.b61-product').length,1);
w.document.querySelector('.b61-star').click();
w.document.querySelector('[data-tab="favorite"]').click();
assert.ok(w.document.querySelector('.b61-list').textContent.includes(firstSku),'Favorite must be persisted and accessible');
const pref=JSON.parse(w.localStorage.getItem('batco_pilot61_101049_prefs'));
assert.ok(pref.favorites.includes('jeddah|'+firstSku));
w.document.querySelector('.b61-classic').click();
assert.equal(w.document.getElementById('batco61-pilot'),null,'Classic button removes pilot without harming existing search');
assert.ok(w.document.getElementById('b61-return'),'Classic mode must provide a reenter control');
w.document.getElementById('b61-return').click();
assert.ok(w.document.getElementById('batco61-pilot'),'Pilot can be reentered immediately');
notify({exists:true,data:()=>({mode:'open',employeeHomePilot:{enabled:false,allowedEmployeeIds:['101049']}})});
assert.equal(w.document.getElementById('batco61-pilot'),null,'Emergency disable must remove pilot');
assert.equal(w.document.getElementById('b61-return'),null,'Emergency disable must also remove reentry button');
assert.ok(w.document.getElementById('searchInput'),'Disabling pilot must not affect original search');
w.close();

const adminDom=new JSDOM('<!doctype html><html lang="ar"><body><div class="app"><header class="top"><div class="topin">Original control center</div></header></div></body></html>',{url:url+'control-center.html?pilot=1',runScripts:'outside-only',pretendToBeVisual:true});
const a=adminDom.window;
const saved=[];
let sharedPilot=null;
const employee={id:'employee-real-001',data:()=>({employeeId:'101049',canonicalName:'موظف حقيقي'})};
a.confirm=()=>true;
a.firebase={firestore:{FieldValue:{increment:()=>1,serverTimestamp:()=>({seconds:12345})}}};
a.isAdmin=()=>true;
a.db={collection(name){
 if(name==='employee_accounts')return{limit(){return{get:async()=>({docs:[employee]})}}};
 if(name==='system_controls')return{doc(id){if(id==='employee_home_pilot_v1')return{get:async()=>({exists:false})};assert.equal(id,'employee_site_access');return{get:async()=>({exists:sharedPilot!==null,data:()=>({employeeHomePilot:sharedPilot})}),set:async data=>{sharedPilot=data.employeeHomePilot;saved.push(data)}}}};
 if(name==='security_admin_logs')return{add:async()=>({id:'audit'})};
 throw Error('Unexpected collection '+name);
}};
a.eval(read('v61-employee-pilot-admin.js'));
a.document.dispatchEvent(new a.Event('DOMContentLoaded'));
await wait(60);
assert.ok(a.document.querySelector('#b61-admin-panel'),'Pilot settings must open from direct admin link');
assert.ok(a.document.querySelector('#b61a-launch'),'Admin launch shortcut must be attached');
const labels=[...a.document.querySelectorAll('.b61a-account')];
const chosen=labels.find(n=>n.textContent.includes('موظف حقيقي'));
assert.ok(chosen,'Real employee must appear in admin selector');
chosen.querySelector('input').click();
const master=a.document.querySelector('#b61a-master');
master.click();
assert.equal(master.checked,true);
a.document.querySelector('#b61a-save').click();
await wait(40);
assert.equal(saved.length,1);
assert.equal(saved[0].employeeHomePilot.enabled,true);
assert.deepEqual(Array.from(saved[0].employeeHomePilot.allowedEmployeeIds),['employee-real-001'],'Only selected Firestore document ID should be activated, not legacy staff code');
master.click();
a.document.querySelector('#b61a-save').click();
await wait(40);
assert.equal(saved.length,2);
assert.equal(saved[1].employeeHomePilot.enabled,false,'Admin emergency stop must disable everybody');
a.document.querySelector('#b61a-close').click();
a.document.querySelector('.app').innerHTML='<header><div class="topin">Rerender</div></header>';
await wait(15);
assert.ok(a.document.querySelector('#b61a-launch'),'Live control-center rerender must preserve pilot controls');
adminDom.window.close();
console.log('V61_DOM_PASS: verified employee appears, original search preserved, recent/favorites, revert/reenter, stop-switch, admin selection and persistence');
