import { randomString } from '@credo/kits/string';

export function generateProductSku(): string {
  return `SKU-${randomString(6, false).toUpperCase()}`;
}
