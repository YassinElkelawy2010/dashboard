import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/http";
import { requireAuthSession } from "@/lib/session";
import { CommandUpsertSchema } from "@/server/commandsSchema";
import { validateCommandPayload } from "@/server/commandsValidate";
import { NATIVE_SLASH_COMMAND_NAMES } from "@/server/nativeCommands";
import { writeAudit } from "@/server/audit";
import { triggerBotCommandSync } from "@/server/botSync";
import { AppError } from "@/lib/errors";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAuthSession();
    const { id } = await ctx.params;

    const command = await prisma.command.findUnique({
      where: { id },
      include: { options: { orderBy: { position: "asc" } } },
    });

    if (!command) {
      throw new AppError({ status: 404, code: "NOT_FOUND", message: "Command not found." });
    }

    return jsonOk({ command });
  } catch (err) {
    return jsonError(err);
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuthSession();
    const actor = session.username ?? "unknown";
    const { id } = await ctx.params;

    const existing = await prisma.command.findUnique({
      where: { id },
      include: { options: { orderBy: { position: "asc" } } },
    });

    if (!existing) {
      throw new AppError({ status: 404, code: "NOT_FOUND", message: "Command not found." });
    }

    const body = await req.json().catch(() => null);
    const parsed = CommandUpsertSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError({ status: 400, code: "BAD_REQUEST", message: "Invalid command payload.", details: parsed.error.flatten() });
    }

    if (NATIVE_SLASH_COMMAND_NAMES.has(parsed.data.name) && parsed.data.name !== existing.name) {
      throw new AppError({
        status: 409,
        code: "NATIVE_COMMAND_CONFLICT",
        message: `That command name is reserved by a native bot command: /${parsed.data.name}`,
      });
    }

    validateCommandPayload(parsed.data);

    const updated = await prisma.$transaction(async (tx) => {
      await tx.commandOption.deleteMany({ where: { commandId: id } });

      return tx.command.update({
        where: { id },
        data: {
          name: parsed.data.name,
          description: parsed.data.description,
          enabled: parsed.data.enabled,
          guildOnly: parsed.data.guildOnly,
          dmPermission: parsed.data.dmPermission,
          responseType: parsed.data.responseType,
          ephemeral: parsed.data.ephemeral,
          responseTemplate: parsed.data.responseTemplate as never,
          extras: parsed.data.extras as never,
          options: {
            create: parsed.data.options.map((o, idx) => ({
              type: o.type,
              name: o.name,
              description: o.description,
              required: o.required,
              enabled: o.enabled ?? true,
              position: o.position ?? idx,
              min: o.min ?? null,
              max: o.max ?? null,
              choices: (o.choices ?? null) as never,
            })),
          },
        },
        include: { options: { orderBy: { position: "asc" } } },
      });
    });

    await writeAudit({
      actor,
      action: "COMMAND_UPDATE",
      entityType: "command",
      entityId: id,
      before: existing,
      after: updated,
    });

    const sync = await triggerBotCommandSync();

    return jsonOk({ command: updated, botSync: sync });
  } catch (err) {
    return jsonError(err);
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuthSession();
    const actor = session.username ?? "unknown";
    const { id } = await ctx.params;

    const existing = await prisma.command.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError({ status: 404, code: "NOT_FOUND", message: "Command not found." });
    }

    await prisma.command.delete({ where: { id } });

    await writeAudit({
      actor,
      action: "COMMAND_DELETE",
      entityType: "command",
      entityId: id,
      before: existing,
    });

    const sync = await triggerBotCommandSync();

    return jsonOk({ ok: true, botSync: sync });
  } catch (err) {
    return jsonError(err);
  }
}
