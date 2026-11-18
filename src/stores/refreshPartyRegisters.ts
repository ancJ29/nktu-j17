import { logger } from '@credo/base-ui/utils';
import { useCustomerStore } from './useCustomerStore';
import { useVendorStore } from './useVendorStore';

export const PARTY_REFRESH_TIMEOUT_MS = 4000;

export async function refreshPartyRegisters(
  timeoutMs: number = PARTY_REFRESH_TIMEOUT_MS,
): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, timeoutMs);
  });
  const refresh = Promise.allSettled([
    useCustomerStore.getState().revalidate(),
    useVendorStore.getState().revalidate(),
  ]).then((results) => {
    for (const r of results) {
      if (r.status === 'rejected') logger.warn('party register refresh failed', r.reason);
    }
  });
  try {
    await Promise.race([refresh, timeout]);
  } finally {
    clearTimeout(timer);
  }
}
