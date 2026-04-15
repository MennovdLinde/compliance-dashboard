import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../db/pool';
import { env } from '../config/env';
import { writeAudit } from '../services/auditWriter';
import { requireAuth, AuthedRequest } from '../middleware/auth';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });

  try {
    const { rows } = await pool.query(
      'SELECT id, email, password_hash, role, full_name, company FROM cd_users WHERE email = $1',
      [email.toLowerCase().trim()]
    );
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, company: user.company },
      env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    writeAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: 'login',
      detail: { role: user.role },
      ipAddress: req.ip,
    });

    return res.json({
      token,
      user: { id: user.id, email: user.email, role: user.role, fullName: user.full_name, company: user.company },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, (req: Request, res: Response) => {
  const user = (req as AuthedRequest).user;
  return res.json({ user });
});

export default router;
