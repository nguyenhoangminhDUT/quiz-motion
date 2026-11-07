export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function scoreAtLeast(
  value: number | null,
  minimum: number,
  fullScore: number,
): number {
  if (value === null || fullScore <= minimum || value <= minimum) return 0;
  return clamp01((value - minimum) / (fullScore - minimum));
}

export function scoreAtMost(
  value: number | null,
  fullScore: number,
  maximum: number,
): number {
  if (value === null || maximum <= fullScore || value >= maximum) return 0;
  return clamp01((maximum - value) / (maximum - fullScore));
}

export function averageScore(...scores: readonly number[]): number {
  if (scores.length === 0 || scores.some((score) => !Number.isFinite(score)))
    return 0;
  return clamp01(scores.reduce((sum, score) => sum + score, 0) / scores.length);
}
