export function formatNumber(number: unknown, defaultValue: string = '—'): string {
  const value = Number(number);
  if (Number.isNaN(value)) return defaultValue;
  return value.toLocaleString();
}
