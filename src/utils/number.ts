export const LITRE_DECIMAL_SCALE = 3;

const MARKS = ((): { group: string; decimal: string } => {
  const parts = new Intl.NumberFormat().formatToParts(12345.6);
  return {
    group: parts.find((part) => part.type === 'group')?.value ?? ',',
    decimal: parts.find((part) => part.type === 'decimal')?.value ?? '.',
  };
})();

export const NUMBER_MARKS: Readonly<{ group: string; decimal: string }> = MARKS;

export function parseLocaleNumber(text: string): number {
  const bare = text.split(MARKS.group).join('').replace(MARKS.decimal, '.').trim();
  return bare === '' ? Number.NaN : Number(bare);
}

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
