import { appConfig } from '@/config';
import type { CMngtAppConfig } from '@/config/schema';

export const SALES_ORDER_LIST_COLUMNS: ReadonlyArray<{ key: string; label: string }> = [
  { key: 'orderNumber', label: 'Number' },
  { key: 'customerName', label: 'Customer' },
  { key: 'orderDate', label: 'Order date' },
  { key: 'requestedDate', label: 'Requested' },
  { key: 'items', label: 'Lines' },
  { key: 'totalQuantity', label: 'Total qty' },
  { key: 'totalAmount', label: 'Amount' },
  { key: 'paymentStatus', label: 'Payment' },
  { key: 'status', label: 'Status' },
];

export const salesOrderListColumns: string[] =
  (appConfig as unknown as CMngtAppConfig)?.features?.salesOrdersV2?.listColumns ?? [];

export const salesOrderHiddenColumns: string[] =
  (appConfig as unknown as CMngtAppConfig)?.features?.salesOrdersV2?.hiddenColumns ?? [];
