import { type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { jsonError, jsonOk } from "@/lib/http";
import { AppError } from "@/lib/errors";
import { rateLimit } from "@/server/rateLimit";
import { writeAudit } from "@/server/audit";

export const runtime = "nodejs";

const BodySchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

function getClientIp(req: NextRequest) {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip") || "unknown";
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = rateLimit(`login:${ip}`, { limit: 10, windowMs: 10 * 60_000 });
    if (!rl.ok) {
      throw new AppError({
        status: 429,
        code: "RATE_LIMITED",
        message: "Too many login attempts. Try again later.",
        details: { resetAt: rl.resetAt },
      });
    }

    const json = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      throw new AppError({ status: 400, code: "BAD_REQUEST", message: "Invalid login payload." });
    }

    const expectedUser = process.env.DASHBOARD_ADMIN_USER;
    const passHash = process.env.DASHBOARD_ADMIN_PASS_HASH;
    if (!expectedUser || !passHash) {
      throw new AppError({
        status: 500,
        code: "AUTH_NOT_CONFIGURED",
        message: "Dashboard auth is not configured (missing DASHBOARD_ADMIN_USER / DASHBOARD_ADMIN_PASS_HASH).",
      });
    }

    const okUser = parsed.data.username === expectedUser;
    const okPass = await bcrypt.compare(parsed.data.password, passHash);
    if (!okUser || !okPass) {
      throw new AppError({ status: 401, code: "INVALID_CREDENTIALS", message: "Invalid username or password." });
    }

    const session = await getSession();
    session.isLoggedIn = true;
    session.username = expectedUser;
    await session.save();

    await writeAudit({
      actor: expectedUser,
      action: "LOGIN",
      entityType: "session",
      entityId: "dashboard",
    });

    return jsonOk({ username: expectedUser });
  } catch (err) {
    return jsonError(err);
  }
}
