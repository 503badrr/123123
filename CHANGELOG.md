# Changelog

جميع التغييرات الجوهرية في هذا المشروع موثقة هنا.

التنسيق مبني على [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)،
والمشروع يتبع [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0] — 2026-07-23

### ✨ الإضافات

- **الكتالوج الكامل**: صفحات للألعاب، البطاقات، الاشتراكات، والعروض مع بطاقات منتجات تفاعلية.
- **سلة المشتريات**: إضافة/حذف/تعديل الكميات مع حفظ تلقائي في `localStorage`.
- **تدفق الدفع**: صفحة Checkout مع تكامل مع مزودي الدفع (Moyasar، HyperPay، Tap).
- **نظام حسابات المستخدمين**: تسجيل الدخول والتسجيل والملف الشخصي عبر Supabase Auth.
- **لوحة الإدارة**: إدارة المنتجات والطلبات والرموز الرقمية والمستخدمين.
- **SEO**: sitemap.xml ديناميكي، robots.txt، Open Graph tags.
- **دعم RTL**: واجهة عربية كاملة مع دعم محلي.
- **نظام الإشعارات**: إشعارات الطلبات وحالات الدفع.
- **إدارة الأكواد الرقمية**: رفع وتوزيع بالـ CSV مع آلية تسليم آمنة.

### 🔧 البنية التحتية

- TanStack Start + TanStack Router (file-based routing).
- Supabase Backend مع RLS وRBAC.
- Cloudflare Workers للنشر.
- GitHub Actions CI: typecheck + lint + build.
- ESLint + Prettier + TypeScript strict mode.
- Vitest لإطار الاختبارات.

### 📚 التوثيق

- `README.md`: خطوات الإعداد والتشغيل وقسم Troubleshooting.
- `CONTRIBUTING.md`: قواعد ومعايير المساهمة.
- `CLOUDFLARE_SETUP.md`: دليل النشر على Cloudflare.
- `README_DEPLOYMENT.md`: دليل النشر الكامل.
- قوالب Issues وPull Requests.

---

[0.1.0]: https://github.com/503badrr/cosmic-switch-preview/releases/tag/v0.1.0
