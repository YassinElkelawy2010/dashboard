import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/http";
import { requireAuthSession } from "@/lib/session";
import { AppError } from "@/lib/errors";
import { triggerBotCommandSync } from "@/server/botSync";
import { NATIVE_COMMAND_CATALOG } from "@/server/nativeCommandCatalog";

export const runtime = "nodejs";

export async function PATCH(req: Request, ctx: { params: Promise<{ name: string }> }) {
  try {
    await requireAuthSession();
    const { name } = await ctx.params;
    const commandName = String(name || "").trim();
    if (!NATIVE_COMMAND_CATALOG.some((c) => c.name === commandName)) {
      throw new AppError({ status: 404, code: "NOT_FOUND", message: "Native command not found." });
    }

    const body = await req.json().catch(() => null);
    const enabled = Boolean(body?.enabled);

    const row = await prisma.nativeCommandSetting.upsert({
      where: { name: commandName },
      create: { name: commandName, enabled },
      update: { enabled },
      select: { name: true, enabled: true, updatedAt: true },
    });
    const botSync = await triggerBotCommandSync();
    return jsonOk({ command: row, botSync });
  } catch (err) {
    return jsonError(err);
  }
}
