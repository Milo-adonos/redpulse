import { createTRPCRouter } from "@/server/api/trpc";
import { healthRouter } from "@/server/api/routers/health";
import { userRouter } from "@/server/api/routers/user";
import { aiRouter } from "@/server/api/routers/ai";
import { authRouter } from "@/server/api/routers/auth";
import { projectRouter } from "@/server/api/routers/project";
import { teamRouter } from "@/server/api/routers/team";
import { discoveryRouter } from "@/server/api/routers/discovery";
import { commentsRouter } from "@/server/api/routers/comments";
import { settingsRouter } from "@/server/api/routers/settings";
import { analyticsRouter } from "@/server/api/routers/analytics";
import { warmupRouter } from "@/server/api/routers/warmup";
import { messagesRouter } from "@/server/api/routers/messages";
import { dmRouter } from "@/server/api/routers/dm";

export const appRouter = createTRPCRouter({
  health: healthRouter,
  user: userRouter,
  ai: aiRouter,
  auth: authRouter,
  project: projectRouter,
  team: teamRouter,
  discovery: discoveryRouter,
  comments: commentsRouter,
  settings: settingsRouter,
  analytics: analyticsRouter,
  warmup: warmupRouter,
  messages: messagesRouter,
  dm: dmRouter,
});

export type AppRouter = typeof appRouter;
