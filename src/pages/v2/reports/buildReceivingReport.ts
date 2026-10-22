import type { GoodsReceiptStage } from '@credo/connectors/status-flow';
import type { GoodsReceiptV2 } from '@/types/goods-receipt-v2';
import { anchorDayOf } from '../anchorDay';

export interface ReceivingVendorRow {
  key: string;

  label: string;
  receipts: number;

  lines: number;
}

export interface ReceivingReport {
  totals: { receipts: number; lines: number };

  byVendor: ReceivingVendorRow[];
  unknownStatusReceipts: number;
}

export function buildReceivingReport(
  rows: ReadonlyArray<GoodsReceiptV2>,
  input: {
    fromDay: string;
    toDay: string;

    resolveStage: (status: string) => GoodsReceiptStage | undefined;
  },
): ReceivingReport {
  const byKey = new Map<string, ReceivingVendorRow>();
  const totals = { receipts: 0, lines: 0 };
  let unknownStatusReceipts = 0;

  for (const receipt of rows) {
    const day = anchorDayOf(receipt.receivedDate, receipt.createdAt);
    if (!day || day < input.fromDay || day > input.toDay) continue;
    const stage = input.resolveStage(receipt.status);
    if (stage === undefined) {
      unknownStatusReceipts += 1;
      continue;
    }
    if (stage !== 'received') continue;

    const key = receipt.vendorId ?? '';
    let row = byKey.get(key);
    if (!row) {
      row = { key, label: receipt.vendorName ?? '', receipts: 0, lines: 0 };
      byKey.set(key, row);
    }
    const lines = receipt.items?.length ?? 0;
    row.receipts += 1;
    row.lines += lines;
    totals.receipts += 1;
    totals.lines += lines;
  }

  const byVendor = [...byKey.values()].sort(
    (a, b) => b.receipts - a.receipts || b.lines - a.lines || a.label.localeCompare(b.label, 'vi'),
  );

  return { totals, byVendor, unknownStatusReceipts };
}
