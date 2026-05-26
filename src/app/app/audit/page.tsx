"use client";

import { useEffect, useState } from "react";

type AuditRow = {
  id: string;
  createdAt: string;
  actor: string;
  action: string;
  entityType: string;
  entityId: string;
};

export default function AuditPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<AuditRow[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/audit", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok || json?.ok === false) {
          throw new Error(json?.error?.message || "Failed to load audit log.");
        }
        const mapped: AuditRow[] = json.data.logs.map((l: any) => ({
          id: l.id,
          createdAt: l.createdAt,
          actor: l.actor,
          action: l.action,
          entityType: l.entityType,
          entityId: l.entityId,
        }));
        if (!cancelled) setRows(mapped);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load audit log.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Audit log</h1>
        <p className="mt-2 max-w-3xl text-sm text-white/60">Immutable history of dashboard actions (create/update/delete/toggle/login).</p>
      </div>

      {error ? <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">{error}</div> : null}

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur">
        <div className="grid grid-cols-12 gap-3 border-b border-white/10 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-white/45">
          <div className="col-span-3">Time</div>
          <div className="col-span-2">Actor</div>
          <div className="col-span-2">Action</div>
          <div className="col-span-2">Entity</div>
          <div className="col-span-3">ID</div>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-white/60">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-sm text-white/60">No audit entries yet.</div>
        ) : (
          <div className="divide-y divide-white/10">
            {rows.map((r) => (
              <div key={r.id} className="grid grid-cols-12 gap-3 px-4 py-3 text-sm">
                <div className="col-span-3 text-white/60">{new Date(r.createdAt).toLocaleString()}</div>
                <div className="col-span-2 text-white/85">{r.actor}</div>
                <div className="col-span-2 font-semibold text-white/90">{r.action}</div>
                <div className="col-span-2 text-white/70">
                  {r.entityType}
                </div>
                <div className="col-span-3 truncate font-mono text-xs text-white/60">{r.entityId}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
