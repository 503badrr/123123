import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/digital-delivery")({
  head: () => ({
    meta: [
      { title: "تسليم المنتجات الرقمية | Switch سويتش" },
      { name: "description", content: "طريقة تسليم الأكواد والمنتجات الرقمية في متجر Switch سويتش." },
    ],
  }),
  component: DigitalDeliveryPage,
});

function DigitalDeliveryPage() {
  return (
    <section className="mx-auto max-w-4xl px-4 py-16">
      <div className="rounded-3xl glass-strong p-6 sm:p-10">
        <div className="text-xs font-bold text-cyan-300">Switch | سويتش</div>
        <h1 className="mt-3 text-3xl font-black text-white sm:text-5xl">تسليم المنتجات الرقمية</h1>
        <div className="mt-6 space-y-5 text-sm leading-8 text-cyan-100/75 sm:text-base">
          <p>
            يتم تسليم المنتجات الرقمية بعد إتمام الدفع بنجاح والتحقق من الطلب. قد يظهر الكود داخل صفحة الطلب أو يتم إرساله عبر قناة التواصل المتاحة في المتجر.
          </p>
          <h2 className="text-xl font-black text-white">قبل الشراء</h2>
          <p>تأكد من اختيار المنصة، الدولة، الفئة، والمنتج الصحيح. بعض المنتجات لا تعمل إلا على حسابات أو مناطق محددة.</p>
          <h2 className="text-xl font-black text-white">بعد الدفع</h2>
          <p>في الحالات الطبيعية يتم تجهيز الطلب سريعًا. إذا احتاج الطلب مراجعة أمنية أو تحقق يدوي، قد تتغير حالة الطلب إلى قيد المراجعة.</p>
          <h2 className="text-xl font-black text-white">مشكلة في التسليم</h2>
          <p>إذا لم يصلك المنتج أو واجهت مشكلة في التفعيل، تواصل معنا عبر <a className="font-bold text-cyan-300 hover:text-white" href="mailto:switch@swiitch.sa">switch@swiitch.sa</a> مع رقم الطلب.</p>
        </div>
      </div>
    </section>
  );
}
