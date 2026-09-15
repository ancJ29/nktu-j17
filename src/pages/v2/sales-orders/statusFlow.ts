import {
  SALES_ORDER_DEFAULT_STATUS_FLOW,
  SALES_ORDER_STAGE_CATALOGUE,
  SALES_ORDER_STAGE_COLORS,
  type SalesOrderStage,
  type StatusFlowStatus,
} from '@credo/connectors/status-flow';
import { appConfig } from '@/config';
import type { CMngtAppConfig } from '@/config/schema';
import { createStatusFlowReader } from '../statusFlowReader';

const features = (appConfig as unknown as CMngtAppConfig)?.features?.salesOrdersV2;

const DEFAULT_LABEL_KEYS = {
  draft: 'salesOrdersV2.status.draft',
  confirmed: 'salesOrdersV2.status.confirmed',
  fulfilled: 'salesOrdersV2.status.fulfilled',
  cancelled: 'salesOrdersV2.status.cancelled',
} as const;

const reader = createStatusFlowReader({
  catalogue: SALES_ORDER_STAGE_CATALOGUE,
  defaultFlow: SALES_ORDER_DEFAULT_STATUS_FLOW,
  raw: features?.statusFlow,
  defaultLabelOf: (t, value) => {
    const key = DEFAULT_LABEL_KEYS[value as keyof typeof DEFAULT_LABEL_KEYS];
    return key ? t(key) : undefined;
  },
  stageColors: SALES_ORDER_STAGE_COLORS,
  storedDefaultListStatuses: features?.defaultListStatuses,
});

export const salesOrderFlow = reader.flow;
export const salesOrderFlowErrors = reader.errors;
export const salesOrderDefaultListStatuses = reader.defaultListStatuses;
export const salesOrderStageOf = reader.stageOf;
export const salesOrderStatusDisplay = reader.display;
export const salesOrderStatusAction = reader.action;
export const salesOrderTransitionTargets = reader.targetsFrom;
export const salesOrderDepartmentsOwningNext = reader.departmentsOwningNext;
export const salesOrderIsTerminal = reader.isTerminalStage;

export type SalesOrderFlowStatus = StatusFlowStatus<SalesOrderStage>;
