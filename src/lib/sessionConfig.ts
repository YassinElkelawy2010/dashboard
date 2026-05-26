import type { SessionOptions } from "iron-session";

export function getGvrcSessionOptions(): SessionOptions {
  const password = process.env.DASHBOARD_SESSION_SECRET;
  if (!password) {
    throw new Error("Missing required env var: DASHBOARD_SESSION_SECRET");
  }

  return {
    cookieName: "gvrc_dashboard",
    password,
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    },
  };
}
