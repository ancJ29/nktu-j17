import type {
  CMngtPurchaseOrderItem as PurchaseOrderItem,
  CMngtPurchaseOrderStatus as PurchaseOrderStatus,
} from '@credo/connectors/types';

export type {
  CMngtPurchaseOrder as PurchaseOrder,
  CMngtPurchaseOrderItem as PurchaseOrderItem,
  CMngtPurchaseOrderStatus as PurchaseOrderStatus,
} from '@credo/connectors/types';

export interface CreatePurchaseOrderInput<TExtra = Record<string, unknown>> {
  orderNumber: string;
  supplierName: string;
  items: PurchaseOrderItem[];
  notes?: string;
  extra?: TExtra;
}

export interface UpdatePurchaseOrderInput<TExtra = Record<string, unknown>> {
  supplierName?: string;
  items?: PurchaseOrderItem[];
  notes?: string;
  status?: 'confirmed' | 'received';
  extra?: TExtra;
}

export interface PurchaseOrderFilter {
  status?: PurchaseOrderStatus;
  search?: string;
  fromPeriod?: string;
  toPeriod?: string;
}
