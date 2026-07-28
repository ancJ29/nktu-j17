import { Alert, Button, Group, Modal, Stack, Text, Textarea } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import { device } from '@credo/base-ui/utils';
import { useTranslation } from 'react-i18next';
import { MobileFilterDrawer } from '@/components/MobileFilterDrawer';

const isMobile = device.isMobile;

type StatusChangeModalProps = {
  readonly opened: boolean;
  readonly onClose: () => void;
  readonly onConfirm: () => void;
  readonly loading: boolean;
  readonly title: string;
  readonly message: string;

  readonly confirmLabel: string;
  readonly confirmColor?: string;

  readonly warning?: string;
  readonly note: string;
  readonly onNoteChange: (v: string) => void;
  readonly notePlaceholder: string;
};

export function StatusChangeModal({
  opened,
  onClose,
  onConfirm,
  loading,
  title,
  message,
  confirmLabel,
  confirmColor,
  warning,
  note,
  onNoteChange,
  notePlaceholder,
}: StatusChangeModalProps) {
  const { t } = useTranslation();

  const body = (
    <Stack gap="md">
      <Text size="sm">{message}</Text>
      {warning && (
        <Alert color="orange" variant="light" icon={<IconAlertTriangle size={16} />}>
          {warning}
        </Alert>
      )}
      <Textarea
        label={t('__new__.01-common.labels.note')}
        placeholder={notePlaceholder}
        value={note}
        onChange={(e) => onNoteChange(e.currentTarget.value)}
        autosize
        minRows={2}
      />
      <Group justify="flex-end" gap="sm">
        <Button variant="default" size="sm" onClick={onClose} disabled={loading}>
          {t('__new__.01-common.actions.cancel')}
        </Button>
        <Button size="sm" color={confirmColor} loading={loading} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </Group>
    </Stack>
  );

  if (isMobile) {
    return (
      <MobileFilterDrawer opened={opened} onClose={onClose} title={title} height="auto">
        {body}
      </MobileFilterDrawer>
    );
  }

  return (
    <Modal opened={opened} onClose={onClose} title={title} size="sm" centered>
      {body}
    </Modal>
  );
}
