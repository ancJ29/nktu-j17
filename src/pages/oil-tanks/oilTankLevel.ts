import type { OilTankExtra } from '@/types';

export function fillPercent(extra: OilTankExtra | undefined): number | null {
  const level = extra?.currentLevel;
  const capacity = extra?.capacity;
  if (typeof level !== 'number' || typeof capacity !== 'number' || capacity <= 0) return null;

  return Math.min(100, Math.max(0, (level / capacity) * 100));
}

export function levelTone(
  extra: OilTankExtra | undefined,
): 'danger' | 'warning' | 'neutral' | null {
  const pct = fillPercent(extra);
  if (pct === null) return null;
  if (pct < 15) return 'danger';
  if (pct < 30) return 'warning';
  return 'neutral';
}
