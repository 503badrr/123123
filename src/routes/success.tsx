import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Loader2,
  Mail,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";
import { BrandLogo } from "../components/BrandLogo";
import { getPaymentReturnStatus } from "../lib/payment-status.functions";

type ReturnState = "checking" | "paid" | "pending" | "failed";

export const Route = createFileRoute("/success")({
  validateSearch: z.object({ id: z.string().max(40).optional() }),
  head: () => ({
    meta: [
      { title: "حالة الدفع | Switch سويتش" },
      {
        name: "description",
        content: "تحقق آمن من حالة دفع طلبك بعد العودة من بوابة الدفع.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SuccessPage,
});

function SuccessPage() {
  const { id } = Route.useSearch();
  const [status, setStatus] = useState<ReturnState>(id ? "checking" : "pending");

  useEffect(() => {
    if (!id) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    const maxAttempts = 6;

    const check = async () => {
      attempts += 1;
      try {
        const result = await getPaymentReturnStatus({ data: { orderNumber: id } });
        if (!active) return;
        setStatus(result.status);
        if (result.status === "pending" && attempts < maxAttempts) {
          timer = setTimeout(() => void check(), 3000);
        }
      } catch {
        if (!active) return;
        setStatus("pending");
        if (attempts < maxAttempts) timer = setTimeout(() => void check(), 3000);
      }
    };

    void check();

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [id]);

  const view = returnView(status);
  const StatusIcon = view.icon;

  return (
    <section className="relative overflow-hidden px-4 py-14 sm:py-20">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute left-1/2 top-0 h-[420px] w-[680px] -translate-x-1/2 rounded-full bg-emerald-400/10 blur-[130px]" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-cyan-400/10 blur-[110px]" />
      </div>

      <div className="relative mx-auto max-w-3xl">
        <div className="switch-surface overflow-hidden rounded-[32px]">
          <div className="border-b border-cyan-100/10 bg-gradient-to-l from-emerald-400/[0.08] via-cyan-400/[0.055] to-blue-500/[0.04] px-6 py-8 text-center sm:px-10 sm:py-10">
            <BrandLogo className="justify-center" />
            <div className="mx-auto mt-7 grid h-20 w-20 place-items-center rounded-3xl border border-cyan-300/16 bg-cyan-300/[0.08] text-cyan-200">
              <StatusIcon
                className={`h-10 w-10 ${status === "checking" ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
            </div>
            <p className="mt-6 text-xs font-black text-cyan-300">تحقق آمن من بوابة الدفع</p>
            <h1 className="mt-2 text-3xl font-black text-white sm:text-5xl">{view.title}</h1>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-8 text-cyan-50/72 sm:text-base">
              {view.description}
            </p>
          </div>

          <div className="p-6 sm:p-10">
            {id ? (
              <div className="rounded-2xl border border-cyan-300/16 bg-cyan-300/[0.055] px-5 py-5 text-center">
                <div className="text-xs font-bold text-cyan-100/55">رقم الطلب</div>
                <div className="mt-2 break-all font-mono text-xl font-black tracking-wide text-cyan-200 sm:text-2xl">
                  {id}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.07] px-5 py-4 text-sm leading-7 text-amber-100">
                لم يصل رقم الطلب مع رابط العودة. لا يمكن اعتبار العملية ناجحة دون التحقق من الطلب.
              </div>
            )}

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <StatusPoint
                icon={status === "paid" ? CheckCircle2 : status === "failed" ? XCircle : Clock3}
                title="حالة الدفع"
                text={view.shortStatus}
              />
              <StatusPoint icon={ShieldCheck} title="الأمان" text="التحقق يتم من الخادم مباشرة" />
              <StatusPoint icon={Mail} title="الإشعار" text="تفاصيل التسليم عبر البريد" />
            </div>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
              {status === "failed" ? (
                <Link to="/checkout" className="switch-button-primary min-h-12 px-6 py-3">
                  إعادة المحاولة
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                </Link>
              ) : (
                <Link to="/account" className="switch-button-primary min-h-12 px-6 py-3">
                  متابعة الطلب
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                </Link>
              )}
              <Link to="/contact" className="switch-button-secondary min-h-12 px-6 py-3">
                تواصل مع الدعم
              </Link>
              <Link to="/catalog" className="switch-button-secondary min-h-12 px-6 py-3">
                متابعة التسوق
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function returnView(status: ReturnState): {
  icon: typeof CheckCircle2;
  title: string;
  description: string;
  shortStatus: string;
} {
  switch (status) {
    case "paid":
      return {
        icon: CheckCircle2,
        title: "تم تأكيد الدفع",
        description: "تم التحقق من العملية عبر الخادم وتحديث حالة طلبك بأمان.",
        shortStatus: "الدفع مؤكد",
      };
    case "failed":
      return {
        icon: XCircle,
        title: "لم تكتمل عملية الدفع",
        description: "أكدت بوابة الدفع أن العملية لم تكتمل. يمكنك إعادة المحاولة دون اعتبار الطلب مدفوعا.",
        shortStatus: "الدفع غير مكتمل",
      };
    case "checking":
      return {
        icon: Loader2,
        title: "جاري التحقق من الدفع",
        description: "نتحقق من Tap مباشرة ولا نعتمد على رابط العودة وحده كإثبات للدفع.",
        shortStatus: "جاري التحقق",
      };
    default:
      return {
        icon: Clock3,
        title: "الدفع قيد التحقق",
        description: "لم تصل بعد حالة نهائية مؤكدة. سيظل الطلب قيد الانتظار ولن يتم اعتباره مدفوعا قبل التحقق.",
        shortStatus: "بانتظار التأكيد",
      };
  }
}

function StatusPoint({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Clock3;
  title: string;
  text: string;
}) {
  return (
    <article className="switch-card rounded-2xl p-4 text-center">
      <Icon className="mx-auto h-5 w-5 text-emerald-300" aria-hidden="true" />
      <h2 className="mt-2 text-sm font-black text-white">{title}</h2>
      <p className="mt-1 text-xs leading-5 text-cyan-100/52">{text}</p>
    </article>
  );
}
