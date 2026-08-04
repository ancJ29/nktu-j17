import type { ReactNode } from 'react';
import type { UseFormReturnType } from '@mantine/form';
import type { OperationLog, OperationLogExtra, OperationLogPhoto } from '@/types';
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

export type LogFormValue = string | number | LogFormLine[] | OperationLogPhoto[];
export type LogFormValues = Record<string, LogFormValue>;

export const PHOTOS_FIELD = 'photos';

export function formPhotos(values: LogFormValues): OperationLogPhoto[] {
  const raw = values[PHOTOS_FIELD];
  return Array.isArray(raw) ? (raw as OperationLogPhoto[]) : [];
}

export const DRAFT_PHOTO_PREFIX = 'draft-';

export function visiblePhotos(photos: OperationLogPhoto[] | undefined): OperationLogPhoto[] {
  return (photos ?? []).filter((p) => !p.isDeleted);
}

export type OperationLogContext = {
  assignedDriver?: { id?: string; name: string };

  maintenanceTypeOptions?: LookupOption[];

  oilTankOptions?: {
    value: string;
    label: string;
    code: string;

    currentLevel?: number;
  }[];

  tankCurrentLevel?: number;

  truckOptions?: { value: string; label: string; code: string; driverName?: string }[];
};

export type OperationLogWriteEvent = {
  op: 'create' | 'update' | 'delete';

  log: OperationLog;

  previous: OperationLog | null;
  targetId: string;
  targetCode: string;
};

export type GroupedRow = {
  log: OperationLog;

  grouped: boolean;

  firstOfGroup: boolean;
};

export type OperationLogColumn = {
  header: string;
  align?: 'right';
  nowrap?: boolean;
  emphasize?: boolean;

  render: (log: OperationLog) => ReactNode;

  sortValue?: (log: OperationLog) => number;

  sortField?: string;
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

  quickFilters?: {
    options: {
      value: string;
      labelKey: string;

      match?: (log: OperationLog) => boolean;
    }[];
  };

  entityFilter?: {
    labelKey: string;
    valueOf: (log: OperationLog) => string | undefined;
  };

  emptyForm: LogFormValues;

  validate: (t: TFn) => Record<string, (value: unknown, values: LogFormValues) => ReactNode>;

  validateOnSubmit?: (args: {
    values: LogFormValues;

    previous: OperationLog | null;
    context?: OperationLogContext;
    t: TFn;
  }) => Record<string, ReactNode> | null;

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

  photos?: {
    directoryType: string;

    labelKey?: string;
  };

  afterWrite?: (event: OperationLogWriteEvent, t: TFn) => Promise<void>;

  afterWriteErrorKey?: string;

  export?: (logs: OperationLog[], meta: OperationLogExportMeta) => void;
  exportLabelKey?: string;
};
