import {
  DateInput,
  DatePickerInput,
  type DateInputProps,
  type DatePickerInputProps,
} from '@mantine/dates';
import { getDateFormat } from '@/utils/dateFormat';
import { dateOrderFromFormat, parseDateInput } from '@/utils/dateTimeParse';

/**
 * The app's date input. Wraps Mantine 8's `DatePickerInput`,
 * which emits a `YYYY-MM-DD` string via `onChange` (not a `Date`).
 *
 * **Select-only, and that is still the default:** the field is a calendar-popup
 * picker — the operator can only pick a day, not type a date, because the
 * free-text inputs this replaced let typos and ambiguous formats through.
 *
 * `DateTextField` below is the opt-in exception, for the fields an operator
 * fills from a sentence rather than from a calendar. It is not a relaxation of
 * the rule above: what made free text unsafe was a parser that guessed, and
 * both of the things that fixed it are now in place — the app's own grammar
 * (`dateTimeParse.ts`, which REFUSES anything ambiguous rather than picking a
 * reading) and the echo, where the field re-renders what it understood in the
 * client's format the moment focus leaves. That is the same pair
 * `DateTimeTextField` has run on since 2026-07-31.
 *
 * Both carry the identical `YYYY-MM-DD` string contract, so consumers and the
 * Vietnam-anchored helpers below are unaffected by the choice.
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
// Typing and reading agree on every client: the day/month order the parser
// reads by is the one the field displays in.
const dateOrder = dateOrderFromFormat(dateFormat);
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

export type DateTextFieldProps = Omit<DateInputProps, 'valueFormat' | 'dateParser'> & {
  /** Display format. Defaults to the client-configured `dateFormat`. */
  valueFormat?: string;
};

/**
 * The typable date field — a text input the operator can also pick from.
 *
 * Reach for it where the date arrives as words (an order taken over the phone:
 * "for the tenth"), and leave `DateField` where it arrives as a choice off a
 * calendar. The two are one keystroke apart for the operator and one component
 * apart here, so the decision is per field rather than per app.
 *
 * `dateParser` is the app's grammar rather than dayjs's: it reads `10/9`,
 * `10-9-2026` and `2026.09.10` in the CLIENT's day/month order, and refuses a
 * bare `10` — which month or day that meant is exactly the guess the old
 * free-text inputs made. Mantine's `fixOnBlur` (on by default) supplies the
 * echo: whatever the parser understood is re-rendered in the client's format,
 * so a misread is visible in place.
 */
export function DateTextField({
  valueFormat,
  clearable = true,
  placeholder,
  ...props
}: DateTextFieldProps) {
  return (
    <DateInput
      dateParser={(input) => parseDateInput(input, { order: dateOrder })}
      valueFormat={valueFormat ?? dateFormat}
      placeholder={placeholder ?? dateFormat}
      clearable={clearable}
      {...props}
    />
  );
}
