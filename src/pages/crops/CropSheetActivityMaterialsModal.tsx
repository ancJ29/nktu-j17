import { Badge, Button, Group, Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { MaterialLinesEditor } from '@/components/MaterialLinesEditor';
import { ResponsiveModal } from '@/components/ResponsiveModal';
import type { MaterialLine } from '@/types';

type Props = {
  readonly cell: { day: number; columnKey: string; columnLabel: string } | null;
  readonly totalDays: number;
  readonly lines: MaterialLine[];
  readonly onChange: (day: number, columnKey: string, lines: MaterialLine[]) => void;
  readonly onClose: () => void;
  readonly editable: boolean;
  readonly dirty: boolean;
  readonly saving: boolean;
  readonly onSave: () => void;
};

export function CropSheetActivityMaterialsModal({
  cell,
  totalDays,
  lines,
  onChange,
  onClose,
  editable,
  dirty,
  saving,
  onSave,
}: Props) {
  const { t } = useTranslation();

  return (
    <ResponsiveModal
      opened={cell !== null}
      onClose={onClose}
      size="lg"
      title={
        cell && (
          <Group gap="xs" wrap="wrap">
            <Text fw={700} size="sm">
              {cell.columnLabel}
            </Text>
            <Badge variant="light" color="primary" size="sm" radius="sm" tt="none">
              {t('crops.sheet.day.title', { day: cell.day, total: totalDays })}
            </Badge>
          </Group>
        )
      }
    >
      {cell && (
        <Stack gap="md">
          <MaterialLinesEditor
            value={lines}
            onChange={(next) => onChange(cell.day, cell.columnKey, next)}
            disabled={!editable}
          />
          <Group justify="flex-end" gap="sm">
            <Button variant="default" size="sm" onClick={onClose} disabled={saving}>
              {t('__new__.01-common.actions.close')}
            </Button>
            {editable && (
              <Button size="sm" loading={saving} disabled={!dirty} onClick={onSave}>
                {t('__new__.01-common.actions.save')}
              </Button>
            )}
          </Group>
        </Stack>
      )}
    </ResponsiveModal>
  );
}
