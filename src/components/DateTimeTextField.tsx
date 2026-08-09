import { ActionIcon, Group, Popover, Stack, TextInput, type TextInputProps } from '@mantine/core';
import { DatePicker, TimeInput } from '@mantine/dates';
import { IconCalendar, IconX } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDateTime, getDateFormat, getDateTimeFormat } from '@/utils/dateFormat';
import { todayInVnDateString } from '@/utils/dateTimeField';
import { dateOrderFromFormat, parseDateTimeInput } from '@/utils/dateTimeParse';

/**
 * **Typed** date+time field — the app's only date+time input, carrying a
 * `string | null` (`YYYY-MM-DD HH:mm:ss`) value contract, with the submit-time
 * `dateTimeStringToIso()` conversion applied by its callers.
 *
 * # Why it is a text field and not a picker
 *
 * Mantine's `DateTimePicker` cannot be typed into at all: it is a calendar and a
 * clock, and every value costs several clicks. That is fine for the date on a
 * document. It is not fine for a **warehouse slot** — a transport-order operator
 * books them off a phone call, several a minute, and the sentence they were just
 * told ("tám giờ ngày ba mốt") is faster to type than to click (client's ask,
 * 2026-07-31).
 *
 * The reverse is also true, which is why the calendar stays: picking a day three
 * weeks out is easier on a month grid than by counting. So this field is a text
 * input **plus** a popover calendar + clock — type or pick, whichever the value
 * suits.
 *
 * **This used to be phrased as a sibling of a select-only `<DateTimeField>`,
 * which was deleted 2026-08-08 with zero call sites.** Every remaining date
 * input in the app is date-only (`<DateField>`, select-only by design — see its
 * note); the free-text argument above applies to date+time entry specifically,
 * and nothing else needed one.
 *
 * # The contract that makes free text safe
 *
 * The grammar lives in [`dateTimeParse.ts`](../utils/dateTimeParse.ts) (pure,
 * unit-tested) and the safety is in the **echo**: on blur the field re-renders
 * what it *understood*, formatted in the client's configured `dateTimeFormat`.
 * A misread input is visible immediately, in place — which is the check the
 * free-text date inputs this app removed never gave.
 *
 * An **unparseable** value is never silently dropped: the typed text stays, an
 * inline error appears, and the bound value is left at its last good state. The
 * operator fixes a character instead of retyping the field.
 *
 * ```tsx
 * <DateTimeTextField label={t('…')} {...form.getInputProps('pickupAt')} />
 * ```
 */

export type DateTimeTextFieldProps = Omit<TextInputProps, 'value' | 'onChange'> & {
  /**
   * `YYYY-MM-DD HH:mm:ss`, or `null`/absent when unset. Optional so a bare
   * `{...form.getInputProps('pickupAt')}` spread type-checks — Mantine types its
   * returned `value` as optional.
   */
  value?: string | null;
  onChange: (value: string | null) => void;
  /** Show the ✕ that clears the field. Default on — an estimate is optional. */
  clearable?: boolean;
};

const dateTimeFormat = getDateTimeFormat();
// Day/month order is read from the client's configured *date* format, so typing
// and reading agree on every client (see `dateOrderFromFormat`).
const dateOrder = dateOrderFromFormat(getDateFormat());
/**
 * A worked example for the error message, rendered in the client's own format —
 * "what should I type?" is the only question that message has to answer, and a
 * hardcoded `08:00 31/07/2026` would be a lie on a client configured otherwise.
 */
const formatExample = formatDateTime(new Date(2026, 6, 31, 8, 0));

/** The canonical string as the operator sees it — the echo. */
function displayText(value: string | null | undefined): string {
  return value ? formatDateTime(value) : '';
}

/** `YYYY-MM-DD` / `HH:mm` halves, for the popover's two widgets. */
function splitParts(value: string | null): { date: string | null; time: string } {
  const m = value ? /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/.exec(value) : null;
  return m ? { date: m[1]!, time: m[2]! } : { date: null, time: '' };
}

export function DateTimeTextField({
  value,
  onChange,
  clearable = true,
  error,
  placeholder,
  onBlur,
  onKeyDown,
  rightSection,
  ...rest
}: DateTimeTextFieldProps) {
  const { t } = useTranslation();
  const current = value ?? null;
  /**
   * What the operator is typing, or `null` when they aren't — in which case the
   * input **derives** from the bound value.
   *
   * That derivation is the echo, and keeping it a derivation (rather than a
   * mirrored `text` state re-synced by an effect) is what makes every external
   * move — a commit below, a form reset, an edit-page load — land in the input
   * with no synchronisation code at all.
   */
  const [draft, setDraft] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  /**
   * The month the calendar is showing. Controlled, and re-anchored on the field's
   * own value every time the popover opens — otherwise the calendar opens on
   * *today* while the field reads 13/08, and the operator has to page to the
   * month they are already looking at before they can nudge the day.
   */
  const [pickerMonth, setPickerMonth] = useState<string | null>(null);
  const text = draft ?? displayText(current);

  /**
   * Text → value. Called on blur and on Enter, never per keystroke: mid-typing
   * every input is "invalid", and flagging that would make the field shout at an
   * operator who is doing nothing wrong.
   */
  const commitText = () => {
    const raw = text.trim();
    if (!raw) {
      // Clearing is a real state (an unbooked slot), not an error.
      setInvalid(false);
      setDraft(null);
      if (current !== null) onChange(null);
      return;
    }
    const parsed = parseDateTimeInput(raw, { order: dateOrder, fallbackDate: current });
    if (!parsed) {
      // Hold what was typed — an operator fixes a character, they don't retype.
      setInvalid(true);
      return;
    }
    setInvalid(false);
    // Dropping the draft is what re-echoes: the input goes back to rendering the
    // bound value, formatted. It happens even when the parse landed on the value
    // already held (`8h` on a field at 08:00), so a shorthand always resolves
    // visibly.
    setDraft(null);
    if (parsed !== current) onChange(parsed);
  };

  /**
   * The popover's answer wins outright — including over a draft the parser
   * rejected. Without dropping it, typing something unparseable and then reaching
   * for the calendar would leave the bad text on screen over a good stored value:
   * the operator would have fixed the field and still be looking at their typo.
   */
  const setFromPicker = (date: string | null, time: string) => {
    if (!date) return;
    setDraft(null);
    setInvalid(false);
    onChange(`${date} ${time || '00:00'}:00`);
  };

  const parts = splitParts(current);

  return (
    <TextInput
      {...rest}
      value={text}
      placeholder={placeholder ?? dateTimeFormat}
      error={
        invalid
          ? t('__new__.01-common.validation.invalidDateTime', { example: formatExample })
          : error
      }
      onChange={(e) => {
        setDraft(e.currentTarget.value);
        // A keystroke means they're fixing it — drop the error rather than
        // leaving it under a field that has already changed.
        if (invalid) setInvalid(false);
      }}
      onBlur={(e) => {
        commitText();
        onBlur?.(e);
      }}
      onKeyDown={(e) => {
        // Enter commits the field. Without the preventDefault it would submit the
        // whole form instead — with the typed text not yet parsed.
        if (e.key === 'Enter') {
          e.preventDefault();
          commitText();
        }
        onKeyDown?.(e);
      }}
      rightSectionPointerEvents="all"
      // Deliberately tight. The narrowest caller is the leg table's 165px column,
      // whose budget was trimmed to what the old picker needed — anything wider
      // here eats into the two free-text place columns, which the leg table's
      // width rule (see modules/transport-orders.md) says never to do.
      rightSectionWidth={clearable && text ? 48 : 30}
      rightSection={
        rightSection ?? (
          <Group gap={0} wrap="nowrap" justify="flex-end" pr={2}>
            {clearable && text && (
              <ActionIcon
                variant="subtle"
                color="gray"
                size="xs"
                aria-label={t('__new__.01-common.actions.clearValue')}
                onClick={() => {
                  setDraft(null);
                  setInvalid(false);
                  if (current !== null) onChange(null);
                }}
              >
                <IconX size={14} />
              </ActionIcon>
            )}
            {/* The calendar is the fallback, not the primary path — an icon
                rather than the whole input, so typing stays one keystroke away. */}
            <Popover
              opened={pickerOpen}
              onChange={setPickerOpen}
              position="bottom-end"
              withinPortal
              shadow="md"
            >
              <Popover.Target>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="xs"
                  aria-label={t('__new__.01-common.actions.pickDateTime')}
                  onClick={() => {
                    // Anchor on the value at the moment of opening — not once at
                    // mount, and not on wherever the operator paged to last time.
                    if (!pickerOpen) setPickerMonth(parts.date ?? todayInVnDateString());
                    setPickerOpen((o) => !o);
                  }}
                >
                  <IconCalendar size={15} />
                </ActionIcon>
              </Popover.Target>
              <Popover.Dropdown>
                <Stack gap="xs">
                  <DatePicker
                    value={parts.date}
                    date={pickerMonth ?? undefined}
                    onDateChange={setPickerMonth}
                    onChange={(d) => setFromPicker(d, parts.time)}
                  />
                  <TimeInput
                    value={parts.time}
                    onChange={(e) => setFromPicker(parts.date, e.currentTarget.value)}
                  />
                </Stack>
              </Popover.Dropdown>
            </Popover>
          </Group>
        )
      }
    />
  );
}
