import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/http";
import { requireAuthSession } from "@/lib/session";
import { NATIVE_COMMAND_CATALOG } from "@/server/nativeCommandCatalog";
import { BOT_CONTROL_SETTINGS_KEY, DEFAULT_BOT_CONTROL_CONFIG, normalizeBotControlConfig } from "@/server/botControlConfig";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAuthSession();
    const names = NATIVE_COMMAND_CATALOG.map((c) => c.name);
    const rows = await prisma.nativeCommandSetting.findMany({
      where: { name: { in: names } },
      select: { name: true, enabled: true, updatedAt: true },
    });
    const map = new Map(rows.map((r) => [r.name, r]));
    const configRow = await prisma.botSetting.findUnique({
      where: { key: BOT_CONTROL_SETTINGS_KEY },
      select: { value: true },
    });
    const config = normalizeBotControlConfig(configRow?.value ?? DEFAULT_BOT_CONTROL_CONFIG);
    const commands = NATIVE_COMMAND_CATALOG.map((c) => ({
      name: c.name,
      slashName: (config.nativeCommands as any)?.[c.name]?.slashName ?? c.name,
      category: c.category,
      description: (config.nativeCommands as any)?.[c.name]?.description ?? c.description,
      enabled: map.get(c.name)?.enabled ?? true,
      updatedAt: map.get(c.name)?.updatedAt ?? null,
    }));
    return jsonOk({ commands });
  } catch (err) {
    return jsonError(err);
  }
}
