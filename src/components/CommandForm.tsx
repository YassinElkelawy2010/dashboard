"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { DiscordMessagePreview } from "@/components/DiscordMessagePreview";
import {
  buildExtrasFromFormState,
  defaultFormExtras,
  formExtrasFromParsed,
  parseCommandExtrasLoose,
  type CommandFormExtrasState,
} from "@/lib/commandExtras";

type OptionType = "STRING" | "INTEGER" | "BOOLEAN" | "USER" | "CHANNEL" | "ROLE";

export type CommandFormValue = {
  name: string;
  description: string;
  commandType: "SLASH" | "PREFIX";
  enabled: boolean;
  guildOnly: boolean;
  dmPermission: boolean;
  responseType: "TEXT" | "EMBED";
  ephemeral: boolean;
  responseTemplateText: string;
  responseTemplateEmbeds: Array<{
    title: string;
    description: string;
    color: string;
    bannerUrl: string;
    bannerPosition: "top" | "middle" | "bottom";
    logoUrl: string;
    logoPosition: "top-left" | "top-right" | "bottom-left" | "bottom-right";
    thumbnailUrl: string;
    imageUrl: string;
    footerText: string;
    footerIconUrl: string;
    autoReactEmojisText: string;
    fields: Array<{ name: string; value: string; inline: boolean }>;
  }>;
  options: Array<{
    type: OptionType;
    name: string;
    description: string;
    required: boolean;
    enabled: boolean;
    min: string;
    max: string;
    choiceMode: "NORMAL" | "ROLE_CHOICES" | "REACTION_AMOUNT";
    roleChoicesText: string;
    choicesJson: string;
  }>;
  extras: CommandFormExtrasState;
  conditionsJson: string;
  permissionsMatrixJson: string;
  argParserJson: string;
  actionsJson: string;
  componentsJson: string;
};

function emptyOption(): CommandFormValue["options"][number] {
  return {
    type: "STRING",
    name: "field",
    description: "Field description",
    required: false,
    enabled: true,
    min: "",
    max: "",
    choiceMode: "NORMAL",
    roleChoicesText: "",
    choicesJson: "",
  };
}

function toSlashName(input: string): string {
  return String(input ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32);
}

function emptyEmbedField(): { name: string; value: string; inline: boolean } {
  return { name: "", value: "", inline: false };
}

function emptyEmbed(): CommandFormValue["responseTemplateEmbeds"][number] {
  return {
    title: "",
    description: "",
    color: "#f9a8d8",
    bannerUrl: "",
    bannerPosition: "bottom",
    logoUrl: "",
    logoPosition: "top-right",
    thumbnailUrl: "",
    imageUrl: "",
    footerText: "",
    footerIconUrl: "",
    autoReactEmojisText: "",
    fields: [],
  };
}

export function defaultCommandFormValue(): CommandFormValue {
  return {
    name: "my_command",
    description: "Describe what this command does.",
    commandType: "SLASH",
    enabled: true,
    guildOnly: true,
    dmPermission: false,
    responseType: "TEXT",
    ephemeral: true,
    responseTemplateText: "Hello {{user}}! You ran /{{command}}.",
    responseTemplateEmbeds: [
      {
        title: "GVRA",
        description: "Hello {{user}}!",
        color: "#f9a8d8",
        bannerUrl: "",
        bannerPosition: "bottom",
        logoUrl: "",
        logoPosition: "top-right",
        thumbnailUrl: "",
        imageUrl: "",
        footerText: "",
        footerIconUrl: "",
        autoReactEmojisText: "",
        fields: [],
      },
    ],
    options: [],
    extras: defaultFormExtras(),
    conditionsJson: JSON.stringify({ mode: "AND", rules: [] }, null, 2),
    permissionsMatrixJson: JSON.stringify({ run: {}, view: {}, edit: {} }, null, 2),
    argParserJson: JSON.stringify({ strictTypes: true, allowQuotedStrings: true, defaults: {} }, null, 2),
    actionsJson: JSON.stringify({ steps: [] }, null, 2),
    componentsJson: JSON.stringify({ buttons: [], selects: [], modals: [] }, null, 2),
  };
}

function unwrapResponseTemplate(raw: unknown): Record<string, unknown> | null {
  if (raw == null) return null;
  if (typeof raw === "string") {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      return { text: raw };
    } catch {
      return { text: raw };
    }
  }
  if (typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return null;
}

function extractTemplateText(tpl: Record<string, unknown> | null): string {
  if (!tpl) return "";
  if (typeof tpl.text === "string") return tpl.text;
  const nested = tpl.template;
  if (nested && typeof nested === "object" && !Array.isArray(nested) && typeof (nested as Record<string, unknown>).text === "string") {
    return String((nested as Record<string, unknown>).text);
  }
  return "";
}

function extractTemplateEmbeds(tpl: Record<string, unknown> | null, isEmbedType: boolean): unknown[] {
  if (!tpl) return [];
  if (Array.isArray(tpl.embeds) && tpl.embeds.length > 0) {
    return tpl.embeds as unknown[];
  }
  const nested = tpl.template;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    const t = nested as Record<string, unknown>;
    if (Array.isArray(t.embeds) && t.embeds.length > 0) {
      return t.embeds as unknown[];
    }
  }
  if (isEmbedType) {
    return [
      {
        title: tpl.title,
        description: tpl.description,
        color: tpl.color,
        fields: tpl.fields,
        imageUrl: tpl.imageUrl,
        thumbnailUrl: tpl.thumbnailUrl,
        footerText: tpl.footerText,
        footerIconUrl: tpl.footerIconUrl,
      },
    ];
  }
  return [];
}

function normalizeResponseType(raw: unknown): "TEXT" | "EMBED" {
  const s = String(raw ?? "").toUpperCase();
  return s === "EMBED" ? "EMBED" : "TEXT";
}

function inferResponseType(cmd: any, tpl: Record<string, unknown> | null): "TEXT" | "EMBED" {
  const normalized = normalizeResponseType(cmd?.responseType);
  if (normalized === "EMBED") return "EMBED";
  const legacy = String(cmd?.type ?? cmd?.replyType ?? "").toUpperCase();
  if (legacy === "EMBED") return "EMBED";
  if (Boolean(cmd?.isEmbed)) return "EMBED";
  if (!tpl) return normalized;
  const hasEmbeds = Array.isArray(tpl.embeds) && tpl.embeds.length > 0;
  const hasLegacyEmbedFields =
    typeof tpl.title === "string" ||
    typeof tpl.description === "string" ||
    Array.isArray(tpl.fields) ||
    typeof tpl.color === "string" ||
    typeof tpl.imageUrl === "string" ||
    typeof tpl.thumbnailUrl === "string";
  if (hasEmbeds || hasLegacyEmbedFields) return "EMBED";
  return normalized;
}

function parseRoleChoicesTextToChoices(text: string) {
  return text
    .split(/[\n,]+/g)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const m = line.match(/^(.+?)\s*[:|]\s*(\d{5,25})$/);
      if (m) {
        return { name: m[1].trim().slice(0, 100), value: `<@&${m[2]}>` };
      }
      if (/^\d{5,25}$/.test(line)) {
        return { name: `Role ${line}`, value: `<@&${line}>` };
      }
      return { name: line.slice(0, 100), value: line.slice(0, 100) };
    })
    .slice(0, 25);
}

function inferChoiceModeFromChoices(choices: unknown): "NORMAL" | "ROLE_CHOICES" | "REACTION_AMOUNT" {
  if (!Array.isArray(choices)) return "NORMAL";
  const hasRoleLike = choices.some((c: any) => /<@&\d{5,25}>/.test(String(c?.value ?? "")));
  return hasRoleLike ? "ROLE_CHOICES" : "NORMAL";
}

export function commandFormValueFromApi(cmd: any): CommandFormValue {
  const opts = Array.isArray(cmd.options) ? cmd.options : [];
  const tpl = unwrapResponseTemplate(cmd.responseTemplate);
  const responseType = inferResponseType(cmd, tpl);
  const parsedExtras = parseCommandExtrasLoose(cmd.extras);

  const rawEmbeds = extractTemplateEmbeds(tpl, responseType === "EMBED");
  const embeds = rawEmbeds.length > 0 ? rawEmbeds : [emptyEmbed()];
  const textBody = extractTemplateText(tpl);

  return {
    name: String(cmd.name ?? ""),
    description: String(cmd.description ?? cmd.commandDescription ?? ""),
    commandType: parsedExtras.commandType === "PREFIX" ? "PREFIX" : "SLASH",
    enabled: Boolean(cmd.enabled),
    guildOnly: Boolean(cmd.guildOnly ?? true),
    dmPermission: Boolean(cmd.dmPermission ?? false),
    responseType,
    ephemeral: Boolean(cmd.ephemeral ?? true),
    responseTemplateText: responseType === "EMBED" ? "" : textBody,
    responseTemplateEmbeds:
      responseType === "EMBED"
        ? embeds.map((embed: any) => ({
            title: String(embed?.title ?? ""),
            description: String(embed?.description ?? ""),
            color: String(embed?.color ?? "#6366f1"),
            bannerUrl: String(embed?.bannerUrl ?? ""),
            bannerPosition: embed?.bannerPosition === "top" || embed?.bannerPosition === "middle" ? embed.bannerPosition : "bottom",
            logoUrl: String(embed?.logoUrl ?? ""),
            logoPosition:
              embed?.logoPosition === "top-left" ||
              embed?.logoPosition === "bottom-left" ||
              embed?.logoPosition === "bottom-right"
                ? embed.logoPosition
                : "top-right",
            imageUrl: String(embed?.imageUrl ?? ""),
            thumbnailUrl: String(embed?.thumbnailUrl ?? ""),
            footerText: String(embed?.footerText ?? ""),
            footerIconUrl: String(embed?.footerIconUrl ?? ""),
            autoReactEmojisText: Array.isArray(embed?.autoReactEmojis) ? embed.autoReactEmojis.map((x: any) => String(x ?? "")).join("\n") : "",
            fields: Array.isArray(embed?.fields)
              ? embed.fields.map((f: any) => ({
                  name: String(f?.name ?? ""),
                  value: String(f?.value ?? ""),
                  inline: Boolean(f?.inline),
                }))
              : [],
          }))
        : [emptyEmbed()],
    options: opts.map((o: any) => ({
      type: o.type,
      name: String(o.name ?? ""),
      description: String(o.description ?? ""),
      required: Boolean(o.required),
      enabled: o.enabled !== false,
      min: o.min == null ? "" : String(o.min),
      max: o.max == null ? "" : String(o.max),
      choiceMode: inferChoiceModeFromChoices(o.choices),
      roleChoicesText: Array.isArray(o.choices)
        ? o.choices.map((c: any) => `${String(c?.name ?? "")}:${String(c?.value ?? "").replace(/[<>@&]/g, "")}`).join("\n")
        : "",
      choicesJson: o.choices ? JSON.stringify(o.choices, null, 2) : "",
    })),
    extras: formExtrasFromParsed(parsedExtras),
    conditionsJson: JSON.stringify(parsedExtras.conditions ?? { mode: "AND", rules: [] }, null, 2),
    permissionsMatrixJson: JSON.stringify(parsedExtras.permissionsMatrix ?? { run: {}, view: {}, edit: {} }, null, 2),
    argParserJson: JSON.stringify(parsedExtras.argParser ?? { strictTypes: true, allowQuotedStrings: true, defaults: {} }, null, 2),
    actionsJson: JSON.stringify(parsedExtras.actions ?? { steps: [] }, null, 2),
    componentsJson: JSON.stringify(parsedExtras.components ?? { buttons: [], selects: [], modals: [] }, null, 2),
  };
}

export function CommandForm(props: {
  mode: "create" | "edit" | "editNative";
  commandId?: string;
  nativeCatalogKey?: string;
  initial?: CommandFormValue;
  lockOptions?: boolean;
}) {
  const router = useRouter();
  const [v, setV] = useState<CommandFormValue>(props.initial ?? defaultCommandFormValue());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState<string | null>(null);

  const preview = useMemo(() => {
    const base = {
      name: v.name,
      description: v.description,
      options: v.options
        .filter((o) => o.enabled !== false)
        .map((o, idx) => ({
        type: o.type,
        name: o.name,
        description: o.description,
        required: o.required,
        position: idx,
        min: o.min.trim() ? Number(o.min) : null,
        max: o.max.trim() ? Number(o.max) : null,
        choices: o.choiceMode === "ROLE_CHOICES" ? parseRoleChoicesTextToChoices(o.roleChoicesText) : parseChoices(o.type, o.choicesJson),
      })),
    };
    return base;
  }, [v]);

  const previewCtx = useMemo(
    () => ({
      user: "@DriverUser",
      username: "DriverUser",
      command: v.name || "command",
      guild: "GVRA Server",
      channel: "#general",
      options: Object.fromEntries(
        v.options
          .filter((o) => o.enabled !== false)
          .map((o) => [
            o.name || "field",
            o.choiceMode === "ROLE_CHOICES" ? "@RoleMention" : o.type === "INTEGER" ? "10" : o.type === "BOOLEAN" ? "true" : "value",
          ]),
      ),
    }),
    [v.name, v.options],
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {props.mode === "create" ? "Create command" : props.mode === "editNative" ? "Edit built-in command" : "Edit command"}
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-white/60">
            {props.mode === "editNative" ? (
              <>
                Built-in commands still run their normal bot behavior. Name, description, permissions, and optional slash fields (where
                not fixed) sync to Discord; response templates are kept like dashboard commands for consistency.
              </>
            ) : (
              <>
                Slash command names must be lowercase <span className="text-white/80">a-z</span>, numbers, and underscores.
              </>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/app/commands"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/85 transition hover:bg-white/10"
          >
            Back
          </Link>
          <button
            type="button"
            disabled={saving}
            onClick={() => void save()}
            className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-400 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {error ? <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">{error}</div> : null}
      {saveOk ? <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">{saveOk}</div> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Section title="Basics">
            <Field label="Command name">
              <input
                value={v.name}
                onChange={(e) =>
                  setV({
                    ...v,
                    name: v.commandType === "SLASH" ? toSlashName(e.target.value) : e.target.value.slice(0, 32),
                  })
                }
                className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm outline-none focus:border-indigo-400/60"
                placeholder="example_command"
              />
            </Field>
            <Field label="Description">
              <input
                value={v.description}
                onChange={(e) => setV({ ...v, description: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm outline-none focus:border-indigo-400/60"
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Command type">
                <select
                  value={v.commandType}
                  onChange={(e) => setV({ ...v, commandType: e.target.value as CommandFormValue["commandType"] })}
                  className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm outline-none focus:border-indigo-400/60"
                >
                  <option value="SLASH">Slash (/name)</option>
                  <option value="PREFIX">Prefix (!name)</option>
                </select>
              </Field>
              <Toggle label="Enabled" checked={v.enabled} onChange={(enabled) => setV({ ...v, enabled })} />
              <Toggle label="Ephemeral replies" checked={v.ephemeral} onChange={(ephemeral) => setV({ ...v, ephemeral })} />
              <Toggle label="Guild only" checked={v.guildOnly} onChange={(guildOnly) => setV({ ...v, guildOnly })} />
              <Toggle label="DM permission" checked={v.dmPermission} onChange={(dmPermission) => setV({ ...v, dmPermission })} />
            </div>
          </Section>

          <Section title="Runtime behavior (combine freely)">
            <p className="text-sm text-white/55">
              Optional rules and post-send actions for <span className="text-white/75">dashboard-configured</span> slash commands. Channel
              and role checks apply in servers only. Several options can be active at once.
            </p>
            <Toggle
              label="Auto-react on the bot’s reply"
              checked={v.extras.autoReactionEnabled}
              onChange={(autoReactionEnabled) => setV({ ...v, extras: { ...v.extras, autoReactionEnabled } })}
            />
            {v.extras.autoReactionEnabled ? (
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-white/45">Reaction emojis (max 20)</div>
                <p className="text-xs text-white/45">Unicode (✅) or custom (&lt;:name:id&gt;, &lt;a:name:id&gt;). Applied in order.</p>
                {v.extras.autoReactionEmojis.map((emoji: string, ei: number) => (
                  <div key={ei} className="flex gap-2">
                    <input
                      value={emoji}
                      onChange={(e) => {
                        const next = [...v.extras.autoReactionEmojis];
                        next[ei] = e.target.value;
                        setV({ ...v, extras: { ...v.extras, autoReactionEmojis: next } });
                      }}
                      placeholder="e.g. ✅ or <:tick:1234567890>"
                      className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm outline-none focus:border-indigo-400/60"
                    />
                    <button
                      type="button"
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
                      onClick={() => {
                        const next = v.extras.autoReactionEmojis.filter((_: string, i: number) => i !== ei);
                        setV({
                          ...v,
                          extras: {
                            ...v.extras,
                            autoReactionEmojis: next.length ? next : [""],
                          },
                        });
                      }}
                      title="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  disabled={v.extras.autoReactionEmojis.length >= 20}
                  onClick={() =>
                    setV({
                      ...v,
                      extras: { ...v.extras, autoReactionEmojis: [...v.extras.autoReactionEmojis, ""] },
                    })
                  }
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white/85 transition hover:bg-white/10 disabled:opacity-40"
                >
                  <Plus className="h-4 w-4" />
                  Add emoji
                </button>
              </div>
            ) : null}

            <Field label="Required role IDs (optional)" hint="One ID per line or comma-separated. Empty = no role gate.">
              <textarea
                value={v.extras.requiredRoleIdsText}
                onChange={(e) => setV({ ...v, extras: { ...v.extras, requiredRoleIdsText: e.target.value } })}
                rows={4}
                className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 font-mono text-xs outline-none focus:border-indigo-400/60"
                placeholder="1470486588654882948"
              />
            </Field>
            <Field label="How to apply required roles">
              <select
                value={v.extras.requiredRolesMode}
                onChange={(e) =>
                  setV({
                    ...v,
                    extras: { ...v.extras, requiredRolesMode: e.target.value as "all" | "any" },
                  })
                }
                className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm outline-none focus:border-indigo-400/60"
              >
                <option value="all">Member must have every role listed</option>
                <option value="any">Member must have at least one role listed</option>
              </select>
            </Field>

            <Field
              label="Allowed channel IDs only (optional)"
              hint="If any IDs are set, the command only works in those channels. Empty = all channels (except blocked)."
            >
              <textarea
                value={v.extras.allowedChannelIdsText}
                onChange={(e) => setV({ ...v, extras: { ...v.extras, allowedChannelIdsText: e.target.value } })}
                rows={3}
                className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 font-mono text-xs outline-none focus:border-indigo-400/60"
              />
            </Field>
            <Field label="Blocked channel IDs (optional)" hint="Command will refuse in these channels. One ID per line or comma-separated.">
              <textarea
                value={v.extras.deniedChannelIdsText}
                onChange={(e) => setV({ ...v, extras: { ...v.extras, deniedChannelIdsText: e.target.value } })}
                rows={3}
                className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 font-mono text-xs outline-none focus:border-indigo-400/60"
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Toggle
                label="Allow @everyone / @here (otherwise user & role mentions still work)"
                checked={v.extras.mentionEveryone}
                onChange={(mentionEveryone) => setV({ ...v, extras: { ...v.extras, mentionEveryone } })}
              />
              <Toggle
                label="Suppress link previews (text replies)"
                checked={v.extras.suppressEmbeds}
                onChange={(suppressEmbeds) => setV({ ...v, extras: { ...v.extras, suppressEmbeds } })}
              />
              <Toggle
                label="Pin the bot reply (needs permission)"
                checked={v.extras.pinReply}
                onChange={(pinReply) => setV({ ...v, extras: { ...v.extras, pinReply } })}
              />
              <Toggle
                label='Private "Posted!" then post publicly (slash)'
                checked={v.extras.privateAckThenPost}
                onChange={(privateAckThenPost) => setV({ ...v, extras: { ...v.extras, privateAckThenPost } })}
              />
            </div>
            <details className="rounded-xl border border-white/10 bg-black/20 p-3">
              <summary className="cursor-pointer text-sm font-semibold text-white/80">Advanced rules & actions (optional)</summary>
              <div className="mt-3 space-y-3">
                <Field
                  label="Condition builder (JSON)"
                  hint='Role/channel/cooldown/user rules with AND/OR.'
                >
                  <textarea
                    value={v.conditionsJson}
                    onChange={(e) => setV({ ...v, conditionsJson: e.target.value })}
                    rows={6}
                    className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 font-mono text-xs outline-none focus:border-indigo-400/60"
                  />
                </Field>
                <Field
                  label="Permissions matrix (JSON)"
                  hint="Who can run/view/edit this command."
                >
                  <textarea
                    value={v.permissionsMatrixJson}
                    onChange={(e) => setV({ ...v, permissionsMatrixJson: e.target.value })}
                    rows={6}
                    className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 font-mono text-xs outline-none focus:border-indigo-400/60"
                  />
                </Field>
                <Field label="Argument parser (JSON)" hint="Prefix parser behavior.">
                  <textarea
                    value={v.argParserJson}
                    onChange={(e) => setV({ ...v, argParserJson: e.target.value })}
                    rows={4}
                    className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 font-mono text-xs outline-none focus:border-indigo-400/60"
                  />
                </Field>
                <Field label="Multi-step actions (JSON)" hint="reply/dm/roles/react steps.">
                  <textarea
                    value={v.actionsJson}
                    onChange={(e) => setV({ ...v, actionsJson: e.target.value })}
                    rows={7}
                    className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 font-mono text-xs outline-none focus:border-indigo-400/60"
                  />
                </Field>
                <Field label="Buttons/selects/modals (JSON)" hint="Interactive components config.">
                  <textarea
                    value={v.componentsJson}
                    onChange={(e) => setV({ ...v, componentsJson: e.target.value })}
                    rows={6}
                    className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 font-mono text-xs outline-none focus:border-indigo-400/60"
                  />
                </Field>
              </div>
            </details>
          </Section>

          <Section title="Response">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Type">
                <select
                  value={v.responseType}
                  onChange={(e) => setV({ ...v, responseType: e.target.value as CommandFormValue["responseType"] })}
                  className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm outline-none focus:border-indigo-400/60"
                >
                  <option value="TEXT">Text</option>
                  <option value="EMBED">Embed</option>
                </select>
              </Field>
              <Toggle
                label='Private "Posted!" then post publicly (slash)'
                checked={v.extras.privateAckThenPost}
                onChange={(privateAckThenPost) => setV({ ...v, extras: { ...v.extras, privateAckThenPost } })}
              />
              {v.responseType === "EMBED" ? (
                <Field label="Ping above embed">
                  <select
                    value={v.extras.embedPingType}
                    onChange={(e) =>
                      setV({
                        ...v,
                        extras: {
                          ...v.extras,
                          embedPingType: e.target.value as "none" | "everyone" | "here" | "role",
                        },
                      })
                    }
                    className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm outline-none focus:border-indigo-400/60"
                  >
                    <option value="none">None</option>
                    <option value="everyone">@everyone</option>
                    <option value="here">@here</option>
                    <option value="role">Specific role</option>
                  </select>
                </Field>
              ) : null}
            </div>
            <details className="rounded-xl border border-white/10 bg-black/20 p-3">
              <summary className="cursor-pointer text-sm font-semibold text-white/80">Link button (optional)</summary>
              <div className="mt-3 space-y-3">
                <Toggle
                  label="Enable link button"
                  checked={v.extras.quickLinkButtonEnabled}
                  onChange={(quickLinkButtonEnabled) => setV({ ...v, extras: { ...v.extras, quickLinkButtonEnabled } })}
                />
                {v.extras.quickLinkButtonEnabled ? (
                  <>
                    <Field label="Button text">
                      <input
                        value={v.extras.quickLinkButtonLabel}
                        onChange={(e) => setV({ ...v, extras: { ...v.extras, quickLinkButtonLabel: e.target.value } })}
                        placeholder="Join Session"
                        className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm outline-none focus:border-indigo-400/60"
                      />
                    </Field>
                    <Field label="Button emoji (optional)" hint="Unicode (🔗) or custom <:name:id> / <a:name:id>">
                      <input
                        value={v.extras.quickLinkButtonEmoji}
                        onChange={(e) => setV({ ...v, extras: { ...v.extras, quickLinkButtonEmoji: e.target.value } })}
                        placeholder="🔗"
                        className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm outline-none focus:border-indigo-400/60"
                      />
                    </Field>
                    <Field label="Link URL">
                      <input
                        value={v.extras.quickLinkButtonUrl}
                        onChange={(e) => setV({ ...v, extras: { ...v.extras, quickLinkButtonUrl: e.target.value } })}
                        placeholder="https://example.com/join"
                        className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm outline-none focus:border-indigo-400/60"
                      />
                    </Field>
                    <Field label="Allowed role IDs (optional)" hint="If set, only users with one of these roles can get link from the button.">
                      <textarea
                        value={v.extras.quickLinkAllowedRoleIdsText}
                        onChange={(e) => setV({ ...v, extras: { ...v.extras, quickLinkAllowedRoleIdsText: e.target.value } })}
                        rows={3}
                        className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 font-mono text-xs outline-none focus:border-indigo-400/60"
                        placeholder="1470486588654882948"
                      />
                    </Field>
                  </>
                ) : null}
              </div>
            </details>
            {v.responseType === "EMBED" && v.extras.embedPingType === "role" ? (
              <Field label="Role IDs to ping above embed" hint="One role ID per line. Multiple IDs ping multiple roles.">
                <textarea
                  value={v.extras.embedPingRoleIdsText}
                  onChange={(e) => setV({ ...v, extras: { ...v.extras, embedPingRoleIdsText: e.target.value } })}
                  rows={3}
                  placeholder="1470486588654882948"
                  className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 font-mono text-xs outline-none focus:border-indigo-400/60"
                />
              </Field>
            ) : null}

            {v.responseType === "TEXT" ? (
              <>
                <Field
                  label="Template"
                  hint='Use tokens like {USERNAME}, {COMMAND}, or {PT}. Also supports {{options.pt}}.'
                >
                  <textarea
                    value={v.responseTemplateText}
                    onChange={(e) => setV({ ...v, responseTemplateText: e.target.value })}
                    rows={8}
                    className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 font-mono text-xs outline-none focus:border-indigo-400/60"
                  />
                </Field>
                <Field label="Quick Discord preview">
                  <div className="rounded-xl border border-white/10 bg-[#313338] p-3 text-sm text-white/90">
                    {renderPreviewTemplate(v.responseTemplateText || "Message preview...", previewCtx)}
                  </div>
                </Field>
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setV({ ...v, responseTemplateEmbeds: [...v.responseTemplateEmbeds, emptyEmbed()] })}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white/85 transition hover:bg-white/10"
                  >
                    <Plus className="h-4 w-4" />
                    Add another embed
                  </button>
                </div>
                {v.responseTemplateEmbeds.map((embed, embedIdx) => (
                  <div key={embedIdx} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-white/80">Embed {embedIdx + 1}</div>
                      {v.responseTemplateEmbeds.length > 1 ? (
                        <button
                          type="button"
                          className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 p-2 text-white/70 transition hover:bg-white/10"
                          onClick={() =>
                            setV({
                              ...v,
                              responseTemplateEmbeds: v.responseTemplateEmbeds.filter((_, i) => i !== embedIdx),
                            })
                          }
                          title="Remove embed"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>

                    <div className="space-y-3">
                      <Field label="Embed title (optional)">
                        <input
                          value={embed.title}
                          onChange={(e) => {
                            const next = [...v.responseTemplateEmbeds];
                            next[embedIdx] = { ...next[embedIdx], title: e.target.value };
                            setV({ ...v, responseTemplateEmbeds: next });
                          }}
                          className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm outline-none focus:border-indigo-400/60"
                        />
                      </Field>
                      <Field label="Embed description (optional)">
                        <textarea
                          value={embed.description}
                          onChange={(e) => {
                            const next = [...v.responseTemplateEmbeds];
                            next[embedIdx] = { ...next[embedIdx], description: e.target.value };
                            setV({ ...v, responseTemplateEmbeds: next });
                          }}
                          rows={5}
                          className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm outline-none focus:border-indigo-400/60"
                        />
                      </Field>
                      <Field label="Embed color (hex)">
                        <input
                          value={embed.color}
                          onChange={(e) => {
                            const next = [...v.responseTemplateEmbeds];
                            next[embedIdx] = { ...next[embedIdx], color: e.target.value };
                            setV({ ...v, responseTemplateEmbeds: next });
                          }}
                          className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm outline-none focus:border-indigo-400/60"
                        />
                      </Field>
                      <Field label="Banner URL (optional)" hint="Large artwork for this embed block.">
                        <input
                          value={embed.bannerUrl}
                          onChange={(e) => {
                            const next = [...v.responseTemplateEmbeds];
                            next[embedIdx] = { ...next[embedIdx], bannerUrl: e.target.value };
                            setV({ ...v, responseTemplateEmbeds: next });
                          }}
                          className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm outline-none focus:border-indigo-400/60"
                        />
                      </Field>
                      <Field label="Banner position">
                        <select
                          value={embed.bannerPosition}
                          onChange={(e) => {
                            const next = [...v.responseTemplateEmbeds];
                            next[embedIdx] = { ...next[embedIdx], bannerPosition: e.target.value as "top" | "middle" | "bottom" };
                            setV({ ...v, responseTemplateEmbeds: next });
                          }}
                          className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm outline-none focus:border-indigo-400/60"
                        >
                          <option value="top">Top</option>
                          <option value="middle">Middle</option>
                          <option value="bottom">Bottom</option>
                        </select>
                      </Field>
                      <Field label="Logo URL (optional)" hint="Small logo icon for this embed block.">
                        <input
                          value={embed.logoUrl}
                          onChange={(e) => {
                            const next = [...v.responseTemplateEmbeds];
                            next[embedIdx] = { ...next[embedIdx], logoUrl: e.target.value };
                            setV({ ...v, responseTemplateEmbeds: next });
                          }}
                          className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm outline-none focus:border-indigo-400/60"
                        />
                      </Field>
                      <Field label="Logo position">
                        <select
                          value={embed.logoPosition}
                          onChange={(e) => {
                            const next = [...v.responseTemplateEmbeds];
                            next[embedIdx] = {
                              ...next[embedIdx],
                              logoPosition: e.target.value as "top-left" | "top-right" | "bottom-left" | "bottom-right",
                            };
                            setV({ ...v, responseTemplateEmbeds: next });
                          }}
                          className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm outline-none focus:border-indigo-400/60"
                        >
                          <option value="top-left">Top Left</option>
                          <option value="top-right">Top Right</option>
                          <option value="bottom-left">Bottom Left</option>
                          <option value="bottom-right">Bottom Right</option>
                        </select>
                      </Field>
                      <Field label="Thumbnail URL (optional)" hint="Small image, top-right of the embed (Discord style).">
                        <input
                          value={embed.thumbnailUrl}
                          onChange={(e) => {
                            const next = [...v.responseTemplateEmbeds];
                            next[embedIdx] = { ...next[embedIdx], thumbnailUrl: e.target.value };
                            setV({ ...v, responseTemplateEmbeds: next });
                          }}
                          className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm outline-none focus:border-indigo-400/60"
                        />
                      </Field>
                      <Field label="Image URL (optional)" hint="Large banner image below fields.">
                        <input
                          value={embed.imageUrl}
                          onChange={(e) => {
                            const next = [...v.responseTemplateEmbeds];
                            next[embedIdx] = { ...next[embedIdx], imageUrl: e.target.value };
                            setV({ ...v, responseTemplateEmbeds: next });
                          }}
                          className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm outline-none focus:border-indigo-400/60"
                        />
                      </Field>
                      <Field label="Footer text (optional)">
                        <input
                          value={embed.footerText}
                          onChange={(e) => {
                            const next = [...v.responseTemplateEmbeds];
                            next[embedIdx] = { ...next[embedIdx], footerText: e.target.value };
                            setV({ ...v, responseTemplateEmbeds: next });
                          }}
                          className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm outline-none focus:border-indigo-400/60"
                        />
                      </Field>
                      <Field label="Footer icon URL (optional)">
                        <input
                          value={embed.footerIconUrl}
                          onChange={(e) => {
                            const next = [...v.responseTemplateEmbeds];
                            next[embedIdx] = { ...next[embedIdx], footerIconUrl: e.target.value };
                            setV({ ...v, responseTemplateEmbeds: next });
                          }}
                          className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm outline-none focus:border-indigo-400/60"
                        />
                      </Field>
                      <Field
                        label="Auto-react emojis for this embed (optional)"
                        hint="One emoji per line. Supports unicode or custom emoji IDs like <:name:id>."
                      >
                        <textarea
                          value={embed.autoReactEmojisText}
                          onChange={(e) => {
                            const next = [...v.responseTemplateEmbeds];
                            next[embedIdx] = { ...next[embedIdx], autoReactEmojisText: e.target.value };
                            setV({ ...v, responseTemplateEmbeds: next });
                          }}
                          rows={3}
                          className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 font-mono text-xs outline-none focus:border-indigo-400/60"
                        />
                      </Field>

                      <Section
                        title="Embed fields"
                        right={
                          <button
                            type="button"
                            onClick={() => {
                              const next = [...v.responseTemplateEmbeds];
                              next[embedIdx] = { ...next[embedIdx], fields: [...next[embedIdx].fields, emptyEmbedField()] };
                              setV({ ...v, responseTemplateEmbeds: next });
                            }}
                            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/85 transition hover:bg-white/10"
                          >
                            <Plus className="h-4 w-4" />
                            Add field
                          </button>
                        }
                      >
                        {embed.fields.length === 0 ? (
                          <div className="text-sm text-white/55">No fields yet for this embed.</div>
                        ) : (
                          <div className="space-y-3">
                            {embed.fields.map((field, fieldIdx) => (
                              <div key={fieldIdx} className="rounded-xl border border-white/10 bg-black/25 p-3">
                                <div className="mb-3 flex justify-end">
                                  <button
                                    type="button"
                                    className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 p-2 text-white/70 transition hover:bg-white/10"
                                    onClick={() => {
                                      const next = [...v.responseTemplateEmbeds];
                                      const fields = next[embedIdx].fields.filter((_, i) => i !== fieldIdx);
                                      next[embedIdx] = { ...next[embedIdx], fields };
                                      setV({ ...v, responseTemplateEmbeds: next });
                                    }}
                                    title="Remove embed field"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2">
                                  <Field label="Field name">
                                    <input
                                      value={field.name}
                                      onChange={(e) => {
                                        const next = [...v.responseTemplateEmbeds];
                                        const fields = [...next[embedIdx].fields];
                                        fields[fieldIdx] = { ...fields[fieldIdx], name: e.target.value };
                                        next[embedIdx] = { ...next[embedIdx], fields };
                                        setV({ ...v, responseTemplateEmbeds: next });
                                      }}
                                      className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm outline-none focus:border-indigo-400/60"
                                    />
                                  </Field>
                                  <Toggle
                                    label="Inline field"
                                    checked={field.inline}
                                    onChange={(inline) => {
                                      const next = [...v.responseTemplateEmbeds];
                                      const fields = [...next[embedIdx].fields];
                                      fields[fieldIdx] = { ...fields[fieldIdx], inline };
                                      next[embedIdx] = { ...next[embedIdx], fields };
                                      setV({ ...v, responseTemplateEmbeds: next });
                                    }}
                                  />
                                  <div className="sm:col-span-2">
                                    <Field label="Field value">
                                      <textarea
                                        value={field.value}
                                        onChange={(e) => {
                                          const next = [...v.responseTemplateEmbeds];
                                          const fields = [...next[embedIdx].fields];
                                          fields[fieldIdx] = { ...fields[fieldIdx], value: e.target.value };
                                          next[embedIdx] = { ...next[embedIdx], fields };
                                          setV({ ...v, responseTemplateEmbeds: next });
                                        }}
                                        rows={3}
                                        className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm outline-none focus:border-indigo-400/60"
                                      />
                                    </Field>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </Section>
                    </div>
                  </div>
                ))}
                <Field label="Quick Discord embed preview">
                  <div className="rounded-xl border border-white/10 bg-[#313338] p-4">
                    <DiscordMessagePreview mode="embed" embeds={v.responseTemplateEmbeds} previewCtx={previewCtx} commandType={v.commandType} />
                  </div>
                </Field>
              </div>
            )}
          </Section>
        </div>

        <div className="space-y-6">
          <Section
            title="Fields (slash options)"
            right={
              props.lockOptions ? null : (
                <button
                  type="button"
                  onClick={() => setV({ ...v, options: [...v.options, emptyOption()] })}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white/85 transition hover:bg-white/10"
                >
                  <Plus className="h-4 w-4" />
                  Add field
                </button>
              )
            }
          >
            {props.lockOptions ? (
              <div className="text-sm text-white/55">
                This built-in command uses subcommands or dynamic choices from the bot. Its slash structure is fixed in code; only name,
                description, permissions, and response metadata are saved here.
              </div>
            ) : v.options.length === 0 ? (
              <div className="text-sm text-white/55">No custom fields yet. This command will have only the base `/name`.</div>
            ) : (
              <div className="space-y-3">
                {v.options.map((o, idx) => (
                  <div key={idx} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-white/80">
                        <GripVertical className="h-4 w-4 text-white/35" />
                        Field {idx + 1}
                      </div>
                      <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 p-2 text-white/70 transition hover:bg-white/10"
                        onClick={() => setV({ ...v, options: v.options.filter((_, i) => i !== idx) })}
                        title="Remove field"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div className="sm:col-span-2 rounded-lg border border-indigo-400/25 bg-indigo-500/10 px-3 py-2 text-xs text-indigo-100">
                        Use this answer in templates with <span className="font-mono">{`{${(o.name || `field_${idx + 1}`).toUpperCase()}}`}</span>
                      </div>
                      <Field label="Type">
                        <select
                          value={o.type}
                          onChange={(e) => {
                            const next = [...v.options];
                            next[idx] = { ...next[idx], type: e.target.value as OptionType, choicesJson: "" };
                            setV({ ...v, options: next });
                          }}
                          className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm outline-none focus:border-indigo-400/60"
                        >
                          <option value="STRING">String</option>
                          <option value="INTEGER">Integer</option>
                          <option value="BOOLEAN">Boolean</option>
                          <option value="USER">User</option>
                          <option value="CHANNEL">Channel</option>
                          <option value="ROLE">Role</option>
                        </select>
                      </Field>
                      <Toggle
                        label="Show in slash command"
                        checked={o.enabled !== false}
                        onChange={(enabled) => {
                          const next = [...v.options];
                          next[idx] = { ...next[idx], enabled };
                          setV({ ...v, options: next });
                        }}
                      />
                      <Toggle
                        label="Optional question"
                        checked={!o.required}
                        onChange={(optional) => {
                          const next = [...v.options];
                          next[idx] = { ...next[idx], required: !optional };
                          setV({ ...v, options: next });
                        }}
                      />
                      {o.enabled === false ? (
                        <div className="sm:col-span-2 rounded-lg border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                          This field is saved for templates but will not appear when users run the slash command. Sync commands after saving.
                        </div>
                      ) : null}
                      <Field label="Name">
                        <input
                          value={o.name}
                          onChange={(e) => {
                            const next = [...v.options];
                            next[idx] = {
                              ...next[idx],
                              name: v.commandType === "SLASH" ? toSlashName(e.target.value) : e.target.value.slice(0, 32),
                            };
                            setV({ ...v, options: next });
                          }}
                          className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm outline-none focus:border-indigo-400/60"
                        />
                      </Field>
                      <Field label="Description">
                        <input
                          value={o.description}
                          onChange={(e) => {
                            const next = [...v.options];
                            next[idx] = { ...next[idx], description: e.target.value };
                            setV({ ...v, options: next });
                          }}
                          className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm outline-none focus:border-indigo-400/60"
                        />
                      </Field>

                      {o.type === "INTEGER" ? (
                        <>
                          <Field label="Min (optional)">
                            <input
                              value={o.min}
                              onChange={(e) => {
                                const next = [...v.options];
                                next[idx] = { ...next[idx], min: e.target.value };
                                setV({ ...v, options: next });
                              }}
                              className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm outline-none focus:border-indigo-400/60"
                            />
                          </Field>
                          <Field label="Max (optional)">
                            <input
                              value={o.max}
                              onChange={(e) => {
                                const next = [...v.options];
                                next[idx] = { ...next[idx], max: e.target.value };
                                setV({ ...v, options: next });
                              }}
                              className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm outline-none focus:border-indigo-400/60"
                            />
                          </Field>
                        </>
                      ) : null}

                      {(o.type === "STRING" || o.type === "INTEGER") ? (
                        <div className="sm:col-span-2">
                          <Field label="Choice mode">
                            <select
                              value={o.choiceMode}
                              onChange={(e) => {
                                const next = [...v.options];
                                const selected = e.target.value as "NORMAL" | "ROLE_CHOICES" | "REACTION_AMOUNT";
                                next[idx] = {
                                  ...next[idx],
                                  choiceMode: selected,
                                  choicesJson: selected === "REACTION_AMOUNT" ? "" : next[idx].choicesJson,
                                  roleChoicesText: selected === "REACTION_AMOUNT" ? "" : next[idx].roleChoicesText,
                                };
                                setV({ ...v, options: next });
                              }}
                              className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm outline-none focus:border-indigo-400/60"
                            >
                              <option value="NORMAL">Normal choices</option>
                              <option value="ROLE_CHOICES">Role choices (mention values)</option>
                              <option value="REACTION_AMOUNT">Reaction amount input</option>
                            </select>
                          </Field>
                          {o.choiceMode === "REACTION_AMOUNT" ? (
                            <div className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-white/70">
                              Users will type a direct value using this field type (STRING or INTEGER). Choices are disabled in this mode.
                            </div>
                          ) : null}
                          {o.choiceMode === "ROLE_CHOICES" ? (
                            <Field
                              label="Role choices"
                              hint="Use `Label:RoleID` per line, or just RoleID. Example: Police:1234567890"
                            >
                              <textarea
                                value={o.roleChoicesText}
                                onChange={(e) => {
                                  const next = [...v.options];
                                  next[idx] = { ...next[idx], roleChoicesText: e.target.value };
                                  setV({ ...v, options: next });
                                }}
                                rows={4}
                                className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 font-mono text-xs outline-none focus:border-indigo-400/60"
                              />
                            </Field>
                          ) : null}
                          {o.choiceMode !== "REACTION_AMOUNT" ? (
                            <Field
                              label="Choices (optional text or JSON)"
                              hint={'Text mode: one per line (`Normal PT` or `Label:Value`). JSON mode still supported: [{"name":"A","value":"a"}]'}
                            >
                              <textarea
                                value={o.choicesJson}
                                onChange={(e) => {
                                  const next = [...v.options];
                                  next[idx] = { ...next[idx], choicesJson: e.target.value };
                                  setV({ ...v, options: next });
                                }}
                                rows={5}
                                className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 font-mono text-xs outline-none focus:border-indigo-400/60"
                                disabled={o.choiceMode === "ROLE_CHOICES"}
                              />
                            </Field>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Live preview (Discord style)">
            <div className="rounded-2xl border border-white/10 bg-[#313338] p-4">
              {v.responseType === "TEXT" ? (
                <DiscordMessagePreview
                  mode="text"
                  textContent={v.responseTemplateText || "Message preview…"}
                  previewCtx={previewCtx}
                  commandType={v.commandType}
                />
              ) : (
                <DiscordMessagePreview mode="embed" embeds={v.responseTemplateEmbeds} previewCtx={previewCtx} commandType={v.commandType} />
              )}
            </div>
            <details className="rounded-2xl border border-white/10 bg-black/25 p-3">
              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-white/55">
                Structure JSON
              </summary>
              <pre className="mt-3 max-h-[340px] overflow-auto text-xs text-white/80">
                {JSON.stringify(
                  {
                    ...preview,
                    commandType: v.commandType,
                    extras: { ...buildExtrasFromFormState(v.extras), commandType: v.commandType },
                    response:
                      v.responseType === "TEXT"
                        ? { type: "TEXT", template: { text: v.responseTemplateText } }
                        : { type: "EMBED", template: { embeds: v.responseTemplateEmbeds } },
                  },
                  null,
                  2,
                )}
              </pre>
            </details>
          </Section>
        </div>
      </div>
    </div>
  );

  function buildPayload() {
    if (!v.name.trim()) throw new Error("Command name is required.");
    if (!v.description.trim()) throw new Error("Command description is required.");
    for (const [i, opt] of v.options.entries()) {
      if (!opt.name.trim()) throw new Error(`Question ${i + 1}: name is required.`);
      if (!opt.description.trim()) throw new Error(`Question ${i + 1}: description is required.`);
    }
    const conditions = parseJsonObjectOrThrow(v.conditionsJson, "Condition builder", { mode: "AND", rules: [] });
    const permissionsMatrix = parseJsonObjectOrThrow(v.permissionsMatrixJson, "Permissions matrix", { run: {}, view: {}, edit: {} });
    const argParser = parseJsonObjectOrThrow(v.argParserJson, "Argument parser", {
      strictTypes: true,
      allowQuotedStrings: true,
      defaults: {},
    });
    const actions = parseJsonObjectOrThrow(v.actionsJson, "Actions", { steps: [] });
    const components = parseJsonObjectOrThrow(v.componentsJson, "Components", { buttons: [], selects: [], modals: [] });

    const responseTemplate =
      v.responseType === "TEXT"
        ? { text: v.responseTemplateText }
        : {
            embeds: v.responseTemplateEmbeds.map((embed) => ({
              title: embed.title.trim() ? embed.title : undefined,
              description: embed.description.trim() ? embed.description : undefined,
              color: embed.color.trim() ? embed.color : undefined,
              bannerUrl: embed.bannerUrl.trim() ? embed.bannerUrl : undefined,
              bannerPosition: embed.bannerPosition,
              logoUrl: embed.logoUrl.trim() ? embed.logoUrl : undefined,
              logoPosition: embed.logoPosition,
              thumbnailUrl: embed.thumbnailUrl.trim() ? embed.thumbnailUrl : undefined,
              imageUrl: embed.imageUrl.trim() ? embed.imageUrl : undefined,
              footerText: embed.footerText.trim() ? embed.footerText : undefined,
              footerIconUrl: embed.footerIconUrl.trim() ? embed.footerIconUrl : undefined,
              autoReactEmojis:
                embed.autoReactEmojisText
                  .split(/[\n,]+/g)
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .slice(0, 20),
              fields: embed.fields
                .filter((field) => field.name.trim() && field.value.trim())
                .map((field) => ({
                  name: field.name.trim(),
                  value: field.value.trim(),
                  inline: field.inline,
                })),
            })),
          };

    const normalizedName = v.commandType === "SLASH" ? toSlashName(v.name.trim()) : v.name.trim();
    return {
      name: normalizedName,
      description: v.description.trim(),
      enabled: v.enabled,
      guildOnly: v.guildOnly,
      dmPermission: v.dmPermission,
      responseType: v.responseType,
      ephemeral: v.ephemeral,
      responseTemplate,
      extras: {
        ...buildExtrasFromFormState(v.extras),
        commandType: v.commandType,
        conditions,
        permissionsMatrix,
        argParser,
        actions,
        components,
      },
      options: v.options.map((o, idx) => ({
        type: o.type,
        name: v.commandType === "SLASH" ? toSlashName(o.name.trim()) : o.name.trim(),
        description: o.description.trim(),
        required: o.required,
        enabled: o.enabled !== false,
        position: idx,
        min: o.min.trim() ? Number(o.min) : null,
        max: o.max.trim() ? Number(o.max) : null,
        choices:
          o.choiceMode === "REACTION_AMOUNT"
            ? null
            : o.choiceMode === "ROLE_CHOICES"
              ? parseRoleChoicesTextToChoices(o.roleChoicesText)
              : parseChoices(o.type, o.choicesJson),
      })),
    };
  }

  async function save() {
    setSaving(true);
    setError(null);
    setSaveOk(null);
    try {
      const payload = buildPayload();

      const url =
        props.mode === "create"
          ? "/api/commands"
          : props.mode === "editNative"
            ? `/api/native-commands/${encodeURIComponent(props.nativeCatalogKey ?? "")}`
            : `/api/commands/${props.commandId}`;
      const method = props.mode === "create" ? "POST" : "PATCH";

      if (props.mode === "editNative" && !props.nativeCatalogKey?.trim()) {
        throw new Error("Missing native command key.");
      }

      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || json?.ok === false) {
        const msg = json?.error?.message || json?.message || "Save failed.";
        throw new Error(msg);
      }

      const savedCmd = json?.data?.command;
      if (savedCmd && (props.mode === "edit" || props.mode === "editNative")) {
        setV(commandFormValueFromApi(savedCmd));
        setSaveOk("Saved. Slash commands are syncing to Discord.");
        router.refresh();
        return;
      }

      router.push("/app/commands");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }
}

function parseChoices(type: OptionType, choicesJson: string) {
  const trimmed = choicesJson.trim();
  if (!trimmed) return null;
  if (type !== "STRING" && type !== "INTEGER") return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
    if (!Array.isArray(parsed)) throw new Error("Choices JSON must be an array.");
    return parsed;
  } catch {
    const lines = trimmed.split(/\r?\n/g).map((s) => s.trim()).filter(Boolean);
    if (lines.length === 0) return null;
    const items = lines.slice(0, 25).map((line) => {
      const m = line.match(/^(.+?)\s*[:|]\s*(.+)$/);
      if (m) {
        return { name: m[1].trim().slice(0, 100), value: m[2].trim().slice(0, 100) };
      }
      return { name: line.slice(0, 100), value: line.slice(0, 100) };
    });
    return items;
  }
}

function parseJsonObjectOrThrow(raw: string, label: string, fallback: Record<string, unknown>) {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return fallback;
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error(`${label} JSON is invalid.`);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${label} JSON must be an object.`);
  }
  return parsed as Record<string, unknown>;
}

function renderPreviewTemplate(
  text: string,
  ctx: { user: string; username: string; command: string; guild: string; channel: string; options?: Record<string, string> },
) {
  let out = String(text || "")
    .replaceAll("{{user}}", ctx.user)
    .replaceAll("{{username}}", ctx.username)
    .replaceAll("{{command}}", ctx.command)
    .replaceAll("{{guild}}", ctx.guild)
    .replaceAll("{{channel}}", ctx.channel);
  const options = ctx.options ?? {};
  out = out.replace(/\{\{\s*options\.([^}]+?)\s*\}\}/g, (_, key) => {
    const k = String(key).trim();
    return Object.prototype.hasOwnProperty.call(options, k) ? String(options[k]) : "";
  });
  out = out.replace(/\{([A-Za-z0-9_]+)\}/g, (full, key) => {
    const raw = String(key || "").trim();
    if (!raw) return full;
    const lower = raw.toLowerCase();
    if (Object.prototype.hasOwnProperty.call(options, lower)) return String(options[lower]);
    if (Object.prototype.hasOwnProperty.call(options, raw)) return String(options[raw]);
    if (lower === "user") return ctx.user;
    if (lower === "username") return ctx.username;
    if (lower === "command") return ctx.command;
    if (lower === "guild") return ctx.guild;
    if (lower === "channel") return ctx.channel;
    return full;
  });
  return out;
}

function Section(props: { title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div className="text-lg font-semibold">{props.title}</div>
        {props.right ? <div className="shrink-0">{props.right}</div> : null}
      </div>
      <div className="mt-4 space-y-4">{props.children}</div>
    </div>
  );
}

function Field(props: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-2">
      <div className="text-xs font-semibold uppercase tracking-wider text-white/45">{props.label}</div>
      {props.children}
      {props.hint ? <div className="text-xs text-white/45">{props.hint}</div> : null}
    </label>
  );
}

function Toggle(props: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
      <div className="min-w-0 flex-1 text-sm font-medium text-white/80">{props.label}</div>
      <button
        type="button"
        role="switch"
        aria-checked={props.checked}
        onClick={() => props.onChange(!props.checked)}
        className={[
          "relative inline-flex h-6 w-11 shrink-0 items-center overflow-hidden rounded-full border transition-all duration-200",
          props.checked ? "border-emerald-400/40 bg-emerald-500/30" : "border-white/15 bg-white/10",
        ].join(" ")}
      >
        <span
          className={[
            "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-all duration-200",
            props.checked ? "translate-x-6" : "translate-x-1",
          ].join(" ")}
        />
      </button>
    </div>
  );
}
