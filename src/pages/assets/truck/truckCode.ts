

export const FALLBACK_PREFIX = 'TRK';

export const FALLBACK_PAD = 4;

export const TYPE_PAD = 3;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function nextTruckSequence(prefix: string, existingCodes: Iterable<string>): number {
  const re = new RegExp(`^${escapeRegExp(prefix)}-(\\d+)$`);
  let max = 0;
  for (const code of existingCodes) {
    const m = re.exec(code);
    if (!m) continue;
    const n = Number.parseInt(m[1], 10);
    if (n > max) max = n;
  }
  return max + 1;
}

export function formatTruckCode(prefix: string, seq: number, pad: number): string {
  return `${prefix}-${String(seq).padStart(Math.max(0, pad), '0')}`;
}

export function buildNextTruckCode(
  prefix: string,
  existingCodes: Iterable<string>,
  pad: number,
): string {
  return formatTruckCode(prefix, nextTruckSequence(prefix, existingCodes), pad);
}
