import { cn } from "@/lib/utils";

export function GlassPanel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/[0.06] bg-white/[0.03] shadow-glass backdrop-blur-xl",
        className,
      )}
    >
      {children}
    </div>
  );
}
