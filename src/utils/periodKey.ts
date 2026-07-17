

const UTC_PLUS_7_OFFSET_MS = 7 * 60 * 60 * 1000;

export const getCurrentPeriodKey = (now: number = Date.now()): string => {
  const shifted = new Date(now + UTC_PLUS_7_OFFSET_MS);
  const yyyy = shifted.getUTCFullYear();
  const mm = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  return `${yyyy}${mm}`;
};
