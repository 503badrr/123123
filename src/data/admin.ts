export const kpis = [
  { label: "إيرادات اليوم", value: "12,480 ر.س", delta: "+18%", tone: "up" as const },
  { label: "طلبات اليوم", value: "342", delta: "+9%", tone: "up" as const },
  { label: "عملاء نشطون", value: "1,284", delta: "+24", tone: "up" as const },
  { label: "متوسط السلة", value: "78 ر.س", delta: "-3%", tone: "down" as const },
];

export const revenueSeries = [
  { day: "السبت", value: 8200 },
  { day: "الأحد", value: 9450 },
  { day: "الإثنين", value: 11200 },
  { day: "الثلاثاء", value: 10800 },
  { day: "الأربعاء", value: 13950 },
  { day: "الخميس", value: 15400 },
  { day: "الجمعة", value: 17820 },
];

export const categorySplit = [
  { name: "الألعاب", value: 48 },
  { name: "البطاقات", value: 27 },
  { name: "الاشتراكات", value: 18 },
  { name: "العروض", value: 7 },
];

export const ordersQueue = [
  { id: "SW-104821", customer: "محمد العتيبي", item: "شدات ببجي 660", total: "39 ر.س", status: "بانتظار التسليم" },
  { id: "SW-104820", customer: "نورة الزهراني", item: "اشتراك Netflix", total: "39 ر.س", status: "بانتظار التسليم" },
  { id: "SW-104819", customer: "سعد القحطاني", item: "PSN 100", total: "109 ر.س", status: "قيد المراجعة" },
  { id: "SW-104818", customer: "ريم الدوسري", item: "Spotify 3 شهور", total: "79 ر.س", status: "مكتمل" },
  { id: "SW-104817", customer: "خالد الشمري", item: "حزمة اللاعب المحترف", total: "199 ر.س", status: "مكتمل" },
];

export const financeRows = [
  { date: "2026-06-25", type: "إيراد", channel: "Apple Pay", amount: "+12,480 ر.س" },
  { date: "2026-06-24", type: "إيراد", channel: "مدى", amount: "+9,820 ر.س" },
  { date: "2026-06-24", type: "مصروف", channel: "تكاليف موردين", amount: "-3,210 ر.س" },
  { date: "2026-06-23", type: "إيراد", channel: "STC Pay", amount: "+6,540 ر.س" },
  { date: "2026-06-23", type: "مصروف", channel: "حملة تسويق", amount: "-1,500 ر.س" },
];

export const securityLog = [
  { time: "قبل 4 دقائق", event: "تسجيل دخول ناجح للوحة المالك", ip: "94.45.x.x", level: "info" as const },
  { time: "قبل 22 دقيقة", event: "محاولة دخول فاشلة (كلمة مرور خاطئة)", ip: "188.51.x.x", level: "warn" as const },
  { time: "قبل ساعة", event: "تفعيل التحقق بخطوتين لحساب موظف", ip: "—", level: "info" as const },
  { time: "اليوم 09:14", event: "حظر مؤقت لـ IP بعد 5 محاولات فاشلة", ip: "37.218.x.x", level: "danger" as const },
  { time: "أمس 23:02", event: "نسخة احتياطية يومية اكتملت بنجاح", ip: "—", level: "info" as const },
];

export const integrations = [
  { name: "Telr", desc: "استقبال Webhook آمن وتحديث الطلبات والمدفوعات تلقائيًا.", status: "جاهز للضبط" },
  { name: "بوابة مدى", desc: "ربط الدفع المحلي عبر مدى.", status: "قريبًا" },
  { name: "Apple Pay", desc: "دفع سريع بنقرة واحدة على iOS.", status: "قريبًا" },
  { name: "STC Pay", desc: "محفظة STC Pay للعملاء السعوديين.", status: "قريبًا" },
  { name: "WhatsApp Business", desc: "إشعارات الطلبات عبر واتساب.", status: "قريبًا" },
  { name: "Zoho Books", desc: "مزامنة الفواتير والمحاسبة.", status: "قريبًا" },
  { name: "Google Analytics", desc: "تتبع زوار وأداء المتجر.", status: "قريبًا" },
];
