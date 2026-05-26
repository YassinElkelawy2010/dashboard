import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/http";
import { requireAuthSession } from "@/lib/session";
import { BOT_CONTROL_SETTINGS_KEY, DEFAULT_BOT_CONTROL_CONFIG, normalizeBotControlConfig } from "@/server/botControlConfig";
import { triggerBotCommandSync } from "@/server/botSync";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAuthSession();
    const row = await prisma.botSetting.findUnique({
      where: { key: BOT_CONTROL_SETTINGS_KEY },
      select: { value: true, updatedAt: true },
    });
    const config = normalizeBotControlConfig(row?.value ?? DEFAULT_BOT_CONTROL_CONFIG);
    return jsonOk({ config, updatedAt: row?.updatedAt ?? null });
  } catch (err) {
    return jsonError(err);
  }
}

export async function PATCH(req: Request) {
  try {
    await requireAuthSession();
    const body = await req.json().catch(() => null);
    const config = normalizeBotControlConfig(body?.config ?? {});
    const saved = await prisma.botSetting.upsert({
      where: { key: BOT_CONTROL_SETTINGS_KEY },
      create: { key: BOT_CONTROL_SETTINGS_KEY, value: config as never },
      update: { value: config as never },
      select: { value: true, updatedAt: true },
    });
    const botSync = await triggerBotCommandSync();
    return jsonOk({ config: saved.value, updatedAt: saved.updatedAt, botSync });
  } catch (err) {
    return jsonError(err);
  }
}
