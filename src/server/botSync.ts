export async function triggerBotCommandSync(): Promise<{ ok: boolean; message?: string }> {
  const url = process.env.BOT_CONTROL_URL;
  const token = process.env.BOT_CONTROL_TOKEN;

  if (!url || !token) {
    return { ok: false, message: "BOT_CONTROL_URL / BOT_CONTROL_TOKEN not set; skipping live sync." };
  }

  const res = await fetch(`${url.replace(/\/$/, "")}/sync`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ source: "dashboard" }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { ok: false, message: `Bot sync failed (${res.status}): ${text || "no body"}` };
  }

  return { ok: true };
}
