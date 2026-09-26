export type PilotDepartment = "electronics" | "subscriptions" | "ai_assets";

export type PilotFulfillment = "physical" | "digital_code" | "service";

export type PilotIcon =
  | "headphones"
  | "charger"
  | "cable"
  | "phone-mount"
  | "dash-cam"
  | "entertainment"
  | "productivity"
  | "build"
  | "security"
  | "prompts"
  | "automation";

export interface PilotProduct {
  sku: string;
  slug: string;
  name: string;
  description: string;
  department: PilotDepartment;
  subcategory: string;
  fulfillment: PilotFulfillment;
  icon: PilotIcon;
  demandLabel: "طلب مرتفع" | "طلب متكرر" | "منتج واعد";
  sellable: false;
  price: null;
  reviewChecks: string[];
}

export const pilotDepartments: Array<{
  key: PilotDepartment;
  label: string;
  description: string;
}> = [
  {
    key: "electronics",
    label: "الإلكترونيات",
    description: "منتجات فعلية سريعة الدوران تحتاج موردًا وضمانًا وشحنًا معتمدًا.",
  },
  {
    key: "subscriptions",
    label: "الاشتراكات الرقمية",
    description: "أكواد أو تفعيل رقمي من مصدر رسمي مع شروط منطقة واسترجاع واضحة.",
  },
  {
    key: "ai_assets",
    label: "حلول الذكاء الصناعي",
    description: "قوالب وأوامر وحزم بناء وحماية تُسلّم كملف أو خدمة مرخّصة.",
  },
];

const sharedDigitalChecks = [
  "توثيق حق إعادة البيع أو التوزيع",
  "تحديد المنطقة ومدة الصلاحية",
  "اختبار التسليم بعد تأكيد الدفع",
];

export const catalogPilotProducts: PilotProduct[] = [
  {
    sku: "PILOT-ELEC-EARBUDS-ANC",
    slug: "pilot-earbuds-anc",
    name: "سماعات بلوتوث بعزل ضوضاء",
    description: "فئة مطلوبة للاستخدام اليومي والعمل والرياضة.",
    department: "electronics",
    subcategory: "الصوتيات",
    fulfillment: "physical",
    icon: "headphones",
    demandLabel: "طلب مرتفع",
    sellable: false,
    price: null,
    reviewChecks: ["اعتماد العلامة والمورد", "اختبار البطارية والميكروفون", "تحديد الضمان"],
  },
  {
    sku: "PILOT-ELEC-CHARGER-GAN-65W",
    slug: "pilot-gan-charger-65w",
    name: "شاحن GaN سريع 65W",
    description: "شاحن متعدد المنافذ مناسب للجوال والتابلت وبعض الحواسيب.",
    department: "electronics",
    subcategory: "الشحن والطاقة",
    fulfillment: "physical",
    icon: "charger",
    demandLabel: "طلب مرتفع",
    sellable: false,
    price: null,
    reviewChecks: ["اعتماد المطابقة السعودية", "اختبار الحماية الحرارية", "تحديد الكيبل المرفق"],
  },
  {
    sku: "PILOT-ELEC-CABLE-C2C-100W",
    slug: "pilot-usbc-cable-100w",
    name: "وصلة USB-C إلى USB-C 100W",
    description: "وصلة مضفّرة للشحن السريع ونقل البيانات.",
    department: "electronics",
    subcategory: "الوصلات",
    fulfillment: "physical",
    icon: "cable",
    demandLabel: "طلب متكرر",
    sellable: false,
    price: null,
    reviewChecks: ["اختبار القدرة الفعلية", "تحديد سرعة البيانات", "تحديد الطول والضمان"],
  },
  {
    sku: "PILOT-ELEC-CAR-MOUNT-MAG",
    slug: "pilot-magnetic-car-mount",
    name: "مثبت جوال مغناطيسي للسيارة",
    description: "مثبت عملي للرحلات والعمل اليومي داخل السيارة.",
    department: "electronics",
    subcategory: "إكسسوارات السيارة",
    fulfillment: "physical",
    icon: "phone-mount",
    demandLabel: "طلب متكرر",
    sellable: false,
    price: null,
    reviewChecks: ["اختبار قوة التثبيت", "تحديد الأجهزة المتوافقة", "اختبار حرارة المقصورة"],
  },
  {
    sku: "PILOT-ELEC-DASHCAM-2K",
    slug: "pilot-dashcam-2k-wifi",
    name: "داش كام 2K مع Wi-Fi",
    description: "كاميرا سيارة مع تسجيل حلقي وتطبيق جوال.",
    department: "electronics",
    subcategory: "كاميرات السيارة",
    fulfillment: "physical",
    icon: "dash-cam",
    demandLabel: "منتج واعد",
    sellable: false,
    price: null,
    reviewChecks: ["اختبار التصوير الليلي", "تحديد بطاقة الذاكرة", "مراجعة الخصوصية والضمان"],
  },
  {
    sku: "PILOT-SUB-ENTERTAINMENT-1M",
    slug: "pilot-entertainment-subscription-1m",
    name: "اشتراك ترفيه رقمي — شهر",
    description: "نموذج عام إلى أن يعتمد مزود رسمي ومنطقة التفعيل.",
    department: "subscriptions",
    subcategory: "الترفيه",
    fulfillment: "digital_code",
    icon: "entertainment",
    demandLabel: "طلب مرتفع",
    sellable: false,
    price: null,
    reviewChecks: [...sharedDigitalChecks],
  },
  {
    sku: "PILOT-SUB-PRODUCTIVITY-1M",
    slug: "pilot-productivity-subscription-1m",
    name: "اشتراك أدوات إنتاجية — شهر",
    description: "فئة للشركات والأفراد بعد توثيق الترخيص التجاري.",
    department: "subscriptions",
    subcategory: "الإنتاجية",
    fulfillment: "digital_code",
    icon: "productivity",
    demandLabel: "منتج واعد",
    sellable: false,
    price: null,
    reviewChecks: [...sharedDigitalChecks],
  },
  {
    sku: "PILOT-AI-BUILD-STORE",
    slug: "pilot-ai-store-builder-pack",
    name: "حزمة بناء متجر بالذكاء الصناعي",
    description: "قالب متطلبات وأوامر وهيكل صفحات واختبارات إطلاق.",
    department: "ai_assets",
    subcategory: "البناء والتطوير",
    fulfillment: "service",
    icon: "build",
    demandLabel: "منتج واعد",
    sellable: false,
    price: null,
    reviewChecks: ["تحديد نطاق الدعم", "إضافة ترخيص الاستخدام", "تجربة الملفات على مشروع نموذجي"],
  },
  {
    sku: "PILOT-AI-SECURITY-PACK",
    slug: "pilot-ai-security-review-pack",
    name: "حزمة حماية وفحص الإعدادات",
    description: "قوائم فحص وأوامر مراجعة للتهيئة والأسرار والصلاحيات.",
    department: "ai_assets",
    subcategory: "الحماية",
    fulfillment: "service",
    icon: "security",
    demandLabel: "طلب متكرر",
    sellable: false,
    price: null,
    reviewChecks: ["منع وعود الضمان المطلق", "مراجعة الأوامر الخطرة", "تحديد حدود المسؤولية"],
  },
  {
    sku: "PILOT-AI-PROMPTS-PRO",
    slug: "pilot-ai-prompts-library",
    name: "مكتبة أوامر احترافية",
    description: "أوامر عربية منظمة للتجارة والمحتوى وخدمة العملاء.",
    department: "ai_assets",
    subcategory: "الأوامر والقوالب",
    fulfillment: "service",
    icon: "prompts",
    demandLabel: "طلب مرتفع",
    sellable: false,
    price: null,
    reviewChecks: ["فحص جودة النتائج", "إضافة أمثلة تطبيقية", "تحديد سياسة التحديث"],
  },
  {
    sku: "PILOT-AI-AUTOMATION-AGENT",
    slug: "pilot-ai-automation-agent-template",
    name: "قالب وكيل أتمتة الأعمال",
    description: "مسار جاهز لربط النماذج والإشعارات والمهام المتكررة.",
    department: "ai_assets",
    subcategory: "الوكلاء والأتمتة",
    fulfillment: "service",
    icon: "automation",
    demandLabel: "منتج واعد",
    sellable: false,
    price: null,
    reviewChecks: ["تحديد الموصلات المدعومة", "اختبار الموافقات", "توثيق الإعداد والصيانة"],
  },
];

export function productsForDepartment(department: PilotDepartment | "all") {
  return department === "all"
    ? catalogPilotProducts
    : catalogPilotProducts.filter((product) => product.department === department);
}
