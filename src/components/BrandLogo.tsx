import { useId } from "react";

type BrandLogoProps = {
  compact?: boolean;
  className?: string;
};

// Neon circular mark matching the brand artwork (public/brand/switch-logo-neon.png):
// a tech ring, a bold S, and a double-headed diagonal arrow crossing it,
// all on a cyan → blue → magenta gradient.
export function BrandLogo({ compact = false, className = "" }: BrandLogoProps) {
  // Per-instance gradient id: BrandLogo renders in both the header and footer,
  // so a hard-coded id would be duplicated in one document and url(#id) could
  // resolve to the wrong <linearGradient> in some browsers.
  const gradientId = useId();
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`} aria-label="Switch سويتش">
      <svg
        viewBox="0 0 64 64"
        role="img"
        aria-hidden="true"
        className="h-10 w-10 shrink-0 drop-shadow-[0_0_16px_oklch(0.8_0.19_215/0.55)]"
      >
        <defs>
          <linearGradient id={gradientId} x1="10" y1="54" x2="54" y2="10">
            <stop offset="0" stopColor="#22d3ee" />
            <stop offset="0.5" stopColor="#4f6df5" />
            <stop offset="1" stopColor="#e04df6" />
          </linearGradient>
        </defs>

        {/* Tech ring with breaks + accent dots */}
        <circle
          cx="32"
          cy="32"
          r="28.5"
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="66 7 44 7 46 9"
        />
        <circle cx="8.5" cy="20" r="1.8" fill="#22d3ee" />
        <circle cx="55.5" cy="44" r="1.8" fill="#e04df6" />

        {/* Bold S */}
        <path
          d="M41.5 20.5H28.5a7 7 0 0 0 0 14h7a7 7 0 0 1 0 14H22.5"
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="7.5"
          strokeLinecap="round"
        />

        {/* Double-headed diagonal arrow */}
        <path
          d="M18.5 45.5 45.5 18.5"
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="3.6"
          strokeLinecap="round"
        />
        <path d="M49.5 14.5l-2.2 8.4-6.2-6.2z" fill="#e04df6" />
        <path d="M14.5 49.5l2.2-8.4 6.2 6.2z" fill="#22d3ee" />
      </svg>

      {!compact && (
        <span className="leading-none">
          <span className="block bg-gradient-to-l from-[#e04df6] via-[#4f6df5] to-[#22d3ee] bg-clip-text text-lg font-black tracking-[-0.04em] text-transparent">
            Switch
          </span>
          <span className="mt-1 block text-[10px] font-bold tracking-[0.16em] text-cyan-200/75">سويتش</span>
        </span>
      )}
    </span>
  );
}
