import { NumberInput, type NumberInputProps } from '@mantine/core';
import { useState, type FocusEvent } from 'react';

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
 * **Not needed for `form.getInputProps(...)` fields.** Mantine's `useForm`
 * stores the `''` verbatim instead of coercing it, so those inputs already
 * behave — declare the field as `number | ''` and coerce at submit time. Reach
 * for `NumberField` when the value is held outside Mantine form state, or when
 * a handler has to run alongside the write (cross-field sync, scaling set
 * components, …). See `docs/memo/design-system.md` § Numeric input.
 */

type NumberFieldBaseProps = Omit<NumberInputProps, 'value' | 'defaultValue' | 'onChange'>;

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
    const parsed = next.trim() === '' ? Number.NaN : Number(next);
    emit(Number.isFinite(parsed) ? parsed : emptyValue);
  };

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    setDraft(null);
    onBlur?.(event);
  };

  return (
    <NumberInput
      {...props}
      value={draft ?? value ?? ''}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
}
