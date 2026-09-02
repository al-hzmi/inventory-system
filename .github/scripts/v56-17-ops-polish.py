from pathlib import Path
import re

def rd(p): return Path(p).read_text()
def wr(p,s): Path(p).write_text(s)

p='health-center.html'; s=rd(p)
s=s.replace("missingImage:[...u.keys()].filter(x=>!im.has(x)).length,","imageCount:im.size,")
s=s.replace("if(S.data.missingImage)S.alerts.push({t:'أصناف بلا صورة',d:num(S.data.missingImage)+' صنف'})","")
s=s.replace("${k('بلا صورة',num(d.missingImage),d.missingImage?'تحتاج مراجعة':'مكتملة')}","${k('صور مفهرسة',num(d.imageCount),'ملفات الصور المسجلة')}")
if 'missingImage' in s or 'بلا صورة' in s: raise SystemExit('health image cleanup failed')
wr(p,s)

p='admin-stocktake.html'; s=rd(p)
for a,b in [
 ('<h3>منظور المحاسب</h3>','<h3>متابعة الجرد</h3>'),
 ('معاينة منظور المحاسب','معاينة متابعة الجرد'),
 ('حفظ صلاحية المحاسب','حفظ صلاحية المتابعة'),
 ("toast(enabled?'تم حفظ حسابات المحاسب':'تم إخفاء منظور المحاسب')","toast(enabled?'تم حفظ صلاحية متابعة الجرد':'تم إخفاء متابعة الجرد')"),
 ('./stocktake-accountant.html?preview=1&v=56.12','./stocktake-accountant.html?preview=1&v=56.17'),
 ('stocktake_test_cleanup_v5612','stocktake_test_cleanup_v5617'),
 ("version:'56.12'","version:'56.17'")
]: s=s.replace(a,b)
if 'setTimeout(cleanupLegacyTestsOnce' not in s:
    anchor="}start();\nlet selectedId="
    if anchor not in s: raise SystemExit('cleanup start anchor missing')
    s=s.replace(anchor,"}start();setTimeout(cleanupLegacyTestsOnce,900);\nlet selectedId=",1)
if 'v56-17-modal-scroll-guard' not in s:
    css=('<style id="v56-17-modal-scroll-guard">\n'
         'html:has(.modalbg.open),body:has(.modalbg.open){overflow:hidden!important;overscroll-behavior:none!important}\n'
         '.modalbg.open{overscroll-behavior:none!important;touch-action:none}\n'
         '.modalbg.open .modal{overscroll-behavior-y:contain!important;-webkit-overflow-scrolling:touch;touch-action:pan-y}\n'
         '</style>\n')
    s=s.replace('</head>',css+'</head>',1)
if 'id="testCount"' in s: raise SystemExit('test sample selector still exists')
if 'function pickTestInventoryRows(rows)' not in s or 'for(let x=0;x<rows.length;x+=350)' not in s: raise SystemExit('full inventory test not present')
wr(p,s)

p='stocktake-accountant.html'; s=rd(p)
s=s.replace('<div class="sub">منظور المحاسب · قراءة فقط</div>','<div class="sub">متابعة الجرد</div>')
s=s.replace("${preview&&user.isAdmin?'معاينة مهند':'قراءة فقط'}","${preview&&user.isAdmin?'معاينة مهند':'متابعة'}")
s=s.replace("صلاحية المحاسب يحددها مهند من إدارة الجرد.","صلاحية متابعة الجرد يحددها مهند من إدارة الجرد.")
s=s.replace('<span class="view">قراءة فقط</span>','<span class="view">متابعة</span>')
if 'منظور المحاسب · قراءة فقط' in s: raise SystemExit('old accountant phrase remains')
wr(p,s)

p='runtime/index-v37-source.txt'; s=rd(p)
s=re.sub(r"\./stocktake-accountant\.html\?v=\d+\.\d+","./stocktake-accountant.html?v=56.17",s)
wr(p,s)

p='admin-dashboard.html'; s=rd(p)
pat=r"// V56\.10 — iOS-safe modal scroll lock\..*?const useBodyScrollLock=\(\)=>\{useEffect\(\(\)=>\{.*?\},\[\]\)\};"
m=re.search(pat,s,re.S)
if not m: raise SystemExit('old scroll lock missing')
new_lock=(
"// V56.17 — systemic modal scroll isolation for mobile + desktop.\n"
"const useBodyScrollLock=()=>{useEffect(()=>{\n"
"  const w=window,body=document.body,html=document.documentElement;\n"
"  let lock=w.__BATCO_BODY_SCROLL_LOCK;\n"
"  if(!lock){lock=w.__BATCO_BODY_SCROLL_LOCK={count:0,y:0,body:{},htmlOverflow:'',roots:[]}}\n"
"  if(lock.count===0){\n"
"    lock.y=window.scrollY||window.pageYOffset||0;\n"
"    lock.body={position:body.style.position,top:body.style.top,left:body.style.left,right:body.style.right,width:body.style.width,overflow:body.style.overflow,overscrollBehavior:body.style.overscrollBehavior};\n"
"    lock.htmlOverflow=html.style.overflow;\n"
"    lock.roots=[...document.querySelectorAll('[data-admin-scroll-root]')].map(el=>({el,top:el.scrollTop,overflow:el.style.overflow,overflowY:el.style.overflowY,overscrollBehavior:el.style.overscrollBehavior}));\n"
"    body.style.position='fixed';body.style.top=`-${lock.y}px`;body.style.left='0';body.style.right='0';body.style.width='100%';body.style.overflow='hidden';body.style.overscrollBehavior='none';html.style.overflow='hidden';\n"
"    lock.roots.forEach(x=>{x.el.style.overflow='hidden';x.el.style.overflowY='hidden';x.el.style.overscrollBehavior='none'});\n"
"  }\n"
"  lock.count+=1;\n"
"  return()=>{const active=w.__BATCO_BODY_SCROLL_LOCK;if(!active)return;active.count=Math.max(0,active.count-1);if(active.count===0){Object.assign(body.style,active.body);html.style.overflow=active.htmlOverflow||'';(active.roots||[]).forEach(x=>{x.el.style.overflow=x.overflow;x.el.style.overflowY=x.overflowY;x.el.style.overscrollBehavior=x.overscrollBehavior;x.el.scrollTop=x.top});const y=active.y||0;delete w.__BATCO_BODY_SCROLL_LOCK;requestAnimationFrame(()=>window.scrollTo(0,y))}};\n"
"},[])};"
)
s=s[:m.start()]+new_lock+s[m.end():]
s=s.replace(".admin-message-sheet{max-height:min(92dvh,760px);min-height:0;touch-action:pan-y}",".admin-message-sheet{height:min(92dvh,760px);max-height:min(92dvh,760px);min-height:0;touch-action:pan-y;overscroll-behavior:none}")
s=s.replace("max-height:calc(100dvh - max(10px,env(safe-area-inset-top)))!important;border-radius:22px 22px 0 0!important","height:calc(100dvh - max(10px,env(safe-area-inset-top)))!important;max-height:calc(100dvh - max(10px,env(safe-area-inset-top)))!important;border-radius:22px 22px 0 0!important")
old='<><TabsBar/><ToolBar/><div className="flex-1 overflow-y-auto p-3 sm:p-4 bg-surface"><ActiveContent/></div></>'
new='<><TabsBar/><ToolBar/><div data-admin-scroll-root="1" className="flex-1 overflow-y-auto p-3 sm:p-4 bg-surface"><ActiveContent/></div></>'
if old not in s: raise SystemExit('main admin scroll root anchor missing')
s=s.replace(old,new,1)
def hook(sig,repl):
    global s
    if repl in s: return
    if sig not in s: raise SystemExit('missing modal '+sig)
    s=s.replace(sig,repl,1)
hook('function DetailDrawer({row,onClose}){','function DetailDrawer({row,onClose,onCustomerMessage}){\n  useBodyScrollLock();')
hook('function EmployeeAccountEditor({value,onClose,onSaved}){','function EmployeeAccountEditor({value,onClose,onSaved}){\n  useBodyScrollLock();')
hook('function EmployeeMergeModal({source,accounts,onClose,onSaved}){','function EmployeeMergeModal({source,accounts,onClose,onSaved}){\n  useBodyScrollLock();')
hook('function CustomerManagerModal({customer,devices=[],busy=false,onClose,onSave,onNewArrivals,onStatus,onDelete,onRestore,onDeviceStatus,onDeviceDelete}){','function CustomerManagerModal({customer,devices=[],busy=false,onClose,onSave,onNewArrivals,onStatus,onDelete,onRestore,onDeviceStatus,onDeviceDelete}){\n  useBodyScrollLock();')
s=s.replace('w-full sm:max-w-[720px] max-h-[94dvh] bg-white rounded-t-[24px]','w-full sm:max-w-[720px] h-[94dvh] max-h-[94dvh] bg-white rounded-t-[24px]',1)
old="onClick={()=>c.id?setCustomerManager(c):(String(s.name||'').trim()?setCustomerMessageTarget({kind:'guest',customerUid:'',visitorId:s.visitorId||'',name:s.name||'',company:''}):setDetail(s))}"
new="onClick={()=>c.id?setCustomerManager(c):setDetail({...s,__collection:'customer_guest_presence',identityType:'guest',displayName:title,stage,lastAction:actionText})}"
if old not in s: raise SystemExit('guest click anchor missing')
s=s.replace(old,new,1)
anchor="const title=row.company||row.name||row.customer?.company||row.orderNo||row.invoiceNo||row.draftNo||row.id||'التفاصيل';"
if anchor not in s: raise SystemExit('detail title anchor missing')
s=s.replace(anchor,anchor+"\n  const guestMessageTarget=row.__collection==='customer_guest_presence'&&row.visitorId?{kind:'guest',customerUid:'',visitorId:row.visitorId,name:row.name||row.displayName||'',company:row.company||''}:null;",1)
close='<button onClick={onClose} className="w-10 h-10 rounded-xl border border-border flex items-center justify-center bg-white"><Icon name="x" className="w-4 h-4"/></button>'
close2='<div className="flex items-center gap-2">{guestMessageTarget&&<button onClick={()=>onCustomerMessage?.(guestMessageTarget)} className="h-10 px-3 rounded-xl bg-infoSoft text-info border border-info/10 text-[10px] font-bold">إرسال رسالة</button>}<button onClick={onClose} className="w-10 h-10 rounded-xl border border-border flex items-center justify-center bg-white"><Icon name="x" className="w-4 h-4"/></button></div>'
if close not in s: raise SystemExit('detail close anchor missing')
s=s.replace(close,close2,1)
old='<DetailDrawer row={detail} onClose={()=>setDetail(null)}/>'
new='<DetailDrawer row={detail} onClose={()=>setDetail(null)} onCustomerMessage={target=>{setDetail(null);setCustomerMessageTarget(target)}}/>'
if old not in s: raise SystemExit('detail render anchor missing')
s=s.replace(old,new,1)
if 'all overlay surfaces keep wheel/touch scroll' not in s:
    css='\n/* V56.17 — all overlay surfaces keep wheel/touch scroll inside themselves. */\n.fixed.inset-0{overscroll-behavior:none}\n.fixed.inset-0 [class*="overflow-y-auto"]{overscroll-behavior-y:contain;-webkit-overflow-scrolling:touch}\n'
    s=s.replace('</style>',css+'</style>',1)
wr(p,s)

p='customer.html'; s=rd(p)
s=re.sub(r"const CORE='\./runtime/customer-v37-source\.txt\?v=\d+\.\d+';","const CORE='./runtime/customer-v37-source.txt?v=56.17';",s,1)
guard="if(employeeName&&params.get('employeeView')!=='1'){location.replace('./index.html?employee=1');return}"
if guard not in s: raise SystemExit('customer guard missing')
if 'batco_employee_onboarding_notice_v1' not in s:
    patch=("\n  const routeGuestName=(()=>{try{return String(localStorage.getItem('customer_guest_name_v1')||'').trim()}catch{return''}})();" "\n  const routeQuickProfile=(()=>{try{return JSON.parse(localStorage.getItem('batco_quick_customer_profile_v1')||'null')}catch{return null}})();" "\n  const routeNormName=value=>String(value||'').toLowerCase().replace(/[\\u064B-\\u065F\\u0670]/g,'').replace(/\\u0640/g,'').replace(/[أإآٱ]/g,'ا').replace(/[ىئ]/g,'ي').replace(/ؤ/g,'و').replace(/ة/g,'ه').replace(/\\s+/g,' ').trim();" "\n  if(!employeeName&&params.get('employeeView')!=='1'&&!routeQuickProfile?.uid&&routeNormName(routeGuestName)==='هارون'){try{sessionStorage.setItem('batco_employee_onboarding_notice_v1','haroon')}catch{}location.replace('./index.html?employee=1&onboard=haroon');return;}")
    s=s.replace(guard,guard+patch,1)
wr(p,s)

p='index.html'; s=rd(p)
s=re.sub(r"const CORE='\./runtime/index-v37-source\.txt\?v=\d+\.\d+';","const CORE='./runtime/index-v37-source.txt?v=56.17';",s,1)
anchor="const employeeName=(()=>{try{return String(localStorage.getItem('inventory_user_name_v2')||'').trim()}catch{return''}})();"
if anchor not in s: raise SystemExit('employee bootstrap anchor missing')
if 'const onboardHaroon=' not in s:
    s=s.replace(anchor,anchor+"\n  const onboardHaroon=(()=>{try{return new URLSearchParams(location.search).get('onboard')==='haroon'||sessionStorage.getItem('batco_employee_onboarding_notice_v1')==='haroon'}catch{return false}})();",1)
final="html=html.replace('</body>','<script src=\"./v44-observability.js?v=44.0\"></scr'+'ipt><script src=\"./v48-auth-security.js?v=55.1\"></scr'+'ipt></body>');"
if final not in s: raise SystemExit('final injection anchor missing')
if 'هارون — دخول الموظفين' not in s:
    banner=("if(onboardHaroon&&!employeeName){html=html.replace('</body>'," "'<div style=\"position:fixed;z-index:999999;top:max(14px,env(safe-area-inset-top));left:50%;transform:translateX(-50%);width:min(92vw,520px);background:#1c1917;color:#fff;border-radius:18px;padding:15px 18px;text-align:center;font:700 14px/1.8 system-ui,-apple-system,Segoe UI,sans-serif;box-shadow:0 18px 50px rgba(0,0,0,.24)\"><b>هارون — دخول الموظفين</b><br><span style=\"font-weight:500;color:#e7e5e4\">أكمل دخولك من قسم الموظفين، أنشئ رمز الدخول ثم نفّذ تصوير التحقق مرة واحدة.</span></div></body>');}\n    ")
    s=s.replace(final,banner+final,1)
wr(p,s)

Path('tests/v56-17-ops-polish.mjs').write_text("""import fs from 'node:fs';\nimport assert from 'node:assert/strict';\nconst health=fs.readFileSync('health-center.html','utf8'),admin=fs.readFileSync('admin-dashboard.html','utf8'),stock=fs.readFileSync('admin-stocktake.html','utf8'),acct=fs.readFileSync('stocktake-accountant.html','utf8'),cust=fs.readFileSync('customer.html','utf8'),idx=fs.readFileSync('index.html','utf8'),runtime=fs.readFileSync('runtime/index-v37-source.txt','utf8');\nassert.ok(health.includes('صور مفهرسة')&&!health.includes('missingImage'));\nassert.ok(stock.includes('<h3>متابعة الجرد</h3>')&&!stock.includes('معاينة منظور المحاسب'));\nassert.ok(!stock.includes('id=\"testCount\"')&&stock.includes('function pickTestInventoryRows(rows)')&&stock.includes('for(let x=0;x<rows.length;x+=350)'));\nassert.ok(stock.includes('stocktake_test_cleanup_v5617')&&stock.includes('setTimeout(cleanupLegacyTestsOnce,900)')&&stock.includes('v56-17-modal-scroll-guard'));\nassert.ok(!acct.includes('منظور المحاسب · قراءة فقط')&&acct.includes('<div class=\"sub\">متابعة الجرد</div>')&&!acct.includes('data-save='));\nassert.ok(admin.includes('data-admin-scroll-root=\"1\"')&&admin.includes(\"document.querySelectorAll('[data-admin-scroll-root]')\")&&admin.includes('height:min(92dvh,760px)'));\nassert.ok((admin.match(/useBodyScrollLock\\(\\);/g)||[]).length>=6&&admin.includes('customer_guest_presence')&&admin.includes('onCustomerMessage={target=>'));\nassert.ok(cust.includes(\"customer_guest_name_v1\")&&cust.includes(\"==='هارون'\")&&cust.includes('onboard=haroon'));\nassert.ok(idx.includes('onboardHaroon')&&idx.includes('هارون — دخول الموظفين')&&idx.includes(\"index-v37-source.txt?v=56.17\"));\nassert.ok(cust.includes(\"customer-v37-source.txt?v=56.17\")&&runtime.includes('./stocktake-accountant.html?v=56.17'));\nconsole.log('V56.17 operations polish regression: OK');\n""")
print('V56.17 patch applied')