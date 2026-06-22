import { auth } from "@/server/auth";
import { getRedditAuthUrl } from "@/server/reddit/client";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", process.env.NEXTAUTH_URL));
  }

  const state = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set("reddit_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  const url = getRedditAuthUrl(state);
  return NextResponse.redirect(url);
}
