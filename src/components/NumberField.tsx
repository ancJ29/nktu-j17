import { NumberInput, type NumberInputProps } from '@mantine/core';
import { useState, type FocusEvent, type Ref } from 'react';
import { NUMBER_MARKS, parseLocaleNumber } from '@/utils/number';

/**
 * Numeric sibling of `<DateField>`: a Mantine `NumberInput`
 * that is safe to drive from a plain `number` state.
 *
 * **The bug it exists to prevent** (reported by a client 2026-08-04 on the SO
 * form): a controlled `NumberInput` whose `onChange` coerces the empty string
 * to a number — `typeof v === 'number' ? v : Number(v) || 0` — cannot be
 * emptied. Clearing the box emits `''`, the handler turns that into `0`, the
 * value round-trips back into the input, and the operator is staring at a `0`
 * they did not type with the caret parked in front of it. The next keystroke
 * *prepends*: clear a `10`, press `1`, get `10` again. Whatever they do, the
 * old magnitude sticks.
 *
 * The coercion itself is not the mistake — the model does want a number. The
 * mistake is letting the coerced value drive the *display* while the operator
 * is still typing. So this component splits the two:
 *
 * - the **model** gets a number on every keystroke, exactly as before —
 *   `emptyValue` while the box is empty;
 * - the **display** is owned by what was typed until the field is committed
 *   (blur), so an empty box stays empty and a half-typed `1.` stays `1.`
 *   instead of collapsing to `1`.
 *
 * On blur the draft is dropped and the model value shows through again, so a
 * field left empty visibly settles back to `emptyValue` rather than lying.
 *
 * ```tsx
 * // required number — empty means 0 while the operator retypes
 * <NumberField value={item.quantity} emptyValue={0}
 *   onChange={(v) => form.setFieldValue(`items.${idx}.quantity`, v)} />
 *
 * // optional number — empty means "not set"
 * <NumberField value={item.extraQuantity} onChange={(v) => patch({ extra: v })} />
 * ```
 *
 * **It GROUPS its digits** (2026-09-08), in the marks this browser prints
 * with — the ones `formatNumber` uses, so the box reads the same way as every
 * figure beside it. `67210000` in a money field is a magnitude the operator
 * has to count out; `67,210,000` is one they can see. It is a default rather
 * than a per-call prop because the alternative is what the app already learned
 * from litres: a rule that lives at call sites is a rule one call site
 * eventually misses.
 *
 * **Fuel volumes are the exception and they do NOT come through here** — they
 * spread `LITRE_INPUT_PROPS` into a bare `NumberInput`, because a grouped
 * litre figure is a 1000× hazard with a real incident behind it (see
 * `formatLitres`). A caller that needs the same can pass
 * `thousandSeparator=""`; the defaults sit before the prop spread for exactly
 * that reason.
 *
 * **Not needed for `form.getInputProps(...)` fields.** Mantine's `useForm`
 * stores the `''` verbatim instead of coercing it, so those inputs already
 * behave — declare the field as `number | ''` and coerce at submit time. Reach
 * for `NumberField` when the value is held outside Mantine form state, or when
 * a handler has to run alongside the write (cross-field sync, scaling set
 * components, …). See `docs/memo/design-system.md` § Numeric input.
 */

type NumberFieldBaseProps = Omit<NumberInputProps, 'value' | 'defaultValue' | 'onChange'> & {
  /**
   * The underlying input, for a caller that has to put the caret in it — the
   * sales-order form focuses the quantity of the row its item search just
   * added. Declared because Mantine's props type does not carry `ref`; React
   * 19 passes it through as an ordinary prop from there.
   */
  ref?: Ref<HTMLInputElement>;
};

export type NumberFieldProps =
  /** Required number: `emptyValue` is what an empty box means, so `onChange` never sees `undefined`. */
  | (NumberFieldBaseProps & {
      value: number;
      emptyValue: number;
      onChange: (value: number) => void;
    })
  /** Optional number: an empty box means "not set". */
  | (NumberFieldBaseProps & {
      value: number | undefined;
      emptyValue?: undefined;
      onChange: (value: number | undefined) => void;
    });

export function NumberField({ value, emptyValue, onChange, onBlur, ...props }: NumberFieldProps) {
  // What the operator has typed since the field last settled. `null` = nothing
  // pending, so the model value shows through. This is the whole fix: while a
  // draft is held, the value we just emitted cannot bounce back into the box.
  const [draft, setDraft] = useState<string | null>(null);

  const emit = onChange as (value: number | undefined) => void;

  const handleChange = (next: number | string) => {
    if (typeof next === 'number') {
      // A committed number — Mantine already parsed it, nothing to preserve.
      setDraft(null);
      emit(next);
      return;
    }
    // A string means the box does not hold a finished number: it is empty, or
    // mid-entry (`1.`, `-`, `1e`). Keep the text, give the model the best
    // number available.
    setDraft(next);
    // Through the locale-aware parser, never `Number()`: the box groups its
    // digits, so its own display does not parse with the built-in.
    const parsed = parseLocaleNumber(next);
    emit(Number.isFinite(parsed) ? parsed : emptyValue);
  };

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    setDraft(null);
    onBlur?.(event);
  };

  return (
    <NumberInput
      thousandSeparator={NUMBER_MARKS.group}
      decimalSeparator={NUMBER_MARKS.decimal}
      {...props}
      value={draft ?? value ?? ''}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
}
