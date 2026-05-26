"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";

type ControlConfig = {
  branding: { footerText: string; footerIconUrl: string };
  tickets: {
    color: string;
    panelImageUrl: string;
    panelDescription: string;
    types: Array<{ label: string; value: string }>;
  };
  staffAdjustments: {
    roleChoices: Array<{ name: string; value: string; rankDisplay: string }>;
    reasons: string[];
    color: string;
    titleTemplate: string;
    descriptionTemplate: string;
    thumbnailUrl: string;
    imageUrl: string;
    ackMessage: string;
  };
};

export default function SettingsPage() {
  const [config, setConfig] = useState<ControlConfig | null>(null);
  const [typesJson, setTypesJson] = useState("");
  const [staffRoleChoicesJson, setStaffRoleChoicesJson] = useState("");
  const [staffReasonsJson, setStaffReasonsJson] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/control-center", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || json?.ok === false) {
        throw new Error(json?.error?.message || "Failed to load control center.");
      }
      setConfig(json.data.config);
      setTypesJson(JSON.stringify(json.data.config.tickets.types, null, 2));
      setStaffRoleChoicesJson(JSON.stringify(json.data.config.staffAdjustments.roleChoices, null, 2));
      setStaffReasonsJson(JSON.stringify(json.data.config.staffAdjustments.reasons, null, 2));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load control center.");
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!config) return;
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      let parsedTypes: unknown = [];
      let parsedStaffRoleChoices: unknown = [];
      let parsedStaffReasons: unknown = [];
      try {
        parsedTypes = JSON.parse(typesJson || "[]");
      } catch {
        throw new Error("Ticket types JSON is invalid.");
      }
      try {
        parsedStaffRoleChoices = JSON.parse(staffRoleChoicesJson || "[]");
      } catch {
        throw new Error("Staff adjustment role choices JSON is invalid.");
      }
      try {
        parsedStaffReasons = JSON.parse(staffReasonsJson || "[]");
      } catch {
        throw new Error("Staff adjustment reasons JSON is invalid.");
      }
      const next: ControlConfig = {
        ...config,
        tickets: { ...config.tickets, types: Array.isArray(parsedTypes) ? (parsedTypes as any) : [] },
        staffAdjustments: {
          ...config.staffAdjustments,
          roleChoices: Array.isArray(parsedStaffRoleChoices) ? (parsedStaffRoleChoices as any) : [],
          reasons: Array.isArray(parsedStaffReasons) ? (parsedStaffReasons as any) : [],
        },
      };
      const res = await fetch("/api/control-center", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ config: next }),
      });
      const json = await res.json();
      if (!res.ok || json?.ok === false) {
        throw new Error(json?.error?.message || "Save failed.");
      }
      setConfig(json.data.config);
      setTypesJson(JSON.stringify(json.data.config.tickets.types, null, 2));
      setStaffRoleChoicesJson(JSON.stringify(json.data.config.staffAdjustments.roleChoices, null, 2));
      setStaffReasonsJson(JSON.stringify(json.data.config.staffAdjustments.reasons, null, 2));
      setOk("Saved. Bot sync triggered.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="text-sm text-white/70">Loading control center…</div>;
  }
  if (!config) {
    return <div className="text-sm text-rose-200">Failed to load control center.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-500/20 via-fuchsia-500/10 to-cyan-500/20 p-7 backdrop-blur">
        <h1 className="text-3xl font-semibold tracking-tight">Control Center</h1>
        <p className="mt-2 text-sm text-white/70">
          Manage branding and ticket system behavior from one place. This is the base for full website-controlled bot automation.
        </p>
      </div>

      {error ? <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">{error}</div> : null}
      {ok ? <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">{ok}</div> : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <h2 className="text-lg font-semibold">Branding</h2>
          <div className="mt-4 space-y-4">
            <Field label="Footer text">
              <input
                value={config.branding.footerText}
                onChange={(e) => setConfig({ ...config, branding: { ...config.branding, footerText: e.target.value } })}
                className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm outline-none focus:border-indigo-400/60"
              />
            </Field>
            <Field label="Footer icon URL">
              <input
                value={config.branding.footerIconUrl}
                onChange={(e) => setConfig({ ...config, branding: { ...config.branding, footerIconUrl: e.target.value } })}
                className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm outline-none focus:border-indigo-400/60"
              />
            </Field>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <h2 className="text-lg font-semibold">Ticket Panel</h2>
          <div className="mt-4 space-y-4">
            <Field label="Ticket color">
              <input
                value={config.tickets.color}
                onChange={(e) => setConfig({ ...config, tickets: { ...config.tickets, color: e.target.value } })}
                className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm outline-none focus:border-indigo-400/60"
              />
            </Field>
            <Field label="Ticket panel image URL">
              <input
                value={config.tickets.panelImageUrl}
                onChange={(e) => setConfig({ ...config, tickets: { ...config.tickets, panelImageUrl: e.target.value } })}
                className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm outline-none focus:border-indigo-400/60"
              />
            </Field>
            <Field label="Ticket panel description">
              <textarea
                value={config.tickets.panelDescription}
                onChange={(e) => setConfig({ ...config, tickets: { ...config.tickets, panelDescription: e.target.value } })}
                rows={8}
                className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm outline-none focus:border-indigo-400/60"
              />
            </Field>
            <Field label="Ticket types JSON">
              <textarea
                value={typesJson}
                onChange={(e) => setTypesJson(e.target.value)}
                rows={8}
                className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 font-mono text-xs outline-none focus:border-indigo-400/60"
              />
            </Field>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
        <h2 className="text-lg font-semibold">Staff Adjustments</h2>
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <Field label="Embed color">
            <input
              value={config.staffAdjustments.color}
              onChange={(e) =>
                setConfig({ ...config, staffAdjustments: { ...config.staffAdjustments, color: e.target.value } })
              }
              className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm outline-none focus:border-indigo-400/60"
            />
          </Field>
          <Field label="Ack message">
            <input
              value={config.staffAdjustments.ackMessage}
              onChange={(e) =>
                setConfig({ ...config, staffAdjustments: { ...config.staffAdjustments, ackMessage: e.target.value } })
              }
              className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm outline-none focus:border-indigo-400/60"
            />
          </Field>
          <div className="xl:col-span-2">
            <Field label="Title template ({number} supported)">
              <input
                value={config.staffAdjustments.titleTemplate}
                onChange={(e) =>
                  setConfig({ ...config, staffAdjustments: { ...config.staffAdjustments, titleTemplate: e.target.value } })
                }
                className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm outline-none focus:border-indigo-400/60"
              />
            </Field>
          </div>
          <div className="xl:col-span-2">
            <Field label="Description template">
              <textarea
                value={config.staffAdjustments.descriptionTemplate}
                onChange={(e) =>
                  setConfig({ ...config, staffAdjustments: { ...config.staffAdjustments, descriptionTemplate: e.target.value } })
                }
                rows={7}
                className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm outline-none focus:border-indigo-400/60"
              />
              <div className="text-xs text-white/45">
                Supported placeholders: {"{subject}"}, {"{oldRole}"}, {"{newRole}"}, {"{reason}"}, {"{signedBy}"}, {"{rank}"},{" "}
                {"{number}"}
              </div>
            </Field>
          </div>
          <Field label="Thumbnail URL">
            <input
              value={config.staffAdjustments.thumbnailUrl}
              onChange={(e) =>
                setConfig({ ...config, staffAdjustments: { ...config.staffAdjustments, thumbnailUrl: e.target.value } })
              }
              className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm outline-none focus:border-indigo-400/60"
            />
          </Field>
          <Field label="Image URL">
            <input
              value={config.staffAdjustments.imageUrl}
              onChange={(e) =>
                setConfig({ ...config, staffAdjustments: { ...config.staffAdjustments, imageUrl: e.target.value } })
              }
              className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm outline-none focus:border-indigo-400/60"
            />
          </Field>
          <div className="xl:col-span-2">
            <Field label="Role choices JSON">
              <textarea
                value={staffRoleChoicesJson}
                onChange={(e) => setStaffRoleChoicesJson(e.target.value)}
                rows={8}
                className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 font-mono text-xs outline-none focus:border-indigo-400/60"
              />
            </Field>
          </div>
          <div className="xl:col-span-2">
            <Field label="Reason choices JSON">
              <textarea
                value={staffReasonsJson}
                onChange={(e) => setStaffReasonsJson(e.target.value)}
                rows={5}
                className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 font-mono text-xs outline-none focus:border-indigo-400/60"
              />
            </Field>
          </div>
        </div>
      </section>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="rounded-xl bg-indigo-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save & Sync Bot"}
        </button>
        <button
          type="button"
          onClick={() => void refresh()}
          className="rounded-xl border border-white/10 bg-white/5 px-5 py-2 text-sm font-semibold text-white/85 transition hover:bg-white/10"
        >
          Reload
        </button>
      </div>
    </div>
  );
}

function Field(props: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-2">
      <div className="text-xs font-semibold uppercase tracking-wider text-white/45">{props.label}</div>
      {props.children}
    </label>
  );
}
