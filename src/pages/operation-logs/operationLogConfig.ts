import type { ReactNode } from 'react';
import type { UseFormReturnType } from '@mantine/form';
import type { OperationLog, OperationLogExtra } from '@/types';
import type { LookupOption } from '@/hooks/useLookupOptions';
import { todayInVnDateString } from '@/utils/dateTimeField';

const CURRENT_YEAR = new Date().getFullYear();

export function todayString(): string {
  return todayInVnDateString();
}

export function datePart(value: OperationLog['logDate']): string {
  return String(value).slice(0, 10);
}

export function yearOf(date: string): number {
  return Number(String(date).slice(0, 4)) || CURRENT_YEAR;
}

export type TFn = (key: string, options?: Record<string, unknown>) => string;

export type OperationLogPerms = {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
};

export type LogFormLine = Record<string, string | number>;

export type LogFormValue = string | number | LogFormLine[];
export type LogFormValues = Record<string, LogFormValue>;

export type OperationLogContext = {
  assignedDriver?: { id?: string; name: string };

  maintenanceTypeOptions?: LookupOption[];
};

export type OperationLogColumn = {
  header: string;
  align?: 'right';
  nowrap?: boolean;
  emphasize?: boolean;

  render: (log: OperationLog) => ReactNode;
};

export type OperationLogRowTone = { danger: boolean; tooltipKey?: string };

export type OperationLogExportMeta = {
  targetId: string;
  targetCode: string;
  year: number;
  month: string;
  monthLabel?: string;
  language: string;
};

export type OperationLogConfig = {
  logType: string;
  icon: ReactNode;

  titleKey: string;

  addLabelKey: string;

  addTitleKey: string;

  editTitleKey: string;

  emptyKey: string;

  modalSize?: string;
  columns: OperationLogColumn[];

  emptyForm: LogFormValues;
  validate: (t: TFn) => Record<string, (value: unknown) => ReactNode>;

  buildExtra: (values: LogFormValues) => Partial<OperationLogExtra>;

  toForm: (log: OperationLog) => LogFormValues;

  renderFields: (
    form: UseFormReturnType<LogFormValues>,
    t: TFn,
    ctx?: OperationLogContext,
  ) => ReactNode;

  renderExpanded?: (log: OperationLog, t: TFn) => ReactNode;

  rowLocked?: (log: OperationLog) => boolean;

  group?: {
    keyOf: (log: OperationLog) => string | undefined;

    compare?: (a: OperationLog, b: OperationLog) => number;
  };

  summary?: (logs: OperationLog[], t: TFn) => ReactNode;

  rowTone?: (log: OperationLog, visibleLogs: OperationLog[]) => OperationLogRowTone | undefined;

  export?: (logs: OperationLog[], meta: OperationLogExportMeta) => void;
  exportLabelKey?: string;
};
