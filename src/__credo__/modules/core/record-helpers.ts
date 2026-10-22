import type { RecordEnvelope, RecordMeta, StorageAdapter } from './types.js';
import { ListVersionConflictError, NotFoundError, VersionConflictError } from './errors.js';

export function buildKey(prefix: string, scope: string): string {
  return `${prefix}.${scope}`;
}

export async function loadItems<T>(
  storage: StorageAdapter,
  serviceCode: string,
  key: string,
): Promise<T[]> {
  const envelope = await storage.getRecord<RecordEnvelope<T>>(serviceCode, key);
  return envelope?.items ?? [];
}

export async function loadEnvelope<T>(
  storage: StorageAdapter,
  serviceCode: string,
  key: string,
): Promise<RecordEnvelope<T>> {
  const envelope = await storage.getRecord<RecordEnvelope<T>>(serviceCode, key);
  return envelope ?? { items: [], meta: { updatedAt: Date.now() } };
}

export function findWithVersionCheck<T extends { id: string; version?: string }>(
  items: T[],
  id: string,
  expectedVersion: string | undefined,
  entityName: string,
): { item: T; index: number } {
  const index = items.findIndex((e) => e.id === id);
  if (index === -1) {
    throw new NotFoundError(entityName, id);
  }
  const item = items[index]!;
  if (item.version !== expectedVersion) {
    throw new VersionConflictError(entityName, id, item);
  }
  return { item, index };
}

export function checkListVersion<T>(
  envelope: RecordEnvelope<T>,
  expectedListHash: string | undefined,
  entityName: string,
): void {
  const currentHash = envelope.meta.hash;
  if (currentHash && expectedListHash !== currentHash) {
    throw new ListVersionConflictError(entityName, currentHash);
  }
}

export function checkListVersionTolerant<T>(
  envelope: RecordEnvelope<T>,
  expectedListHash: string | undefined,
  entityName: string,
): void {
  if (expectedListHash === undefined) return;
  checkListVersion(envelope, expectedListHash, entityName);
}

export async function saveItemsWithMeta<T>(
  storage: StorageAdapter,
  serviceCode: string,
  key: string,
  items: T[],
): Promise<RecordMeta> {
  const existing = await storage.getRecord<RecordEnvelope<T>>(serviceCode, key);
  let version = Number(existing?.meta?.version ?? 0) + 1;
  if (isNaN(version)) {
    version = 1;
  }

  const hash = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const envelope: RecordEnvelope<T> = {
    items,
    meta: { updatedAt: Date.now(), version, hash },
  };
  await storage.pushRecord(serviceCode, key, envelope);
  return envelope.meta;
}

export async function saveItems<T>(
  storage: StorageAdapter,
  serviceCode: string,
  key: string,
  items: T[],
): Promise<void> {
  await saveItemsWithMeta(storage, serviceCode, key, items);
}
