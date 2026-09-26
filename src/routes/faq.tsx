import { createFileRoute } from "@tanstack/react-router";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "الأسئلة الشائعة | Switch سويتش" },
      {
        name: "description",
        content:
          "إجابات على أكثر الأسئلة شيوعاً حول متجر Switch سويتش: طرق الدفع، تسليم الأكواد الرقمية، الاسترجاع، الحساب، والأمان.",
      },
    ],
  }),
  component: FaqPage,
});

type QA = { q: string; a: string };

const CATEGORIES: { title: string; items: QA[] }[] = [
  {
    title: "الطلبات والتسليم",
    items: [
      {
        q: "كم تستغرق مدة تسليم الكود الرقمي؟",
        a: "التسليم فوري في أغلب الأوقات. بعد إتمام الدفع بنجاح، يظهر الكود في صفحة تفاصيل الطلب ويُرسل نسخة إلى بريدك الإلكتروني. في حالات نادرة قد يستغرق ذلك دقائق أثناء تأكيد الدفع.",
      },
      {
        q: "أين أجد أكوادي بعد الشراء؟",
        a: "من لوحة حسابك اذهب إلى صفحة (طلباتي)، ثم افتح تفاصيل الطلب لعرض الكود ورقم السريال. يمكنك أيضاً الرجوع إلى بريدك الإلكتروني.",
      },
      {
        q: "لم أستلم الكود، ماذا أفعل؟",
        a: "تأكد من مجلد الرسائل غير المرغوب فيها (Spam). إن لم يظهر الطلب في حسابك خلال 15 دقيقة، تواصل معنا عبر صفحة (تواصل معنا) مع رقم الطلب.",
      },
    ],
  },
  {
    title: "الدفع والأسعار",
    items: [
      {
        q: "ما طرق الدفع المتاحة؟",
        a: "نقبل مدى، Visa، Mastercard، وApple Pay عبر بوابات دفع معتمدة (Moyasar / HyperPay / Tap / Telr). جميع المعاملات مؤمّنة عبر HTTPS ومحمية بمعايير PCI DSS.",
      },
      {
        q: "هل الأسعار شاملة الضريبة؟",
        a: "نعم، جميع الأسعار المعروضة شاملة ضريبة القيمة المضافة (VAT) عند تطبيقها. تظهر التفاصيل الكاملة في صفحة إتمام الطلب.",
      },
      {
        q: "لماذا فشلت عملية الدفع؟",
        a: "أشيع الأسباب: رصيد غير كافٍ، تجاوز حد المعاملة اليومي، أو رفض البنك للمعاملة الإلكترونية. راجع بنكك وحاول مرة أخرى، أو استخدم بطاقة/طريقة دفع مختلفة.",
      },
    ],
  },
  {
    title: "الاسترجاع والاستبدال",
    items: [
      {
        q: "هل يمكنني استرجاع الكود بعد شرائه؟",
        a: "بحكم طبيعة المنتجات الرقمية، لا يمكن استرجاع الكود بعد استخدامه أو الكشف عنه. للاطلاع على الحالات المستثناة راجع (سياسة الاسترجاع).",
      },
      {
        q: "الكود لا يعمل. ما الخطوات؟",
        a: "تواصل معنا خلال 24 ساعة من الشراء مع لقطة شاشة توضح الخطأ. سيقوم فريق الدعم بمراجعة الحالة وقد يتم استبدال الكود إذا ثبت وجود عطل من جهتنا.",
      },
    ],
  },
  {
    title: "الحساب والأمان",
    items: [
      {
        q: "هل بياناتي محفوظة بشكل آمن؟",
        a: "نعم. نستخدم Row-Level Security على قواعد البيانات، ومصادقة معتمدة، ولا نخزن بيانات البطاقة على خوادمنا. جميع المدفوعات تمر عبر بوابات دفع معتمدة.",
      },
      {
        q: "نسيت كلمة المرور، كيف أستعيدها؟",
        a: "من صفحة تسجيل الدخول اضغط (نسيت كلمة المرور)، أدخل بريدك الإلكتروني، وستصلك رسالة لإعادة التعيين خلال دقائق.",
      },
      {
        q: "كيف أحذف حسابي؟",
        a: "أرسل طلب حذف الحساب عبر صفحة (تواصل معنا) من نفس البريد الإلكتروني المسجّل. سنؤكد الطلب ونحذف بياناتك خلال 7 أيام عمل.",
      },
    ],
  },
];

function FaqPage() {
  return (
    <section className="mx-auto max-w-4xl px-4 py-16">
      <div className="rounded-3xl glass-strong p-6 sm:p-10">
        <div className="text-xs font-bold text-cyan-300">Switch | سويتش</div>
        <h1 className="mt-3 text-3xl font-black text-white sm:text-5xl">الأسئلة الشائعة</h1>
        <p className="mt-4 text-sm leading-8 text-cyan-100/75 sm:text-base">
          إجابات مباشرة على الأسئلة الأكثر شيوعاً. إن لم تجد ما تبحث عنه، تواصل معنا وسنكون سعداء بمساعدتك.
        </p>

        <div className="mt-10 space-y-10">
          {CATEGORIES.map((cat) => (
            <div key={cat.title}>
              <h2 className="mb-4 text-xl font-black text-white sm:text-2xl">{cat.title}</h2>
              <Accordion type="single" collapsible className="space-y-3">
                {cat.items.map((item, i) => (
                  <AccordionItem
                    key={i}
                    value={`${cat.title}-${i}`}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4"
                  >
                    <AccordionTrigger className="text-right text-sm font-bold text-white hover:no-underline sm:text-base">
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm leading-8 text-cyan-100/75 sm:text-base">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-2xl border border-cyan-300/30 bg-cyan-300/5 p-6 text-center">
          <div className="text-sm font-bold text-white">لم تجد إجابتك؟</div>
          <p className="mt-2 text-sm text-cyan-100/75">
            راسلنا على{" "}
            <a className="font-bold text-cyan-300 hover:text-white" href="mailto:switch@swiitch.sa">
              switch@swiitch.sa
            </a>{" "}
            وسنرد عليك في أقرب وقت.
          </p>
        </div>
      </div>
    </section>
  );
}
