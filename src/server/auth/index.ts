import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import {
  users,
  teams,
  teamMembers,
  keywordFilters,
  teamSettings,
} from "@/server/db/schema";
import { slugify } from "@/lib/utils";
import { getUserTeamContext } from "@/server/team/context";

async function ensureGoogleUser(
  email: string,
  name?: string | null,
  image?: string | null,
) {
  if (!db) return null;

  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  if (existing) return existing.id;

  const [created] = await db
    .insert(users)
    .values({
      email,
      name: name ?? email.split("@")[0],
      image: image ?? undefined,
    })
    .returning();

  const teamSlug = slugify(`${name ?? "team"}-${Date.now().toString(36)}`);
  const [team] = await db
    .insert(teams)
    .values({
      name: `Équipe ${name ?? email.split("@")[0]}`,
      slug: teamSlug,
      ownerId: created!.id,
    })
    .returning();

  await db.insert(teamMembers).values({
    teamId: team!.id,
    userId: created!.id,
    role: "owner",
  });

  await db.insert(teamSettings).values({ teamId: team!.id });
  await db.insert(keywordFilters).values({
    teamId: team!.id,
    keywords: ["saas", "marketing", "growth", "startup"],
    subreddits: ["SaaS", "startups", "marketing"],
    isActive: true,
  });

  return created!.id;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password || !db) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        const user = await db.query.users.findFirst({
          where: eq(users.email, email),
        });

        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    authorized({ auth, request }) {
      const path = request.nextUrl.pathname;
      if (path.startsWith("/dashboard")) {
        return !!auth?.user;
      }
      return true;
    },
    async jwt({ token, user, account, profile, trigger, session }) {
      if (trigger === "update" && session?.teamId) {
        token.teamId = session.teamId as string;
      }

      if (account?.provider === "google" && (user?.email || profile?.email)) {
        const email = user?.email ?? (profile as { email?: string })?.email;
        if (email) {
          const id = await ensureGoogleUser(
            email,
            user?.name ?? (profile as { name?: string })?.name,
            user?.image ?? (profile as { picture?: string })?.picture,
          );
          if (id) token.id = id;
        }
      }
      if (user?.id) token.id = user.id;

      if (db && token.id && (user || trigger === "update")) {
        const teamCtx = await getUserTeamContext(
          db,
          token.id as string,
          token.teamId as string | undefined,
        );
        if (teamCtx) token.teamId = teamCtx.teamId;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        if (token.teamId) {
          session.user.teamId = token.teamId as string;
        }
      }
      return session;
    },
  },
});
