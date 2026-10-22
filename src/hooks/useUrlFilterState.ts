

import type { SetURLSearchParams } from 'react-router';

export const URL_KEY = 'f';

export function urlUpdate(
  setSearchParams: SetURLSearchParams,
  mutate: (target: URLSearchParams) => void,
): void {
  setSearchParams(
    (prev) => {
      const next = new URLSearchParams(prev);
      mutate(next);
      return next;
    },
    { replace: true },
  );
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(blob: string): Uint8Array {
  const padded = blob.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((blob.length + 3) % 4);
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export function encodeFilterBlob<T>(state: T): string {
  const json = JSON.stringify(state);
  return bytesToBase64Url(new TextEncoder().encode(json));
}

export function decodeFilterBlob<T>(blob: string | null): T | null {
  if (!blob) return null;
  try {
    const json = new TextDecoder().decode(base64UrlToBytes(blob));
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}
