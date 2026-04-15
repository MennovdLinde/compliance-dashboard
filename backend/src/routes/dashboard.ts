import { Router, Request, Response } from 'express';
import { pool } from '../db/pool';
import { requireAuth } from '../middleware/auth';
import { computeScore } from '../services/scoring';

const router = Router();

// GET /api/dashboard — overall summary card data
router.get('/', requireAuth, async (_req: Request, res: Response) => {
  try {
    // Per-framework scores
    const { rows: frameworks } = await pool.query('SELECT * FROM cd_frameworks ORDER BY id');

    const frameworkScores = await Promise.all(frameworks.map(async (fw: { id: number; slug: string; name: string }) => {
      const { rows } = await pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'compliant')     AS compliant,
          COUNT(*) FILTER (WHERE status = 'partial')       AS partial,
          COUNT(*) FILTER (WHERE status = 'non_compliant') AS non_compliant,
          COUNT(*) FILTER (WHERE status NOT IN ('not_applicable','not_assessed')) AS total_applicable
        FROM cd_controls WHERE framework_id = $1
      `, [fw.id]);
      const counts = {
        compliant: parseInt(rows[0].compliant), partial: parseInt(rows[0].partial),
        non_compliant: parseInt(rows[0].non_compliant), total_applicable: parseInt(rows[0].total_applicable),
        not_applicable: 0, not_assessed: 0,
      };
      return { slug: fw.slug, name: fw.name, score: computeScore(counts) };
    }));

    const avgScore = Math.round(
      frameworkScores.reduce((sum, f) => sum + f.score, 0) / frameworkScores.length * 10
    ) / 10;

    // Risk summary
    const { rows: riskRows } = await pool.query(`
      SELECT
        COUNT(*)                                             AS total,
        COUNT(*) FILTER (WHERE risk_score >= 16)            AS critical,
        COUNT(*) FILTER (WHERE status = 'open')             AS open,
        COUNT(*) FILTER (WHERE status = 'mitigated')        AS mitigated
      FROM cd_risks
    `);

    // Controls summary
    const { rows: ctrlRows } = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'non_compliant')    AS non_compliant,
        COUNT(*) FILTER (WHERE status = 'not_assessed')     AS not_assessed,
        COUNT(*)                                            AS total
      FROM cd_controls
    `);

    // Recent audit entries
    const { rows: recentAudit } = await pool.query(`
      SELECT actor_email, action, entity_type, created_at
      FROM cd_audit_log
      ORDER BY id DESC LIMIT 5
    `);

    return res.json({
      avgScore,
      frameworkScores,
      risks: {
        total:    parseInt(riskRows[0].total),
        critical: parseInt(riskRows[0].critical),
        open:     parseInt(riskRows[0].open),
        mitigated: parseInt(riskRows[0].mitigated),
      },
      controls: {
        nonCompliant: parseInt(ctrlRows[0].non_compliant),
        notAssessed:  parseInt(ctrlRows[0].not_assessed),
        total:        parseInt(ctrlRows[0].total),
      },
      recentActivity: recentAudit,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
