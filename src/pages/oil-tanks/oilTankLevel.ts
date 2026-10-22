import type { OilTankExtra } from '@/types';

const OVERFILL_PERCENT = 100;

const WARNING_PERCENT = 30;
const DANGER_PERCENT = 15;

export type LevelTone = 'overfilled' | 'danger' | 'warning' | 'neutral';

export const LEVEL_TONE_COLOR: Record<LevelTone, string> = {
  overfilled: 'violet',
  danger: 'red',
  warning: 'orange',
  neutral: 'primary',
};

export function fillPercent(extra: OilTankExtra | undefined): number | null {
  const level = extra?.currentLevel;
  const capacity = extra?.capacity;
  if (typeof level !== 'number' || typeof capacity !== 'number' || capacity <= 0) return null;

  return Math.round((level / capacity) * 100);
}

export function barPercent(extra: OilTankExtra | undefined): number | null {
  const pct = fillPercent(extra);
  if (pct === null) return null;
  return Math.min(100, Math.max(0, pct));
}

export function levelTone(extra: OilTankExtra | undefined): LevelTone | null {
  const pct = fillPercent(extra);
  if (pct === null) return null;
  if (pct > OVERFILL_PERCENT) return 'overfilled';
  if (pct < DANGER_PERCENT) return 'danger';
  if (pct < WARNING_PERCENT) return 'warning';
  return 'neutral';
}

export function isOverfilled(extra: OilTankExtra | undefined): boolean {
  return levelTone(extra) === 'overfilled';
}
