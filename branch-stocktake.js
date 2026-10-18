/* BATCO V79: isolated branch stocktake. Local-first, deliberately no Firestore mutations. */
(() => {
  'use strict';
  const Core=window.BatcoBranchCore;
  const $=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=n=>new Intl.NumberFormat('ar-SA',{maximumFractionDigits:5}).format(Number(n)||0);
  const warehouseName=id=>id==='riyadh'?'مستودع الرياض':'مستودع جدة';
  const AUTH={name:'inventory_user_name_v2',id:'inventory_employee_id_v2',photo:'inventory_login_photo_proof_v2',version:'inventory_employee_auth_version_v2',token:'inventory_admin_token_v2'};
  function identity() {
    try {
      const name=String(localStorage.getItem(AUTH.name)||'').trim(),id=String(localStorage.getItem(AUTH.id)||'').trim();
      const photo=JSON.parse(localStorage.getItem(AUTH.photo)||'null');
      const localQa=['127.0.0.1','localhost'].includes(location.hostname);
      if(name==='مهند'&&localStorage.getItem(AUTH.token)==='1jh297-spgf2z'
        &&(localQa||(photo?.role==='admin'&&photo?.employeeId==='admin_mohanad'&&photo?.photoId)))return {id:'admin_mohanad',name,admin:true};
      if(id&&name&&localStorage.getItem(AUTH.version)==='2'&&photo?.role==='employee'&&String(photo.employeeId||'')===id&&photo.photoId)return {id,name,admin:false};
    }catch{}
    return null;
  }
  const user=identity();
  if(!user){location.replace('./index.html?employee=1');return}
  if(!user.admin)$('backLink').href='./stocktake.html';
  const base='batco_branch_audit_v79_'+encodeURIComponent(user.id);
  const SNAP_PREFIX='batco_branch_warehouse_snapshot_v79_';
  let store={currentId:'',sessions:[]},active=null,filter='all',search='',limit=60,working=false,notificationTimer;
  function toast(message){const el=$('toast');el.textContent=message;el.hidden=false;clearTimeout(notificationTimer);notificationTimer=setTimeout(()=>{el.hidden=true},3000)}
  function readJSON(key,fallback){try{const v=JSON.parse(localStorage.getItem(key)||'null');return v===null?fallback:v}catch{return fallback}}
  function load(){
    const next=readJSON(base,null);
    if(next&&Array.isArray(next.sessions))store={currentId:String(next.currentId||''),sessions:next.sessions.filter(s=>s&&Array.isArray(s.products)&&s.id&&s.warehouse&&s.name)};
    else store={currentId:'',sessions:[]};
    active=store.sessions.find(s=>s.id===store.currentId)||null;
  }
  function commit(next){
    try{localStorage.setItem(base,JSON.stringify(next));store=next;active=store.sessions.find(s=>s.id===store.currentId)||null;return true}
    catch(e){toast('تعذر الحفظ على الجهاز (مساحة التخزين). صدّر الجرد قبل إغلاق الصفحة.');$('saveState').textContent='تعذر الحفظ محليًا — لا تغلق الصفحة';return false}
  }
  function currentReport(){return active?Core.report(active.products,active.entries||{}):null}
  function dateTime(stamp){try{return new Date(stamp).toLocaleString('ar-SA',{dateStyle:'medium',timeStyle:'short'})}catch{return '—'}}
  function statusLabel(status){
    return {pending:'لم يُجرد',present:'موجود في الفرع',missing:'غير موجود بالفرع', 'both-empty':'غير متوفر في الموقعين'}[status]||'—';
  }
  function renderHistory(){
    const history=$('history');history.replaceChildren();
    if(!store.sessions.length){history.innerHTML='<p class="sub">لا توجد جلسات سابقة بعد.</p>';return}
    for(const s of [...store.sessions].reverse()){
      const counted=Object.keys(s.entries||{}).length;
      const btn=document.createElement('button');btn.type='button';btn.className='historyButton';
      btn.innerHTML='<span><strong>'+esc(s.name)+'</strong><small>'+esc(warehouseName(s.warehouse))+' · '+esc(dateTime(s.createdAt))+'</small></span><small>'+fmt(counted)+' / '+fmt(s.products.length)+' صنف ←</small>';
      btn.onclick=()=>open(s.id);
      history.append(btn);
    }
  }
  function showSetup(){
    active=null;$('setup').hidden=false;$('workspace').hidden=true;store.currentId='';
    $('branchName').value='';renderHistory();
  }
  function open(id){
    const s=store.sessions.find(a=>a.id===id);if(!s)return toast('تعذر فتح الجرد');
    active=s;filter='all';search='';limit=60;$('productSearch').value='';
    if(!commit({...store,currentId:id}))return;
    $('setup').hidden=true;$('workspace').hidden=false;render();
  }
  function card(row){
    const status=row.status,hasQty=row.branchQty!=null;
    const article=document.createElement('article');article.className='item '+status;article.dataset.sku=row.sku;
    article.innerHTML='<div class="itemInfo">'+
      '<div class="sku">'+esc(row.sku)+'</div><h4>'+esc(row.name||'صنف بلا اسم')+'</h4>'+
      '<p>'+esc(row.unit||'بدون وحدة')+(row.pack?' · الشد '+esc(row.pack):'')+' · المستودع: '+fmt(row.warehouseQty)+'</p>'+
      '<span class="status '+status+'">'+esc(statusLabel(status))+'</span></div>'+
      '<div class="itemActions"><label>كمية الفرع<input data-qty="'+esc(row.sku)+'" inputmode="decimal" type="text" autocomplete="off" aria-label="كمية الصنف '+esc(row.sku)+'" value="'+(hasQty?esc(row.branchQty):'')+'" placeholder="—"></label>'+
      '<button class="zero" type="button" data-zero="'+esc(row.sku)+'" aria-label="غير موجود بالفرع: '+esc(row.sku)+'">غير موجود</button></div>';
    return article;
  }
  function refreshSummary(){
    const rep=currentReport();if(!rep)return;
    const c=rep.counts;
    $('summary').innerHTML=[
      ['أصناف المستودع',c.total,'مرجع الجرد'],
      ['تم جردها',c.checked,Math.round(c.checked/Math.max(1,c.total)*100)+'٪ مكتمل'],
      ['لم تُفحص',c.pending,'لا تُعد ناقصة'],
      ['غير موجودة بالفرع',c.missing,'ومتوفرة في المستودع']
    ].map(([label,value,note],i)=>'<div class="metric '+(i===3?'critical':'')+'"><span>'+label+'</span><b>'+fmt(value)+'</b><small>'+note+'</small></div>').join('');
    $('sessionName').textContent=active.name;
    $('sessionMeta').textContent=warehouseName(active.warehouse)+' · مرجع محفوظ '+dateTime(active.snapshotAt||active.createdAt);
    $('saveState').textContent='محفوظ تلقائيًا على هذا الجهاز · يعمل دون إنترنت';
    $('catalogNotice').hidden=true;
    $('catalogNotice').textContent='';
    $('bulkAbsent').disabled=c.pending===0;
    $('undoBulk').hidden=!active.lastBulk?.id;
  }
  function visibleRows(){
    const rep=currentReport(),q=Core.name(search);
    return rep.rows.filter(row=>(filter==='all'||row.status===filter)&&(!q||Core.name(row.name).includes(q)||Core.name(row.sku).includes(q)));
  }
  function renderProducts(){
    const matches=visibleRows(),rows=$('rows');
    rows.replaceChildren();
    if(!matches.length){rows.innerHTML='<p class="empty">'+(filter==='missing'?'لا توجد أصناف مؤكدة الغياب من الفرع ضمن النتائج.':'لا توجد أصناف مطابقة للبحث.')+'</p>'}
    else{const fragment=document.createDocumentFragment();for(const row of matches.slice(0,limit))fragment.append(card(row));rows.append(fragment)}
    $('pagination').hidden=matches.length<=limit;$('more').textContent='عرض المزيد ('+fmt(matches.length-limit)+' متبقٍ)';
  }
  function render(){if(!active)return;refreshSummary();document.querySelectorAll('[data-filter]').forEach(btn=>{btn.classList.toggle('on',btn.dataset.filter===filter);btn.setAttribute('aria-pressed',String(btn.dataset.filter===filter))});renderProducts()}
  function saveQty(id,value){
    if(!active)return false;
    const product=active.products.find(i=>i.sku===id);if(!product)return false;
    const raw=String(value??'').trim(),parsed=raw===''?null:Core.quantity(raw);
    if(raw!==''&&!Number.isFinite(parsed)){toast('اكتب كمية صحيحة (صفر أو أكثر)، ويمكن استخدام الفاصلة العشرية');return false}
    const was=active.entries?.[id]?.qty;
    if(parsed===null&&was===undefined)return true;
    if(parsed!==null&&was===parsed)return true;
    const entries={...active.entries};
    if(parsed===null)delete entries[id];else entries[id]={qty:parsed,at:new Date().toISOString()};
    const nextSession={...active,entries,updatedAt:new Date().toISOString()};
    const next={...store,sessions:store.sessions.map(s=>s.id===active.id?nextSession:s)};
    if(!commit(next))return false;
    refreshSummary();return true;
  }
  async function warehouseData(id){
    const url='./data/'+id+'.tsv';
    let failure;
    try{
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),7500);
      try{
        const r=await fetch(url,{cache:'no-store',signal:controller.signal});
        if(!r.ok)throw Error('HTTP_'+r.status);
        const products=Core.inventory(await r.text());
        const snapshot={products,at:new Date().toISOString()};
        try{localStorage.setItem(SNAP_PREFIX+id,JSON.stringify(snapshot))}catch{}
        return {...snapshot,offline:false};
      }finally{clearTimeout(timer)}
    }catch(e){failure=e}
    const cached=readJSON(SNAP_PREFIX+id,null);
    if(cached?.products?.length)return {...cached,offline:true};
    throw failure||Error('INVENTORY_UNAVAILABLE');
  }
  function setBusy(value){working=value;$('newForm').querySelector('button[type="submit"]').disabled=value;$('refreshSource').disabled=value}
  $('newForm').onsubmit=async e=>{
    e.preventDefault();if(working)return;
    const branch=$('branchName').value.trim(),warehouse=$('warehouse').value;
    if(!branch||!['jeddah','riyadh'].includes(warehouse)){toast('أدخل اسم الفرع واختر المستودع');return}
    setBusy(true);$('startupError').hidden=true;
    try{
      const snapshot=await warehouseData(warehouse);
      const newSession={id:'branch_'+Date.now()+'_'+Math.random().toString(36).slice(2,10),name:branch,warehouse,createdAt:new Date().toISOString(),
        snapshotAt:snapshot.at,products:snapshot.products,entries:{},updatedAt:new Date().toISOString()};
      if(!commit({...store,sessions:[...store.sessions,newSession],currentId:newSession.id}))return;
      open(newSession.id);
      if(snapshot.offline)toast('تم فتح الجرد باستخدام آخر قائمة مخزون محفوظة على هذا الجهاز');
    }catch(error){$('startupError').hidden=false;$('startupError').textContent='تعذر جلب قائمة المستودع، ولا توجد نسخة محفوظة على الجهاز. اتصل بالإنترنت ثم حاول مجددًا.'}
    finally{setBusy(false)}
  };
  $('switchSession').onclick=showSetup;
  $('refreshSource').onclick=async()=>{
    if(!active||working)return;
    if(!navigator.onLine)return toast('تحديث المرجع يحتاج اتصالًا بالإنترنت');
    if(!confirm('هل تريد تحديث أصناف وكميات المستودع المرجعي لهذه الجلسة؟ تبقى كميات الفرع التي أدخلتها محفوظة.'))return;
    setBusy(true);
    try{
      const snap=await warehouseData(active.warehouse);
      if(snap.offline)throw Error('OFFLINE');
      const old=active.products,bySku=new Map(snap.products.map(x=>[x.sku,x]));
      // Retain counted SKUs that disappeared from the latest stock file, with availability zero.
      for(const previous of old)if(!bySku.has(previous.sku)&&active.entries?.[previous.sku])bySku.set(previous.sku,{...previous,warehouseQty:0});
      const newSession={...active,products:[...bySku.values()],snapshotAt:snap.at,updatedAt:new Date().toISOString()};
      if(commit({...store,sessions:store.sessions.map(s=>s.id===active.id?newSession:s)})){render();toast('تم تحديث المرجع مع الاحتفاظ بجرد الفرع')}
    }catch{toast('تعذر تحديث المستودع، لم تتغير بيانات الجرد الحالية')}
    finally{setBusy(false)}
  };
  document.querySelectorAll('[data-filter]').forEach(btn=>btn.onclick=()=>{filter=btn.dataset.filter;limit=60;render()});
  $('productSearch').oninput=e=>{search=e.target.value;limit=60;renderProducts()};
  $('more').onclick=()=>{limit+=60;renderProducts()};
  $('rows').addEventListener('click',e=>{
    const zero=e.target.closest('button[data-zero]');if(zero){if(saveQty(zero.dataset.zero,'0'))renderProducts()}
  });
  const delayed=new Map();
  $('rows').addEventListener('input',e=>{
    const input=e.target.closest('input[data-qty]');if(!input)return;
    const id=input.dataset.qty;clearTimeout(delayed.get(id));
    input.dataset.dirty='1';
    delayed.set(id,setTimeout(()=>{if(!input.isConnected)return;saveQty(id,input.value);input.dataset.dirty='';},300));
  });
  $('rows').addEventListener('focusout',e=>{
    const input=e.target.closest('input[data-qty]');if(!input)return;
    const id=input.dataset.qty;clearTimeout(delayed.get(id));
    const ok=saveQty(id,input.value);if(ok)renderProducts();
  });
  $('bulkAbsent').onclick=()=>{
    if(!active)return;
    const pending=currentReport().rows.filter(row=>row.status==='pending');
    if(!pending.length)return toast('كل الأصناف تم فحصها بالفعل');
    if(!confirm('هل أكملت فحص جميع أركان الفرع؟ سيتم تسجيل '+pending.length+' صنف لم يُفحص بعد على أنه غير موجود بالفرع. لا تستخدم هذا الخيار إلا بعد التأكد من الجرد الميداني الكامل.'))return;
    if(!confirm('تأكيد أخير: هل تريد اعتماد غياب جميع الأصناف المتبقية؟ يمكن التراجع عن هذه العملية لاحقًا.'))return;
    const id='bulk_'+Date.now()+'_'+Math.random().toString(36).slice(2,7),
      entries={...active.entries},at=new Date().toISOString();
    for(const item of pending)entries[item.sku]={qty:0,at,bulkId:id};
    const nextSession={...active,entries,lastBulk:{id,at,count:pending.length},updatedAt:at};
    if(commit({...store,sessions:store.sessions.map(s=>s.id===active.id?nextSession:s)})){render();toast('تم اعتماد المتبقي وتحديث قائمة النواقص')}
  };
  $('undoBulk').onclick=()=>{
    if(!active?.lastBulk?.id)return;
    const bulkId=active.lastBulk.id;
    if(!confirm('التراجع عن الاعتماد الجماعي الأخير؟ ستعود الأصناف التي لم تُعدّل بعده إلى حالة «لم يُجرد»، وستبقى الإدخالات اليدوية كما هي.'))return;
    const entries={...active.entries};
    let reverted=0;
    for(const [id,record] of Object.entries(entries))if(record.bulkId===bulkId){delete entries[id];reverted++}
    const nextSession={...active,entries,lastBulk:null,updatedAt:new Date().toISOString()};
    if(commit({...store,sessions:store.sessions.map(s=>s.id===active.id?nextSession:s)})){render();toast('تم التراجع عن '+reverted+' إدخالًا جماعيًا')}
  };
  const download=(missingOnly)=>{
    if(!active)return;
    const rep=currentReport(),selected=missingOnly?rep.missing:rep.rows;
    if(missingOnly&&!selected.length)return toast('لا توجد نواقص مؤكدة لتصديرها');
    const csv=Core.csv(selected,{branch:active.name,warehouse:warehouseName(active.warehouse)});
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'})),a=document.createElement('a');
    const filename=active.name.replace(/[\\/:*?"<>|]/g,'_').slice(0,40)||'branch';
    a.download='جرد-'+filename+(missingOnly?'-نواقص':'-كامل')+'-'+new Date().toISOString().slice(0,10)+'.csv';
    a.href=url;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
  };
  $('exportMissing').onclick=()=>download(true);
  $('exportFull').onclick=()=>download(false);
  window.addEventListener('storage',e=>{if(e.key!==base)return;load();if(active){$('setup').hidden=true;$('workspace').hidden=false;render()}else showSetup();toast('تم تحديث بيانات الجرد من تبويب آخر')});
  load();if(active){$('setup').hidden=true;$('workspace').hidden=false;render()}else showSetup();
})();
