import { ONE_HOUR } from '@credo/kits/time';

export function generateCode(prefix: string): string {
  const now = Date.now() + 7 * ONE_HOUR;
  const timeBased = new Date(now).toISOString().replace(/-|:/g, '').replace('T', '-').slice(2, 15);
  const randomString = Math.random().toString().substring(3, 8);
  return `${prefix}${timeBased}-${randomString}`;
}

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
