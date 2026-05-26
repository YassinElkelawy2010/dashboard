"use client";

export type DiscordEmbedPreviewField = { name: string; value: string; inline: boolean };

export type DiscordEmbedPreviewItem = {
  title: string;
  description: string;
  color: string;
  bannerUrl?: string;
  bannerPosition?: "top" | "middle" | "bottom";
  logoUrl?: string;
  logoPosition?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  imageUrl: string;
  thumbnailUrl: string;
  footerText: string;
  footerIconUrl: string;
  fields: DiscordEmbedPreviewField[];
};

const DEFAULT_BOT_NAME = "Greenville Roleplay Aerial™";
const DEFAULT_BOT_AVATAR =
  "https://cdn.discordapp.com/attachments/1392933776396386335/1491400169244196914/4376814412_891852901_1774814893628_1-modified.png?ex=69d78e25&is=69d63ca5&hm=f7ff51f46e5e5928d137c990503ceb761d238ff25d3834f7f03375565392cea&animated=true";

export type PreviewCtx = { user: string; username: string; command: string; guild: string; channel: string; options?: Record<string, string> };

function renderPlaceholders(text: string, ctx: PreviewCtx) {
  let out = String(text || "")
    .replaceAll("{{user}}", ctx.user)
    .replaceAll("{{username}}", ctx.username)
    .replaceAll("{{command}}", ctx.command)
    .replaceAll("{{guild}}", ctx.guild)
    .replaceAll("{{channel}}", ctx.channel);
  const opt = ctx.options && typeof ctx.options === "object" ? ctx.options : {};
  out = out.replace(/\{\{\s*options\.([^}]+?)\s*\}\}/g, (_, key) => {
    const k = String(key).trim();
    return Object.prototype.hasOwnProperty.call(opt, k) ? String(opt[k]) : "";
  });
  out = out.replace(/\{([A-Za-z0-9_]+)\}/g, (full, key) => {
    const raw = String(key || "").trim();
    if (!raw) return full;
    const lower = raw.toLowerCase();
    if (Object.prototype.hasOwnProperty.call(opt, lower)) return String(opt[lower]);
    if (Object.prototype.hasOwnProperty.call(opt, raw)) return String(opt[raw]);
    return full;
  });
  return out;
}

function BotMessageChrome(props: { children: React.ReactNode; commandType?: "SLASH" | "PREFIX" }) {
  return (
    <div className="select-none font-sans text-[15px] leading-snug">
      <div className="flex gap-4">
        <img
          src={DEFAULT_BOT_AVATAR}
          alt=""
          className="mt-0.5 h-10 w-10 shrink-0 rounded-full object-cover"
          width={40}
          height={40}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
            <span className="font-medium text-[#eb92b8]">{DEFAULT_BOT_NAME}</span>
            <span className="rounded bg-[#5865f2] px-1 py-px text-[10px] font-semibold uppercase leading-none text-white">
              {props.commandType === "PREFIX" ? "BOT" : "APP"}
            </span>
            <time className="text-xs font-medium text-[#949ba4]" dateTime="preview-time">
              just now
            </time>
          </div>
          <div className="mt-1">{props.children}</div>
        </div>
      </div>
    </div>
  );
}

function renderDiscordEmbedFields(fields: DiscordEmbedPreviewField[], ctx: PreviewCtx) {
  if (!fields.length) return null;

  const rows: DiscordEmbedPreviewField[][] = [];
  let i = 0;
  while (i < fields.length) {
    const f = fields[i];
    if (f.inline) {
      const group: DiscordEmbedPreviewField[] = [];
      while (i < fields.length && fields[i].inline && group.length < 3) {
        group.push(fields[i]);
        i++;
      }
      rows.push(group);
    } else {
      rows.push([f]);
      i++;
    }
  }

  return (
    <div className="mt-2 space-y-2">
      {rows.map((row, ri) => (
        <div key={ri} className={row.length > 1 ? "grid grid-cols-3 gap-x-3" : ""}>
          {row.map((field, fi) => (
            <div key={fi} className={row.length === 1 ? "min-w-0" : "min-w-0"}>
              <div className="text-xs font-semibold tracking-wide text-[#f2f3f5]">
                {renderPlaceholders(field.name || "\u200b", ctx)}
              </div>
              <div className="mt-0.5 whitespace-pre-wrap text-sm text-[#dcddde]">
                {renderPlaceholders(field.value || "\u200b", ctx)}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function DiscordMessagePreview(props: {
  mode: "text" | "embed";
  previewCtx: PreviewCtx;
  commandType?: "SLASH" | "PREFIX";
  textContent?: string;
  embeds?: DiscordEmbedPreviewItem[];
}) {
  if (props.mode === "text") {
    const body = renderPlaceholders(props.textContent || "Message preview…", props.previewCtx);
    return (
      <BotMessageChrome commandType={props.commandType}>
        <div className="max-w-[520px] whitespace-pre-wrap break-words text-[#dcddde]">{body}</div>
      </BotMessageChrome>
    );
  }

  const embeds = props.embeds ?? [];
  return (
    <BotMessageChrome commandType={props.commandType}>
      <div className="max-w-[520px] space-y-1">
        {embeds.map((embed, idx) => {
          const accent = embed.color?.trim() || "#f9a8d8";
          const title = embed.title?.trim() ? renderPlaceholders(embed.title, props.previewCtx) : "";
          const description = embed.description?.trim() ? renderPlaceholders(embed.description, props.previewCtx) : "";
          const thumb = embed.thumbnailUrl?.trim();
          const img = embed.imageUrl?.trim();
          const banner = embed.bannerUrl?.trim();
          const logo = embed.logoUrl?.trim();
          const footer = embed.footerText?.trim() ? renderPlaceholders(embed.footerText, props.previewCtx) : "";
          const footerIcon = embed.footerIconUrl?.trim();
          const fields = Array.isArray(embed.fields) ? embed.fields : [];
          const bannerPosition = embed.bannerPosition ?? "bottom";
          const logoPosition = embed.logoPosition ?? "top-right";

          return (
            <div key={idx} className="flex min-w-0">
              <div
                className="w-1 shrink-0 rounded-l-sm"
                style={{ backgroundColor: accent }}
                aria-hidden
              />
              <div className="relative min-w-0 flex-1 rounded-r-sm bg-[#2b2d31] px-3 py-2">
                {banner ? (
                  <img
                    src={banner}
                    alt=""
                    className={[
                      "pointer-events-none absolute inset-x-3 h-16 w-[calc(100%-1.5rem)] rounded-md object-cover opacity-45",
                      bannerPosition === "top" ? "top-2" : bannerPosition === "middle" ? "top-1/2 -translate-y-1/2" : "bottom-2",
                    ].join(" ")}
                  />
                ) : null}
                {logo ? (
                  <img
                    src={logo}
                    alt=""
                    className={[
                      "pointer-events-none absolute h-9 w-9 rounded-full border border-white/30 object-cover",
                      logoPosition === "top-left"
                        ? "left-2 top-2"
                        : logoPosition === "bottom-left"
                          ? "bottom-2 left-2"
                          : logoPosition === "bottom-right"
                            ? "bottom-2 right-2"
                            : "right-2 top-2",
                    ].join(" ")}
                  />
                ) : null}
                <div className={thumb ? "flex gap-3" : ""}>
                  <div className="min-w-0 flex-1">
                    {title ? (
                      <div className="text-base font-semibold text-[#00afff] underline decoration-[#00afff]">{title}</div>
                    ) : null}
                    {description ? (
                      <div className={title ? "mt-2" : ""}>
                        <p className="whitespace-pre-wrap text-sm text-[#b5bac1]">{description}</p>
                      </div>
                    ) : null}
                    {renderDiscordEmbedFields(fields, props.previewCtx)}
                  </div>
                  {thumb ? (
                    <div className="shrink-0">
                      <img src={thumb} alt="" className="h-20 w-20 rounded object-cover" />
                    </div>
                  ) : null}
                </div>
                {img ? (
                  <div className="mt-3 overflow-hidden rounded-lg">
                    <img src={img} alt="" className="max-h-[220px] w-full object-cover" />
                  </div>
                ) : null}
                {footer ? (
                  <div className="mt-3 flex items-center gap-2">
                    {footerIcon ? (
                      <img src={footerIcon} alt="" className="h-5 w-5 shrink-0 rounded-full object-cover" />
                    ) : null}
                    <span className="text-xs text-[#949ba4]">{footer}</span>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </BotMessageChrome>
  );
}
