import type {
  CMngtGoodsReceiptItem as GoodsReceiptItem,
  CMngtGoodsReceiptStatus as GoodsReceiptStatus,
} from '@credo/connectors/types';
import type { NullableDateTimeInput } from '@credo/kits/types';

export type {
  CMngtGoodsReceipt as GoodsReceipt,
  CMngtGoodsReceiptItem as GoodsReceiptItem,
  CMngtGoodsReceiptItemType as GoodsReceiptItemType,
  CMngtGoodsReceiptStatus as GoodsReceiptStatus,
} from '@credo/connectors/types';

export interface CreateGoodsReceiptInput<TExtra = Record<string, unknown>> {
  receiptNumber: string;
  vendorCode: string;
  vendorName: string;
  locationCode: string;
  locationName: string;
  receivedDate: string;
  items: GoodsReceiptItem[];
  reference?: string;
  notes?: string;
  extra?: TExtra;
}

export interface UpdateGoodsReceiptInput<TExtra = Record<string, unknown>> {
  version?: string;

  status?: GoodsReceiptStatus;
  vendorCode?: string;
  vendorName?: string;
  locationCode?: string;
  locationName?: string;
  receivedDate?: NullableDateTimeInput;
  items?: GoodsReceiptItem[];
  reference?: string;
  notes?: string;
  extra?: TExtra;
}

export interface GoodsReceiptFilter {
  status?: GoodsReceiptStatus;
  vendorCode?: string;
  locationCode?: string;
  search?: string;
  fromPeriod?: string;
  toPeriod?: string;
}
