import Link from "next/link";
import { LandingNav } from "@/components/landing/nav";
import { LandingFooter } from "@/components/landing/vision";
import { PricingCards } from "@/components/onboarding/pricing-cards";

export default function PricingPage() {
  return (
    <>
      <LandingNav />
      <main className="min-h-screen bg-black pt-24 pb-20">
        <div className="mx-auto max-w-5xl px-5 sm:px-8">
          <div className="mb-10 text-center">
            <h1 className="text-[32px] font-semibold tracking-[-0.02em] text-white">
              Pricing
            </h1>
            <p className="mt-2 text-[15px] text-white/45">
              Commencez par une analyse gratuite, choisissez votre plan ensuite
            </p>
          </div>
          <PricingCards />
          <p className="mt-8 text-center">
            <Link href="/#hero" className="text-[13px] text-[#f97316] hover:underline">
              Analyser mon site d&apos;abord →
            </Link>
          </p>
        </div>
      </main>
      <LandingFooter />
    </>
  );
}
