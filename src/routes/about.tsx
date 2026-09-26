import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "من نحن | Switch سويتش" },
      { name: "description", content: "تعرف على متجر Switch سويتش للبطاقات الرقمية وشحن الألعاب والاشتراكات." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <section className="mx-auto max-w-4xl px-4 py-16">
      <div className="rounded-3xl glass-strong p-6 sm:p-10">
        <div className="text-xs font-bold text-cyan-300">Switch | سويتش</div>
        <h1 className="mt-3 text-3xl font-black text-white sm:text-5xl">من نحن</h1>
        <div className="mt-6 space-y-4 text-sm leading-8 text-cyan-100/75 sm:text-base">
          <p>
            سويتش متجر رقمي سعودي يهدف إلى تسهيل شراء البطاقات الرقمية، شحن الألعاب، وتفعيل الاشتراكات من مكان واحد.
          </p>
          <p>
            نركز على تجربة واضحة وسريعة: اختيار المنتج، دفع آمن، وتسليم رقمي بدون تعقيد. هدفنا أن يكون سويتش خيارك الأول للمنتجات الرقمية بثقة وسهولة.
          </p>
          <p>
            للتواصل والدعم: <a className="font-bold text-cyan-300 hover:text-white" href="mailto:switch@swiitch.sa">switch@swiitch.sa</a>
          </p>
        </div>
      </div>
    </section>
  );
}
