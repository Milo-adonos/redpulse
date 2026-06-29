import Link from "next/link";
import { LandingNav } from "@/components/landing/nav";
import { LandingFooter } from "@/components/landing/vision";
import {
  BarChart3,
  Flame,
  MessageSquare,
  Sparkles,
  Mic,
} from "lucide-react";

const SECTIONS = [
  {
    id: "reply",
    icon: MessageSquare,
    title: "Reply",
    headline: "Des réponses IA indistinguissables d'un vrai Redditor",
    body: "RedPulse analyse le fil, le ton du subreddit et votre produit pour générer des réponses naturelles. Vous validez en un clic avant d'envoyer — zéro spam, zéro détection.",
    mock: (
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5">
        <p className="text-[11px] uppercase tracking-wider text-white/35">Reply workspace</p>
        <p className="mt-3 text-[14px] text-white/80">
          &quot;honestly been using something similar for my salon bookings — game changer for no-shows&quot;
        </p>
        <p className="mt-2 text-[12px] text-primary">Confiance style · 9/10</p>
      </div>
    ),
  },
  {
    id: "warmup",
    icon: Flame,
    title: "Warmup",
    headline: "Construisez du karma sans jamais mentionner votre produit",
    body: "Participez aux discussions de votre niche avec des commentaires 100% authentiques. RedPulse identifie les posts à fort potentiel karma dans vos subreddits cibles.",
    mock: (
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5">
        <p className="text-[11px] uppercase tracking-wider text-white/35">Warmup queue</p>
        <p className="mt-3 text-[14px] text-white/80">r/startups · 94/100 · ↑ 847</p>
        <p className="mt-1 text-[13px] text-white/50">Commentaire généré · prêt à copier</p>
      </div>
    ),
  },
  {
    id: "influence",
    icon: Sparkles,
    title: "Influence",
    headline: "Créez la curiosité sans poster de lien",
    body: "Des messages qui posent les bonnes questions et partagent de l'expérience. Votre produit n'est jamais nommé — les gens demandent le lien eux-mêmes.",
    mock: (
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5">
        <p className="text-[11px] uppercase tracking-wider text-white/35">Influence mode</p>
        <p className="mt-3 text-[14px] text-white/80">
          &quot;curious what stack you used for the automation part?&quot;
        </p>
      </div>
    ),
  },
  {
    id: "analytics",
    icon: BarChart3,
    title: "Analytics",
    headline: "Mesurez chaque message, chaque subreddit, chaque gain de karma",
    body: "Dashboard unifié : messages générés, taux d'envoi, score anti-ban, corrélation RedPulse + karma Reddit. Sachez exactement ce qui fonctionne.",
    mock: (
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Envoyés", value: "127" },
          { label: "Karma +", value: "+340" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-white/[0.06] bg-black/40 p-4">
            <p className="text-[11px] text-white/35">{s.label}</p>
            <p className="mt-1 text-xl font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "voice",
    icon: Mic,
    title: "Subreddit Voice Analysis",
    headline: "Parlez exactement comme la communauté",
    body: "Au premier scrape, RedPulse analyse les top commentaires de chaque subreddit et extrait ton, longueur, emojis et expressions typiques. Vos messages passent invisibles.",
    mock: (
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5 text-[13px] text-white/60">
        <p>r/Nails · Analysé ✓</p>
        <p className="mt-2">Ton : enthusiastic · Emojis : 💅 ✨</p>
      </div>
    ),
  },
];

export default function FeaturesPage() {
  return (
    <>
      <LandingNav />
      <main className="min-h-screen bg-black pt-24 pb-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="mb-16 text-center">
            <h1 className="text-[40px] font-bold tracking-[-0.03em] text-white">
              Features
            </h1>
            <p className="mt-3 text-[16px] text-white/45">
              Tout ce qu&apos;il faut pour gagner sur Reddit sans se faire bannir
            </p>
          </div>

          <div className="space-y-24">
            {SECTIONS.map((section, index) => {
              const Icon = section.icon;
              const reversed = index % 2 === 1;
              return (
                <section
                  key={section.id}
                  id={section.id}
                  className="grid scroll-mt-28 items-center gap-10 lg:grid-cols-2"
                >
                  <div className={reversed ? "lg:order-2" : ""}>
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[#fff7ed]">
                      <Icon className="h-5 w-5 text-[#f97316]" />
                    </div>
                    <h2 className="text-[28px] font-semibold text-white">{section.title}</h2>
                    <p className="mt-2 text-[18px] font-medium text-white/80">
                      {section.headline}
                    </p>
                    <p className="mt-4 text-[15px] leading-relaxed text-white/45">
                      {section.body}
                    </p>
                  </div>
                  <div className={reversed ? "lg:order-1" : ""}>{section.mock}</div>
                </section>
              );
            })}
          </div>

          <div className="mt-20 text-center">
            <Link
              href="/#hero"
              className="inline-flex rounded-lg bg-[#f97316] px-6 py-3 text-[14px] font-medium text-white hover:bg-[#ea6c0a]"
            >
              Analyser mon site →
            </Link>
          </div>
        </div>
      </main>
      <LandingFooter />
    </>
  );
}
