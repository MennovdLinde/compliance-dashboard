interface Props { label: string; value: string | number; sub?: string; accent?: string; }

export function MetricCard({ label, value, sub, accent = '#3b82f6' }: Props) {
  return (
    <div style={{ background: '#1e293b', borderRadius: 12, padding: 20, borderTop: `3px solid ${accent}` }}>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: '#f1f5f9' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}
