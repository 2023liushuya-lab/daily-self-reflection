/**
 * Calculate progress percentage for a Key Result.
 * Handles both 'up' (more is better) and 'down' (less is better) directions.
 */
export function calcKRProgress(kr: {
  current: number;
  target: number;
  direction?: 'up' | 'down';
  startValue?: number;
}): number {
  const direction = kr.direction || 'up';

  if (direction === 'down' && kr.startValue != null) {
    // For decrease goals: progress = (start - current) / (start - target) * 100
    const total = kr.startValue - kr.target;
    if (total <= 0) return 0;
    const done = kr.startValue - kr.current;
    return Math.min(Math.max(Math.round((done / total) * 100), 0), 100);
  }

  // Default 'up' direction: progress = current / target * 100
  if (kr.target <= 0) return 0;
  return Math.min(Math.round((kr.current / kr.target) * 100), 100);
}

/**
 * Calculate overall goal progress from an array of key results.
 */
export function calcGoalProgress(krs: Array<{
  current: number;
  target: number;
  direction?: 'up' | 'down';
  startValue?: number;
}>): number {
  if (!krs.length) return 0;
  const sum = krs.reduce((acc, kr) => acc + calcKRProgress(kr), 0);
  return Math.round(sum / krs.length);
}
