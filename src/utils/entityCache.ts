

import { notifications } from '@mantine/notifications';
import { logger } from '@credo/base-ui/utils';
import { encode as msgpackEncode, decode as msgpackDecode } from '@msgpack/msgpack';
import { hashString } from '@credo/kits/crypt';

const DB_NAME = 'c-mngt-entities';
const DB_VERSION = 1;
const STORE = 'entities';
const SEED = 'j7#qB2nW8tKp!hR5';

type EncodedEntry = { ts: number; data: Uint8Array };

function deriveKey(timestamp: number): Uint8Array {
  const hourSlot = Math.floor(timestamp / 3_600_000);
  const hex = hashString(`${SEED}${hourSlot}`);
  const key = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    key[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return key;
}

function xorBytes(data: Uint8Array, key: Uint8Array): Uint8Array {
  const result = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    result[i] = data[i] ^ key[i % key.length];
  }
  return result;
}

function encodeValue<T>(value: T): EncodedEntry {
  const ts = Date.now();
  const packed = msgpackEncode(value);
  const data = xorBytes(new Uint8Array(packed), deriveKey(ts));
  return { ts, data };
}

function decodeValue<T>(entry: EncodedEntry): T | undefined {
  try {
    const unscrambled = xorBytes(entry.data, deriveKey(entry.ts));
    return msgpackDecode(unscrambled) as T;
  } catch (err) {
    logger.error('[ENTITY-CACHE] decode failed', err);
    return undefined;
  }
}

let dbPromise: Promise<IDBDatabase | null> | null = null;
let warnedUser = false;

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  if (typeof indexedDB === 'undefined') {
    dbPromise = Promise.resolve(null);
    return dbPromise;
  }
  dbPromise = new Promise((resolve) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      logger.error('[ENTITY-CACHE] open failed', req.error);
      resolve(null);
    };
    req.onblocked = () => {
      logger.warn('[ENTITY-CACHE] open blocked');
      resolve(null);
    };
  });
  return dbPromise;
}

function notifyUser(action: 'read' | 'write', error: unknown): void {
  if (warnedUser) return;
  warnedUser = true;
  notifications.show({
    id: 'entity-cache-error',
    title: 'Offline cache unavailable',
    message:
      action === 'write'
        ? 'Failed to save data for faster reloads. App still works, but next load will refetch.'
        : 'Failed to read cached data. App still works, but will refetch from server.',
    color: 'yellow',
    autoClose: 8000,
  });
  logger.error(`[ENTITY-CACHE] ${action} failed`, error);
}

function runTx<T>(
  mode: IDBTransactionMode,
  op: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T | null> {
  return openDb().then(
    (db) =>
      new Promise((resolve) => {
        if (!db) return resolve(null);
        try {
          const tx = db.transaction(STORE, mode);
          const req = op(tx.objectStore(STORE));
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => {
            const err = req.error;
            resolve(null);
            notifyUser(mode === 'readonly' ? 'read' : 'write', err);
          };
        } catch (err) {
          resolve(null);
          notifyUser(mode === 'readonly' ? 'read' : 'write', err);
        }
      }),
  );
}

export function entityCacheGet<T = unknown>(key: string): Promise<T | undefined> {
  return runTx<EncodedEntry>('readonly', (s) => s.get(key)).then((entry) => {
    if (!entry || !(entry.data instanceof Uint8Array)) return undefined;
    return decodeValue<T>(entry);
  });
}

export function entityCacheSet<T>(key: string, value: T): Promise<void> {
  const encoded = encodeValue(value);
  return runTx('readwrite', (s) => s.put(encoded, key)).then(() => undefined);
}

export function entityCacheClear(key: string): Promise<void> {
  return runTx('readwrite', (s) => s.delete(key)).then(() => undefined);
}

export function entityCacheClearAll(): Promise<void> {
  return runTx('readwrite', (s) => s.clear()).then(() => undefined);
}
