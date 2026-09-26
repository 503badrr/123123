# Shopify Headless Integration — Switch | سويتش

هذا المستند هو عقد التشغيل الحالي لتكامل Shopify Headless في مشروع Switch.

## القرار المعماري

لا يوجد Worker منفصل لـ Shopify. التطبيق كله ينشر إلى Cloudflare Worker واحد:

```text
GitHub
  -> TanStack Start / Vite / Nitro
  -> Cloudflare Worker: dark-disk-4155
  -> swwiitch.com + www.swwiitch.com
  -> Shopify Storefront API
```

المسار `/api/shopify/graphql` جزء من نفس التطبيق، وليس خدمة مستقلة.

## إصدار Storefront API

الإصدار المثبت حاليا:

```text
2026-07
```

أي ترقية ربع سنوية يجب أن تكون تغييرًا مقصودًا مع تشغيل الاختبارات وQuality Gate قبل الدمج.

## تدفق الطلبات

### القراءة والسلة

العميل يستخدم Public Storefront token مباشرة من المتصفح:

```text
React component
  -> useProducts / useCart
  -> shopifyClient.query() / mutation()
  -> https://<store>.myshopify.com/api/2026-07/graphql.json
```

رأس المصادقة:

```text
X-Shopify-Storefront-Access-Token
```

هذا المسار مخصص للكتالوج والبحث والسلة والعمليات غير الحساسة التي تسمح بها صلاحيات Storefront token.

### العمليات الخاصة

المسار الداخلي:

```text
POST /api/shopify/graphql
```

مغلق افتراضيا. لا يعمل إلا عند:

```text
SHOPIFY_PRIVILEGED_PROXY_ENABLED=1
```

وعندها يستخدم الخادم فقط:

```text
Shopify-Storefront-Private-Token
```

وعند وجود حركة مشتري يمرر كذلك:

```text
Shopify-Storefront-Buyer-IP
```

التوكن الخاص لا يدخل حزمة المتصفح ولا `wrangler.jsonc`.

## متغيرات البيئة

### Cloudflare build-time public values

هذه القيم تستخدم أثناء بناء حزمة المتصفح:

```bash
VITE_SHOPIFY_STORE_DOMAIN=gxgjyr-m9.myshopify.com
VITE_SHOPIFY_STOREFRONT_API_TOKEN=<public-storefront-token>
```

`VITE_SHOPIFY_STOREFRONT_API_TOKEN` قيمة عامة بطبيعتها لأنها ترسل للمتصفح، لكن يفضل إدارتها من إعدادات build حتى يمكن تدويرها دون تعديل المصدر.

### Cloudflare runtime server values

```bash
SHOPIFY_STORE_DOMAIN=gxgjyr-m9.myshopify.com
PRIVATE_STOREFRONT_API_TOKEN=<private-storefront-token>
SHOPIFY_PRIVILEGED_PROXY_ENABLED=0
```

أبق `SHOPIFY_PRIVILEGED_PROXY_ENABLED=0` ما لم توجد عملية عميل خاصة تحتاج فعلا المسار المميز.

`PRIVATE_STOREFRONT_API_TOKEN` يجب أن يكون Secret مشفرا في Cloudflare، وليس قيمة نصية ملتزم بها إلى Git.

## ملفات التكامل

```text
src/lib/shopify/client.ts
src/lib/shopify/queries.ts
src/lib/shopify/types.ts
src/lib/shopify/index.ts
src/hooks/useCart.ts
src/hooks/useProducts.ts
src/server/shopify.server.ts
src/routes/api/shopify/graphql.ts
src/lib/shopify/production-readiness.test.ts
```

## قواعد الأمان

1. لا تضع private token في أي `VITE_*` variable.
2. لا تضع private token في `wrangler.jsonc`.
3. لا تضع credential-bearing URLs أو secrets داخل Git.
4. private proxy يفشل مغلقا افتراضيا.
5. private proxy يقبل JSON فقط، يفرض حد حجم للحمولة، ويتحقق من same-origin.
6. العمليات الخاصة مقيدة بقائمة عمليات مسماة وليست GraphQL proxy مفتوحا.
7. أخطاء الخادم لا تعيد أسرار البيئة للعميل.

## GraphQL contract الحالي

التكامل يستخدم الحقول الحالية في Storefront API 2026-07، ومنها:

```graphql
available: availableForSale
product(handle: $handle)
collection(handle: $handle)
customer(customerAccessToken: $customerAccessToken)
```

لا تستخدم الصيغ القديمة `productByHandle` أو `collectionByHandle` أو `ProductVariant.available`.

## التحقق قبل الدمج

شغل:

```bash
npm ci
npm run typecheck
npm run lint
npm run test
npm run build
npm run deploy:cloudflare:dry-run
npm run preview:cloudflare:dry-run
```

والاختبار المركز:

```bash
npm run test -- src/lib/shopify/production-readiness.test.ts
```

## CI

`.github/workflows/webpack.yml` هو Quality Gate الرسمي ويشغل:

```text
typecheck
lint
tests
production build
Cloudflare deploy dry-run
Cloudflare versions upload dry-run
```

CI يستخدم Storefront token وهميا غير سري لاختبار أن build path يعمل. التوكن الحقيقي لا يوضع في workflow.

## متطلبات الإنتاج الخارجية

قبل اعتبار تكامل Shopify فعالًا بالكامل على `swwiitch.com` يجب ضبط قيم Cloudflare التالية فعليا:

```text
VITE_SHOPIFY_STORE_DOMAIN
VITE_SHOPIFY_STOREFRONT_API_TOKEN
```

وإذا تم تفعيل العمليات الخاصة فقط:

```text
SHOPIFY_STORE_DOMAIN
PRIVATE_STOREFRONT_API_TOKEN
SHOPIFY_PRIVILEGED_PROXY_ENABLED=1
```

## قاعدة النشر

- المصدر الرسمي: `503badrr/cosmic-switch-preview`
- الفرع الإنتاجي: `main`
- Worker الإنتاجي الوحيد: `dark-disk-4155`
- الدومين canonical: `https://swwiitch.com`
- Vercel ليس هدف نشر.
- Cloudflare Pages project المكرر ليس هدف الإنتاج.
