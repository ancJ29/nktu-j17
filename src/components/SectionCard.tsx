import type { ReactNode } from 'react';
import { Button, Card, Divider, Group, Stack, ThemeIcon } from '@mantine/core';
import { IconEdit } from '@tabler/icons-react';
import { FieldLabel } from '@credo/base-ui/components';

/**
 * V2 detail-page section card: icon-led uppercase title header, optional
 * right-side actions, optional card-level edit mode.
 *
 * When `editable` is true and not `editing`, the header right slot shows a
 * single "Edit" button (replacing any custom `actions`). When `editing` is
 * true, a Save/Cancel footer renders at the bottom — the caller controls the
 * display-vs-input swap inside `children`.
 *
 * See `docs/memo/design-system.md` for the full pattern.
 */
export type SectionCardEditLabels = { edit: string; save: string; cancel: string };

export type SectionCardProps = {
  readonly icon: ReactNode;
  readonly title: string;
  readonly actions?: ReactNode;
  readonly padding?: 'xs' | 'sm' | 'md' | 'lg';
  readonly children: ReactNode;
  /** Show a single "Edit" button in the card header. When `editing` is true,
   *  a Save/Cancel footer renders at the bottom of the card. */
  readonly editable?: boolean;
  readonly editing?: boolean;
  readonly saving?: boolean;
  readonly onEdit?: () => void;
  readonly onCancel?: () => void;
  readonly onSave?: () => void;
  readonly labels?: SectionCardEditLabels;
};

export function SectionCard({
  icon,
  title,
  actions,
  padding = 'lg',
  children,
  editable,
  editing,
  saving,
  onEdit,
  onCancel,
  onSave,
  labels,
}: SectionCardProps) {
  const editButton =
    editable && !editing && onEdit ? (
      <Button
        variant="default"
        size="compact-sm"
        leftSection={<IconEdit size={14} />}
        onClick={onEdit}
      >
        {labels?.edit ?? 'Edit'}
      </Button>
    ) : null;

  return (
    <Card withBorder radius="md" padding={padding}>
      <Stack gap="md">
        <Group justify="space-between" wrap="nowrap">
          <Group gap={8} wrap="nowrap">
            <ThemeIcon size={24} radius="sm" variant="light" color="gray">
              {icon}
            </ThemeIcon>
            <FieldLabel c={undefined} fw={700} lts={0.5}>
              {title}
            </FieldLabel>
          </Group>
          {editButton ?? actions}
        </Group>
        {children}
        {editing && (
          <>
            <Divider />
            <Group gap="xs" justify="flex-end">
              <Button variant="default" size="compact-sm" onClick={onCancel} disabled={saving}>
                {labels?.cancel ?? 'Cancel'}
              </Button>
              <Button size="compact-sm" onClick={onSave} loading={saving}>
                {labels?.save ?? 'Save'}
              </Button>
            </Group>
          </>
        )}
      </Stack>
    </Card>
  );
}
