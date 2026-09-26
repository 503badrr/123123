import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, ShoppingCart, X } from "lucide-react";
import { useCart } from "../store/cart";
import { BrandLogo } from "./BrandLogo";

const links = [
  { to: "/", label: "الرئيسية" },
  { to: "/catalog", label: "الكتالوج" },
  { to: "/games", label: "الألعاب" },
  { to: "/cards", label: "البطاقات" },
  { to: "/subscriptions", label: "الاشتراكات" },
  { to: "/offers", label: "العروض" },
  { to: "/account", label: "حسابي" },
] as const;

const navLinkClass =
  "flex min-h-11 items-center rounded-xl px-3 text-sm font-bold text-cyan-50/70 outline-none transition hover:bg-white/[0.06] hover:text-white focus-visible:ring-2 focus-visible:ring-cyan-300";
const activeNavLinkClass =
  "flex min-h-11 items-center rounded-xl border border-cyan-200/15 bg-cyan-200/[0.08] px-3 text-sm font-black text-white shadow-inner";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { count } = useCart();

  return (
    <header className="sticky top-0 z-40 border-b border-cyan-100/10 bg-[oklch(0.09_0.035_270/0.86)] shadow-[0_14px_45px_-34px_oklch(0.82_0.18_210/0.45)] backdrop-blur-2xl">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 py-2.5">
        <Link
          to="/"
          className="rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          aria-label="Switch سويتش — الرئيسية"
        >
          <BrandLogo />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="التنقل الرئيسي">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={navLinkClass}
              activeProps={{ className: activeNavLinkClass }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to="/cart"
            className="switch-button-secondary relative h-11 w-11 p-0 text-white"
            aria-label={`السلة${count ? `، ${count} منتجات` : ""}`}
          >
            <ShoppingCart className="h-[18px] w-[18px]" aria-hidden="true" />
            {count > 0 ? (
              <span className="absolute -left-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full cosmic-gradient px-1 text-[10px] font-black text-[oklch(0.13_0.04_270)] shadow-[0_6px_18px_-8px_oklch(0.82_0.18_210/0.9)]">
                {count}
              </span>
            ) : null}
          </Link>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="switch-button-secondary h-11 w-11 p-0 text-white lg:hidden"
            aria-label={open ? "إغلاق القائمة" : "فتح القائمة"}
            aria-expanded={open}
            aria-controls="switch-mobile-menu"
          >
            {open ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-cyan-100/10 bg-[oklch(0.09_0.035_270/0.97)] backdrop-blur-2xl lg:hidden">
          <nav
            id="switch-mobile-menu"
            className="mx-auto grid max-w-7xl gap-1 px-4 py-3"
            aria-label="قائمة الجوال"
          >
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setOpen(false)}
                className={navLinkClass}
                activeProps={{ className: activeNavLinkClass }}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
