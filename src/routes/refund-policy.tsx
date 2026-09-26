import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/refund-policy")({
  head: () => ({
    meta: [
      { title: "سياسة الاسترجاع | Switch سويتش" },
      { name: "description", content: "سياسة الاسترجاع والاستبدال للمنتجات الرقمية في متجر Switch سويتش." },
    ],
  }),
  component: RefundPolicyPage,
});

function RefundPolicyPage() {
  return (
    <section className="mx-auto max-w-4xl px-4 py-16">
      <div className="rounded-3xl glass-strong p-6 sm:p-10">
        <div className="text-xs font-bold text-cyan-300">آخر تحديث: 2 يوليو 2026</div>
        <h1 className="mt-3 text-3xl font-black text-white sm:text-5xl">سياسة الاسترجاع والاستبدال</h1>
        <div className="mt-6 space-y-5 text-sm leading-8 text-cyan-100/75 sm:text-base">
          <p>
            لأن منتجاتنا رقمية، تختلف سياسة الاسترجاع عن المنتجات التقليدية. نراجع كل طلب بعدل ووضوح حسب حالة التسليم.
          </p>
          <h2 className="text-xl font-black text-white">متى يمكن قبول الاسترجاع؟</h2>
          <p>يمكن قبول الاسترجاع إذا لم يتم تسليم الكود أو ظهر خطأ من المتجر في المنتج أو الفئة أو حالة الطلب.</p>
          <h2 className="text-xl font-black text-white">متى لا يمكن الاسترجاع؟</h2>
          <p>لا يمكن استرجاع المنتج بعد عرض الكود أو إرساله للعميل إذا كان صحيحًا ومطابقًا للطلب.</p>
          <h2 className="text-xl font-black text-white">الاستبدال</h2>
          <p>إذا ثبت وجود مشكلة في الكود قبل استخدامه أو كان غير مطابق للطلب، تتم مراجعة الحالة وقد يتم استبداله حسب نتيجة التحقق.</p>
          <h2 className="text-xl font-black text-white">طلب المساعدة</h2>
          <p>راسلنا برقم الطلب وتفاصيل المشكلة عبر <a className="font-bold text-cyan-300 hover:text-white" href="mailto:switch@swiitch.sa">switch@swiitch.sa</a>.</p>
        </div>
      </div>
    </section>
  );
}
