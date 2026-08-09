import { DatePickerInput, type DatePickerInputProps } from '@mantine/dates';
import { getDateFormat } from '@/utils/dateFormat';

/**
 * The app's date input. Wraps Mantine 8's `DatePickerInput`,
 * which emits a `YYYY-MM-DD` string via `onChange` (not a `Date`).
 *
 * **Select-only:** the field is a calendar-popup picker — the operator can only
 * pick a day, not type a date. (We deliberately do *not* use `DateInput`, whose
 * free-text entry let typos and ambiguous formats through.) The `YYYY-MM-DD`
 * string value contract is identical to the old `DateInput`, so consumers and
 * the Vietnam-anchored helpers below are unaffected.
 *
 * For "happened on day X" records (goods-receipt `receivedDate`, etc.) where
 * time of day doesn't matter. Convert to/from the wire ISO at submit /
 * edit-seed time using the Vietnam-anchored helpers in
 * `@/utils/dateTimeField`:
 *
 * ```tsx
 * import { DateField } from '@/components/DateField';
 * import { todayInVnDateString, vnDateStringToIso } from '@/utils/dateTimeField';
 *
 * useForm<{ receivedDate: string | null }>({
 *   initialValues: { receivedDate: todayInVnDateString() },
 * });
 *
 * <DateField label={...} {...form.getInputProps('receivedDate')} />
 *
 * // submit:
 * receivedDate: vnDateStringToIso(values.receivedDate)
 * ```
 *
 * The Vietnam anchor matters: c-storage partitions and the FE list pages
 * both index by UTC+7 day, so storing a UTC-midnight ISO would split the
 * partition at 7 AM local time and confuse the operator.
 *
 * Display format defaults to the client-configured `dateFormat` (see
 * `appConfig.displaySettings`), so the picker mirrors `formatDate()` output
 * elsewhere in the app. Pass `valueFormat` to override for a specific call.
 */

export type DateFieldProps = Omit<DatePickerInputProps, 'valueFormat' | 'type'> & {
  /** Display format. Defaults to the client-configured `dateFormat`. */
  valueFormat?: string;
  /** Only allow future dates. */
  futureOnly?: boolean;
};

const dateFormat = getDateFormat();
export function DateField({
  valueFormat,
  clearable = true,
  futureOnly = false,
  minDate,
  placeholder,
  ...props
}: DateFieldProps) {
  return (
    <DatePickerInput
      minDate={futureOnly ? new Date() : minDate}
      valueFormat={valueFormat ?? dateFormat}
      placeholder={placeholder ?? dateFormat}
      clearable={clearable}
      {...props}
    />
  );
}
