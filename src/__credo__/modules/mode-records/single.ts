import type { StorageAdapter, RecordMeta } from '../core/types.js';
import {
  loadEnvelope,
  saveItemsWithMeta,
  findWithVersionCheck,
  checkListVersionTolerant,
} from '../core/record-helpers.js';
import { generateId } from '@credo/kits/string';
import { ValidationError } from '../core/errors.js';
import {
  validateItemInput,
  buildItem,
  applyPatch,
  checkUniqueField,
  naturalKeyOf,
} from './logic.js';
import type {
  ModeRecordItem,
  SingleModeRecordDescriptor,
  CreateModeRecordInput,
  UpdateModeRecordInput,
} from './types.js';

export interface SingleModeRecordsModuleConfig {
  storage: StorageAdapter;
  serviceCode: string;
  descriptor: SingleModeRecordDescriptor;
}

export function createSingleModeRecordsModule(config: SingleModeRecordsModuleConfig) {
  const { storage, serviceCode, descriptor } = config;
  const entityName = descriptor.entity;

  const key = (scope: string): string => `${scope}:single:${entityName}`;

  const load = (scope: string) => loadEnvelope<ModeRecordItem>(storage, serviceCode, key(scope));
  const save = (scope: string, items: ModeRecordItem[]): Promise<RecordMeta> =>
    saveItemsWithMeta(storage, serviceCode, key(scope), items);

  return {
    descriptor,

    async getAll(scope: string): Promise<ModeRecordItem[]> {
      return (await load(scope)).items;
    },

    async getAllIfChanged(
      scope: string,
      clientHash?: string,
    ): Promise<{ changed: boolean; items: ModeRecordItem[]; hash?: string | undefined }> {
      const envelope = await load(scope);
      const currentHash = envelope.meta.hash;
      if (clientHash && currentHash && clientHash === currentHash) {
        return { changed: false, items: [], hash: currentHash };
      }
      return { changed: true, items: envelope.items, hash: currentHash };
    },

    async getById(scope: string, id: string): Promise<ModeRecordItem | null> {
      const { items } = await load(scope);
      return items.find((item) => item.id === id) ?? null;
    },

    async create(
      scope: string,
      input: CreateModeRecordInput,
    ): Promise<{ item: ModeRecordItem; listHash?: string | undefined }> {
      validateItemInput(input.item);
      const envelope = await load(scope);
      checkListVersionTolerant(envelope, input.expectedListHash, entityName);

      const item = buildItem(generateId(), input.item, Date.now());
      if (descriptor.uniqueField) {
        checkUniqueField(envelope.items, item, descriptor.uniqueField, entityName, {
          requireValue: true,
        });
      }
      envelope.items.push(item);
      const meta = await save(scope, envelope.items);
      return { item, listHash: meta.hash };
    },

    async createMany(
      scope: string,
      items: Array<Record<string, unknown>>,
    ): Promise<{
      created: ModeRecordItem[];
      updated: ModeRecordItem[];
      errors: Array<{ index: number; message: string }>;
      listHash?: string | undefined;
    }> {
      if (!descriptor.uniqueField) {
        throw new ValidationError(`Invalid ${entityName} import`, {
          uniqueField: `${entityName} has no uniqueField — bulk upsert needs a natural key`,
        });
      }
      const spec = descriptor.uniqueField;
      const envelope = await load(scope);
      const created: ModeRecordItem[] = [];
      const updated: ModeRecordItem[] = [];
      const errors: Array<{ index: number; message: string }> = [];
      const now = Date.now();

      for (let i = 0; i < items.length; i++) {
        const raw = items[i]!;
        try {
          validateItemInput(raw);
          const natural = naturalKeyOf(raw, spec);
          if (natural.key === null) {
            throw new ValidationError(`Invalid ${entityName} input`, {
              [natural.missing]: `${natural.missing} is required`,
            });
          }
          const existingIdx = envelope.items.findIndex(
            (e) => naturalKeyOf(e, spec).key === natural.key,
          );
          if (existingIdx >= 0) {
            const next = applyPatch(envelope.items[existingIdx]!, raw, now);
            envelope.items[existingIdx] = next;
            updated.push(next);
          } else {
            const item = buildItem(generateId(), raw, now);
            envelope.items.push(item);
            created.push(item);
          }
        } catch (err) {
          errors.push({ index: i, message: err instanceof Error ? err.message : 'Unknown error' });
        }
      }

      if (created.length > 0 || updated.length > 0) {
        const meta = await save(scope, envelope.items);
        return { created, updated, errors, listHash: meta.hash };
      }
      return { created, updated, errors, listHash: envelope.meta.hash };
    },

    async update(
      scope: string,
      id: string,
      input: UpdateModeRecordInput,
    ): Promise<{ item: ModeRecordItem; listHash?: string | undefined }> {
      validateItemInput(input.patch);
      const envelope = await load(scope);
      checkListVersionTolerant(envelope, input.expectedListHash, entityName);
      const { item, index } = findWithVersionCheck(envelope.items, id, input.version, entityName);

      const updated = applyPatch(item, input.patch, Date.now());
      if (descriptor.uniqueField) {
        checkUniqueField(envelope.items, updated, descriptor.uniqueField, entityName, {
          requireValue: false,
        });
      }
      envelope.items[index] = updated;
      const meta = await save(scope, envelope.items);
      return { item: updated, listHash: meta.hash };
    },

    async remove(
      scope: string,
      id: string,
      expectedVersion: string | undefined,
      expectedListHash: string | undefined,
    ): Promise<{ listHash?: string | undefined }> {
      const envelope = await load(scope);
      checkListVersionTolerant(envelope, expectedListHash, entityName);
      const { index } = findWithVersionCheck(envelope.items, id, expectedVersion, entityName);
      envelope.items.splice(index, 1);
      const meta = await save(scope, envelope.items);
      return { listHash: meta.hash };
    },
  };
}
