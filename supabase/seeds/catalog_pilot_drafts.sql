-- Optional catalog pilot seed for a non-production or review environment.
-- Every row is deliberately hidden from the public storefront.
-- Do not approve or activate a row until supplier, pricing, legal, and fulfillment checks pass.

begin;

insert into public.products (
  sku,
  slug,
  name_ar,
  name_en,
  category,
  description_ar,
  price,
  old_price,
  currency,
  region,
  platform,
  image_url,
  is_active,
  sort_order,
  fulfillment_type,
  lifecycle_status,
  block_reason
)
values
  ('PILOT-ELEC-EARBUDS-ANC', 'pilot-earbuds-anc', 'سماعات بلوتوث بعزل ضوضاء', 'ANC Bluetooth Earbuds', 'electronics_audio', 'مسودة اختبار: تعتمد بعد توثيق المورد والضمان.', 0, null, 'SAR', 'SA', null, null, false, 10, 'physical', 'needs_review', 'CATALOG_PILOT_NOT_FOR_SALE'),
  ('PILOT-ELEC-CHARGER-GAN-65W', 'pilot-gan-charger-65w', 'شاحن GaN سريع 65W', '65W GaN Charger', 'electronics_charging', 'مسودة اختبار: تعتمد بعد فحص المطابقة والحماية الحرارية.', 0, null, 'SAR', 'SA', null, null, false, 20, 'physical', 'needs_review', 'CATALOG_PILOT_NOT_FOR_SALE'),
  ('PILOT-ELEC-CABLE-C2C-100W', 'pilot-usbc-cable-100w', 'وصلة USB-C إلى USB-C 100W', 'USB-C to USB-C 100W Cable', 'electronics_cables', 'مسودة اختبار: تعتمد بعد اختبار القدرة وسرعة البيانات.', 0, null, 'SAR', 'SA', null, null, false, 30, 'physical', 'needs_review', 'CATALOG_PILOT_NOT_FOR_SALE'),
  ('PILOT-ELEC-CAR-MOUNT-MAG', 'pilot-magnetic-car-mount', 'مثبت جوال مغناطيسي للسيارة', 'Magnetic Car Phone Mount', 'electronics_car', 'مسودة اختبار: تعتمد بعد اختبار الثبات والتوافق.', 0, null, 'SAR', 'SA', null, null, false, 40, 'physical', 'needs_review', 'CATALOG_PILOT_NOT_FOR_SALE'),
  ('PILOT-ELEC-DASHCAM-2K', 'pilot-dashcam-2k-wifi', 'داش كام 2K مع Wi-Fi', '2K Wi-Fi Dash Cam', 'electronics_car', 'مسودة اختبار: تعتمد بعد اختبار التصوير والذاكرة والضمان.', 0, null, 'SAR', 'SA', null, null, false, 50, 'physical', 'needs_review', 'CATALOG_PILOT_NOT_FOR_SALE'),
  ('PILOT-SUB-ENTERTAINMENT-1M', 'pilot-entertainment-subscription-1m', 'اشتراك ترفيه رقمي — شهر', 'Entertainment Subscription — 1 Month', 'subscriptions', 'مسودة عامة إلى أن يعتمد مزود رسمي ومنطقة تفعيل.', 0, null, 'SAR', 'SA', null, null, false, 60, 'digital_code', 'needs_review', 'CATALOG_PILOT_NOT_FOR_SALE'),
  ('PILOT-SUB-PRODUCTIVITY-1M', 'pilot-productivity-subscription-1m', 'اشتراك أدوات إنتاجية — شهر', 'Productivity Subscription — 1 Month', 'subscriptions', 'مسودة عامة إلى أن يعتمد الترخيص التجاري.', 0, null, 'SAR', 'SA', null, null, false, 70, 'digital_code', 'needs_review', 'CATALOG_PILOT_NOT_FOR_SALE'),
  ('PILOT-AI-BUILD-STORE', 'pilot-ai-store-builder-pack', 'حزمة بناء متجر بالذكاء الصناعي', 'AI Store Builder Pack', 'ai_build', 'قالب متطلبات وأوامر وهيكل صفحات واختبارات إطلاق.', 0, null, 'SAR', 'SA', null, null, false, 80, 'service', 'needs_review', 'CATALOG_PILOT_NOT_FOR_SALE'),
  ('PILOT-AI-SECURITY-PACK', 'pilot-ai-security-review-pack', 'حزمة حماية وفحص الإعدادات', 'AI Security Review Pack', 'ai_security', 'قوائم فحص وأوامر مراجعة للتهيئة والأسرار والصلاحيات.', 0, null, 'SAR', 'SA', null, null, false, 90, 'service', 'needs_review', 'CATALOG_PILOT_NOT_FOR_SALE'),
  ('PILOT-AI-PROMPTS-PRO', 'pilot-ai-prompts-library', 'مكتبة أوامر احترافية', 'Professional Prompt Library', 'ai_prompts', 'أوامر عربية منظمة للتجارة والمحتوى وخدمة العملاء.', 0, null, 'SAR', 'SA', null, null, false, 100, 'service', 'needs_review', 'CATALOG_PILOT_NOT_FOR_SALE'),
  ('PILOT-AI-AUTOMATION-AGENT', 'pilot-ai-automation-agent-template', 'قالب وكيل أتمتة الأعمال', 'Business Automation Agent Template', 'ai_automation', 'مسار جاهز لربط النماذج والإشعارات والمهام المتكررة.', 0, null, 'SAR', 'SA', null, null, false, 110, 'service', 'needs_review', 'CATALOG_PILOT_NOT_FOR_SALE')
on conflict (slug) do nothing;

commit;
