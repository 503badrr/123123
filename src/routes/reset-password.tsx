import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PASSWORD_MIN_LENGTH, getPasswordPolicyError } from "@/lib/password-security";
import { toast } from "sonner";
import { KeyRound, Loader2 } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "إعادة تعيين كلمة المرور | Switch" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [stage, setStage] = useState<"request" | "set">("request");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash.includes("type=recovery")) {
      setStage("set");
    }
  }, []);

  async function onRequest(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/reset-password",
      });
      if (error) throw error;
      toast.success("أرسلنا رابط إعادة التعيين إلى بريدك");
    } catch (err: any) {
      toast.error(err?.message ?? "تعذر إرسال البريد");
    } finally {
      setLoading(false);
    }
  }

  async function onSet(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const passwordError = getPasswordPolicyError(password);
      if (passwordError) throw new Error(passwordError);

      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("تم تحديث كلمة المرور");
      navigate({ to: "/account" });
    } catch (err: any) {
      toast.error(err?.message ?? "تعذر التحديث");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="mb-5 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl cosmic-gradient text-[oklch(0.13_0.04_270)]"><KeyRound className="h-5 w-5" /></div>
        <h1 className="mt-3 text-2xl font-black text-white">إعادة تعيين كلمة المرور</h1>
      </div>
      <div className="rounded-3xl glass-strong p-6">
        {stage === "request" ? (
          <form onSubmit={onRequest} className="space-y-3">
            <label className="block text-xs font-bold text-cyan-100/85">البريد الإلكتروني</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-cyan-100/40 focus:border-cyan-300/50 focus:outline-none" />
            <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl cosmic-gradient px-5 py-3 text-sm font-black text-[oklch(0.13_0.04_270)] disabled:opacity-60">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />} إرسال رابط الإعادة
            </button>
          </form>
        ) : (
          <form onSubmit={onSet} className="space-y-3">
            <label className="block text-xs font-bold text-cyan-100/85">كلمة المرور الجديدة</label>
            <input type="password" required minLength={PASSWORD_MIN_LENGTH} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••••••"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-cyan-100/40 focus:border-cyan-300/50 focus:outline-none" />
            <p className="text-[11px] leading-relaxed text-cyan-100/55">
              استخدم {PASSWORD_MIN_LENGTH} حرفًا على الأقل، مع حرف إنجليزي كبير وصغير ورقم ورمز خاص.
            </p>
            <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl cosmic-gradient px-5 py-3 text-sm font-black text-[oklch(0.13_0.04_270)] disabled:opacity-60">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />} تحديث كلمة المرور
            </button>
          </form>
        )}
        <div className="mt-4 text-center text-xs">
          <Link to="/auth" className="text-cyan-300 hover:underline">العودة لتسجيل الدخول</Link>
        </div>
      </div>
    </div>
  );
}
