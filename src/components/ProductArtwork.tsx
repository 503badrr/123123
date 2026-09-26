import type { Category, Product } from "../data/products";

const categoryThemes: Record<
  Category,
  { label: string; accent: string; secondary: string }
> = {
  games: { label: "GAME", accent: "#66d9ff", secondary: "#3b5bdb" },
  cards: { label: "CARD", accent: "#ffd43b", secondary: "#f76707" },
  subscriptions: { label: "SUB", accent: "#f783ff", secondary: "#7048e8" },
  offers: { label: "OFFER", accent: "#69db7c", secondary: "#087f5b" },
};

export function ProductArtwork({ product }: { product: Product }) {
  const theme = categoryThemes[product.category];
  const patternId = `pattern-${product.id}`;
  const glowId = `glow-${product.id}`;

  return (
    <svg viewBox="0 0 640 480" className="h-full w-full" role="img" aria-label={product.name} preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id={glowId} cx="50%" cy="45%" r="65%">
          <stop offset="0" stopColor={theme.accent} stopOpacity="0.42" />
          <stop offset="0.55" stopColor={theme.secondary} stopOpacity="0.2" />
          <stop offset="1" stopColor="#071229" stopOpacity="0" />
        </radialGradient>
        <pattern id={patternId} width="36" height="36" patternUnits="userSpaceOnUse">
          <path d="M36 0H0V36" fill="none" stroke="#ffffff" strokeOpacity="0.07" />
        </pattern>
        <linearGradient id={`${glowId}-card`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#ffffff" stopOpacity="0.2" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.04" />
        </linearGradient>
      </defs>
      <rect width="640" height="480" fill="#071229" />
      <rect width="640" height="480" fill={`url(#${glowId})`} />
      <rect width="640" height="480" fill={`url(#${patternId})`} />
      <circle cx="104" cy="84" r="94" fill={theme.accent} opacity="0.08" />
      <circle cx="564" cy="416" r="132" fill={theme.secondary} opacity="0.14" />

      <g transform="translate(190 74) rotate(-7 130 166)">
        <rect x="0" y="0" width="260" height="332" rx="34" fill={`url(#${glowId}-card)`} stroke="#ffffff" strokeOpacity="0.2" strokeWidth="2" />
        <rect x="20" y="20" width="220" height="292" rx="24" fill="#061020" fillOpacity="0.66" stroke={theme.accent} strokeOpacity="0.34" />
        <circle cx="130" cy="134" r="76" fill={theme.secondary} opacity="0.23" />
        <circle cx="130" cy="134" r="60" fill="none" stroke={theme.accent} strokeOpacity="0.55" strokeWidth="3" />
        <text x="130" y="154" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="900" fontSize={theme.label.length > 4 ? "34" : "48"} fill={theme.accent}>
          {theme.label}
        </text>
        <rect x="53" y="236" width="154" height="10" rx="5" fill="#ffffff" opacity="0.22" />
        <rect x="78" y="260" width="104" height="8" rx="4" fill={theme.accent} opacity="0.45" />
      </g>

      <g opacity="0.85">
        <path d="M60 372h118" stroke={theme.accent} strokeWidth="4" strokeLinecap="round" />
        <path d="M60 390h76" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="3" strokeLinecap="round" />
      </g>
    </svg>
  );
}
