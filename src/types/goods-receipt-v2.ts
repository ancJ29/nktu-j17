import type {
  CredoSmeGoodsReceiptItemType,
  CredoSmeGoodsReceiptRecord,
  CredoSmeGoodsReceiptStatus,
} from '@credo/connectors/types';

export type GoodsReceiptV2 = CredoSmeGoodsReceiptRecord;

export type GoodsReceiptV2Status = CredoSmeGoodsReceiptStatus;

export type GoodsReceiptV2ItemType = CredoSmeGoodsReceiptItemType;

export type GoodsReceiptV2LineInput = {
  itemType?: GoodsReceiptV2ItemType;
  itemId: string;
  quantity: number;
  note?: string;
};

export type GoodsReceiptV2CopyLine = GoodsReceiptV2LineInput & {
  itemCode?: string;
  itemName?: string;
  unit?: string;
};

export type GoodsReceiptV2CopyFrom = Pick<GoodsReceiptV2, 'vendorId' | 'reference' | 'notes'> & {
  items: GoodsReceiptV2CopyLine[];

  sourceReceiptNumber: string;

  extra: Record<string, string | number>;
};
