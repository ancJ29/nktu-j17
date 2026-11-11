import type { GoodsReceiptItem } from '@/types';
import type { PartitionedRecordRow } from '@/stores/createPartitionedRecordsStore';

export type PurchaseOrderStatus = 'draft' | 'ready' | 'cancelled';

export type PurchaseOrderCurrency = 'VND' | 'CNY';

export type PurchaseOrderItem = GoodsReceiptItem & {
  unitPrice?: number;

  taxAmount?: number;
};

export type PurchaseOrderLeadTime = { minDays: number; maxDays: number };

export type PurchaseOrderExtra = {
  createdBy?: string;
  lastUpdatedBy?: string;

  assignedTo?: string;

  copyFromId?: string;
  readyBy?: string;
  cancelledBy?: string;
  paidBy?: string;
  [key: string]: unknown;
};

export type PurchaseOrder = PartitionedRecordRow & {
  orderNumber: string;
  status: PurchaseOrderStatus;
  vendorCode: string;
  vendorName: string;

  customerCode?: string;
  customerName?: string;
  locationCode: string;
  locationName: string;

  orderDate?: string;

  leadTime?: PurchaseOrderLeadTime | null;

  expectedDate?: string;
  reference: string;

  notes: string;
  currency: PurchaseOrderCurrency;
  items: PurchaseOrderItem[];
  isPaid: boolean;

  paidAmount?: number;

  paymentDeadline?: string;

  paymentUntracked?: boolean;
  paidAt?: string;

  receiptIds: string[];
  readyAt?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
  extra: PurchaseOrderExtra;
};

export type PurchaseOrderCopyFrom = Pick<
  PurchaseOrder,
  | 'vendorCode'
  | 'vendorName'
  | 'locationCode'
  | 'locationName'
  | 'currency'
  | 'reference'
  | 'notes'
  | 'items'
> & {
  assignedTo?: string;
  leadTime?: PurchaseOrderLeadTime | null;
  customerCode?: string;
  customerName?: string;

  sourceId: string;

  sourceOrderNumber: string;
};
