export const LITRE_DECIMAL_SCALE = 3;

export function formatNumber(number: unknown, defaultValue: string = '—'): string {
  const value = Number(number);
  if (Number.isNaN(value)) return defaultValue;
  return value.toLocaleString();
}

export function formatLitres(number: unknown, defaultValue: string = '—'): string {
  const value = Number(number);
  if (Number.isNaN(value)) return defaultValue;
  return value.toLocaleString(undefined, {
    useGrouping: false,
    maximumFractionDigits: LITRE_DECIMAL_SCALE,
  });
}

export const LITRE_INPUT_PROPS = {
  min: 0,
  decimalScale: LITRE_DECIMAL_SCALE,
  suffix: ' L',
} as const;
