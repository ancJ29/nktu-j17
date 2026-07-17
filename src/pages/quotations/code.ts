import { CallApiError } from '@credo/connectors/connector';
import { buildDailySequentialCode } from '@/utils/code';
import type { Quotation } from './types';

const QUOTATION_CODE_PREFIX = 'QT-';

export function buildQuotationCode(existing: Quotation[], attempted: string[] = []): string {
  const codes = existing.map((q) => q.extra.code).concat(attempted);
  return buildDailySequentialCode(QUOTATION_CODE_PREFIX, codes);
}

export const MAX_QUOTATION_CODE_RETRIES = 50;

export function isDuplicateQuotationCodeError(err: unknown): boolean {
  if (!(err instanceof CallApiError) || err.status !== 400) return false;
  const payload = err.payload;
  if (typeof payload !== 'object' || payload === null || !('fields' in payload)) return false;
  const fields = (payload as { fields?: unknown }).fields;
  return typeof fields === 'object' && fields !== null && 'extra.code' in fields;
}
