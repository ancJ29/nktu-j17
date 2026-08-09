import type { GenericRecord, CreateGenericRecordInput, UpdateGenericRecordInput } from './types.js';
import { ValidationError } from '../core/errors.js';
import { newVersion } from '@credo/kits/string';
import type { DateTimeInput } from '@credo/kits/types';

const dayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Ho_Chi_Minh',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function dayOf(recordDate: DateTimeInput): string {
  if (typeof recordDate === 'string') {
    const m = recordDate.match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1]!;
  }
  const d = recordDate instanceof Date ? recordDate : new Date(recordDate);
  if (isNaN(d.getTime())) {
    throw new ValidationError('Invalid generic record input', {
      recordDate: 'Invalid record date',
    });
  }
  return dayFormatter.format(d);
}

export function validateCreateInput(input: CreateGenericRecordInput): void {
  const fields: Record<string, string> = {};

  if (!input.recordType.trim()) {
    fields['recordType'] = 'Record type is required';
  }
  if (!input.recordDate) {
    fields['recordDate'] = 'Record date is required';
  }

  if (Object.keys(fields).length > 0) {
    throw new ValidationError('Invalid generic record input', fields);
  }
}

export function buildGenericRecord(
  id: string,
  input: CreateGenericRecordInput,
  now: DateTimeInput,
): GenericRecord {
  return {
    id,
    recordType: input.recordType.trim(),
    ...(input.targetId?.trim() ? { targetId: input.targetId.trim() } : {}),
    ...(input.targetCode?.trim() ? { targetCode: input.targetCode.trim() } : {}),
    recordDate: input.recordDate,
    extra: input.extra ?? {},
    createdAt: now,
    updatedAt: now,
    version: newVersion(),
  };
}

export function applyUpdate(
  record: GenericRecord,
  input: UpdateGenericRecordInput,
  now: DateTimeInput,
): GenericRecord {
  return {
    ...record,
    ...(input.recordDate !== undefined ? { recordDate: input.recordDate } : {}),
    ...(input.targetCode !== undefined ? { targetCode: input.targetCode.trim() } : {}),
    ...(input.extra !== undefined ? { extra: input.extra } : {}),
    updatedAt: now,
    version: newVersion(),
  };
}
