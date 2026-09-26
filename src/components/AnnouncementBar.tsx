import { Link } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck, Sparkles } from "lucide-react";

export function AnnouncementBar() {
  return (
    <div className="relative z-50 overflow-hidden border-b border-cyan-100/10 bg-[oklch(0.135_0.055_268)] text-white">
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,transparent_0%,oklch(0.85_0.18_200/0.09)_42%,transparent_68%)] bg-[length:220%_100%] animate-shimmer"
        aria-hidden="true"
      />
      <div className="relative mx-auto flex min-h-10 max-w-7xl items-center justify-center gap-2 px-4 py-1.5 text-center text-[10px] font-bold sm:text-xs">
        <Sparkles className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
        <span>عروض رقمية مختارة حتى 25%</span>
        <span className="hidden text-cyan-100/45 sm:inline" aria-hidden="true">
          •
        </span>
        <span className="hidden items-center gap-1.5 text-cyan-100/75 sm:inline-flex">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" aria-hidden="true" />
          دفع آمن وتسليم بعد التأكيد
        </span>
        <Link to="/offers" className="switch-section-link mr-0.5 min-h-9 px-2">
          شاهد العروض
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
