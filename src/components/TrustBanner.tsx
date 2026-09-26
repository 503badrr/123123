import { BadgeCheck, Headphones, LockKeyhole, ShieldCheck } from "lucide-react";
import { PaymentMarks } from "./PaymentMarks";

type TrustBannerProps = {
  checkout?: boolean;
};

const points = [
  { icon: LockKeyhole, title: "اتصال مشفّر", text: "HTTPS وحماية للبيانات أثناء الإرسال" },
  { icon: BadgeCheck, title: "منتجات موثوقة", text: "تفاصيل واضحة قبل إتمام الطلب" },
  { icon: Headphones, title: "دعم سعودي", text: "متابعة الطلب عبر القنوات الرسمية" },
];

export function TrustBanner({ checkout = false }: TrustBannerProps) {
  return (
    <section
      className={`relative overflow-hidden rounded-3xl border border-emerald-300/20 bg-gradient-to-br from-emerald-400/[0.12] via-cyan-400/[0.06] to-blue-500/[0.08] ${checkout ? "p-5" : "p-6 sm:p-8"}`}
      aria-label="الثقة والأمان"
    >
      <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-emerald-300/15 blur-3xl" />
      <div className="relative">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-300 text-[oklch(0.17_0.05_250)] shadow-[0_0_34px_-10px_oklch(0.82_0.19_155/0.8)]">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xs font-black text-emerald-300">الثقة والأمان</div>
            <h2 className={`${checkout ? "text-lg" : "text-2xl sm:text-3xl"} mt-1 font-black text-white`}>
              ادفع براحة، وخلّ الباقي علينا
            </h2>
            <p className="mt-2 max-w-2xl text-xs leading-6 text-cyan-50/70 sm:text-sm">
              لا يخزّن Switch بيانات بطاقتك. تنتقل عملية الدفع إلى بوابة دفع معتمدة، ولا يتم تسليم المنتج الرقمي إلا بعد تأكيد العملية.
            </p>
          </div>
        </div>

        {!checkout && (
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {points.map((point) => {
              const Icon = point.icon;
              return (
                <div key={point.title} className="flex gap-3 rounded-2xl border border-white/10 bg-black/10 p-4 backdrop-blur-sm">
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
                  <div>
                    <div className="text-sm font-black text-white">{point.title}</div>
                    <div className="mt-1 text-xs leading-5 text-cyan-50/60">{point.text}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className={`${checkout ? "mt-4" : "mt-6 max-w-xl"}`}>
          <PaymentMarks compact />
        </div>
      </div>
    </section>
  );
}
