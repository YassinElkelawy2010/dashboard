import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/http";
import { requireAuthSession } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAuthSession();

    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return jsonOk({ logs });
  } catch (err) {
    return jsonError(err);
  }
}
