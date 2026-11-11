import { EntityConflictError } from '@/stores/createEntityStore';

export type BulkMarkResult<T> = {
  saved: T[];

  conflicted: T[];

  failed: { item: T; reason: string }[];
};

export async function bulkMark<T>(
  items: readonly T[],
  write: (item: T) => Promise<unknown>,
  onProgress?: (done: number, total: number) => void,
): Promise<BulkMarkResult<T>> {
  const result: BulkMarkResult<T> = { saved: [], conflicted: [], failed: [] };
  onProgress?.(0, items.length);
  for (const [i, item] of items.entries()) {
    try {
      await write(item);
      result.saved.push(item);
    } catch (err) {
      if (err instanceof EntityConflictError) result.conflicted.push(item);
      else result.failed.push({ item, reason: err instanceof Error ? err.message : String(err) });
    }
    onProgress?.(i + 1, items.length);
  }
  return result;
}
