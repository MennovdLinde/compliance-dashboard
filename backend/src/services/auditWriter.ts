import { pool } from '../db/pool';

interface AuditEntry {
  actorId: number | null;
  actorEmail: string;
  action: string;
  entityType?: string;
  entityId?: string | number;
  detail?: Record<string, unknown>;
  ipAddress?: string;
}

/** Fire-and-forget — never await this in request handlers */
export function writeAudit(entry: AuditEntry): void {
  pool.query(
    `INSERT INTO cd_audit_log (actor_id, actor_email, action, entity_type, entity_id, detail, ip_address)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      entry.actorId,
      entry.actorEmail,
      entry.action,
      entry.entityType ?? null,
      entry.entityId != null ? String(entry.entityId) : null,
      entry.detail ? JSON.stringify(entry.detail) : null,
      entry.ipAddress ?? null,
    ]
  ).catch(err => console.error('[audit] write failed:', err));
}
