export type CustomFieldType = 'text' | 'number' | 'date' | 'select';

export const CUSTOM_FIELD_TYPES: readonly CustomFieldType[] = [
  'text',
  'number',
  'date',
  'select',
] as const;

export type CustomFieldDef = {
  key: string;

  label: string;
  type: CustomFieldType;

  options?: string[];

  viewDepartments?: string[];
  editDepartments?: string[];

  showInList?: boolean;

  width?: CustomFieldWidth;
};

export type CustomFieldWidth = 'full' | 'half' | 'third';

export const CUSTOM_FIELD_WIDTHS: readonly CustomFieldWidth[] = ['full', 'half', 'third'] as const;

const WIDTH_SPANS: Record<CustomFieldWidth, number> = { full: 12, half: 6, third: 4 };

export const customFieldSpan = (field: CustomFieldDef): { base: number; sm: number } => ({
  base: 12,
  sm: WIDTH_SPANS[field.width ?? 'full'],
});

export type ViewerCustomField = CustomFieldDef & { editable: boolean };

export type CustomFieldValidation = {
  errors: string[];

  warnings: string[];
};

const KEY_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]{0,63}$/;

export function fieldsForViewer(
  fields: readonly CustomFieldDef[],
  departmentId: string,
): ViewerCustomField[] {
  const allows = (list: string[] | undefined): boolean =>
    list === undefined || (departmentId !== '' && list.includes(departmentId));
  return fields
    .filter((field) => allows(field.viewDepartments))
    .map((field) => ({ ...field, editable: allows(field.editDepartments) }));
}

export const customFieldColumnKey = (fieldKey: string) => `extra.${fieldKey}`;

export function readCustomFieldValue(
  extra: unknown,
  field: CustomFieldDef,
): string | number | undefined {
  if (extra === null || typeof extra !== 'object' || Array.isArray(extra)) return undefined;
  const value = (extra as Record<string, unknown>)[field.key];
  if (typeof value === 'string') return value === '' ? undefined : value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  return undefined;
}

export const customDraftOf = (extra: unknown): Record<string, string> => {
  if (extra === null || typeof extra !== 'object' || Array.isArray(extra)) return {};
  const draft: Record<string, string> = {};
  for (const [key, value] of Object.entries(extra as Record<string, unknown>)) {
    if (typeof value === 'string' || typeof value === 'number') draft[key] = String(value);
  }
  return draft;
};

export function mergeCustomFieldExtra(
  stored: unknown,
  editable: readonly CustomFieldDef[],
  draft: Readonly<Record<string, string>>,
): Record<string, unknown> {
  const base =
    stored !== null && typeof stored === 'object' && !Array.isArray(stored)
      ? { ...(stored as Record<string, unknown>) }
      : {};
  for (const field of editable) {
    const raw = (draft[field.key] ?? '').trim();
    if (raw === '') {
      delete base[field.key];
      continue;
    }
    base[field.key] = field.type === 'number' ? Number(raw) : raw;
  }
  return base;
}

export function customFieldValueErrors(
  editable: readonly CustomFieldDef[],
  draft: Readonly<Record<string, string>>,
): Record<string, 'number' | 'date' | 'option'> {
  const errors: Record<string, 'number' | 'date' | 'option'> = {};
  for (const field of editable) {
    const raw = (draft[field.key] ?? '').trim();
    if (raw === '') continue;
    if (field.type === 'number' && !Number.isFinite(Number(raw))) errors[field.key] = 'number';
    if (field.type === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(raw)) errors[field.key] = 'date';
    if (field.type === 'select' && !(field.options ?? []).includes(raw)) {
      errors[field.key] = 'option';
    }
  }
  return errors;
}

export function validateCustomFields(
  fields: readonly CustomFieldDef[],
  knownDepartmentIds?: readonly string[],
): CustomFieldValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const seen = new Set<string>();

  for (const [index, field] of fields.entries()) {
    const label = `customFields[${index}]`;
    const key = field.key ?? '';

    if (!KEY_PATTERN.test(key)) {
      errors.push(
        `${label}: key "${key}" must start with a letter and use only letters, digits or _ (max 64)`,
      );
    } else if (seen.has(key)) {
      errors.push(`${label}: duplicate key "${key}"`);
    }
    seen.add(key);

    if (!field.label || field.label.trim() === '') {
      errors.push(`${label}: "${key}" has no label`);
    }

    if (!CUSTOM_FIELD_TYPES.includes(field.type)) {
      errors.push(`${label}: "${key}" has unknown type "${String(field.type)}"`);
    }

    if (field.width !== undefined && !CUSTOM_FIELD_WIDTHS.includes(field.width)) {
      errors.push(`${label}: "${key}" has unknown width "${String(field.width)}"`);
    }

    if (field.type === 'select') {
      const options = field.options ?? [];
      if (options.length === 0) {
        errors.push(`${label}: select field "${key}" has no options`);
      }
      if (options.some((option) => option.trim() === '')) {
        errors.push(`${label}: select field "${key}" has an empty option`);
      }
      if (new Set(options).size !== options.length) {
        errors.push(`${label}: select field "${key}" has duplicate options`);
      }
    } else if (field.options !== undefined) {
      warnings.push(`${label}: options are ignored on a ${field.type} field`);
    }

    if (field.editDepartments && field.viewDepartments) {
      const missing = field.editDepartments.filter((d) => !field.viewDepartments!.includes(d));
      if (missing.length > 0) {
        errors.push(`${label}: "${key}" lets ${missing.join(', ')} edit a field they cannot view`);
      }
    }

    for (const [name, list] of [
      ['viewDepartments', field.viewDepartments],
      ['editDepartments', field.editDepartments],
    ] as const) {
      if (!list) continue;
      if (list.length === 0) {
        warnings.push(`${label}: empty ${name} denies everyone — omit it to allow all`);
      } else if (knownDepartmentIds) {
        for (const department of list) {
          if (!knownDepartmentIds.includes(department)) {
            warnings.push(`${label}: ${name} names unknown department "${department}"`);
          }
        }
      }
    }
  }

  return { errors, warnings };
}

export function resolveCustomFields(raw: unknown): {
  fields: CustomFieldDef[];
  errors: string[];
} {
  if (raw === undefined) return { fields: [], errors: [] };
  if (!Array.isArray(raw) || raw.some((row) => row === null || typeof row !== 'object')) {
    return { fields: [], errors: ['customFields must be an array of field objects'] };
  }
  const fields = raw.map(normalizeField);
  const { errors } = validateCustomFields(fields);
  return { fields: errors.length > 0 ? [] : fields, errors };
}

const normalizeField = (raw: unknown): CustomFieldDef => {
  const row = raw as Record<string, unknown>;
  const strings = (value: unknown): string[] | undefined =>
    Array.isArray(value) ? value.map((entry) => String(entry)) : undefined;
  return {
    key: typeof row['key'] === 'string' ? row['key'] : '',
    label: typeof row['label'] === 'string' ? row['label'] : '',
    type: row['type'] as CustomFieldType,
    ...(row['options'] !== undefined ? { options: strings(row['options']) ?? [] } : {}),
    ...(row['viewDepartments'] !== undefined
      ? { viewDepartments: strings(row['viewDepartments']) ?? [] }
      : {}),
    ...(row['editDepartments'] !== undefined
      ? { editDepartments: strings(row['editDepartments']) ?? [] }
      : {}),
    ...(row['showInList'] !== undefined ? { showInList: row['showInList'] === true } : {}),
    ...(row['width'] !== undefined ? { width: row['width'] as CustomFieldWidth } : {}),
  };
};
