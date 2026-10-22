import type {
  CredoSmeSalesOrderItemType,
  CredoSmeSalesOrderRecord,
  CredoSmeSalesOrderStatus,
} from '@credo/connectors/types';

export type SalesOrderV2 = CredoSmeSalesOrderRecord;

export type SalesOrderV2Status = CredoSmeSalesOrderStatus;

export type SalesOrderV2ItemType = CredoSmeSalesOrderItemType;

export type SalesOrderV2LineInput = {
  itemType?: SalesOrderV2ItemType;
  itemId: string;
  quantity: number;
  unitPrice?: number;
  note?: string;
};

export type SalesOrderV2CopyLine = SalesOrderV2LineInput & {
  itemCode?: string;
  itemName?: string;
  unit?: string;
};

export type SalesOrderV2CopyFrom = Pick<
  SalesOrderV2,
  | 'customerId'
  // Copied for BOTH kinds. Without a `customerId` beside it this is the
  // individual customer the source order named — the walk-in's whole
  // identity. With one it is what the picker SHOWS, since the field renders
  // `customerName` as its own text; a copy that dropped it opened on a blank
  // customer whose id was quietly still attached.
  | 'customerName'
  | 'customerPhone'
  | 'customerAddress'
  | 'reference'
  | 'notes'
> & {
  items: SalesOrderV2CopyLine[];

  sourceOrderNumber: string;

  extra: Record<string, string | number>;
};
