# إعداد Cloudflare للإصدار الموحّد

## الهدف المعتمد

يُنشر المشروع على **Cloudflare Workers** فقط:

- Worker الإنتاج: `dark-disk-4155`
- فرع الإنتاج: `main`
- النطاقان: `swwiitch.com` و`www.swwiitch.com`
- معاينات طلبات الدمج: Version Preview URLs للـ Worker نفسه
- Vercel ليس هدف نشر لهذا المستودع

المشروع مبني بـ TanStack Start وVite/Nitro. يولّد البناء:

- Worker entry: `.output/server/index.mjs`
- Static assets: `.output/public`

لا توجد حاجة إلى مشروع Pages أو KV لهذا الإصدار.

## إعداد Workers Builds

اربط مستودع `503badrr/cosmic-switch-preview` بخدمة واحدة فقط:

| الإعداد | القيمة |
| --- | --- |
| Worker | `dark-disk-4155` |
| Production branch | `main` |
| Build command | `npm ci && npm run build` |
| Deploy command | `npm run deploy:cloudflare` |
| Preview deploy command | `npm run preview:cloudflare` |
| Root directory | `/` |
| Node.js | `22` |

عطّل اتصال Git للمشروع المكرر `cosmic-switch-preview`. إبقاء المشروعين متصلين بالمستودع يطلق عمليتي نشر للـ commit نفسه.

## رمز Workers Builds

لا تستخدم رمزًا بصلاحية `Account API Tokens Write` لنشر التطبيق؛ هذه الصلاحية تنشئ وتدير رموز API ولا تنشر Worker.

أنشئ رمزًا مخصصًا من `dark-disk-4155 → Settings → Build → API token`. يجب أن يكون نشطًا وغير منتهي وأن يسمح برفع Worker وتعديل Routes اللازمة للنطاق. رمز `super-mode-3a84` انتهى في `2026-07-31T23:59:59Z` ويجب استبداله قبل إعادة البناء.

احتفظ برمز إدارة API Tokens منفصلًا عن رمز النشر وفق مبدأ أقل صلاحية.
## المتغيرات العامة

ملف `wrangler.jsonc` يعرّف القيم العامة الآمنة:

- `ENVIRONMENT=production`
- `PAYMENT_PROVIDER=tap`
- `PUBLIC_SITE_URL=https://swwiitch.com`
- `SITE_URL=https://swwiitch.com`

أضف في Worker متغيرات Supabase العامة اللازمة للتطبيق:

- `SUPABASE_URL=https://slnjgmwckknzwjcmlolj.supabase.co`
- `SUPABASE_PUBLISHABLE_KEY=<publishable key>`
- `VITE_SUPABASE_URL=https://slnjgmwckknzwjcmlolj.supabase.co`
- `VITE_SUPABASE_PUBLISHABLE_KEY=<publishable key>`

## الأسرار

أضف القيم الحساسة كـ **Secrets** في Worker، ولا تضعها في GitHub أو `wrangler.jsonc`:

- `SUPABASE_SERVICE_ROLE_KEY`
- `TAP_SECRET_KEY`
- `TAP_PUBLISHABLE_KEY`

Tap يوقّع webhook باستخدام `TAP_SECRET_KEY`؛ لا يوجد `TAP_WEBHOOK_SECRET` مستقل في هذا التكامل. دوّر أي مفتاح سبق نشره في محادثة أو سجل.

## الفحص والنشر

```bash
npm ci
npm run ci
npm run deploy:cloudflare:dry-run
npm run preview:cloudflare:dry-run
npm run deploy:cloudflare
```

ينفّذ GitHub Actions البناء وWrangler dry-run لكل طلب دمج. لا يحتاج dry-run إلى مفاتيح Cloudflare، بينما النشر الفعلي يتم من Workers Builds المرتبط بـ GitHub.

## الإكمال من لوحة Cloudflare

1. تأكد أن `dark-disk-4155` هو الاتصال الوحيد بالمستودع وأن فرع الإنتاج `main`.
2. عطّل أو احذف اتصال المشروع المكرر `cosmic-switch-preview`.
3. ثبّت النطاقين كـ Custom Domains للـ Worker نفسه.
4. أضف المتغيرات والأسرار، ثم أعد نشر أحدث commit.
5. اختبر الصفحة الرئيسية، الكتالوج، تسجيل الدخول، السلة، الدفع وWebhook Tap من Preview URL قبل تحويل حركة الإنتاج.
