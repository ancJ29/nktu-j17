import type { DateTimeInput } from '@credo/kits/types';
import type { GoodsReceiptItem } from '@/types';
import type { PartitionedRecordRow } from '@/stores/createPartitionedRecordsStore';

export type PurchaseOrderStatus = 'draft' | 'ready' | 'cancelled';

export type PurchaseOrderCurrency = 'VND' | 'CNY';

export type PurchaseOrderItem = GoodsReceiptItem & {
  unitPrice?: number;

  taxAmount?: number;
};

export type PurchaseOrderLeadTime = { minDays: number; maxDays: number };

export type PurchaseOrderPhoto = {
  url: string;
  timestamp: DateTimeInput;
  userId?: string;
  userName?: string;
  fileName?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  isDeleted?: boolean;
};

export type PurchaseOrderAttachment = {
  url: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  timestamp: DateTimeInput;
  userId?: string;
  userName?: string;
  isDeleted?: boolean;
};

export type PurchaseOrderExtra = {
  createdBy?: string;
  lastUpdatedBy?: string;

  assignedTo?: string;

  requestedBy?: string;

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

  vendorNote?: string;
  currency: PurchaseOrderCurrency;

  vatRate?: number | null;
  items: PurchaseOrderItem[];
  isPaid: boolean;

  paidAmount?: number;

  paymentDeadline?: string;

  paymentUntracked?: boolean;
  paidAt?: string;

  photos?: PurchaseOrderPhoto[];

  attachments?: PurchaseOrderAttachment[];

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
  vendorNote?: string;
  assignedTo?: string;
  requestedBy?: string;
  leadTime?: PurchaseOrderLeadTime | null;

  vatRate?: number | null;
  customerCode?: string;
  customerName?: string;

  sourceId: string;

  sourceOrderNumber: string;
};
