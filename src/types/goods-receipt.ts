import type {
  CMngtGoodsReceipt as BaseGoodsReceipt,
  CMngtGoodsReceiptItem as GoodsReceiptItem,
} from '@credo/connectors/types';

export type GoodsReceiptExtra = {
  createdBy?: string;

  lastUpdatedBy?: string;

  receivedBy?: string;

  assignedTo?: string;

  inventoryPosted?: boolean;

  copyFromId?: string;
  [key: string]: unknown;
};

export type GoodsReceipt = BaseGoodsReceipt<GoodsReceiptExtra>;

export type GoodsReceiptCopyFrom = Pick<
  GoodsReceipt,
  'vendorCode' | 'vendorName' | 'locationCode' | 'locationName' | 'reference' | 'notes'
> & {
  assignedTo?: string;

  items: GoodsReceiptItem[];

  sourceId: string;

  sourceReceiptNumber: string;
};
