import { resolveClientCode } from './client-code';

export const clientCode = resolveClientCode();

export const isNKTU = clientCode === 'nktu';

export function byClient<T>(overrides: Partial<Record<string, T>>, fallback: T): T {
  return overrides[clientCode] ?? fallback;
}
