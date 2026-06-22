DO $$ BEGIN
  CREATE TYPE "public"."message_type" AS ENUM('reply', 'warmup');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."response_language" AS ENUM('fr', 'en');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "team_settings" ADD COLUMN IF NOT EXISTS "response_language" "response_language" DEFAULT 'fr' NOT NULL;

CREATE TABLE IF NOT EXISTS "generated_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "team_id" uuid NOT NULL REFERENCES "teams"("id") ON DELETE cascade,
  "type" "message_type" NOT NULL,
  "reddit_id" varchar(20) NOT NULL,
  "subreddit" varchar(100) NOT NULL,
  "title" text NOT NULL,
  "author" varchar(100),
  "permalink" text NOT NULL,
  "post_body" text,
  "generated_body" text NOT NULL,
  "relevance_score" numeric(3, 2),
  "safety_score" integer DEFAULT 9 NOT NULL,
  "is_sent" boolean DEFAULT false NOT NULL,
  "sent_at" timestamp with time zone,
  "sent_by_user_id" uuid REFERENCES "users"("id"),
  "generated_by_user_id" uuid REFERENCES "users"("id"),
  "reddit_created_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "generated_messages_team_reddit_type_idx" ON "generated_messages" ("team_id", "reddit_id", "type");
