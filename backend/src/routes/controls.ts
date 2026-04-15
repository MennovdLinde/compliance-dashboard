import { Router, Request, Response } from 'express';
import { pool } from '../db/pool';
import { requireAuth, requireRole, AuthedRequest } from '../middleware/auth';
import { writeAudit } from '../services/auditWriter';

const router = Router();

// GET /api/controls?framework=gdpr&status=non_compliant
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const { framework, status, category } = req.query as Record<string, string>;

  try {
    let query = `
      SELECT c.*, f.slug AS framework_slug, f.name AS framework_name
      FROM cd_controls c
      JOIN cd_frameworks f ON f.id = c.framework_id
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (framework) { params.push(framework); query += ` AND f.slug = $${params.length}`; }
    if (status)    { params.push(status);    query += ` AND c.status = $${params.length}`; }
    if (category)  { params.push(category);  query += ` AND c.category = $${params.length}`; }

    query += ' ORDER BY f.id, c.ref_code';

    const { rows } = await pool.query(query, params);
    return res.json({ controls: rows, total: rows.length });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/controls/:id
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(`
      SELECT c.*, f.slug AS framework_slug, f.name AS framework_name
      FROM cd_controls c JOIN cd_frameworks f ON f.id = c.framework_id
      WHERE c.id = $1
    `, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Control not found' });
    return res.json({ control: rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/controls/:id — admin or auditor only
router.patch('/:id', requireAuth, requireRole('admin', 'auditor'), async (req: Request, res: Response) => {
  const user = (req as AuthedRequest).user;
  const { status, owner, evidence, notes } = req.body as Record<string, string>;

  const allowed = ['compliant', 'partial', 'non_compliant', 'not_applicable', 'not_assessed'];
  if (status && !allowed.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${allowed.join(', ')}` });
  }

  try {
    // Fetch current for diff
    const { rows: before } = await pool.query('SELECT * FROM cd_controls WHERE id = $1', [req.params.id]);
    if (!before[0]) return res.status(404).json({ error: 'Control not found' });

    const { rows } = await pool.query(`
      UPDATE cd_controls SET
        status       = COALESCE($1, status),
        owner        = COALESCE($2, owner),
        evidence     = COALESCE($3, evidence),
        notes        = COALESCE($4, notes),
        last_reviewed = now(),
        updated_at   = now()
      WHERE id = $5
      RETURNING *
    `, [status ?? null, owner ?? null, evidence ?? null, notes ?? null, req.params.id]);

    writeAudit({
      actorId: user.userId,
      actorEmail: user.email,
      action: 'update_control',
      entityType: 'control',
      entityId: req.params.id,
      detail: {
        before: { status: before[0].status, owner: before[0].owner },
        after:  { status: rows[0].status,   owner: rows[0].owner },
      },
      ipAddress: req.ip,
    });

    return res.json({ control: rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
