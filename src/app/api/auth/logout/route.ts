import { getSession, requireAuthSession } from "@/lib/session";
import { jsonError, jsonOk } from "@/lib/http";
import { writeAudit } from "@/server/audit";

export const runtime = "nodejs";

export async function POST() {
  try {
    const authed = await requireAuthSession();
    const username = authed.username ?? "unknown";

    const session = await getSession();
    session.destroy();
    await session.save();

    await writeAudit({
      actor: username,
      action: "LOGOUT",
      entityType: "session",
      entityId: "dashboard",
    });

    return jsonOk({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}
