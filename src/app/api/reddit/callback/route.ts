import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { accounts } from "@/server/db/schema";
import { encryptSecret, hasEncryptionKey } from "@/server/crypto";
import {
  exchangeRedditCode,
  fetchRedditIdentity,
} from "@/server/reddit/client";
import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !db) {
    return NextResponse.redirect(
      new URL("/login", process.env.NEXTAUTH_URL),
    );
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(
        `/dashboard/settings?reddit=error&reason=${error}`,
        process.env.NEXTAUTH_URL,
      ),
    );
  }

  const cookieStore = await cookies();
  const savedState = cookieStore.get("reddit_oauth_state")?.value;
  cookieStore.delete("reddit_oauth_state");

  if (!code || !state || state !== savedState) {
    return NextResponse.redirect(
      new URL("/dashboard/settings?reddit=invalid_state", process.env.NEXTAUTH_URL),
    );
  }

  if (!hasEncryptionKey()) {
    return NextResponse.redirect(
      new URL("/dashboard/settings?reddit=no_encryption", process.env.NEXTAUTH_URL),
    );
  }

  try {
    const tokens = await exchangeRedditCode(code);
    const username = await fetchRedditIdentity(tokens.accessToken);
    const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);

    const existing = await db.query.accounts.findFirst({
      where: and(
        eq(accounts.userId, session.user.id),
        eq(accounts.provider, "reddit"),
      ),
    });

    const values = {
      redditAccessToken: encryptSecret(tokens.accessToken),
      redditRefreshToken: encryptSecret(tokens.refreshToken),
      redditTokenExpiresAt: expiresAt,
      redditUsername: username,
      scope: tokens.scope,
      providerAccountId: username,
    };

    if (existing) {
      await db.update(accounts).set(values).where(eq(accounts.id, existing.id));
    } else {
      await db.insert(accounts).values({
        userId: session.user.id,
        provider: "reddit",
        ...values,
      });
    }

    return NextResponse.redirect(
      new URL("/dashboard/settings?reddit=connected", process.env.NEXTAUTH_URL),
    );
  } catch {
    return NextResponse.redirect(
      new URL("/dashboard/settings?reddit=failed", process.env.NEXTAUTH_URL),
    );
  }
}
