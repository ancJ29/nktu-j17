export function balanceColor(value: number): string | undefined {
  if (value > 0) return 'orange.9';
  if (value < 0) return 'blue.8';
  return undefined;
}
