import { encode as msgpackEncode, decode as msgpackDecode } from '@msgpack/msgpack';
import { hashString } from '@credo/kits/crypt';
import { logger } from './logger';

const SEED = 'k9$mP2xR7vLw#nQ4';

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

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export type AppCacheConfig = {
  storageKey: string;

  timestampKey: string;

  flushDelay?: number;
};

export type AppCache<T extends Record<string, unknown>> = {
  init: () => void;

  get: <K extends keyof T>(key: K) => T[K];

  set: <K extends keyof T>(key: K, value: T[K]) => void;

  clear: <K extends keyof T>(key: K) => void;

  reset: () => void;

  flush: () => void;
};

export function createAppCache<T extends Record<string, unknown>>(
  config: AppCacheConfig,
): AppCache<T> {
  const { storageKey: SK, timestampKey: TK, flushDelay = 500 } = config;

  let memoryCache: Partial<T> = {};
  let initialized = false;
  let flushTimer: ReturnType<typeof setTimeout> | null = null;

  function encodeBlob(data: Partial<T>): string {
    const now = Date.now();
    const packed = msgpackEncode(data);
    const scrambled = xorBytes(new Uint8Array(packed), deriveKey(now));
    logger.debug('[APP-CACHE] setTimestamp', TK);
    localStorage.setItem(TK, now.toString(36));
    return toBase64(scrambled);
  }

  function decodeBlob(b64: string): Partial<T> | null {
    const tsRaw = localStorage.getItem(TK);
    if (!tsRaw) return null;
    const timestamp = parseInt(tsRaw, 36);
    if (isNaN(timestamp)) return null;

    const scrambled = fromBase64(b64);
    const packed = xorBytes(scrambled, deriveKey(timestamp));
    return msgpackDecode(packed) as Partial<T>;
  }

  function flushNow(): void {
    try {
      const encoded = encodeBlob(memoryCache);
      logger.debug('[APP-CACHE] renew cache', memoryCache['auth'] ?? {});
      localStorage.setItem(SK, encoded);
    } catch (error) {
      logger.error('[APP-CACHE] flush cache failed', error);
    }
  }

  function flush(): void {
    if (flushDelay <= 0) {
      flushNow();
      return;
    }
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = setTimeout(flushNow, flushDelay);
  }

  function ensureInit(): void {
    if (!initialized) init();
  }

  function init(): void {
    if (initialized) return;
    initialized = true;

    try {
      const raw = localStorage.getItem(SK);
      if (raw) {
        const decoded = decodeBlob(raw);
        if (decoded) {
          memoryCache = decoded;
          logger.debug('[APP-CACHE] init cache', memoryCache['auth'] ?? {});
          return;
        }
      }
    } catch (error) {
      logger.error('[APP-CACHE] init cache failed', error);
      // Decode failed (stale key, corrupted data) — start fresh
    }

    memoryCache = {};
    localStorage.removeItem(SK);
    localStorage.removeItem(TK);
  }

  function get<K extends keyof T>(key: K): T[K] {
    ensureInit();
    return memoryCache[key] as T[K];
  }

  function set<K extends keyof T>(key: K, value: T[K]): void {
    ensureInit();
    memoryCache[key] = value;
    flush();
  }

  function clear<K extends keyof T>(key: K): void {
    ensureInit();
    delete memoryCache[key];
    flush();
  }

  function reset(): void {
    if (flushTimer) clearTimeout(flushTimer);
    memoryCache = {};
    initialized = true;
    localStorage.removeItem(SK);
    localStorage.removeItem(TK);
  }

  function flushSync(): void {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    flushNow();
  }

  return { init, get, set, clear, reset, flush: flushSync };
}
