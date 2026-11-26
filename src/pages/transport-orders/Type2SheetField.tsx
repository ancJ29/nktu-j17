import { Group, Radio } from '@mantine/core';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { TransportOrderType2Sheet } from '@/types';
import type { Type2SheetValue } from './type2Sheet';

/** Both tabs, in the workbook's own order. */
const SHEETS: ReadonlyArray<TransportOrderType2Sheet> = ['dieu', 'cuaKhau'];

/** The BẢNG KÊ tab choice, labelled with the tab names it prints under. */
export function Type2SheetField({
  value,
  onChange,
  error,
  required,
}: {
  readonly value: Type2SheetValue;
  readonly onChange: (next: Type2SheetValue) => void;
  readonly error?: ReactNode;
  readonly required: boolean;
}) {
  const { t } = useTranslation();
  return (
    <Radio.Group
      label={t('transportOrders.form.type2Sheet')}
      withAsterisk={required}
      value={value || null}
      onChange={(next) => onChange(next as TransportOrderType2Sheet)}
      error={error}
    >
      <Group gap="lg" mt={8}>
        {SHEETS.map((sheet) => (
          <Radio
            key={sheet}
            value={sheet}
            label={t(
              sheet === 'dieu'
                ? 'transportOrders.form.type2SheetDieu'
                : 'transportOrders.form.type2SheetCuaKhau',
            )}
          />
        ))}
      </Group>
    </Radio.Group>
  );
}
