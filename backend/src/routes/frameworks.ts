import { Router, Request, Response } from 'express';
import { pool } from '../db/pool';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { computeScore, scoreColor, scoreLabel } from '../services/scoring';

const router = Router();

// GET /api/frameworks — list all with scores
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows: frameworks } = await pool.query('SELECT * FROM cd_frameworks ORDER BY id');

    const result = await Promise.all(frameworks.map(async (fw: { id: number; slug: string; name: string; description: string; version: string }) => {
      const { rows } = await pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'compliant')       AS compliant,
          COUNT(*) FILTER (WHERE status = 'partial')         AS partial,
          COUNT(*) FILTER (WHERE status = 'non_compliant')   AS non_compliant,
          COUNT(*) FILTER (WHERE status = 'not_applicable')  AS not_applicable,
          COUNT(*) FILTER (WHERE status = 'not_assessed')    AS not_assessed,
          COUNT(*) FILTER (WHERE status NOT IN ('not_applicable', 'not_assessed')) AS total_applicable
        FROM cd_controls WHERE framework_id = $1
      `, [fw.id]);

      const counts = {
        compliant:       parseInt(rows[0].compliant),
        partial:         parseInt(rows[0].partial),
        non_compliant:   parseInt(rows[0].non_compliant),
        not_applicable:  parseInt(rows[0].not_applicable),
        not_assessed:    parseInt(rows[0].not_assessed),
        total_applicable: parseInt(rows[0].total_applicable),
      };

      const score = computeScore(counts);
      return {
        id: fw.id,
        slug: fw.slug,
        name: fw.name,
        description: fw.description,
        version: fw.version,
        score,
        scoreColor: scoreColor(score),
        scoreLabel: scoreLabel(score),
        counts,
      };
    }));

    return res.json({ frameworks: result });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/frameworks/:slug
router.get('/:slug', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query('SELECT * FROM cd_frameworks WHERE slug = $1', [req.params.slug]);
    if (!rows[0]) return res.status(404).json({ error: 'Framework not found' });
    return res.json({ framework: rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
