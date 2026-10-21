'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const read=x=>fs.readFileSync(x,'utf8');
const employee=read('runtime/index-v37-source.txt'),admin=read('admin-dashboard.html'),presence=read('v44-observability.js');
const feedback=read('v70-employee-feedback.js'),reviews=read('v70-admin-feedback.js');
const index=read('index.html'),adminHtml=read('admin-feedback.html');
const requireAll=(value,markers,label)=>markers.forEach(x=>assert(value.includes(x),label+' is missing '+x));
const invoice=employee.slice(employee.indexOf('const OrderInvoiceModal = memo('),employee.indexOf('const saveAsDraft = () => {'));
assert(invoice.includes('msg += `البائع: ${sessionName}\\n`;'),'WhatsApp invoice must label seller');
assert(!invoice.includes('msg += `المندوب:'),'old seller label must not return');
requireAll(employee,[
 "const verifiedLoginRef = await db.collection('login_logs').add({",
 'loginLogId:verifiedLoginRef.id',
 'if (!sessionName || (!isAdmin && !accessVerified)) return;',
 "identitySource:!isAdmin?'employee_login_photo_record':'admin_session'",
 "loginAttemptId:!isAdmin?proof?.loginAttemptId||'':''",
 '}, 90000);'
],'employee login proof');
requireAll(presence,[
 'const employeeSessionValid=()',
 "p.role==='employee'",
 'identityIsCurrent()',
 "loginAttemptId:proof?.loginAttemptId||''",
 "loginLogId:proof?.loginLogId||''"
],'presence proof');
requireAll(admin,[
 'const verifiedLoginRecords=eLogins.filter(',
 'x.faceVerified===true',
 'const authenticatedSession=s=>',
 'String(log.securityPhotoId)===String(s.securityPhotoId)',
 'const employeeOnline=new Set(eSessions.filter(employeeIsHere)',
 'const latestSessions=eSessions.filter(authenticatedSession)',
 'const loginEvents=verifiedLoginRecords.map(',
 "isGuest?'زار البوابة':'دخل بحساب'"
],'dashboard verified attendance');
requireAll(reviews,[
 'async function resetFeedback(record)',
 "stars:fv.delete(),note:fv.delete(),submittedAt:fv.delete()",
 'resetGeneration:fv.increment(1)',
 'resetRequestedAt:fv.serverTimestamp()',
 'rows=rows.filter(x=>x.id!==record.id)'
],'admin rating reset');
requireAll(feedback,[
 'function acceptRatingReset(doc)',
 'resetGenerationSeen',
 'const alreadyRated=await shouldSkipServer();',
 'watchRatingResets();',
 'function watchRatingResets()'
],'employee rating reset');
assert(index.includes('./v70-employee-feedback.js?v=92.0'),'employee receives new rating script');
assert(index.includes('./v44-observability.js?v=92.0'),'employee receives new presence script');
assert(adminHtml.includes('./v70-admin-feedback.js?v=92.0'),'admin receives new reset script');
new vm.Script(presence,{filename:'v44-observability.js'});
new vm.Script(feedback,{filename:'v70-employee-feedback.js'});
new vm.Script(reviews,{filename:'v70-admin-feedback.js'});
console.log('V92 authentic attendance / seller naming / feedback reset: PASS');
