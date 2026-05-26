"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Search, Trash2 } from "lucide-react";

type ApiOk<T> = { ok: true; data: T };
type ApiErr = { ok: false; error: { code: string; message: string; details?: unknown } };

type CommandRow = {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  updatedAt: string;
  options: { id: string }[];
  source: "db" | "system";
};

export default function CommandsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<CommandRow[]>([]);
  const [q, setQ] = useState("");

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const [dbRes, systemRes] = await Promise.all([
        fetch("/api/commands", { cache: "no-store" }),
        fetch("/api/native-commands", { cache: "no-store" }),
      ]);
      const dbJson = (await dbRes.json()) as ApiOk<{ commands: any[] }> | ApiErr;
      const systemJson = (await systemRes.json()) as ApiOk<{ commands: any[] }> | ApiErr;
      if (!dbRes.ok || !("ok" in dbJson) || dbJson.ok === false) {
        const msg = !dbRes.ok && "error" in dbJson ? dbJson.error.message : "Failed to load commands.";
        throw new Error(msg);
      }
      if (!systemRes.ok || !("ok" in systemJson) || systemJson.ok === false) {
        const msg = !systemRes.ok && "error" in systemJson ? systemJson.error.message : "Failed to load system commands.";
        throw new Error(msg);
      }

      const dbMapped: CommandRow[] = dbJson.data.commands.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        enabled: c.enabled,
        updatedAt: c.updatedAt,
        options: c.options ?? [],
        source: "db",
      }));
      const systemMapped: CommandRow[] = systemJson.data.commands.map((c) => ({
        id: `native:${c.name}`,
        name: c.name,
        description: String(c.description ?? `System command (${c.category})`),
        enabled: c.enabled,
        updatedAt: c.updatedAt ?? new Date(0).toISOString(),
        options: [],
        source: "system",
      }));
      setRows([...dbMapped, ...systemMapped].sort((a, b) => a.name.localeCompare(b.name)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load commands.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    const onFocus = () => {
      void refresh();
    };
    const timer = window.setInterval(() => {
      void refresh();
    }, 3000);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.clearInterval(timer);
    };
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(s) || r.description.toLowerCase().includes(s));
  }, [q, rows]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Commands</h1>
          <p className="mt-2 max-w-3xl text-sm text-white/60">All slash commands are controlled in one place.</p>
        </div>
        <Link
          href="/app/commands/new"
          className="inline-flex items-center justify-center rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-400"
        >
          New command
        </Link>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or description…"
            className="w-full rounded-xl border border-white/10 bg-black/25 py-2 pl-10 pr-3 text-sm text-white outline-none ring-0 placeholder:text-white/35 focus:border-indigo-400/60"
          />
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
        >
          Refresh
        </button>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">{error}</div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur">
        <div className="grid grid-cols-12 gap-3 border-b border-white/10 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-white/45">
          <div className="col-span-4">Command</div>
          <div className="col-span-2">Fields</div>
          <div className="col-span-2">Updated</div>
          <div className="col-span-2">Enabled</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-white/60">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-sm text-white/60">No commands match your filters.</div>
        ) : (
          <div className="divide-y divide-white/10">
            {filtered.map((c) => (
              <div key={c.id} className="grid grid-cols-12 items-center gap-3 px-4 py-4">
                <div className="col-span-4 min-w-0">
                  <div className="truncate font-semibold">
                    <span className="text-white/50">/</span>
                    {c.name}
                  </div>
                  <div className="truncate text-sm text-white/55">{c.description}</div>
                </div>
                <div className="col-span-2 text-sm text-white/70">{c.source === "system" ? "-" : c.options.length}</div>
                <div className="col-span-2 text-sm text-white/60">{new Date(c.updatedAt).toLocaleString()}</div>
                <div className="col-span-2">
                  <ModernSwitch
                    checked={c.enabled}
                    onChange={async (enabled) => {
                      setRows((prev) => prev.map((x) => (x.id === c.id ? { ...x, enabled } : x)));
                      const res = await fetch(
                        c.source === "system"
                          ? `/api/native-commands/${encodeURIComponent(c.name)}/enabled`
                          : `/api/commands/${c.id}/enabled`,
                        {
                        method: "PATCH",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({ enabled }),
                        },
                      );
                      if (!res.ok) {
                        await refresh();
                      }
                    }}
                  />
                </div>
                <div className="col-span-2 flex justify-end gap-2">
                  {c.source === "db" ? (
                    <>
                      <Link
                        href={`/app/commands/${c.id}`}
                        className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm font-semibold text-white/90 transition hover:bg-black/30"
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/20"
                        onClick={async () => {
                          if (!confirm(`Delete /${c.name}? This cannot be undone.`)) return;
                          const res = await fetch(`/api/commands/${c.id}`, { method: "DELETE" });
                          if (res.ok) await refresh();
                        }}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <Link
                      href={`/app/native-commands/${encodeURIComponent(c.name)}`}
                      className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm font-semibold text-white/90 transition hover:bg-black/30"
                    >
                      Edit
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ModernSwitch(props: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={props.checked}
      onClick={() => props.onChange(!props.checked)}
      className={[
        "relative inline-flex h-7 w-14 items-center rounded-full border transition-all duration-200",
        props.checked ? "border-emerald-400/40 bg-emerald-500/30" : "border-white/15 bg-white/10",
      ].join(" ")}
      title={props.checked ? "Enabled" : "Disabled"}
    >
      <span
        className={[
          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-all duration-200",
          props.checked ? "translate-x-8" : "translate-x-1",
        ].join(" ")}
      />
      <span className="sr-only">{props.checked ? "Enabled" : "Disabled"}</span>
    </button>
  );
}
