/* BATCO customer-facing catalog localization. No product or order data is mutated. */
(function (global, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (global) {
    global.BatcoCustomerLocale = api;
    api.apply(api.initial(), false);
  }
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';
  const STORAGE_KEY = 'batco_customer_showroom_language_v1';
  const EN = {
  "صنف في السلة": "items in cart",
  "كرتون": "cartons",
  "صنف": "items",
  "صنف · اسحب لاستعراض المنتجات": "items · swipe to browse",
  "— المطلوب ": "— Requested: ",
  "، الحد المسموح حاليًا ": "; current limit: ",
  " يوم متبقي": " days left",
  " ر.س": " SAR",
  "(اختياري)": "Optional",
  "© 2026 تطوير مهند الحزمي": "© 2026 Developed by Mohanad Al-Hazmi",
  "ابحث برقم الصنف أو اسمه في جميع الأقسام...": "Search all categories by item code or product name...",
  "ابدأ خلال أقل من دقيقة": "Get started in under a minute",
  "إجمالي الصنف": "Item Total",
  "إجمالي الكراتين": "Total Cartons",
  "احفظ فرعك مرة واحدة، وبعدها يظهر تلقائيًا في كل طلب.": "Save your branch once and use it for future orders.",
  "احفظه جيدًا؛ ستستخدمه إذا دخلت من جهاز آخر.": "Keep it safe. You'll need it to sign in on another device.",
  "اختر القسم أولًا لعرض محتواه بصورة مباشرة ومنظمة.": "Select a category to browse its products.",
  "اختيار سريع إذا عندك موقع واحد أو ما تحتاج تسميته الآن.": "Quick option for a single location or an unnamed branch.",
  "أدخل رقم الجوال ورمز الدخول.": "Enter your mobile number and access PIN.",
  "إذا نسيت رمز الدخول، تواصل مع الإدارة لإعادة تعيينه.": "Forgot your PIN? Contact BATCO to reset it.",
  "إرسال الطلب عبر واتساب": "Share Order via WhatsApp",
  "إزالة": "Remove",
  "استكمال": "Continue",
  "اسحب للتصفح ←": "Swipe to browse →",
  "اسم الشركة / المؤسسة": "Company / Organization",
  "اسم الفرع": "Branch Name",
  "اسمك الكريم": "Your Name",
  "إضافة": "Add",
  "إضافة البوابة للشاشة الرئيسية": "Add to Home Screen",
  "إضافة فرع": "Add Branch",
  "إضافة فرع باسم مخصص": "Name a Branch",
  "إضافة للطلب": "Add to Order",
  "أضف البوابة كتطبيق": "Install the Catalog App",
  "أضف المنتجات من المعرض، ثم وزّع الكمية على الفروع.": "Add products from the catalog, then assign quantities to branches.",
  "اعتماد سريع": "Quick Submit",
  "اعتماد طلب الشراء": "Review Order",
  "اعتماد وإرسال الطلب": "Submit Order",
  "إغلاق": "Close",
  "اكتب اسم الجهة": "Enter company name",
  "اكتب اسم الفرع": "Enter branch name",
  "اكتب اسمك الكريم": "Enter your name",
  "اكتب اسمك مرة واحدة فقط، وسيُحفظ على هذا الجهاز لتسهيل التصفح والطلبات لاحقًا.": "Enter your name once. We'll remember it on this device for future orders.",
  "اكتب الاسم الذي تستخدمه لهذا الفرع.": "Enter the name you use for this branch.",
  "اكتب تعليمات الشحن أو الاستلام المطلوبة...": "Add shipping or collection instructions...",
  "اكتب طريقة الشحن أو الاستلام وأي تعليمات مهمة.": "Include delivery or collection details and any important instructions.",
  "الإجمالي:": "Total:",
  "الاسم": "Name",
  "الأصناف": "Items",
  "الأقسام": "Categories",
  "الانتقال إلى طلباتي": "View My Orders",
  "البحث عن صنف": "Search Products",
  "التحقق يستغرق لحظة فقط، وبعدها تدخل مباشرة ونحفظ اسمك في خطوة سريعة.": "Verification takes a moment. Then you can access the catalog.",
  "التقاط والمتابعة": "Capture and Continue",
  "التواصل مع المطور عبر واتساب": "Contact Developer on WhatsApp",
  "الحبة تقريبًا:": "Approx. per Piece:",
  "الخدمة متوقفة مؤقتًا": "The Catalog Is Temporarily Unavailable",
  "الرمز الجديد": "New PIN",
  "الرمز الحالي": "Current PIN",
  "السعر التقريبي للحبة": "Approx. Price per Piece",
  "الشد:": "Pack Size:",
  "الطلبات المرسلة": "Submitted Orders",
  "العميل": "Customer",
  "العودة للسلة": "Back to Cart",
  "العودة لنظام الموظفين": "Back to Employee Portal",
  "الفرع": "Branch",
  "الفروع": "Branches",
  "القيمة التقريبية": "Estimated Value",
  "الكراتين": "Cartons",
  "المسودات": "Drafts",
  "المعرض الرقمي": "Product Catalog",
  "الموظفين": "Employees",
  "أنشئ رمز دخول من 6 أرقام": "Create a 6-Digit PIN",
  "إنشاء حساب جديد": "Create an Account",
  "أهلًا بعودتك": "Welcome Back",
  "أهلًا وسهلًا 👋": "Welcome 👋",
  "أول إضافة للطلب": "First Item Added",
  "باقي خطوة سريعة واحدة لحفظ طلباتك باسمك.": "One quick step to save orders under your name.",
  "بعد 5 ثوانٍ من التصفح": "After a Moment of Browsing",
  "بوابة العملاء": "Customer Portal",
  "بوابة العملاء · جزء من منظومة": "Customer Portal · Part of",
  "بيانات الحساب، الفروع، ورمز الدخول.": "Manage your account, branches, and PIN.",
  "تأكيد الحضور": "Identity Verification",
  "تأكيد الرمز الجديد": "Confirm New PIN",
  "تُحفظ لقطة التحقق في السجل الأمني للإدارة فقط. لا نطلب رمشة أو حركة رأس أو أي اختبار إضافي.": "Your verification photo is kept in the administrative security record. No additional gestures are required.",
  "تحقق سريع ومتابعة": "Verify and Continue",
  "تحميل بوابة BATCO": "Loading BATCO Catalog",
  "تُستخدم لتوزيع كميات كل منتج داخل الطلب.": "Use branches to allocate each product's order quantity.",
  "تسجيل الخروج": "Sign Out",
  "تسجيل الدخول": "Sign In",
  "تصفح القسم": "Browse Category",
  "تصفّح المنتجات حسب القسم، أو ابحث عن صنف بعينه.": "Browse by category or search for a specific product.",
  "تصفح المنتجات، جهّز طلبك، ووزّعه على فروعك بسهولة.": "Browse products, prepare an order, and allocate items to your branches.",
  "تطوير مهند الحزمي": "Developed by Mohanad Al-Hazmi",
  "تعديل التوزيع": "Edit Allocation",
  "تعذر فتح بوابة العملاء بأمان.": "Unable to Open the Customer Catalog",
  "تغير الحد المسموح لبعض الأصناف": "Availability Has Changed for Some Items",
  "تغيير PIN المكون من 6 أرقام": "Change 6-Digit PIN",
  "تم": "Done",
  "تم الدخول بنجاح": "Signed In Successfully",
  "تم حفظ الطلب بنجاح": "Order Submitted Successfully",
  "جاري التحقق من حالة البوابة...": "Checking Catalog Availability...",
  "جاري تجهيز البوابة...": "Preparing the Catalog...",
  "جديد": "New",
  "جديدنا": "New Arrivals",
  "جرّب رقم صنف آخر أو اسمًا مختلفًا.": "Try another item code or a different product name.",
  "جزء من منظومة": "Part of",
  "حساب جديد": "New Account",
  "حسابي": "My Account",
  "حفظ الفروع": "Save Branches",
  "حفظ كمسودة": "Save as Draft",
  "حفظ مسودة": "Save Draft",
  "حفظ ومتابعة": "Save and Continue",
  "خطوة أخيرة": "Final Step",
  "خطوة سريعة": "Quick Step",
  "خلّ وجهك ظاهر أمام الكاميرا للحظة": "Keep Your Face in View Briefly",
  "دخول الموظفين": "Employee Sign-In",
  "دخول إلى المعرض": "Open Product Catalog",
  "راجع الكميات قبل الإرسال": "Review Quantities Before Submitting",
  "راجع الكميات؛ تغير المتاح لبعض الأصناف.": "Review your quantities. Availability has changed for some items.",
  "رجوع": "Back",
  "رسالة من الإدارة": "Message from BATCO",
  "رقم الجوال": "Mobile Number",
  "رقم الطلب": "Order Number",
  "رقم الهاتف": "Phone Number",
  "رمز الدخول": "Access PIN",
  "سجل اسمك للمتابعة": "Enter Your Name to Continue",
  "سعر الكرتون": "Carton Price",
  "سعر الكرتون:": "Carton Price:",
  "شركة بيت الأواني الطيبة": "BATCO — Bayt Al-Awani Al-Tayyibah",
  "ضمن": "Within",
  "ضمن منظومة": "Part of",
  "طلب الشراء": "Purchase Request",
  "طلباتي": "My Orders",
  "طلبك فارغ": "Your Cart Is Empty",
  "طلبك محفوظ ولن يضيع": "Your Order Is Saved",
  "عدّل الكمية بنصف كرتون ووزّعها على فروعك بدون كتابة يدوية.": "Adjust quantities in half-carton steps and allocate them to your branches.",
  "عرض القسم": "View Category",
  "عرض المزيد": "Show More",
  "غالبًا يتم الالتقاط تلقائيًا فورًا. وإذا جهازك ما تعرّف على الوجه، يظهر لك زر متابعة بدون تعقيد.": "Capture usually happens automatically. If your camera cannot detect your face, you can continue manually.",
  "فتح القسم": "Open Category",
  "فتح واتساب يجهز نص الطلب تلقائيًا. الإرسال النهائي يتم من داخل واتساب حتى يختار العميل المحادثة المناسبة.": "WhatsApp opens with a prepared order message. You choose the recipient and send it yourself.",
  "فروع الشركة": "Company Branches",
  "قد تكون المنتجات بانتظار إضافة صور أو تحديث التصنيف.": "Products may be awaiting images or category updates.",
  "كل الأقسام": "All Categories",
  "كل الطلبات المرسلة والمسودات المحفوظة في مكان واحد.": "Find submitted orders and saved drafts in one place.",
  "لا توجد فروع محفوظة بعد. أضف أول فرع الآن أو عند أول منتج.": "No branches saved yet. Add one now or when selecting a product.",
  "لا توجد منتجات في هذا القسم": "No Products in This Category",
  "لا توجد منتجات متاحة الآن": "No Products Available",
  "لا توجد منتجات مطابقة": "No Matching Products",
  "لدي حساب": "I Have an Account",
  "لقطة سريعة للحماية": "Quick Security Check",
  "لن نطلب بياناتك إلا عند حفظ المسودة أو إرسال الطلب.": "We'll request your details only when you save or submit an order.",
  "متابعة الاعتماد": "Review and Submit",
  "متابعة تصفح المعرض": "Continue Browsing",
  "مراجعة الطلب": "Review Order",
  "مرحبًا": "Welcome",
  "معاينة الإدارة — البوابة متوقفة للعامة": "Admin Preview — Catalog Unavailable to Public",
  "ملاحظات الطلب": "Order Notes",
  "ملاحظة": "Note",
  "ملخص طلب الشراء": "Order Summary",
  "من زر المشاركة في المتصفح اختر «إضافة إلى الشاشة الرئيسية».": "Use your browser's Share button and select Add to Home Screen.",
  "نتائج البحث": "Search Results",
  "نحتاج ثلاث معلومات فقط. الاسم والفروع نأخذها لاحقًا بدون تعطيلك.": "We only need three details to get started. You can add your name and branches later.",
  "نحفظ الاسم على هذا الجهاز لتسهيل إعداد الطلب لاحقًا.": "We save your name on this device to simplify future orders.",
  "هذه المعلومة الوحيدة المطلوبة. سيتم حفظها تلقائيًا على هذا الجهاز لتسهيل طلباتك القادمة.": "This is the only detail needed. It will be saved on this device for your next order.",
  "واتساب": "WhatsApp",
  "وزّع الكمية المطلوبة على فروعك": "Allocate quantities to your branches",
  "وصل حديثًا": "Just Arrived",
  "وصول أسرع من الشاشة الرئيسية.": "Access the catalog faster from your home screen.",
  "وين تبي نجهز هذا المنتج؟": "Which Branch Should Receive This Product?",
  "يُستخدم لتسجيل الدخول فقط، ولا نرسل رسائل SMS.": "Used for sign-in only. We do not send SMS messages.",
  "الرئيسية": "Home",
  "السلة": "Cart",
  "تصفح مباشر": "Guest Browsing",
  "عميل": "Customer",
  "تم التقاط الصورة بنجاح": "Photo Captured Successfully",
  "تعذر التقاط الصورة. حاول مرة أخرى.": "Unable to capture the photo. Please try again.",
  "ممتاز، تم العثور على الوجه": "Face Detected",
  "خلّ وجهك ظاهر أمام الكاميرا": "Keep your face visible to the camera",
  "اكتب اسمك الكريم للمتابعة.": "Enter your name to continue.",
  "تعذر حفظ الاسم الآن. حاول مرة أخرى.": "Unable to save your name. Please try again.",
  "لا توجد طلبات بعد": "No Orders Yet",
  "لا توجد مسودات": "No Saved Drafts",
  "التفاصيل": "Details",
  "تعذر حفظ المسودة. لم نفقد محتويات السلة، ويمكنك المحاولة مرة أخرى.": "Could not save the draft. Your cart is intact; please try again.",
  "الملاحظات إلزامية قبل اعتماد الطلب.": "Please add order notes before submitting.",
  "السلة فارغة. لم يتم إنشاء أي طلب.": "Your cart is empty. No order was created.",
  "تغير الحد المسموح لبعض الأصناف. السلة محفوظة؛ عدّل الكميات ثم أعد الاعتماد.": "Availability has changed for some items. Your cart is saved; adjust the quantities and retry.",
  "تعذر اعتماد الطلب. السلة والفاتورة لم تُحذف؛ تحقق من الاتصال وحاول مجددًا.": "We couldn't submit the order. Your cart remains intact. Check your connection and try again.",
  "تم حذف المسودة.": "Draft Deleted",
  "تعذر حذف المسودة.": "Unable to Delete Draft",
  "تم تحميل المسودة إلى السلة.": "Draft Restored to Cart",
  "تحديث الفروع": "Update Branches",
  "تم تحديث أسماء الفروع.": "Branch Names Updated",
  "تم تغيير رمز الدخول": "Access PIN Changed",
  "تم تغيير رمز الدخول بنجاح.": "Your access PIN has been changed.",
  "رمز الدخول الحالي غير صحيح.": "Current PIN Is Incorrect",
  "محاولات كثيرة. انتظر قليلًا ثم حاول مجددًا.": "Too many attempts. Please try again later.",
  "تعذر تغيير رمز الدخول الآن.": "Unable to change the PIN right now.",
  "جاري تشغيل الكاميرا...": "Starting Camera...",
  "القائمة": "Menu",
  "العرض الشبكي": "Grid View",
  "عرض القائمة": "List View",
  "ملاحظات:": "Notes:",
  "تم إعداد الطلب عبر بوابة عملاء بيت الأواني الطيبة.": "Prepared through the BATCO Customer Portal.",
  "تسجيل خروج": "Sign Out",
  "نقل ومتابعة الاعتماد": "Transfer and Review",
  "السلة فارغة. أضف أصنافًا أولاً ثم تابع الاعتماد.": "Your cart is empty. Add products before proceeding.",
  "تعذر نقل السلة إلى نظام الموظفين. السلة ما زالت محفوظة هنا ولم يتم حذفها.": "Unable to transfer the cart to the employee portal. Your cart remains saved here.",
  "اكتب اسم الشركة أو المؤسسة للمتابعة.": "Enter your company name to continue.",
  "تعذر اعتماد الطلب. السلة لم تُحذف؛ حاول مرة أخرى.": "Unable to submit your order. Your cart is still saved; please try again.",
  "تعذر اعتماد الطلب. السلة لم تُحذف؛ تحقق من الاتصال وحاول مرة أخرى.": "Unable to submit your order. Your cart is intact. Check your connection and try again.",
  "لا توجد نتائج": "No Results",
  "الكمية": "Quantity",
  "إضافة للسلة": "Add to Cart",
  "إزالة من السلة": "Remove from Cart",
  "حفظ في السلة": "Save to Cart",
  "الفرع الرئيسي": "Main Branch",
  "تم تسجيل الطلب وحفظ بياناتك على هذا الجهاز تلقائيًا. يمكنك الآن فتح واتساب وإرسال نسخة منه.": "Your order has been recorded, and your details were saved on this device. You can share a copy via WhatsApp.",
  "عرض صور الأصناف": "Show Product Images",
  "إخفاء صور الأصناف": "Hide Product Images",
  "بوابة عملاء بيت الأواني الطيبة": "BATCO Customer Portal",
  "المنتجات": "Products",
  "العودة للتسوق": "Continue Shopping",
  "إضافة إلى السلة": "Add to Cart",
  "الطلب": "Order",
  "أي تعليمات إضافية...": "Any additional instructions...",
  "اكتب اسم الشركة أو المؤسسة": "Enter your company or organization name",
  "أسماء الفروع غير مكتملة.": "Please complete all branch names.",
  "أسماء الفروع يجب أن تكون مختلفة.": "Each branch must have a unique name.",
  "اختر رمزًا جديدًا مختلفًا.": "Choose a different PIN.",
  "اسمح باستخدام الكاميرا لإكمال التسجيل.": "Allow camera access to complete registration.",
  "اكتب اسم الشركة أو المؤسسة.": "Enter your company or organization name.",
  "اكتب اسم الفرع بشكل واضح.": "Enter a clear branch name.",
  "الحد الأعلى 20 فرعًا.": "You can add up to 20 branches.",
  "الحساب موجود في المصادقة لكن ملف العميل غير مكتمل. تواصل مع الإدارة.": "This account is registered but its customer profile is incomplete. Contact BATCO.",
  "السلة فارغة.": "Your cart is empty.",
  "الكاميرا جاهزة — اضغط التقاط والمتابعة": "Camera ready — tap Capture and Continue",
  "تأكيد الرمز الجديد غير مطابق.": "New PIN confirmation does not match.",
  "تحقق من رقم الجوال وحاول مرة أخرى.": "Check your mobile number and try again.",
  "تحقق من رقم الجوال.": "Check your mobile number.",
  "تعذر الاتصال بخدمة تسجيل الدخول. تحقق من الشبكة وحاول مرة أخرى.": "Could not connect to sign-in. Check your connection and try again.",
  "تعذر تحميل بيانات المعرض.": "Unable to load the product catalog.",
  "تعذر تحميل حساب العميل.": "Unable to load your account.",
  "تعذر تشغيل الكاميرا على هذا الجهاز.": "Could not start the camera on this device.",
  "تعذر حفظ الفرع. حاول مرة أخرى.": "Unable to save the branch. Please try again.",
  "تغير المتاح لبعض الأصناف. عدّل الكمية ثم أعد الاعتماد.": "Availability changed for some items. Adjust quantities and try again.",
  "تم إيقاف المحاولات مؤقتًا للحماية. حاول بعد قليل.": "Sign-in attempts have been temporarily limited. Please try again later.",
  "تم إيقاف المحاولات مؤقتًا. حاول بعد 15 دقيقة.": "Too many attempts. Please try again in 15 minutes.",
  "تم تحديث طلب المنتج.": "Item quantity updated.",
  "خدمة تسجيل الدخول غير مفعّلة حاليًا.": "Sign-in is currently unavailable.",
  "رقم الجوال أو رمز الدخول غير صحيح.": "Incorrect mobile number or PIN.",
  "رمز الدخول يجب أن يتكون من 6 أرقام.": "Your PIN must contain six digits.",
  "رمز الدخول يجب أن يكون 6 أرقام.": "Your PIN must be six digits.",
  "لتبسيط الطلب، اعتمد الطلب مباشرة. سيتم حفظ بياناتك تلقائيًا على هذا الجهاز.": "Submit the order directly. Your details will be saved on this device.",
  "لم يتم العثور على كاميرا أمامية.": "No front-facing camera was found.",
  "هذا الجهاز غير مصرح له بالدخول إلى الحساب. تواصل مع الإدارة.": "This device is not authorized for this account. Contact BATCO.",
  "هذا الحساب لم يعد متاحًا. تواصل مع الإدارة عند الحاجة.": "This account is no longer available. Contact BATCO if you need assistance.",
  "هذا الحساب موقوف حاليًا. تواصل مع الإدارة.": "This account is currently suspended. Contact BATCO.",
  "يجب أن يكون الرمز الحالي والجديد 6 أرقام.": "The current and new PINs must both contain six digits.",
  "يوجد حساب مسجل بهذا الرقم بالفعل. اختر «لدي حساب».": "An account already exists for this number. Select I Have an Account.",
  "خدمة إنشاء الحسابات غير مفعّلة في Firebase. فعّل Email/Password من Authentication ثم حاول مرة أخرى.": "Account registration is temporarily unavailable. Contact BATCO support.",
  "تعذر تجهيز معرّف الحساب الداخلي. تم تصحيح هذه المشكلة في النسخة الجديدة؛ حدّث الصفحة وحاول مرة أخرى.": "Unable to prepare the account identifier. Refresh and try again.",
  "رمز الدخول غير مقبول حسب سياسة Firebase الحالية. استخدم 6 أرقام مختلفة مؤقتًا أو راجع سياسة كلمات المرور.": "The PIN does not meet the current security requirements. Try a different six-digit PIN.",
  "تعذر الوصول إلى خدمة الحسابات الآن. تحقق من الاتصال ثم حاول مرة أخرى.": "Account services are unavailable. Check your connection and try again.",
  "تم إيقاف إنشاء الحسابات مؤقتًا بسبب كثرة المحاولات. انتظر قليلًا ثم حاول مرة أخرى.": "Account creation is temporarily limited. Please try again later.",
  "نطاق الموقع غير مصرح له في Firebase Authentication. أضف نطاق Vercel ضمن Authorized domains.": "Sign-in is unavailable for this domain. Contact BATCO support.",
  "تم إنشاء بيانات الدخول، لكن قواعد Firestore تمنع إنشاء ملف العميل. يلزم السماح لمجموعة customers للمستخدم المسجل.": "Your sign-in details were created, but the customer profile could not be saved. Contact BATCO support.",
  "إعداد قاعدة البيانات غير مكتمل لهذه العملية. راجع Firestore ثم أعد المحاولة.": "This service is not configured correctly. Contact BATCO support.",
  "نجح إنشاء بيانات الدخول لكن تعذر حفظ ملف العميل في قاعدة البيانات.": "Sign-in details were created, but the customer profile could not be saved.",
  "تعذر إنشاء الحساب بسبب إعداد تقني غير متوقع.": "Unable to create the account due to a technical issue.",
  "وتعذر تنظيف حساب المصادقة تلقائيًا؛ راجع Firebase Authentication.": "Automatic account cleanup failed. Contact BATCO support.",
  "راجع Firebase Authentication قبل إعادة المحاولة.": "Contact BATCO support before trying again."
};
  const AR = Object.freeze(Object.fromEntries(Object.keys(EN).map(key => [key, key])));
  const dictionaries = Object.freeze({ ar: AR, en: EN });
  let active = 'ar';

  function initial() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'ar' || stored === 'en') return stored;
    } catch (_) {}
    const device = String(
      (typeof navigator !== 'undefined' && (navigator.languages?.[0] || navigator.language)) || ''
    ).toLowerCase();
    return device === 'en' || device.startsWith('en-') ? 'en' : 'ar';
  }

  function apply(locale, persist = false) {
    active = locale === 'en' ? 'en' : 'ar';
    if (persist) {
      try { localStorage.setItem(STORAGE_KEY, active); } catch (_) {}
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = active;
      document.documentElement.dir = active === 'ar' ? 'rtl' : 'ltr';
      document.title = active === 'en' ? 'BATCO | Product Catalog' : 'بوابة عملاء بيت الأواني الطيبة';
    }
    return active;
  }

  const patterns = [
    [/^(\d[\d,.\s]*) صنف في السلة$/, '$1 items in cart'],
    [/^(\d[\d,.\s]*) صنف · اسحب لاستعراض المنتجات$/, '$1 items · swipe to browse'],
    [/^(\d[\d,.\s]*) صنف$/, '$1 items'],
    [/^(\d[\d,.\s]*) كرتون$/, '$1 cartons'],
    [/^منتجات (.+)$/, 'Products in $1'],
    [/^قسم (.+)$/, '$1 category'],
    [/^عرض صورة (.+)$/, 'View image of $1'],
    [/^إضافة (.+) للسلة$/, 'Add $1 to cart'],
    [/^ابحث داخل (.+)\.\.\.$/, 'Search within $1...'],
    [/^تم الوصول للحد الأقصى المسموح لهذا الصنف: (.+) كرتون\.$/, 'Maximum permitted quantity: $1 cartons.'],
    [/^تم حفظ (.+) كمسودة\.$/, 'Draft $1 saved.'],
    [/^سيظهر في طلبات (.+)\.$/, 'This name will appear on orders for $1.'],
    [/ ر\.س$/, ' SAR'],
  ];

  function text(value) {
    if (active !== 'en' || typeof value !== 'string') return value;
    if (Object.prototype.hasOwnProperty.call(EN, value)) return EN[value];
    const leading = value.match(/^\s*/)?.[0] || '';
    const trailing = value.match(/\s*$/)?.[0] || '';
    const core = value.trim();
    if (Object.prototype.hasOwnProperty.call(EN, core)) return leading + EN[core] + trailing;
    const codeAt = core.indexOf(' (رمز: ');
    if (codeAt > 0 && Object.prototype.hasOwnProperty.call(EN, core.slice(0,codeAt))) {
      const translated = EN[core.slice(0,codeAt)];
      const detail = core.slice(codeAt).replace(' (رمز: ', ' (Code: ')
        .replace(' وتعذر تنظيف حساب المصادقة تلقائيًا؛ راجع Firebase Authentication.', ' Automatic account cleanup failed. Contact BATCO support.')
        .replace(' راجع Firebase Authentication قبل إعادة المحاولة.', ' Contact BATCO support before trying again.');
      return leading + translated + detail + trailing;
    }
    for (const [pattern, replacement] of patterns) {
      if (pattern.test(core)) return leading + core.replace(pattern, replacement) + trailing;
    }
    return value;
  }

  function babelPlugin({ types: t }) {
    const arabic = /[\u0600-\u06FF]/;
    const displayIdentifiers = new Set(['label', 'error', 'globalError', 'pinError', 'status', 'employeeViewNotice']);
    const uiAttrs = new Set(['placeholder', 'title', 'aria-label', 'aria-description', 'label', 'hint', 'note']);
    const call = node => t.callExpression(t.identifier('customerUiText'), [node]);
    const localizeBranch = node => {
      if (t.isStringLiteral(node) && arabic.test(node.value)) return call(node);
      if (t.isTemplateLiteral(node) && node.quasis.some(q => arabic.test(q.value.cooked || ''))) return call(node);
      if (t.isBinaryExpression(node) && [node.left, node.right].some(x => t.isStringLiteral(x) && arabic.test(x.value))) return call(node);
      return node;
    };
    return {
      name: 'batco-customer-ui-locale',
      visitor: {
        JSXText(path) {
          const original = path.node.value;
          if (!arabic.test(original)) return;
          const middle = original.replace(/\s+/g, ' ').trim();
          if (!middle) return;
          const prefix = /^\s/.test(original) ? ' ' : '';
          const suffix = /\s$/.test(original) ? ' ' : '';
          path.replaceWith(t.jsxExpressionContainer(call(t.stringLiteral(prefix + middle + suffix))));
        },
        JSXAttribute(path) {
          const name = path.node.name?.name;
          const value = path.node.value;
          if (uiAttrs.has(name) && t.isStringLiteral(value) && arabic.test(value.value)) {
            path.node.value = t.jsxExpressionContainer(call(value));
          }
          if (name === 'aria-label' && t.isJSXExpressionContainer(value) &&
              t.isBinaryExpression(value.expression) &&
              value.expression.operator === '+' &&
              t.isStringLiteral(value.expression.left) && arabic.test(value.expression.left.value)) {
            value.expression = call(value.expression);
          }
        },
        JSXExpressionContainer(path) {
          if (path.parentPath.isJSXAttribute()) return;
          const expr = path.node.expression;
          if (t.isIdentifier(expr) && displayIdentifiers.has(expr.name)) {
            path.node.expression = call(expr);
          } else if (t.isMemberExpression(expr) &&
              t.isIdentifier(expr.object, { name: 'toast' }) &&
              t.isIdentifier(expr.property, { name: 'message' })) {
            path.node.expression = call(expr);
          } else if (t.isStringLiteral(expr) && arabic.test(expr.value)) {
            path.node.expression = call(expr);
          } else if (t.isTemplateLiteral(expr) && expr.quasis.some(q => arabic.test(q.value.cooked || ''))) {
            path.node.expression = call(expr);
          } else if (t.isBinaryExpression(expr) && t.isStringLiteral(expr.left) && arabic.test(expr.left.value)) {
            path.node.expression = call(expr);
          } else if (t.isConditionalExpression(expr)) {
            expr.consequent = localizeBranch(expr.consequent);
            expr.alternate = localizeBranch(expr.alternate);
          } else if (t.isLogicalExpression(expr) && [expr.left,expr.right].some(x => t.isIdentifier(x) && displayIdentifiers.has(x.name))) {
            path.node.expression = call(expr);
          }
        },
        CallExpression(path) {
          const callee = path.node.callee;
          if (!t.isMemberExpression(callee) || !t.isIdentifier(callee.object, { name: 'window' })) return;
          if (!t.isIdentifier(callee.property) || !['alert', 'confirm'].includes(callee.property.name)) return;
          const first = path.node.arguments[0];
          if (t.isStringLiteral(first) && arabic.test(first.value)) path.node.arguments[0] = call(first);
        }
      }
    };
  }

  return { STORAGE_KEY, dictionaries, initial, apply, text, babelPlugin, get locale() { return active; } };
});
