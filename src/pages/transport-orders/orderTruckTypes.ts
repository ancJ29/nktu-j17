import type { LookupOption } from '@/hooks/useLookupV2Options';

export function narrowTruckTypeOptions(
  options: readonly LookupOption[],
  allowed: readonly string[],
): LookupOption[] {
  if (allowed.length === 0) return [...options];
  const byValue = new Map(options.map((o) => [o.value, o]));
  return allowed.map((value) => byValue.get(value) ?? { value, label: value });
}

export const TRUCK_TYPE_COLORS = [
  '#4ba3c3',
  '#4392F1',
  '#6a994e',
  '#bc4749',
  '#f79256',
  '#fdc500',
  '#006494',
  '',
] as const;

export function truckTypeColor(value: string, allowed: readonly string[]): string {
  const index = allowed.indexOf(value);
  if (index < 0) return 'gray';
  return TRUCK_TYPE_COLORS[index % TRUCK_TYPE_COLORS.length]!;
}
