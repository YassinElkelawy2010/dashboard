import { getSession } from "@/lib/session";
import { jsonError, jsonOk } from "@/lib/http";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await getSession();
    return jsonOk({
      isLoggedIn: Boolean(session.isLoggedIn),
      username: session.username ?? null,
    });
  } catch (err) {
    return jsonError(err);
  }
}
