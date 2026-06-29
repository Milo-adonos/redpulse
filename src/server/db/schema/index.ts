import {
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  boolean,
  integer,
  decimal,
  jsonb,
  pgEnum,
  uniqueIndex,
  primaryKey,
  date,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const planEnum = pgEnum("plan", [
  "free",
  "starter",
  "growth",
  "pro",
  "enterprise",
]);
export const roleEnum = pgEnum("role", ["owner", "admin", "editor", "viewer"]);
export const postStatusEnum = pgEnum("post_status", [
  "draft",
  "scheduled",
  "published",
  "failed",
]);
export const commentStatusEnum = pgEnum("comment_status", [
  "draft",
  "pending_review",
  "approved",
  "sent",
  "rejected",
]);
export const dmStatusEnum = pgEnum("dm_status", [
  "draft",
  "pending_review",
  "sent",
  "failed",
]);

export const alertFrequencyEnum = pgEnum("alert_frequency", [
  "realtime",
  "hourly",
  "daily",
  "weekly",
]);

export const messageTypeEnum = pgEnum("message_type", [
  "reply",
  "warmup",
  "influence",
  "post",
]);
export const responseLanguageEnum = pgEnum("response_language", ["fr", "en"]);

export const entityTypeEnum = pgEnum("entity_type", ["post", "comment", "dm"]);
export const eventTypeEnum = pgEnum("event_type", [
  "sent",
  "view",
  "upvote",
  "reply",
  "dm",
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash"),
  name: varchar("name", { length: 255 }),
  firstName: varchar("first_name", { length: 255 }),
  lastName: varchar("last_name", { length: 255 }),
  plan: varchar("plan", { length: 20 }),
  messagesLimit: integer("messages_limit").notNull().default(200),
  messagesUsed: integer("messages_used").notNull().default(0),
  planStartedAt: timestamp("plan_started_at", { withTimezone: true }),
  messagesResetAt: timestamp("messages_reset_at", { withTimezone: true }),
  emailVerified: timestamp("email_verified", { withTimezone: true }),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  provider: varchar("provider", { length: 50 }).notNull(),
  providerAccountId: varchar("provider_account_id", { length: 255 }).notNull(),
  redditAccessToken: text("reddit_access_token"),
  redditRefreshToken: text("reddit_refresh_token"),
  redditTokenExpiresAt: timestamp("reddit_token_expires_at", {
    withTimezone: true,
  }),
  redditUsername: varchar("reddit_username", { length: 100 }),
  scope: text("scope"),
});

export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id),
  plan: planEnum("plan").notNull().default("free"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const teamMembers = pgTable(
  "team_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: roleEnum("role").notNull().default("viewer"),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("team_members_team_user_idx").on(table.teamId, table.userId),
  ],
);

export const keywordFilters = pgTable("keyword_filters", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  keywords: jsonb("keywords").notNull().$type<string[]>(),
  subreddits: jsonb("subreddits").$type<string[]>(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    siteUrl: text("site_url").notNull(),
    description: text("description").notNull(),
    productPrompt: text("product_prompt"),
    keywords: jsonb("keywords").$type<string[]>().default([]),
    competitors: jsonb("competitors").$type<string[]>().default([]),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("projects_team_idx").on(table.teamId)],
);

export const onboardingSessions = pgTable("onboarding_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  url: text("url").notNull(),
  productName: varchar("product_name", { length: 255 }),
  tagline: text("tagline"),
  problemSolved: text("problem_solved"),
  targetAudience: text("target_audience"),
  keyFeatures: jsonb("key_features").$type<string[]>().default([]),
  tone: varchar("tone", { length: 50 }),
  productPrompt: text("product_prompt"),
  suggestedSubreddits: jsonb("suggested_subreddits").$type<string[]>().default([]),
  suggestedKeywords: jsonb("suggested_keywords").$type<string[]>().default([]),
  competitors: jsonb("competitors").$type<string[]>().default([]),
  scrapedText: text("scraped_text"),
  firstName: varchar("first_name", { length: 255 }),
  lastName: varchar("last_name", { length: 255 }),
  email: varchar("email", { length: 255 }),
  projectName: varchar("project_name", { length: 255 }),
  plan: varchar("plan", { length: 20 }),
  stripeSessionId: varchar("stripe_session_id", { length: 255 }),
  paid: boolean("paid").notNull().default(false),
  completed: boolean("completed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const projectDrafts = pgTable("project_drafts", {
  id: uuid("id").primaryKey().defaultRandom(),
  draftToken: varchar("draft_token", { length: 64 }).notNull().unique(),
  projectName: varchar("project_name", { length: 255 }).notNull(),
  siteUrl: text("site_url").notNull(),
  description: text("description").notNull(),
  productPrompt: text("product_prompt"),
  keywords: jsonb("keywords").$type<string[]>().default([]),
  subreddits: jsonb("subreddits").$type<string[]>().default([]),
  invites: jsonb("invites").$type<string[]>().default([]),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const teamInvites = pgTable("team_invites", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  email: varchar("email", { length: 255 }).notNull(),
  role: roleEnum("role").notNull().default("viewer"),
  token: varchar("token", { length: 64 }).notNull().unique(),
  invitedBy: uuid("invited_by")
    .notNull()
    .references(() => users.id),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const teamSettings = pgTable("team_settings", {
  teamId: uuid("team_id")
    .primaryKey()
    .references(() => teams.id, { onDelete: "cascade" }),
  repliesPerHour: integer("replies_per_hour").notNull().default(10),
  postsPerDay: integer("posts_per_day").notNull().default(3),
  maxBanRisk: decimal("max_ban_risk", { precision: 3, scale: 2 })
    .notNull()
    .default("0.60"),
  charLimit: integer("char_limit").notNull().default(400),
  warmupEnabled: boolean("warmup_enabled").notNull().default(false),
  warmupActionsPerDay: integer("warmup_actions_per_day").notNull().default(3),
  warmupCommentsPerWeek: integer("warmup_comments_per_week")
    .notNull()
    .default(5),
  alertFrequency: alertFrequencyEnum("alert_frequency")
    .notNull()
    .default("daily"),
  responseLanguage: responseLanguageEnum("response_language")
    .notNull()
    .default("en"),
  replyMinScore: integer("reply_min_score").notNull().default(80),
  warmupMinScore: integer("warmup_min_score").notNull().default(40),
  influenceMinScore: integer("influence_min_score").notNull().default(65),
  discoverySince: date("discovery_since"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const teamRedditProfiles = pgTable("team_reddit_profiles", {
  teamId: uuid("team_id")
    .primaryKey()
    .references(() => teams.id, { onDelete: "cascade" }),
  profileUrl: text("profile_url").notNull(),
  username: varchar("username", { length: 100 }).notNull(),
  totalKarma: integer("total_karma").notNull().default(0),
  linkKarma: integer("link_karma").notNull().default(0),
  commentKarma: integer("comment_karma").notNull().default(0),
  postCount: integer("post_count"),
  commentCount: integer("comment_count"),
  activeSubreddits: jsonb("active_subreddits")
    .$type<{ subreddit: string; contributions: number }[]>()
    .default([]),
  accountCreatedAt: timestamp("account_created_at", { withTimezone: true }),
  baselineKarma: integer("baseline_karma"),
  scrapedAt: timestamp("scraped_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const redditKarmaSnapshots = pgTable("reddit_karma_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  totalKarma: integer("total_karma").notNull(),
  recordedAt: timestamp("recorded_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type SubredditVoiceProfile = {
  tone?: string;
  avg_length?: string;
  common_abbreviations?: string[];
  common_expressions?: string[];
  emoji_usage?: string;
  typical_emojis?: string[];
  capitalization?: string;
  punctuation_style?: string;
  greeting_style?: string;
  question_style?: string;
  typical_openers?: string[];
  things_to_avoid?: string[];
  example_authentic_comment?: string;
};

export const subredditVoices = pgTable(
  "subreddit_voices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    subreddit: varchar("subreddit", { length: 100 }).notNull(),
    voiceProfile: jsonb("voice_profile")
      .$type<SubredditVoiceProfile>()
      .notNull()
      .default({}),
    sampleSize: integer("sample_size").notNull().default(0),
    analyzedAt: timestamp("analyzed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("subreddit_voices_project_sub_idx").on(
      table.projectId,
      table.subreddit,
    ),
  ],
);

export const generatedMessages = pgTable(
  "generated_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    type: messageTypeEnum("type").notNull(),
    redditId: varchar("reddit_id", { length: 20 }).notNull(),
    subreddit: varchar("subreddit", { length: 100 }).notNull(),
    title: text("title").notNull(),
    author: varchar("author", { length: 100 }),
    permalink: text("permalink").notNull(),
    postBody: text("post_body"),
    generatedBody: text("generated_body").notNull(),
    relevanceScore: decimal("relevance_score", { precision: 3, scale: 2 }),
    safetyScore: integer("safety_score").notNull().default(9),
    banReason: text("ban_reason"),
    containsUrl: boolean("contains_url").default(false),
    redditScore: integer("reddit_score"),
    isSent: boolean("is_sent").notNull().default(false),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    sentByUserId: uuid("sent_by_user_id").references(() => users.id),
    generatedByUserId: uuid("generated_by_user_id").references(() => users.id),
    redditCreatedAt: timestamp("reddit_created_at", { withTimezone: true }),
    viewedAt: timestamp("viewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("generated_messages_team_reddit_type_idx").on(
      table.teamId,
      table.redditId,
      table.type,
    ),
  ],
);

export const responseTemplates = pgTable("response_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  body: text("body").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const discoveredPosts = pgTable(
  "discovered_posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    redditId: varchar("reddit_id", { length: 20 }).notNull(),
    subreddit: varchar("subreddit", { length: 100 }).notNull(),
    title: text("title").notNull(),
    body: text("body"),
    author: varchar("author", { length: 100 }),
    score: integer("score").default(0),
    numComments: integer("num_comments").default(0),
    url: text("url"),
    permalink: text("permalink"),
    matchedKeywords: jsonb("matched_keywords").$type<string[]>(),
    intentScore: decimal("intent_score", { precision: 3, scale: 2 }),
    flair: text("flair"),
    relevanceScore: integer("relevance_score"),
    relevanceSection: varchar("relevance_section", { length: 20 }),
    relevanceReason: text("relevance_reason"),
    sectionScores: jsonb("section_scores").$type<Record<string, number>>(),
    isArchived: boolean("is_archived").notNull().default(false),
    discoveredAt: timestamp("discovered_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("discovered_posts_team_reddit_idx").on(
      table.teamId,
      table.redditId,
    ),
  ],
);

export const scrapedComments = pgTable(
  "scraped_comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    discoveredPostId: uuid("discovered_post_id")
      .notNull()
      .references(() => discoveredPosts.id, { onDelete: "cascade" }),
    redditId: varchar("reddit_id", { length: 20 }).notNull(),
    author: varchar("author", { length: 100 }),
    body: text("body"),
    score: integer("score").default(0),
    scrapedAt: timestamp("scraped_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("scraped_comments_post_reddit_idx").on(
      table.discoveredPostId,
      table.redditId,
    ),
  ],
);

export const posts = pgTable("posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  redditAccountId: uuid("reddit_account_id").references(() => accounts.id),
  subreddit: varchar("subreddit", { length: 100 }).notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  status: postStatusEnum("status").notNull().default("draft"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  redditPostId: varchar("reddit_post_id", { length: 20 }),
  banRiskScore: decimal("ban_risk_score", { precision: 3, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const comments = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id),
  discoveredPostId: uuid("discovered_post_id").references(
    () => discoveredPosts.id,
  ),
  body: text("body").notNull(),
  status: commentStatusEnum("status").notNull().default("draft"),
  aiModel: varchar("ai_model", { length: 50 }),
  productMention: boolean("product_mention").default(false),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  redditCommentId: varchar("reddit_comment_id", { length: 20 }),
  banRiskScore: decimal("ban_risk_score", { precision: 3, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const directMessages = pgTable("direct_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id),
  discoveredPostId: uuid("discovered_post_id").references(
    () => discoveredPosts.id,
  ),
  commentId: uuid("comment_id").references(() => comments.id),
  recipientUsername: varchar("recipient_username", { length: 100 }).notNull(),
  subject: varchar("subject", { length: 200 }).notNull(),
  body: text("body").notNull(),
  status: dmStatusEnum("status").notNull().default("draft"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const analyticsEvents = pgTable("analytics_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  entityType: entityTypeEnum("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  eventType: eventTypeEnum("event_type").notNull(),
  value: integer("value").notNull().default(1),
  recordedAt: timestamp("recorded_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const rateLimitLogs = pgTable("rate_limit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  action: varchar("action", { length: 50 }).notNull(),
  count: integer("count").notNull().default(0),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
});

// Auth.js tables
export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { withTimezone: true }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.identifier, table.token] }),
  ],
);

export const usersRelations = relations(users, ({ many }) => ({
  teamMembers: many(teamMembers),
  accounts: many(accounts),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  members: many(teamMembers),
  keywordFilters: many(keywordFilters),
  discoveredPosts: many(discoveredPosts),
  generatedMessages: many(generatedMessages),
  project: one(projects, {
    fields: [teams.id],
    references: [projects.teamId],
  }),
  settings: one(teamSettings, {
    fields: [teams.id],
    references: [teamSettings.teamId],
  }),
  redditProfile: one(teamRedditProfiles, {
    fields: [teams.id],
    references: [teamRedditProfiles.teamId],
  }),
}));

export const teamRedditProfilesRelations = relations(
  teamRedditProfiles,
  ({ one }) => ({
    team: one(teams, {
      fields: [teamRedditProfiles.teamId],
      references: [teams.id],
    }),
  }),
);

export const redditKarmaSnapshotsRelations = relations(
  redditKarmaSnapshots,
  ({ one }) => ({
    team: one(teams, {
      fields: [redditKarmaSnapshots.teamId],
      references: [teams.id],
    }),
  }),
);

export const generatedMessagesRelations = relations(
  generatedMessages,
  ({ one }) => ({
    team: one(teams, {
      fields: [generatedMessages.teamId],
      references: [teams.id],
    }),
  }),
);

export const projectsRelations = relations(projects, ({ one, many }) => ({
  team: one(teams, { fields: [projects.teamId], references: [teams.id] }),
  subredditVoices: many(subredditVoices),
}));

export const subredditVoicesRelations = relations(
  subredditVoices,
  ({ one }) => ({
    project: one(projects, {
      fields: [subredditVoices.projectId],
      references: [projects.id],
    }),
  }),
);

export const discoveredPostsRelations = relations(
  discoveredPosts,
  ({ many }) => ({
    comments: many(comments),
  }),
);

export const commentsRelations = relations(comments, ({ one }) => ({
  discoveredPost: one(discoveredPosts, {
    fields: [comments.discoveredPostId],
    references: [discoveredPosts.id],
  }),
}));

export const directMessagesRelations = relations(directMessages, ({ one }) => ({
  discoveredPost: one(discoveredPosts, {
    fields: [directMessages.discoveredPostId],
    references: [discoveredPosts.id],
  }),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, { fields: [teamMembers.teamId], references: [teams.id] }),
  user: one(users, { fields: [teamMembers.userId], references: [users.id] }),
}));
