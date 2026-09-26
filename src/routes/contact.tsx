import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { submitContactMessage } from "@/lib/contact.functions";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "تواصل معنا | Switch سويتش" },
      {
        name: "description",
        content:
          "تواصل مع فريق دعم Switch سويتش عبر نموذج التواصل أو البريد الإلكتروني. نرد خلال 24 ساعة.",
      },
    ],
  }),
  component: ContactPage,
});

const ContactSchema = z.object({
  name: z.string().trim().min(2, "الاسم قصير جداً").max(80, "الاسم أطول من اللازم"),
  email: z
    .string()
    .trim()
    .email("بريد إلكتروني غير صالح")
    .max(120, "البريد الإلكتروني أطول من اللازم"),
  subject: z.string().trim().min(3, "الموضوع قصير جداً").max(120, "الموضوع أطول من اللازم"),
  message: z.string().trim().min(10, "الرسالة قصيرة جداً").max(4000, "الرسالة أطول من اللازم"),
});

type ContactValues = z.infer<typeof ContactSchema>;

function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const form = useForm<ContactValues>({
    resolver: zodResolver(ContactSchema),
    defaultValues: { name: "", email: "", subject: "", message: "" },
  });

  async function onSubmit(values: ContactValues) {
    try {
      await submitContactMessage({ data: values });
      toast.success("تم إرسال رسالتك — سنعود إليك قريباً.");
      setSubmitted(true);
      form.reset();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "حدث خطأ غير متوقع";
      toast.error(msg);
    }
  }

  return (
    <section className="mx-auto max-w-4xl px-4 py-16">
      <div className="rounded-3xl glass-strong p-6 sm:p-10">
        <div className="text-xs font-bold text-cyan-300">Switch | سويتش</div>
        <h1 className="mt-3 text-3xl font-black text-white sm:text-5xl">تواصل معنا</h1>
        <p className="mt-4 text-sm leading-8 text-cyan-100/75 sm:text-base">
          نحن هنا للمساعدة. أرسل استفسارك أو ملاحظتك وسنرد عليك خلال 24 ساعة. للأمور العاجلة راسلنا
          على{" "}
          <a className="font-bold text-cyan-300 hover:text-white" href="mailto:switch@swiitch.sa">
            switch@swiitch.sa
          </a>
          .
        </p>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
          <div>
            {submitted ? (
              <div className="rounded-2xl border border-cyan-300/40 bg-cyan-300/10 p-8 text-center">
                <div className="text-lg font-black text-white">تم استلام رسالتك ✓</div>
                <p className="mt-2 text-sm text-cyan-100/80">
                  شكراً لتواصلك معنا. سنراجع رسالتك ونرد عليك على بريدك الإلكتروني قريباً.
                </p>
                <Button variant="secondary" className="mt-6" onClick={() => setSubmitted(false)}>
                  إرسال رسالة أخرى
                </Button>
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">الاسم الكامل</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="مثال: عبدالله محمد" autoComplete="name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">البريد الإلكتروني</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="email"
                            placeholder="you@example.com"
                            autoComplete="email"
                            dir="ltr"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">الموضوع</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="مثال: استفسار عن طلب رقم #1234" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">الرسالة</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={6} placeholder="اكتب تفاصيل استفسارك هنا..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    disabled={form.formState.isSubmitting}
                    className="w-full sm:w-auto"
                  >
                    {form.formState.isSubmitting ? "جاري الإرسال..." : "إرسال الرسالة"}
                  </Button>
                </form>
              </Form>
            )}
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="text-sm font-bold text-white">البريد الإلكتروني</div>
              <a
                className="mt-2 block text-sm text-cyan-300 hover:text-white"
                href="mailto:switch@swiitch.sa"
                dir="ltr"
              >
                switch@swiitch.sa
              </a>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="text-sm font-bold text-white">وقت الرد</div>
              <p className="mt-2 text-sm text-cyan-100/75">
                نرد على معظم الاستفسارات خلال 24 ساعة عمل. الطلبات المتعلقة بأكواد معطوبة تُعالج
                بأولوية.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="text-sm font-bold text-white">قبل أن تراسلنا</div>
              <p className="mt-2 text-sm text-cyan-100/75">
                تحقق من{" "}
                <a href="/faq" className="font-bold text-cyan-300 hover:text-white">
                  الأسئلة الشائعة
                </a>{" "}
                — قد تجد إجابتك فوراً.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
