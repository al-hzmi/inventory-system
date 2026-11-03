'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');const crypto=require('node:crypto');
process.env.TRENDYOL_SESSION_SECRET='isolated-test-secret';
const handler=require('../api/trendyol.js');
const payload=Buffer.from(JSON.stringify({expires:Date.now()+60000,nonce:'test'})).toString('base64url');
const sig=crypto.createHmac('sha256',process.env.TRENDYOL_SESSION_SECRET).update(payload).digest('base64url');
function response(){return {headers:{},setHeader(k,v){this.headers[k]=v},status(s){this.code=s;return this},json(data){this.body=data;return this}}}
test('stock route and mutation attempts are rejected without upstream requests',async()=>{
 let fetches=0;const original=global.fetch;global.fetch=async()=>{fetches++;throw Error('unexpected upstream request')};
 try{let r=response();await handler({method:'GET',headers:{host:'localhost',cookie:'batco_trendyol='+payload+'.'+sig},query:{action:'stock'}},r);assert.equal(r.code,404);
 r=response();await handler({method:'POST',headers:{host:'localhost',cookie:'batco_trendyol='+payload+'.'+sig},body:{action:'sync-stock'}},r);assert.equal(r.code,405);assert.equal(fetches,0);
 r=response();await handler({method:'GET',headers:{host:'localhost'},query:{action:'product-sales'}},r);assert.equal(r.code,401);assert.equal(fetches,0);
 }finally{global.fetch=original}
});
test('pagination follows reported pages and marks a premature empty page incomplete',async()=>{
 const fs=require('node:fs'),src=fs.readFileSync(require.resolve('../api/trendyol.js'),'utf8');
 const section=src.slice(src.indexOf('async function orderWindow('),src.indexOf('async function orders('));
 let calls=0;let windowFn=new Function('api',section+';return orderWindow')(async()=>{calls++;return calls===1?{content:[{id:1}],totalPages:2}:{content:[{id:2}],totalPages:2}});
 let result=await windowFn(0,10);assert.equal(calls,2);assert.equal(result.result.length,2);assert.equal(result.limited,false);
 calls=0;windowFn=new Function('api',section+';return orderWindow')(async()=>{calls++;return calls===1?{content:[{id:1}],totalPages:3}:{content:[],totalPages:3}});
 result=await windowFn(0,10);assert.equal(result.limited,true);assert.equal(calls,2);
});

test('unidentified financial transactions cannot be treated as a complete reconciliation',async()=>{
 const fs=require('node:fs'),src=fs.readFileSync(require.resolve('../api/trendyol.js'),'utf8');
 const section=src.slice(src.indexOf('async function financialRecords('),src.indexOf('function productSales('));
 const read=new Function('financeWindow',section+';return financialRecords')(async(kind)=>({records:kind==='sale'?[{orderNumber:'A',barcode:'B',credit:10}]:[],limited:false}));
 const result=await read(1);assert.equal(result.limited,true);
});
