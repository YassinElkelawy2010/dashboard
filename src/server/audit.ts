import { prisma } from "@/lib/prisma";

export async function writeAudit(opts: {
  actor: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
}) {
  await prisma.auditLog.create({
    data: {
      actor: opts.actor,
      action: opts.action,
      entityType: opts.entityType,
      entityId: opts.entityId,
      before: opts.before as never,
      after: opts.after as never,
    },
  });
}
