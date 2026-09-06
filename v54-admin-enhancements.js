(()=>{
'use strict';
const VERSION='56.34',path=(location.pathname.split('/').pop()||'').toLowerCase();
const employeeExtra={
 viewStockQty:'المخزون — رؤية الكمية الفعلية',viewPrices:'المخزون — رؤية الأسعار',viewImages:'المنتجات — رؤية الصور',switchWarehouse:'المخزون — التبديل بين المستودعات',
 editCart:'الفاتورة — تعديل الكميات',removeCartItems:'الفاتورة — حذف الأصناف',submitOrder:'الفاتورة — اعتماد وإرسال الطلب',viewOrderHistory:'الطلبات — رؤية السجل السابق',
 stocktakeNotes:'الجرد — إضافة الملاحظات',stocktakeReview:'الجرد — مراجعة النواقص والفروقات',stocktakeEdit:'الجرد — تعديل العد قبل الإغلاق',exportData:'البيانات — التصدير والتنزيل'
};
const customerExtra={
 viewPrices:'المنتجات — رؤية الأسعار',viewStockStatus:'المنتجات — رؤية حالة التوفر',viewCartImages:'السلة — عرض صور الأصناف',editCart:'السلة — تعديل الكميات',removeCartItems:'السلة — حذف الأصناف',branchDistribution:'السلة — تعديل توزيع الفروع',checkoutNotes:'الطلب — إضافة ملاحظة',shareProduct:'المنتجات — المشاركة',viewOrderDetails:'الطلبات — رؤية تفاصيل الطلبات السابقة'
};
const securityIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 4 6v6c0 5 3.4 8.4 8 9 4.6-.6 8-4 8-9V6z"/><path d="M9 12l2 2 4-5"/></svg>';
function loadCanvasFix(){if(document.getElementById('v54-1-desktop-canvas-fix'))return;const l=document.createElement('link');l.id='v54-1-desktop-canvas-fix';l.rel='stylesheet';l.href='./v54-1-desktop-canvas-fix.css?v=56.34';document.head.appendChild(l)}
function extendControlCenter(){
 if(path!=='control-center.html')return;
 try{
  if(typeof PERMS==='undefined'||typeof DEFAULTS==='undefined'||typeof TEMPLATES==='undefined')return;
  Object.assign(PERMS.employee,employeeExtra);Object.assign(PERMS.customer,customerExtra);
  for(const k of Object.keys(employeeExtra))if(!(k in DEFAULTS.employee))DEFAULTS.employee[k]=true;
  for(const k of Object.keys(customerExtra))if(!(k in DEFAULTS.customer))DEFAULTS.customer[k]=true;
  if(typeof S!=='undefined'&&S?.permissions){S.permissions.employeeDefaults={...DEFAULTS.employee,...(S.permissions.employeeDefaults||{})};S.permissions.customerDefaults={...DEFAULTS.customer,...(S.permissions.customerDefaults||{})}}
  if(TEMPLATES.employee?.full)Object.assign(TEMPLATES.employee.full.v,DEFAULTS.employee);
  if(TEMPLATES.employee?.sales)Object.assign(TEMPLATES.employee.sales.v,{viewStockQty:true,viewPrices:true,viewImages:true,switchWarehouse:true,editCart:true,removeCartItems:true,submitOrder:true,viewOrderHistory:true,stocktakeNotes:false,stocktakeReview:false,stocktakeEdit:false,exportData:false});
  if(TEMPLATES.employee?.warehouse)Object.assign(TEMPLATES.employee.warehouse.v,{viewStockQty:true,viewPrices:false,viewImages:true,switchWarehouse:true,editCart:false,removeCartItems:false,submitOrder:false,viewOrderHistory:false,stocktakeNotes:true,stocktakeReview:true,stocktakeEdit:true,exportData:false});
  if(TEMPLATES.employee?.viewer)Object.assign(TEMPLATES.employee.viewer.v,{viewStockQty:true,viewPrices:false,viewImages:true,switchWarehouse:true,editCart:false,removeCartItems:false,submitOrder:false,viewOrderHistory:false,stocktakeNotes:false,stocktakeReview:false,stocktakeEdit:false,exportData:false});
  if(TEMPLATES.customer?.full)Object.assign(TEMPLATES.customer.full.v,DEFAULTS.customer);
  if(TEMPLATES.customer?.browse)Object.assign(TEMPLATES.customer.browse.v,{viewPrices:true,viewStockStatus:true,viewCartImages:true,editCart:false,removeCartItems:false,branchDistribution:false,checkoutNotes:false,shareProduct:true,viewOrderDetails:false});
  if(TEMPLATES.customer?.noCheckout)Object.assign(TEMPLATES.customer.noCheckout.v,{viewPrices:true,viewStockStatus:true,viewCartImages:true,editCart:true,removeCartItems:true,branchDistribution:true,checkoutNotes:true,shareProduct:true,viewOrderDetails:true});
  document.title='الصلاحيات المتقدمة | الإدارة التنفيذية';if(typeof render==='function')render();
 }catch(e){console.warn('[V54 permissions UI]',e)}
}
function permissionSummary(){if(path!=='control-center.html'||document.getElementById('v54-permission-summary'))return;const app=document.getElementById('app'),main=app?.querySelector('main')||app;if(!main)return;const row=document.createElement('div');row.id='v54-permission-summary';row.className='v54-metrics';row.style.margin='14px';row.innerHTML=`<div class="v54-metric"><small>صلاحيات الموظف</small><b>${8+Object.keys(employeeExtra).length}</b><span>بحث، مخزون، صور، فواتير، طلبات، جرد وتصدير</span></div><div class="v54-metric"><small>صلاحيات العميل</small><b>${9+Object.keys(customerExtra).length}</b><span>تصفح، أسعار، سلة، توزيع، اعتماد، مشاركة وطلبات</span></div><div class="v54-metric"><small>مستويات التحكم</small><b>3</b><span>افتراضي · استثناء فردي · قالب جاهز</span></div><div class="v54-metric"><small>الحفظ</small><b>مباشر</b><span>يتزامن مع محرك الصلاحيات في الواجهات الفعلية</span></div>`;main.insertBefore(row,main.firstChild)}
function loadSalesClarity(){if(path!=='inventory-analytics.html'||document.getElementById('v54-sales-clarity-script'))return;const s=document.createElement('script');s.id='v54-sales-clarity-script';s.src='./v54-sales-clarity.js?v=54.0';s.async=true;document.head.appendChild(s)}
function labels(){document.querySelectorAll('.v52-brand-copy b,.v52-mobile-copy b').forEach(x=>x.textContent='الإدارة التنفيذية');document.querySelectorAll('.v52-status-sub').forEach(x=>x.textContent='إدارة موحدة · صلاحيات ورقابة وتشغيل');if(path==='control-center.html'){const brand=document.querySelector('.brand b');if(brand)brand.textContent='الصلاحيات المتقدمة';const brandSub=document.querySelector('.brand span');if(brandSub)brandSub.textContent='تحكم تفصيلي بالموظفين والعملاء والميزات';[...document.querySelectorAll('.tab')].forEach(t=>{if(t.textContent.trim()==='الصلاحيات')t.textContent='الصلاحيات المتقدمة'})}}

function removeLegacySecurityLaunchers(){['v51-security','v52-mobile-security','v52-sheet-security'].forEach(id=>document.getElementById(id)?.remove());document.querySelectorAll('.v52-security').forEach(el=>el.remove())}
function unifiedPeopleNavigation(){
 const dashboard=path==='admin-dashboard.html';
 const q=new URLSearchParams(location.search),security=q.get('section')==='security';
 const employeeLinks=[...document.querySelectorAll('[data-v52="employees"],[data-v52-mobile="employees"]')];
 const customerLinks=[...document.querySelectorAll('[data-v52="customers"],[data-v52-mobile="customers"]')];
 employeeLinks.forEach(a=>{a.href='./admin-dashboard.html?section=employees&module=live';a.dataset.v56People='true';const span=a.querySelector('span');if(span)span.textContent='الموظفون والعملاء';a.classList.toggle('on',dashboard&&!security)});
 customerLinks.forEach(a=>a.remove());
 const mobile=document.getElementById('v52-mobile-nav');if(mobile)mobile.dataset.v56UnifiedPeople='true';
}
function ensureSecurityNavigation(){
 const q=new URLSearchParams(location.search),active=path==='admin-dashboard.html'&&q.get('section')==='security';
 const sideGroups=[...document.querySelectorAll('.v52-sidebar .v52-nav')];const side=sideGroups[sideGroups.length-1];
 if(side&&!side.querySelector('[data-v56-security-center]')){const a=document.createElement('a');a.className='v52-item v51-item';a.dataset.v56SecurityCenter='true';a.href='./admin-dashboard.html?section=security';a.innerHTML=`${securityIcon}<span>الأمن والتحكم</span>`;side.appendChild(a)}
 const sheet=document.querySelector('#v52-more-sheet .v52-sheet-grid');
 if(sheet&&!sheet.querySelector('[data-v56-security-center]')){const a=document.createElement('a');a.className='v52-item v51-item';a.dataset.v56SecurityCenter='true';a.href='./admin-dashboard.html?section=security';a.innerHTML=`${securityIcon}<span>الأمن والتحكم</span>`;const exit=sheet.querySelector('.v52-exit');exit?sheet.insertBefore(a,exit):sheet.appendChild(a)}
 document.querySelectorAll('[data-v56-security-center]').forEach(a=>a.classList.toggle('on',active));
}
function renderIntegratedSecurity(){
 if(path!=='admin-dashboard.html')return;const q=new URLSearchParams(location.search),enabled=q.get('section')==='security';
 const root=document.getElementById('root');if(!root)return;
 let page=document.getElementById('v56-security-integrated');
 if(!enabled){document.body.classList.remove('v56-security-embedded');if(page)page.remove();root.style.removeProperty('display');return}
 document.body.classList.add('v56-security-embedded');root.style.setProperty('display','none','important');
 if(page)return;
 page=document.createElement('main');page.id='v56-security-integrated';page.className='v52-page v56-security-page fade';
 page.innerHTML=`<div class="v52-page-head v56-security-head"><div><div class="v52-eyebrow">الإدارة التنفيذية · الأمن</div><h1 class="v52-page-title">مركز القيادة والتحكم الأمني</h1><div class="v52-page-sub">المراقبة الأمنية، الجلسات، النشاط، بوابة العملاء والسجل الإداري في مساحة تنفيذية موحدة.</div></div></div><div class="v56-security-frame-wrap"><iframe title="مركز القيادة والتحكم الأمني" src="./security-center.html?embed=executive&v=56.34" class="v56-security-frame"></iframe></div>`;
 root.insertAdjacentElement('afterend',page);document.title='مركز القيادة والتحكم الأمني | الإدارة التنفيذية';
}
function executiveIntegration(){removeLegacySecurityLaunchers();unifiedPeopleNavigation();ensureSecurityNavigation();renderIntegratedSecurity()}
function run(){loadCanvasFix();extendControlCenter();labels();permissionSummary();loadSalesClarity();executiveIntegration()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(run,0));else setTimeout(run,0);
const mo=new MutationObserver(()=>{clearTimeout(mo.t);mo.t=setTimeout(()=>{loadCanvasFix();labels();permissionSummary();loadSalesClarity();executiveIntegration()},120)});mo.observe(document.documentElement,{childList:true,subtree:true});
window.__V54_ADMIN_ENHANCEMENTS={version:VERSION,employeeExtra,customerExtra,refresh:run};window.__V56_34_EXECUTIVE_INTEGRATION={version:VERSION,refresh:run};
})();
