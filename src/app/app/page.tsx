import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { LogoutButton } from "@/components/LogoutButton";

export const runtime = "nodejs";

export default async function AppHomePage() {
  const session = await getSession();

  const [total, enabled, lastUpdated] = await prisma.$transaction([
    prisma.command.count(),
    prisma.command.count({ where: { enabled: true } }),
    prisma.command.findFirst({ orderBy: { updatedAt: "desc" }, select: { updatedAt: true } }),
  ]);

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-500/20 via-fuchsia-500/10 to-cyan-500/20 p-6 shadow-[0_0_50px_rgba(99,102,241,0.2)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-sm text-white/60">Signed in as</div>
          <div className="text-2xl font-semibold tracking-tight">{session.username ?? "admin"}</div>
          <div className="mt-2 max-w-2xl text-sm text-white/60">
            Command center for DB + native commands, automation modules, and live bot behavior.
          </div>
        </div>
        <LogoutButton />
      </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total commands" value={String(total)} hint="Configurable commands in DB" />
        <StatCard label="Enabled" value={String(enabled)} hint="Will register to Discord when synced" />
        <StatCard
          label="Last updated"
          value={lastUpdated?.updatedAt ? lastUpdated.updatedAt.toLocaleString() : "—"}
          hint="Most recently edited command"
        />
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
        <div className="text-lg font-semibold">Quick actions</div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/app/commands/new"
            className="inline-flex items-center justify-center rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-400"
          >
            Create a new command
          </Link>
          <Link
            href="/app/commands"
            className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm font-semibold text-white/90 transition hover:bg-black/30"
          >
            Browse commands
          </Link>
          <Link
            href="/app/audit"
            className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm font-semibold text-white/90 transition hover:bg-black/30"
          >
            View audit log
          </Link>
        </div>
        <div className="mt-4 text-sm text-white/60">
          Tip: after saving, the API attempts a live sync via the bot control plane (if configured). You can always run{" "}
          <code className="rounded-md bg-black/30 px-1 py-0.5 text-xs text-white/80">/sync_commands</code> in Discord.
        </div>
      </div>
    </div>
  );
}

function StatCard(props: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_0_30px_rgba(236,72,153,0.08)] backdrop-blur">
      <div className="text-sm text-white/60">{props.label}</div>
      <div className="mt-2 text-3xl font-semibold tracking-tight">{props.value}</div>
      <div className="mt-2 text-xs text-white/45">{props.hint}</div>
    </div>
  );
}
