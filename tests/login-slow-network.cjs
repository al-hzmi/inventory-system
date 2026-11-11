'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('runtime/index-v37-source.txt','utf8');
const pick=(a,b)=>{let i=src.indexOf(a),j=src.indexOf(b,i+a.length);assert(i>=0&&j>i);return src.slice(i,j)};
let now=0,seq=0,timers=new Map(),stage='',errors=[];
function schedule(fn,delay){let id=++seq;timers.set(id,{fn,at:now+delay});return id}
function cancel(id){timers.delete(id)}
async function advance(ms){const end=now+ms;while(true){for(let i=0;i<20;i++)await Promise.resolve();let next=[...timers].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;now=next[1].at;timers.delete(next[0]);next[1].fn();}now=end;for(let i=0;i<20;i++)await Promise.resolve()}
const delayed=(value,ms)=>new Promise(resolve=>schedule(()=>resolve(value),ms));
let badPin=false,suspended=false;
const context={Promise,setTimeout:schedule,clearTimeout:cancel,console,employeeAccount:{id:'w1'},loading:false,code:'1234',toEnglishDigits:x=>x,validEmployeePin:x=>x.length===4,setLoading:()=>{},setError:x=>errors.push(x),setStep:x=>{stage=x},setEmployeeAccount:()=>{},setCode:()=>{},cacheEmployeeAccount:x=>x,verifyEmployeePassword:async()=>!badPin,createPhotoChallenge:()=>delayed('photo-attempt',7000),enteredAlias:'employee',firebase:{firestore:{FieldValue:{serverTimestamp:()=>null}}},EMPLOYEE_ACCOUNT_COLLECTION:'accounts',getDb:async()=>({collection:()=>({doc:()=>({get:()=>delayed({exists:true,id:'w1',data:()=>({status:suspended?'suspended':'active'})},7000)}),add:async()=>{}})})};
context.navigator={userAgent:'synthetic'};
vm.createContext(context);vm.runInContext(pick('const LOGIN_LOOKUP_TIMEOUT_MS =','const StandardLoginScreen =')+'\n'+pick('const handleEmployeePasswordSubmit =','    const beginRemoteLogin =')+'\nrun=handleEmployeePasswordSubmit;',context);
(async()=>{let task=context.run({preventDefault(){}});await advance(7000);await advance(7000);await task;assert.equal(stage,'face','a 7-second account read and 7-second challenge must reach photo step');stage='';badPin=true;task=context.run({preventDefault(){}});await advance(7000);await task;assert.equal(stage,'');assert(errors.includes('كلمة المرور غير صحيحة.'));stage='';badPin=false;suspended=true;task=context.run({preventDefault(){}});await advance(7000);await task;assert.equal(stage,'name');console.log('PASS slow account and challenge; wrong PIN and suspended account stay blocked')})().catch(e=>{console.error(e);process.exitCode=1});
