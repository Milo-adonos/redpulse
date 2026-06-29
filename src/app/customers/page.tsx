import Link from "next/link";
import { LandingNav } from "@/components/landing/nav";
import { LandingFooter } from "@/components/landing/vision";

const TESTIMONIALS = [
  {
    quote:
      "RedPulse nous a permis de générer 40 leads qualifiés depuis Reddit en 6 semaines, sans un seul ban.",
    author: "Sarah M.",
    role: "Founder · SaaS B2B",
  },
  {
    quote:
      "Le Subreddit Voice Analysis est bluffant. Nos réponses sont indiscernables des vrais commentaires.",
    author: "Alex K.",
    role: "Growth · E-commerce",
  },
  {
    quote:
      "On a remplacé 3 heures de veille Reddit par jour par 20 minutes de validation dans RedPulse.",
    author: "Julien D.",
    role: "CMO · Agence",
  },
];

export default function CustomersPage() {
  return (
    <>
      <LandingNav />
      <main className="min-h-screen bg-black pt-24 pb-20">
        <div className="mx-auto max-w-4xl px-5 sm:px-8">
          <div className="mb-12 text-center">
            <h1 className="text-[32px] font-semibold tracking-[-0.02em] text-white">
              Customers
            </h1>
            <p className="mt-2 text-[15px] text-white/45">
              Des fondateurs et équipes growth qui dominent Reddit proprement
            </p>
          </div>

          <div className="space-y-6">
            {TESTIMONIALS.map((item) => (
              <blockquote
                key={item.author}
                className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-8"
              >
                <p className="text-[16px] leading-relaxed text-white/75">
                  &quot;{item.quote}&quot;
                </p>
                <footer className="mt-4 text-[13px] text-white/40">
                  <span className="font-medium text-white/70">{item.author}</span>
                  {" · "}
                  {item.role}
                </footer>
              </blockquote>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/#hero"
              className="inline-flex rounded-lg bg-[#f97316] px-6 py-3 text-[14px] font-medium text-white hover:bg-[#ea6c0a]"
            >
              Commencer →
            </Link>
          </div>
        </div>
      </main>
      <LandingFooter />
    </>
  );
}
