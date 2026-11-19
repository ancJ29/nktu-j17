import type { ProductExtra, ProductVendorCode } from '@/types';

export function vendorCodesOf(extra: ProductExtra | undefined): ProductVendorCode[] {
  return extra?.vendorCodes ?? [];
}

export type VendorCodesIssue = 'vendorMissing' | 'codeMissing' | 'duplicate';

export type CleanVendorCodes =
  { ok: true; entries: ProductVendorCode[] } | { ok: false; issue: VendorCodesIssue; row: number };

const dupKey = (e: ProductVendorCode) => `${e.vendorCode}\u0000${e.code.trim().toLowerCase()}`;

export function cleanVendorCodes(draft: readonly ProductVendorCode[]): CleanVendorCodes {
  const entries: ProductVendorCode[] = [];
  const seen = new Set<string>();
  for (const [row, d] of draft.entries()) {
    const vendorCode = d.vendorCode.trim();
    const code = d.code.trim();
    const name = d.name?.trim() ?? '';
    if (!vendorCode && !code && !name) continue;
    if (!vendorCode) return { ok: false, issue: 'vendorMissing', row };
    if (!code) return { ok: false, issue: 'codeMissing', row };
    const entry: ProductVendorCode = {
      vendorCode,
      vendorName: d.vendorName.trim(),
      code,
      ...(name && { name }),
    };
    const key = dupKey(entry);
    if (seen.has(key)) return { ok: false, issue: 'duplicate', row };
    seen.add(key);
    entries.push(entry);
  }
  return { ok: true, entries };
}

export function showsVendorCodes(
  extra: ProductExtra | undefined,
  purchaseOrdersEnabled: boolean,
): boolean {
  return purchaseOrdersEnabled || vendorCodesOf(extra).length > 0;
}

export function vendorCodeSearchTerms(extra: ProductExtra | undefined): string[] {
  const terms: string[] = [];
  for (const e of vendorCodesOf(extra)) {
    if (e.code.trim()) terms.push(e.code);
    if (e.name?.trim()) terms.push(e.name);
  }
  return terms;
}
