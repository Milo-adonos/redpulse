let started = false;

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (started) return;
  if (process.env.ENABLE_BACKGROUND_SCRAPER === "false") return;

  started = true;

  const intervalMs = Number(process.env.SCRAPE_INTERVAL_MS ?? 15 * 60 * 1000);
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://127.0.0.1:3000";
  const secret = process.env.CRON_SECRET;

  async function tick() {
    try {
      const headers: Record<string, string> = {};
      if (secret) headers.Authorization = `Bearer ${secret}`;

      const res = await fetch(`${baseUrl}/api/cron/scrape`, {
        headers,
        cache: "no-store",
      });

      if (!res.ok) {
        console.error("[redpulse-scraper] HTTP", res.status, await res.text());
        return;
      }

      const data = (await res.json()) as { teams?: number };
      console.log(`[redpulse-scraper] sync OK — ${data.teams ?? 0} équipe(s)`);
    } catch (error) {
      console.error("[redpulse-scraper] erreur:", error);
    }
  }

  console.log(
    `[redpulse-scraper] actif — intervalle ${Math.round(intervalMs / 60000)} min`,
  );

  // Laisser Next.js finir de démarrer avant le premier appel
  setTimeout(() => void tick(), 10_000);
  setInterval(tick, intervalMs);
}
