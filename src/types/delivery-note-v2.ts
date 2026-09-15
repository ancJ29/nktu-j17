import type {
  CredoSmeDeliveryNoteItemType,
  CredoSmeDeliveryNoteRecord,
  CredoSmeDeliveryNoteStatus,
  CredoSmeDeliveryNoteType,
} from '@credo/connectors/types';

export type DeliveryNoteV2 = CredoSmeDeliveryNoteRecord;

export type DeliveryNoteV2Status = CredoSmeDeliveryNoteStatus;

export type DeliveryNoteV2ItemType = CredoSmeDeliveryNoteItemType;

export type DeliveryNoteV2Type = CredoSmeDeliveryNoteType;

export type DeliveryNoteV2LineInput = {
  itemType?: DeliveryNoteV2ItemType;
  itemId: string;
  quantity: number;
  note?: string;
};

export const remainderOf = (line: DeliveryNoteV2['items'][number]): number =>
  Math.max(0, line.quantity - line.reducedQuantity);

export type DeliveryNoteV2Consequence = { code: string; message: string };
