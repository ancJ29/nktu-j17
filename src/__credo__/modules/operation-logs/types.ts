import type { DateTimeInput } from '@credo/kits/types';

export type { CMngtOperationLog as OperationLog } from '@credo/connectors/types';

export interface CreateOperationLogInput<TExtra = Record<string, unknown>> {
  targetId: string;

  targetCode: string;

  logType: string;
  logDate: DateTimeInput;
  extra?: TExtra;
}

export interface UpdateOperationLogInput<TExtra = Record<string, unknown>> {
  targetId: string;

  period: string;

  version?: string;
  logType?: string;
  logDate?: DateTimeInput;
  extra?: TExtra;
}

export interface OperationLogFilter {
  logType?: string;
  search?: string;
}
