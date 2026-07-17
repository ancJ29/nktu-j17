// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
// cspell:ignore rotr

// SHA-256 round constants: first 32 bits of fractional parts of cube roots of first 64 primes
const K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
] as const;

// Initial hash values: first 32 bits of fractional parts of square roots of first 8 primes
const INIT = [
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
] as const;

function rotr(n: number, x: number): number {
  return ((x >>> n) | (x << (32 - n))) >>> 0;
}

// SHA-256 hash function that works both in browser and node
export function hashString(data: string): string {
  const msg = new TextEncoder().encode(data);
  const bitLen = msg.length * 8;

  // Pad: msg + 0x80 + zeros + 8-byte big-endian bit length, total must be multiple of 64
  let paddedLen = msg.length + 1 + 8;
  paddedLen += (64 - (paddedLen % 64)) % 64;

  const buf = new ArrayBuffer(paddedLen);
  const padded = new Uint8Array(buf);
  const view = new DataView(buf);

  padded.set(msg);
  padded[msg.length] = 0x80;
  view.setUint32(paddedLen - 4, bitLen);

  const h = [...INIT];
  const w = new Array<number>(64);

  for (let off = 0; off < paddedLen; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(off + i * 4);
    for (let i = 16; i < 64; i++) {
      // @ts-expect-error - w is an array of numbers
      const s0 = rotr(7, w[i - 15]) ^ rotr(18, w[i - 15]) ^ (w[i - 15] >>> 3);
      // @ts-expect-error - w is an array of numbers
      const s1 = rotr(17, w[i - 2]) ^ rotr(19, w[i - 2]) ^ (w[i - 2] >>> 10);
      // @ts-expect-error - w is an array of numbers
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let [a, b, c, d, e, f, g, hv] = h;

    for (let i = 0; i < 64; i++) {
      // @ts-expect-error - e is an array of numbers
      const S1 = rotr(6, e) ^ rotr(11, e) ^ rotr(25, e);
      // @ts-expect-error - f is an array of numbers
      const ch = ((e & f) ^ (~e & g)) >>> 0;
      // @ts-expect-error - hv is an array of numbers
      const temp1 = (hv + S1 + ch + K[i] + w[i]) >>> 0;
      // @ts-expect-error - a is an array of numbers
      const S0 = rotr(2, a) ^ rotr(13, a) ^ rotr(22, a);
      // @ts-expect-error - a is an array of numbers
      const maj = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
      const temp2 = (S0 + maj) >>> 0;

      hv = g;
      g = f;
      f = e;
      // @ts-expect-error - e is an array of numbers
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h[0] = (h[0] + a) >>> 0;
    h[1] = (h[1] + b) >>> 0;
    h[2] = (h[2] + c) >>> 0;
    h[3] = (h[3] + d) >>> 0;
    h[4] = (h[4] + e) >>> 0;
    h[5] = (h[5] + f) >>> 0;
    h[6] = (h[6] + g) >>> 0;
    h[7] = (h[7] + hv) >>> 0;
  }

  return h.map((v) => v.toString(16).padStart(8, '0')).join('');
}

/**
 * Compares a raw string with a hash string
 * @param raw - The raw string
 * @param hash - The hash string
 * @returns True if the raw string starts with the hash string, false otherwise
 */
export function isHashEqual(raw: string, hash: string) {
  return hashString(raw).startsWith(hash);
}

// --- Byte scramble (XOR cipher with time-rotating SHA-256 key) ---
// Used by body encoding middleware to make msgpack output unreadable by standard decoders.
// Key rotates every hour: SHA-256(seed + hourSlot). Both client and server derive
// the same key because they use the same hour-based slot.
// XOR is its own inverse, so the same function scrambles and unscrambles.

const SCRAMBLE_SEED = 'k9$mP2xR7vLw#nQ4';

function deriveScrambleKey(seed) {
  const hourSlot = Math.floor(Date.now() / 3_600_000);
  const hex = hashString(`${seed}${hourSlot}`);
  const key = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    key[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return key;
}

export function scrambleBytes(data) {
  const key = deriveScrambleKey(SCRAMBLE_SEED);
  const result = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    result[i] = data[i] ^ key[i % key.length];
  }
  return result;
}

// AES-256-CBC (AES-CBC with 32-byte key, 16-byte IV)
// Works in browser (globalThis.crypto.subtle) and Node (crypto.webcrypto.subtle)

type Subtle = SubtleCrypto;

function getSubtle(): Subtle {
  // Browser / environments with global WebCrypto
  if (globalThis.crypto?.subtle) return globalThis.crypto.subtle;

  // Node.js fallback
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { webcrypto } = require('crypto') as typeof import('crypto');
    return webcrypto.subtle;
  } catch {
    throw new Error(
      'WebCrypto SubtleCrypto not available. Use Node 16+ (prefer 18+) or a modern browser.',
    );
  }
}

function hexToU8(hex: string): Uint8Array {
  if (typeof hex !== 'string' || hex.length % 2 !== 0) {
    throw new Error('Invalid hex string');
  }
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function u8ToHex(u8: Uint8Array): string {
  let s = '';
  for (const b of u8) s += b.toString(16).padStart(2, '0');
  return s;
}

function utf8ToU8(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

function u8ToUtf8(u8: Uint8Array): string {
  return new TextDecoder().decode(u8);
}

async function importAesKeyFromHex(hexKey: string): Promise<CryptoKey> {
  const keyBytes = hexToU8(hexKey);
  if (keyBytes.length !== 32) {
    throw new Error(
      `AES-256 key must be 32 bytes (got ${keyBytes.length}). Expected 64 hex chars.`,
    );
  }
  const subtle = getSubtle();
  return subtle.importKey('raw', keyBytes, { name: 'AES-CBC' }, false, ['encrypt', 'decrypt']);
}

/**
 * Encrypts a string using AES-256-CBC
 * @param raw - The string to encrypt
 * @param hexKey - The 32-byte hex key
 * @param hexIv - The 16-byte hex IV
 * @returns The encrypted string
 */
export async function encryptString(raw: string, hexKey: string, hexIv: string): Promise<string> {
  const iv = hexToU8(hexIv);
  if (iv.length !== 16) {
    throw new Error(`IV must be 16 bytes (got ${iv.length}). Expected 32 hex chars.`);
  }

  const key = await importAesKeyFromHex(hexKey);
  const subtle = getSubtle();

  const plaintext = utf8ToU8(raw);
  const encryptedBuf = await subtle.encrypt({ name: 'AES-CBC', iv }, key, plaintext);

  return u8ToHex(new Uint8Array(encryptedBuf));
}

/**
 * Decrypts a string using AES-256-CBC
 * @param encryptedHex - The encrypted string
 * @param hexKey - The 32-byte hex key
 * @param hexIv - The 16-byte hex IV
 * @returns The decrypted string
 */
export async function decryptString(
  encryptedHex: string,
  hexKey: string,
  hexIv: string,
): Promise<string> {
  const iv = hexToU8(hexIv);
  if (iv.length !== 16) {
    throw new Error(`IV must be 16 bytes (got ${iv.length}). Expected 32 hex chars.`);
  }

  const key = await importAesKeyFromHex(hexKey);
  const subtle = getSubtle();

  const ciphertext = hexToU8(encryptedHex);
  const decryptedBuf = await subtle.decrypt({ name: 'AES-CBC', iv }, key, ciphertext);

  return u8ToUtf8(new Uint8Array(decryptedBuf));
}

export function generateToken(input: {
  limit?: number;
  key: string;
  tokenSecret: string;
  mark: string;
  expire: number;
}) {
  if (input.mark.length < 1) {
    return '';
  }

  let counter = 0;
  const limit = input.limit || 1000;
  do {
    const token = Math.random().toString(36).substring(2, 15);
    const hash = hashString([token, input.key, input.expire, input.tokenSecret].join('-'));
    if (hash.endsWith(input.mark)) {
      return `${token}-${input.expire.toString(36)}`;
    }
    counter++;
  } while (counter < limit);

  return '';
}

// ==========================================
// Trusted Credo Internal Key
// ==========================================
import { isBrowser } from './misc';

export function isTrustedCredoInternalKey(key: string) {
  if (isBrowser()) return false;
  const chain = process.env.CREDO_SUPER_SECRET_CHAIN;
  const marks = process.env.CREDO_SUPER_SECRET_DIGITS;
  if (!chain || !marks) return false;
  const hashed = hashString(`${key}:${chain}`);
  return hashed.includes(marks);
}

export function generateTrustedCredoInternalKey() {
  if (isBrowser()) return '';
  const chain = process.env.CREDO_SUPER_SECRET_CHAIN;
  const marks = process.env.CREDO_SUPER_SECRET_DIGITS;
  if (!chain || !marks) return '';

  let counter = 0;
  do {
    const key = rnd(8) + rnd(8) + rnd(8) + rnd(8);
    const hashed = hashString(`${key}:${chain}`);
    if (hashed.includes(marks)) {
      return key;
    }
    counter++;
  } while (counter < 300000);

  return '';

  function rnd(length: number) {
    return Math.random()
      .toString(36)
      .substring(3, 3 + length);
  }
}
