export interface StorageAdapter {
  getRecord<T = unknown>(serviceCode: string, key: string): Promise<T | null>;

  getRecordsByKeys<T = unknown>(serviceCode: string, keys: string[]): Promise<(T | null)[]>;

  pushRecord<T = unknown>(serviceCode: string, key: string, data: T): Promise<void>;

  removeRecord(serviceCode: string, key: string): Promise<void>;
}

export type StorageMode = 'single' | 'partitioned';

export interface BaseModuleConfig {
  storage: StorageAdapter;
  serviceCode: string;
  keyPrefix: string;
  mode: StorageMode;
}

export interface RecordMeta {
  updatedAt: number;
  version?: number;
  hash?: string;
}

export interface RecordEnvelope<T> {
  items: T[];
  meta: RecordMeta;
}
