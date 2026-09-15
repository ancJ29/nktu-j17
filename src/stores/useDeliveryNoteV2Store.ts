import { credoSmeConnector } from '@credo/connectors/connector';
import type {
  DeliveryNoteV2,
  DeliveryNoteV2LineInput,
  DeliveryNoteV2Type,
} from '@/types/delivery-note-v2';
import { createPartitionedDayStore } from './createPartitionedDayStore';
import { revalidateStockFor } from './stockAfterWrite';

const partition = createPartitionedDayStore<DeliveryNoteV2>({
  cacheKey: 'dnv2.4f90b2',
  querySync: (input) => credoSmeConnector.querySyncDeliveryNotes(input),
});

export const useDeliveryNoteV2Store = partition.store;

export const setDeliveryNoteV2Range = partition.setRange;

export const fetchDeliveryNoteV2Window = partition.fetchWindow;

export async function issueDeliveryNoteV2(input: {
  salesOrderId: string;
  deliveryType: DeliveryNoteV2Type;
  assignedTo?: string;
  carrier?: string;
  deliveryDate?: string;
  reference?: string;
  notes?: string;
  items?: DeliveryNoteV2LineInput[];
  completesSalesOrder?: boolean;
  extra?: Record<string, unknown>;
}): Promise<DeliveryNoteV2> {
  return partition.write(() => credoSmeConnector.createDeliveryNote(input));
}

export async function updateDeliveryNoteV2(
  note: DeliveryNoteV2,
  day: string,
  patch: {
    deliveryType?: DeliveryNoteV2Type;
    assignedTo?: string | null;
    carrier?: string;
    deliveryDate?: string;
    reference?: string;
    notes?: string;
    items?: DeliveryNoteV2LineInput[];
    completesSalesOrder?: boolean;
    extra?: Record<string, unknown>;
  },
): Promise<DeliveryNoteV2> {
  return partition.writeSafely(note, day, (cas) =>
    credoSmeConnector.updateDeliveryNote({ id: note.id, patch, ...cas }),
  );
}

export async function transitionDeliveryNoteV2(
  to: string,
  note: DeliveryNoteV2,
  day: string,
  options: { photoRefs?: string[]; acknowledge?: string[] } = {},
): Promise<DeliveryNoteV2> {
  const written = await partition.transitionSafely(note, day, (cas) =>
    credoSmeConnector.transitionDeliveryNote({
      id: note.id,
      to,
      ...(options.photoRefs?.length ? { photoRefs: options.photoRefs } : {}),
      ...(options.acknowledge?.length ? { acknowledge: options.acknowledge } : {}),
      ...cas,
    }),
  );
  revalidateStockFor(written);
  return written;
}

export async function reduceDeliveryNoteV2(
  note: DeliveryNoteV2,
  day: string,
  amounts?: Array<{
    itemType?: DeliveryNoteV2LineInput['itemType'];
    itemId: string;
    quantity: number;
  }>,
): Promise<DeliveryNoteV2> {
  const written = await partition.writeSafely(note, day, (cas) =>
    credoSmeConnector.deliveryNoteInventory({
      id: note.id,
      action: 'reduce',
      ...(amounts !== undefined ? { amounts } : {}),
      ...cas,
    }),
  );
  revalidateStockFor(written);
  return written;
}

export async function getDeliveryNoteV2ById(
  id: string,
): Promise<{ item: DeliveryNoteV2; day: string }> {
  const res = await credoSmeConnector.getDeliveryNoteById({ id });
  return { item: res.item, day: res.day };
}
