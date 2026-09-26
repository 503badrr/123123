/**
 * مثال عملي كامل لاستخدام Shopify Integration
 * يغطي جلب المنتجات وإدارة السلة
 */

import { useState } from "react";
import { useProducts, useProductByHandle, useCartManager } from "@/hooks";
import { useProductPricing } from "@/hooks/useProducts";
import type { ShopifyProduct, ShopifyProductVariant, CartLine } from "@/lib/shopify/types";

/**
 * صفحة الكتالوج الرئيسية
 * تعرض قائمة المنتجات مع خيارات الترقيم والتصفية
 */
export function CatalogPage() {
  const [sortBy, setSortBy] = useState<"CREATED_AT" | "PRICE" | "TITLE">("CREATED_AT");
  const [currentPage, setCurrentPage] = useState(0);

  const { data: products, isLoading, error } = useProducts({
    first: 12,
    sortKey: sortBy,
    reverse: sortBy === "PRICE",
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>جاري تحميل المنتجات...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">
          خطأ في تحميل المنتجات: {error.message}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-4">متجرنا</h1>

        {/* خيارات الترتيب */}
        <div className="flex gap-2 mb-4">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "CREATED_AT" | "PRICE" | "TITLE")}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="CREATED_AT">الأحدث</option>
            <option value="TITLE">الاسم</option>
            <option value="PRICE">السعر</option>
          </select>
        </div>
      </div>

      {/* شبكة المنتجات */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products?.nodes.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {/* الترقيم */}
      {products?.pageInfo.hasNextPage && (
        <div className="text-center mt-8">
          <button className="px-6 py-2 bg-primary text-white rounded-lg">
            تحميل المزيد
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * بطاقة منتج واحدة
 */
function ProductCard({ product }: { product: ShopifyProduct }) {
  const { cart, cartId } = useCartManager();
  const pricing = useProductPricing(product);
  const [isAdding, setIsAdding] = useState(false);

  const handleQuickAdd = async () => {
    if (!product.variants.nodes[0] || !cartId) return;

    setIsAdding(true);
    try {
      // سيتم إضافة المنتج عبر hook
      setIsAdding(false);
    } catch (error) {
      console.error("خطأ:", error);
      setIsAdding(false);
    }
  };

  const mainImage = product.images.nodes[0];

  return (
    <div className="border rounded-lg overflow-hidden hover:shadow-lg transition">
      {/* الصورة */}
      {mainImage && (
        <div className="aspect-square bg-gray-100 overflow-hidden">
          <img
            src={mainImage.url}
            alt={mainImage.altText || product.title}
            className="w-full h-full object-cover hover:scale-110 transition duration-300"
          />
        </div>
      )}

      <div className="p-4">
        {/* العنوان */}
        <h3 className="font-semibold text-lg line-clamp-2 mb-2">
          {product.title}
        </h3>

        {/* الوصف المختصر */}
        <p className="text-gray-600 text-sm line-clamp-2 mb-3">
          {product.description}
        </p>

        {/* السعر */}
        {pricing && (
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-primary">
                {pricing.displayPrice.split(" ")[0]}
              </span>
              {pricing.hasDiscount && (
                <span className="text-sm bg-red-100 text-red-800 px-2 py-1 rounded">
                  -{pricing.discountPercentage}%
                </span>
              )}
            </div>
          </div>
        )}

        {/* أزرار الإجراء */}
        <div className="flex gap-2">
          <button
            onClick={handleQuickAdd}
            disabled={isAdding}
            className="flex-1 bg-primary text-white py-2 rounded-lg hover:bg-primary-dark disabled:opacity-50"
          >
            {isAdding ? "جاري الإضافة..." : "أضف للسلة"}
          </button>
          <a
            href={`/product/${product.handle}`}
            className="flex-1 border border-primary text-primary py-2 rounded-lg text-center hover:bg-primary-light"
          >
            التفاصيل
          </a>
        </div>
      </div>
    </div>
  );
}

/**
 * صفحة تفاصيل المنتج
 */
export function ProductDetailPage({ handle }: { handle: string }) {
  const { data: product, isLoading } = useProductByHandle(handle);
  const { addProduct, isPending } = useCartManager();
  const pricing = useProductPricing(product);

  const [selectedVariant, setSelectedVariant] = useState(
    product?.variants.nodes[0]
  );
  const [quantity, setQuantity] = useState(1);

  if (isLoading) {
    return <div>جاري التحميل...</div>;
  }

  if (!product) {
    return <div>المنتج غير موجود</div>;
  }

  const handleAddToCart = async () => {
    if (!selectedVariant) return;

    try {
      await addProduct(selectedVariant.id, quantity);
      setQuantity(1);
      // إظهار رسالة نجاح
      alert("تمت الإضافة بنجاح!");
    } catch (error) {
      alert("خطأ في الإضافة");
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* الصور */}
        <div>
          {product.images.nodes[0] && (
            <img
              src={product.images.nodes[0].url}
              alt={product.title}
              className="w-full rounded-lg"
            />
          )}
        </div>

        {/* المعلومات */}
        <div>
          <h1 className="text-4xl font-bold mb-2">{product.title}</h1>

          {product.vendor && (
            <p className="text-gray-600 mb-4">العلامة التجارية: {product.vendor}</p>
          )}

          {/* السعر */}
          {pricing && (
            <div className="mb-6">
              <span className="text-3xl font-bold text-primary">
                {pricing.displayPrice}
              </span>
              {pricing.hasDiscount && (
                <span className="ml-4 text-sm bg-red-100 text-red-800 px-3 py-1 rounded">
                  وفر {pricing.discountPercentage}%
                </span>
              )}
            </div>
          )}

          {/* الوصف */}
          <div className="prose mb-8">
            <p>{product.description}</p>
          </div>

          {/* خيارات المتغيرات */}
          {product.variants.nodes.length > 1 && (
            <div className="mb-6">
              <label className="block font-semibold mb-2">الخيارات:</label>
              <select
                value={selectedVariant?.id}
                onChange={(e) => {
                  const variant = product.variants.nodes.find(
                    (v: ShopifyProductVariant) => v.id === e.target.value
                  );
                  setSelectedVariant(variant);
                }}
                className="w-full border rounded-lg p-2"
              >
                {product.variants.nodes.map((variant: ShopifyProductVariant) => (
                  <option key={variant.id} value={variant.id}>
                    {variant.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* الكمية */}
          <div className="mb-6">
            <label className="block font-semibold mb-2">الكمية:</label>
            <input
              type="number"
              min="1"
              max="10"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="border rounded-lg p-2 w-24"
            />
          </div>

          {/* زر الإضافة */}
          <button
            onClick={handleAddToCart}
            disabled={isPending || !selectedVariant?.available}
            className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? "جاري الإضافة..." : "أضف إلى السلة"}
          </button>

          {!selectedVariant?.available && (
            <p className="text-red-600 mt-4">المنتج غير متوفر حالياً</p>
          )}

          {/* المعلومات الإضافية */}
          <div className="mt-8 border-t pt-6">
            {product.productType && (
              <p className="text-sm mb-2">
                <strong>النوع:</strong> {product.productType}
              </p>
            )}
            {product.tags.length > 0 && (
              <p className="text-sm">
                <strong>الوسوم:</strong> {product.tags.join(", ")}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * عرض السلة
 */
export function CartSummary() {
  const { cart, lineCount, total, checkoutUrl, removeProduct, updateQuantity } =
    useCartManager();

  if (!cart || lineCount === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">السلة فارغة</p>
        <a href="/" className="text-primary hover:underline">
          متابعة التسوق
        </a>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">السلة ({lineCount} منتج)</h2>

      <div className="space-y-4 mb-6">
        {cart.lines.nodes.map((line: CartLine) => (
          <div key={line.id} className="border rounded-lg p-4 flex justify-between items-center">
            <div className="flex-1">
              <h3 className="font-semibold">{line.merchandise.title}</h3>
              <p className="text-gray-600">
                {line.merchandise.product?.title}
              </p>
            </div>

            <div className="flex items-center gap-4">
              {/* الكمية */}
              <input
                type="number"
                min="1"
                value={line.quantity}
                onChange={(e) => updateQuantity(line.id, Number(e.target.value))}
                className="w-16 border rounded-lg p-2 text-center"
              />

              {/* السعر */}
              <div className="text-right">
                <p className="font-semibold">
                  {parseFloat(line.cost.totalAmount.amount).toFixed(2)} {line.cost.totalAmount.currencyCode}
                </p>
              </div>

              {/* زر الإزالة */}
              <button
                onClick={() => removeProduct(line.id)}
                className="text-red-600 hover:text-red-800"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* الملخص */}
      <div className="border-t pt-4 mb-6">
        <div className="flex justify-between mb-4">
          <span>الإجمالي:</span>
          <span className="text-xl font-bold">
            {total} {cart.cost.totalAmount.currencyCode}
          </span>
        </div>
      </div>

      {/* زر الشراء */}
      {checkoutUrl && (
        <a
          href={checkoutUrl}
          className="w-full block text-center bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary-dark"
        >
          إكمال الشراء
        </a>
      )}
    </div>
  );
}
