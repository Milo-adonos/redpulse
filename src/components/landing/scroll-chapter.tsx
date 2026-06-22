"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { cn } from "@/lib/utils";
import { GeometricIcon } from "./geometric-icon";

type IconVariant = "discover" | "reply" | "shield" | "pulse";

export function ScrollChapter({
  id,
  chapter,
  title,
  headline,
  body,
  quote,
  icon,
  align = "left",
  children,
}: {
  id: string;
  chapter: string;
  title: string;
  headline: string;
  body: string;
  quote?: string;
  icon: IconVariant;
  align?: "left" | "right";
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const opacity = useTransform(scrollYProgress, [0, 0.25, 0.75, 1], [0, 1, 1, 0]);
  const y = useTransform(scrollYProgress, [0, 0.25, 0.75, 1], [48, 0, 0, -48]);
  const visualScale = useTransform(scrollYProgress, [0, 0.35, 0.65, 1], [0.94, 1, 1, 0.96]);

  const textBlock = (
    <motion.div style={{ opacity, y }} className="flex flex-col justify-center">
      <div className="mb-6 flex items-center gap-3">
        <GeometricIcon variant={icon} className="text-primary" />
        <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/40">
          {chapter}
        </span>
      </div>
      <p className="text-[13px] font-medium text-primary/90">{title}</p>
      <h2 className="mt-4 max-w-md text-3xl font-semibold leading-[1.1] tracking-[-0.03em] text-white sm:text-4xl lg:text-[2.75rem]">
        {headline}
      </h2>
      <p className="mt-5 max-w-md text-base leading-relaxed text-white/45">{body}</p>
      {quote && (
        <blockquote className="mt-8 border-l border-primary/40 pl-4 text-sm italic text-white/35">
          {quote}
        </blockquote>
      )}
    </motion.div>
  );

  const visualBlock = (
    <motion.div style={{ opacity, scale: visualScale }} className="relative">
      {children}
    </motion.div>
  );

  return (
    <section
      id={id}
      ref={ref}
      className="relative min-h-[90vh] scroll-mt-24 py-24 sm:py-32"
    >
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 sm:gap-16 sm:px-8 lg:grid-cols-2 lg:gap-20">
        {align === "left" ? (
          <>
            {textBlock}
            {visualBlock}
          </>
        ) : (
          <>
            <div className="lg:order-2">{textBlock}</div>
            <div className="lg:order-1">{visualBlock}</div>
          </>
        )}
      </div>
    </section>
  );
}

export function ChapterDivider() {
  return (
    <div className="mx-auto max-w-6xl px-5 sm:px-8">
      <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  );
}

export function StickyLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-[11px] text-white/50",
        className,
      )}
    >
      {children}
    </span>
  );
}
