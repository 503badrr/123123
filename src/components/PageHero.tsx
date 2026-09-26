type PageHeroProps = {
  badge: string;
  title: string;
  subtitle: string;
  /** Tailwind gradient stops, e.g. "from-cyan-500 to-blue-800". */
  gradient: string;
  /** Optional background artwork (from public/); text keeps an overlay for contrast. */
  imageUrl?: string;
};

export function PageHero({ badge, title, subtitle, gradient, imageUrl }: PageHeroProps) {
  return (
    <section
      className={`switch-surface relative mb-9 min-h-52 overflow-hidden rounded-3xl bg-gradient-to-l ${gradient} p-6 sm:min-h-64 sm:p-9`}
    >
      {imageUrl ? (
        <>
          <img
            src={imageUrl}
            alt=""
            fetchPriority="high"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover object-left"
          />
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-l from-[oklch(0.07_0.03_270/0.94)] via-[oklch(0.08_0.035_270/0.72)] to-[oklch(0.08_0.035_270/0.34)]"
            aria-hidden="true"
          />
        </>
      ) : (
        <>
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.14] [background-image:linear-gradient(115deg,transparent_0%,oklch(1_0_0/0.32)_45%,transparent_60%)]"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -left-10 -top-12 h-44 w-44 rounded-full bg-cyan-100/10 blur-3xl"
            aria-hidden="true"
          />
        </>
      )}

      <div className="relative flex min-h-40 max-w-2xl flex-col justify-center sm:min-h-48">
        <span className="inline-flex w-fit rounded-full border border-cyan-100/12 bg-black/20 px-3 py-1 text-[11px] font-black tracking-wide text-cyan-50/90 backdrop-blur">
          {badge}
        </span>
        <h1 className="mt-4 text-3xl font-black leading-tight text-white drop-shadow-sm sm:text-5xl">
          {title}
        </h1>
        <p className="mt-3 text-sm leading-7 text-cyan-50/75 sm:text-base sm:leading-8">
          {subtitle}
        </p>
      </div>
    </section>
  );
}
