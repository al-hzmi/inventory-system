from pathlib import Path

p=Path('customer.html')
s=p.read_text()

marker="    if(!html.includes(\"EMPLOYEE_CUSTOMER_ROUTE.get('employeeView')==='1'\")"
if marker not in s:
    raise SystemExit('V43_INSERT_MARKER')
if 'V43_CUSTOMER_UX' in s:
    print('V43_ALREADY_PRESENT')
    raise SystemExit(0)

block=r'''    // V43_CUSTOMER_UX: balanced navigation, explicit cart image gallery, device-bound customer history, and sequenced install prompt.
    const v43PersistMarker="const persistQuickCustomerProfile=p=>{try{localStorage.setItem(QUICK_CUSTOMER_PROFILE_KEY,JSON.stringify(p))}catch{}return p};";
    if(!html.includes(v43PersistMarker))throw new Error('V43_DEVICE_HELPER_MARKER');
    const v43PersistReplacement=v43PersistMarker+"\nconst CUSTOMER_DEVICE_ACCOUNT_LINK_KEY='batco_customer_device_account_v1';\nconst persistCustomerDeviceAccountLink=p=>{try{if(!p?.uid)return p;const d=customerDeviceInfo(),link={version:1,uid:String(p.uid),visitorId:String(p.visitorId||customerVisitorId||''),name:String(p.name||currentGuestName()||''),company:String(p.company||''),deviceId:String(d.deviceId||''),fingerprint:String(d.fingerprint||''),platform:String(d.platform||''),screen:String(d.screen||''),standalone:Boolean(d.standalone),timezone:String(d.timezone||''),savedAt:Date.now()};localStorage.setItem(CUSTOMER_DEVICE_ACCOUNT_LINK_KEY,JSON.stringify(link));return p}catch{return p}};\nconst currentCustomerDeviceAccountLink=()=>{try{return JSON.parse(localStorage.getItem(CUSTOMER_DEVICE_ACCOUNT_LINK_KEY)||'null')}catch{return null}};";
    html=html.replace(v43PersistMarker,v43PersistReplacement);

    const v43AppMarker="  const [quickProfile,setQuickProfile]=useState(()=>currentQuickCustomerProfile());\n";
    if(!html.includes(v43AppMarker))throw new Error('V43_APP_MARKER');
    html=html.replace(v43AppMarker,v43AppMarker+"  useEffect(()=>{const q=currentQuickCustomerProfile();if(q?.uid)persistCustomerDeviceAccountLink(q)},[]);\n");

    if(!html.includes("persistQuickCustomerProfile(next);setQuickProfile(next);"))throw new Error('V43_DEVICE_PERSIST_MARKER');
    html=html.replace("persistQuickCustomerProfile(next);setQuickProfile(next);","persistQuickCustomerProfile(next);persistCustomerDeviceAccountLink(next);setQuickProfile(next);");

    const v43OrderMarker="status:'submitted',accountType:guestMode?'passwordless_device':'legacy_account'};";
    if(!html.includes(v43OrderMarker))throw new Error('V43_ORDER_DEVICE_MARKER');
    html=html.replace(v43OrderMarker,"status:'submitted',accountType:guestMode?'passwordless_device':'legacy_account',deviceAccount:(()=>{const d=customerDeviceInfo();return {deviceId:d.deviceId||'',fingerprint:d.fingerprint||'',platform:d.platform||'',standalone:!!d.standalone}})()};");

    const cart43=String.raw`function CartView({cartItems,branches,onEdit,onRemove,onCheckout,onSaveDraft,savingDraft}){
  const [showImages,setShowImages]=useState(false);
  const totalCartons=sum(cartItems.map(i=>i.totalQty));
  const estimatedTotal=sum(cartItems.map(i=>(Number(i.cartonPrice)||0)*Number(i.totalQty||0)));
  if(!cartItems.length)return <Empty title="طلبك فارغ" note="أضف المنتجات من المعرض، ثم وزّع الكمية على الفروع." icon="cart"/>;
  return <div className="grid gap-4">
    <div className="bg-white border border-border rounded-16 p-4 grid gap-3">
      <div className="flex items-center justify-between gap-3"><div><div className="text-xs text-muted">ملخص طلب الشراء</div><b>{cartItems.length} صنف</b></div><div className="text-left"><div className="text-xs text-muted">إجمالي الكراتين</div><b className="ltr">{NF.format(totalCartons)}</b>{estimatedTotal>0&&<div className="text-[10px] text-accent font-bold ltr mt-1">≈ {PRICE_NF.format(estimatedTotal)} ر.س</div>}</div></div>
      <button type="button" onClick={()=>setShowImages(v=>!v)} aria-expanded={showImages} className="h-11 px-4 rounded-12 border border-border bg-surface text-primary text-xs font-bold flex items-center justify-center gap-2"><span aria-hidden="true" className="text-base">▦</span>{showImages?'إخفاء صور الأصناف':'عرض صور الأصناف'}</button>
    </div>
    {showImages&&<div data-testid="cart-image-gallery" className="bg-white border border-border rounded-16 p-3"><div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{cartItems.map(item=><div key={item.cleanId} className="border border-border rounded-12 overflow-hidden bg-white"><div className="aspect-square bg-surface"><ProductImage file={item.imageFile} alt={item.name} className="w-full h-full object-contain"/></div><div className="p-2"><div className="text-[9px] text-muted ltr truncate">{item.id}</div><div className="text-[10px] font-bold line-clamp-2 leading-4 mt-1">{item.name||'بدون اسم'}</div></div></div>)}</div></div>}
    {cartItems.map(item=><div key={item.cleanId} className="bg-white border border-border rounded-16 p-3"><div className="flex gap-3"><div className="w-20 h-20 rounded-12 overflow-hidden border border-border shrink-0 bg-surface"><ProductImage file={item.imageFile} alt={item.name} className="w-full h-full object-contain bg-surface"/></div><div className="min-w-0 flex-1"><div className="text-[11px] text-muted ltr">{item.id}</div><b className="text-sm line-clamp-2">{item.name}</b><div className="text-xs mt-2 flex flex-wrap gap-x-3 gap-y-1"><span>الإجمالي: <b className="ltr">{NF.format(item.totalQty)} كرتون</b></span>{Number(item.cartonPrice)>0&&<span>سعر الكرتون: <b className="ltr text-accent">{PRICE_NF.format(item.cartonPrice)} ر.س</b></span>}</div></div></div><div className="mt-3 bg-surface rounded-12 p-3 grid gap-2">{branches.filter(b=>(item.branchQuantities[b.id]||0)>0).map(b=><div key={b.id} className="flex items-center justify-between text-xs"><span>{b.name}</span><b className="ltr">{NF.format(item.branchQuantities[b.id])}</b></div>)}</div><div className="mt-3 grid grid-cols-2 gap-2"><button onClick={()=>onEdit(item)} className="h-10 rounded-10 border border-border text-xs font-bold flex items-center justify-center gap-2"><Icon name="edit" className="w-4 h-4"/>تعديل التوزيع</button><button onClick={()=>onRemove(item.cleanId)} className="h-10 rounded-10 border border-danger/20 bg-dangerSoft text-danger text-xs font-bold">إزالة</button></div></div>)}
    <div className="sticky bottom-[76px] bg-white/95 backdrop-blur border border-border rounded-16 p-3 shadow-lift grid grid-cols-2 gap-2"><button disabled={savingDraft} onClick={onSaveDraft} className="h-12 rounded-12 border border-border font-bold text-sm flex items-center justify-center gap-2">{savingDraft?<Spinner/>:<><Icon name="save" className="w-4 h-4"/>حفظ مسودة</>}</button><button onClick={onCheckout} className="h-12 rounded-12 bg-primary text-white font-bold text-sm">{EMPLOYEE_CUSTOMER_VIEW?'نقل ومتابعة الاعتماد':'متابعة الاعتماد'}</button></div>
  </div>
}

`;
    html=replaceBetween(html,"function CartView({cartItems,branches,onEdit,onRemove,onCheckout,onSaveDraft,savingDraft}){","function Checkout",cart43,'V43_CART');

    const v43NavOld='<nav className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-border safe-bottom"><div className="max-w-[700px] mx-auto grid grid-cols-5 px-1 pt-2">';
    const v43NavNew="<nav className=\"fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-border safe-bottom\"><div className={`max-w-[700px] mx-auto grid ${nav.length===3?'grid-cols-3':nav.length===4?'grid-cols-4':'grid-cols-5'} px-1 pt-2`}>";
    if(!html.includes(v43NavOld))throw new Error('V43_NAV_MARKER');
    html=html.replace(v43NavOld,v43NavNew);

    const v43InstallOld='{!EMPLOYEE_CUSTOMER_VIEW&&<InstallNudge/>}';
    const v43InstallNew="{!EMPLOYEE_CUSTOMER_VIEW&&String(guestName||safeProfile.name||'').trim()&&!showGuestNamePrompt&&<InstallNudge/>}";
    if(!html.includes(v43InstallOld))throw new Error('V43_INSTALL_MARKER');
    html=html.replace(v43InstallOld,v43InstallNew);

    if(!html.includes('cart-image-gallery')||!html.includes('عرض صور الأصناف')||!html.includes("nav.length===3?'grid-cols-3'")||!html.includes('CUSTOMER_DEVICE_ACCOUNT_LINK_KEY')||!html.includes('persistCustomerDeviceAccountLink(next)')||!html.includes('deviceAccount:')||!html.includes("String(guestName||safeProfile.name||'').trim()&&!showGuestNamePrompt&&<InstallNudge/>"))throw new Error('V43_OUTPUT_CHECK');
'''

s=s.replace(marker,block+marker,1)
p.write_text(s)
print('V43_PATCHED')
