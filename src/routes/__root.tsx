import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { type ReactNode } from "react";

import appCss from "../styles.css?url";
import { absoluteUrl, productionConfig } from "../config/production";
import { canonicalPathFor, robotsContentFor } from "../lib/seo";
import { AnnouncementBar } from "../components/AnnouncementBar";
import { SiteHeader } from "../components/SiteHeader";
import { SiteFooter } from "../components/SiteFooter";
import { CartProvider } from "../store/cart";

function NotFoundComponent() {
  const quickLinks: { to: "/games" | "/cards" | "/subscriptions" | "/offers" | "/catalog"; label: string }[] = [
    { to: "/games", label: "الألعاب" },
    { to: "/cards", label: "البطاقات" },
    { to: "/subscriptions", label: "الاشتراكات" },
    { to: "/offers", label: "العروض" },
    { to: "/catalog", label: "الكتالوج" },
  ];
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-2xl rounded-3xl glass-strong p-8 text-center sm:p-12">
        <div className="text-8xl font-black neon-text sm:text-9xl">404</div>
        <h1 className="mt-4 text-2xl font-black text-white sm:text-3xl">الصفحة غير موجودة</h1>
        <p className="mt-3 text-sm leading-8 text-cyan-100/70 sm:text-base">
          الرابط الذي تبحث عنه غير متوفر أو تم نقله. جرّب أحد الأقسام الشائعة أو عد إلى الصفحة الرئيسية.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {quickLinks.map((link) => (
            <Link key={link.to} to={link.to} className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold text-white hover:bg-white/10 sm:text-sm">
              {link.label}
            </Link>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/" className="inline-flex rounded-xl cosmic-gradient px-6 py-2.5 text-sm font-bold text-[oklch(0.13_0.04_270)]">العودة للرئيسية</Link>
          <Link to="/contact" className="inline-flex rounded-xl border border-white/15 bg-white/5 px-6 py-2.5 text-sm font-bold text-white hover:bg-white/10">تواصل معنا</Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md rounded-2xl glass p-8 text-center">
        <h1 className="text-lg font-bold text-white">حصل خطأ غير متوقع</h1>
        <p className="mt-2 text-sm text-cyan-100/70">يمكنك المحاولة مجددًا أو العودة للرئيسية.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="rounded-xl cosmic-gradient px-4 py-2 text-sm font-bold text-[oklch(0.13_0.04_270)]"
          >
            إعادة المحاولة
          </button>
          <a href="/" className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white">الرئيسية</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: ({ matches }) => {
    const pathname = matches.at(-1)?.pathname;
    const canonicalPath = canonicalPathFor(pathname);
    const pageUrl = pathname ? absoluteUrl(pathname) : productionConfig.siteUrl;

    return {
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
        { name: "theme-color", content: "#071229" },
        { title: "Switch | سويتش — متجر بطاقات رقمية وشحن ألعاب واشتراكات" },
        { name: "description", content: `سويتش متجر رقمي سعودي للبطاقات، شحن الألعاب، والاشتراكات. تسليم رقمي سريع، دفع آمن، ودعم رسمي عبر ${productionConfig.supportEmail}.` },
        { name: "author", content: "Switch | سويتش" },
        { name: "robots", content: robotsContentFor(pathname) },
        { property: "og:site_name", content: "Switch | سويتش" },
        { property: "og:title", content: "Switch | سويتش — كل عالمك الرقمي" },
        { property: "og:description", content: "ألعاب وبطاقات رقمية واشتراكات بتجربة سعودية سريعة وآمنة." },
        { property: "og:type", content: "website" },
        { property: "og:url", content: pageUrl },
        { property: "og:image", content: absoluteUrl("/og-switch.png") },
        { property: "og:image:type", content: "image/png" },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { property: "og:image:alt", content: "Switch سويتش — كل عالمك الرقمي" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: "Switch | سويتش — كل عالمك الرقمي" },
        { name: "twitter:description", content: "ألعاب وبطاقات رقمية واشتراكات بتجربة سعودية سريعة وآمنة." },
        { name: "twitter:image", content: absoluteUrl("/og-switch.png") },
      ],
      links: [
        { rel: "stylesheet", href: appCss },
        ...(canonicalPath ? [{ rel: "canonical", href: absoluteUrl(canonicalPath) }] : []),
        { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
        { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
        { rel: "manifest", href: "/manifest.webmanifest" },
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&family=Cairo:wght@600;800&display=swap",
        },
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Switch | سويتش",
            url: productionConfig.siteUrl,
            logo: absoluteUrl("/icons/icon-512.png"),
            email: productionConfig.supportEmail,
            description: "متجر رقمي سعودي للألعاب والبطاقات والاشتراكات الرقمية.",
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "Switch | سويتش",
            url: productionConfig.siteUrl,
            inLanguage: "ar",
          }),
        },
      ],
    };
  },
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head><HeadContent /></head>
      <body>
        <a
          href="#main-content"
          className="fixed right-4 top-4 z-[100] -translate-y-24 rounded-xl cosmic-gradient px-4 py-2 text-sm font-black text-[oklch(0.13_0.04_270)] shadow-xl transition-transform focus:translate-y-0"
        >
          انتقل إلى المحتوى
        </a>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <CartProvider>
        <div className="flex min-h-screen flex-col">
          <AnnouncementBar />
          <SiteHeader />
          <main id="main-content" className="flex-1" tabIndex={-1}><Outlet /></main>
          <SiteFooter />
        </div>
      </CartProvider>
    </QueryClientProvider>
  );
}
