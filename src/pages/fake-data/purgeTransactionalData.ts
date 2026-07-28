import { cStorageConnector } from '@credo/connectors/connector';
import { configureSeedConnectors } from './_sharedSeed';
import type { FakeDataSecrets } from './fakeDataSecrets';

const TRANSACTIONAL_PREFIXES = ['goods-receipts', 'sales-orders', 'delivery-requests'] as const;

export type PurgeTransactionalDataOptions = {
  clientCode: string;
  secrets: FakeDataSecrets;
  onLog?: (line: string) => void;
};

export type PurgeTransactionalDataResult = {
  removed: number;
  byPrefix: Record<string, number>;
};

export async function purgeTransactionalData(
  opts: PurgeTransactionalDataOptions,
): Promise<PurgeTransactionalDataResult> {
  const { clientCode, secrets, onLog } = opts;
  const log = onLog ?? (() => {});

  configureSeedConnectors(secrets, clientCode);

  const byPrefix: Record<string, number> = {};
  let removed = 0;

  log(
    `Purging ${TRANSACTIONAL_PREFIXES.length} transactional prefix(es) for client "${clientCode}" (master data and inventory preserved)...`,
  );

  for (const prefix of TRANSACTIONAL_PREFIXES) {
    const scoped = `${prefix}.${clientCode}`;
    try {
      const res = await cStorageConnector.removeRecordsByPrefix({
        serviceCode: secrets.storageServiceCode,
        prefix: scoped,
      });
      const count = res?.deletedCount ?? 0;
      byPrefix[prefix] = count;
      removed += count;
      log(`  Removed ${count} record(s) at prefix "${scoped}"`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      byPrefix[prefix] = 0;
      log(`  Failed at "${scoped}": ${message}`);
    }
  }

  log(
    `Done — removed ${removed} record(s) across ${TRANSACTIONAL_PREFIXES.length} transactional prefix(es).`,
  );
  return { removed, byPrefix };
}
