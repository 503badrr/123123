# دليل تشغيل Switch

آخر مراجعة: 2026-08-26

## البنية التشغيلية

| المكوّن | المصدر المعتمد |
| --- | --- |
| الشفرة | GitHub `503badrr/cosmic-switch-preview` / `main` |
| المعاينة المتزامنة | Lovable project `Switch` |
| الاستضافة | Cloudflare Worker `dark-disk-4155` |
| النطاق | `swwiitch.com`, `www.swwiitch.com` |
| قاعدة البيانات والمصادقة | Supabase project `slnjgmwckknzwjcmlolj` |
| الدفع الافتراضي | Tap Payments hosted checkout |
| البريد | Resend عند ضبط `RESEND_API_KEY` |
| تخزين/أدوات R2 | مستودع منفصل `503badrr/r2-explorer-template` |
| مراقبة Cloudflare MCP | مستودع منفصل `503badrr/mcp-server-cloudflare` |

Vercel ليس هدف نشر معتمد لهذا المشروع. فحوص Vercel القديمة لا تستخدم لتقرير جاهزية الإصدار.

## البيئات

### Production

- الفرع: `main`
- Worker: `dark-disk-4155`
- النطاقان الرسميان فقط
- Supabase production
- Tap production secrets

### Preview

- Pull Request branch
- Cloudflare Version Preview URL
- لا تستخدم أكواد رقمية حقيقية
- لا تستخدم مفاتيح دفع إنتاجية إن أمكن
- أي ترحيل قاعدة بيانات يجب أن يختبر على branch/staging قبل الإنتاج عندما تكون Supabase Branching متاحة

### Local

- `.env` محلي غير ملتزم
- `npm ci`
- `npm run dev`
- لا تنسخ service role إلى أجهزة أو أشخاص غير مخولين

## دورة الإصدار

1. أنشئ فرعًا من أحدث `main`.
2. نفّذ التغيير مع اختبارات وتوثيق.
3. افتح Pull Request.
4. انتظر نجاح NodeJS Quality Gate:
   - typecheck
   - lint
   - tests
   - production build
   - Cloudflare production dry-run
   - Cloudflare preview dry-run
5. افتح Preview URL وافحص واجهة الجوال وسطح المكتب.
6. طبّق ترحيلات Supabase المتوافقة فقط بعد assertions.
7. ادمج باستخدام Squash عند اكتمال البوابات.
8. راقب نشر `main` وسجلات Worker.
9. نفّذ فحص ما بعد النشر.
10. حدّث release manifest وIssue التشغيل.

## Tap Payments — التشغيل الآمن

- لا تعد صفحة `/success` إثباتًا للدفع. الصفحة تطلب التحقق من الخادم، والخادم يسترجع Charge من Tap ويطابق رقم العملية والمبلغ والعملة ومرجع الطلب.
- Webhook وRetrieve Charge يلتقيان في نفس المعالج الذري `switch_process_payment_webhook` حتى لا يحدث تسليم مزدوج عند إعادة الإرسال أو تأخر Webhook.
- mada تستخدم `src_sa.mada` وSAR فقط.
- Visa وMastercard تستخدمان `src_card`.
- Apple Pay تستخدم `src_apple_pay` ولا تظهر في Checkout إلا عند `TAP_APPLE_PAY_ENABLED=1` وبعد تمكينها فعليًا لدى Tap.
- لا تضبط `TAP_SOURCE_ID` إلا عند وجود سبب تشغيلي موثق؛ الوضع الطبيعي هو تعيين المصدر حسب وسيلة الدفع المختارة.
- Webhook الإنتاج: `https://swwiitch.com/api/public/webhooks/tap`.

### Refunds

- طبّق `supabase/migrations/20260826003000_payment_refunds.sql` قبل تفعيل Refund في الإنتاج.
- شغّل `supabase/tests/payment_refunds_rls.sql` بعد الترحيل داخل transaction تنتهي بـ rollback.
- Refund كامل أو جزئي ممكن، لكن الحجز الذري يمنع تجاوز المبلغ المدفوع حتى مع طلبين متزامنين.
- Refund الجزئي لا يحوّل الطلب كله إلى `refunded`؛ لا يحدث ذلك إلا عند وصول مجموع Refunds الناجحة إلى كامل قيمة الدفع.
- Refund من لوحة/تكامل إداري يحتاج مستخدم Admin مؤكد و`CONFIRM_REFUND`، ويولد audit log وcorrelation ID.
- Webhook الخاص بالـRefund يعالج في مسار منفصل عن Webhook الخاص بالـCharge.

### ChatGPT / MCP

- لا يوجد MCP transport عام داخل Storefront. طبقة العمليات الآمنة فقط موجودة في `src/server/mcp/payments.server.ts` لتستخدمها خدمة MCP مخصصة لاحقًا.
- عمليات القراءة تعرض حقولًا محدودة ولا ترجع `raw_payload` أو PII أو مفاتيح أو بيانات بطاقة.
- Refund عبر MCP يحتاج actor بدور `admin` أو `owner` وتأكيد `CONFIRM_REFUND`.
- لا يوجد `tap_create_payment` عام عبر MCP في هذه المرحلة؛ إنشاء Charge يبقى من Checkout لمنع duplicate charges حتى يتوفر idempotency contract موثق في MCP transport.

## فحص ما بعد النشر

### الواجهة

- `/`
- `/catalog`
- صفحة منتج فعلية
- `/cart`
- `/checkout`
- `/auth`
- `/reset-password`
- `/admin` بحساب إداري
- `/admin/codes`

### الوظائف

- تسجيل مستخدم ودخول وخروج.
- إضافة منتج للسلة وتغيير الكمية.
- إنشاء طلب تجريبي دون تسليم فعلي غير موثق.
- رفض Webhook بتوقيع خاطئ.
- قبول حدث صحيح مرة واحدة فقط.
- بعد العودة من Tap، تأكد أن الحالة لا تتحول إلى مدفوعة إلا بعد تحقق الخادم.
- أعد إرسال Webhook صحيحًا وتأكد من عدم تكرار التسليم.
- نفّذ Refund جزئي تجريبي وتأكد أن الطلب لا يصبح `refunded` بالكامل.
- أكمل المبلغ المتبقي وتأكد من انتقال payment/order إلى `refunded` بعد التأكيد النهائي فقط.
- وصول المستخدم إلى طلباته فقط.
- رفع CSV تجريبي من لوحة الأكواد والتحقق من audit log.
- إرسال نموذج تواصل والتحقق من rate limit.

### البنية

- SSL صالح للنطاقين.
- DNS يشير إلى Worker المعتمد فقط.
- لا يوجد Cloudflare Pages/Workers Build مكرر على نفس المستودع.
- `PUBLIC_SITE_URL` و`SITE_URL` يساويان `https://swwiitch.com`.
- مفاتيح Supabase العامة موجودة، والخادمية في secrets فقط.
- `PAYMENT_PROVIDER=tap` في الإنتاج عند الإطلاق على Tap.
- `TAP_SECRET_KEY` و`SUPABASE_SERVICE_ROLE_KEY` غير موجودين في frontend bundle أو logs أو MCP responses.

## المراقبة

راجع دوريًا:

- Cloudflare Workers logs والأخطاء 5xx.
- Cloudflare deployment/build status.
- Supabase Auth logs.
- Supabase API/Postgres logs.
- Supabase Security وPerformance Advisors.
- جدول `webhook_events` للأحداث غير المعالجة.
- جدول `payment_refunds` للحالات pending/failed غير المعتادة.
- جدول `audit_logs` لعمليات الإدارة والاستيراد والاسترداد.
- Tap dashboard لمطابقة المدفوعات والطلبات والاستردادات.

لا تعرض payloads أو أكوادًا رقمية أو أسرارًا أو PII في لوحات المراقبة.

## النسخ الاحتياطي والاستعادة

- استخدم نسخ Supabase الاحتياطية بحسب الخطة المتاحة.
- قبل ترحيل مهم، وثّق migration version وخطة rollback.
- لا تعتمد على R2 Explorer كنسخة احتياطية لقاعدة البيانات.
- اختبر استعادة نسخة في بيئة غير إنتاجية دوريًا.
- احتفظ بتصدير منفصل للبيانات القانونية/المالية وفق سياسة الاحتفاظ المعتمدة.

## التراجع Rollback

### تراجع الشفرة

1. حدّد آخر Commit إنتاجي سليم.
2. أنشئ revert PR؛ لا تعمل force-push على `main`.
3. شغّل Quality Gate.
4. ادمج وراقب نشر Cloudflare.

### تراجع قاعدة البيانات

- لا تنفذ SQL عكسيًا تلقائيًا إذا كان قد يحذف بيانات.
- migrations التي تضيف grants/policies/indexes يمكن عكسها بترحيل جديد موثق.
- migrations التي تغيّر بيانات العملاء تحتاج backup وتحقق يدوي.
- عند اختلاف الشفرة والمخطط، حافظ على backward compatibility حتى اكتمال النشرين.

### تراجع الدفع

- أوقف provider عبر متغير البيئة أو وضع الصيانة، لا تغيّر حالات الطلبات يدويًا دون reconciliation.
- لا تعيد تنفيذ Webhooks عشوائيًا؛ استخدم event IDs وidempotency.
- لا تحذف سجلات `payment_refunds` عند التراجع؛ احتفظ بها للمطابقة المالية والتدقيق.

## إدارة Supabase migrations

- كل DDL يجب أن يوجد في `supabase/migrations`.
- كل تغيير RLS/privilege يجب أن يملك assertion في `supabase/tests`.
- استخدم `apply_migration` للتطبيق، وليس SQL غير موثق.
- بعد التطبيق شغّل assertion داخل transaction مع `rollback`.
- أعد تشغيل Security وPerformance Advisors.
- لا تحذف فهرسًا لمجرد `unused_index` قبل توفر مدة استخدام وحمل إنتاج كافيين.

## تشغيل الأكواد الرقمية

1. جهّز CSV خارج GitHub.
2. استخدم منتجًا موجودًا عبر `product_slug`.
3. ارفع من `/admin/codes` فقط.
4. راجع inserted/skipped.
5. راجع `audit_logs`.
6. اختبر التسليم على طلب تجريبي موثق.
7. احذف النسخ المحلية غير المشفرة بعد النقل وفق السياسة.

## المستودعات المساندة

### R2 Explorer

`503badrr/r2-explorer-template` له PR وإعدادات Access/Buckets مستقلة. لا يدمج أو ينشر حتى:

- Cloudflare Access مفعّل.
- Preview وProduction buckets محددان.
- anonymous access مرفوض.
- quality workflow ناجح.

### Cloudflare MCP

`503badrr/mcp-server-cloudflare` يستخدم للمراقبة ودعم الإصدار. لا ينشر حتى:

- موارد Cloudflare المملوكة لـSwitch موجودة.
- OAuth secrets مضبوطة.
- التطبيق المختار محدد بوضوح.
- quality/security gates ناجحة.

## شدة الحوادث

| الشدة | مثال | الإجراء الأول |
| --- | --- | --- |
| SEV-1 | تسريب مفتاح، تسليم دون دفع، اختراق Admin | إيقاف المسار المتأثر وتدوير الأسرار |
| SEV-2 | checkout/webhook/reconciliation متوقف، أخطاء 5xx واسعة، Refund غير متطابق | وضع صيانة ومراقبة/reconciliation |
| SEV-3 | خلل واجهة أو أداء محدود | إصلاح عادي مع PR واختبارات |

## قائمة الإطلاق

- [ ] CI أخضر على Commit الإنتاج.
- [ ] Cloudflare production deployment ناجح.
- [ ] Preview وفحص بصري ناجحان.
- [ ] Supabase migrations/assertions ناجحة.
- [ ] `payment_refunds` migration وRLS assertions ناجحان قبل تفعيل Refund.
- [ ] Security Advisor مراجع والاستثناءات موثقة.
- [ ] Leaked password protection مفعلة.
- [ ] Tap secrets وWebhook production مضبوطان ومختبران.
- [ ] Retrieve Charge reconciliation مختبر على Sandbox.
- [ ] Apple Pay لا يفعل إلا بعد اعتماد Tap للـMerchant.
- [ ] DNS/SSL للنطاقين سليم.
- [ ] CSV code flow مختبر دون أكواد حقيقية في Git.
- [ ] rollback owner وخطوات الحادث معروفة.
