import { CallApiError } from '@credo/connectors/connector';
import { ONE_HOUR } from '@credo/kits/time';

export function businessDateString(now: number = Date.now()): string {
  return new Date(now + 7 * ONE_HOUR).toISOString().slice(0, 10);
}

export function buildDailySequentialCode(
  prefix: string,
  existingCodes: Iterable<string>,
  options: { padLength?: number; date?: string } = {},
): string {
  const padLength = options.padLength ?? 3;
  const date = options.date ?? businessDateString();
  const datePart = date.slice(2).replace(/-/g, '');
  const dayPrefix = `${prefix}${datePart}-`;

  let maxCounter = 0;
  for (const code of existingCodes) {
    if (!code.startsWith(dayPrefix)) continue;
    const n = Number.parseInt(code.slice(dayPrefix.length), 10);
    if (Number.isFinite(n) && n > maxCounter) maxCounter = n;
  }

  return `${dayPrefix}${String(maxCounter + 1).padStart(padLength, '0')}`;
}

export function bumpSequentialCode(code: string, by: number): string {
  const sep = code.lastIndexOf('-');
  if (sep < 0) return code;
  const head = code.slice(0, sep + 1);
  const tail = code.slice(sep + 1);
  const n = Number.parseInt(tail, 10);
  if (!Number.isFinite(n)) return code;
  return `${head}${String(n + by).padStart(tail.length, '0')}`;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function buildNextSequentialCode(
  prefix: string,
  existingCodes: Iterable<string>,
  padLength: number,
): string {
  const re = new RegExp(`^${escapeRegExp(prefix)}(\\d+)$`);
  let max = 0;
  for (const code of existingCodes) {
    const m = re.exec(code);
    if (!m) continue;
    const n = Number.parseInt(m[1], 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `${prefix}${String(max + 1).padStart(Math.max(0, padLength), '0')}`;
}

export function isDuplicateUniqueFieldError(err: unknown, field: string): boolean {
  if (!(err instanceof CallApiError) || err.status !== 400) return false;
  const payload = err.payload;
  if (typeof payload !== 'object' || payload === null || !('fields' in payload)) return false;
  const fields = (payload as { fields?: unknown }).fields;
  return typeof fields === 'object' && fields !== null && field in fields;
}
