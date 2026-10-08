/* V57 executive workspace. Static links, no extra data subscriptions. */
(()=>{'use strict';
const sections=[
{n:'01',title:'المخزون والمنتجات',desc:'استيراد البيانات، الأصناف، الصور والجرد.',links:[
['استيراد ملف Excel','الكميات والتسعيرة مباشرة','./admin-inventory-import.html','⇪',1],
['إدارة الأصناف والأقسام','الكتالوج وتوزيع المنتجات','./admin-dashboard.html?section=products&module=product_management','▦'],
['ألبوم توزيع الصور','ربط الصور غير المطابقة','./image-distribution.html','▧'],
['مكتبة الصور','رفع صور المنتجات ومراجعتها','./admin-dashboard.html?section=products&module=images','◇'],
['الجرد والمطابقة','الفروقات والنواقص','./admin-stocktake-shell.html','☷']
]},
{n:'02',title:'الموظفون والعملاء',desc:'الحسابات والطلبات وصلاحيات الوصول.',links:[
['الموظفون والجلسات','الحضور والحسابات النشطة','./admin-dashboard.html?section=employees&module=live','♙'],
['إدارة العملاء','حسابات العملاء والشركات','./admin-dashboard.html?section=customers&module=accounts','♧'],
['الطلبات والفواتير','مراجعة طلبات الموظفين','./admin-dashboard.html?section=employees&module=orders','▤'],
['صلاحيات الموقع','التحكم في وصول الموظفين','./admin-dashboard.html?section=employees&module=site_access','◇'],
['جديدنا','الأصناف المضافة مؤخرًا','./admin-dashboard.html?section=products&module=new_arrivals','✳']
]},
{n:'03',title:'التحليل والرقابة',desc:'المؤشرات، صحة النظام والإعدادات.',links:[
['تحليل المخزون والمبيعات','الحركة والاتجاهات والأداء','./inventory-analytics.html','▥'],
['صحة النظام','التشخيص وحالة الخدمات','./health-center.html','⊕'],
['الصلاحيات المتقدمة','التحكم في المزايا والحسابات','./control-center.html','⚙'],
['الهويات والمناسبات','إدارة هوية الموقع','./identities.html','◎'],
['بيانات وإجراءات الإدارة','مراجعة نشاط العملاء والموظفين','./admin-dashboard.html?section=employees&module=overview','≡']
]}];
const iconPaths={
 '⇪':'<path d="M12 16V4m-4 4 4-4 4 4M4 16v4h16v-4"/>',
 '▦':'<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 10h18M9 5v15"/>',
 '▧':'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8" cy="9" r="1.5"/><path d="m3 17 5-5 4 4 3-3 6 5"/>',
 '◇':'<rect x="5" y="6" width="14" height="14" rx="2"/><path d="M8 3h13v13"/>',
 '☷':'<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
 '♙':'<circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
 '♧':'<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="3"/><path d="M2 21v-2a7 7 0 0 1 14 0v2m1-9a6 6 0 0 1 5 6v3"/>',
 '▤':'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>',
 '✳':'<path d="m12 3 1.9 5.9L20 11l-6.1 2.1L12 19l-1.9-5.9L4 11l6.1-2.1L12 3Z"/>',
 '▥':'<path d="M4 19V9m5 10V5m5 14v-7m5 7V3M2 21h20"/>',
 '⊕':'<circle cx="12" cy="12" r="9"/><path d="M8 12h8m-4-4v8"/>',
 '⚙':'<path d="M10 3h4l.8 2.5 2 .8 2.3-1.2 2.8 2.8-1.2 2.3.8 2L24 14v4l-2.5.8-.8 2-2.3 1.2-2.8-2.8-2.3 1.2-2 .8L14 24h-4l-.8-2.5-2-.8-2.3 1.2-2.8-2.8 1.2-2.3-.8-2L0 14v-4l2.5-.8.8-2L2.1 5l2.8-2.8 2.3 1.2 2-.8L10 0Z" transform="translate(3 3) scale(.72)"/><circle cx="12" cy="12" r="3"/>',
 '◎':'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/>',
 '≡':'<path d="M4 6h16M4 12h16M4 18h16"/>'
};
const icon=name=>'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(iconPaths[name]||iconPaths['≡'])+'</svg>';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function renderWorkspace(){const home=document.getElementById('home');if(!home||home.querySelector('#v57-workspace'))return;const head=home.querySelector('.v52-page-head');if(!head)return;const box=document.createElement('section');box.className='v57-workspace';box.id='v57-workspace';box.setAttribute('aria-label','مركز العمليات الإدارية');box.innerHTML='<div class="v57-brief"><div><h2>مركز العمليات</h2><p>كل وظائف الإدارة اليومية، مرتبة حسب العمل بدل البحث بين الصفحات.</p></div><span class="v57-brief-tag">الوصول المباشر للمهام</span></div><div class="v57-groups">'+sections.map(g=>'<section class="v57-group"><div class="v57-group-head"><span class="v57-group-number">'+g.n+'</span><div><h3>'+esc(g.title)+'</h3><p>'+esc(g.desc)+'</p></div></div><div class="v57-actions">'+g.links.map(a=>'<a class="v57-action'+(a[4]?' featured':'')+'" href="'+a[2]+'"><span class="v57-action-icon" aria-hidden="true">'+icon(a[3])+'</span><span class="v57-action-label"><strong>'+esc(a[0])+'</strong><small>'+esc(a[1])+'</small></span><span class="v57-action-arrow" aria-hidden="true">←</span></a>').join('')+'</div></section>').join('')+'</div><div class="v57-data-head"><h2>مؤشرات الأداء</h2><p>قراءة تحليلية للمبيعات والمخزون، منفصلة عن أدوات الإدارة اليومية.</p></div>';head.after(box);const oldQuick=home.querySelector('.v54-quick');if(oldQuick){oldQuick.style.display='none';const title=oldQuick.previousElementSibling;if(title?.classList.contains('v54-section-title'))title.style.display='none';}}
function mobileImport(){const sheet=document.getElementById('v52-more-sheet'),grid=sheet?.querySelector('.v52-sheet-grid');if(!grid||grid.querySelector('[data-v57-import]'))return;const a=document.createElement('a');a.className='v52-item v51-item';a.href='./admin-inventory-import.html';a.dataset.v57Import='true';a.innerHTML='<span aria-hidden="true">⇪</span><span>استيراد Excel</span>';grid.prepend(a);}
function init(){const home=document.getElementById('home');if(home){renderWorkspace();const observer=new MutationObserver(()=>{if(!home.querySelector('#v57-workspace'))renderWorkspace()});observer.observe(home,{childList:true});}mobileImport();setTimeout(mobileImport,200);setTimeout(mobileImport,1000)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
