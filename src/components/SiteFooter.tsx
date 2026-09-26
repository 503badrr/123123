import { Link } from "@tanstack/react-router";
import { BrandLogo } from "./BrandLogo";
import { productionConfig } from "../config/production";

const footerLinkClass =
  "inline-flex min-h-10 items-center rounded-lg px-1 text-sm text-cyan-100/65 outline-none transition hover:text-white focus-visible:ring-2 focus-visible:ring-cyan-300";

export function SiteFooter() {
  return (
    <footer className="defer-render mt-20 border-t border-cyan-100/10 bg-[oklch(0.075_0.025_270/0.78)] backdrop-blur-xl">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-[1.35fr_0.8fr_0.9fr_0.9fr]">
        <div className="max-w-sm">
          <BrandLogo />
          <p className="mt-4 text-sm leading-7 text-cyan-100/65">
            متجر رقمي سعودي للبطاقات، شحن الألعاب، والاشتراكات. دفع آمن، تجربة سهلة، وتسليم رقمي بعد تأكيد الطلب.
          </p>
          <p className="mt-4 text-xs leading-6 text-cyan-100/45">
            {productionConfig.siteHost}
            <span className="mx-2" aria-hidden="true">—</span>
            الدعم:
            <a
              className="mr-1 inline-flex min-h-10 items-center rounded-lg font-bold text-cyan-200 outline-none transition hover:text-white focus-visible:ring-2 focus-visible:ring-cyan-300"
              href={`mailto:${productionConfig.supportEmail}`}
            >
              {productionConfig.supportEmail}
            </a>
          </p>
        </div>

        <FooterColumn title="المتجر">
          <li><Link to="/catalog" className={footerLinkClass}>الكتالوج</Link></li>
          <li><Link to="/games" className={footerLinkClass}>الألعاب</Link></li>
          <li><Link to="/cards" className={footerLinkClass}>البطاقات</Link></li>
          <li><Link to="/subscriptions" className={footerLinkClass}>الاشتراكات</Link></li>
          <li><Link to="/offers" className={footerLinkClass}>العروض</Link></li>
        </FooterColumn>

        <FooterColumn title="حسابك والدعم">
          <li><Link to="/account" className={footerLinkClass}>حسابي</Link></li>
          <li><Link to="/cart" className={footerLinkClass}>السلة</Link></li>
          <li><Link to="/checkout" className={footerLinkClass}>طلب جديد</Link></li>
          <li><Link to="/contact" className={footerLinkClass}>تواصل معنا</Link></li>
          <li><Link to="/faq" className={footerLinkClass}>الأسئلة الشائعة</Link></li>
        </FooterColumn>

        <FooterColumn title="السياسات">
          <li><Link to="/about" className={footerLinkClass}>من نحن</Link></li>
          <li><Link to="/privacy" className={footerLinkClass}>سياسة الخصوصية</Link></li>
          <li><Link to="/terms" className={footerLinkClass}>الشروط والأحكام</Link></li>
          <li><Link to="/refund-policy" className={footerLinkClass}>سياسة الاسترجاع</Link></li>
          <li><Link to="/digital-delivery" className={footerLinkClass}>تسليم المنتجات الرقمية</Link></li>
        </FooterColumn>
      </div>

      <div className="border-t border-cyan-100/10 px-4 py-5 text-center text-xs leading-6 text-cyan-100/45">
        © 2026 Switch | سويتش — جميع الحقوق محفوظة. المنتجات الرقمية تُسلّم حسب حالة الطلب وسياسة المتجر.
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-black text-white">{title}</h2>
      <ul className="space-y-0.5">{children}</ul>
    </div>
  );
}
