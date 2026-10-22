import {
  DELIVERY_NOTE_DEDUCTS_STOCK,
  DELIVERY_NOTE_DEFAULT_STATUS_FLOW,
  DELIVERY_NOTE_STAGE_CATALOGUE,
  DELIVERY_NOTE_STAGE_COLORS,
  GOODS_RECEIPT_DEFAULT_STATUS_FLOW,
  GOODS_RECEIPT_STAGE_COLORS,
  SALES_ORDER_DEFAULT_STATUS_FLOW,
  SALES_ORDER_LOCKS_STOCK,
  SALES_ORDER_STAGE_CATALOGUE,
  SALES_ORDER_STAGE_COLORS,
  type DeliveryNoteStage,
  type GoodsReceiptStage,
  type SalesOrderStage,
} from '@credo/connectors/status-flow';
import type { StatusFlowVocabulary } from './StatusFlowEditor';

type CapabilityProse = { label: string; description: string };

const withProse = <Stage extends string>(
  catalogue: { capabilities?: ReadonlyArray<{ id: string; stages: readonly Stage[] }> },
  prose: Record<string, CapabilityProse>,
) =>
  (catalogue.capabilities ?? []).map((capability) => ({
    ...capability,
    ...(prose[capability.id] ?? { label: capability.id, description: '' }),
  }));

const SALES_ORDER_CAPABILITY_PROSE: Record<string, CapabilityProse> = {
  [SALES_ORDER_LOCKS_STOCK]: {
    label: 'Locks stock',
    description:
      'Entering this status reserves every line against stock, exactly as confirming does — for a client whose goods are spoken for at "chờ duyệt" rather than at the confirm. The hold then simply carries through the confirm, and is given back on the first hop to a status that holds nothing. An order is NOT editable while it holds. Draft-stage only, never the initial status.',
  },
};

const DELIVERY_NOTE_CAPABILITY_PROSE: Record<string, CapabilityProse> = {
  [DELIVERY_NOTE_DEDUCTS_STOCK]: {
    label: 'Deducts stock',
    description:
      'Entering this status takes every line’s remainder out of stock, exactly as the Reduce button does — for a client whose goods leave at "dispatched". Delivered still sweeps whatever is left and still decides whether the order completes; cancelling afterwards puts nothing back. Draft-stage only, never the initial status.',
  },
};

export const SALES_ORDER_FLOW_VOCABULARY: StatusFlowVocabulary<SalesOrderStage> = {
  stages: [
    { value: 'draft', label: 'draft — editable, holds nothing unless it locks' },
    { value: 'confirmed', label: 'confirmed — stock locked (put your own steps here)' },
    { value: 'fulfilled', label: 'fulfilled — delivered, terminal' },
    { value: 'cancelled', label: 'cancelled — terminal' },
  ],
  stageColors: SALES_ORDER_STAGE_COLORS,
  defaultFlow: SALES_ORDER_DEFAULT_STATUS_FLOW,
  initialStage: 'draft',
  recordNoun: 'an order',
  defaultLifecycle: 'draft → confirmed → fulfilled / cancelled',
  capabilities: withProse(SALES_ORDER_STAGE_CATALOGUE, SALES_ORDER_CAPABILITY_PROSE),
};

export const GOODS_RECEIPT_FLOW_VOCABULARY: StatusFlowVocabulary<GoodsReceiptStage> = {
  stages: [
    { value: 'draft', label: 'draft — editable, no stock' },
    { value: 'received', label: 'received — stock posted' },
    { value: 'cancelled', label: 'cancelled — terminal' },
  ],
  stageColors: GOODS_RECEIPT_STAGE_COLORS,
  defaultFlow: GOODS_RECEIPT_DEFAULT_STATUS_FLOW,
  initialStage: 'draft',
  recordNoun: 'a receipt',
  defaultLifecycle: 'draft → received / cancelled',
};

export const DELIVERY_NOTE_FLOW_VOCABULARY: StatusFlowVocabulary<DeliveryNoteStage> = {
  stages: [
    { value: 'draft', label: 'draft — on the road (put your own steps here)' },
    { value: 'delivered', label: 'delivered — stock reduced, terminal' },
    { value: 'cancelled', label: 'cancelled — terminal, no stock returns' },
  ],
  stageColors: DELIVERY_NOTE_STAGE_COLORS,
  defaultFlow: DELIVERY_NOTE_DEFAULT_STATUS_FLOW,
  initialStage: 'draft',
  recordNoun: 'a note',
  defaultLifecycle: 'draft → delivered / cancelled',
  capabilities: withProse(DELIVERY_NOTE_STAGE_CATALOGUE, DELIVERY_NOTE_CAPABILITY_PROSE),
};
