import type { GoodsReceiptStatus } from '@/types';

type StatusLabelKey =
  | 'goodsReceipts.statuses.draft'
  | 'goodsReceipts.statuses.received'
  | 'goodsReceipts.statuses.cancelled';

export type GoodsReceiptStatusOption = {
  value: GoodsReceiptStatus;
  labelKey: StatusLabelKey;
  color: string;
};

export const GOODS_RECEIPT_STATUSES: readonly GoodsReceiptStatusOption[] = [
  { value: 'draft', labelKey: 'goodsReceipts.statuses.draft', color: 'gray' },
  { value: 'received', labelKey: 'goodsReceipts.statuses.received', color: 'green' },
  { value: 'cancelled', labelKey: 'goodsReceipts.statuses.cancelled', color: 'red' },
];

export function findStatus(value: GoodsReceiptStatus): GoodsReceiptStatusOption {
  return GOODS_RECEIPT_STATUSES.find((s) => s.value === value) ?? GOODS_RECEIPT_STATUSES[0]!;
}
