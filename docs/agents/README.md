# Switch Agent System V1

هذا الدليل يحدد فريق الوكلاء لمشروع Switch بدون اضافة خدمات مدفوعة جديدة.

## مبادئ التشغيل

- GitHub هو مصدر الحقيقة للكود. لا تستخدم GitLab كمصدر كود مواز الا كنسخة احتياطية اختيارية.
- Supabase هو مصدر الحقيقة للبيانات. Convex اختياري فقط لتجارب معزولة ولا يكرر بيانات الانتاج.
- Cloudflare Worker `dark-disk-4155` هو مسار النشر الوحيد للانتاج.
- Shopify وSalla وZid قنوات تجارة خلف طبقة adapters موحدة.
- لا يملك اي وكيل حق دمج PR او نشر انتاج او تشغيل كتابة المورد/القناة او تفعيل checkout تلقائيا.
- الاسرار تبقى server-side ولا تدخل Git او logs او رسائل الاخطاء.

## الوكلاء

| Agent | مسؤولية | قراءة | كتابة |
|---|---|---|---|
| Orchestrator | توزيع المهام وتجميع الادلة | نعم | لا مباشرة |
| Code | GitHub PR/CI/tests | نعم | feature branches فقط |
| Security | RLS/OAuth/secrets/webhooks | نعم | عبر PR/migration مراجعة |
| Database | Supabase schema/migrations | نعم | migration بعد مراجعة |
| Commerce | توحيد Zid/Salla/Shopify | نعم | مغلقة افتراضيا |
| Catalog | mapping للمنتجات والمخزون والسعر | نعم | staging/dry-run |
| Reconciliation | اكتشاف drift والتكرار | نعم | لا |
| Release | قرار release gates | نعم | لا ينشر تلقائيا |
| Creative | مواد المنتجات والتسويق | catalog عام فقط | media غير انتاجي |

## حدود الثقة

راجع `permissions.json` و`release-gates.md`. اي عملية حساسة تفشل مغلقة Fail Closed.
