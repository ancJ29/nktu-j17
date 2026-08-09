import type { StorageAdapter, RecordMeta, RecordEnvelope } from '../core/types.js';
import { NotFoundError, ValidationError } from '../core/errors.js';
import {
  findWithVersionCheck,
  checkListVersionTolerant,
  loadEnvelope,
  loadItems,
  saveItemsWithMeta,
} from '../core/record-helpers.js';
import { extractPeriodFromId, type PartitionSyncResult } from '../core/partitioned.js';
import { generateId } from '@credo/kits/string';
import { validateItemInput, buildItem, applyPatch, checkUniqueField } from './logic.js';
import type {
  ModeRecordItem,
  PartitionedModeRecordDescriptor,
  CreateModeRecordInput,
  UpdateModeRecordInput,
} from './types.js';

export interface PartitionedModeRecordsModuleConfig {
  storage: StorageAdapter;
  serviceCode: string;
  descriptor: PartitionedModeRecordDescriptor;
}

/** Truncate a `YYYY-MM-DD` day to the descriptor's creation grain. */
function truncateToGrain(day: string, locate: 'creation:day' | 'creation:month' | 'creation:year') {
  if (locate === 'creation:year') return day.slice(0, 4);
  if (locate === 'creation:month') return day.slice(0, 7);
  return day;
}

/**
 * partitioned-mode-records — one envelope per (entity, client, partition key);
 * unbounded lists. The descriptor-driven generalization of the day-partitioned
 * transactional modules (kickoff plan §5).
 *
 * Partition location comes from the descriptor:
 * - `creation:{day|month|year}` — partition = the record's creation bucket,
 *   derived from the id's embedded timestamp (the id is generated FIRST and
 *   the bucket derived FROM it, so id ↔ partition can never skew, even across
 *   midnight). Records never move; id-only deep links work.
 * - `explicit` — the caller names the partition on every call (client-defined,
 *   e.g. a business-date day); an update may move the record to a new key
 *   (remove + append — two writes, non-atomic, same as generic-records today).
 *
 * Concurrency (two-token, tolerant per §3a): `expectedListHash` → partition
 * envelope-CAS (absent ⇒ skipped) checked FIRST — closing the cross-record
 * revert race the dedicated partitioned modules never guarded — then item
 * `version` CAS. On a cross-partition move the envelope check applies to the
 * SOURCE partition (that's the list the caller last read). The `uniqueField`
 * guard is scoped to the target partition, matching today's per-day
 * order-number guard.
 */
export function createPartitionedModeRecordsModule(config: PartitionedModeRecordsModuleConfig) {
  const { storage, serviceCode, descriptor } = config;
  const entityName = descriptor.entity;
  const explicit = descriptor.partitionLocate === 'explicit';

  // Own key namespace, distinct from the legacy `{prefix}.{scope}.{period}`
  // scheme: `<client-code>:partitioned:<entity>:<partitionKey>`, e.g.
  // `argi-dev:partitioned:warehouse-delivery-notes:2026-07-04`.
  const key = (scope: string, partitionKey: string): string =>
    `${scope}:partitioned:${entityName}:${partitionKey}`;

  const loadEnv = (scope: string, partitionKey: string) =>
    loadEnvelope<ModeRecordItem>(storage, serviceCode, key(scope, partitionKey));
  const saveEnv = (
    scope: string,
    partitionKey: string,
    items: ModeRecordItem[],
  ): Promise<RecordMeta> =>
    saveItemsWithMeta(storage, serviceCode, key(scope, partitionKey), items);

  /** Per-partition change marker — envelope hash, or a version+updatedAt fallback for legacy records. */
  const partitionHash = (env: RecordEnvelope<ModeRecordItem>): string =>
    env.meta.hash ?? `v${env.meta.version ?? 0}-${env.meta.updatedAt}`;

  /** Creation-bucket partitions derive from the id; explicit ones must be named. */
  function locatePartition(id: string, partitionKey: string | undefined): string {
    if (explicit) {
      if (!partitionKey?.trim()) {
        throw new ValidationError(`Invalid ${entityName} request`, {
          partitionKey: 'partitionKey is required for this entity',
        });
      }
      return partitionKey.trim();
    }
    const day = extractPeriodFromId(id);
    if (!day) throw new NotFoundError(entityName, id);
    return truncateToGrain(
      day,
      descriptor.partitionLocate as Exclude<
        PartitionedModeRecordDescriptor['partitionLocate'],
        'explicit'
      >,
    );
  }

  function validatePartitionKeys(partitionKeys: string[]): string[] {
    if (!Array.isArray(partitionKeys) || partitionKeys.length === 0) {
      throw new ValidationError(`Invalid ${entityName} request`, {
        partitionKeys: 'partitionKeys must be a non-empty array',
      });
    }
    const keys = partitionKeys.map((k) => (typeof k === 'string' ? k.trim() : ''));
    if (keys.some((k) => !k)) {
      throw new ValidationError(`Invalid ${entityName} request`, {
        partitionKeys: 'partitionKeys must be non-empty strings',
      });
    }
    return keys;
  }

  return {
    descriptor,

    /** Load the given partitions whole (one batch storage read). */
    async query(scope: string, params: { partitionKeys: string[] }): Promise<ModeRecordItem[]> {
      const keys = validatePartitionKeys(params.partitionKeys);
      const results = await Promise.all(
        keys.map((pk) => loadItems<ModeRecordItem>(storage, serviceCode, key(scope, pk))),
      );
      return results.flat();
    },

    /**
     * Hash-synced read over an arbitrary partition-key set — partitions whose
     * stored hash matches the caller's send no payload. Generalises the
     * from/to-day `/query-sync` (the caller expands ranges itself).
     *
     * Reimplements the shared `queryPartitionsWithHashes` inline (rather than
     * calling it) so the mode-records key scheme stays isolated from the legacy
     * `buildPartitionKey` layout that helper is bound to.
     */
    async querySync(
      scope: string,
      params: { partitionKeys: string[]; partitionHashes?: Record<string, string> },
    ): Promise<PartitionSyncResult<ModeRecordItem>> {
      const keys = validatePartitionKeys(params.partitionKeys);
      const clientHashes = params.partitionHashes ?? {};
      const storageKeys = keys.map((pk) => key(scope, pk));
      const envelopes = await storage.getRecordsByKeys<RecordEnvelope<ModeRecordItem>>(
        serviceCode,
        storageKeys,
      );

      const updated: Record<string, ModeRecordItem[]> = {};
      const hashes: Record<string, string> = {};
      const emptyDates: string[] = [];

      keys.forEach((pk, i) => {
        const env = envelopes[i];
        const items = env?.items ?? [];
        if (!env || items.length === 0) {
          emptyDates.push(pk);
          return;
        }
        const hash = partitionHash(env);
        hashes[pk] = hash;
        if (clientHashes[pk] !== hash) {
          updated[pk] = items;
        }
      });

      return { updated, hashes, emptyDates };
    },

    async getById(
      scope: string,
      id: string,
      partitionKey?: string,
    ): Promise<{ item: ModeRecordItem; partitionKey: string } | null> {
      let part: string;
      try {
        part = locatePartition(id, partitionKey);
      } catch (err) {
        if (err instanceof NotFoundError) return null;
        throw err;
      }
      const { items } = await loadEnv(scope, part);
      const item = items.find((candidate) => candidate.id === id);
      return item ? { item, partitionKey: part } : null;
    },

    async create(
      scope: string,
      input: CreateModeRecordInput & { partitionKey?: string },
    ): Promise<{ item: ModeRecordItem; partitionKey: string; listHash?: string | undefined }> {
      validateItemInput(input.item);
      if (!explicit && input.partitionKey !== undefined) {
        throw new ValidationError(`Invalid ${entityName} request`, {
          partitionKey: 'partitionKey is derived from the id for this entity — do not send it',
        });
      }
      const id = generateId();
      const part = locatePartition(id, input.partitionKey);

      const envelope = await loadEnv(scope, part);
      checkListVersionTolerant(envelope, input.expectedListHash, entityName);

      const item = buildItem(id, input.item, Date.now());
      if (descriptor.uniqueField) {
        checkUniqueField(envelope.items, item, descriptor.uniqueField, entityName, {
          requireValue: true,
        });
      }
      envelope.items.push(item);
      const meta = await saveEnv(scope, part, envelope.items);
      return { item, partitionKey: part, listHash: meta.hash };
    },

    async update(
      scope: string,
      id: string,
      input: UpdateModeRecordInput & { partitionKey?: string; newPartitionKey?: string },
    ): Promise<{ item: ModeRecordItem; partitionKey: string; listHash?: string | undefined }> {
      validateItemInput(input.patch);
      if (!explicit && input.newPartitionKey !== undefined) {
        throw new ValidationError(`Invalid ${entityName} request`, {
          newPartitionKey: 'records of this entity never move between partitions',
        });
      }
      const sourcePart = locatePartition(id, input.partitionKey);
      const envelope = await loadEnv(scope, sourcePart);
      checkListVersionTolerant(envelope, input.expectedListHash, entityName);
      const { item, index } = findWithVersionCheck(envelope.items, id, input.version, entityName);

      const updated = applyPatch(item, input.patch, Date.now());
      const targetPart = input.newPartitionKey?.trim() || sourcePart;

      if (targetPart === sourcePart) {
        if (descriptor.uniqueField) {
          checkUniqueField(envelope.items, updated, descriptor.uniqueField, entityName, {
            requireValue: false,
          });
        }
        envelope.items[index] = updated;
        const meta = await saveEnv(scope, sourcePart, envelope.items);
        return { item: updated, partitionKey: sourcePart, listHash: meta.hash };
      }

      // Cross-partition move (explicit descriptors only): remove from source,
      // append to target. Two writes, non-atomic — same trade-off as
      // generic-records' cross-day move; acceptable at operational volumes.
      // The target's unique guard runs BEFORE the source write so a rejected
      // move leaves the record untouched instead of half-deleted.
      const targetEnvelope = await loadEnv(scope, targetPart);
      if (descriptor.uniqueField) {
        checkUniqueField(targetEnvelope.items, updated, descriptor.uniqueField, entityName, {
          requireValue: false,
        });
      }
      envelope.items.splice(index, 1);
      await saveEnv(scope, sourcePart, envelope.items);
      targetEnvelope.items.push(updated);
      const meta = await saveEnv(scope, targetPart, targetEnvelope.items);
      return { item: updated, partitionKey: targetPart, listHash: meta.hash };
    },

    async remove(
      scope: string,
      id: string,
      input: {
        version: string | undefined;
        partitionKey?: string;
        expectedListHash?: string;
      },
    ): Promise<{ partitionKey: string; listHash?: string | undefined }> {
      const part = locatePartition(id, input.partitionKey);
      const envelope = await loadEnv(scope, part);
      checkListVersionTolerant(envelope, input.expectedListHash, entityName);
      const { index } = findWithVersionCheck(envelope.items, id, input.version, entityName);
      envelope.items.splice(index, 1);
      const meta = await saveEnv(scope, part, envelope.items);
      // Echo the resolved partition — for creation-bucket entities the client
      // cannot derive it (no id-timestamp decoding FE-side) yet must know
      // which cache slice the delete invalidated.
      return { partitionKey: part, listHash: meta.hash };
    },
  };
}
