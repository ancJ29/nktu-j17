import {
  SALES_ORDER_DEFAULT_STATUS_FLOW,
  SALES_ORDER_STAGE_CATALOGUE,
  resolveStatusFlow,
  validateStatusFlow,
  type SalesOrderStage,
  type StatusFlowConfig,
} from '@credo/connectors/status-flow';
import {
  customFieldColumnKey,
  validateCustomFields,
  type CustomFieldDef,
} from '@/utils/customFields';
import { SALES_ORDER_LIST_COLUMNS } from '@/pages/v2/sales-orders/listColumns';
import {
  assembleStatusFlowDraft,
  readStatusFlowDraftOf,
  type StatusFlowDraftOf,
} from './statusFlowDraft';
import type { CredoAppConfig } from '../schema';
import { mergeFeature } from './featureMerge';

export type SalesOrdersV2Form = {
  enabled: boolean;
  defaultRangeDays: number;
  codePrefix: string;
  codePadLength: number;
  statusFlow: StatusFlowDraft | null;
  defaultListStatuses: string[];

  customFields: CustomFieldDef[];
  listColumns: string[];
  hiddenColumns: string[];
  paymentTracking: boolean;
  autoCompleteOnFullDelivery: boolean;
};

const DEFAULTS = {
  enabled: false,
  defaultRangeDays: 14,
  codePrefix: 'SO-',
  codePadLength: 3,
  defaultListStatuses: [],
  paymentTracking: false,
  autoCompleteOnFullDelivery: false,
} as const;

export type StatusFlowDraft = StatusFlowDraftOf<SalesOrderStage>;

export const assembleStatusFlow = (draft: StatusFlowDraft): StatusFlowConfig<SalesOrderStage> =>
  assembleStatusFlowDraft(draft);

export const readStatusFlowDraft = (raw: unknown) => readStatusFlowDraftOf<SalesOrderStage>(raw);

export const readSalesOrdersV2 = (config: CredoAppConfig | null): SalesOrdersV2Form => {
  const v2 = config?.features?.salesOrdersV2;
  return {
    enabled: v2?.enabled ?? DEFAULTS.enabled,
    defaultRangeDays: v2?.defaultRangeDays ?? DEFAULTS.defaultRangeDays,
    codePrefix: v2?.codePrefix ?? DEFAULTS.codePrefix,
    codePadLength: v2?.codePadLength ?? DEFAULTS.codePadLength,
    statusFlow: readStatusFlowDraft(v2?.statusFlow).draft,
    defaultListStatuses: [...(v2?.defaultListStatuses ?? DEFAULTS.defaultListStatuses)],

    customFields: readCustomFieldDrafts(v2?.customFields),
    listColumns: [...(v2?.listColumns ?? [])],
    hiddenColumns: [...(v2?.hiddenColumns ?? [])],
    paymentTracking: v2?.paymentTracking ?? DEFAULTS.paymentTracking,
    autoCompleteOnFullDelivery:
      v2?.autoCompleteOnFullDelivery ?? DEFAULTS.autoCompleteOnFullDelivery,
  };
};

export const listColumnOptions = (
  form: SalesOrdersV2Form,
): Array<{ value: string; label: string }> => [
  ...SALES_ORDER_LIST_COLUMNS.map((column) => ({ value: column.key, label: column.label })),
  ...form.customFields
    .filter((field) => field.key.trim() !== '' && field.showInList === true)
    .map((field) => ({
      value: customFieldColumnKey(field.key.trim()),
      label: field.label.trim() || field.key.trim(),
    })),
];

export const readCustomFieldDrafts = (raw: unknown): CustomFieldDef[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((row): row is Record<string, unknown> => row !== null && typeof row === 'object')
    .map((row) => ({
      key: typeof row['key'] === 'string' ? row['key'] : '',
      label: typeof row['label'] === 'string' ? row['label'] : '',
      type: (row['type'] as CustomFieldDef['type']) ?? 'text',
      ...(Array.isArray(row['options']) ? { options: row['options'].map(String) } : {}),
      ...(Array.isArray(row['viewDepartments'])
        ? { viewDepartments: row['viewDepartments'].map(String) }
        : {}),
      ...(Array.isArray(row['editDepartments'])
        ? { editDepartments: row['editDepartments'].map(String) }
        : {}),
      ...(row['showInList'] !== undefined ? { showInList: row['showInList'] === true } : {}),
      ...(row['width'] !== undefined ? { width: row['width'] as CustomFieldDef['width'] } : {}),
    }));
};

export const customFieldIssues = (
  form: SalesOrdersV2Form,
  departmentValues: readonly string[],
): { errors: string[]; warnings: string[] } =>
  validateCustomFields(form.customFields, departmentValues);

export const listStatusOptions = (
  form: SalesOrdersV2Form,
): Array<{ value: string; label: string }> => {
  const flow = form.statusFlow?.statuses ?? SALES_ORDER_DEFAULT_STATUS_FLOW.statuses;
  const options = flow.map((status) => ({
    value: status.value,
    label: 'label' in status && status.label ? status.label : status.value,
  }));
  const known = new Set(options.map((option) => option.value));
  return [
    ...options,
    ...form.defaultListStatuses.filter((v) => !known.has(v)).map((v) => ({ value: v, label: v })),
  ];
};

export const statusFlowIssues = (
  form: SalesOrdersV2Form,
  departmentValues: readonly string[],
): { errors: string[]; warnings: string[] } => {
  if (form.statusFlow === null) return { errors: [], warnings: [] };
  const assembled = assembleStatusFlow(form.statusFlow);
  const { errors } = resolveStatusFlow(
    SALES_ORDER_STAGE_CATALOGUE,
    SALES_ORDER_DEFAULT_STATUS_FLOW,
    assembled,
  );
  if (errors.length > 0) return { errors, warnings: [] };
  return {
    errors: [],
    warnings: validateStatusFlow(SALES_ORDER_STAGE_CATALOGUE, assembled, departmentValues).warnings,
  };
};

export const orderCodePreview = (
  { codePrefix, codePadLength }: SalesOrdersV2Form,
  today: Date,
): string => {
  const day = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
  })
    .format(today)
    .replaceAll('-', '');
  return `${codePrefix}${day}-${(1).toString().padStart(Math.max(0, codePadLength), '0')}`;
};

export const applySalesOrdersV2 = (
  storedFeatures: CredoAppConfig['features'],
  form: SalesOrdersV2Form,
): CredoAppConfig['features'] => {
  const { statusFlow, customFields, ...rest } = form;
  return mergeFeature(storedFeatures, 'salesOrdersV2', {
    ...rest,
    statusFlow: statusFlow === null ? undefined : assembleStatusFlow(statusFlow),

    customFields: customFields.length > 0 ? customFields.map(assembleCustomField) : undefined,
  });
};

const assembleCustomField = (field: CustomFieldDef): CustomFieldDef => ({
  key: field.key.trim(),
  label: field.label.trim(),
  type: field.type,
  ...(field.type === 'select' ? { options: (field.options ?? []).map((o) => o.trim()) } : {}),
  ...((field.viewDepartments ?? []).length > 0 ? { viewDepartments: field.viewDepartments } : {}),
  ...((field.editDepartments ?? []).length > 0 ? { editDepartments: field.editDepartments } : {}),
  ...(field.showInList === true ? { showInList: true } : {}),

  ...(field.width !== undefined && field.width !== 'full' ? { width: field.width } : {}),
});
