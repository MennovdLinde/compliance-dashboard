import { Router, Request, Response } from 'express';
import { pool } from '../db/pool';
import { requireAuth, requireRole, AuthedRequest } from '../middleware/auth';
import { writeAudit } from '../services/auditWriter';

const router = Router();

// GET /api/risks?status=open&framework=gdpr
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const { status, framework, category } = req.query as Record<string, string>;

  try {
    let query = `
      SELECT r.*, f.slug AS framework_slug, f.name AS framework_name
      FROM cd_risks r
      LEFT JOIN cd_frameworks f ON f.id = r.framework_id
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (status)    { params.push(status);    query += ` AND r.status = $${params.length}`; }
    if (framework) { params.push(framework); query += ` AND f.slug = $${params.length}`; }
    if (category)  { params.push(category);  query += ` AND r.category = $${params.length}`; }

    query += ' ORDER BY r.risk_score DESC, r.created_at DESC';

    const { rows } = await pool.query(query, params);
    return res.json({ risks: rows, total: rows.length });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/risks/summary
router.get('/summary', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        COUNT(*)                                          AS total,
        COUNT(*) FILTER (WHERE risk_score >= 16)         AS critical,
        COUNT(*) FILTER (WHERE risk_score BETWEEN 9 AND 15) AS high,
        COUNT(*) FILTER (WHERE risk_score BETWEEN 4 AND 8)  AS medium,
        COUNT(*) FILTER (WHERE risk_score < 4)           AS low,
        COUNT(*) FILTER (WHERE status = 'open')          AS open,
        COUNT(*) FILTER (WHERE status = 'mitigated')     AS mitigated,
        ROUND(AVG(risk_score), 1)                        AS avg_score
      FROM cd_risks
    `);
    return res.json({ summary: rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/risks/:id
router.patch('/:id', requireAuth, requireRole('admin', 'auditor'), async (req: Request, res: Response) => {
  const user = (req as AuthedRequest).user;
  const { status, likelihood, impact, mitigation, owner, due_date } = req.body as Record<string, string>;

  const allowedStatus = ['open', 'mitigated', 'accepted', 'closed'];
  if (status && !allowedStatus.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${allowedStatus.join(', ')}` });
  }

  try {
    const { rows: before } = await pool.query('SELECT * FROM cd_risks WHERE id = $1', [req.params.id]);
    if (!before[0]) return res.status(404).json({ error: 'Risk not found' });

    const { rows } = await pool.query(`
      UPDATE cd_risks SET
        status     = COALESCE($1, status),
        likelihood = COALESCE($2, likelihood),
        impact     = COALESCE($3, impact),
        mitigation = COALESCE($4, mitigation),
        owner      = COALESCE($5, owner),
        due_date   = COALESCE($6::date, due_date),
        updated_at = now()
      WHERE id = $7
      RETURNING *
    `, [
      status     ?? null,
      likelihood ? parseInt(likelihood) : null,
      impact     ? parseInt(impact)     : null,
      mitigation ?? null,
      owner      ?? null,
      due_date   ?? null,
      req.params.id,
    ]);

    writeAudit({
      actorId: user.userId,
      actorEmail: user.email,
      action: 'update_risk',
      entityType: 'risk',
      entityId: req.params.id,
      detail: { before: { status: before[0].status, risk_score: before[0].risk_score }, after: { status: rows[0].status, risk_score: rows[0].risk_score } },
      ipAddress: req.ip,
    });

    return res.json({ risk: rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
