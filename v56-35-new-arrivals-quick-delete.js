(()=>{
'use strict';
const VERSION='56.35',API='./api/new-arrivals-admin',WINDOW_MS=300;
let lastCard=null,lastAt=0,armedCard=null,busy=false;
const canonical=value=>String(value||'').toUpperCase().replace(/[^A-Z0-9_-]/g,'');
const adminReady=()=>{
 try{
  const proof=JSON.parse(localStorage.getItem('inventory_login_photo_proof_v2')||'null');
  return String(localStorage.getItem('inventory_user_name_v2')||'').trim()==='مهند'&&Boolean(localStorage.getItem('inventory_admin_token_v2'))&&proof?.role==='admin'&&Boolean(proof?.photoId);
 }catch{return false}
};
const inNewArrivals=()=>adminReady()&&[...document.querySelectorAll('h1,h2,h3,div')].some(el=>el.children.length<8&&String(el.textContent||'').trim()==='إضافة أو حذف منتج من «جديدنا»');
function extractSku(card){
 const text=String(card?.innerText||'').toUpperCase();
 const candidates=text.match(/\b[A-Z]{1,8}(?:[_-][A-Z0-9]+)+\b|\b[A-Z]{1,8}\d[A-Z0-9_-]*\b/g)||[];
 return canonical(candidates.find(x=>/\d/.test(x))||'');
}
function toast(text,tone='ok'){
 let el=document.getElementById('v56-35-arrival-toast');if(!el){el=document.createElement('div');el.id='v56-35-arrival-toast';Object.assign(el.style,{position:'fixed',left:'50%',bottom:'92px',transform:'translateX(-50%)',zIndex:'99999',padding:'10px 14px',borderRadius:'12px',fontFamily:'inherit',fontSize:'12px',fontWeight:'700',boxShadow:'0 8px 28px rgba(0,0,0,.16)',maxWidth:'calc(100vw - 32px)',textAlign:'center',transition:'opacity .2s'});document.body.appendChild(el)}
 el.style.background=tone==='bad'?'#FEF2F2':'#F0FDF4';el.style.color=tone==='bad'?'#B91C1C':'#15803D';el.textContent=text;el.style.opacity='1';clearTimeout(el._t);el._t=setTimeout(()=>{el.style.opacity='0'},2200)
}
function disarm(){if(!armedCard)return;armedCard.querySelector('.v56-35-quick-delete')?.remove();armedCard=null}
async function removeSku(card,sku,button){
 if(busy)return;busy=true;button.disabled=true;button.textContent='جاري الحذف...';
 try{
  const proof=JSON.parse(localStorage.getItem('inventory_login_photo_proof_v2')||'null')||{};
  const adminToken=String(localStorage.getItem('inventory_admin_token_v2')||'');
  const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'remove',sku,updatedBy:'مهند',adminToken,adminProof:proof})});
  const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data?.error||'تعذر حذف الصنف.');
  card.style.transition='opacity .2s,transform .2s';card.style.opacity='.28';card.style.transform='scale(.985)';toast(`تم حذف ${sku} من «جديدنا» ✓`);
  setTimeout(()=>location.reload(),520);
 }catch(err){button.disabled=false;button.textContent='حذف من جديدنا';toast(err?.message||'تعذر حذف الصنف.','bad');busy=false}
}
function arm(card){
 if(!card||armedCard===card)return;if(armedCard)disarm();const sku=extractSku(card);if(!sku)return;
 armedCard=card;const button=document.createElement('button');button.type='button';button.className='v56-35-quick-delete';button.dataset.sku=sku;button.textContent='حذف من جديدنا';
 Object.assign(button.style,{width:'calc(100% - 24px)',margin:'0 12px 12px',minHeight:'40px',border:'1px solid rgba(185,28,28,.18)',borderRadius:'10px',background:'#FEF2F2',color:'#B91C1C',fontFamily:'inherit',fontSize:'12px',fontWeight:'700',cursor:'pointer',position:'relative',zIndex:'20'});
 button.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();removeSku(card,sku,button)},true);card.appendChild(button);toast(`اختر «حذف من جديدنا» لإزالة ${sku}`)
}
function onClick(e){
 if(!inNewArrivals())return;if(e.target.closest('input,textarea,select,button,a'))return;
 const card=e.target.closest('.tap-card');if(!card)return;
 const now=Date.now();if(card===lastCard&&now-lastAt<=WINDOW_MS){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();lastCard=null;lastAt=0;arm(card);return}
 lastCard=card;lastAt=now;
}
document.addEventListener('click',onClick,true);
document.addEventListener('keydown',e=>{if(e.key==='Escape')disarm()});
document.addEventListener('click',e=>{if(armedCard&&!armedCard.contains(e.target)&&!e.target.closest('.tap-card'))disarm()},false);
window.__V56_35_NEW_ARRIVALS_QUICK_DELETE={version:VERSION,disarm};
})();
