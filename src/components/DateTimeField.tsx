import { DateTimePicker, type DateTimePickerProps } from '@mantine/dates';
import { getDateTimeFormat } from '@/utils/dateFormat';

/**
 * Common date+time picker for forms that record "when did this happen"
 * (goods receipts, stock movements, etc.).
 *
 * # Why a wrapper
 *
 * Mantine 8 returns `DateInput` / `DateTimePicker` values as **strings**, not
 * `Date` objects. That broke earlier consumers that called
 * `values.someDate.toISOString()` on submit (`TypeError: ... is not a function`).
 *
 * Centralising the picker here lets us:
 *  - Default the display format to the client-configured `dateTimeFormat`
 *    (see `appConfig.displaySettings`), so the picker matches the output of
 *    `formatDateTime()` elsewhere in the app.
 *  - Document the contract: form state is `string | null` in the picker's
 *    internal `YYYY-MM-DD HH:mm:ss` format, which `new Date(...)` parses
 *    cleanly. Convert to ISO at submit time via `new Date(value).toISOString()`.
 *  - Avoid sprinkling `valueFormat` / `clearable` defaults across every form.
 *
 * # Usage
 *
 * ```tsx
 * import { DateTimeField } from '@/components/DateTimeField';
 * import { nowDateTimeString } from '@/utils/dateTimeField';
 *
 * type FormValues = { receivedAt: string | null };
 *
 * useForm<FormValues>({ initialValues: { receivedAt: nowDateTimeString() } });
 *
 * <DateTimeField
 *   label={t('...receivedAtLabel')}
 *   withAsterisk
 *   {...form.getInputProps('receivedAt')}
 * />
 * ```
 *
 * On submit:
 * ```ts
 * receivedAt: values.receivedAt ? new Date(values.receivedAt).toISOString() : ''
 * ```
 */

export type DateTimeFieldProps = Omit<DateTimePickerProps, 'valueFormat'> & {
  /** Display format. Defaults to the client-configured `dateTimeFormat`. */
  valueFormat?: string;
};

const dateTimeFormat = getDateTimeFormat();

export function DateTimeField({
  valueFormat,
  clearable = true,
  placeholder,
  ...props
}: DateTimeFieldProps) {
  return (
    <DateTimePicker
      valueFormat={valueFormat ?? dateTimeFormat}
      placeholder={placeholder ?? dateTimeFormat}
      clearable={clearable}
      {...props}
    />
  );
}
