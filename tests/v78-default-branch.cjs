const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('runtime/index-v37-source.txt','utf8');
const code=source.slice(source.indexOf('    const readDefaultBranch ='),source.indexOf("    const [query, setQuery]",source.indexOf('    const readDefaultBranch =')));
async function visit({cached='',remote='jeddah',manual=null,offline=false,transfer=''}={}) {
 const storage=new Map([['employee','one'],['batco_default_branch_v78_one',cached]]);let state,effect,complete,hook=0;
 const pending=new Promise(resolve=>complete=resolve);
 const context={sessionStorage:{getItem:()=>transfer,removeItem:()=>{}},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},STORAGE_KEYS:{EMPLOYEE_ID:'employee'},EMPLOYEE_ACCOUNT_COLLECTION:'employee_accounts',sessionName:'موظف',isAdmin:false,useRef:x=>({current:x}),useCallback:f=>f,useState:f=>{const value=f();if(hook++===0)return [value,()=>{}];state=value;return [state,x=>state=x]},useEffect:f=>effect=f,getDb:()=>offline?Promise.reject(new Error('offline')):Promise.resolve({collection:()=>({doc:()=>({get:()=>pending})})})};
 vm.createContext(context);vm.runInContext(code+'\nglobalThis.choose=setWarehouse;',context);const initial=state;const cleanup=effect();if(manual)context.choose(manual);complete({exists:true,data:()=>({defaultBranch:remote})});await new Promise(r=>setImmediate(r));cleanup?.();return {initial,state,storage};
}
(async()=>{
 assert.equal((await visit({cached:'riyadh',remote:'riyadh'})).initial,'riyadh');
 assert.equal((await visit({cached:'',remote:'jeddah'})).state,'jeddah');
 assert.equal((await visit({remote:'jeddah',manual:'riyadh'})).state,'riyadh','late preference must not override manual choice');
 assert.equal((await visit({cached:'jeddah',offline:true})).state,'jeddah');
 assert.equal((await visit({remote:'invalid'})).state,null);
 assert.equal((await visit({cached:'riyadh',remote:''})).state,null,'removed preference clears old cached choice');
 assert.equal((await visit({cached:'jeddah',manual:'riyadh'})).storage.get('batco_default_branch_v78_one'),'jeddah','manual selection must not become the next visit default');
 assert.equal((await visit({cached:'jeddah',remote:'jeddah',transfer:'riyadh'})).state,'riyadh','transferred order branch wins over default');
 console.log('PASS default branch: first entry, offline, manual race, removal, next visit');
})().catch(e=>{console.error(e);process.exitCode=1});
