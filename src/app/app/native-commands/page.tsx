"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type NativeRow = {
  name: string;
  slashName: string;
  category: string;
  description: string;
  enabled: boolean;
  updatedAt: string | null;
};

type ApiOk<T> = { ok: true; data: T };
type ApiErr = { ok: false; error: { code: string; message: string; details?: unknown } };

export default function NativeCommandsPage() {
  const [rows, setRows] = useState<NativeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/native-commands", { cache: "no-store" });
      const json = (await res.json()) as ApiOk<{ commands: NativeRow[] }> | ApiErr;
      if (!res.ok || !("ok" in json) || json.ok === false) {
        const msg = !res.ok && "error" in json ? json.error.message : "Failed to load native commands.";
        throw new Error(msg);
      }
      setRows(json.data.commands);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load native commands.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(s) || r.category.toLowerCase().includes(s));
  }, [q, rows]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">System Commands</h1>
        <p className="mt-2 text-sm text-white/60">
          Manage core commands from the website. Turning one off hides it from Discord and blocks execution.
        </p>
      </div>

      <div className="flex gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search command or category..."
          className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm outline-none focus:border-indigo-400/60 sm:max-w-md"
        />
        <button
          type="button"
          onClick={() => void refresh()}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
        >
          Refresh
        </button>
      </div>

      {error ? <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">{error}</div> : null}

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur">
        <div className="grid grid-cols-12 gap-3 border-b border-white/10 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-white/45">
          <div className="col-span-4">Command</div>
          <div className="col-span-3">Category</div>
          <div className="col-span-3">Updated</div>
          <div className="col-span-1 text-right">Edit</div>
          <div className="col-span-1 text-right">Enabled</div>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-white/60">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-sm text-white/60">No native commands match your filters.</div>
        ) : (
          <div className="divide-y divide-white/10">
            {filtered.map((c) => (
              <div key={c.name} className="grid grid-cols-12 items-center gap-3 px-4 py-4">
                <div className="col-span-4 min-w-0">
                  <div className="truncate font-semibold">
                    <span className="text-white/50">/</span>
                    {c.slashName}
                  </div>
                  <div className="truncate text-xs text-white/55">{c.description}</div>
                </div>
                <div className="col-span-3 text-sm capitalize text-white/70">{c.category.replace(/_/g, " ")}</div>
                <div className="col-span-3 text-sm text-white/60">
                  {c.updatedAt ? new Date(c.updatedAt).toLocaleString() : "default"}
                </div>
                <div className="col-span-1 flex justify-end">
                  <Link
                    href={`/app/native-commands/${encodeURIComponent(c.name)}`}
                    className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs font-semibold text-white/90 transition hover:bg-black/30"
                  >
                    Edit
                  </Link>
                </div>
                <div className="col-span-1 flex justify-end">
                  <ModernSwitch
                    checked={c.enabled}
                    onChange={async (enabled) => {
                      setRows((prev) => prev.map((r) => (r.name === c.name ? { ...r, enabled } : r)));
                      const res = await fetch(`/api/native-commands/${encodeURIComponent(c.name)}/enabled`, {
                        method: "PATCH",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({ enabled }),
                      });
                      if (!res.ok) {
                        await refresh();
                      }
                    }}
                  />
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
