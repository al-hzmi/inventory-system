(()=>{
'use strict';
const VERSION='56.35',path=(location.pathname.split('/').pop()||'').toLowerCase();
const employeeExtra={
 viewStockQty:'المخزون — رؤية الكمية الفعلية',viewPrices:'المخزون — رؤية الأسعار',viewImages:'المنتجات — رؤية الصور',switchWarehouse:'المخزون — التبديل بين المستودعات',
 editCart:'الفاتورة — تعديل الكميات',removeCartItems:'الفاتورة — حذف الأصناف',submitOrder:'الفاتورة — اعتماد وإرسال الطلب',viewOrderHistory:'الطلبات — رؤية السجل السابق',
 stocktakeNotes:'الجرد — إضافة الملاحظات',stocktakeReview:'الجرد — مراجعة النواقص والفروقات',stocktakeEdit:'الجرد — تعديل العد قبل الإغلاق',exportData:'البيانات — التصدير والتنزيل'
};
const customerExtra={
 viewPrices:'المنتجات — رؤية الأسعار',viewStockStatus:'المنتجات — رؤية حالة التوفر',viewCartImages:'السلة — عرض صور الأصناف',editCart:'السلة — تعديل الكميات',removeCartItems:'السلة — حذف الأصناف',branchDistribution:'السلة — تعديل توزيع الفروع',checkoutNotes:'الطلب — إضافة ملاحظة',shareProduct:'المنتجات — المشاركة',viewOrderDetails:'الطلبات — رؤية تفاصيل الطلبات السابقة'
};
function loadCanvasFix(){if(document.getElementById('v54-1-desktop-canvas-fix'))return;const l=document.createElement('link');l.id='v54-1-desktop-canvas-fix';l.rel='stylesheet';l.href='./v54-1-desktop-canvas-fix.css?v=56.35';document.head.appendChild(l)}
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

function removeLegacySecurityLaunchers(){
 ['v51-security','v52-mobile-security','v52-sheet-security','v48-security-btn','v49-security-tab','v49-security-fallback'].forEach(id=>document.getElementById(id)?.remove());
 document.querySelectorAll('.v52-security,[data-v56-security-center]').forEach(el=>el.remove());
}
function unifiedPeopleNavigation(){
 const dashboard=path==='admin-dashboard.html';
 const employeeLinks=[...document.querySelectorAll('[data-v52="employees"],[data-v52-mobile="employees"]')];
 const customerLinks=[...document.querySelectorAll('[data-v52="customers"],[data-v52-mobile="customers"]')];
 employeeLinks.forEach(a=>{a.href='./admin-dashboard.html?section=employees&module=live';a.dataset.v56People='true';const span=a.querySelector('span');if(span)span.textContent='الموظفون والعملاء';a.classList.toggle('on',dashboard)});
 customerLinks.forEach(a=>a.remove());
 const mobile=document.getElementById('v52-mobile-nav');if(mobile)mobile.dataset.v56UnifiedPeople='true';
}
function ensureExecutiveSecurityStyle(){
 if(document.getElementById('v56-35-security-style'))return;
 const s=document.createElement('style');s.id='v56-35-security-style';s.textContent=`
 #v56-security-command-center{margin-top:14px;scroll-margin-top:22px;background:#fff;border:1px solid var(--admin-line,#e4e9e6);border-radius:16px;overflow:hidden;box-shadow:0 1px 2px rgba(20,35,28,.03)}
 #v56-security-command-center .v56-sec-head{padding:16px 18px;border-bottom:1px solid var(--admin-line,#e4e9e6);display:flex;gap:12px;align-items:flex-start;justify-content:space-between}
 #v56-security-command-center .v56-sec-eye{font-size:9px;font-weight:700;color:#0d654b}.v56-sec-title{font-size:17px;font-weight:700;margin-top:3px;color:var(--admin-ink,#17211c)}
 #v56-security-command-center .v56-sec-sub{font-size:10px;line-height:1.8;color:var(--admin-muted,#66716b);margin-top:4px}
 #v56-security-command-center .v56-sec-badge{font-size:9px;font-weight:700;color:#0d654b;background:#eef8f3;border:1px solid #d9eee4;border-radius:999px;padding:5px 9px;white-space:nowrap}
 #v56-security-command-center .v56-sec-frame-wrap{background:#f7f9f8;width:100%;overflow:hidden}
 #v56-security-command-center iframe{display:block;width:100%;height:980px;border:0;background:#fafaf9}
 @media(max-width:700px){#v56-security-command-center{border-radius:14px}#v56-security-command-center .v56-sec-head{padding:14px;flex-direction:column}#v56-security-command-center iframe{height:920px}}
 `;document.head.appendChild(s)
}
function renderExecutiveSecurityCenter(){
 if(path!=='admin-home.html')return;
 const home=document.getElementById('home');if(!home||document.getElementById('v56-security-command-center'))return;
 if(!home.querySelector('.v52-page-head')&&!home.querySelector('.v52-grid'))return;
 ensureExecutiveSecurityStyle();
 const section=document.createElement('section');section.id='v56-security-command-center';section.innerHTML=`<div class="v56-sec-head"><div><div class="v56-sec-eye">الأمن والرقابة · داخل الإدارة التنفيذية</div><div class="v56-sec-title">مركز القيادة والتحكم الأمني</div><div class="v56-sec-sub">المراقبة الأمنية والجلسات والنشاط وبوابة العملاء والسجل الإداري أصبحت جزءًا من لوحة الإدارة التنفيذية نفسها، بدون صفحة تشغيل مستقلة.</div></div><span class="v56-sec-badge">مضمّن بالكامل</span></div><div class="v56-sec-frame-wrap"><iframe title="مركز القيادة والتحكم الأمني" loading="lazy" src="./security-center.html?embed=executive&v=56.35"></iframe></div>`;
 home.appendChild(section);
 if(location.hash==='#security-command-center')setTimeout(()=>section.scrollIntoView({block:'start',behavior:'smooth'}),80);
}
let lastActiveModule='';
function keepActiveModuleVisible(){
 if(path!=='admin-dashboard.html')return;
 const active=document.querySelector('#root [data-admin-module][data-active="true"]');if(!active)return;
 const key=active.getAttribute('data-admin-module')||active.textContent||'';if(key===lastActiveModule)return;lastActiveModule=key;
 requestAnimationFrame(()=>requestAnimationFrame(()=>{
  if(!document.contains(active))return;
  let scroller=active.parentElement;
  while(scroller&&scroller!==document.body&&scroller.scrollWidth<=scroller.clientWidth+2)scroller=scroller.parentElement;
  if(!scroller||scroller===document.body)return;
  const a=active.getBoundingClientRect(),s=scroller.getBoundingClientRect();
  if(a.left<s.left+8||a.right>s.right-8)active.scrollIntoView({block:'nearest',inline:'center',behavior:'smooth'});
 }));
}
function retireLegacySecurityRoute(){if(path!=='admin-dashboard.html')return;const q=new URLSearchParams(location.search);if(q.get('section')==='security')location.replace('./admin-home.html#security-command-center')}
function executiveIntegration(){removeLegacySecurityLaunchers();unifiedPeopleNavigation();retireLegacySecurityRoute();renderExecutiveSecurityCenter();keepActiveModuleVisible()}
function run(){loadCanvasFix();extendControlCenter();labels();permissionSummary();loadSalesClarity();executiveIntegration()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(run,0));else setTimeout(run,0);
const mo=new MutationObserver(()=>{clearTimeout(mo.t);mo.t=setTimeout(()=>{loadCanvasFix();labels();permissionSummary();loadSalesClarity();executiveIntegration()},100)});mo.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['data-active']});
window.__V54_ADMIN_ENHANCEMENTS={version:VERSION,employeeExtra,customerExtra,refresh:run};window.__V56_35_EXECUTIVE_INTEGRATION={version:VERSION,refresh:run};
})();
