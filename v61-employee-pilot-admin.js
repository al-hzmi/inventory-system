/* V69: historical pilot control replaced by the official employee workspace. */
(function(){
'use strict';
function authorized(){
 try{
  if(typeof isAdmin==='function')return Boolean(isAdmin());
  const proof=JSON.parse(localStorage.getItem('inventory_login_photo_proof_v2')||'null');
  return proof?.role==='admin'&&Boolean(proof.photoId)&&String(localStorage.getItem('inventory_user_name_v2')||'').trim()==='مهند';
 }catch{return false}
}
if(!authorized())return;
function open(){
 if(document.getElementById('b61-admin-panel'))return;
 const page=document.createElement('main');page.id='b61-admin-panel';page.className='b61a-shell';
 page.setAttribute('role','dialog');page.setAttribute('aria-modal','true');page.setAttribute('aria-label','النسخة الرسمية للموظفين');
 page.innerHTML='<header class="b61a-header"><div><small>إدارة النظام</small><h1>مساحة العمل الرسمية</h1><p>أصبحت متاحة تلقائيًا لجميع الموظفين أصحاب الحسابات المعتمدة. لا تحتاج إلى اختيار حسابات أو تفعيل تجريبي.</p></div><button class="b61a-back" id="b61a-close" type="button">العودة إلى الإدارة</button></header><section class="b61a-card"><h2>تم إنهاء المرحلة التجريبية</h2><p>البحث، المفضلة وآخر الأصناف أصبحت جزءًا من واجهة الموظفين الأساسية. مفاتيح التفعيل القديمة لم تعد مستخدمة، ولا تغيّر صلاحيات الحسابات أو بيانات المخزون.</p><p><a href="./index.html?employee=1">فتح واجهة الموظفين الرسمية ←</a></p></section>';
 const old=document.querySelector('.app'),previous=document.body.style.overflow;
 document.body.append(page);if(old)old.hidden=true;document.body.style.overflow='hidden';
 const close=()=>{page.remove();if(old)old.hidden=false;document.body.style.overflow=previous;const url=new URL(location.href);url.searchParams.delete('pilot');history.replaceState({},'',url.pathname+url.search)};
 page.querySelector('#b61a-close').addEventListener('click',close);
}
function attach(){
 document.addEventListener('click',event=>{
  const button=event.target?.closest?.('[data-b61a-open]');
  if(!button)return;
  event.preventDefault();open();
 });
 if(new URLSearchParams(location.search).get('pilot')==='1')open();
}
window.BatcoPilotAdmin={open,official:true};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attach,{once:true});else attach();
})();