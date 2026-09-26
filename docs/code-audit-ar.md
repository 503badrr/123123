# تقرير مراجعة جودة الكود والأمان والأداء لمتجر Switch

تاريخ المراجعة: 2026-08-05

## النطاق والمنهجية

تمت مراجعة بنية تطبيق React/TypeScript/TanStack Router، تكامل Supabase، مسارات المصادقة والإدارة، وظائف الدفع ومعالجات Webhooks، وملفات SQL الخاصة بـ RLS والمعالجة الذرية للطلبات. الهدف من هذا التقرير هو ترتيب المخاطر والتحسينات حسب الأولوية مع أمثلة تعديل قابلة للتطبيق.

## ملخص تنفيذي

المشروع يملك أساسًا أمنيًا جيدًا في طبقة الدفع: يتم توحيد Webhooks عبر معالج واحد، والتحقق من التوقيعات/الأسرار قبل تحديث قاعدة البيانات، وتنفذ قاعدة البيانات معالجة ذرية للحدث مع قفل الطلب والتحقق من المبلغ والعملة. كما أن مسارات الإدارة محمية بتحقق من المستخدم ثم RPC للأدوار، وRLS مفعلة على الجداول الحساسة.

أعلى الأولويات المقترحة هي:

1. نقل حراسة المسارات الحساسة من حراسة عميل فقط إلى حراسة خادمية أو وظيفة خادمية مشتركة لتجنب الاعتماد على `ssr: false` وحده.
2. تقليل استخدام `any` في وظائف الإدارة والخادم وربطها بأنواع Supabase المولدة.
3. إضافة اختبارات Webhook موحدة لكل مزود وليس Tap فقط، خاصة سيناريوهات التكرار، اختلاف المبلغ/العملة، والأحداث غير المكتملة.
4. فصل إعدادات الاستضافة القديمة الخاصة بـ Vercel من مسارات بناء عناوين العودة لتفادي الالتباس التشغيلي في Cloudflare.
5. تحسين أداء صفحات الكتالوج والمنتجات عبر caching/query stale time وتجميع الاستعلامات المتكررة.

## P0 — نقاط تتطلب معالجة قبل التوسع أو الإطلاق عالي المخاطر

### 1. حراسة المسارات الحساسة تعتمد على تعطيل SSR والتحقق من العميل

**الملاحظة:** مسار `_authenticated` يستخدم `ssr: false` ثم يستدعي `supabase.auth.getUser()` من عميل المتصفح قبل السماح بالوصول، ومسار `/admin` يتبع النمط نفسه مع RPC `is_admin`. هذا مناسب كحراسة تجربة مستخدم، لكنه لا يغني عن حراسة خادمية موحدة لكل عمليات البيانات الحساسة، خصوصًا أن أي صفحة إدارية مستقبلية قد تضيف `loader` أو وظيفة خادمية وتنسى middleware.

**الأثر:** خطر تسريب واجهة أو بيانات route loader مستقبلًا إذا أضيفت استدعاءات server-side قبل الحراسة، وصعوبة إثبات أن كل عمليات الإدارة تمر عبر middleware موحد.

**الإيجابيات الحالية:** وظائف الإدارة الخادمية تستدعي `requireSupabaseAuth` ثم `assertStaff` قبل استخدام `supabaseAdmin`، وهذا يقلل خطر تجاوز RLS داخل وظائف الإدارة.

**مثال تحسين مقترح:**

```ts
// src/lib/authz.server.ts
import { redirect } from "@tanstack/react-router";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export async function requireAdminContext(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("is_admin");
  if (error || !data) throw redirect({ to: "/" });
  return { userId: context.userId, isAdmin: true };
}
```

ثم اجعل كل وظائف الإدارة تستدعي helper موحدًا بدل تكرار `assertStaff`، وأضف اختبارًا يضمن أن ملفات `src/lib/admin.functions.ts` لا تصدر أي handler دون `.middleware([requireSupabaseAuth])`.

### 2. استخدام `any` واسع في وظائف الإدارة يقلل ضمانات TypeScript

**الملاحظة:** `src/lib/admin.functions.ts` يحول Supabase context وadmin client إلى `any` في عدة مواضع. هذا يخفي أخطاء أسماء الجداول/الأعمدة ويقلل قيمة `src/integrations/supabase/types.ts`.

**الأثر:** احتمالية أخطاء runtime عند تغيير schema أو refactor، وصعوبة معرفة شكل الصفوف في reduce/map.

**مثال تحسين مقترح:**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type Db = SupabaseClient<Database>;
type AdminContext = { supabase: Db; userId: string };

async function assertStaff(ctx: AdminContext) {
  const { data, error } = await ctx.supabase.rpc("is_admin");
  if (error) throw new Error("An unexpected error occurred. Please try again.");
  if (!data) throw new Error("Forbidden");
}
```

### 3. بقايا إعدادات Vercel في مسار checkout رغم أن Cloudflare هو الهدف الوحيد

**الملاحظة:** دالة إنشاء رابط الموقع في checkout تقرأ `VERCEL_PROJECT_PRODUCTION_URL` و`VERCEL_URL` ضمن fallback. تعليمات المشروع تؤكد أن Vercel ليس هدف نشر. وجود هذه المتغيرات قد يسبب callback URL خاطئًا عند تشغيل بيئة مختلطة أو عند تسرب متغيرات CI قديمة.

**الأثر:** أخطاء عودة من بوابة الدفع أو Webhook post URL غير متوافق مع Worker الإنتاجي/المعاينة.

**مثال تحسين مقترح:**

```ts
function getSiteUrl(): string {
  const configuredUrl =
    process.env.PUBLIC_SITE_URL ??
    process.env.SITE_URL ??
    process.env.APP_URL ??
    "https://swwiitch.com";

  const absoluteUrl = /^https?:\/\//i.test(configuredUrl)
    ? configuredUrl
    : `https://${configuredUrl}`;

  return absoluteUrl.replace(/\/$/, "");
}
```

## P1 — أمان Supabase وRLS

### 4. RLS موجودة بشكل جيد، لكن تحتاج اختبار انحدار يغطي سياسات العميل الفعلية

**الملاحظة:** توجد migrations تفعّل RLS على الجداول الأساسية وتضيف سياسات ملكية/إدارة للـ profiles/orders/order_items/payments/digital_codes/audit_logs. كما توجد migration أحدث تنقل predicate الإدارة إلى schema خاص وتمنع `anon` من تنفيذ `public.is_admin`، وتوجد سياسات صريحة تمنع `anon/authenticated` من جداول server-only مثل `contact_messages` و`rate_limits`.

**نقاط قوة:**

- `digital_codes` محصور بإدارة فقط في RLS، وهذا مهم لأن الأكواد الرقمية أسرار تجارية.
- `switch_process_payment_webhook` مسموح فقط لـ `service_role` ويتحقق من `current_user` داخل الدالة.
- webhook processor لا يكتب نتائج الدفع إلا عبر RPC ذري.

**تحسين مقترح:** إضافة اختبارات SQL تبين: مستخدم عادي لا يرى أكواد رقمية، لا يقرأ payments لطلب غيره، ولا يستطيع تنفيذ `switch_process_payment_webhook`.

```sql
select throws_ok(
  $$ select public.switch_process_payment_webhook('tap','evt','pay','SW-1','captured',10,'SAR','{}') $$,
  '42501',
  null,
  'authenticated users cannot execute webhook processor'
);
```

### 5. مراجعة توافق أسماء حالات الأكواد بين migrations القديمة والجديدة

**الملاحظة:** يوجد أثر تاريخي لحالات uppercase مثل `AVAILABLE` في migration قديمة، بينما الدوال الأحدث تستخدم lowercase مثل `available` و`delivered`. إذا كانت قاعدة الإنتاج مرت بمرحلة بيانات uppercase قبل التوحيد، فقد يفشل حجز/تسليم الأكواد القديمة.

**الأثر:** نقص تسليم أكواد رغم توفر مخزون فعلي، وطلبات تنتقل إلى `processing` بدل `fulfilled`.

**مثال معالجة بيانات لمرة واحدة:**

```sql
update public.digital_codes
set status = lower(status)::public.digital_code_status
where status::text <> lower(status::text);
```

مع إضافة constraint/enum migration واضح يمنع رجوع الحالات القديمة.

## P1 — الدفع والـ Webhooks

### 6. المعالج المشترك قوي، لكن تغطية الاختبارات غير كافية لكل المزودين

**الملاحظة:** هناك abstraction موحد للمزودين ومعالج webhook مشترك، ويستدعي RPC ذريًا يتحقق من التكرار، المبلغ، العملة، ويقوم بتسليم الأكواد. يوجد اختبار لـ Tap، لكن يجب تغطية Moyasar/HyperPay/Telr ومعالج `handleProviderWebhook` نفسه.

**اختبارات مقترحة:**

- Moyasar: رفض `secret_token` غير صحيح وعدم تخزينه في `raw`.
- HyperPay: رفض AES-GCM tag غير صحيح وقبول payload مشفر صالح.
- Telr: قبول form-urlencoded ورفض `tran_check` غير صحيح.
- Processor: duplicate event يعيد `{ duplicate: true }` ولا يرسل بريدًا ثانيًا.
- Amount/currency mismatch يعيد 200 مع error مسجل ولا يحقق الطلب.

### 7. حماية الشراء جيدة لكن تحتاج حدًا ثانيًا على مستوى البريد/المنتج

**الملاحظة:** checkout يطبق rate limit fail-closed حسب IP أو البريد عند غياب IP، وهذا جيد. لكن المهاجم خلف IP متغير يستطيع إنشاء محاولات عديدة لنفس البريد أو لنفس المنتج.

**مثال تحسين:** طبق bucket مزدوج دائمًا:

```ts
await Promise.all([
  enforceRateLimit({ key: `checkout:ip:${ipHash ?? "unknown"}`, limit: 5, windowSeconds: 3600 }),
  enforceRateLimit({ key: `checkout:email:${data.customer.email.toLowerCase()}`, limit: 8, windowSeconds: 3600 }),
]);
```

## P2 — جودة الكود والبنية

### 8. تنظيم TanStack Router واضح، لكن صفحات الإدارة كثيرة ومسطحة

**الملاحظة:** أسماء routes الإدارية مثل `admin.finance.tsx` و`admin.security.tsx` واضحة، لكن من الأفضل نقل أجزاء domain الكبيرة إلى مكونات/containers داخل `src/features/admin/*` والإبقاء على route كغلاف صغير.

**الفائدة:** تحسين قابلية القراءة، خفض حجم route files، وتسهيل الاختبار لكل feature.

**مثال تنظيم:**

```txt
src/features/admin/finance/FinanceOverview.tsx
src/features/admin/security/SecurityEventsTable.tsx
src/routes/admin.finance.tsx
```

### 9. تكرار عميل Supabase fetch helper

**الملاحظة:** `createSupabaseFetch` و`isNewSupabaseApiKey` مكرران في client/server/auth middleware. يمكن استخراجهما إلى ملف مشترك لا يحتوي أسرارًا ولا يعتمد على DOM.

**مثال:**

```ts
// src/integrations/supabase/fetch.ts
export function createSupabaseFetch(supabaseKey: string): typeof fetch { /* ... */ }
```

## P2 — الأداء وتجربة المستخدم

### 10. استعلامات المنتجات لا تستخدم cache policy واضحة

**الملاحظة:** `listProducts` و`getProductBySlug` تنشئ client جديدًا وتقرأ المنتجات النشطة في كل طلب. صفحات storefront عادة يمكنها تحمل cache قصير مع invalidation إداري لاحقًا.

**تحسينات مقترحة:**

- استخدام TanStack Query `staleTime` للكتالوج والصفحة الرئيسية.
- إضافة `limit` افتراضي واضح للصفحات العامة.
- مراقبة حجم bundle بعد build، خصوصًا `recharts` وRadix components في صفحات الإدارة.

### 11. تجربة الأخطاء جيدة في checkout لكن يمكن توحيد رسائل الأخطاء

**الملاحظة:** checkout يعرض رسالة خطأ عربية للمستخدم ويوقف حالة الإرسال بشكل صحيح. لكن وظائف server ترمي رسائل إنجليزية عامة في عدة أماكن.

**تحسين مقترح:** إنشاء `AppError` برمز ورسالة عربية آمنة للمستخدم مع log تفصيلي للخادم.

```ts
export class AppError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}
```

## قائمة تنفيذ مقترحة

1. إضافة اختبارات Webhook وRLS المذكورة أعلاه.
2. إزالة fallbacks الخاصة بـ Vercel من `getSiteUrl` في checkout وTelr.
3. استخراج helpers المتكررة لـ Supabase fetch.
4. تحويل `admin.functions.ts` تدريجيًا من `any` إلى أنواع Supabase.
5. إنشاء feature folders للإدارة والكتالوج عند أول تعديل كبير قادم.
6. إضافة قياس bundle في CI أو تقرير build artifacts للصفحات الثقيلة.
