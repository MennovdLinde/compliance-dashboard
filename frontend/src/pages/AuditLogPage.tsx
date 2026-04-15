import { useEffect, useState } from 'react';
import { api } from '../api/client';

interface Entry {
  id: number; actor_email: string; action: string; entity_type: string;
  entity_id: string; detail: Record<string, unknown>; ip_address: string; created_at: string;
}

const ACTION_LABELS: Record<string, string> = {
  login: 'Login', update_control: 'Updated control', update_risk: 'Updated risk',
  export_report: 'Exported report', system_init: 'System init', framework_created: 'Framework created',
};

export function AuditLogPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [actionFilter, setActionFilter] = useState('');
  const [integrity, setIntegrity] = useState<{ intact: boolean; gapsFound: number } | null>(null);
  const limit = 50;

  function load(off = 0) {
    const params = new URLSearchParams({ limit: String(limit), offset: String(off) });
    if (actionFilter) params.set('action', actionFilter);
    api.get(`/api/audit-log?${params}`)
      .then(r => { setEntries(r.data.entries); setTotal(r.data.total); })
      .catch(() => {});
  }

  function checkIntegrity() {
    api.get('/api/audit-log/integrity')
      .then(r => setIntegrity(r.data))
      .catch(() => {});
  }

  useEffect(() => { load(0); setOffset(0); }, [actionFilter]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9' }}>Audit Log</h1>
          <p style={{ color: '#64748b', marginTop: 4 }}>Immutable sequential log — BIGSERIAL ID enables gap detection</p>
        </div>
        <button onClick={checkIntegrity}
          style={{ background: '#1e293b', color: '#94a3b8', border: '1px solid #334155', borderRadius: 6, padding: '8px 14px', fontSize: 13, cursor: 'pointer' }}>
          Check Integrity
        </button>
      </div>

      {integrity && (
        <div style={{
          background: integrity.intact ? '#064e3b' : '#450a0a',
          border: `1px solid ${integrity.intact ? '#059669' : '#f87171'}`,
          borderRadius: 10, padding: '12px 18px',
        }}>
          {integrity.intact
            ? <p style={{ color: '#34d399', fontWeight: 600 }}>✓ Audit log is intact — no gaps detected</p>
            : <p style={{ color: '#f87171', fontWeight: 600 }}>⚠ {integrity.gapsFound} gap(s) detected — possible tampering</p>
          }
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <input value={actionFilter} onChange={e => setActionFilter(e.target.value)}
          placeholder="Filter by action…"
          style={{ background: '#1e293b', color: '#e2e8f0', border: '1px solid #334155', borderRadius: 6, padding: '8px 12px', fontSize: 13, width: 200 }} />
        <span style={{ fontSize: 13, color: '#64748b' }}>{total} total entries</span>
      </div>

      {/* Table */}
      <div style={{ background: '#1e293b', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #334155' }}>
              {['ID', 'Timestamp', 'Actor', 'Action', 'Entity', 'Detail', 'IP'].map(h => (
                <th key={h} style={{ padding: '11px 14px', color: '#64748b', textAlign: 'left', fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map(e => (
              <tr key={e.id} style={{ borderBottom: '1px solid #0f172a' }}>
                <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#475569' }}>#{e.id}</td>
                <td style={{ padding: '10px 14px', color: '#64748b', whiteSpace: 'nowrap' }}>
                  {new Date(e.created_at).toLocaleString('en-GB')}
                </td>
                <td style={{ padding: '10px 14px', color: '#38bdf8' }}>{e.actor_email}</td>
                <td style={{ padding: '10px 14px', color: '#e2e8f0' }}>{ACTION_LABELS[e.action] ?? e.action}</td>
                <td style={{ padding: '10px 14px', color: '#94a3b8' }}>
                  {e.entity_type && <span>{e.entity_type}{e.entity_id ? ` #${e.entity_id}` : ''}</span>}
                </td>
                <td style={{ padding: '10px 14px', color: '#64748b', fontFamily: 'monospace', maxWidth: 280 }}>
                  {e.detail ? JSON.stringify(e.detail).slice(0, 80) : ''}
                </td>
                <td style={{ padding: '10px 14px', color: '#475569', fontFamily: 'monospace' }}>{e.ip_address}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > limit && (
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button disabled={offset === 0} onClick={() => { const o = Math.max(0, offset - limit); setOffset(o); load(o); }}
            style={{ background: '#1e293b', color: '#94a3b8', border: '1px solid #334155', borderRadius: 6, padding: '6px 14px', fontSize: 13, cursor: 'pointer' }}>
            ← Prev
          </button>
          <span style={{ color: '#64748b', fontSize: 13, lineHeight: '32px' }}>
            {offset + 1}–{Math.min(offset + limit, total)} of {total}
          </span>
          <button disabled={offset + limit >= total} onClick={() => { const o = offset + limit; setOffset(o); load(o); }}
            style={{ background: '#1e293b', color: '#94a3b8', border: '1px solid #334155', borderRadius: 6, padding: '6px 14px', fontSize: 13, cursor: 'pointer' }}>
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
