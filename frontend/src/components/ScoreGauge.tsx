interface Props { score: number; label: string; size?: number; }

export function ScoreGauge({ score, label, size = 120 }: Props) {
  const color = score >= 75 ? '#34d399' : score >= 50 ? '#fbbf24' : '#f87171';
  const r = (size / 2) - 10;
  const circumference = 2 * Math.PI * r;
  const dash = (score / 100) * circumference;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e293b" strokeWidth={10} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={10}
          strokeDasharray={`${dash} ${circumference - dash}`} strokeLinecap="round" />
        <text x={size/2} y={size/2 + 6} textAnchor="middle" fontSize={size * 0.22}
          fill={color} fontWeight={700} style={{ transform: 'rotate(90deg)', transformOrigin: `${size/2}px ${size/2}px` }}>
          {score}%
        </text>
      </svg>
      <div style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center' }}>{label}</div>
    </div>
  );
}
