interface ControlCounts {
  compliant: number;
  partial: number;
  non_compliant: number;
  not_applicable: number;
  not_assessed: number;
  total_applicable: number;
}

/**
 * Score = (compliant + 0.5 * partial) / total_applicable * 100
 * not_applicable and not_assessed are excluded from denominator
 */
export function computeScore(counts: ControlCounts): number {
  if (counts.total_applicable === 0) return 0;
  const score = (counts.compliant + 0.5 * counts.partial) / counts.total_applicable * 100;
  return Math.round(score * 10) / 10;
}

export function scoreColor(score: number): string {
  if (score >= 75) return '#34d399'; // green
  if (score >= 50) return '#fbbf24'; // amber
  return '#f87171';                  // red
}

export function scoreLabel(score: number): string {
  if (score >= 75) return 'Good';
  if (score >= 50) return 'Needs Attention';
  return 'At Risk';
}
