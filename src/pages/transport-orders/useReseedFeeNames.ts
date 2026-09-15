import { useEffect, useRef } from 'react';
import type { UseFormReturnType } from '@mantine/form';
import { FALLBACK_FEE_NAMES, useFeeNameOptions, useFreightFeeName } from './feeName';
import { blankFee, isSeedFees, type FeeFormValues } from './feeRows';

export function useReseedFeeNames<V extends FeeFormValues>(
  form: UseFormReturnType<V>,
  skip: boolean,
): void {
  const feeNameOptions = useFeeNameOptions();
  const freightFeeName = useFreightFeeName();
  const seeded = useRef(false);
  useEffect(() => {
    if (skip || seeded.current) return;
    if (feeNameOptions === FALLBACK_FEE_NAMES) return;
    seeded.current = true;
    if (!isSeedFees(form.getValues().fees)) return;
    form.setValues({ fees: [blankFee({ label: freightFeeName })] } as Partial<V>);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Mantine re-creates `form` every render; the ref makes this a one-shot on the options arriving.
  }, [skip, feeNameOptions, freightFeeName]);
}
