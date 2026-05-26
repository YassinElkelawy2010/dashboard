import { NextResponse, type NextRequest } from "next/server";
import { getIronSession } from "iron-session";
import type { SessionData } from "./lib/session";
import { getGvrcSessionOptions } from "./lib/sessionConfig";

export async function proxy(req: NextRequest) {
  if (!req.nextUrl.pathname.startsWith("/app")) return NextResponse.next();

  const res = NextResponse.next();
  const session = await getIronSession<SessionData>(req, res, getGvrcSessionOptions());

  if (!session.isLoggedIn) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: ["/app/:path*"],
};
