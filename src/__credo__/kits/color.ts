import { hashString } from './crypt';

const mapColor = new Map<string, string>();

export function getDeterministicColor(str: string): string {
  if (!str) return 'gray';
  if (mapColor.has(str)) return mapColor.get(str)!;
  const color = `#${hashString(str).slice(0, 6)}`;
  mapColor.set(str, color);
  return color;
}
