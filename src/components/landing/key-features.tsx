"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { ArrowUpRight, Sparkles } from "lucide-react";

const REPLY_MESSAGE =
  "been using redpulse for a few weeks and honestly it changed how i find leads on reddit ngl... the replies feel so natural nobody would guess it's ai fr 💀";

const VOICE_STATS = [
  { label: "Tone", value: "Direct, helpful, casual" },
  { label: "Avg length", value: "2-3 lines" },
  { label: "Common abbrevs", value: "ngl, tbh, fr, lowkey, idk" },
  { label: "Typical emojis", value: "💀 😭 🚀 ✨" },
  { label: "Opener style", value: "wait / okay but / ngl" },
] as const;

function useScrollActive(threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: threshold });
  return { ref, isInView };
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function useCountUp(
  target: number,
  active: boolean,
  duration = 1500,
  delay = 0,
  decimals = 0,
) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) return;

    let frame: number;
    const start = performance.now() + delay;

    const tick = (now: number) => {
      if (now < start) {
        frame = requestAnimationFrame(tick);
        return;
      }
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const current = target * easeOutCubic(progress);
      setValue(
        decimals > 0
          ? parseFloat(current.toFixed(decimals))
          : Math.round(current),
      );
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, target, duration, delay, decimals]);

  return value;
}

function formatNumber(n: number) {
  return n.toLocaleString("en-US");
}

function FeatureCardShell({
  children,
  className = "",
  index,
}: {
  children: React.ReactNode;
  className?: string;
  index: number;
}) {
  const { ref, isInView } = useScrollActive(0.2);

  return (
    <motion.article
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.4, ease: "easeOut", delay: index * 0.1 }}
      className={`overflow-hidden rounded-xl border border-[#1a1a1a] bg-[#0d0d0d] p-7 transition-[border-color] duration-200 ease-in-out hover:border-[#2a2a2a] ${className}`}
    >
      {children}
    </motion.article>
  );
}

function ReplyMockup() {
  const { ref, isInView } = useScrollActive(0.2);
  const [text, setText] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!isInView) return;

    setText("");
    setDone(false);
    let i = 0;
    const interval = setInterval(() => {
      i += 1;
      setText(REPLY_MESSAGE.slice(0, i));
      if (i >= REPLY_MESSAGE.length) {
        clearInterval(interval);
        setDone(true);
      }
    }, 30);

    return () => clearInterval(interval);
  }, [isInView]);

  return (
    <div
      ref={ref}
      className="mt-5 rounded-lg border border-[#1a1a1a] bg-[#111111] p-4"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-[#f97316]" strokeWidth={2} />
          <span className="text-[12px] text-[#666666]">AI suggested reply</span>
        </div>
        <span className="text-[12px] text-[#666666]">Try another</span>
      </div>

      <p className="mt-3 min-h-[88px] text-[14px] leading-[1.6] text-[#e0e0e0]">
        {text}
        {!done && (
          <span className="ml-0.5 inline-block h-[14px] w-[2px] animate-pulse bg-[#f97316]" />
        )}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-[rgba(34,197,94,0.25)] bg-[rgba(34,197,94,0.1)] px-2.5 py-1 text-[11px] text-[#22c55e]">
          Anti-ban 10/10
        </span>
        <div className="flex flex-wrap gap-1.5">
          <span className="rounded-full bg-[rgba(249,115,22,0.15)] px-2.5 py-1 text-[11px] text-[#f97316]">
            Natural
          </span>
          <span className="rounded-full border border-[#222222] px-2.5 py-1 text-[11px] text-[#666666]">
            Casual
          </span>
          <span className="rounded-full border border-[#222222] px-2.5 py-1 text-[11px] text-[#666666]">
            Subtle
          </span>
        </div>
        <button
          type="button"
          className="ml-auto rounded-md bg-[#f97316] px-3 py-1.5 text-[12px] text-[#e0e0e0] transition-colors duration-150 ease-in-out hover:bg-[#ea6c0a]"
        >
          Copy & send
        </button>
      </div>
    </div>
  );
}

function WarmupMockup() {
  const { ref, isInView } = useScrollActive(0.2);
  const karma = useCountUp(1240, isInView, 1800);

  const sparkPath = "M 0 32 Q 20 28, 40 24 T 80 18 T 120 12 T 160 8 T 200 4";
  const pathLength = 220;

  return (
    <div
      ref={ref}
      className="mt-5 rounded-lg border border-[#1a1a1a] bg-[#111111] p-5"
    >
      <p className="text-[11px] uppercase tracking-wide text-[#444444]">Karma</p>

      <div className="mt-2 flex items-center gap-3">
        <span className="text-[48px] font-bold leading-none text-[#f97316]">
          +{formatNumber(karma)}
        </span>
        <motion.span
          animate={isInView ? { y: [0, -4, 0] } : { y: 0 }}
          transition={{
            duration: 1.2,
            repeat: isInView ? Infinity : 0,
            ease: "easeInOut",
          }}
          className="inline-flex"
        >
          <ArrowUpRight
            className="h-7 w-7 text-[#f97316]"
            style={{ transform: "rotate(-45deg)" }}
            strokeWidth={2.5}
          />
        </motion.span>
      </div>

      <svg
        viewBox="0 0 200 40"
        className="mt-4 h-10 w-full"
        preserveAspectRatio="none"
        aria-hidden
      >
        <motion.path
          d={sparkPath}
          fill="none"
          stroke="#f97316"
          strokeWidth="2"
          strokeLinecap="round"
          initial={{ strokeDasharray: pathLength, strokeDashoffset: pathLength }}
          animate={
            isInView
              ? { strokeDashoffset: 0 }
              : { strokeDashoffset: pathLength }
          }
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
        />
      </svg>
    </div>
  );
}

function CuriosityMockup() {
  const { ref, isInView } = useScrollActive(0.2);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!isInView) {
      setStep(0);
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];

    const clearTimers = () => {
      timers.forEach(clearTimeout);
      timers.length = 0;
    };

    const runCycle = () => {
      clearTimers();
      setStep(1);
      timers.push(setTimeout(() => setStep(2), 1000));
      timers.push(setTimeout(() => setStep(3), 2000));
      timers.push(setTimeout(() => setStep(4), 3000));
    };

    runCycle();
    const loop = setInterval(runCycle, 5000);

    return () => {
      clearTimers();
      clearInterval(loop);
    };
  }, [isInView]);

  const messages = [
    {
      avatar: "R",
      avatarClass: "bg-[#f97316] text-[#080808]",
      text: "been using something for reddit growth that genuinely changed my numbers ngl... idk if it works for everyone tho",
    },
    {
      avatar: "u",
      avatarClass: "bg-[#333333] text-[#888888]",
      text: "wait what is it?? dm me pls 👀",
    },
    {
      avatar: "k",
      avatarClass: "bg-[#333333] text-[#888888]",
      text: "same, i need to know 😭",
    },
  ] as const;

  return (
    <div
      ref={ref}
      className="mt-5 space-y-3 rounded-lg border border-[#1a1a1a] bg-[#111111] p-5"
    >
      {messages.map((msg, i) => (
        <motion.div
          key={msg.avatar}
          initial={{ opacity: 0, y: 6 }}
          animate={
            step > i ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 }
          }
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="flex gap-2.5"
        >
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${msg.avatarClass}`}
          >
            {msg.avatar}
          </span>
          <p className="rounded-lg bg-[#1a1a1a] px-3.5 py-2.5 text-[13px] leading-relaxed text-[#e0e0e0]">
            {msg.text}
          </p>
        </motion.div>
      ))}

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={step > 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        <span className="inline-flex rounded-full border border-[rgba(34,197,94,0.2)] bg-[rgba(34,197,94,0.1)] px-2.5 py-1 text-[12px] text-[#22c55e]">
          3 DMs received
        </span>
      </motion.div>
    </div>
  );
}

function AnalyticsMockup() {
  const { ref, isInView } = useScrollActive(0.2);

  const messages = useCountUp(847, isInView, 1500, 0);
  const karma = useCountUp(1240, isInView, 1500, 200);
  const subreddits = useCountUp(6, isInView, 1500, 400);
  const antiBan = useCountUp(9.4, isInView, 1500, 600, 1);

  const chartPath =
    "M 0 60 C 30 58, 50 52, 80 48 S 140 30, 180 22 S 260 8, 320 4";
  const areaPath = `${chartPath} L 320 80 L 0 80 Z`;
  const pathLength = 400;

  const kpis = [
    { label: "Messages envoyés", value: formatNumber(messages), accent: false },
    { label: "Karma gagné", value: `+${formatNumber(karma)}`, accent: true },
    { label: "Subreddits actifs", value: String(subreddits), accent: false },
    {
      label: "Score anti-ban",
      value: antiBan.toFixed(1),
      accent: false,
      green: true,
    },
  ] as const;

  return (
    <div ref={ref} className="mt-5 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-lg border border-[#1a1a1a] bg-[#111111] px-4 py-3"
          >
            <p className="text-[11px] text-[#666666]">{kpi.label}</p>
            <p
              className={`mt-1 text-[22px] font-semibold ${
                "green" in kpi && kpi.green
                  ? "text-[#22c55e]"
                  : kpi.accent
                    ? "text-[#f97316]"
                    : "text-[#e0e0e0]"
              }`}
            >
              {kpi.value}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-[#1a1a1a] bg-[#111111] p-4">
        <svg viewBox="0 0 320 80" className="h-20 w-full" aria-hidden>
          <defs>
            <linearGradient id="keyFeaturesChartFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f97316" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
            </linearGradient>
          </defs>
          <motion.path
            d={areaPath}
            fill="url(#keyFeaturesChartFill)"
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeOut", delay: 0.4 }}
          />
          <motion.path
            d={chartPath}
            fill="none"
            stroke="#f97316"
            strokeWidth="2"
            strokeLinecap="round"
            initial={{ strokeDasharray: pathLength, strokeDashoffset: pathLength }}
            animate={
              isInView
                ? { strokeDashoffset: 0 }
                : { strokeDashoffset: pathLength }
            }
            transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
          />
        </svg>
      </div>
    </div>
  );
}

function TerminalDots() {
  return (
    <div className="flex gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
      <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
      <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
    </div>
  );
}

function VoiceAnalysisTerminal() {
  const { ref, isInView } = useScrollActive(0.2);

  return (
    <div
      ref={ref}
      className="rounded-lg border border-[#1a1a1a] bg-[#080808] p-5"
    >
      <div className="mb-4 flex items-center gap-3">
        <TerminalDots />
        <p className="flex-1 text-center text-[12px] text-[#666666]">
          r/SaaS · Voice Analysis
        </p>
        <div className="w-[52px]" />
      </div>

      <div className="divide-y divide-[#141414]">
        {VOICE_STATS.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, x: 16 }}
            animate={
              isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 16 }
            }
            transition={{
              duration: 0.35,
              ease: "easeOut",
              delay: index * 0.3,
            }}
            className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
          >
            <span className="text-[11px] uppercase tracking-wide text-[#444444]">
              {stat.label}
            </span>
            <span className="text-right text-[13px] text-[#e0e0e0]">
              {stat.value}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export function KeyFeatures() {
  const { ref: headerRef, isInView: headerInView } = useScrollActive(0.2);

  return (
    <section className="relative w-full bg-[#080808] py-20 sm:py-24">
      <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
        <motion.div
          ref={headerRef}
          initial={{ opacity: 0, y: 20 }}
          animate={
            headerInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }
          }
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="mb-12 sm:mb-16"
        >
          <span className="inline-flex items-center gap-2 rounded-md border border-[#222222] bg-transparent px-3 py-1.5 text-[13px] text-[#888888]">
            <Sparkles className="h-3.5 w-3.5 text-[#f97316]" strokeWidth={2} />
            Key features
          </span>

          <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <h2 className="max-w-[500px] text-[28px] font-bold leading-[1.2] text-[#e0e0e0] sm:text-[36px] lg:w-[60%]">
              Le canal Reddit que vous n&apos;avez jamais vraiment exploité.
            </h2>
            <p className="text-[15px] leading-[1.7] text-[#888888] lg:w-[40%]">
              RedPulse transforme Reddit en canal d&apos;acquisition intentionnel
              avec des réponses directes, du karma naturel et de la curiosité créée.
              Plus rapide que le SEO. Plus authentique que n&apos;importe quelle pub.
            </p>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[13fr_7fr]">
          <FeatureCardShell index={0}>
            <h3 className="text-[18px] font-semibold text-[#e0e0e0]">
              Des réponses indétectables.
            </h3>
            <p className="mt-2 text-[14px] leading-[1.6] text-[#888888]">
              Générées dans le style exact de chaque subreddit. Indétectable.
              Approuvé en un clic.
            </p>
            <ReplyMockup />
          </FeatureCardShell>

          <FeatureCardShell index={1}>
            <h3 className="text-[18px] font-semibold text-[#e0e0e0]">
              Warmup automatique.
            </h3>
            <p className="mt-2 text-[14px] leading-[1.6] text-[#888888]">
              Karma qui monte naturellement. Zéro promotion, 100% authentique.
            </p>
            <WarmupMockup />
          </FeatureCardShell>

          <FeatureCardShell index={2}>
            <h3 className="text-[18px] font-semibold text-[#e0e0e0]">
              Créez de la curiosité.
            </h3>
            <p className="mt-2 text-[14px] leading-[1.6] text-[#888888]">
              Répondez sans jamais mentionner votre produit. Les gens vous
              demandent le lien eux-mêmes.
            </p>
            <CuriosityMockup />
          </FeatureCardShell>

          <FeatureCardShell index={3}>
            <h3 className="text-[18px] font-semibold text-[#e0e0e0]">
              Analytics qui prouvent le ROI.
            </h3>
            <p className="mt-2 text-[14px] leading-[1.6] text-[#888888]">
              Chaque message est tracké. La courbe monte et vous le voyez en temps
              réel.
            </p>
            <AnalyticsMockup />
          </FeatureCardShell>
        </div>

        <motion.article
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.4, ease: "easeOut", delay: 0.4 }}
          className="mt-4 rounded-xl border border-[#1a1a1a] bg-[#0d0d0d] p-8 sm:p-10"
        >
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-12">
            <div>
              <h3 className="text-[24px] font-bold text-[#e0e0e0] sm:text-[28px]">
                Parle comme un vrai Redditor.
              </h3>
              <p className="mt-4 text-[14px] leading-[1.7] text-[#888888]">
                RedPulse analyse les 50 meilleurs commentaires de chaque
                subreddit pour comprendre comment la communauté écrit.
                Tout est capturé et répliqué : abréviations, emojis, longueur et
                ton.
              </p>
              <span className="mt-5 inline-flex rounded-full border border-[rgba(249,115,22,0.2)] bg-[rgba(249,115,22,0.1)] px-3.5 py-1.5 text-[13px] text-[#f97316]">
                Subreddit Voice Analysis
              </span>
            </div>

            <VoiceAnalysisTerminal />
          </div>
        </motion.article>
      </div>
    </section>
  );
}
