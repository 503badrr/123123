type PaymentMarksProps = {
  compact?: boolean;
  selectable?: boolean;
  value?: string;
  onChange?: (value: string) => void;
  allowedMethods?: string[];
};

const methods = [
  { id: "mada", label: "مدى", mark: <MadaMark /> },
  { id: "visa", label: "Visa", mark: <VisaMark /> },
  { id: "mastercard", label: "Mastercard", mark: <MastercardMark /> },
  { id: "apple-pay", label: "Apple Pay", mark: <ApplePayMark /> },
];

export function PaymentMarks({
  compact = false,
  selectable = false,
  value,
  onChange,
  allowedMethods,
}: PaymentMarksProps) {
  const visibleMethods = allowedMethods
    ? methods.filter((method) => allowedMethods.includes(method.id))
    : methods;

  return (
    <div className={`grid ${compact ? "grid-cols-4" : "grid-cols-2 sm:grid-cols-4"} gap-2`}>
      {visibleMethods.map((method) => {
        const active = value === method.id;
        const content = (
          <div
            className={`flex min-h-14 items-center justify-center rounded-xl border px-3 transition ${
              selectable
                ? active
                  ? "border-cyan-300/70 bg-cyan-300/10 shadow-[0_0_24px_-10px_oklch(0.82_0.18_210/0.75)]"
                  : "border-white/10 bg-white/[0.035] hover:border-white/25 hover:bg-white/[0.07]"
                : "border-white/10 bg-white/[0.035]"
            }`}
          >
            {method.mark}
          </div>
        );

        if (!selectable) return <div key={method.id}>{content}</div>;

        return (
          <label key={method.id} className="cursor-pointer" aria-label={method.label}>
            <input
              type="radio"
              name="payment-method"
              value={method.id}
              checked={active}
              onChange={() => onChange?.(method.id)}
              className="sr-only"
            />
            {content}
          </label>
        );
      })}
    </div>
  );
}

function MadaMark() {
  return (
    <svg viewBox="0 0 108 36" className="h-7 w-auto" role="img" aria-label="مدى mada">
      <rect width="108" height="36" rx="8" fill="#ffffff" />
      <rect x="12" y="7" width="36" height="9.5" rx="2" fill="#259bd6" />
      <rect x="12" y="19.5" width="36" height="9.5" rx="2" fill="#84b740" />
      <text x="74" y="24.5" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="800" fontSize="15" fill="#1a1f36">
        mada
      </text>
    </svg>
  );
}

function VisaMark() {
  return (
    <svg viewBox="0 0 86 28" className="h-6 w-auto" role="img" aria-label="Visa">
      <text x="43" y="22" textAnchor="middle" fontFamily="Arial, sans-serif" fontStyle="italic" fontWeight="900" fontSize="25" fill="#ffffff">
        VISA
      </text>
    </svg>
  );
}

function MastercardMark() {
  return (
    <svg viewBox="0 0 110 34" className="h-7 w-auto" role="img" aria-label="Mastercard">
      <circle cx="38" cy="17" r="14" fill="#eb001b" />
      <circle cx="54" cy="17" r="14" fill="#f79e1b" fillOpacity="0.92" />
      <text x="83" y="21" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="8" fill="#ffffff">
        mastercard
      </text>
    </svg>
  );
}

function ApplePayMark() {
  return (
    <svg viewBox="0 0 104 32" className="h-7 w-auto" role="img" aria-label="Apple Pay">
      <g transform="translate(24 4) scale(0.024)" fill="#ffffff">
        <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.6-57-155.5-127C46.7 790.7 0 663 0 541.8c0-194.4 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z" />
      </g>
      <text x="66" y="23" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="800" fontSize="19" fill="#ffffff">
        Pay
      </text>
    </svg>
  );
}
