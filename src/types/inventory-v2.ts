import type { CredoSmeInventoryRecord } from '@credo/connectors/types';
import type { SingleRecordRow } from '@/stores/createSingleRecordsStore';

export type InventoryV2Row = SingleRecordRow & {
  itemId: string;
  itemCode: string;
  onHand: number;

  incoming?: number;

  incomingBy?: CredoSmeInventoryRecord['incomingBy'];

  outgoing?: number;

  outgoingBy?: CredoSmeInventoryRecord['outgoingBy'];
  note?: string;
  createdAt: number;
  updatedAt: number;
};
