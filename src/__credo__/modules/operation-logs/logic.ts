import type { OperationLog, CreateOperationLogInput, UpdateOperationLogInput } from './types.js';
import { ValidationError } from '../core/errors.js';
import { newVersion } from '@credo/kits/string';
import type { DateTimeInput } from '@credo/kits/types';

const yearFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Ho_Chi_Minh',
  year: 'numeric',
});

export function yearOf(logDate: DateTimeInput): string {
  if (typeof logDate === 'string') {
    const m = logDate.match(/^(\d{4})-\d{2}-\d{2}/);
    if (m) return m[1]!;
  }
  const d = logDate instanceof Date ? logDate : new Date(logDate);
  if (isNaN(d.getTime())) {
    throw new ValidationError('Invalid operation log input', { logDate: 'Invalid log date' });
  }
  return yearFormatter.format(d);
}

export function partitionId(targetId: string, year: string): string {
  return `${targetId.trim()}-${year}`;
}

export function validateCreateInput(input: CreateOperationLogInput): void {
  const fields: Record<string, string> = {};

  if (!input.targetId.trim()) {
    fields['targetId'] = 'Target is required';
  }
  if (!input.logType.trim()) {
    fields['logType'] = 'Log type is required';
  }
  if (!input.logDate) {
    fields['logDate'] = 'Log date is required';
  }

  if (Object.keys(fields).length > 0) {
    throw new ValidationError('Invalid operation log input', fields);
  }
}

export function buildOperationLog(
  id: string,
  input: CreateOperationLogInput,
  now: DateTimeInput,
): OperationLog {
  return {
    id,
    targetId: input.targetId.trim(),
    targetCode: input.targetCode.trim(),
    logType: input.logType.trim(),
    logDate: input.logDate,
    extra: input.extra ?? {},
    createdAt: now,
    updatedAt: now,
    version: newVersion(),
  };
}

export function applyUpdate(
  entry: OperationLog,
  input: UpdateOperationLogInput,
  now: DateTimeInput,
): OperationLog {
  return {
    ...entry,
    ...(input.logType !== undefined ? { logType: input.logType.trim() } : {}),
    ...(input.logDate !== undefined ? { logDate: input.logDate } : {}),
    ...(input.extra !== undefined ? { extra: input.extra } : {}),
    updatedAt: now,
    version: newVersion(),
  };
}
