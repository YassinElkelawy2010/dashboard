import { AppError } from "@/lib/errors";
import type { CommandUpsertInput } from "./commandsSchema";

function validateChoices(type: CommandUpsertInput["options"][number]["type"], choices: unknown) {
  if (type !== "STRING" && type !== "INTEGER") {
    if (choices) {
      throw new AppError({
        status: 400,
        code: "INVALID_CHOICES",
        message: "Choices are only supported for STRING and INTEGER options.",
      });
    }
    return;
  }

  if (!choices) return;

  if (!Array.isArray(choices) || choices.length === 0) {
    throw new AppError({ status: 400, code: "INVALID_CHOICES", message: "Choices must be a non-empty array when provided." });
  }

  if (choices.length > 25) {
    throw new AppError({ status: 400, code: "INVALID_CHOICES", message: "A maximum of 25 choices is allowed per option." });
  }
}

function validateCommandOptions(input: CommandUpsertInput) {
  const names = new Set<string>();
  for (const opt of input.options) {
    if (names.has(opt.name)) {
      throw new AppError({
        status: 400,
        code: "DUPLICATE_OPTION_NAME",
        message: `Duplicate option name: ${opt.name}`,
      });
    }
    names.add(opt.name);

    validateChoices(opt.type, opt.choices);

    if (opt.min != null && opt.max != null && opt.min > opt.max) {
      throw new AppError({
        status: 400,
        code: "INVALID_MIN_MAX",
        message: `Invalid min/max for option ${opt.name}.`,
      });
    }
  }
}

export function validateNativeCommandOptions(input: CommandUpsertInput) {
  validateCommandOptions(input);
}

export function validateCommandPayload(input: CommandUpsertInput) {
  const extras = (input.extras && typeof input.extras === "object" ? input.extras : {}) as { commandType?: string };
  const commandType = extras.commandType === "PREFIX" ? "PREFIX" : "SLASH";
  if (commandType === "SLASH") {
    if (!/^[a-z0-9_]+$/.test(input.name)) {
      throw new AppError({
        status: 400,
        code: "INVALID_COMMAND_NAME",
        message: "Slash command names must be lowercase a-z, numbers, and underscores.",
      });
    }
    for (const opt of input.options) {
      if (!/^[a-z0-9_]+$/.test(opt.name)) {
        throw new AppError({
          status: 400,
          code: "INVALID_OPTION_NAME",
          message: `Slash option names must be lowercase: ${opt.name}`,
        });
      }
    }
  }

  validateCommandOptions(input);

  if (input.responseType === "TEXT") {
    const tpl = input.responseTemplate as { text?: unknown } | null;
    if (!tpl || typeof tpl !== "object" || typeof tpl.text !== "string" || tpl.text.trim().length === 0) {
      throw new AppError({
        status: 400,
        code: "INVALID_RESPONSE_TEMPLATE",
        message: "TEXT responses require responseTemplate: { text: string }",
      });
    }
  }

  if (input.responseType === "EMBED") {
    const tpl = input.responseTemplate as
      | {
          title?: unknown;
          description?: unknown;
          color?: unknown;
          fields?: unknown;
          embeds?: unknown;
        }
      | null;
    if (!tpl || typeof tpl !== "object") {
      throw new AppError({
        status: 400,
        code: "INVALID_RESPONSE_TEMPLATE",
        message: "EMBED responses require an embed template object.",
      });
    }

    const embeds = Array.isArray(tpl.embeds)
      ? tpl.embeds
      : [{ title: tpl.title, description: tpl.description, color: tpl.color, fields: tpl.fields }];

    if (embeds.length === 0) {
      throw new AppError({ status: 400, code: "INVALID_RESPONSE_TEMPLATE", message: "At least one embed is required." });
    }
    if (embeds.length > 10) {
      throw new AppError({ status: 400, code: "INVALID_RESPONSE_TEMPLATE", message: "A maximum of 10 embeds is allowed." });
    }

    for (const embed of embeds) {
      if (!embed || typeof embed !== "object") {
        throw new AppError({ status: 400, code: "INVALID_RESPONSE_TEMPLATE", message: "Each embed must be an object." });
      }
      const title = typeof (embed as any).title === "string" ? (embed as any).title.trim() : "";
      const description = typeof (embed as any).description === "string" ? (embed as any).description.trim() : "";
      const fields = Array.isArray((embed as any).fields) ? (embed as any).fields : [];
      const bannerUrl = typeof (embed as any).bannerUrl === "string" ? (embed as any).bannerUrl.trim() : "";
      const logoUrl = typeof (embed as any).logoUrl === "string" ? (embed as any).logoUrl.trim() : "";
      const imageUrl = typeof (embed as any).imageUrl === "string" ? (embed as any).imageUrl.trim() : "";
      const thumbnailUrl = typeof (embed as any).thumbnailUrl === "string" ? (embed as any).thumbnailUrl.trim() : "";
      const autoReactEmojis = Array.isArray((embed as any).autoReactEmojis) ? (embed as any).autoReactEmojis : [];

      if (!title && !description && fields.length === 0 && !bannerUrl && !logoUrl && !imageUrl && !thumbnailUrl) {
        throw new AppError({
          status: 400,
          code: "INVALID_RESPONSE_TEMPLATE",
          message: "Each embed needs content (text, field, or image/logo/banner).",
        });
      }

      if (fields.length > 25) {
        throw new AppError({ status: 400, code: "INVALID_RESPONSE_TEMPLATE", message: "A maximum of 25 fields is allowed per embed." });
      }
      if (autoReactEmojis.length > 20) {
        throw new AppError({ status: 400, code: "INVALID_RESPONSE_TEMPLATE", message: "A maximum of 20 auto-react emojis is allowed per embed." });
      }
      for (const em of autoReactEmojis) {
        if (typeof em !== "string" || !em.trim()) {
          throw new AppError({ status: 400, code: "INVALID_RESPONSE_TEMPLATE", message: "Embed auto-react emojis must be non-empty strings." });
        }
      }

      for (const field of fields) {
        if (!field || typeof field !== "object") {
          throw new AppError({ status: 400, code: "INVALID_RESPONSE_TEMPLATE", message: "Each embed field must be an object." });
        }
        if (typeof (field as any).name !== "string" || !(field as any).name.trim()) {
          throw new AppError({ status: 400, code: "INVALID_RESPONSE_TEMPLATE", message: "Embed fields require a non-empty name." });
        }
        if (typeof (field as any).value !== "string" || !(field as any).value.trim()) {
          throw new AppError({ status: 400, code: "INVALID_RESPONSE_TEMPLATE", message: "Embed fields require a non-empty value." });
        }
      }
    }
  }
}
