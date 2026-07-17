

import { cStorageConnector } from '@credo/connectors/connector';
import { configureSeedConnectors } from './_sharedSeed';
import type { FakeDataSecrets } from './fakeDataSecrets';

const PURGE_PREFIXES = [
  'lookups',
  'products',
  'materials',
  'customers',
  'vendors',
  'goods-receipts',
  'sales-orders',
  'delivery-requests',
  'product-inventory',
  'material-inventory',
  'master-data',
  'master-data-version',
] as const;

const PURGE_SINGLE_MODE_ENTITIES = ['vendors', 'customers'] as const;

export type PurgeAllExceptEmployeesOptions = {
  clientCode: string;
  secrets: FakeDataSecrets;
  onLog?: (line: string) => void;
};

export type PurgeAllExceptEmployeesResult = {
  removed: number;
  byPrefix: Record<string, number>;
};

export async function purgeAllExceptEmployees(
  opts: PurgeAllExceptEmployeesOptions,
): Promise<PurgeAllExceptEmployeesResult> {
  const { clientCode, secrets, onLog } = opts;
  const log = onLog ?? (() => {});

  configureSeedConnectors(secrets, clientCode);

  const byPrefix: Record<string, number> = {};
  let removed = 0;

  const scopedKeys = [
    ...PURGE_PREFIXES.map((prefix) => ({ label: prefix, scoped: `${prefix}.${clientCode}` })),
    ...PURGE_SINGLE_MODE_ENTITIES.map((entity) => ({
      label: `single:${entity}`,
      scoped: `${clientCode}:single:${entity}`,
    })),
  ];

  log(
    `Purging ${scopedKeys.length} prefix(es) for client "${clientCode}" (employees preserved)...`,
  );

  for (const { label, scoped } of scopedKeys) {
    try {
      const res = await cStorageConnector.removeRecordsByPrefix({
        serviceCode: secrets.storageServiceCode,
        prefix: scoped,
      });
      const count = res?.deletedCount ?? 0;
      byPrefix[label] = count;
      removed += count;
      log(`  Removed ${count} record(s) at prefix "${scoped}"`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      byPrefix[label] = 0;
      log(`  Failed at "${scoped}": ${message}`);
    }
  }

  log(`Done — removed ${removed} record(s) across ${scopedKeys.length} prefix(es).`);
  return { removed, byPrefix };
}
