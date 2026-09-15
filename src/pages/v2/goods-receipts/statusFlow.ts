import {
  GOODS_RECEIPT_DEFAULT_STATUS_FLOW,
  GOODS_RECEIPT_STAGE_CATALOGUE,
  GOODS_RECEIPT_STAGE_COLORS,
  type GoodsReceiptStage,
  type StatusFlowStatus,
} from '@credo/connectors/status-flow';
import { appConfig } from '@/config';
import type { CMngtAppConfig } from '@/config/schema';
import { createStatusFlowReader } from '../statusFlowReader';

const features = (appConfig as unknown as CMngtAppConfig)?.features?.goodsReceiptsV2;

const DEFAULT_LABEL_KEYS = {
  draft: 'goodsReceiptsV2.status.draft',
  received: 'goodsReceiptsV2.status.received',
  cancelled: 'goodsReceiptsV2.status.cancelled',
} as const;

const reader = createStatusFlowReader({
  catalogue: GOODS_RECEIPT_STAGE_CATALOGUE,
  defaultFlow: GOODS_RECEIPT_DEFAULT_STATUS_FLOW,
  raw: features?.statusFlow,
  defaultLabelOf: (t, value) => {
    const key = DEFAULT_LABEL_KEYS[value as keyof typeof DEFAULT_LABEL_KEYS];
    return key ? t(key) : undefined;
  },
  stageColors: GOODS_RECEIPT_STAGE_COLORS,
  storedDefaultListStatuses: features?.defaultListStatuses,
});

export const goodsReceiptFlow = reader.flow;
export const goodsReceiptFlowErrors = reader.errors;
export const goodsReceiptDefaultListStatuses = reader.defaultListStatuses;
export const goodsReceiptStageOf = reader.stageOf;
export const goodsReceiptStatusDisplay = reader.display;
export const goodsReceiptStatusAction = reader.action;
export const goodsReceiptTransitionTargets = reader.targetsFrom;
export const goodsReceiptDepartmentsOwningNext = reader.departmentsOwningNext;

export type GoodsReceiptFlowStatus = StatusFlowStatus<GoodsReceiptStage>;

export { useCurrentDepartment } from '../statusFlowReader';
