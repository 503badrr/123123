import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Loader2, LockKeyhole, Mail, Phone, UserRound } from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { PaymentMarks } from "../components/PaymentMarks";
import { SectionHeading } from "../components/SectionHeading";
import { TrustBanner } from "../components/TrustBanner";
import { beginHostedCheckout } from "../lib/checkout.functions";
import { getCheckoutPaymentCapabilities } from "../lib/payment-capabilities.functions";
import { useCart } from "../store/cart";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "الدفع الآمن | Switch سويتش" },
      {
        name: "description",
        content: "أكمل طلبك عبر صفحة دفع آمنة. لا يخزّن Switch بيانات بطاقتك.",
      },
    ],
  }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const cart = useCart();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [availableMethods, setAvailableMethods] = useState<string[]>([]);
  const [loadingMethods, setLoadingMethods] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void getCheckoutPaymentCapabilities()
      .then((result) => {
        if (!active) return;
        setAvailableMethods(result.methods);
        setPaymentMethod((current) =>
          current && result.methods.includes(current as never) ? current : (result.methods[0] ?? ""),
        );
      })
      .catch(() => {
        if (active) setAvailableMethods([]);
      })
      .finally(() => {
        if (active) setLoadingMethods(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!cart.items.length || submitting) return;
    if (!paymentMethod || !availableMethods.includes(paymentMethod)) {
      setError("لا توجد وسيلة دفع مفعلة حاليا. حاول لاحقا أو تواصل مع الدعم.");
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const result = await beginHostedCheckout({
        data: {
          items: cart.items.map((item) => ({ slug: item.id, qty: item.qty })),
          customer: { name, email, phone },
          paymentMethod: paymentMethod as "mada" | "visa" | "mastercard" | "apple-pay",
        },
      });
      sessionStorage.setItem("switch_pending_order", result.orderNumber);
      window.location.assign(result.redirectUrl);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر بدء عملية الدفع. حاول مرة أخرى.");
      setSubmitting(false);
    }
  }

  if (!cart.detailed.length) {
    return (
      <section className="mx-auto flex min-h-[65vh] max-w-3xl items-center px-4 py-16">
        <div className="switch-surface w-full rounded-3xl p-8 text-center sm:p-12">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-cyan-300/16 bg-cyan-300/[0.08] text-cyan-300">
            <LockKeyhole className="h-8 w-8" aria-hidden="true" />
          </div>
          <h1 className="mt-6 text-3xl font-black text-white">السلة فارغة</h1>
          <p className="mt-3 text-sm leading-7 text-cyan-100/65">
            أضف منتجًا رقميًا إلى السلة قبل الانتقال للدفع.
          </p>
          <Link to="/catalog" className="switch-button-primary mt-7 min-h-12 px-6 py-3">
            تصفّح المنتجات
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:py-14">
      <SectionHeading
        eyebrow="خطوة أخيرة"
        title="إتمام الطلب والدفع"
        description="راجع طلبك وأدخل بيانات التواصل، ثم ستنتقل إلى بوابة الدفع المعتمدة."
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_390px]">
        <form onSubmit={submit} className="space-y-6">
          <div className="switch-surface rounded-3xl p-5 sm:p-7">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl border border-cyan-100/12 bg-cyan-300/[0.07] text-cyan-300">
                <UserRound className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white">بيانات استلام الطلب</h2>
                <p className="text-xs leading-6 text-cyan-100/55">
                  تُستخدم لإرسال تفاصيل الطلب والتواصل عند الحاجة.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field label="الاسم الكامل" icon={UserRound}>
                <input required minLength={2} maxLength={80} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} className="switch-input" placeholder="مثال: بدر السبيعي" />
              </Field>
              <Field label="رقم الجوال" icon={Phone}>
                <input required minLength={8} maxLength={20} inputMode="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} className="switch-input" placeholder="05xxxxxxxx" />
              </Field>
              <div className="sm:col-span-2">
                <Field label="البريد الإلكتروني" icon={Mail}>
                  <input required type="email" maxLength={160} autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="switch-input" placeholder="name@example.com" />
                </Field>
              </div>
            </div>
          </div>

          <div className="switch-surface rounded-3xl p-5 sm:p-7">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-white">وسيلة الدفع</h2>
                <p className="mt-1 text-xs leading-6 text-cyan-100/55">
                  تظهر فقط وسائل الدفع المفعلة فعليا لدى البوابة.
                </p>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-xl border border-emerald-300/12 bg-emerald-300/[0.06] text-emerald-300">
                <LockKeyhole className="h-5 w-5" aria-hidden="true" />
              </div>
            </div>
            <div className="mt-5">
              {loadingMethods ? (
                <div className="flex min-h-16 items-center justify-center gap-2 text-sm text-cyan-100/60">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  جاري تحميل وسائل الدفع المتاحة...
                </div>
              ) : availableMethods.length ? (
                <PaymentMarks selectable value={paymentMethod} onChange={setPaymentMethod} allowedMethods={availableMethods} />
              ) : (
                <div className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.07] px-4 py-3 text-sm leading-7 text-amber-100">
                  بوابة الدفع غير جاهزة حاليا. لم يتم عرض أي وسيلة غير مفعلة.
                </div>
              )}
            </div>
          </div>

          <TrustBanner checkout />

          {error ? <div role="alert" className="rounded-2xl border border-rose-300/25 bg-rose-400/[0.08] px-4 py-3 text-sm leading-7 text-rose-100">{error}</div> : null}

          <button type="submit" disabled={submitting || loadingMethods || !availableMethods.length} className="switch-button-primary min-h-14 w-full rounded-2xl px-6 py-4 disabled:cursor-not-allowed disabled:opacity-55">
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <LockKeyhole className="h-5 w-5" aria-hidden="true" />}
            {submitting ? "جارٍ إنشاء جلسة الدفع الآمنة..." : `الدفع الآن — ${cart.total.toFixed(2)} ر.س`}
          </button>
        </form>

        <aside className="lg:sticky lg:top-28 lg:self-start" aria-label="ملخص الطلب">
          <div className="switch-surface rounded-3xl p-5 sm:p-6">
            <h2 className="text-lg font-black text-white">ملخص الطلب</h2>
            <div className="mt-5 space-y-4">
              {cart.detailed.map(({ id, qty, product }) => (
                <div key={id} className="flex items-start justify-between gap-4 border-b border-cyan-100/10 pb-4 last:border-0 last:pb-0">
                  <div className="min-w-0">
                    <h3 className="line-clamp-2 text-sm font-bold leading-6 text-white">{product.name}</h3>
                    <div className="mt-1 text-xs text-cyan-100/50">الكمية: {qty}</div>
                  </div>
                  <div className="shrink-0 text-sm font-black text-cyan-200">{(product.price * qty).toFixed(2)} ر.س</div>
                </div>
              ))}
            </div>
            <div className="mt-6 border-t border-cyan-100/10 pt-5">
              <SummaryRow label="المجموع الفرعي" value={`${cart.total.toFixed(2)} ر.س`} />
              <div className="mt-2 flex items-center justify-between text-sm text-cyan-100/62"><span>التسليم الرقمي</span><span className="font-bold text-emerald-300">مجاني</span></div>
              <div className="mt-5 flex items-end justify-between gap-4"><span className="font-black text-white">الإجمالي</span><span className="text-2xl font-black text-cyan-200">{cart.total.toFixed(2)} ر.س</span></div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function Field({ label, icon: Icon, children }: { label: string; icon: typeof UserRound; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 text-xs font-bold text-cyan-50/75"><Icon className="h-3.5 w-3.5 text-cyan-300" aria-hidden="true" />{label}</span>
      {children}
    </label>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between text-sm text-cyan-100/62"><span>{label}</span><span>{value}</span></div>;
}
