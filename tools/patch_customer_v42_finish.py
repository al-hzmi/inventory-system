from pathlib import Path
p=Path('customer.html')
s=p.read_text()
marker="    if(!html.includes('QUICK_CUSTOMER_PROFILE_KEY')"
if marker not in s:
    raise SystemExit('V42_FINISH_MARKER')
if 'V42_FINISH: post-checkout consistency' not in s:
    block=r'''    // V42_FINISH: post-checkout consistency for passwordless customers.
    html=html.replace("persistQuickCustomerProfile(next);setQuickProfile(next);return next;","persistQuickCustomerProfile(next);setQuickProfile(next);await Promise.allSettled([touchCustomerSession(null,next,'quick_account_ready'),logCustomerEvent(null,'quick_account_ready',cleanCompany,{company:cleanCompany})]);return next;");
    html=html.replace("setSubmittedOrder(null);setCheckout(false);setPage('orders');","setSubmittedOrder(null);setCheckout(false);setPage(guestMode?'home':'orders');");
    html=html.replace("تم تسجيل الطلب داخل حسابك. الآن يمكنك فتح واتساب وإرسال نسخة منه، ويمكنك الرجوع له لاحقًا من «طلباتي».","تم تسجيل الطلب وحفظ بياناتك على هذا الجهاز تلقائيًا. يمكنك الآن فتح واتساب وإرسال نسخة منه.");
    if(!html.includes("setPage(guestMode?'home':'orders')")||!html.includes("quick_account_ready")||html.includes("يمكنك الرجوع له لاحقًا من «طلباتي»"))throw new Error('V42_FINISH_OUTPUT_CHECK');
'''
    s=s.replace(marker,block+marker,1)
# العميل لا يحتاج أن يرى مفهوم الحساب أو تسجيل الدخول في المسار المبسط.
s=s.replace("هذه المعلومة الوحيدة المطلوبة. سيتم إنشاء حسابك وحفظه تلقائيًا على هذا الجهاز بدون كلمة مرور.","هذه المعلومة الوحيدة المطلوبة. سيتم حفظها تلقائيًا على هذا الجهاز لتسهيل طلباتك القادمة.")
s=s.replace("لتبسيط الطلب، اعتمد الطلب مباشرة. سيتم حفظ حسابك تلقائيًا بدون تسجيل دخول.","لتبسيط الطلب، اعتمد الطلب مباشرة. سيتم حفظ بياناتك تلقائيًا على هذا الجهاز.")
s=s.replace("تم تسجيل الطلب وربطه بحسابك المحفوظ على هذا الجهاز. يمكنك الآن فتح واتساب وإرسال نسخة منه.","تم تسجيل الطلب وحفظ بياناتك على هذا الجهاز تلقائيًا. يمكنك الآن فتح واتساب وإرسال نسخة منه.")
p.write_text(s)
print('V42_FINISH_PATCHED')
