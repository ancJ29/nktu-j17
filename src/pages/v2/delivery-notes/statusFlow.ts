import {
  DELIVERY_NOTE_DEDUCTS_STOCK,
  DELIVERY_NOTE_DEFAULT_STATUS_FLOW,
  DELIVERY_NOTE_STAGE_CATALOGUE,
  DELIVERY_NOTE_STAGE_COLORS,
  statusHasCapability,
  type DeliveryNoteStage,
  type StatusFlowStatus,
} from '@credo/connectors/status-flow';
import { appConfig } from '@/config';
import type { CMngtAppConfig } from '@/config/schema';
import { createStatusFlowReader } from '../statusFlowReader';

const features = (appConfig as unknown as CMngtAppConfig)?.features?.deliveryNotesV2;

const DEFAULT_LABEL_KEYS = {
  draft: 'deliveryNotesV2.status.draft',
  delivered: 'deliveryNotesV2.status.delivered',
  cancelled: 'deliveryNotesV2.status.cancelled',
} as const;

const reader = createStatusFlowReader({
  catalogue: DELIVERY_NOTE_STAGE_CATALOGUE,
  defaultFlow: DELIVERY_NOTE_DEFAULT_STATUS_FLOW,
  raw: features?.statusFlow,
  defaultLabelOf: (t, value) => {
    const key = DEFAULT_LABEL_KEYS[value as keyof typeof DEFAULT_LABEL_KEYS];
    return key ? t(key) : undefined;
  },

  stageColors: DELIVERY_NOTE_STAGE_COLORS,
  storedDefaultListStatuses: features?.defaultListStatuses,
});

export const deliveryNoteFlow = reader.flow;
export const deliveryNoteFlowErrors = reader.errors;
export const deliveryNoteDefaultListStatuses = reader.defaultListStatuses;
export const deliveryNoteStageOf = reader.stageOf;
export const deliveryNoteStatusDisplay = reader.display;
export const deliveryNoteStatusAction = reader.action;
export const deliveryNoteTransitionTargets = reader.targetsFrom;
export const deliveryNoteDepartmentsOwningNext = reader.departmentsOwningNext;

export const deliveryNoteStatusDeducts = (value: string): boolean =>
  statusHasCapability(reader.flow, value, DELIVERY_NOTE_DEDUCTS_STOCK);

export type DeliveryNoteFlowStatus = StatusFlowStatus<DeliveryNoteStage>;
