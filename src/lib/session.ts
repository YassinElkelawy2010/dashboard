import { cookies } from "next/headers";
import { getIronSession, type IronSession } from "iron-session";
import { AppError } from "./errors";
import { getGvrcSessionOptions } from "./sessionConfig";

export type SessionData = {
  isLoggedIn: boolean;
  username?: string;
};

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, getGvrcSessionOptions());
}

export async function requireAuthSession(): Promise<IronSession<SessionData>> {
  const session = await getSession();
  if (!session.isLoggedIn) {
    throw new AppError({ status: 401, code: "UNAUTHORIZED", message: "Not authenticated." });
  }
  return session;
}
