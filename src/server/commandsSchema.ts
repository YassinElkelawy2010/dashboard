import { z } from "zod";
import { parseCommandExtrasLoose } from "@/lib/commandExtras";

export const CommandOptionSchema = z.object({
  id: z.string().optional(),
  type: z.enum(["STRING", "INTEGER", "BOOLEAN", "USER", "CHANNEL", "ROLE"]),
  name: z
    .string()
    .min(1)
    .max(32)
    .regex(/^[A-Za-z0-9_]+$/),
  description: z.string().min(1).max(100),
  required: z.boolean().default(false),
  enabled: z.boolean().default(true),
  position: z.number().int().min(0).max(24).default(0),
  min: z.number().int().optional().nullable(),
  max: z.number().int().optional().nullable(),
  choices: z
    .array(
      z.object({
        name: z.string().min(1).max(100),
        value: z.string().min(1).max(100),
      }),
    )
    .optional()
    .nullable(),
});

export const CommandUpsertSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(32)
    .regex(/^[A-Za-z0-9_]+$/),
  description: z.string().min(1).max(100),
  enabled: z.boolean().default(true),
  guildOnly: z.boolean().default(true),
  dmPermission: z.boolean().default(false),
  responseType: z.enum(["TEXT", "EMBED"]).default("TEXT"),
  ephemeral: z.boolean().default(true),
  responseTemplate: z.unknown(),
  options: z.array(CommandOptionSchema).max(25).default([]),
  extras: z.unknown().optional().transform((raw) => parseCommandExtrasLoose(raw)),
});

export type CommandUpsertInput = z.infer<typeof CommandUpsertSchema>;
