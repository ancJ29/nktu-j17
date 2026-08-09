import { resolveClientCode } from '@/config/client-code';

export function generateInternalBarcode(options?: { clientCode?: string }): string {
  const clientCode = (options?.clientCode ?? resolveClientCode() ?? 'X')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  const random = Math.floor(Math.random() * 1_000_000)
    .toString()
    .padStart(6, '0');
  const time = Date.now().toString(36).toUpperCase();
  return `${clientCode}-${random}-${time}`;
}
