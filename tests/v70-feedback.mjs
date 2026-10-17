import fs from 'node:fs';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';

const read=p=>fs.readFileSync(p,'utf8');
const source=read('v70-employee-feedback.js').replace(
 'const INITIAL_DELAY=9000,RETRY_DELAY=3500,MAX_BUSY_WAIT=60000,IDLE_THRESHOLD=7000;',
 'const INITIAL_DELAY=35,RETRY_DELAY=35,MAX_BUSY_WAIT=300,IDLE_THRESHOLD=20;'
);
const adminSource=read('v70-admin-feedback.js');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const url='https://inventory-system-coral-nu.vercel.app/index.html?employee=1';
function staff({id='employee-42',preset=null,connected=true}={}){
 const dom=new JSDOM('<!doctype html><html lang="ar"><body><div class="batco-search-card"><input id="searchInput"></div></body></html>',{url,runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;
 w.localStorage.setItem('inventory_user_name_v2','موظف التقييم');
 w.localStorage.setItem('inventory_employee_id_v2',id);
 w.localStorage.setItem('inventory_employee_auth_version_v2','2');
 w.localStorage.setItem('inventory_login_photo_proof_v2',JSON.stringify({role:'employee',employeeId:id,photoId:'proof'}));
 if(preset)w.localStorage.setItem('batco_employee_feedback_v70_'+id,JSON.stringify(preset));
 const writes=[];
 const firestore=()=>({collection(name){
  assert.equal(name,'employee_experience_feedback');
  return{doc(docId){return{
   get:async()=>({exists:false}),
   set:async data=>{if(!connected)throw new Error('permission-denied');writes.push({docId,data})}
  }}};
 }});
 firestore.FieldValue={serverTimestamp:()=>({seconds:1760000000})};
 w.firebase={apps:[{}],firestore};
 w.eval(source);w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 return{dom,w,writes};
}
const first=staff();
await wait(170);
assert.ok(first.w.document.getElementById('batco70-feedback-dialog'),'Modal should appear after an idle verified staff session');
assert.equal(first.w.document.querySelectorAll('.b70-star').length,5,'Five selectable stars');
assert.equal(first.w.document.querySelector('.b70-send').disabled,true,'Rating must be selected before sending');
assert.equal(first.w.document.querySelector('textarea').required,false,'Note must stay optional');
first.w.document.querySelector('[data-rating="4"]').click();
assert.equal(first.w.document.querySelector('.b70-send').disabled,false);
first.w.document.querySelector('textarea').value='البحث ممتاز، احتاج تعديل بسيط في التصنيفات';
first.w.document.querySelector('.b70-send').click();
await wait(35);
assert.equal(first.writes.length,1,'One confirmed Firestore write');
assert.equal(first.writes[0].docId,'v70_employee-42');
assert.equal(first.writes[0].data.employeeId,'employee-42');
assert.equal(first.writes[0].data.employeeName,'موظف التقييم');
assert.equal(first.writes[0].data.stars,4);
assert.ok(first.writes[0].data.note.includes('التصنيفات'));
assert.equal(JSON.parse(first.w.localStorage.getItem('batco_employee_feedback_v70_employee-42')).submitted,true);
first.w.close();

const deferred=staff({id:'employee-defer'});
await wait(170);
assert.ok(deferred.w.document.getElementById('batco70-feedback-dialog'));
deferred.w.document.querySelector('.b70-later').click();
assert.equal(deferred.w.document.getElementById('batco70-feedback-dialog'),null,'Later should immediately dismiss the prompt');
const state=JSON.parse(deferred.w.localStorage.getItem('batco_employee_feedback_v70_employee-defer'));
assert.equal(state.deferThroughVisit,1);
await wait(200);assert.equal(deferred.w.document.getElementById('batco70-feedback-dialog'),null,'Must not re-prompt during the same visit');
deferred.w.close();
const next=staff({id:'employee-defer',preset:state});
await wait(170);
assert.ok(next.w.document.getElementById('batco70-feedback-dialog'),'Deferred prompt returns on next visit');
next.w.close();

const failure=staff({id:'employee-error',connected:false});
await wait(170);
failure.w.document.querySelector('[data-rating="5"]').click();
failure.w.document.querySelector('.b70-send').click();
await wait(40);
assert.ok(failure.w.document.querySelector('.b70-message').textContent.includes('تعذّر'),'Failed Firestore writes must show honest error');
assert.equal(JSON.parse(failure.w.localStorage.getItem('batco_employee_feedback_v70_employee-error')).submitted,undefined,'Do not mark a rejected submission as sent');
failure.w.document.querySelector('.b70-later').click();failure.w.close();

const adminHTML=read('admin-feedback.html');
const adminDom=new JSDOM(adminHTML.replace(/<script src=[^>]*><\/script>/g,''),{
 url:'https://inventory-system-coral-nu.vercel.app/admin-feedback.html',runScripts:'outside-only',pretendToBeVisual:true
});
const a=adminDom.window;
a.localStorage.setItem('inventory_user_name_v2','مهند');
a.localStorage.setItem('inventory_admin_token_v2','1jh297-spgf2z');
a.localStorage.setItem('inventory_login_photo_proof_v2',JSON.stringify({role:'admin',photoId:'proof'}));
const docs=[
 {id:'v70_alpha',data:()=>({employeeId:'alpha',employeeName:'موظف ألف',stars:5,note:'واجهة ممتازة',release:'v70',submittedAt:{toMillis:()=>1760000012000}})},
 {id:'v70_beta',data:()=>({employeeId:'beta',employeeName:'موظف باء',stars:2,note:'<img src=x onerror=alert(1)>',release:'v70',submittedAt:{toMillis:()=>1760000010000}})}
];
a.firebase={apps:[{}],firestore:()=>({collection(name){assert.equal(name,'employee_experience_feedback');return{limit(n){assert.equal(n,500);return{get:async()=>({docs,size:docs.length})}}}}})};
a.eval(adminSource);
await wait(90);
assert.equal(a.document.querySelectorAll('.entry').length,2);
assert.equal(a.document.getElementById('b70-count').textContent,'٢','Aggregate should count two ratings');
assert.equal(a.document.getElementById('b70-average').textContent,'3.5 / 5');
assert.equal(a.document.querySelector('.entry-note img'),null,'Free-text feedback must never be interpreted as HTML');
a.document.getElementById('b70-rating-filter').value='5';
a.document.getElementById('b70-rating-filter').dispatchEvent(new a.Event('change'));
assert.equal(a.document.querySelectorAll('.entry').length,1,'Admin filters by rating');
a.document.getElementById('b70-rating-filter').value='all';
a.document.getElementById('b70-rating-filter').dispatchEvent(new a.Event('change'));
a.document.getElementById('b70-filter').value='باء';
a.document.getElementById('b70-filter').dispatchEvent(new a.Event('input'));
assert.equal(a.document.querySelectorAll('.entry').length,1,'Admin searches employee names');
adminDom.window.close();

console.log('V70_FEEDBACK_DOM_PASS: consent, stars, persistence, later on next visit, denied writes, admin summary, XSS and filters');
