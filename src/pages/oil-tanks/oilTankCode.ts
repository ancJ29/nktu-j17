export const OIL_TANK_PREFIX = 'BON';

export const OIL_TANK_PAD = 3;

export function nextOilTankSequence(existingCodes: Iterable<string>): number {
  const re = new RegExp(`^${OIL_TANK_PREFIX}-(\\d+)$`);
  let max = 0;
  for (const code of existingCodes) {
    const m = re.exec(code);
    if (!m) continue;
    const n = Number.parseInt(m[1], 10);
    if (n > max) max = n;
  }
  return max + 1;
}

export function formatOilTankCode(seq: number): string {
  return `${OIL_TANK_PREFIX}-${String(seq).padStart(OIL_TANK_PAD, '0')}`;
}

export function buildNextOilTankCode(existingCodes: Iterable<string>): string {
  return formatOilTankCode(nextOilTankSequence(existingCodes));
}
