export type UnitOption = { value: string; label: string };

export function materialUnitOptions(
  units: string[],
  current: string | undefined,
  labelOf: (unit: string) => string,
): UnitOption[] {
  const options = units.map((unit) => ({ value: unit, label: labelOf(unit) }));
  if (current && !units.includes(current)) options.push({ value: current, label: current });
  return options;
}

export function unitAfterMaterialChange(
  current: string | undefined,
  units: string[],
): string | undefined {
  return current && units.includes(current) ? current : units[0];
}
