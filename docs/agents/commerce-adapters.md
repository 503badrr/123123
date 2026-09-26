# Commerce Adapter Contract

يستخدم Switch نموذجا موحدا للقنوات ولا يجعل Zid او Salla او Shopify قاعدة البيانات الاساسية.

## Canonical product

- source
- external_id
- sku
- title
- description
- variants
- images
- cost
- price
- currency
- stock
- shipping
- margin
- lifecycle_status
- approved
- last_synced_at

## قواعد المزامنة

- القراءة قبل الكتابة.
- idempotency key لكل عملية قابلة للتكرار.
- مقارنة SKU + external_id قبل create/update.
- dry-run افتراضي.
- لا نشر تلقائي.
- لا تغيير سعر تلقائي.
- لا fulfillment او شراء مورد تلقائي.
- retries محدودة مع backoff؛ لا loop مفتوح.
- تسجل metadata فقط ولا تسجل tokens او Authorization headers.

## Zid

حسب وثائق Zid المرفقة للمشروع، OAuth يستخدم Authorization Code Grant لتطبيق server-side. تحفظ Client Secret وAccess Token خارج المستودع. رؤوس Authorization/Access-Token/Store-Id لا تسجل في logs.

## Salla وShopify

يطبق نفس fail-closed contract: OAuth/tokens server-side، scopes باقل صلاحية، webhooks موقعة، وربط external IDs داخل mapping server-only.
