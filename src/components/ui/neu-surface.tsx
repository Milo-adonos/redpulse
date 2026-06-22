import { cn } from "@/lib/utils";

export function NeuSurface({
  children,
  className,
  inset = false,
}: {
  children: React.ReactNode;
  className?: string;
  inset?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/[0.06]",
        inset ? "neu-inset bg-black/30" : "neu-surface bg-[hsl(var(--surface-cold))]",
        className,
      )}
    >
      {children}
    </div>
  );
}
