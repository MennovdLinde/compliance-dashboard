import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { MetricCard } from '../components/MetricCard';
import { ScoreGauge } from '../components/ScoreGauge';

interface DashData {
  avgScore: number;
  frameworkScores: { slug: string; name: string; score: number }[];
  risks: { total: number; critical: number; open: number; mitigated: number };
  controls: { nonCompliant: number; notAssessed: number; total: number };
  recentActivity: { actor_email: string; action: string; entity_type: string; created_at: string }[];
}

const ACTION_LABELS: Record<string, string> = {
  login: 'Signed in', update_control: 'Updated control', update_risk: 'Updated risk',
  export_report: 'Exported report', system_init: 'System initialised', framework_created: 'Framework created',
};

export function DashboardPage() {
  const [data, setData] = useState<DashData | null>(null);

  useEffect(() => {
    api.get('/api/dashboard').then(r => setData(r.data)).catch(() => {});
  }, []);

  if (!data) return <div style={{ color: '#64748b', padding: 32 }}>Loading dashboard…</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9' }}>Compliance Dashboard</h1>
        <p style={{ color: '#64748b', marginTop: 4 }}>HelvetiaSaaS AG — GDPR · ISO 27001 · HIPAA</p>
      </div>

      {/* Framework score gauges */}
      <div style={{ background: '#1e293b', borderRadius: 12, padding: 28 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: '#94a3b8', marginBottom: 24 }}>Framework Compliance Scores</h2>
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', flexWrap: 'wrap', gap: 24 }}>
          <ScoreGauge score={data.avgScore} label="Overall" size={140} />
          {data.frameworkScores.map(f => (
            <ScoreGauge key={f.slug} score={f.score} label={f.name} size={110} />
          ))}
        </div>
      </div>

      {/* Metric cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <MetricCard label="Open Risks" value={data.risks.open} sub={`${data.risks.critical} critical`} accent="#f87171" />
        <MetricCard label="Risks Mitigated" value={data.risks.mitigated} sub={`of ${data.risks.total} total`} accent="#34d399" />
        <MetricCard label="Non-Compliant Controls" value={data.controls.nonCompliant} sub="need remediation" accent="#fbbf24" />
        <MetricCard label="Controls Not Assessed" value={data.controls.notAssessed} sub={`of ${data.controls.total} total`} accent="#a78bfa" />
      </div>

      {/* Recent activity */}
      <div style={{ background: '#1e293b', borderRadius: 12, padding: 24 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: '#94a3b8', marginBottom: 16 }}>Recent Activity</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {data.recentActivity.map((a, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#0f172a', borderRadius: 8, fontSize: 13 }}>
              <span style={{ color: '#94a3b8' }}>
                <span style={{ color: '#38bdf8' }}>{a.actor_email}</span>
                {' — '}
                {ACTION_LABELS[a.action] ?? a.action}
                {a.entity_type && ` (${a.entity_type})`}
              </span>
              <span style={{ color: '#475569', fontSize: 12 }}>{new Date(a.created_at).toLocaleString('en-GB')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
