import {
  ActionIcon,
  Box,
  Button,
  Group,
  Select,
  Stack,
  TagsInput,
  Text,
  Textarea,
  TextInput,
  Tooltip,
  type SelectProps,
  type TagsInputProps,
  type TextareaProps,
  type TextInputProps,
} from '@mantine/core';
import { IconPencil, IconX } from '@tabler/icons-react';
import { useCallback, useState, type ReactNode } from 'react';

// ── Base component ──────────────────────────────────────────────────────────

/** Labels for the trigger + action buttons. Caller supplies i18n strings. */
export type InlineEditLabels = {
  edit: string;
  save: string;
  cancel: string;
};

type InlineEditorProps<T> = {
  readonly value: T;
  readonly onChange: (next: T) => void;
  readonly onSubmit: () => void;
  readonly onCancel: () => void;
  readonly saving: boolean;
};

type InlineEditFieldProps<T> = {
  readonly value: T;
  readonly onSave: (next: T) => Promise<void>;
  readonly renderDisplay: (value: T) => ReactNode;
  readonly renderEditor: (props: InlineEditorProps<T>) => ReactNode;
  readonly canEdit?: boolean;
  /** Submit on Enter. Off by default so textareas and multi-value inputs behave normally. */
  readonly submitOnEnter?: boolean;
  /** Compare helper to skip saves that don't change anything. Defaults to JSON.stringify. */
  readonly equals?: (a: T, b: T) => boolean;
  /** i18n strings. Falls back to English defaults when omitted. */
  readonly labels?: InlineEditLabels;
};

const defaultEquals = <T,>(a: T, b: T) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Pencil-trigger inline editor. Display mode shows the value + a pencil
 * button; edit mode swaps in the editor and exposes Save / Cancel buttons.
 *
 * The caller's `onSave` is awaited. A resolved promise exits edit mode; a
 * rejected promise keeps the editor open so the caller can surface a toast
 * and let the operator retry.
 */
export function InlineEditField<T>({
  value,
  onSave,
  renderDisplay,
  renderEditor,
  canEdit = true,
  submitOnEnter = false,
  equals = defaultEquals,
  labels,
}: InlineEditFieldProps<T>) {
  const { edit = 'Edit', save = 'Save', cancel: cancelLabel = 'Cancel' } = labels ?? {};
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<T>(value);
  const [saving, setSaving] = useState(false);

  const begin = useCallback(() => {
    setDraft(value);
    setEditing(true);
  }, [value]);

  const cancel = useCallback(() => {
    setDraft(value);
    setEditing(false);
  }, [value]);

  const submit = useCallback(async () => {
    if (saving) return;
    if (equals(draft, value)) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(draft);
      setEditing(false);
    } catch {
      // Caller surfaces the error; stay in edit mode.
    } finally {
      setSaving(false);
    }
  }, [saving, draft, value, equals, onSave]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        cancel();
      } else if (submitOnEnter && e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submit();
      }
    },
    [cancel, submit, submitOnEnter],
  );

  if (editing) {
    return (
      <Stack gap="xs" onKeyDown={handleKeyDown}>
        {renderEditor({
          value: draft,
          onChange: setDraft,
          onSubmit: submit,
          onCancel: cancel,
          saving,
        })}
        <Group gap="xs" justify="flex-end">
          <Button
            variant="subtle"
            size="compact-sm"
            onClick={cancel}
            disabled={saving}
            leftSection={<IconX size={14} />}
          >
            {cancelLabel}
          </Button>
          <Button size="compact-sm" onClick={submit} loading={saving}>
            {save}
          </Button>
        </Group>
      </Stack>
    );
  }

  return (
    <Group gap={6} wrap="nowrap" align="flex-start">
      <Box style={{ flex: 1, minWidth: 0 }}>{renderDisplay(value)}</Box>
      {canEdit && (
        <Tooltip label={edit} withArrow position="left">
          <ActionIcon variant="subtle" size="sm" color="gray" onClick={begin} aria-label={edit}>
            <IconPencil size={14} />
          </ActionIcon>
        </Tooltip>
      )}
    </Group>
  );
}

// ── Specialized wrappers ────────────────────────────────────────────────────

/**
 * What an empty value looks like, in one place.
 *
 * **`emptyPlaceholder` is a `string`, not a `ReactNode`, and the type is the
 * fix.** It used to be a node whose default was itself a `<Text>`, while the
 * textarea wrapper — alone among the four — wrapped it in another one. Mantine's
 * `Text` renders a `<p>`, so the default placeholder produced `<p>` inside
 * `<p>`: invalid HTML, and React logs it on every render of a note field with no
 * note. Narrowing the type is what stops the next caller re-creating it, since
 * the only way back in was passing an element.
 */
const EMPTY_DASH = '—';

function EmptyValue({ text }: { readonly text: string }) {
  // Nothing at all for a deliberately blank placeholder — an empty <p> is a
  // stray line box in a table cell, which is where `''` is passed from.
  if (!text) return null;
  return (
    <Text size="sm" c="dimmed" fs="italic">
      {text}
    </Text>
  );
}

type CommonInlineProps = {
  readonly canEdit?: boolean;
  /** Shown when the value is empty. Plain text — the component styles it. */
  readonly emptyPlaceholder?: string;
  readonly labels?: InlineEditLabels;
};

// Single-line text field (TextInput, submits on Enter).
export function InlineTextField({
  value,
  onSave,
  canEdit,
  emptyPlaceholder = EMPTY_DASH,
  labels,
  ...inputProps
}: CommonInlineProps & {
  readonly value: string;
  readonly onSave: (next: string) => Promise<void>;
} & Omit<TextInputProps, 'value' | 'onChange'>) {
  return (
    <InlineEditField<string>
      value={value}
      onSave={onSave}
      canEdit={canEdit}
      labels={labels}
      submitOnEnter
      renderDisplay={(v) =>
        v ? (
          <Text size="sm" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {v}
          </Text>
        ) : (
          <EmptyValue text={emptyPlaceholder} />
        )
      }
      renderEditor={({ value: v, onChange }) => (
        <TextInput
          {...inputProps}
          value={v}
          onChange={(e) => onChange(e.currentTarget.value)}
          data-autofocus
          autoFocus
        />
      )}
    />
  );
}

// Multi-line text (Textarea, Enter inserts newline — submit via button).
export function InlineTextareaField({
  value,
  onSave,
  canEdit,
  emptyPlaceholder = EMPTY_DASH,
  labels,
  minRows = 3,
  ...textareaProps
}: CommonInlineProps & {
  readonly value: string;
  readonly onSave: (next: string) => Promise<void>;
} & Omit<TextareaProps, 'value' | 'onChange'>) {
  return (
    <InlineEditField<string>
      value={value}
      onSave={onSave}
      canEdit={canEdit}
      labels={labels}
      renderDisplay={(v) =>
        v ? (
          <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
            {v}
          </Text>
        ) : (
          <EmptyValue text={emptyPlaceholder} />
        )
      }
      renderEditor={({ value: v, onChange }) => (
        <Textarea
          {...textareaProps}
          minRows={minRows}
          autosize
          value={v}
          onChange={(e) => onChange(e.currentTarget.value)}
          data-autofocus
          autoFocus
        />
      )}
    />
  );
}

// Single-value Select (lookup-backed).
export function InlineSelectField({
  value,
  onSave,
  canEdit,
  data,
  renderValueDisplay,
  emptyPlaceholder = EMPTY_DASH,
  labels,
  ...selectProps
}: CommonInlineProps & {
  readonly value: string;
  readonly onSave: (next: string) => Promise<void>;
  readonly data: ReadonlyArray<{ value: string; label: string }>;
  /** Render the resolved label. Defaults to a plain Text. */
  readonly renderValueDisplay?: (value: string, label: string) => ReactNode;
} & Omit<SelectProps, 'value' | 'onChange' | 'data'>) {
  const lookup = (v: string) => data.find((o) => o.value === v)?.label ?? v;
  return (
    <InlineEditField<string>
      value={value}
      onSave={onSave}
      canEdit={canEdit}
      labels={labels}
      submitOnEnter
      renderDisplay={(v) => {
        if (!v) return <EmptyValue text={emptyPlaceholder} />;
        const label = lookup(v);
        return renderValueDisplay ? renderValueDisplay(v, label) : <Text size="sm">{label}</Text>;
      }}
      renderEditor={({ value: v, onChange }) => (
        <Select
          {...selectProps}
          data={[...data]}
          value={v}
          onChange={(next) => onChange(next ?? '')}
          searchable
          clearable
          data-autofocus
          autoFocus
        />
      )}
    />
  );
}

// Multi-value tags.
export function InlineTagsField({
  value,
  onSave,
  canEdit,
  data,
  renderTag,
  emptyPlaceholder = EMPTY_DASH,
  labels,
  ...tagsProps
}: CommonInlineProps & {
  readonly value: ReadonlyArray<string>;
  readonly onSave: (next: string[]) => Promise<void>;
  readonly data?: ReadonlyArray<string>;
  /** Custom display for each tag. Defaults to a plain Text list. */
  readonly renderTag?: (tag: string) => ReactNode;
} & Omit<TagsInputProps, 'value' | 'onChange' | 'data'>) {
  return (
    <InlineEditField<string[]>
      value={[...value]}
      onSave={onSave}
      canEdit={canEdit}
      labels={labels}
      renderDisplay={(arr) => {
        if (arr.length === 0) return <EmptyValue text={emptyPlaceholder} />;
        return (
          <Group gap={6} wrap="wrap">
            {arr.map((tag) => (
              <Box key={tag}>{renderTag ? renderTag(tag) : <Text size="sm">{tag}</Text>}</Box>
            ))}
          </Group>
        );
      }}
      renderEditor={({ value: v, onChange }) => (
        <TagsInput
          {...tagsProps}
          data={data ? [...data] : undefined}
          value={v}
          onChange={onChange}
          data-autofocus
          autoFocus
        />
      )}
    />
  );
}
