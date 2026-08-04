import type { ReactNode } from 'react';
import { ActionIcon, Box, Card, Group, Stack, Text } from '@mantine/core';
import { IconChevronDown, IconChevronRight, IconPencil, IconTrash } from '@tabler/icons-react';
import type { OperationLog } from '@/types';
import type { GroupedRow, OperationLogConfig, TFn } from './operationLogConfig';
import { LogPhotoCell } from './OperationLogPhotos';

type Props = {
  readonly rows: GroupedRow[];

  readonly visibleLogs: OperationLog[];
  readonly config: OperationLogConfig;
  readonly t: TFn;
  readonly canEdit: boolean;
  readonly canDelete: boolean;
  readonly onEdit: (log: OperationLog) => void;
  readonly onDelete: (log: OperationLog) => void;
  readonly expanded: ReadonlySet<string>;
  readonly onToggleExpanded: (id: string) => void;
  readonly onOpenGallery: (log: OperationLog) => void;
};

function FieldLine({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <Group gap="sm" wrap="nowrap" align="flex-start" justify="space-between">
      <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
        {label}
      </Text>
      <Box style={{ minWidth: 0, textAlign: 'right' }}>{children}</Box>
    </Group>
  );
}

export function OperationLogCards({
  rows,
  visibleLogs,
  config,
  t,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  expanded,
  onToggleExpanded,
  onOpenGallery,
}: Props) {
  const [headerColumn, ...restColumns] = config.columns;
  const expandable = Boolean(config.renderExpanded);
  const photoCfg = config.photos;

  return (
    <Stack gap="sm">
      {rows.map(({ log, grouped, firstOfGroup }, index) => {
        const tone = config.rowTone?.(log, visibleLogs);
        const isOpen = expanded.has(log.id);

        const locked = config.rowLocked?.(log) ?? false;
        const showActions = (canEdit || canDelete) && !locked;

        return (
          <Card
            key={log.id}
            withBorder
            radius="md"
            padding="sm"

            bg={
              tone?.danger
                ? 'var(--mantine-color-red-light)'
                : grouped
                  ? 'var(--mantine-color-default-hover)'
                  : undefined
            }
            style={
              firstOfGroup && index > 0 ? { marginTop: 'var(--mantine-spacing-md)' } : undefined
            }
          >
            <Stack gap={6}>
              <Group gap="xs" wrap="nowrap" justify="space-between" align="center">
                <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
                  {expandable && (
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      size="sm"
                      onClick={() => onToggleExpanded(log.id)}
                      aria-label={t('operationLogs.cards.toggleDetail')}
                    >
                      {isOpen ? <IconChevronDown size={15} /> : <IconChevronRight size={15} />}
                    </ActionIcon>
                  )}
                  <Text fw={700} size="sm">
                    {headerColumn?.render(log)}
                  </Text>
                </Group>
                <Group gap={2} wrap="nowrap" style={{ flexShrink: 0 }}>
                  {photoCfg && (
                    <LogPhotoCell
                      photos={log.extra?.photos}
                      onOpen={() => onOpenGallery(log)}
                      t={t}
                    />
                  )}
                  {showActions && canEdit && (
                    <ActionIcon variant="subtle" color="gray" size="sm" onClick={() => onEdit(log)}>
                      <IconPencil size={15} />
                    </ActionIcon>
                  )}
                  {showActions && canDelete && (
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      size="sm"
                      onClick={() => onDelete(log)}
                    >
                      <IconTrash size={15} />
                    </ActionIcon>
                  )}
                </Group>
              </Group>

              {restColumns.map((col) => (
                <FieldLine key={col.header} label={t(col.header)}>
                  <Text size="sm" fw={col.emphasize ? 600 : undefined}>
                    {col.render(log)}
                  </Text>
                </FieldLine>
              ))}

              {/* The table puts this on a hover tooltip, which a touch screen has
                  no way to reach — so on a card the reason is simply written out.
                  Losing it entirely is how "why is this row red?" goes unanswered. */}
              {tone?.danger && tone.tooltipKey && (
                <Text size="xs" c="red" fw={500}>
                  {t(tone.tooltipKey)}
                </Text>
              )}

              {expandable && isOpen && (
                <Box style={{ overflowX: 'auto' }} pt={4}>
                  {config.renderExpanded?.(log, t)}
                </Box>
              )}
            </Stack>
          </Card>
        );
      })}
    </Stack>
  );
}
