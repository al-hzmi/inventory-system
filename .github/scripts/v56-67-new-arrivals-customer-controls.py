#!/usr/bin/env python3
from pathlib import Path

ADMIN = Path('admin-dashboard.html')
text = ADMIN.read_text(encoding='utf-8')


def replace_once(src, old, new, label):
    if new in src:
        return src
    if old not in src:
        raise SystemExit(f'V56.67 anchor not found: {label}')
    return src.replace(old, new, 1)

# Make the customer-navigation destination describe everything it controls.
text = replace_once(
    text,
    "['portal','settings','تشغيل البوابة','الوصول والتسجيل',control.enabled?0:1],",
    "['portal','settings','البوابة وجديدنا','الوصول والتسجيل وظهور جديدنا',control.enabled?0:1],",
    'customer module label',
)
text = replace_once(
    text,
    "['portal','settings','تشغيل البوابة',control.enabled?null:'!'],",
    "['portal','settings','البوابة وجديدنا',control.enabled?null:'!'],",
    'customer tab label',
)

# Make the product hub explicit that this area also controls customer visibility.
text = replace_once(
    text,
    "tile('box','إدارة «جديدنا»','مراجعة الأصناف الجديدة وجاهزية الصورة والسعر والقسم.',()=>setTab('new_arrivals'),'جديدنا')",
    "tile('box','إدارة «جديدنا»','مراجعة الأصناف الجديدة وجاهزية الصورة والسعر والقسم، والتحكم في ظهور القسم للعملاء.',()=>setTab('new_arrivals'),'جديدنا')",
    'product hub new arrivals tile',
)

# Put the global customer-visibility control where an admin naturally expects it:
# directly inside the New Arrivals manager. Existing PortalControlCard remains the
# canonical secondary location, and both write the same Firestore field through
# saveControl so there is no duplicated state model.
anchor = "return <div className=\"grid gap-4\"><section className=\"bg-white border border-border rounded-2xl p-5 shadow-card\"><div className=\"text-[10px] text-accent font-bold\">مراقبة آخر 30 يومًا</div>"
replacement = "return <div className=\"grid gap-4\"><section data-new-arrivals-customer-control=\"1\" className=\"bg-white border border-accent/25 rounded-2xl p-5 shadow-card\"><div className=\"flex flex-col sm:flex-row sm:items-start justify-between gap-4\"><div><div className=\"text-[10px] text-accent font-bold\">ظهور العملاء</div><h2 className=\"text-lg font-bold mt-1\">عرض «جديدنا» للعملاء</h2><p className=\"text-[11px] text-secondary mt-2 leading-5\">هذا هو الإعداد العام الذي يبحث عنه المسؤول. العملاء المضبوطون على «يتبع العام» يلتزمون به، بينما تبقى الاستثناءات الفردية محفوظة.</p></div><Pill tone={control.showNewArrivals!==false?'ok':'bad'}>{control.showNewArrivals!==false?'الإعداد العام: ظاهر':'الإعداد العام: مخفي'}</Pill></div><div className=\"mt-4 pt-1 border-t border-border\"><Toggle checked={control.showNewArrivals!==false} onChange={v=>saveControl({showNewArrivals:v})} disabled={busy} label=\"إعداد العرض العام لـ«جديدنا»\" note=\"فعّله ليظهر القسم لكل عميل يتبع الإعداد العام، أو أوقفه لإخفائه عنهم دون حذف أي صنف.\"/></div><div className=\"flex flex-wrap gap-2 mt-3\"><button onClick={()=>openArea('customers','accounts')} className=\"h-10 px-4 rounded-xl border border-border bg-white text-[10px] font-bold text-secondary press\">استثناءات العملاء</button><button onClick={()=>openArea('customers','portal')} className=\"h-10 px-4 rounded-xl border border-border bg-white text-[10px] font-bold text-secondary press\">إعدادات البوابة</button><button onClick={()=>{localStorage.setItem(PREVIEW_KEY,'admin-preview');window.open('./customer.html?employeeView=1','_blank')}} className=\"h-10 px-4 rounded-xl bg-primary text-white text-[10px] font-bold press\">معاينة العملاء</button></div></section><section className=\"bg-white border border-border rounded-2xl p-5 shadow-card\"><div className=\"text-[10px] text-accent font-bold\">مراقبة آخر 30 يومًا</div>"
text = replace_once(text, anchor, replacement, 'new arrivals customer visibility card')

# Guard against accidental destructive patch output.
for bad in ('<<<<<<<', '>>>>>>>', '... (truncated)'):
    if bad in text:
        raise SystemExit(f'V56.67 refused to write invalid marker: {bad}')

ADMIN.write_text(text, encoding='utf-8')
print('V56.67 admin New Arrivals customer controls applied')
