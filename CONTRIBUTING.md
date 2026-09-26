# دليل المساهمة — Contributing Guide

شكرًا لاهتمامك بالمساهمة في **Switch | سويتش** 🎮

---

## متطلبات البيئة

- Node.js 22.x
- npm 10.x+
- Git

## الإعداد المحلي

```bash
git clone https://github.com/503badrr/cosmic-switch-preview.git
cd cosmic-switch-preview
npm install
cp .env.example .env   # أضف قيم Supabase للتطوير
npm run dev
```

---

## سير العمل

1. **افتح Issue** تصف المشكلة أو الميزة الجديدة قبل كتابة الكود.
2. **Fork** المستودع وأنشئ فرعًا وصفيًا:
   ```bash
   git checkout -b fix/cart-quantity-overflow
   # أو
   git checkout -b feat/dark-mode-toggle
   ```
3. **اكتب الكود** مع مراعاة معايير الجودة أدناه.
4. **شغّل الفحوصات** قبل الإرسال:
   ```bash
   npm run typecheck   # فحص الأنواع
   npm run lint        # فحص الكود
   npm run test        # تشغيل الاختبارات
   npm run build       # تأكد من نجاح البناء
   ```
5. **افتح Pull Request** مع وصف واضح لما تم تغييره ولماذا.

---

## معايير الكود

### TypeScript
- استخدم `strict: true` — لا أنواع `any` إلا بضرورة قصوى مع تعليق يشرح السبب.
- عرّف أنواع الإرجاع للدوال العامة.

### React
- مكونات وظيفية فقط (لا class components).
- اعتمد على hooks للحالة والتأثيرات الجانبية.
- لا تعدّل مكونات `src/components/ui/` يدويًا (مولّدة من shadcn/ui).

### التنسيق
- Prettier يتولى التنسيق تلقائيًا — شغّل `npm run format` قبل الإرسال.
- ESLint يفحص الجودة — لا ترسل كودًا يفشل `npm run lint`.

### الاختبارات
- أضف اختبارات لأي منطق جديد في `src/`.
- ملفات الاختبار بجوار الكود المختبر باسم `*.test.ts` أو `*.test.tsx`.

### اللغة
- التعليقات والمتغيرات بالإنجليزية.
- نصوص الواجهة بالعربية.
- رسائل الـ commit بالإنجليزية.

---

## تنسيق رسائل Commit

```
type(scope): short description

feat(cart): add max-quantity validation
fix(checkout): handle null payment response
docs(readme): update setup instructions
test(cart): add quantity overflow test
chore(ci): add test step to workflow
```

**أنواع مقبولة:** `feat`, `fix`, `docs`, `test`, `chore`, `refactor`, `perf`, `style`

---

## قواعد السلوك

- احترم الجميع في التعليقات والمناقشات.
- اكتب بشكل بنّاء وموضوعي.
- لا تقبل تغييرات تكسر الميزات الموجودة دون إصلاح.

---

للأسئلة: [افتح Issue](https://github.com/503badrr/cosmic-switch-preview/issues/new/choose) أو تواصل عبر support@swwiitch.com
