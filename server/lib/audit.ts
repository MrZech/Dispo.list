import { db } from "../db";
import { auditLogs } from "@shared/schema";

export async function logAudit(entry: {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | number | null;
  details?: Record<string, unknown> | null;
}): Promise<void> {
  await db.insert(auditLogs).values({
    actorId: entry.actorId ?? null,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId != null ? String(entry.entityId) : null,
    details: entry.details ?? null,
  });
}
