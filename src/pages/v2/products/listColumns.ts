import { appConfig } from '@/config';
import type { CMngtAppConfig } from '@/config/schema';

export const PRODUCT_V2_LIST_COLUMNS: ReadonlyArray<{ key: string; label: string }> = [
  { key: 'product', label: 'Product' },
  { key: 'category', label: 'Category' },
  { key: 'price', label: 'Price' },
  { key: 'onHand', label: 'Stock on hand' },
  { key: 'minStock', label: 'Minimum stock' },
  { key: 'incoming', label: 'Incoming' },
  { key: 'outgoing', label: 'Reserved' },
  { key: 'status', label: 'Status' },
];

export const productV2ListColumns: string[] =
  (appConfig as unknown as CMngtAppConfig)?.features?.productsV2?.listColumns ?? [];

export const productV2HiddenColumns: string[] =
  (appConfig as unknown as CMngtAppConfig)?.features?.productsV2?.hiddenColumns ?? [];
