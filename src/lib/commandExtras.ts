import { z } from "zod";

const snowflake = z.string().regex(/^\d{5,25}$/);

export const CommandExtrasSchema = z.object({
  commandType: z.enum(["SLASH", "PREFIX"]).default("SLASH"),
  autoReactions: z
    .object({
      enabled: z.boolean().default(false),
      emojis: z.array(z.string().min(1).max(120)).max(20).default([]),
    })
    .default({ enabled: false, emojis: [] }),
  requiredRoleIds: z.array(snowflake).max(25).default([]),
  requiredRolesMode: z.enum(["all", "any"]).default("all"),
  allowedChannelIds: z.array(snowflake).max(50).default([]),
  deniedChannelIds: z.array(snowflake).max(50).default([]),
  mentionEveryone: z.boolean().default(false),
  suppressEmbeds: z.boolean().default(false),
  pinReply: z.boolean().default(false),
  privateAckThenPost: z.boolean().default(false),
  embedPingType: z.enum(["none", "everyone", "here", "role"]).default("none"),
  embedPingRoleId: z.string().default(""),
  embedPingRoleIds: z.array(snowflake).max(25).default([]),
  quickLinkButtonEnabled: z.boolean().default(false),
  quickLinkButtonLabel: z.string().default("Open Link"),
  quickLinkButtonUrl: z.string().default(""),
  quickLinkButtonEmoji: z.string().default(""),
  quickLinkAllowedRoleIds: z.array(snowflake).max(25).default([]),
  conditions: z.unknown().optional().default({ mode: "AND", rules: [] }),
  permissionsMatrix: z.unknown().optional().default({ run: {}, view: {}, edit: {} }),
  argParser: z.unknown().optional().default({ strictTypes: true, allowQuotedStrings: true, defaults: {} }),
  actions: z.unknown().optional().default({ steps: [] }),
  components: z.unknown().optional().default({ buttons: [], selects: [], modals: [] }),
});

export type CommandExtras = z.infer<typeof CommandExtrasSchema>;

export const DEFAULT_COMMAND_EXTRAS: CommandExtras = {
  commandType: "SLASH",
  autoReactions: { enabled: false, emojis: [] },
  requiredRoleIds: [],
  requiredRolesMode: "all",
  allowedChannelIds: [],
  deniedChannelIds: [],
  mentionEveryone: false,
  suppressEmbeds: false,
  pinReply: false,
  privateAckThenPost: false,
  embedPingType: "none",
  embedPingRoleId: "",
  embedPingRoleIds: [],
  quickLinkButtonEnabled: false,
  quickLinkButtonLabel: "Open Link",
  quickLinkButtonUrl: "",
  quickLinkButtonEmoji: "",
  quickLinkAllowedRoleIds: [],
  conditions: { mode: "AND", rules: [] },
  permissionsMatrix: { run: {}, view: {}, edit: {} },
  argParser: { strictTypes: true, allowQuotedStrings: true, defaults: {} },
  actions: { steps: [] },
  components: { buttons: [], selects: [], modals: [] },
};

export function parseCommandExtrasLoose(raw: unknown): CommandExtras {
  const parsed = CommandExtrasSchema.safeParse(raw ?? {});
  if (parsed.success) return parsed.data;
  return DEFAULT_COMMAND_EXTRAS;
}

export function parseSnowflakeTextArea(text: string): string[] {
  return text
    .split(/[\s,]+/g)
    .map((s) => s.trim())
    .filter((s) => /^\d{5,25}$/.test(s));
}

export function snowflakeListToText(ids: string[]): string {
  return ids.join("\n");
}

export type CommandFormExtrasState = {
  autoReactionEnabled: boolean;
  autoReactionEmojis: string[];
  requiredRoleIdsText: string;
  requiredRolesMode: "all" | "any";
  allowedChannelIdsText: string;
  deniedChannelIdsText: string;
  mentionEveryone: boolean;
  suppressEmbeds: boolean;
  pinReply: boolean;
  privateAckThenPost: boolean;
  embedPingType: "none" | "everyone" | "here" | "role";
  embedPingRoleId: string;
  embedPingRoleIdsText: string;
  quickLinkButtonEnabled: boolean;
  quickLinkButtonLabel: string;
  quickLinkButtonUrl: string;
  quickLinkButtonEmoji: string;
  quickLinkAllowedRoleIdsText: string;
};

export function defaultFormExtras(): CommandFormExtrasState {
  return {
    autoReactionEnabled: false,
    autoReactionEmojis: [""],
    requiredRoleIdsText: "",
    requiredRolesMode: "all",
    allowedChannelIdsText: "",
    deniedChannelIdsText: "",
    mentionEveryone: false,
    suppressEmbeds: false,
    pinReply: false,
    privateAckThenPost: false,
    embedPingType: "none",
    embedPingRoleId: "",
    embedPingRoleIdsText: "",
    quickLinkButtonEnabled: false,
    quickLinkButtonLabel: "Open Link",
    quickLinkButtonUrl: "",
    quickLinkButtonEmoji: "",
    quickLinkAllowedRoleIdsText: "",
  };
}

export function formExtrasFromParsed(x: CommandExtras): CommandFormExtrasState {
  return {
    autoReactionEnabled: x.autoReactions.enabled,
    autoReactionEmojis: x.autoReactions.emojis.length > 0 ? [...x.autoReactions.emojis] : [""],
    requiredRoleIdsText: snowflakeListToText(x.requiredRoleIds),
    requiredRolesMode: x.requiredRolesMode,
    allowedChannelIdsText: snowflakeListToText(x.allowedChannelIds),
    deniedChannelIdsText: snowflakeListToText(x.deniedChannelIds),
    mentionEveryone: x.mentionEveryone,
    suppressEmbeds: x.suppressEmbeds,
    pinReply: x.pinReply,
    privateAckThenPost: x.privateAckThenPost ?? false,
    embedPingType: x.embedPingType ?? "none",
    embedPingRoleId: x.embedPingRoleId ?? "",
    embedPingRoleIdsText: snowflakeListToText(
      (x.embedPingRoleIds && x.embedPingRoleIds.length > 0 ? x.embedPingRoleIds : x.embedPingRoleId ? [x.embedPingRoleId] : []) ?? [],
    ),
    quickLinkButtonEnabled: x.quickLinkButtonEnabled ?? false,
    quickLinkButtonLabel: x.quickLinkButtonLabel ?? "Open Link",
    quickLinkButtonUrl: x.quickLinkButtonUrl ?? "",
    quickLinkButtonEmoji: x.quickLinkButtonEmoji ?? "",
    quickLinkAllowedRoleIdsText: snowflakeListToText(x.quickLinkAllowedRoleIds ?? []),
  };
}

export function buildExtrasFromFormState(f: CommandFormExtrasState): CommandExtras {
  const emojis = f.autoReactionEmojis.map((s) => s.trim()).filter(Boolean).slice(0, 20);
  return {
    commandType: "SLASH",
    autoReactions: { enabled: f.autoReactionEnabled && emojis.length > 0, emojis },
    requiredRoleIds: parseSnowflakeTextArea(f.requiredRoleIdsText).slice(0, 25),
    requiredRolesMode: f.requiredRolesMode,
    allowedChannelIds: parseSnowflakeTextArea(f.allowedChannelIdsText).slice(0, 50),
    deniedChannelIds: parseSnowflakeTextArea(f.deniedChannelIdsText).slice(0, 50),
    mentionEveryone: f.mentionEveryone,
    suppressEmbeds: f.suppressEmbeds,
    pinReply: f.pinReply,
    privateAckThenPost: f.privateAckThenPost,
    embedPingType: f.embedPingType,
    embedPingRoleId: f.embedPingRoleId.trim(),
    embedPingRoleIds: parseSnowflakeTextArea(f.embedPingRoleIdsText).slice(0, 25),
    quickLinkButtonEnabled: f.quickLinkButtonEnabled,
    quickLinkButtonLabel: f.quickLinkButtonLabel.trim().slice(0, 80) || "Open Link",
    quickLinkButtonUrl: f.quickLinkButtonUrl.trim(),
    quickLinkButtonEmoji: f.quickLinkButtonEmoji.trim().slice(0, 64),
    quickLinkAllowedRoleIds: parseSnowflakeTextArea(f.quickLinkAllowedRoleIdsText).slice(0, 25),
  };
}
