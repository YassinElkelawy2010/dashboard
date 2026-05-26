import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/http";
import { requireAuthSession } from "@/lib/session";
import { AppError } from "@/lib/errors";
import { NATIVE_COMMAND_CATALOG } from "@/server/nativeCommandCatalog";
import { BOT_CONTROL_SETTINGS_KEY, DEFAULT_BOT_CONTROL_CONFIG, normalizeBotControlConfig } from "@/server/botControlConfig";
import { triggerBotCommandSync } from "@/server/botSync";
import { CommandUpsertSchema } from "@/server/commandsSchema";
import { validateNativeCommandOptions } from "@/server/commandsValidate";
import { NATIVE_COMMAND_FIXED_SLASH_STRUCTURE } from "@/server/nativeCommandFixedStructure";

export const runtime = "nodejs";

function catalogEntry(name: string) {
  return NATIVE_COMMAND_CATALOG.find((c) => c.name === name);
}

export async function GET(_req: Request, ctx: { params: Promise<{ name: string }> }) {
  try {
    await requireAuthSession();
    const { name } = await ctx.params;
    const command = catalogEntry(name);
    if (!command) throw new AppError({ status: 404, code: "NOT_FOUND", message: "Native command not found." });

    const configRow = await prisma.botSetting.findUnique({
      where: { key: BOT_CONTROL_SETTINGS_KEY },
      select: { value: true },
    });
    const config = normalizeBotControlConfig(configRow?.value ?? DEFAULT_BOT_CONTROL_CONFIG);
    const meta = (config.nativeCommands as Record<string, any>)?.[command.name] ?? {};

    const setting = await prisma.nativeCommandSetting.findUnique({
      where: { name: command.name },
      select: { enabled: true, updatedAt: true },
    });

    const optionsLocked = NATIVE_COMMAND_FIXED_SLASH_STRUCTURE.has(command.name);
    const options = optionsLocked ? [] : Array.isArray(meta.options) ? meta.options : [];

    return jsonOk({
      command: {
        id: `native:${command.name}`,
        name: typeof meta.slashName === "string" ? meta.slashName : command.name,
        description: typeof meta.description === "string" ? meta.description : command.description,
        enabled: setting?.enabled ?? true,
        guildOnly: meta.guildOnly !== false,
        dmPermission: Boolean(meta.dmPermission),
        responseType: meta.responseType === "EMBED" ? "EMBED" : "TEXT",
        ephemeral: meta.ephemeral !== false,
        responseTemplate: meta.responseTemplate ?? (meta.responseType === "EMBED" ? { embeds: [] } : { text: "" }),
        options,
        extras: meta.extras ?? {},
        optionsLocked,
        nativeCatalogKey: command.name,
        updatedAt: setting?.updatedAt?.toISOString?.() ?? new Date(0).toISOString(),
      },
    });
  } catch (err) {
    return jsonError(err);
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ name: string }> }) {
  try {
    await requireAuthSession();
    const { name: catalogKey } = await ctx.params;
    const catalog = catalogEntry(catalogKey);
    if (!catalog) throw new AppError({ status: 404, code: "NOT_FOUND", message: "Native command not found." });

    const body = await req.json().catch(() => null);
    const parsed = CommandUpsertSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError({ status: 400, code: "BAD_REQUEST", message: "Invalid command payload.", details: parsed.error.flatten() });
    }

    validateNativeCommandOptions(parsed.data);

    const optionsLocked = NATIVE_COMMAND_FIXED_SLASH_STRUCTURE.has(catalog.name);
    const optionsToStore = optionsLocked ? [] : parsed.data.options;

    const existing = await prisma.botSetting.findUnique({
      where: { key: BOT_CONTROL_SETTINGS_KEY },
      select: { value: true },
    });
    const config = normalizeBotControlConfig(existing?.value ?? DEFAULT_BOT_CONTROL_CONFIG);
    const prevNative = { ...(config.nativeCommands as Record<string, unknown>) };

    const slashName = parsed.data.name.trim();
    if (!/^[a-z0-9_]{1,32}$/.test(slashName)) {
      throw new AppError({ status: 400, code: "BAD_REQUEST", message: "Slash name must match ^[a-z0-9_]{1,32}$." });
    }

    for (const c of NATIVE_COMMAND_CATALOG) {
      if (c.name === catalog.name) continue;
      const other = prevNative[c.name] as { slashName?: string } | undefined;
      const otherSlash = typeof other?.slashName === "string" && /^[a-z0-9_]{1,32}$/.test(other.slashName) ? other.slashName : c.name;
      if (otherSlash === slashName) {
        throw new AppError({
          status: 409,
          code: "SLASH_NAME_CONFLICT",
          message: `That slash name is already used by another built-in command (${c.name}).`,
        });
      }
    }

    const dbConflict = await prisma.command.findUnique({ where: { name: slashName } });
    if (dbConflict) {
      throw new AppError({
        status: 409,
        code: "NAME_CONFLICT",
        message: `A dashboard-created command already uses /${slashName}.`,
      });
    }

    const nextNativeCommands = {
      ...prevNative,
      [catalog.name]: {
        description: parsed.data.description.trim(),
        slashName,
        guildOnly: parsed.data.guildOnly,
        dmPermission: parsed.data.dmPermission,
        responseType: parsed.data.responseType,
        ephemeral: parsed.data.ephemeral,
        responseTemplate: parsed.data.responseTemplate,
        options: optionsToStore,
        extras: parsed.data.extras,
      },
    };

    const nextConfig = { ...config, nativeCommands: nextNativeCommands };

    await prisma.$transaction([
      prisma.botSetting.upsert({
        where: { key: BOT_CONTROL_SETTINGS_KEY },
        create: { key: BOT_CONTROL_SETTINGS_KEY, value: nextConfig as never },
        update: { value: nextConfig as never },
      }),
      prisma.nativeCommandSetting.upsert({
        where: { name: catalog.name },
        create: { name: catalog.name, enabled: parsed.data.enabled },
        update: { enabled: parsed.data.enabled },
      }),
    ]);

    const botSync = await triggerBotCommandSync();
    return jsonOk({
      command: {
        id: `native:${catalog.name}`,
        name: slashName,
        description: parsed.data.description.trim(),
        enabled: parsed.data.enabled,
        guildOnly: parsed.data.guildOnly,
        dmPermission: parsed.data.dmPermission,
        responseType: parsed.data.responseType,
        ephemeral: parsed.data.ephemeral,
        responseTemplate: parsed.data.responseTemplate,
        options: optionsToStore,
        extras: parsed.data.extras,
        optionsLocked,
        nativeCatalogKey: catalog.name,
      },
      botSync,
    });
  } catch (err) {
    return jsonError(err);
  }
}
