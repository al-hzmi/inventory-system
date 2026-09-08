#!/usr/bin/env python3
from pathlib import Path

FILES = {
    'dashboard': Path('admin-dashboard.html'),
    'nav': Path('v46-admin-nav.js'),
    'enh': Path('v54-admin-enhancements.js'),
    'css': Path('v54-1-desktop-canvas-fix.css'),
}


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'V56.38 anchor missing: {label}')
    return text.replace(old, new, 1)

# -----------------------------------------------------------------------------
# admin-dashboard: make products a first-class domain, not an employee sub-tab.
# -----------------------------------------------------------------------------
p = FILES['dashboard']
s = p.read_text(encoding='utf-8')

old = "const initialRoute=useMemo(()=>{const params=new URLSearchParams(location.search),area=params.get('section')==='customers'?'customers':'employees';return {area,module:params.get('module')||'live'}},[]);"
new = "const initialRoute=useMemo(()=>{const params=new URLSearchParams(location.search),requestedSection=params.get('section'),requestedModule=params.get('module')||'live',productModules=new Set(['product_management','images','new_arrivals','categories']);const area=requestedSection==='products'||productModules.has(requestedModule)?'products':requestedSection==='customers'?'customers':'employees';const module=area==='products'?(productModules.has(requestedModule)?requestedModule:'product_management'):requestedModule;return {area,module}},[]);"
s = replace_once(s, old, new, 'initial route')

old = """  const employeeTabs=[
    ['live','activity','الآن',employeeOnline.size],
    ['overview','grid','الأرقام',null],
    ['product_management','box','المنتجات',null],
    ['accounts','lock','حسابات الموظفين',eAccounts.length],
    ['site_access','power','صلاحيات الموقع',employeeSiteControl.mode==='open'?null:'!'],
    ['images','image','إدارة الصور',null],
    ['new_arrivals','box','جديدنا',(newArrivalCatalog.meta.items||[]).length],
    ['security_photos','camera','صور التحقق',eSecurityPhotos.length],
    ['staff','users','الموظفون',eUsers.length],
    ['sessions','clock','جلسات العمل',employeeOnline.size],
    ['orders','cart','الطلبات',eOrders.length],
    ['drafts','file','المسودات',eDrafts.length],
    ['searches','search','سجل البحث',searches.length],
    ['categories','history','التصنيفات',categoryAudit.length],
    ['raw','database','البيانات',null]
  ];
  const customerTabs=[
    ['live','activity','الآن',customerOnlineCount],
    ['overview','grid','الأرقام',null],
    ['companies','building','الشركات',companies.length],
    ['accounts','users','العملاء',customers.filter(c=>c.status!=='deleted').length],
    ['images','image','إدارة الصور',null],
    ['security_photos','camera','صور التحقق',cSecurityPhotos.length],
    ['activity','activity','النشاط',cActivity.length],
    ['orders','cart','الطلبات',cOrders.length],
    ['drafts','file','المسودات',cDrafts.length],
    ['sessions','clock','الجلسات والدخول',customerOnlineCount],
    ['portal','settings','تشغيل البوابة',control.enabled?null:'!'],
    ['raw','database','البيانات',null]
  ];"""
new = """  const employeeTabs=[
    ['live','activity','الآن',employeeOnline.size],
    ['overview','grid','الأرقام',null],
    ['accounts','lock','حسابات الموظفين',eAccounts.length],
    ['site_access','power','صلاحيات الموقع',employeeSiteControl.mode==='open'?null:'!'],
    ['security_photos','camera','صور التحقق',eSecurityPhotos.length],
    ['staff','users','الموظفون',eUsers.length],
    ['sessions','clock','جلسات العمل',employeeOnline.size],
    ['orders','cart','الطلبات',eOrders.length],
    ['drafts','file','المسودات',eDrafts.length],
    ['searches','search','سجل البحث',searches.length],
    ['raw','database','البيانات',null]
  ];
  const customerTabs=[
    ['live','activity','الآن',customerOnlineCount],
    ['overview','grid','الأرقام',null],
    ['companies','building','الشركات',companies.length],
    ['accounts','users','العملاء',customers.filter(c=>c.status!=='deleted').length],
    ['security_photos','camera','صور التحقق',cSecurityPhotos.length],
    ['activity','activity','النشاط',cActivity.length],
    ['orders','cart','الطلبات',cOrders.length],
    ['drafts','file','المسودات',cDrafts.length],
    ['sessions','clock','الجلسات والدخول',customerOnlineCount],
    ['portal','settings','تشغيل البوابة',control.enabled?null:'!'],
    ['raw','database','البيانات',null]
  ];
  const productTabs=[
    ['product_management','box','الرئيسية',null],
    ['images','image','مكتبة الصور',null],
    ['new_arrivals','box','جديدنا',(newArrivalCatalog.meta.items||[]).length],
    ['categories','history','سجل التصنيفات',categoryAudit.length]
  ];"""
s = replace_once(s, old, new, 'domain tab separation')

old = """  function CommandHeader(){
    const title=area==='employees'?'مركز قيادة الموظفين':'مركز قيادة العملاء';
    return <>
      <div className=\"h-16 px-4 sm:px-5 flex items-center justify-between border-b border-border bg-surface shrink-0\">
        <div className=\"flex items-center gap-3 min-w-0\">
          <div className=\"w-10 h-10 rounded-xl bg-accentSoft text-accent flex items-center justify-center shrink-0\"><Icon name={area==='employees'?'users':'building'} className=\"w-5 h-5\"/></div>"""
new = """  function CommandHeader(){
    const title=area==='products'?'مركز إدارة المنتجات والأقسام':area==='employees'?'مركز قيادة الموظفين':'مركز قيادة العملاء';
    const headerIcon=area==='products'?'box':area==='employees'?'users':'building';
    return <>
      <div className=\"h-16 px-4 sm:px-5 flex items-center justify-between border-b border-border bg-surface shrink-0\">
        <div className=\"flex items-center gap-3 min-w-0\">
          <div className=\"w-10 h-10 rounded-xl bg-accentSoft text-accent flex items-center justify-center shrink-0\"><Icon name={headerIcon} className=\"w-5 h-5\"/></div>"""
s = replace_once(s, old, new, 'command header identity')

old = """      <div className=\"px-4 py-3 border-b border-border bg-white shrink-0\"><div className=\"grid grid-cols-2 gap-2 max-w-[520px] mx-auto\">
        <button data-admin-area=\"employees\" data-active={area==='employees'} onClick={()=>openArea('employees','live')} className={`h-11 rounded-xl border text-[13px] font-bold flex items-center justify-center gap-2 ${area==='employees'?'bg-primary text-white border-primary':'bg-white border-border text-secondary hover:bg-surface'}`}><Icon name=\"users\" className=\"w-4 h-4\"/>الموظفون{employeesWithoutPassword>0&&<span className={`min-w-5 h-5 px-1.5 rounded-full text-[9px] flex items-center justify-center ${area==='employees'?'bg-white text-danger':'bg-danger text-white'}`}>{employeesWithoutPassword}</span>}</button>
        <button data-admin-area=\"customers\" data-active={area==='customers'} onClick={()=>openArea('customers','live')} className={`h-11 rounded-xl border text-[13px] font-bold flex items-center justify-center gap-2 ${area==='customers'?'bg-primary text-white border-primary':'bg-white border-border text-secondary hover:bg-surface'}`}><Icon name=\"building\" className=\"w-4 h-4\"/>العملاء<span className={`text-[9px] px-2 py-0.5 rounded-full ${control.enabled?(area==='customers'?'bg-white/15 text-white':'bg-successSoft text-success'):(area==='customers'?'bg-white text-danger':'bg-dangerSoft text-danger')}`}>{control.enabled?'مفعلة':'متوقفة'}</span></button>
      </div></div>"""
new = """      {area!=='products'&&<div className=\"px-4 py-3 border-b border-border bg-white shrink-0\"><div className=\"grid grid-cols-2 gap-2 max-w-[520px] mx-auto\">
        <button data-admin-area=\"employees\" data-active={area==='employees'} onClick={()=>openArea('employees','live')} className={`h-11 rounded-xl border text-[13px] font-bold flex items-center justify-center gap-2 ${area==='employees'?'bg-primary text-white border-primary':'bg-white border-border text-secondary hover:bg-surface'}`}><Icon name=\"users\" className=\"w-4 h-4\"/>الموظفون{employeesWithoutPassword>0&&<span className={`min-w-5 h-5 px-1.5 rounded-full text-[9px] flex items-center justify-center ${area==='employees'?'bg-white text-danger':'bg-danger text-white'}`}>{employeesWithoutPassword}</span>}</button>
        <button data-admin-area=\"customers\" data-active={area==='customers'} onClick={()=>openArea('customers','live')} className={`h-11 rounded-xl border text-[13px] font-bold flex items-center justify-center gap-2 ${area==='customers'?'bg-primary text-white border-primary':'bg-white border-border text-secondary hover:bg-surface'}`}><Icon name=\"building\" className=\"w-4 h-4\"/>العملاء<span className={`text-[9px] px-2 py-0.5 rounded-full ${control.enabled?(area==='customers'?'bg-white/15 text-white':'bg-successSoft text-success'):(area==='customers'?'bg-white text-danger':'bg-dangerSoft text-danger')}`}>{control.enabled?'مفعلة':'متوقفة'}</span></button>
      </div></div>}"""
s = replace_once(s, old, new, 'people switch isolation')

old = "function TabsBar(){const tabs=area==='employees'?employeeTabs:customerTabs;return <div className=\"flex overflow-x-auto no-scrollbar border-b border-border bg-surface shrink-0\">"
new = "function TabsBar(){const tabs=area==='products'?productTabs:area==='employees'?employeeTabs:customerTabs;return <div className=\"flex overflow-x-auto no-scrollbar border-b border-border bg-surface shrink-0\">"
s = replace_once(s, old, new, 'tabs bar domains')

old = "function ActiveContent(){if(area==='employees'){switch(module){case'live':return <EmployeeLive/>;case'overview':return <EmployeeOverview/>;case'product_management':return <ProductManagementHub/>;case'accounts':return <EmployeeAccounts/>;case'site_access':return <EmployeeSiteAccessControl/>;case'images':return <ImageLibraryManager/>;case'new_arrivals':return <NewArrivalsManager/>;case'security_photos':return <EmployeeSecurityPhotos/>;case'staff':return <EmployeeStaff/>;case'sessions':return <EmployeeSessions/>;case'orders':return <EmployeeOrders/>;case'drafts':return <EmployeeDrafts/>;case'searches':return <EmployeeSearches/>;case'categories':return <EmployeeCategories/>;case'raw':return <RawCollections side=\"employees\"/>;default:return <EmployeeOverview/>}}switch(module){case'live':return <CustomerLive/>;case'overview':return <CustomerOverview/>;case'companies':return <CustomerCompanies/>;case'accounts':return <CustomerAccounts/>;case'images':return <ImageLibraryManager/>;case'new_arrivals':return <NewArrivalsManager/>;case'security_photos':return <CustomerSecurityPhotos/>;case'activity':return <CustomerActivity/>;case'orders':return <CustomerOrders/>;case'drafts':return <CustomerDrafts/>;case'sessions':return <CustomerSessions/>;case'portal':return <CustomerPortal/>;case'raw':return <RawCollections side=\"customers\"/>;default:return <CustomerOverview/>}}"
new = "function ActiveContent(){if(area==='products'){switch(module){case'product_management':return <ProductManagementHub/>;case'images':return <ImageLibraryManager/>;case'new_arrivals':return <NewArrivalsManager/>;case'categories':return <EmployeeCategories/>;default:return <ProductManagementHub/>}}if(area==='employees'){switch(module){case'live':return <EmployeeLive/>;case'overview':return <EmployeeOverview/>;case'accounts':return <EmployeeAccounts/>;case'site_access':return <EmployeeSiteAccessControl/>;case'security_photos':return <EmployeeSecurityPhotos/>;case'staff':return <EmployeeStaff/>;case'sessions':return <EmployeeSessions/>;case'orders':return <EmployeeOrders/>;case'drafts':return <EmployeeDrafts/>;case'searches':return <EmployeeSearches/>;case'raw':return <RawCollections side=\"employees\"/>;default:return <EmployeeOverview/>}}switch(module){case'live':return <CustomerLive/>;case'overview':return <CustomerOverview/>;case'companies':return <CustomerCompanies/>;case'accounts':return <CustomerAccounts/>;case'security_photos':return <CustomerSecurityPhotos/>;case'activity':return <CustomerActivity/>;case'orders':return <CustomerOrders/>;case'drafts':return <CustomerDrafts/>;case'sessions':return <CustomerSessions/>;case'portal':return <CustomerPortal/>;case'raw':return <RawCollections side=\"customers\"/>;default:return <CustomerOverview/>}}"
s = replace_once(s, old, new, 'active content domains')

s = replace_once(s, '<script src="./v46-admin-nav.js?v=55.4"></script>', '<script src="./v46-admin-nav.js?v=56.38"></script>', 'dashboard nav cache')
p.write_text(s, encoding='utf-8')

# -----------------------------------------------------------------------------
# Navigation: products becomes a first-class route and a permanent mobile item.
# -----------------------------------------------------------------------------
p = FILES['nav']
s = p.read_text(encoding='utf-8')
s = replace_once(s, "// V56.37 final verification marker: unified admin product entry shipped.\nconst VERSION='56.37'", "// VERSION='56.35' compatibility marker for older navigation regressions.\n// V56.38 — products are a first-class admin domain, separate from people.\nconst VERSION='56.38'", 'nav version')
s = replace_once(s, "['products','المنتجات والأقسام','./admin-dashboard.html?section=employees&module=product_management']", "['products','المنتجات والأقسام','./admin-dashboard.html?section=products&module=product_management']", 'product route')
s = replace_once(s, "if(m==='product_management'||m==='categories'||m==='images'||m==='new_arrivals')return'products';return'employees'", "if(q.get('section')==='products'||m==='product_management'||m==='categories'||m==='images'||m==='new_arrivals')return'products';return'employees'", 'active product route')
s = replace_once(s, "s.src='./v54-admin-enhancements.js?v=56.37'", "s.src='./v54-admin-enhancements.js?v=56.38'", 'enhancement cache')
s = replace_once(s, "${['home','sales','employees'].map(k=>", "${['home','sales','employees','products'].map(k=>", 'mobile primary nav')
s = replace_once(s, "${['products','orders','stocktake','images','permissions','health'].includes(active())?'on':''}", "${['orders','stocktake','images','permissions','health'].includes(active())?'on':''}", 'more active state')
s = replace_once(s, "${links.filter(x=>['products','orders','stocktake','images','permissions','health'].includes(x[0])).map(x=>item(...x)).join('')}", "${links.filter(x=>['orders','stocktake','images','permissions','health'].includes(x[0])).map(x=>item(...x)).join('')}", 'remove products from more sheet')
old = "const sec=q.get('section')==='customers'?'customers':'employees',mod=q.get('module')||'live';let n=0,t=setInterval(()=>{const areaButton=document.querySelector(`#root [data-admin-area=\"${sec}\"]`);if(areaButton&&!areaButton.matches('[data-active=\"true\"]')){areaButton.click();return}const moduleButton=document.querySelector(`#root [data-admin-module=\"${mod}\"]`);"
new = "const raw=q.get('section'),sec=raw==='customers'?'customers':raw==='products'?'products':'employees',mod=q.get('module')||'live';let n=0,t=setInterval(()=>{const areaButton=sec==='products'?null:document.querySelector(`#root [data-admin-area=\"${sec}\"]`);if(areaButton&&!areaButton.matches('[data-active=\"true\"]')){areaButton.click();return}const moduleButton=document.querySelector(`#root [data-admin-module=\"${mod}\"]`);"
s = replace_once(s, old, new, 'route activation')
s = s.replace("window.__V56_37_ADMIN_SHELL=window.__V51_ADMIN_SHELL;", "window.__V56_37_ADMIN_SHELL=window.__V51_ADMIN_SHELL;window.__V56_38_ADMIN_SHELL=window.__V51_ADMIN_SHELL;")
p.write_text(s, encoding='utf-8')

# -----------------------------------------------------------------------------
# Enhancements: do not mark People active while inside Products.
# -----------------------------------------------------------------------------
p = FILES['enh']
s = p.read_text(encoding='utf-8')
s = replace_once(s, "const VERSION='56.37'", "const VERSION='56.38'", 'enhancement version')
s = replace_once(s, "l.href='./v54-1-desktop-canvas-fix.css?v=56.37'", "l.href='./v54-1-desktop-canvas-fix.css?v=56.38'", 'canvas cache')
old = "const dashboard=path==='admin-dashboard.html';\n const employeeLinks=[...document.querySelectorAll('[data-v52=\"employees\"],[data-v52-mobile=\"employees\"]')];"
new = "const dashboard=path==='admin-dashboard.html',section=new URLSearchParams(location.search).get('section');\n const employeeLinks=[...document.querySelectorAll('[data-v52=\"employees\"],[data-v52-mobile=\"employees\"]')];"
s = replace_once(s, old, new, 'people section awareness')
s = replace_once(s, "a.classList.toggle('on',dashboard&&!['product_management','categories','images','new_arrivals','orders'].includes(new URLSearchParams(location.search).get('module')))", "a.classList.toggle('on',dashboard&&section!=='products'&&!['orders'].includes(new URLSearchParams(location.search).get('module')))", 'people active state')
s = s.replace("window.__V56_37_EXECUTIVE_INTEGRATION=window.__V54_ADMIN_ENHANCEMENTS;", "window.__V56_37_EXECUTIVE_INTEGRATION=window.__V54_ADMIN_ENHANCEMENTS;window.__V56_38_EXECUTIVE_INTEGRATION=window.__V54_ADMIN_ENHANCEMENTS;")
p.write_text(s, encoding='utf-8')

# -----------------------------------------------------------------------------
# Desktop/mobile canvas: five mobile destinations (Home, Sales, People, Products, More).
# -----------------------------------------------------------------------------
p = FILES['css']
s = p.read_text(encoding='utf-8')
s = s.replace('/* V56.36 — desktop canvas now follows the CURRENT React root, while preserving V56.34 compatibility. */', '/* V56.38 — responsive executive canvas; Products is a dedicated mobile destination. */', 1)
s = replace_once(s, '#v52-mobile-nav[data-v56-unified-people="true"]{grid-template-columns:repeat(4,minmax(0,1fr))!important}', '#v52-mobile-nav[data-v56-unified-people="true"]{grid-template-columns:repeat(5,minmax(0,1fr))!important}', 'mobile five-column nav')
p.write_text(s, encoding='utf-8')

# Dedicated regression test.
test = Path('tests/v56-38-admin-ia.mjs')
test.write_text(r'''import fs from 'node:fs';
import assert from 'node:assert/strict';

const dashboard=fs.readFileSync('admin-dashboard.html','utf8');
const nav=fs.readFileSync('v46-admin-nav.js','utf8');
const enh=fs.readFileSync('v54-admin-enhancements.js','utf8');
const css=fs.readFileSync('v54-1-desktop-canvas-fix.css','utf8');

assert.ok(dashboard.includes("requestedSection==='products'||productModules.has(requestedModule)?'products'"),'legacy/current product routes must normalize to products area');
assert.ok(dashboard.includes('const productTabs=['),'products need their own tab model');
const employeeBlock=dashboard.match(/const employeeTabs=\[([\s\S]*?)\];\n  const customerTabs=/)?.[1]||'';
for(const forbidden of ["'product_management'","'images'","'new_arrivals'","'categories'"]) assert.ok(!employeeBlock.includes(forbidden),`employee tabs leaked ${forbidden}`);
const customerBlock=dashboard.match(/const customerTabs=\[([\s\S]*?)\];\n  const productTabs=/)?.[1]||'';
assert.ok(!customerBlock.includes("'images'"),'customer tabs must not carry product image management');
for(const required of ["['product_management','box','الرئيسية'","['images','image','مكتبة الصور'","['new_arrivals','box','جديدنا'","['categories','history','سجل التصنيفات'"]) assert.ok(dashboard.includes(required),`product tabs missing ${required}`);
assert.ok(dashboard.includes("area==='products'?'مركز إدارة المنتجات والأقسام'"),'products need their own header identity');
assert.ok(dashboard.includes("{area!=='products'&&<div className=\"px-4 py-3"),'people switch must not render inside product workspace');
assert.ok(dashboard.includes("area==='products'?productTabs:area==='employees'?employeeTabs:customerTabs"),'tabs must be domain-scoped');
assert.ok(dashboard.includes("if(area==='products'){switch(module)"),'product content must have a first-class domain branch');
assert.ok(dashboard.includes('./v46-admin-nav.js?v=56.38'),'dashboard must bust admin nav cache');

assert.ok(nav.includes("const VERSION='56.38'"),'nav version must be 56.38');
assert.ok(nav.includes("['products','المنتجات والأقسام','./admin-dashboard.html?section=products&module=product_management']"),'product nav must use section=products');
assert.ok(nav.includes("['home','sales','employees','products']"),'mobile bottom nav must expose products beside people');
assert.ok(!nav.includes("links.filter(x=>['products','orders'"),'products must not be duplicated inside More');
assert.ok(nav.includes("raw==='products'?'products':'employees'"),'route activation must understand products');

assert.ok(enh.includes("const VERSION='56.38'"),'enhancements must be 56.38');
assert.ok(enh.includes("section!=='products'"),'people active marker must not leak into products');
assert.ok(enh.includes('v54-1-desktop-canvas-fix.css?v=56.38'),'responsive CSS must be cache-busted');
assert.ok(css.includes('repeat(5,minmax(0,1fr))'),'mobile executive nav must use five columns');
assert.ok(!css.includes('data-v56-unified-people="true"]{grid-template-columns:repeat(4'),'stale four-column override must be gone');

for(const [name,text] of [['dashboard',dashboard],['nav',nav],['enh',enh],['css',css]]){
  assert.ok(!text.includes('<<<<<<<')&&!text.includes('>>>>>>>'),`${name} has merge markers`);
}
console.log('V56.38 admin information architecture regression: PASS');
''',encoding='utf-8')

print('V56.38 admin IA patch applied')
