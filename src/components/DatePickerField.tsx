import { DatePickerInput, type DatePickerInputProps, type DatePickerType } from '@mantine/dates';
import { getDateFormat } from '@/utils/dateFormat';

/**
 * Project wrapper around Mantine 8's `DatePickerInput`. Like `<DateField>`,
 * but rendered as a calendar-popup picker (button-style input) rather than a
 * text input. Used mainly for **range** selections in filter popovers — see
 * `DesktopFilterMorePopover` / `MobileFilterMoreDrawer`.
 *
 * Display format defaults to the client-configured `dateFormat` (see
 * `appConfig.displaySettings`), so the picker matches `formatDate()` output
 * elsewhere in the app. Pass `valueFormat` to override per call.
 *
 * Generic `Type` mirrors Mantine's `DatePickerType` (`'default' | 'multiple'
 * | 'range'`) so the `value` / `onChange` signatures narrow correctly:
 *
 * ```tsx
 * <DatePickerField
 *   type="range"
 *   value={[from, to]}
 *   onChange={([from, to]) => ...}
 * />
 * ```
 */

export type DatePickerFieldProps<Type extends DatePickerType = 'default'> = Omit<
  DatePickerInputProps<Type>,
  'valueFormat'
> & {
  /** Display format. Defaults to the client-configured `dateFormat`. */
  valueFormat?: string;
};

const dateFormat = getDateFormat();

export function DatePickerField<Type extends DatePickerType = 'default'>({
  valueFormat,
  clearable = true,
  placeholder,
  ...props
}: DatePickerFieldProps<Type>) {
  return (
    <DatePickerInput<Type>
      valueFormat={valueFormat ?? dateFormat}
      placeholder={placeholder ?? dateFormat}
      clearable={clearable}
      {...(props as DatePickerInputProps<Type>)}
    />
  );
}
