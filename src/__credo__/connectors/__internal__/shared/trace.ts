import { getEnvVar } from '@credo/kits/misc';

let traceEnabled: boolean | undefined;

function isEnabled(): boolean {
  if (traceEnabled === undefined) {
    traceEnabled = getEnvVar('CREDO_KITS_DEBUG') === 'true';
  }
  return traceEnabled;
}

export const isTraceEnabled = (): boolean => isEnabled();

export function trace(...args: unknown[]): void {
  if (!isEnabled()) return;
  
  console.log(...args);
}

export function traceError(...args: unknown[]): void {
  if (!isEnabled()) return;
  
  console.error(...args);
}
