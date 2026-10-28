'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('admin-stocktake.html','utf8'),start=html.indexOf('function bindSelected()'),end=html.indexOf('function teamIds(',start);
assert(start>=0&&end>start);const listeners=[],calls=[];
const context={selectedId:'',itemsLoaded:false,itemsFromCache:true,itemsPending:false,render:()=>{},ms:()=>0,
 state:{campaign:{id:'jeddah'},teams:[],items:[],audit:[],tab:'all',unsubs:[()=>{},()=>{},()=>{},()=>{}]},
 StocktakeCore:{aggregate:x=>x},db:{collection:name=>({where:()=>({limit:()=>query(name),onSnapshot:(...args)=>query(name).onSnapshot(...args)})})}};
function query(name){return {onSnapshot:(...args)=>{const handler=args.find(x=>typeof x==='function'),l={name,handler,alive:true};listeners.push(l);calls.push(name);return()=>{l.alive=false}}}}
vm.createContext(context);vm.runInContext(html.slice(start,end),context);
context.bindSelected();assert.deepEqual(calls,['stocktake_teams','stocktake_items'],'opening campaign must not read audit');
assert.equal(context.state.auditStatus,'idle');context.state.tab='audit';context.subscribeAudit('jeddah');context.subscribeAudit('jeddah');
assert.equal(calls.filter(x=>x==='stocktake_audit').length,1,'one audit subscription only');assert.equal(context.state.auditStatus,'loading');
listeners.find(x=>x.name==='stocktake_audit').handler({docs:[{id:'op',data:()=>({createdAt:1})}]});assert.equal(context.state.auditStatus,'ready');assert.equal(context.state.audit[0].id,'op');
context.state.campaign={id:'riyadh'};context.state.tab='all';context.bindSelected();assert.equal(listeners.filter(x=>x.alive&&x.name==='stocktake_audit').length,0,'old campaign listener must unsubscribe');
assert.equal(context.state.audit.length,0);assert.equal(context.state.auditStatus,'idle');assert.equal(calls.filter(x=>x==='stocktake_audit').length,1);
console.log('PASS: audit listener is lazy, single, live after opening, and detached on campaign switch');
