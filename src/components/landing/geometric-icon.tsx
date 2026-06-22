import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type IconVariant = "discover" | "reply" | "shield" | "pulse";

const paths: Record<IconVariant, ReactNode> = {
  discover: (
    <>
      <circle cx="12" cy="12" r="3" className="fill-primary" />
      <circle cx="12" cy="12" r="8" className="fill-none stroke-current stroke-[1.5]" />
      <line x1="12" y1="4" x2="12" y2="7" className="stroke-current stroke-[1.5]" />
      <line x1="12" y1="17" x2="12" y2="20" className="stroke-current stroke-[1.5]" />
    </>
  ),
  reply: (
    <>
      <rect x="4" y="6" width="16" height="10" rx="2" className="fill-none stroke-current stroke-[1.5]" />
      <path d="M8 16 L12 19 L16 16" className="fill-none stroke-current stroke-[1.5]" />
    </>
  ),
  shield: (
    <path
      d="M12 3 L19 6.5 V12 C19 16.5 15.5 19.5 12 21 C8.5 19.5 5 16.5 5 12 V6.5 Z"
      className="fill-none stroke-current stroke-[1.5]"
    />
  ),
  pulse: (
    <>
      <line x1="4" y1="12" x2="20" y2="12" className="stroke-current stroke-[1.5]" />
      <polyline points="8,12 10,8 14,16 16,12" className="fill-none stroke-primary stroke-[1.5]" />
    </>
  ),
};

export function GeometricIcon({
  variant,
  className,
}: {
  variant: IconVariant;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("h-5 w-5 text-muted-foreground", className)}
      aria-hidden
    >
      {paths[variant]}
    </svg>
  );
}
