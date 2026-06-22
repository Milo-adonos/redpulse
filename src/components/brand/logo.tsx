import { cn } from "@/lib/utils";

type LogoVariant = "full" | "icon" | "wordmark";
type LogoTheme = "light" | "dark";

function LogoIcon({
  theme,
  className,
}: {
  theme: LogoTheme;
  className?: string;
}) {
  const fg = theme === "light" ? "#FAFAFA" : "#0A0A0B";
  const accent = "#F97316";

  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={cn("h-8 w-8 shrink-0", className)}
      aria-hidden={true}
    >
      <rect
        width="32"
        height="32"
        rx="8"
        fill={theme === "light" ? "#111113" : "#FAFAFA"}
      />
      <path
        d="M8 20 Q16 8 24 20"
        stroke={accent}
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M10 22 Q16 12 22 22"
        stroke={fg}
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.5"
      />
      <circle cx="16" cy="16" r="2" fill={accent} />
    </svg>
  );
}

export function Logo({
  variant = "full",
  theme = "light",
  className,
}: {
  variant?: LogoVariant;
  theme?: LogoTheme;
  className?: string;
}) {
  const fg = theme === "light" ? "#FAFAFA" : "#0A0A0B";

  if (variant === "icon") {
    return (
      <span className={cn("inline-flex", className)} aria-label="RedPulse">
        <LogoIcon theme={theme} />
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoIcon theme={theme} />
      {(variant === "full" || variant === "wordmark") && (
        <span
          className="text-[15px] font-bold tracking-[-0.04em]"
          style={{ color: fg }}
        >
          RedPulse
        </span>
      )}
    </span>
  );
}

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      className={cn("h-12 w-12", className)}
      aria-hidden
    >
      <path
        d="M8 32 Q24 10 40 32"
        stroke="#F97316"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M12 34 Q24 16 36 34"
        stroke="#FAFAFA"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.4"
      />
      <circle cx="24" cy="24" r="3" fill="#F97316" />
    </svg>
  );
}
