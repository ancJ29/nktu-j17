import { logger } from '@credo/base-ui/utils';

export type IdbStore<T> = {
  get(id: string): Promise<T | null>;

  put(value: T): Promise<boolean>;
  getAll(): Promise<T[]>;
  remove(id: string): Promise<void>;
};

export function createIdbStore<T extends { id: string }>({
  dbName,
  storeName,
  label,
}: {
  dbName: string;
  storeName: string;

  label: string;
}): IdbStore<T> {
  let dbPromise: Promise<IDBDatabase | null> | null = null;

  const openDb = (): Promise<IDBDatabase | null> => {
    if (dbPromise) return dbPromise;
    if (typeof indexedDB === 'undefined') {
      dbPromise = Promise.resolve(null);
      return dbPromise;
    }
    dbPromise = new Promise((resolve) => {
      const req = indexedDB.open(dbName, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => {
        logger.error(`[${label}] open failed`, req.error);
        resolve(null);
      };
      req.onblocked = () => {
        logger.warn(`[${label}] open blocked`);
        resolve(null);
      };
    });
    return dbPromise;
  };

  const runTx = async <R>(
    mode: IDBTransactionMode,
    run: (store: IDBObjectStore) => IDBRequest<R>,
  ): Promise<R | null> => {
    const db = await openDb();
    if (!db) return null;
    return new Promise<R | null>((resolve) => {
      try {
        const tx = db.transaction(storeName, mode);
        const req = run(tx.objectStore(storeName));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => {
          logger.error(`[${label}] tx failed`, req.error);
          resolve(null);
        };
      } catch (err) {
        logger.error(`[${label}] tx threw`, err);
        resolve(null);
      }
    });
  };

  return {
    async get(id) {
      return (await runTx<T | undefined>('readonly', (store) => store.get(id))) ?? null;
    },
    async put(value) {
      return (await runTx('readwrite', (store) => store.put(value))) != null;
    },
    async getAll() {
      return (await runTx<T[]>('readonly', (store) => store.getAll())) ?? [];
    },
    async remove(id) {
      await runTx('readwrite', (store) => store.delete(id));
    },
  };
}
