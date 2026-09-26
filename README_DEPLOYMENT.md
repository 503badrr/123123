# دليل نشر Switch

## البنية المعتمدة

| المكوّن | الاختيار |
| --- | --- |
| المصدر | GitHub: `503badrr/cosmic-switch-preview` |
| التشغيل | Cloudflare Worker `dark-disk-4155` |
| الإنتاج | فرع `main` |
| المعاينات | Cloudflare Version Preview URLs |
| قاعدة البيانات والمصادقة | Supabase |
| الدفع الافتراضي | Tap Payments |
| النطاق | `swwiitch.com` و`www.swwiitch.com` |

Vercel ومشروع Cloudflare المكرر `cosmic-switch-preview` ليسا هدفَي نشر.

## وثائق التشغيل

- [دليل الأمن](README_SECURITY.md)
- [دليل التشغيل والاستجابة للحوادث](README_OPERATIONS.md)
- [إعداد Cloudflare](CLOUDFLARE_SETUP.md)
- [إعداد النطاق](docs/DOMAIN_SETUP.md)

## بوابة الإصدار

لا يُحوّل طلب الدمج إلى إنتاج قبل نجاح:

1. TypeScript typecheck.
2. ESLint.
3. اختبارات Vitest.
4. بناء TanStack Start/Nitro.
5. `wrangler deploy --dry-run`.
6. معاينة Cloudflare وفحص المسارات الحساسة يدويًا.
7. تجربة ترحيل Supabase في بيئة staging ثم assertions بعد الترحيل.
8. مراجعة Supabase Security/Performance Advisors وتوثيق الاستثناءات المقبولة.

## إعداد Cloudflare

Workers Builds يجب أن يرتبط بهذا المستودع مرة واحدة فقط:

- Worker: `dark-disk-4155`
- Production branch: `main`
- Build command: `npm ci && npm run build`
- Deploy command: `npm run deploy:cloudflare`
- Preview deploy command: `npm run preview:cloudflare`
- Node.js: `22`

يربط `wrangler.jsonc` النطاقين بالـ Worker ويشغّل Version Preview URLs والمراقبة بنسبة sampling مقدارها 10%.

راجع [`CLOUDFLARE_SETUP.md`](CLOUDFLARE_SETUP.md) و[`docs/DOMAIN_SETUP.md`](docs/DOMAIN_SETUP.md).

## المتغيرات والأسرار

القيم العامة:

- `PAYMENT_PROVIDER=tap`
- `PUBLIC_SITE_URL=https://swwiitch.com`
- `SITE_URL=https://swwiitch.com`
- عناوين ومفاتيح Supabase القابلة للنشر

الأسرار التي تحفظ في Cloudflare Worker فقط:

- `SUPABASE_SERVICE_ROLE_KEY`
- `TAP_SECRET_KEY`
- أسرار Webhooks وبقية مزودي الدفع

لا تضع service role أو مفتاح Tap السري في GitHub أو متغيرات Vite. دوّر أي مفتاح سبق كشفه في رسالة أو سجل.

## Tap Webhook

عنوان الاستقبال:

```text
https://swwiitch.com/api/public/webhooks/tap
```

التحقق يستخدم HMAC-SHA256 و`TAP_SECRET_KEY` مع مقارنة ثابتة التوقيت، ثم يمنع المعالجة المكررة عبر `webhook_events`. لا تسلّم الكود الرقمي قبل نجاح حالة الدفع الموثقة.

## Supabase

كل DDL يجب أن يوجد في `supabase/migrations`، وكل تغيير RLS أو grants يجب أن يملك assertion في `supabase/tests`. بعد التطبيق، شغّل assertions داخل transaction منتهية بـ`rollback` ثم أعد تشغيل Advisors.

لا تنفذ تغييرات destructive على `order_items` ولا تمنح `authenticated` وصولًا مباشرًا غير مقيّد إلى جداول حساسة. الأخطاء من نوع `42501` على `auth.audit_log_entries` أو `hypopg_hidden_indexes` متوقعة للأدوار غير الإدارية وليست سببًا لمنح صلاحيات واسعة.

## فحص ما بعد النشر

- افتح الصفحة الرئيسية والكتالوج وصفحة المنتج.
- اختبر التسجيل، الدخول واستعادة كلمة المرور.
- اختبر السلة وإنشاء طلب تجريبي.
- تحقق من رفض webhook ذي التوقيع الخاطئ وقبول webhook الصحيح مرة واحدة.
- راقب Cloudflare Logs وSupabase Auth/API Logs.
- تأكد أن النطاقين يعيدان SSL صالحًا وأنهما يشيران إلى `dark-disk-4155`.
- راجع `/admin/codes` باستخدام CSV تجريبي فقط وتأكد من تسجيل العملية في `audit_logs`.
