"use client";

import { LandingNav } from "@/components/landing/nav";
import { LandingHero } from "@/components/landing/hero";
import {
  ScrollChapter,
  ChapterDivider,
} from "@/components/landing/scroll-chapter";
import {
  DiscoverDemo,
  ReplyDemo,
  ShieldDemo,
  ScheduleDemo,
} from "@/components/landing/feature-demos";
import { VisionSection, LandingFooter } from "@/components/landing/vision";

export default function HomePage() {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-black"
      >
        Aller au contenu
      </a>
      <LandingNav />
      <main id="main" className="relative overflow-x-hidden bg-[#080808]">
        <LandingHero />

        <div id="discover" className="relative">
          <ChapterDivider />
          <ScrollChapter
            id="product"
            chapter="01 · Découverte"
            title="Veille temps réel"
            headline="Trouve les conversations qui comptent."
            body="RedPulse scrape Reddit en temps réel et identifie les posts où quelqu'un cherche exactement ce que vous faites. Plus besoin de scroller des heures."
            icon="discover"
            align="left"
          >
            <DiscoverDemo />
          </ScrollChapter>

          <ChapterDivider />
          <ScrollChapter
            id="reply"
            chapter="02 · Réponse"
            title="Réponses indétectables"
            headline="Des réponses qui passent pour humaines."
            body="Chaque réponse est générée dans le style d'écriture exact du subreddit. Mêmes abréviations, même ton, même longueur. Personne ne voit la différence."
            icon="reply"
            align="right"
          >
            <ReplyDemo />
          </ScrollChapter>

          <ChapterDivider />
          <ScrollChapter
            id="shield"
            chapter="03 · Protection"
            title="Sécurité native"
            headline="Votre réputation Reddit, préservée."
            body="Score de risque, rate limiting, validation humaine. RedPulse agit avant que Reddit ne réagisse."
            icon="shield"
            align="left"
          >
            <ShieldDemo />
          </ScrollChapter>

          <ChapterDivider />
          <ScrollChapter
            id="schedule"
            chapter="04 · Orchestration"
            title="Timing parfait"
            headline="Publier quand Reddit écoute."
            body="Les créneaux optimaux sont calculés à partir de l'engagement réel. Vos actions arrivent au pic, pas dans le bruit."
            icon="pulse"
            align="right"
          >
            <ScheduleDemo />
          </ScrollChapter>
        </div>

        <VisionSection />
      </main>
      <LandingFooter />
    </>
  );
}
