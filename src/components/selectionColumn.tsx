import { Checkbox, Tooltip } from '@mantine/core';
import type { ReactNode } from 'react';

export const SELECTION_COLUMN_KEY = '__select';

type SelectionColumnArgs<T> = {
  readonly keyOf: (item: T) => string;
  readonly isSelected: (key: string) => boolean;
  readonly onToggleRow: (key: string) => void;
  readonly onToggleAll: () => void;
  readonly allSelected: boolean;
  readonly someSelected: boolean;

  readonly selectAllLabel: string;

  readonly rowLabel?: (item: T) => string;
  readonly isDisabled?: (item: T) => boolean;

  readonly disabledTooltip?: string;
};

export function selectionColumn<T>({
  keyOf,
  isSelected,
  onToggleRow,
  onToggleAll,
  allSelected,
  someSelected,
  selectAllLabel,
  rowLabel,
  isDisabled,
  disabledTooltip,
}: SelectionColumnArgs<T>): {
  key: string;
  width: string;
  header: ReactNode;
  render: (item: T) => ReactNode;

  hidden?: boolean;
} {
  return {
    key: SELECTION_COLUMN_KEY,
    width: '44px',
    header: (
      <Checkbox
        checked={allSelected}
        indeterminate={someSelected}
        onChange={onToggleAll}
        aria-label={selectAllLabel}
      />
    ),
    render: (item: T) => {
      const key = keyOf(item);
      const disabled = isDisabled?.(item) ?? false;
      const box = (
        <Checkbox
          checked={isSelected(key) && !disabled}
          disabled={disabled}
          onChange={() => onToggleRow(key)}
          onClick={(e) => e.stopPropagation()}
          aria-label={rowLabel?.(item) ?? key}
        />
      );
      if (!disabled || !disabledTooltip) return box;
      return (
        <Tooltip
          label={disabledTooltip}
          withArrow
          events={{ hover: true, focus: false, touch: true }}
        >
          {box}
        </Tooltip>
      );
    },
  };
}
