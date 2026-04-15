import { Router, Request, Response } from 'express';
import { pool } from '../db/pool';
import { requireAuth, requireRole, AuthedRequest } from '../middleware/auth';
import { writeAudit } from '../services/auditWriter';
import { computeScore } from '../services/scoring';
import PDFDocument from 'pdfkit';

const router = Router();

// GET /api/reports
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(`
      SELECT r.*, f.name AS framework_name, u.full_name AS generated_by_name
      FROM cd_reports r
      LEFT JOIN cd_frameworks f ON f.id = r.framework_id
      LEFT JOIN cd_users u ON u.id = r.generated_by
      ORDER BY r.created_at DESC
    `);
    return res.json({ reports: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/reports/generate — generate PDF report for a framework
router.post('/generate', requireAuth, requireRole('admin', 'auditor'), async (req: Request, res: Response) => {
  const user = (req as AuthedRequest).user;
  const { frameworkSlug } = req.body as { frameworkSlug?: string };
  if (!frameworkSlug) return res.status(400).json({ error: 'frameworkSlug required' });

  try {
    // Fetch framework
    const { rows: fws } = await pool.query('SELECT * FROM cd_frameworks WHERE slug = $1', [frameworkSlug]);
    if (!fws[0]) return res.status(404).json({ error: 'Framework not found' });
    const fw = fws[0];

    // Fetch controls
    const { rows: controls } = await pool.query(
      'SELECT * FROM cd_controls WHERE framework_id = $1 ORDER BY ref_code',
      [fw.id]
    );

    // Fetch risks
    const { rows: risks } = await pool.query(
      `SELECT * FROM cd_risks WHERE framework_id = $1 ORDER BY risk_score DESC`,
      [fw.id]
    );

    // Compute score
    const counts = {
      compliant:        controls.filter((c: { status: string }) => c.status === 'compliant').length,
      partial:          controls.filter((c: { status: string }) => c.status === 'partial').length,
      non_compliant:    controls.filter((c: { status: string }) => c.status === 'non_compliant').length,
      not_applicable:   controls.filter((c: { status: string }) => c.status === 'not_applicable').length,
      not_assessed:     controls.filter((c: { status: string }) => c.status === 'not_assessed').length,
      total_applicable: controls.filter((c: { status: string }) => !['not_applicable', 'not_assessed'].includes(c.status)).length,
    };
    const score = computeScore(counts);

    // Save report record
    const { rows: saved } = await pool.query(`
      INSERT INTO cd_reports (framework_id, title, generated_by, score, summary)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [
      fw.id,
      `${fw.name} Compliance Report — ${new Date().toLocaleDateString('en-GB')}`,
      user.userId,
      score,
      JSON.stringify(counts),
    ]);
    const reportId = saved[0].id;

    writeAudit({
      actorId: user.userId,
      actorEmail: user.email,
      action: 'export_report',
      entityType: 'report',
      entityId: reportId,
      detail: { framework: frameworkSlug, score },
      ipAddress: req.ip,
    });

    // Generate PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${frameworkSlug}-compliance-report.pdf"`);

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    doc.pipe(res);

    // Header
    doc.fontSize(22).fillColor('#0f172a').text('Compliance Report', { align: 'center' });
    doc.fontSize(14).fillColor('#334155').text(fw.name, { align: 'center' });
    doc.fontSize(10).fillColor('#64748b').text(`Generated: ${new Date().toLocaleString('en-GB')} · By: ${user.email}`, { align: 'center' });
    doc.moveDown(1.5);

    // Score summary box
    doc.roundedRect(50, doc.y, 495, 80, 8).fillAndStroke('#f8fafc', '#e2e8f0');
    const boxY = doc.y - 80 + 16;
    doc.fontSize(11).fillColor('#334155').text('Compliance Score', 70, boxY);
    doc.fontSize(28).fillColor(score >= 75 ? '#059669' : score >= 50 ? '#d97706' : '#dc2626')
       .text(`${score}%`, 70, boxY + 16);
    doc.fontSize(10).fillColor('#64748b').text(
      `Compliant: ${counts.compliant}  ·  Partial: ${counts.partial}  ·  Non-Compliant: ${counts.non_compliant}  ·  N/A: ${counts.not_applicable}`,
      200, boxY + 22
    );
    doc.moveDown(5);

    // Controls section
    doc.fontSize(14).fillColor('#0f172a').text('Controls', { underline: true });
    doc.moveDown(0.5);

    const statusEmoji: Record<string, string> = {
      compliant: '✓', partial: '~', non_compliant: '✗', not_applicable: 'N/A', not_assessed: '?',
    };

    for (const ctrl of controls) {
      const emoji = statusEmoji[ctrl.status] ?? '?';
      doc.fontSize(9).fillColor('#0f172a')
         .text(`[${emoji}] ${ctrl.ref_code} — ${ctrl.title}`, { continued: false });
      if (ctrl.description) {
        doc.fontSize(8).fillColor('#64748b').text(`    ${ctrl.description}`);
      }
      doc.moveDown(0.3);
    }

    // Risks section
    if (risks.length > 0) {
      doc.addPage();
      doc.fontSize(14).fillColor('#0f172a').text('Risk Register', { underline: true });
      doc.moveDown(0.5);

      for (const risk of risks) {
        const color = risk.risk_score >= 16 ? '#dc2626' : risk.risk_score >= 9 ? '#d97706' : '#059669';
        doc.fontSize(9).fillColor(color).text(`[Score: ${risk.risk_score}] ${risk.title}`, { continued: false });
        doc.fontSize(8).fillColor('#64748b').text(`    Status: ${risk.status} · Likelihood: ${risk.likelihood} · Impact: ${risk.impact}`);
        if (risk.mitigation) doc.fontSize(8).fillColor('#64748b').text(`    Mitigation: ${risk.mitigation}`);
        doc.moveDown(0.3);
      }
    }

    // Footer
    doc.fontSize(8).fillColor('#94a3b8')
       .text(`HelvetiaSaaS AG — CONFIDENTIAL — Report ID: ${reportId}`, 50, doc.page.height - 50, { align: 'center' });

    doc.end();

  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
