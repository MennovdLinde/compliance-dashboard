import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

interface Risk {
  id: number; title: string; category: string; description: string;
  likelihood: number; impact: number; risk_score: number;
  status: string; owner: string; mitigation: string; due_date: string;
  framework_slug: string; framework_name: string;
}
interface Summary { total: string; critical: string; high: string; medium: string; low: string; open: string; mitigated: string; avg_score: string; }

function scoreColor(s: number) { return s >= 16 ? '#f87171' : s >= 9 ? '#fbbf24' : s >= 4 ? '#a78bfa' : '#34d399'; }
function scoreLabel(s: number) { return s >= 16 ? 'CRITICAL' : s >= 9 ? 'HIGH' : s >= 4 ? 'MEDIUM' : 'LOW'; }

export function RisksPage() {
  const { user } = useAuth();
  const [risks, setRisks] = useState<Risk[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [editing, setEditing] = useState<Risk | null>(null);
  const [editStatus, setEditStatus] = useState('');
  const [editMitigation, setEditMitigation] = useState('');
  const [saving, setSaving] = useState(false);
  const canEdit = user?.role === 'admin' || user?.role === 'auditor';

  function load() {
    const params = statusFilter ? `?status=${statusFilter}` : '';
    api.get(`/api/risks${params}`).then(r => setRisks(r.data.risks)).catch(() => {});
    api.get('/api/risks/summary').then(r => setSummary(r.data.summary)).catch(() => {});
  }
  useEffect(() => { load(); }, [statusFilter]);

  async function saveEdit() {
    if (!editing) return; setSaving(true);
    try { await api.patch(`/api/risks/${editing.id}`, { status: editStatus, mitigation: editMitigation }); setEditing(null); load(); }
    finally { setSaving(false); }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9' }}>Risk Register</h1>
        <p style={{ color: '#64748b', marginTop: 4 }}>Risks scored by likelihood × impact (1–25 scale)</p>
      </div>

      {/* Summary cards */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {[
            { label: 'Critical (≥16)', val: summary.critical, color: '#f87171' },
            { label: 'High (9-15)',    val: summary.high,     color: '#fbbf24' },
            { label: 'Open',          val: summary.open,     color: '#94a3b8' },
            { label: 'Avg Score',     val: summary.avg_score, color: '#a78bfa' },
          ].map(c => (
            <div key={c.label} style={{ background: '#1e293b', borderRadius: 10, padding: 16, borderTop: `3px solid ${c.color}` }}>
              <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>{c.label}</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: '#f1f5f9' }}>{c.val}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filter */}
      <div style={{ display: 'flex', gap: 8 }}>
        {['', 'open', 'mitigated', 'accepted', 'closed'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            style={{ padding: '7px 14px', fontSize: 13, border: 'none', borderRadius: 6, cursor: 'pointer',
              background: statusFilter === s ? '#3b82f6' : '#1e293b', color: statusFilter === s ? '#fff' : '#94a3b8' }}>
            {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: '#1e293b', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #334155' }}>
              {['Score', 'Title', 'Category', 'L × I', 'Status', 'Owner', 'Due', ''].map(h => (
                <th key={h} style={{ padding: '12px 14px', color: '#64748b', textAlign: 'left', fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {risks.map(r => (
              <tr key={r.id} style={{ borderBottom: '1px solid #0f172a' }}>
                <td style={{ padding: '11px 14px' }}>
                  <span style={{ background: '#0f172a', color: scoreColor(r.risk_score), borderRadius: 4, padding: '3px 8px', fontSize: 12, fontWeight: 700 }}>
                    {r.risk_score} {scoreLabel(r.risk_score)}
                  </span>
                </td>
                <td style={{ padding: '11px 14px', color: '#e2e8f0', maxWidth: 260 }}>
                  <div>{r.title}</div>
                  {r.mitigation && <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>↳ {r.mitigation}</div>}
                </td>
                <td style={{ padding: '11px 14px', color: '#94a3b8' }}>{r.category}</td>
                <td style={{ padding: '11px 14px', color: '#64748b', fontFamily: 'monospace' }}>{r.likelihood}×{r.impact}</td>
                <td style={{ padding: '11px 14px' }}>
                  <span style={{
                    background: r.status === 'open' ? '#450a0a' : r.status === 'mitigated' ? '#064e3b' : '#1e293b',
                    color: r.status === 'open' ? '#f87171' : r.status === 'mitigated' ? '#34d399' : '#94a3b8',
                    borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 600,
                  }}>
                    {r.status.toUpperCase()}
                  </span>
                </td>
                <td style={{ padding: '11px 14px', color: '#64748b', fontSize: 12 }}>{r.owner}</td>
                <td style={{ padding: '11px 14px', color: '#475569', fontSize: 11 }}>
                  {r.due_date ? new Date(r.due_date).toLocaleDateString('en-GB') : '—'}
                </td>
                <td style={{ padding: '11px 14px' }}>
                  {canEdit && (
                    <button onClick={() => { setEditing(r); setEditStatus(r.status); setEditMitigation(r.mitigation ?? ''); }}
                      style={{ background: '#334155', color: '#94a3b8', border: 'none', borderRadius: 4, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>
                      Edit
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit modal */}
      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#1e293b', borderRadius: 16, padding: 32, width: 480, border: '1px solid #334155' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>{editing.title}</h2>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 24 }}>Risk score: {editing.risk_score} — {scoreLabel(editing.risk_score)}</p>

            <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase' }}>Status</label>
            <select value={editStatus} onChange={e => setEditStatus(e.target.value)}
              style={{ width: '100%', background: '#0f172a', color: '#e2e8f0', border: '1px solid #334155', borderRadius: 6, padding: '8px 12px', fontSize: 13, marginBottom: 16 }}>
              <option value="open">Open</option>
              <option value="mitigated">Mitigated</option>
              <option value="accepted">Accepted</option>
              <option value="closed">Closed</option>
            </select>

            <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase' }}>Mitigation</label>
            <textarea value={editMitigation} onChange={e => setEditMitigation(e.target.value)} rows={3}
              style={{ width: '100%', background: '#0f172a', color: '#e2e8f0', border: '1px solid #334155', borderRadius: 6, padding: '8px 12px', fontSize: 13, marginBottom: 20, resize: 'vertical' }} />

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setEditing(null)} style={{ background: '#334155', color: '#94a3b8', border: 'none', borderRadius: 6, padding: '8px 18px', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={saveEdit} disabled={saving} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
