# Switch Release Gates

الحالة الافتراضية: NO-GO حتى يثبت كل Gate بدليل حديث لنفس SHA المرشح.

1. **GitHub:** typecheck + lint + tests + production build + Cloudflare deploy dry-run + preview dry-run ناجحة.
2. **Supabase:** RLS مفعلة على الجداول المعروضة، ولا توجد تحذيرات امنية غير مقبولة ومبررة.
3. **Migrations:** ملفات المستودع وسجل الانتاج متطابقان او drift موثق ومصحح.
4. **Commerce:** Zid/Salla/Shopify readiness ناجح، والكتابة تبقى disabled اثناء الاختبار.
5. **Payments:** checkout تجريبي + signature verification + invalid-signature rejection + webhook replay/idempotency + reconciliation ناجحة.
6. **Cloudflare:** النطاق الاساسي وwww وHTTPS والتحويلات وhealth/readiness تعمل على Worker المقصود.
7. **Secrets:** لا اسرار في Git او logs او client bundle.

## صلاحية القرار

Release Agent يصدر GO/NO-GO فقط. GO لا يعني النشر تلقائيا. الدمج والنشر وتفعيل checkout تتطلب موافقة المالك.
