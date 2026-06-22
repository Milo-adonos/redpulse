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
import { OnboardingFlow } from "@/components/landing/onboarding-flow";

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
      <main id="main" className="relative overflow-x-hidden bg-black">
        <LandingHero />
        <OnboardingFlow />

        <div id="discover" className="relative">
          <ChapterDivider />
          <ScrollChapter
            id="product"
            chapter="01 · Découverte"
            title="Veille intelligente"
            headline="Chaque conversation pertinente, au moment où elle naît."
            body="RedPulse écoute les subreddits qui comptent pour vous. Filtres, scores, auteurs — seules les opportunités réelles remontent."
            quote="Le timing, c'est 80 % de la conversion sur Reddit."
            icon="discover"
            align="left"
          >
            <DiscoverDemo />
          </ScrollChapter>

          <ChapterDivider />
          <ScrollChapter
            id="reply"
            chapter="02 · Réponse"
            title="Intelligence contextuelle"
            headline="Des mots qui sonnent humains, pas automatisés."
            body="Claude analyse le fil, le ton du subreddit et votre positionnement. Chaque réponse est calibrée pour convertir sans alarmer."
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
