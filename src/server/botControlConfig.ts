import { NATIVE_COMMAND_CATALOG } from "./nativeCommandCatalog";
import { parseCommandExtrasLoose } from "@/lib/commandExtras";

export const BOT_CONTROL_SETTINGS_KEY = "bot.controlCenter";

export const DEFAULT_BOT_CONTROL_CONFIG = {
  branding: {
    footerText: "Greenville Roleplay Aerial™",
    footerIconUrl:
      "https://cdn.discordapp.com/attachments/1392933776396386335/1491400169244196914/4376814412_891852901_1774814893628_1-modified.png?ex=69d78e25&is=69d63ca5&hm=f67ff51f46e5e5928d137c990503ceb761d238ff25d3834f7f03375565392cea&animated=true",
  },
  tickets: {
    color: "#ffc0cb",
    panelImageUrl:
      "https://media.discordapp.net/attachments/1392933776396386335/1491426234100613151/GVRA_Ticket_Banner.png?ex=69d7a66b&is=69d654eb&hm=1b5d65d5c00ee62d71b1917747bd22c85e3d0a4ac23fcb246d0e9fc4ff454f0b&animated=true",
    panelDescription:
      "> <a:hearts:1488140809336258690> **__Aerial, Support Category__** <a:hearts:1488140809336258690>\nWelcome, to **__Greenville Roleplay Aeria, Support Tickets__** are here to help you privately sort out any issues or ask questions without involving other members. Only professional staff members are able to manage and resolve tickets, ensuring your concerns are handled quickly and efficiently.",
    types: [
      { label: "<a:heart3:1488140824729485323> General Support", value: "general" },
      { label: "<a:heart3:1488140824729485323> General Report(s)", value: "user_report" },
      { label: "<a:heart3:1488140824729485323> Partnership Assistance", value: "partnership" },
    ],
  },
  staffAdjustments: {
    roleChoices: [
      { name: "Server Overseer", value: "Server Overseer", rankDisplay: "Server Founder" },
      { name: "Overseer Assistant", value: "Overseer Assistant", rankDisplay: "Server Co-Founder" },
      { name: "Server Management", value: "Server Management", rankDisplay: "Server Management" },
      { name: "Executive Director", value: "Executive Director", rankDisplay: "Executive Director" },
      { name: "Associate Director", value: "Associate Director", rankDisplay: "Associate Director" },
      { name: "Staff Coordinator", value: "Staff Coordinator", rankDisplay: "Staff Coordinator" },
      { name: "Senior Administrator", value: "Senior Administrator", rankDisplay: "Senior Administrator" },
      { name: "Administrator", value: "Administrator", rankDisplay: "Administrator" },
      { name: "Junior Administrator", value: "Junior Administrator", rankDisplay: "Junior Administrator" },
      { name: "Senior Moderator", value: "Senior Moderator", rankDisplay: "Senior Moderator" },
      { name: "Moderator", value: "Moderator", rankDisplay: "Moderator" },
      { name: "Moderator in Trainee", value: "Moderator in Trainee", rankDisplay: "Moderator in Trainee" },
      { name: "Civilian", value: "Civilian", rankDisplay: "Civilian" },
    ],
    reasons: ["Promoted", "Demoted", "Handpicked", "Terminated", "Resigned", "Fastpass", "Passed Training", "Banned"],
    color: "#ffc0cb",
    titleTemplate: "<:alarm:1429037896974995466> **__Staff Adjustment__** {number}<:alarm:1429037896974995466>",
    descriptionTemplate:
      "> <:arrow:1428811328847347793> {subject}\n > <:arrow:1428811328847347793> {oldRole} —-> {newRole}.\n > <:arrow:1428811328847347793> Reason: {reason}.\n\n > <:arrow:1428811328847347793> *Signed,*\n > <:arrow:1428811328847347793> *{signedBy} | {rank}*",
    thumbnailUrl:
      "https://media.discordapp.net/attachments/1409890540404736191/1429095687810846861/image.png?ex=68f4e493&is=68f39313&hm=fe921e5b6ffbab98cb069a8d8ffeb7bb22ebe83b75472d1c7008ebffd2312f8d&=&format=png&quality=lossless&width=614&height=614",
    imageUrl:
      "https://media.discordapp.net/attachments/1409890540404736191/1429008686973714563/image.png?ex=68f4938c&is=68f3420c&hm=7ebf9996e78032dbd6ca9f6b6cc55cdb2239c70350dbd4bfb77924a8f2b25af0&=&format=png&quality=lossless",
    ackMessage: "Adjustment Posted!",
  },
  nativeCommands: Object.fromEntries(NATIVE_COMMAND_CATALOG.map((c) => [c.name, { description: c.description, slashName: c.name }])),
};

export function normalizeBotControlConfig(raw: unknown) {
  if (!raw || typeof raw !== "object") return DEFAULT_BOT_CONTROL_CONFIG;
  const inObj = raw as Record<string, unknown>;
  const branding = (inObj.branding ?? {}) as Record<string, unknown>;
  const tickets = (inObj.tickets ?? {}) as Record<string, unknown>;
  const types = Array.isArray(tickets.types) ? tickets.types : DEFAULT_BOT_CONTROL_CONFIG.tickets.types;
  const staffAdjustments = (inObj.staffAdjustments ?? {}) as Record<string, unknown>;
  const roleChoices = Array.isArray(staffAdjustments.roleChoices)
    ? staffAdjustments.roleChoices
    : DEFAULT_BOT_CONTROL_CONFIG.staffAdjustments.roleChoices;
  const reasons = Array.isArray(staffAdjustments.reasons)
    ? staffAdjustments.reasons
    : DEFAULT_BOT_CONTROL_CONFIG.staffAdjustments.reasons;
  const nativeCommands = (inObj.nativeCommands ?? {}) as Record<string, unknown>;

  function coerceNativeExtras(entry: Record<string, unknown>) {
    const guildOnly = entry.guildOnly === false ? false : true;
    const dmPermission = entry.dmPermission === true;
    const responseType = entry.responseType === "EMBED" ? "EMBED" : "TEXT";
    const ephemeral = entry.ephemeral === false ? false : true;
    let responseTemplate: unknown = entry.responseTemplate;
    if (!responseTemplate || typeof responseTemplate !== "object") {
      responseTemplate = responseType === "EMBED" ? { embeds: [] } : { text: "" };
    }
    const options = Array.isArray(entry.options) ? entry.options : [];
    const extras = parseCommandExtrasLoose(entry.extras);
    return { guildOnly, dmPermission, responseType, ephemeral, responseTemplate, options, extras };
  }

  const nativeByName = Object.fromEntries(
    NATIVE_COMMAND_CATALOG.map((cmd) => {
      const entry =
        nativeCommands[cmd.name] && typeof nativeCommands[cmd.name] === "object"
          ? (nativeCommands[cmd.name] as Record<string, unknown>)
          : {};
      const description =
        typeof entry.description === "string" && entry.description.trim() ? entry.description : cmd.description;
      const slashNameRaw = typeof entry.slashName === "string" ? entry.slashName.trim() : cmd.name;
      const slashName = /^[a-z0-9_]{1,32}$/.test(slashNameRaw) ? slashNameRaw : cmd.name;
      return [cmd.name, { description, slashName, ...coerceNativeExtras(entry) }];
    }),
  );
  const used = new Set<string>();
  for (const cmd of NATIVE_COMMAND_CATALOG) {
    const current = (nativeByName as any)[cmd.name] as { slashName: string };
    if (used.has(current.slashName)) {
      current.slashName = cmd.name;
    }
    used.add(current.slashName);
  }
  return {
    branding: {
      footerText:
        typeof branding.footerText === "string" && branding.footerText.trim()
          ? branding.footerText
          : DEFAULT_BOT_CONTROL_CONFIG.branding.footerText,
      footerIconUrl:
        typeof branding.footerIconUrl === "string" && branding.footerIconUrl.trim()
          ? branding.footerIconUrl
          : DEFAULT_BOT_CONTROL_CONFIG.branding.footerIconUrl,
    },
    tickets: {
      color:
        typeof tickets.color === "string" && tickets.color.trim() ? tickets.color : DEFAULT_BOT_CONTROL_CONFIG.tickets.color,
      panelImageUrl:
        typeof tickets.panelImageUrl === "string" ? tickets.panelImageUrl : DEFAULT_BOT_CONTROL_CONFIG.tickets.panelImageUrl,
      panelDescription:
        typeof tickets.panelDescription === "string" && tickets.panelDescription.trim()
          ? tickets.panelDescription
          : DEFAULT_BOT_CONTROL_CONFIG.tickets.panelDescription,
      types: types
        .filter((t) => t && typeof t === "object")
        .map((t) => {
          const item = t as Record<string, unknown>;
          return { label: String(item.label ?? "").trim(), value: String(item.value ?? "").trim() };
        })
        .filter((t) => t.label && t.value),
    },
    staffAdjustments: {
      roleChoices: roleChoices
        .filter((r) => r && typeof r === "object")
        .map((r) => {
          const role = r as Record<string, unknown>;
          return {
            name: String(role.name ?? "").trim(),
            value: String(role.value ?? "").trim(),
            rankDisplay: String(role.rankDisplay ?? role.name ?? "").trim(),
          };
        })
        .filter((r) => r.name && r.value)
        .slice(0, 25),
      reasons: reasons.map((r) => String(r ?? "").trim()).filter(Boolean).slice(0, 25),
      color:
        typeof staffAdjustments.color === "string" && staffAdjustments.color.trim()
          ? staffAdjustments.color
          : DEFAULT_BOT_CONTROL_CONFIG.staffAdjustments.color,
      titleTemplate:
        typeof staffAdjustments.titleTemplate === "string" && staffAdjustments.titleTemplate.trim()
          ? staffAdjustments.titleTemplate
          : DEFAULT_BOT_CONTROL_CONFIG.staffAdjustments.titleTemplate,
      descriptionTemplate:
        typeof staffAdjustments.descriptionTemplate === "string" && staffAdjustments.descriptionTemplate.trim()
          ? staffAdjustments.descriptionTemplate
          : DEFAULT_BOT_CONTROL_CONFIG.staffAdjustments.descriptionTemplate,
      thumbnailUrl:
        typeof staffAdjustments.thumbnailUrl === "string"
          ? staffAdjustments.thumbnailUrl
          : DEFAULT_BOT_CONTROL_CONFIG.staffAdjustments.thumbnailUrl,
      imageUrl:
        typeof staffAdjustments.imageUrl === "string"
          ? staffAdjustments.imageUrl
          : DEFAULT_BOT_CONTROL_CONFIG.staffAdjustments.imageUrl,
      ackMessage:
        typeof staffAdjustments.ackMessage === "string" && staffAdjustments.ackMessage.trim()
          ? staffAdjustments.ackMessage
          : DEFAULT_BOT_CONTROL_CONFIG.staffAdjustments.ackMessage,
    },
    nativeCommands: nativeByName,
  };
}
