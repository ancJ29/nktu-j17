import { OperationTimeoutError } from '@/utils/withTimeout';

export function isNetworkFailure(error: unknown): boolean {
  if (error instanceof OperationTimeoutError) return true;

  if (error instanceof DOMException && error.name === 'AbortError') return true;

  const status = (error as { status?: unknown } | null)?.status;

  if (typeof status === 'number' && status > 0) return false;

  if (error instanceof TypeError) return true;

  return typeof navigator !== 'undefined' && navigator.onLine === false;
}
