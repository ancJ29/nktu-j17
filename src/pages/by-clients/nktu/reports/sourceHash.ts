import { hashString } from '@credo/kits/crypt';

export function sourceHashOf(records: ReadonlyArray<{ id: string; version: string }>): string {
  return hashString(
    records
      .map((r) => `${r.id}:${r.version}`)
      .sort()
      .join('|'),
  );
}
