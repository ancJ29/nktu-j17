/**
 * Shared bits for browser-side fake-data seeders.
 *
 * Every entity seeder follows the same shape: configure the three
 * connectors from sessionStorage secrets, generate records, one-shot
 * `pushRecord` to c-storage, then wipe the BFF's master-data cache so it
 * rebuilds on the next read.
 */

import { cMngtConnector, cSsoConnector, cStorageConnector } from '@credo/connectors/connector';
import type { FakeDataSecrets } from './fakeDataSecrets';

/**
 * Wire all three connectors with the sessionStorage secrets.
 * `configureForAdmin` is the kit's explicit escape hatch — the plain
 * `setInternalAccessKey` is a no-op in the browser by design.
 */
export function configureSeedConnectors(secrets: FakeDataSecrets, clientCode: string): void {
  cMngtConnector.setTrustedServiceKey(secrets.trustedServiceKey);
  cMngtConnector.setClientCode(clientCode);
  cMngtConnector.setAccessKey(secrets.cMngtAdminAccessKey);
  cStorageConnector.setTrustedServiceKey(secrets.trustedServiceKey);
  cStorageConnector.configureForAdmin({
    superAdminAccessKey: '',
    internalAccessKey: secrets.storageInternalAccessKey,
    accessKey: secrets.storageAccessKey,
  });
  cSsoConnector.setTrustedServiceKey(secrets.trustedServiceKey);
}

/**
 * Write a full item list as a single envelope to a generic single-mode
 * bucket (`{clientCode}:single:{entity}`) — the scope-first namespace the
 * generic-records BFF reads (vendors since the 2026-07-14 port). No
 * master-data invalidation: generic entities are outside the aggregate and
 * hash-revalidate off their own envelope meta.
 */
export async function writeSingleModeEnvelope<T>(args: {
  clientCode: string;
  storageServiceCode: string;
  entity: string;
  items: T[];
  log: (line: string) => void;
}): Promise<void> {
  const { clientCode, storageServiceCode, entity, items, log } = args;
  const key = `${clientCode}:single:${entity}`;
  const envelope = {
    items,
    meta: {
      updatedAt: new Date().toISOString(),
      version: 1,
      hash: Date.now().toString(36),
    },
  };
  log(`Writing ${key} (${items.length} record(s))...`);
  await cStorageConnector.pushRecord({
    serviceCode: storageServiceCode,
    key,
    data: envelope,
    isPrivate: undefined,
    description: undefined,
  });
}

/**
 * Write a full entity list as a single envelope to `{entityKey}.{clientCode}`.
 * Matches the shape produced by `writeEntityRecord` in
 * `scripts/fake-data/_shared.ts`, and by `saveItems` in the BFF record
 * helpers. After the write, the BFF's master-data caches are invalidated.
 */
export async function writeEntityEnvelope<T>(args: {
  clientCode: string;
  storageServiceCode: string;
  entityKey: 'employees' | 'products' | 'customers' | 'lookups';
  items: T[];
  log: (line: string) => void;
}): Promise<void> {
  const { clientCode, storageServiceCode, entityKey, items, log } = args;
  const key = `${entityKey}.${clientCode}`;
  const envelope = {
    items,
    meta: {
      updatedAt: new Date().toISOString(),
      version: 1,
      hash: Date.now().toString(36),
    },
  };
  log(`Writing ${key} (${items.length} record(s))...`);
  await cStorageConnector.pushRecord({
    serviceCode: storageServiceCode,
    key,
    data: envelope,
    isPrivate: undefined,
    description: undefined,
  });

  for (const sub of ['master-data', 'master-data-version'] as const) {
    const fullKey = `${sub}.${clientCode}`;
    try {
      await cStorageConnector.removeRecord({ serviceCode: storageServiceCode, key: fullKey });
      log(`  Invalidated: ${fullKey}`);
    } catch {
      log(`  Skipped (not found): ${fullKey}`);
    }
  }
}

/**
 * Persistent (localStorage) getter/setter factory for the manual-JSON blob
 * per client. Same pattern across entities; keyed by `<prefix>.<clientCode>`.
 */
export function createManualJsonStorage(prefix: string) {
  return {
    get(clientCode: string): string {
      if (!clientCode) return '';
      try {
        return localStorage.getItem(`${prefix}.${clientCode}`) ?? '';
      } catch {
        return '';
      }
    },
    set(clientCode: string, value: string): void {
      if (!clientCode) return;
      const key = `${prefix}.${clientCode}`;
      try {
        if (value.trim()) localStorage.setItem(key, value);
        else localStorage.removeItem(key);
      } catch {
        // Out of quota etc. — silent; in-memory input still works.
      }
    },
  };
}

export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

export function pickN<T>(arr: T[], min: number, max: number): T[] {
  const n = min + Math.floor(Math.random() * (max - min + 1));
  return [...arr].sort(() => Math.random() - 0.5).slice(0, n);
}

export function pad(n: number, len: number): string {
  return String(n).padStart(len, '0');
}

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
