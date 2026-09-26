import { useId, type ReactNode } from "react";

interface SectionHeadingProps {
  title: string;
  eyebrow?: string;
  description?: string;
  action?: ReactNode;
  align?: "start" | "center";
  as?: "h1" | "h2";
}

export function SectionHeading({
  title,
  eyebrow,
  description,
  action,
  align = "start",
  as: Heading = "h2",
}: SectionHeadingProps) {
  const reactId = useId();
  const headingId = `switch-section-${reactId.replace(/:/g, "")}`;
  const isCentered = align === "center";

  return (
    <header
      aria-labelledby={headingId}
      className={`flex gap-4 ${
        isCentered
          ? "flex-col items-center text-center"
          : "items-end justify-between"
      }`}
    >
      <div className={isCentered ? "max-w-2xl" : "min-w-0"}>
        {eyebrow ? (
          <p className="mb-2 text-xs font-black tracking-wide text-cyan-300">
            {eyebrow}
          </p>
        ) : null}
        <Heading
          id={headingId}
          className="text-2xl font-black leading-tight text-white sm:text-3xl"
        >
          {title}
        </Heading>
        {description ? (
          <p className="mt-2 text-sm leading-7 text-cyan-100/70">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
