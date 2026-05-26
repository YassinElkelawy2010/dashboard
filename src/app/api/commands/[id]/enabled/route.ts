import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/http";
import { requireAuthSession } from "@/lib/session";
import { writeAudit } from "@/server/audit";
import { triggerBotCommandSync } from "@/server/botSync";
import { AppError } from "@/lib/errors";
import { z } from "zod";

export const runtime = "nodejs";

const BodySchema = z.object({
  enabled: z.boolean(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuthSession();
    const actor = session.username ?? "unknown";
    const { id } = await ctx.params;

    const body = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError({ status: 400, code: "BAD_REQUEST", message: "Invalid payload." });
    }

    const existing = await prisma.command.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError({ status: 404, code: "NOT_FOUND", message: "Command not found." });
    }

    const updated = await prisma.command.update({
      where: { id },
      data: { enabled: parsed.data.enabled },
      include: { options: { orderBy: { position: "asc" } } },
    });

    await writeAudit({
      actor,
      action: "COMMAND_TOGGLE",
      entityType: "command",
      entityId: id,
      before: { enabled: existing.enabled },
      after: { enabled: updated.enabled },
    });

    const sync = await triggerBotCommandSync();

    return jsonOk({ command: updated, botSync: sync });
  } catch (err) {
    return jsonError(err);
  }
}
