# Switch | سويتش 🎮

منصة عربية متكاملة للمنتجات الرقمية — ألعاب، بطاقات، اشتراكات، وعروض.

[![Quality Gate](https://github.com/503badrr/cosmic-switch-preview/actions/workflows/webpack.yml/badge.svg)](https://github.com/503badrr/cosmic-switch-preview/actions/workflows/webpack.yml)

---

## المتطلبات

| الأداة | الإصدار المطلوب |
|--------|-----------------|
| Node.js | 22.x |
| npm | 10.x+ |
| Git | أي إصدار حديث |

---

## الإعداد السريع

### 1. استنساخ المستودع

```bash
git clone https://github.com/503badrr/cosmic-switch-preview.git
cd cosmic-switch-preview
```

### 2. تثبيت الاعتماديات

```bash
npm install
```

### 3. إعداد متغيرات البيئة

```bash
cp .env.example .env
```

افتح ملف `.env` وأضف قيمك:

```env
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon-public-key>
VITE_PUBLIC_SITE_URL=http://localhost:3000
VITE_PUBLIC_API_URL=http://localhost:3000/api
VITE_SUPPORT_EMAIL=support@example.com
```

> **ملاحظة:** للحصول على مفاتيح Supabase، افتح مشروعك في [supabase.com](https://supabase.com) → Settings → API.

### 4. تشغيل خادم التطوير

```bash
npm run dev
```

افتح المتصفح على `http://localhost:3000`.

---

## الأوامر المتاحة

| الأمر | الوصف |
|-------|-------|
| `npm run dev` | تشغيل خادم التطوير مع HMR |
| `npm run build` | بناء نسخة الإنتاج |
| `npm run build:dev` | بناء للتطوير مع source maps |
| `npm run preview` | معاينة نسخة الإنتاج محليًا |
| `npm run lint` | فحص الكود مع ESLint |
| `npm run format` | تنسيق الكود مع Prettier |
| `npm run typecheck` | فحص الأنواع مع TypeScript |
| `npm run test` | تشغيل الاختبارات مع Vitest |
| `npm run test:ui` | تشغيل الاختبارات مع واجهة بصرية |
| `npm run ci` | الفحص الكامل (typecheck + lint + build) |

---

## هيكل المشروع

```
src/
├── components/       # مكونات React المشتركة
│   └── ui/           # مكونات shadcn/ui (لا تعدلها يدويًا)
├── data/             # بيانات ثابتة (منتجات، فئات)
├── hooks/            # React hooks مخصصة
├── integrations/     # تكاملات خارجية (Supabase, Lovable)
├── lib/              # Server functions (TanStack Start)
├── routes/           # صفحات التطبيق (file-based routing)
├── server/           # منطق الخادم (مزودو الدفع)
├── store/            # إدارة الحالة (سلة المشتريات)
└── types/            # تعريفات TypeScript
```

---

## التقنيات المستخدمة

- **الإطار:** [TanStack Start](https://tanstack.com/start) (full-stack React)
- **التوجيه:** [TanStack Router](https://tanstack.com/router) (file-based)
- **الواجهة:** React 19، Tailwind CSS v4، shadcn/ui
- **قاعدة البيانات:** [Supabase](https://supabase.com) (PostgreSQL + RLS)
- **البناء:** Vite 8، Cloudflare Workers
- **النماذج:** React Hook Form + Zod
- **الاختبارات:** Vitest + @testing-library/react

---

## Troubleshooting — حل المشاكل الشائعة

### ❌ `eslint: not found` أو `vite: not found`

```bash
# تأكد من تثبيت الاعتماديات أولاً
npm install
```

---

### ❌ خطأ في متغيرات البيئة `VITE_SUPABASE_URL`

```
Error: Supabase URL is required
```

**الحل:** تأكد من إنشاء ملف `.env` ونسخ المتغيرات من `.env.example`.

---

### ❌ خطأ `Cannot find module` أثناء البناء

```bash
# امسح مجلدات البناء وأعد المحاولة
rm -rf .output .vinxi node_modules
npm install
npm run build
```

---

### ❌ خطأ في Node.js version

```
error: The engine "node" is incompatible with this module.
```

**الحل:** تأكد من استخدام Node.js 22.x:

```bash
node --version   # يجب أن يكون v22.x.x
```

استخدم [nvm](https://github.com/nvm-sh/nvm) أو [fnm](https://github.com/Schniz/fnm) لتبديل الإصدار:

```bash
nvm use 22
# أو
fnm use 22
```

---

### ❌ مشاكل TypeScript

```bash
# اعرض جميع أخطاء TypeScript
npm run typecheck
```

---

### ❌ أخطاء البناء على Cloudflare

راجع [`CLOUDFLARE_SETUP.md`](./CLOUDFLARE_SETUP.md) لخطوات النشر التفصيلية.

---

## المساهمة

راجع [`CONTRIBUTING.md`](./CONTRIBUTING.md) لقواعد ومعايير المساهمة.

---

## الترخيص

هذا المشروع مغلق المصدر. جميع الحقوق محفوظة.
