import type { StorageAdapter } from './types.js';

interface CStorageConnectorLike {
  getRecordByKey<T>(req: {
    serviceCode: string;
    key: string;
  }): Promise<{ record: { data: T } } | null>;

  getRecordsByKeys<T>(req: {
    serviceCode: string;
    keys: string[];
  }): Promise<{ records: Array<{ key: string; data: T }> }>;

  pushRecord(req: {
    serviceCode: string;
    key: string;
    data: unknown;
    isPrivate: boolean | undefined;
    description?: string | undefined;
  }): Promise<{ id: string }>;

  removeRecord(req: { serviceCode: string; key: string }): Promise<void>;
}

export function createStorageAdapter(connector: CStorageConnectorLike): StorageAdapter {
  return {
    async getRecord<T>(serviceCode: string, key: string): Promise<T | null> {
      const result = await connector.getRecordByKey<T>({ serviceCode, key });
      return result?.record?.data ?? null;
    },

    async getRecordsByKeys<T>(serviceCode: string, keys: string[]): Promise<(T | null)[]> {
      const result = await connector.getRecordsByKeys<T>({ serviceCode, keys });
      const dataByKey = new Map(result.records.map((r) => [r.key, r.data]));
      return keys.map((key) => dataByKey.get(key) ?? null);
    },

    async pushRecord<T>(serviceCode: string, key: string, data: T): Promise<void> {
      await connector.pushRecord({
        serviceCode,
        key,
        data,
        isPrivate: true,
      });
    },

    async removeRecord(serviceCode: string, key: string): Promise<void> {
      await connector.removeRecord({ serviceCode, key });
    },
  };
}
