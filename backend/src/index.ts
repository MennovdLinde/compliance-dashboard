import express from 'express';
import cors from 'cors';
import { env } from './config/env';

import authRoutes     from './routes/auth';
import frameworkRoutes from './routes/frameworks';
import controlRoutes  from './routes/controls';
import riskRoutes     from './routes/risks';
import auditRoutes    from './routes/auditLog';
import reportRoutes   from './routes/reports';
import dashboardRoutes from './routes/dashboard';

const app = express();

app.set('trust proxy', 1); // Correct req.ip behind Heroku

app.use(cors({
  origin: process.env.CORS_ORIGIN ?? '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// Routes
app.use('/api/auth',       authRoutes);
app.use('/api/frameworks', frameworkRoutes);
app.use('/api/controls',   controlRoutes);
app.use('/api/risks',      riskRoutes);
app.use('/api/audit-log',  auditRoutes);
app.use('/api/reports',    reportRoutes);
app.use('/api/dashboard',  dashboardRoutes);

// Health
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'compliance-dashboard-api', ts: new Date().toISOString() });
});

app.listen(env.PORT, () => {
  console.log(`Compliance Dashboard API running on port ${env.PORT}`);
});

export default app;
