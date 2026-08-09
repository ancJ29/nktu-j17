import type { DateTimeInput } from '@credo/kits/types';

export type { CMngtGenericRecord as GenericRecord } from '@credo/connectors/types';

export interface CreateGenericRecordInput<TExtra = Record<string, unknown>> {
  recordType: string;

  targetId?: string;

  targetCode?: string;

  recordDate: DateTimeInput;
  extra?: TExtra;
}

export interface UpdateGenericRecordInput<TExtra = Record<string, unknown>> {
  recordType: string;

  period: string;

  version?: string;
  recordDate?: DateTimeInput;
  targetCode?: string;
  extra?: TExtra;
}

export interface GenericRecordQueryFilter {
  recordType: string;
  fromPeriod?: string;
  toPeriod?: string;
}
