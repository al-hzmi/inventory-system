const {initializeApp,deleteApp}=require('firebase/app');
const {getFirestore,connectFirestoreEmulator,doc,getDoc,writeBatch,runTransaction}=require('firebase/firestore');
const assert=require('node:assert/strict');
(async()=>{
 assert.equal(process.env.FIRESTORE_EMULATOR_HOST,'127.0.0.1:8099','refuse all non-emulator endpoints');
 const clients=Array.from({length:8},(_,i)=>{const app=initializeApp({projectId:'demo-inventory-reliability'},'device'+i),db=getFirestore(app);connectFirestoreEmulator(db,'127.0.0.1',8099);return {app,db}}),db=clients[0].db;
 let seed=writeBatch(db),n=0;async function add(p,d){seed.set(doc(db,p),d);if(++n%350===0){await seed.commit();seed=writeBatch(db)}}
 await add('items/jretry',{campaignId:'j',quantity:null});
 for(const b of ['j','r']){await add('campaigns/'+b,{status:'active',branch:b});for(let t=0;t<4;t++)await add('teams/'+b+t,{campaignId:b,status:'open'});for(let i=0;i<750;i++)await add('items/'+b+i,{campaignId:b,quantity:null})}await seed.commit();
 async function count(client,b,i,team){const d=client.db,operation=b+i,item=doc(d,'items',b+i),op=doc(d,'operations',operation),cp=doc(d,'campaigns',b),tm=doc(d,'teams',b+team);
 return runTransaction(d,async tx=>{const [a,c,x,o]=await Promise.all([tx.get(cp),tx.get(tm),tx.get(item),tx.get(op)]);if(o.exists()){assert.equal(o.data().quantity,1);return 'already'};assert.equal(a.data().status,'active');assert.equal(c.data().campaignId,b);assert.equal(c.data().status,'open');assert.equal(x.data().campaignId,b);tx.update(item,{quantity:1});tx.set(op,{campaignId:b,itemId:b+i,quantity:1});return 'saved'},{maxAttempts:15})}
 const start=Date.now();const results=await Promise.all(clients.map(async(c,i)=>{const b=i%2?'r':'j',slot=Math.floor(i/2);let done=0;for(let n=slot;n<750;n+=4){assert.equal(await count(c,b,n,slot),'saved');done++}return done}));
 assert.equal(results.reduce((a,b)=>a+b,0),1500);assert.equal(await count(clients[0],'j',0,0),'already');assert.equal((await getDoc(doc(db,'items','j0'))).data().quantity,1);
 const duplicate=await Promise.all(clients.map((c,i)=>count(c,'j','retry',i%4)));assert.equal(duplicate.filter(x=>x==='saved').length,1);assert.equal(duplicate.filter(x=>x==='already').length,7);assert.equal((await getDoc(doc(db,'items','jretry'))).data().quantity,1);
 console.log(JSON.stringify({passed:true,devices:8,items:1500,duplicateConcurrentAttempts:8,duplicateCommits:1,results,elapsedMs:Date.now()-start,scope:'Firestore emulator, synthetic permissive test rules; does not represent production rules or billing'}));
 await Promise.all(clients.map(c=>deleteApp(c.app)));
})().catch(e=>{console.error(e);process.exit(1)});
