import type { MessageItem } from "@/components/dashboard/reddit-message-workspace";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/server/api/root";

export type DemoDashboardData = inferRouterOutputs<AppRouter>["team"]["getDashboard"];

const now = Date.now();
const hoursAgo = (h: number) => new Date(now - h * 3600000);

const baseItem = (
  partial: Partial<MessageItem> & Pick<MessageItem, "redditId" | "subreddit" | "title" | "author">,
): MessageItem => ({
  id: partial.id ?? partial.redditId,
  redditId: partial.redditId,
  subreddit: partial.subreddit,
  title: partial.title,
  author: partial.author,
  permalink: `https://reddit.com/r/${partial.subreddit}/comments/${partial.redditId}`,
  postBody: partial.postBody ?? null,
  generatedBody: partial.generatedBody ?? null,
  relevanceScore: partial.relevanceScore ?? 75,
  safetyScore: partial.safetyScore ?? 10,
  banReason: partial.banReason ?? null,
  redditScore: partial.redditScore ?? 50,
  isSent: partial.isSent ?? false,
  createdAt: partial.createdAt ?? hoursAgo(1),
  redditCreatedAt: partial.redditCreatedAt ?? hoursAgo(1),
  styleConfidence: partial.styleConfidence ?? 9.1,
  hasVoiceProfile: partial.hasVoiceProfile ?? true,
});

export const DEMO_REPLY_ITEMS: MessageItem[] = [
  baseItem({
    redditId: "demo-reply-1",
    subreddit: "Nails",
    author: "nailartlover",
    title: "Best nail visualization app for home use?",
    postBody:
      "i want something that shows designs on my actual hand from a photo, not just generic swatches. any recs?",
    generatedBody:
      "omg i had the exact same issue picking colors ngl 😭 i stumbled on makemynails a few weeks ago and it literally shows the design on your actual hand from a photo?? changed everything for me fr",
    relevanceScore: 92,
    safetyScore: 10,
    banReason: "nail design · visualization",
    redditCreatedAt: hoursAgo(0.05),
  }),
  baseItem({
    redditId: "demo-reply-2",
    subreddit: "BeautyTech",
    author: "beautyfoundr",
    title: "Anyone tried AI nail try-on tools?",
    generatedBody: null,
    relevanceScore: 78,
    redditCreatedAt: hoursAgo(0.25),
  }),
  baseItem({
    redditId: "demo-reply-3",
    subreddit: "MakeupAddiction",
    author: "glossy_life",
    title: "How do you choose nail colors without trying?",
    generatedBody: null,
    relevanceScore: 71,
    redditCreatedAt: hoursAgo(1),
  }),
];

export const DEMO_WARMUP_ITEMS: MessageItem[] = [
  baseItem({
    redditId: "demo-warmup-1",
    subreddit: "NailArt",
    author: "glitter_queen",
    title: "obsessed with this chrome set 💅",
    generatedBody:
      "wait this is literally perfect?? the chrome reflection is insane 😭 what products did you use for the base??",
    relevanceScore: 88,
    safetyScore: 10,
    redditCreatedAt: hoursAgo(0.1),
  }),
  baseItem({
    redditId: "demo-warmup-2",
    subreddit: "Nails",
    author: "polish_addict",
    title: "first time doing french tips at home",
    generatedBody: null,
    relevanceScore: 76,
  }),
  baseItem({
    redditId: "demo-warmup-3",
    subreddit: "RedditLaqueristas",
    author: "gel_guru",
    title: "what base coat do you swear by?",
    generatedBody: null,
    relevanceScore: 72,
  }),
];

export const DEMO_INFLUENCE_ITEMS: MessageItem[] = [
  baseItem({
    redditId: "demo-influence-1",
    subreddit: "Nails",
    author: "colorpicker22",
    title: "how do you preview designs before booking?",
    postBody: "salon appointments are expensive when you're not sure about the design",
    generatedBody:
      "been using something for this for a few weeks and it genuinely changed things ngl… still lowkey obsessed but idk if it works for everyone",
    relevanceScore: 85,
    safetyScore: 9,
    redditCreatedAt: hoursAgo(0.2),
  }),
  baseItem({
    redditId: "demo-influence-2",
    subreddit: "BeautyTech",
    author: "techbeauty",
    title: "AR try-on apps worth it?",
    generatedBody: null,
    relevanceScore: 79,
  }),
];

function buildDailySeries() {
  const points = [12, 18, 15, 22, 19, 28, 24, 31, 27, 35, 32, 38, 34, 42, 39, 45, 41, 48, 44, 52, 49, 55, 51, 58, 54, 61, 57, 64, 60, 68];
  return points.map((count, i) => {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    dayStart.setDate(dayStart.getDate() - (29 - i));
    return {
      date: dayStart.toISOString().slice(0, 10),
      label: dayStart.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
      count,
    };
  });
}

export const DEMO_ANALYTICS_DATA: DemoDashboardData = {
  lastUpdated: new Date(),
  hasRedditProfile: true,
  redditUsername: "nailuser",
  redditProfileUrl: "https://reddit.com/u/nailuser",
  hasAnyData: true,
  metrics: {
    generated: { total: 920, reply: 420, warmup: 310, influence: 190 },
    sent: { total: 847, rate: 92, trendPct: 12, sentThisWeek: 124 },
    activeSubreddits: { count: 6, topSubreddit: "Nails", trend: "stable" },
    avgBanScore: 9.4,
    avgBanTrendPct: 2,
    karmaGainSinceStart: 1240,
    karmaTrendPct: 8,
  },
  reddit: {
    totalKarma: 127,
    linkKarma: 12,
    commentKarma: 115,
    karmaGainSinceStart: 1240,
    postCount: 8,
    commentCount: 94,
    accountAgeDays: 400,
    accountAgeLabel: "1 an",
    accountCreatedAt: new Date(now - 400 * 86400000),
    activeSubreddits: [
      { subreddit: "Nails", contributions: 120 },
      { subreddit: "NailArt", contributions: 85 },
      { subreddit: "BeautyTech", contributions: 42 },
    ],
  },
  impact: {
    sentThisWeek: 124,
    karmaGainThisWeek: 89,
    topSentSubreddit: "Nails",
    topKarmaSubreddit: "NailArt",
    sentBySection: { reply: 312, warmup: 198, influence: 156 },
    sentThisWeekBySection: { reply: 48, warmup: 42, influence: 34 },
  },
  recentSent: [
    {
      id: "1",
      date: hoursAgo(2),
      subreddit: "Nails",
      section: "reply",
      preview: "omg i had the exact same issue picking colors ngl…",
      banScore: 10,
    },
    {
      id: "2",
      date: hoursAgo(5),
      subreddit: "NailArt",
      section: "warmup",
      preview: "wait this is literally perfect?? the chrome reflection is insane…",
      banScore: 10,
    },
  ],
  dailySentLast30Days: buildDailySeries(),
  subredditTable: [
    { subreddit: "Nails", sent: 312, karma: 420, avgBanScore: 9.6 },
    { subreddit: "NailArt", sent: 198, karma: 310, avgBanScore: 9.4 },
    { subreddit: "BeautyTech", sent: 156, karma: 280, avgBanScore: 9.1 },
    { subreddit: "MakeupAddiction", sent: 181, karma: 230, avgBanScore: 9.3 },
  ],
  bestSubreddit: {
    name: "Nails",
    sent: 312,
    avgBanScore: 9.6,
    karma: 420,
  },
};
