import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

interface Control {
  id: number; framework_slug: string; framework_name: string; ref_code: string;
  title: string; category: string; description: string; status: string;
  owner: string; evidence: string; notes: string; last_reviewed: string;
}

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  compliant:      { bg: '#064e3b', color: '#34d399' },
  partial:        { bg: '#451a03', color: '#fbbf24' },
  non_compliant:  { bg: '#450a0a', color: '#f87171' },
  not_applicable: { bg: '#1e293b', color: '#64748b' },
  not_assessed:   { bg: '#1e293b', color: '#94a3b8' },
};

const FW_TABS = [
  { slug: '', label: 'All' },
  { slug: 'gdpr', label: 'GDPR' },
  { slug: 'iso27001', label: 'ISO 27001' },
  { slug: 'hipaa', label: 'HIPAA' },
];

export function ControlsPage() {
  const { user } = useAuth();
  const [controls, setControls] = useState<Control[]>([]);
  const [framework, setFramework] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editing, setEditing] = useState<Control | null>(null);
  const [editStatus, setEditStatus] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);

  function load() {
    const params = new URLSearchParams();
    if (framework) params.set('framework', framework);
    if (statusFilter) params.set('status', statusFilter);
    api.get(`/api/controls?${params}`).then(r => setControls(r.data.controls)).catch(() => {});
  }

  useEffect(() => { load(); }, [framework, statusFilter]);

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    try {
      await api.patch(`/api/controls/${editing.id}`, { status: editStatus, notes: editNotes });
      setEditing(null);
      load();
    } finally { setSaving(false); }
  }

  const canEdit = user?.role === 'admin' || user?.role === 'auditor';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9' }}>Controls</h1>
        <p style={{ color: '#64748b', marginTop: 4 }}>Manage compliance controls across all frameworks</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 2 }}>
          {FW_TABS.map(t => (
            <button key={t.slug} onClick={() => setFramework(t.slug)}
              style={{ padding: '7px 14px', fontSize: 13, border: 'none', borderRadius: 6, cursor: 'pointer',
                background: framework === t.slug ? '#3b82f6' : '#1e293b',
                color: framework === t.slug ? '#fff' : '#94a3b8' }}>
              {t.label}
            </button>
          ))}
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={{ background: '#1e293b', color: '#e2e8f0', border: '1px solid #334155', borderRadius: 6, padding: '7px 12px', fontSize: 13 }}>
          <option value="">All statuses</option>
          <option value="compliant">Compliant</option>
          <option value="partial">Partial</option>
          <option value="non_compliant">Non-Compliant</option>
          <option value="not_applicable">N/A</option>
          <option value="not_assessed">Not Assessed</option>
        </select>
        <span style={{ fontSize: 13, color: '#64748b' }}>{controls.length} controls</span>
      </div>

      {/* Table */}
      <div style={{ background: '#1e293b', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #334155' }}>
              {['Ref', 'Title', 'Framework', 'Category', 'Status', 'Owner', 'Reviewed', ''].map(h => (
                <th key={h} style={{ padding: '12px 14px', color: '#64748b', textAlign: 'left', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {controls.map(c => (
              <tr key={c.id} style={{ borderBottom: '1px solid #0f172a' }}>
                <td style={{ padding: '11px 14px', fontFamily: 'monospace', color: '#38bdf8', whiteSpace: 'nowrap' }}>{c.ref_code}</td>
                <td style={{ padding: '11px 14px', color: '#e2e8f0', maxWidth: 280 }}>
                  <div>{c.title}</div>
                  {c.description && <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{c.description}</div>}
                </td>
                <td style={{ padding: '11px 14px', color: '#94a3b8', whiteSpace: 'nowrap' }}>{c.framework_name}</td>
                <td style={{ padding: '11px 14px', color: '#94a3b8' }}>{c.category}</td>
                <td style={{ padding: '11px 14px' }}>
                  <span style={{
                    background: STATUS_STYLE[c.status]?.bg ?? '#1e293b',
                    color: STATUS_STYLE[c.status]?.color ?? '#94a3b8',
                    borderRadius: 4, padding: '3px 8px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
                  }}>
                    {c.status.replace('_', ' ').toUpperCase()}
                  </span>
                </td>
                <td style={{ padding: '11px 14px', color: '#64748b', fontSize: 12 }}>{c.owner}</td>
                <td style={{ padding: '11px 14px', color: '#475569', fontSize: 11 }}>
                  {c.last_reviewed ? new Date(c.last_reviewed).toLocaleDateString('en-GB') : '—'}
                </td>
                <td style={{ padding: '11px 14px' }}>
                  {canEdit && (
                    <button onClick={() => { setEditing(c); setEditStatus(c.status); setEditNotes(c.notes ?? ''); }}
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
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>{editing.ref_code} — {editing.title}</h2>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 24 }}>{editing.description}</p>

            <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase' }}>Status</label>
            <select value={editStatus} onChange={e => setEditStatus(e.target.value)}
              style={{ width: '100%', background: '#0f172a', color: '#e2e8f0', border: '1px solid #334155', borderRadius: 6, padding: '8px 12px', fontSize: 13, marginBottom: 16 }}>
              <option value="compliant">Compliant</option>
              <option value="partial">Partial</option>
              <option value="non_compliant">Non-Compliant</option>
              <option value="not_applicable">Not Applicable</option>
              <option value="not_assessed">Not Assessed</option>
            </select>

            <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase' }}>Notes</label>
            <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={4}
              style={{ width: '100%', background: '#0f172a', color: '#e2e8f0', border: '1px solid #334155', borderRadius: 6, padding: '8px 12px', fontSize: 13, marginBottom: 20, resize: 'vertical' }} />

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setEditing(null)} style={{ background: '#334155', color: '#94a3b8', border: 'none', borderRadius: 6, padding: '8px 18px', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={saveEdit} disabled={saving} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
