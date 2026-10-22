import { appConfig } from '@/config';
import type { CMngtAppConfig } from '@/config/schema';

export const GOODS_RECEIPT_LIST_COLUMNS: ReadonlyArray<{ key: string; label: string }> = [
  { key: 'receiptNumber', label: 'Number' },
  { key: 'vendorName', label: 'Vendor' },
  { key: 'receivedDate', label: 'Received date' },
  { key: 'items', label: 'Lines' },
  { key: 'totalQuantity', label: 'Total qty' },
  { key: 'status', label: 'Status' },
];

export const goodsReceiptListColumns: string[] =
  (appConfig as unknown as CMngtAppConfig)?.features?.goodsReceiptsV2?.listColumns ?? [];

export const goodsReceiptHiddenColumns: string[] =
  (appConfig as unknown as CMngtAppConfig)?.features?.goodsReceiptsV2?.hiddenColumns ?? [];
