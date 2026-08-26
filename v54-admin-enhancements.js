(()=>{
'use strict';
const VERSION='54.0',path=(location.pathname.split('/').pop()||'').toLowerCase();
const employeeExtra={
 viewStockQty:'المخزون — رؤية الكمية الفعلية',viewPrices:'المخزون — رؤية الأسعار',viewImages:'المنتجات — رؤية الصور',switchWarehouse:'المخزون — التبديل بين المستودعات',
 editCart:'الفاتورة — تعديل الكميات',removeCartItems:'الفاتورة — حذف الأصناف',submitOrder:'الفاتورة — اعتماد وإرسال الطلب',viewOrderHistory:'الطلبات — رؤية السجل السابق',
 stocktakeNotes:'الجرد — إضافة الملاحظات',stocktakeReview:'الجرد — مراجعة النواقص والفروقات',stocktakeEdit:'الجرد — تعديل العد قبل الإغلاق',exportData:'البيانات — التصدير والتنزيل'
};
const customerExtra={
 viewPrices:'المنتجات — رؤية الأسعار',viewStockStatus:'المنتجات — رؤية حالة التوفر',viewCartImages:'السلة — عرض صور الأصناف',editCart:'السلة — تعديل الكميات',removeCartItems:'السلة — حذف الأصناف',branchDistribution:'السلة — تعديل توزيع الفروع',checkoutNotes:'الطلب — إضافة ملاحظة',shareProduct:'المنتجات — المشاركة',viewOrderDetails:'الطلبات — رؤية تفاصيل الطلبات السابقة'
};
function extendControlCenter(){
 if(path!=='control-center.html')return;
 try{
  if(typeof PERMS==='undefined'||typeof DEFAULTS==='undefined'||typeof TEMPLATES==='undefined')return;
  Object.assign(PERMS.employee,employeeExtra);Object.assign(PERMS.customer,customerExtra);
  for(const k of Object.keys(employeeExtra))if(!(k in DEFAULTS.employee))DEFAULTS.employee[k]=true;
  for(const k of Object.keys(customerExtra))if(!(k in DEFAULTS.customer))DEFAULTS.customer[k]=true;
  if(typeof S!=='undefined'&&S?.permissions){
   S.permissions.employeeDefaults={...DEFAULTS.employee,...(S.permissions.employeeDefaults||{})};
   S.permissions.customerDefaults={...DEFAULTS.customer,...(S.permissions.customerDefaults||{})};
  }
  if(TEMPLATES.employee?.full)Object.assign(TEMPLATES.employee.full.v,DEFAULTS.employee);
  if(TEMPLATES.employee?.sales)Object.assign(TEMPLATES.employee.sales.v,{viewStockQty:true,viewPrices:true,viewImages:true,switchWarehouse:true,editCart:true,removeCartItems:true,submitOrder:true,viewOrderHistory:true,stocktakeNotes:false,stocktakeReview:false,stocktakeEdit:false,exportData:false});
  if(TEMPLATES.employee?.warehouse)Object.assign(TEMPLATES.employee.warehouse.v,{viewStockQty:true,viewPrices:false,viewImages:true,switchWarehouse:true,editCart:false,removeCartItems:false,submitOrder:false,viewOrderHistory:false,stocktakeNotes:true,stocktakeReview:true,stocktakeEdit:true,exportData:false});
  if(TEMPLATES.employee?.viewer)Object.assign(TEMPLATES.employee.viewer.v,{viewStockQty:true,viewPrices:false,viewImages:true,switchWarehouse:true,editCart:false,removeCartItems:false,submitOrder:false,viewOrderHistory:false,stocktakeNotes:false,stocktakeReview:false,stocktakeEdit:false,exportData:false});
  if(TEMPLATES.customer?.full)Object.assign(TEMPLATES.customer.full.v,DEFAULTS.customer);
  if(TEMPLATES.customer?.browse)Object.assign(TEMPLATES.customer.browse.v,{viewPrices:true,viewStockStatus:true,viewCartImages:true,editCart:false,removeCartItems:false,branchDistribution:false,checkoutNotes:false,shareProduct:true,viewOrderDetails:false});
  if(TEMPLATES.customer?.noCheckout)Object.assign(TEMPLATES.customer.noCheckout.v,{viewPrices:true,viewStockStatus:true,viewCartImages:true,editCart:true,removeCartItems:true,branchDistribution:true,checkoutNotes:true,shareProduct:true,viewOrderDetails:true});
  document.title='الصلاحيات المتقدمة | الإدارة التنفيذية';
  if(typeof render==='function')render();
 }catch(e){console.warn('[V54 permissions UI]',e)}
}
function permissionSummary(){if(path!=='control-center.html'||document.getElementById('v54-permission-summary'))return;const app=document.getElementById('app'),main=app?.querySelector('main')||app;if(!main)return;const row=document.createElement('div');row.id='v54-permission-summary';row.className='v54-metrics';row.style.margin='14px';row.innerHTML=`<div class="v54-metric"><small>صلاحيات الموظف</small><b>${8+Object.keys(employeeExtra).length}</b><span>بحث، مخزون، صور، فواتير، طلبات، جرد وتصدير</span></div><div class="v54-metric"><small>صلاحيات العميل</small><b>${9+Object.keys(customerExtra).length}</b><span>تصفح، أسعار، سلة، توزيع، اعتماد، مشاركة وطلبات</span></div><div class="v54-metric"><small>مستويات التحكم</small><b>3</b><span>افتراضي · استثناء فردي · قالب جاهز</span></div><div class="v54-metric"><small>الحفظ</small><b>مباشر</b><span>يتزامن مع محرك الصلاحيات في الواجهات الفعلية</span></div>`;main.insertBefore(row,main.firstChild)}
function loadSalesClarity(){if(path!=='inventory-analytics.html'||document.getElementById('v54-sales-clarity-script'))return;const s=document.createElement('script');s.id='v54-sales-clarity-script';s.src='./v54-sales-clarity.js?v=54.0';s.async=true;document.head.appendChild(s)}
function labels(){
 document.querySelectorAll('.v52-brand-copy b,.v52-mobile-copy b').forEach(x=>x.textContent='الإدارة التنفيذية');
 document.querySelectorAll('.v52-status-sub').forEach(x=>x.textContent='إدارة موحدة · صلاحيات ورقابة وتشغيل');
 if(path==='control-center.html'){
  const brand=document.querySelector('.brand b');if(brand)brand.textContent='الصلاحيات المتقدمة';
  const brandSub=document.querySelector('.brand span');if(brandSub)brandSub.textContent='تحكم تفصيلي بالموظفين والعملاء والميزات';
  const tabs=[...document.querySelectorAll('.tab')];tabs.forEach(t=>{if(t.textContent.trim()==='الصلاحيات')t.textContent='الصلاحيات المتقدمة'});
 }
}
function run(){extendControlCenter();labels();permissionSummary();loadSalesClarity()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(run,0));else setTimeout(run,0);
const mo=new MutationObserver(()=>{clearTimeout(mo.t);mo.t=setTimeout(()=>{labels();permissionSummary();loadSalesClarity()},120)});mo.observe(document.documentElement,{childList:true,subtree:true});
window.__V54_ADMIN_ENHANCEMENTS={version:VERSION,employeeExtra,customerExtra,refresh:run};
})();