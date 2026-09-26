import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { AlertCircle, CheckCircle2, Loader2, LogIn, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { absoluteUrl } from "@/config/production";
import { PASSWORD_MIN_LENGTH, getPasswordPolicyError } from "@/lib/password-security";
import { toast } from "sonner";

const searchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "تسجيل الدخول | Switch" },
      { name: "description", content: "سجّل دخولك إلى منصة سويتش للوصول إلى طلباتك ومحفظتك ونقاط الولاء." },
    ],
  }),
  validateSearch: (s) => searchSchema.parse(s),
  component: AuthPage,
});

function getRedirectUrl(path = "/account") {
  if (typeof window === "undefined") return absoluteUrl(path);
  return `${window.location.origin}${path}`;
}

function AuthPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth" });
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  const afterAuth = () => {
    const dest = search.redirect && search.redirect.startsWith("/") ? search.redirect : "/account";
    navigate({ to: dest as any });
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) afterAuth();
    });
    // Run once on load only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setNotice(null);
    setErrorText(null);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      if (mode === "signup") {
        const passwordError = getPasswordPolicyError(password);
        if (passwordError) throw new Error(passwordError);

        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: { full_name: name.trim() },
            emailRedirectTo: getRedirectUrl("/account"),
          },
        });

        if (error) throw error;

        if (data.session) {
          toast.success("تم إنشاء حسابك وتسجيل دخولك بنجاح");
          afterAuth();
          return;
        }

        setNotice("تم إنشاء الحساب. افتح بريدك الإلكتروني واضغط رابط التأكيد، ثم سجّل الدخول.");
        toast.success("تم إرسال رابط التأكيد إلى بريدك");
        setMode("signin");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
      if (error) throw error;
      toast.success("أهلاً بعودتك");
      afterAuth();
    } catch (err: any) {
      const message = err?.message ?? "حصل خطأ أثناء تسجيل الدخول";
      setErrorText(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  async function onGoogle() {
    setLoading(true);
    setNotice(null);
    setErrorText(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: getRedirectUrl("/account"),
          queryParams: {
            access_type: "offline",
            prompt: "select_account",
          },
        },
      });

      if (error) throw error;
    } catch (err: any) {
      const message = err?.message ?? "تعذّر تسجيل الدخول بواسطة Google";
      setErrorText(message);
      toast.error(message);
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-[80vh] px-4 py-12">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 right-1/4 h-[420px] w-[420px] rounded-full bg-cyan-400/15 blur-[140px]" />
        <div className="absolute bottom-0 left-1/4 h-[320px] w-[320px] rounded-full bg-blue-600/20 blur-[140px]" />
      </div>
      <div className="relative mx-auto max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl cosmic-gradient text-[oklch(0.13_0.04_270)] shadow-[0_0_30px_-4px_oklch(0.82_0.18_210/0.8)]">
            <Sparkles className="h-5 w-5" />
          </div>
          <h1 className="mt-3 text-2xl font-black tracking-tight text-white">{mode === "signin" ? "تسجيل الدخول" : "إنشاء حساب جديد"}</h1>
          <p className="mt-1 text-sm text-cyan-100/70">{mode === "signin" ? "أهلاً بعودتك إلى Switch" : "أنشئ حسابك لاستلام طلباتك ومتابعتها"}</p>
        </div>

        <div className="rounded-3xl glass-strong p-6">
          {notice && (
            <div className="mb-4 flex gap-2 rounded-xl border border-emerald-300/25 bg-emerald-400/10 p-3 text-xs leading-relaxed text-emerald-100">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> {notice}
            </div>
          )}
          {errorText && (
            <div className="mb-4 flex gap-2 rounded-xl border border-rose-300/25 bg-rose-400/10 p-3 text-xs leading-relaxed text-rose-100">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {errorText}
            </div>
          )}

          <button
            onClick={onGoogle}
            disabled={loading}
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10 disabled:opacity-50"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden><path fill="#4285F4" d="M22 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.6c-.2 1.3-1 2.4-2.1 3.1v2.6h3.4c2-1.8 3.1-4.5 3.1-7.5z"/><path fill="#34A853" d="M12 22c2.7 0 5-1 6.9-2.4l-3.4-2.6c-.9.6-2.1 1-3.5 1-2.7 0-4.9-1.8-5.7-4.3H2.7v2.7C4.5 19.9 8 22 12 22z"/><path fill="#FBBC04" d="M6.3 13.7c-.2-.6-.3-1.2-.3-1.7s.1-1.1.3-1.7V7.6H2.7C2 9 1.6 10.4 1.6 12s.4 3 1.1 4.4l3.6-2.7z"/><path fill="#EA4335" d="M12 5.4c1.5 0 2.8.5 3.9 1.5l2.9-2.9C17 2.5 14.7 1.6 12 1.6 8 1.6 4.5 3.7 2.7 7.6l3.6 2.7C7.1 7.2 9.3 5.4 12 5.4z"/></svg>
            متابعة عبر Google
          </button>

          <div className="my-5 flex items-center gap-3 text-xs text-cyan-100/50">
            <div className="h-px flex-1 bg-white/10" /> أو <div className="h-px flex-1 bg-white/10" />
          </div>

          <form onSubmit={onSubmit} className="space-y-3">
            {mode === "signup" && (
              <Field label="الاسم الكامل" value={name} onChange={setName} placeholder="مثال: محمد العتيبي" required />
            )}
            <Field label="البريد الإلكتروني" type="email" value={email} onChange={setEmail} placeholder="you@example.com" autoComplete="email" required />
            <Field
              label="كلمة المرور"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="••••••••••••"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              required
              minLength={mode === "signup" ? PASSWORD_MIN_LENGTH : undefined}
            />
            {mode === "signup" && (
              <p className="text-[11px] leading-relaxed text-cyan-100/55">
                استخدم {PASSWORD_MIN_LENGTH} حرفًا على الأقل، مع حرف إنجليزي كبير وصغير ورقم ورمز خاص.
              </p>
            )}
            <button
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl cosmic-gradient px-5 py-3 text-sm font-black text-[oklch(0.13_0.04_270)] shadow-[0_0_30px_-6px_oklch(0.82_0.18_210/0.8)] disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
              {mode === "signin" ? "تسجيل الدخول" : "إنشاء الحساب"}
            </button>
          </form>

          <div className="mt-5 text-center text-xs text-cyan-100/70">
            {mode === "signin" ? (
              <>
                ليس لديك حساب؟{" "}
                <button onClick={() => { setMode("signup"); setErrorText(null); setNotice(null); }} className="font-bold text-cyan-300 hover:underline">أنشئ حسابًا الآن</button>
              </>
            ) : (
              <>
                لديك حساب؟{" "}
                <button onClick={() => { setMode("signin"); setErrorText(null); setNotice(null); }} className="font-bold text-cyan-300 hover:underline">سجّل الدخول</button>
              </>
            )}
            <div className="mt-2">
              <Link to="/reset-password" className="text-cyan-100/60 hover:text-cyan-100">نسيت كلمة المرور؟</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type FieldProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> & {
  label: string;
  value: string;
  onChange: (v: string) => void;
};
function Field({ label, value, onChange, ...rest }: FieldProps) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold text-cyan-100/85">{label}</label>
      <input
        {...rest}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-cyan-100/40 focus:border-cyan-300/50 focus:outline-none focus:ring-2 focus:ring-cyan-300/20"
      />
    </div>
  );
}
