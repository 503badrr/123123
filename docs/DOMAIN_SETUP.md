# ربط swwiitch.com بالـ Cloudflare Worker

المصدر الإنتاجي الوحيد لهذا المشروع هو:

- المستودع: `503badrr/cosmic-switch-preview`
- الفرع: `main`
- Worker: `dark-disk-4155`
- الدومين: `swwiitch.com`

لا تستخدم مشروع Cloudflare Pages القديم ولا تربط الدومين بـ Lovable. Lovable Cloud/Supabase يبقى Backend مستقلًا فقط.

## 1. ثبّت فرع الإنتاج

من لوحة Cloudflare:

1. افتح **Workers & Pages → dark-disk-4155**.
2. افتح **Settings → Build → Branch control**.
3. اجعل **Production branch** هو `main`.
4. اترك معاينات الفروع مفعّلة لطلبات السحب إن كانت مطلوبة.

يجب أن ينشر دمج أي PR في `main` نسخة الإنتاج، بينما تنشئ الفروع الأخرى Preview فقط.

## 2. أزل التوجيه القديم للدومين

من **Cloudflare DNS → Records**:

1. حدّد سجلات الجذر `@` و`www` التي توجّه إلى Short.io أو أي استضافة سابقة.
2. احذف السجلات المتعارضة فقط بعد تسجيل قيمها للرجوع إليها عند الحاجة.
3. لا تغيّر سجلات MX/TXT الخاصة بالبريد، ولا تغيّر Nameservers.

إذا كانت هناك روابط مختصرة لازمة، انقلها إلى نطاق فرعي مستقل مثل `go.swwiitch.com` بدل الجذر.

## 3. أضف Custom Domains للـ Worker

من **dark-disk-4155 → Settings → Domains & Routes**:

1. اختر **Add → Custom Domain** وأضف `swwiitch.com`.
2. أضف `www.swwiitch.com` بالطريقة نفسها.
3. اترك Cloudflare ينشئ سجلات DNS والشهادات المُدارة تلقائيًا.
4. إن أردت عنوانًا أساسيًا واحدًا، أضف Redirect Rule من `www` إلى الجذر بعد نجاح الربط.

لا تضف عنوان IP خاصًا بـ Lovable، ولا سجل `_lovable`، ولا ملف `CNAME` داخل مخرجات التطبيق.

## 4. اضبط متغيرات البناء والتشغيل

استخدم قيمًا عامة فقط في متغيرات Vite، وضع الأسرار في Worker Secrets:

```env
PUBLIC_SITE_URL=https://swwiitch.com
PUBLIC_API_URL=https://swwiitch.com/api
SITE_URL=https://swwiitch.com
VITE_PUBLIC_SITE_URL=https://swwiitch.com
VITE_PUBLIC_API_URL=https://swwiitch.com/api
VITE_SUPPORT_EMAIL=support@swwiitch.com
```

لا تضع مفاتيح service-role أو مفاتيح الدفع في متغير يبدأ بـ `VITE_`.

## 5. تحقق قبل إيقاف Pages

نفّذ هذه الاختبارات بعد نشر `main`:

```bash
curl -I https://swwiitch.com/
curl -I https://swwiitch.com/games
curl -I https://www.swwiitch.com/
```

ثم تحقق في المتصفح من:

- الصفحة الرئيسية وصفحة `/games` تعرضان المتجر، لا صفحة Short.io.
- الشهادة صالحة ولا توجد حلقة إعادة توجيه.
- مصدر الصفحة يحتوي canonical وOpen Graph على `https://swwiitch.com`.
- طلبات `/api/` تصل إلى Worker.

## 6. عطّل مشروع Pages القديم

بعد نجاح الاختبارات فقط:

1. افتح مشروع Cloudflare Pages القديم.
2. افتح **Build → edit Branch control** وأوقف **Enable automatic production branch deployments**.
3. من **Custom domains** أزل الدومين، واحذف سجل CNAME المرتبط به إن بقي.
4. من **Settings → Delete project** احذف المشروع إذا لم تعد تحتاج سجلات بنائه.

لا تُلغِ تثبيت تطبيق GitHub المسمى **Cloudflare Workers and Pages** ولا تسحب وصوله إلى المستودع؛ التطبيق مشترك ويستخدمه Workers Builds أيضًا. هذه الخطوة تتم من لوحة Cloudflare وليست تغييرًا داخل Git. احتفظ بآخر Deployment URL حتى انتهاء نافذة التحقق.

## التراجع

إذا فشل Worker على الدومين:

1. أزل Custom Domain من Worker.
2. أعد سجلات DNS التي حفظتها في الخطوة 2.
3. لا تعِد توصيل Pages إلا إذا قررت صراحة استخدامه كمصدر الإنتاج.
