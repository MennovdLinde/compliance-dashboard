import { Router, Request, Response } from 'express';
import { pool } from '../db/pool';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// GET /api/audit-log?limit=50&offset=0&action=login&actor=email
router.get('/', requireAuth, requireRole('admin', 'auditor'), async (req: Request, res: Response) => {
  const limit  = Math.min(parseInt(req.query.limit  as string ?? '50', 10), 200);
  const offset = parseInt(req.query.offset as string ?? '0', 10);
  const action = req.query.action as string | undefined;
  const actor  = req.query.actor  as string | undefined;

  try {
    let where = 'WHERE 1=1';
    const params: unknown[] = [];

    if (action) { params.push(`%${action}%`); where += ` AND action ILIKE $${params.length}`; }
    if (actor)  { params.push(`%${actor}%`);  where += ` AND actor_email ILIKE $${params.length}`; }

    const countRes = await pool.query(`SELECT COUNT(*) FROM cd_audit_log ${where}`, params);
    const total = parseInt(countRes.rows[0].count);

    params.push(limit, offset);
    const { rows } = await pool.query(`
      SELECT id, actor_id, actor_email, action, entity_type, entity_id, detail, ip_address, created_at
      FROM cd_audit_log
      ${where}
      ORDER BY id DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    return res.json({ entries: rows, total, limit, offset });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/audit-log/integrity — gap detection
router.get('/integrity', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, (id - LAG(id) OVER (ORDER BY id)) - 1 AS gap
      FROM cd_audit_log
    `);
    const gaps = rows.filter((r: { gap: number | null }) => r.gap !== null && r.gap > 0);
    return res.json({
      intact: gaps.length === 0,
      gapsFound: gaps.length,
      gaps: gaps.map((r: { id: number; gap: number }) => ({ afterId: r.id - r.gap, beforeId: r.id, missing: r.gap })),
      checkedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
