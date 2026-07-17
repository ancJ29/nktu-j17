
import { useCallback, useRef } from 'react';
import { markEmpReady } from '@/utils/bootState';

export type EmpBootSignal = {
  
  setResolvedOk: (ok: boolean) => void;
  
  markMasterDataSettled: () => void;
};

export function useEmpBootSignal(): EmpBootSignal {
  const resolvedOk = useRef(false);
  const masterDataSettled = useRef(false);

  const check = useCallback(() => {
    if (resolvedOk.current && masterDataSettled.current) markEmpReady();
  }, []);

  const setResolvedOk = useCallback(
    (ok: boolean) => {
      resolvedOk.current = ok;
      check();
    },
    [check],
  );

  const markMasterDataSettled = useCallback(() => {
    masterDataSettled.current = true;
    check();
  }, [check]);

  return { setResolvedOk, markMasterDataSettled };
}
