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
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function renderWorkspace(){const home=document.getElementById('home');if(!home||home.querySelector('#v57-workspace'))return;const head=home.querySelector('.v52-page-head');if(!head)return;const box=document.createElement('section');box.className='v57-workspace';box.id='v57-workspace';box.setAttribute('aria-label','مركز العمليات الإدارية');box.innerHTML='<div class="v57-brief"><div><h2>مركز العمليات</h2><p>كل وظائف الإدارة اليومية، مرتبة حسب العمل بدل البحث بين الصفحات.</p></div><span class="v57-brief-tag">الوصول المباشر للمهام</span></div><div class="v57-groups">'+sections.map(g=>'<section class="v57-group"><div class="v57-group-head"><span class="v57-group-number">'+g.n+'</span><div><h3>'+esc(g.title)+'</h3><p>'+esc(g.desc)+'</p></div></div><div class="v57-actions">'+g.links.map(a=>'<a class="v57-action'+(a[4]?' featured':'')+'" href="'+a[2]+'"><span class="v57-action-icon" aria-hidden="true">'+a[3]+'</span><span class="v57-action-label"><strong>'+esc(a[0])+'</strong><small>'+esc(a[1])+'</small></span><span class="v57-action-arrow" aria-hidden="true">←</span></a>').join('')+'</div></section>').join('')+'</div><div class="v57-data-head"><h2>مؤشرات الأداء</h2><p>قراءة تحليلية للمبيعات والمخزون، منفصلة عن أدوات الإدارة اليومية.</p></div>';head.after(box);const oldQuick=home.querySelector('.v54-quick');if(oldQuick){oldQuick.style.display='none';const title=oldQuick.previousElementSibling;if(title?.classList.contains('v54-section-title'))title.style.display='none';}}
function mobileImport(){const sheet=document.getElementById('v52-more-sheet'),grid=sheet?.querySelector('.v52-sheet-grid');if(!grid||grid.querySelector('[data-v57-import]'))return;const a=document.createElement('a');a.className='v52-item v51-item';a.href='./admin-inventory-import.html';a.dataset.v57Import='true';a.innerHTML='<span aria-hidden="true">⇪</span><span>استيراد Excel</span>';grid.prepend(a);}
function init(){const home=document.getElementById('home');if(home){renderWorkspace();const observer=new MutationObserver(()=>{if(!home.querySelector('#v57-workspace'))renderWorkspace()});observer.observe(home,{childList:true});}mobileImport();setTimeout(mobileImport,200);setTimeout(mobileImport,1000)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
