import { auth } from "@/server/auth";

export default auth((req) => {
  if (!req.auth?.user && req.nextUrl.pathname.startsWith("/dashboard")) {
    const login = new URL("/login", req.nextUrl.origin);
    login.searchParams.set(
      "callbackUrl",
      req.nextUrl.pathname + req.nextUrl.search,
    );
    return Response.redirect(login);
  }
});

export const config = {
  matcher: ["/dashboard/:path*"],
};
