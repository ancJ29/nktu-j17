import { Button, Group, Modal, Stack, Text } from '@mantine/core';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

type ConfirmModalProps = {
  opened: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmColor?: string;
  loading?: boolean;

  children?: ReactNode;

  confirmDisabled?: boolean;
};

export function ConfirmModal({
  opened,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  confirmColor = 'red',
  loading = false,
  children,
  confirmDisabled = false,
}: ConfirmModalProps) {
  const { t } = useTranslation();

  return (
    <Modal opened={opened} onClose={onClose} title={title} centered>
      <Stack gap="md">
        <Text size="sm">{message}</Text>
        {children}
        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={onClose} size="sm">
            {t('__new__.01-common.actions.cancel')}
          </Button>
          <Button
            color={confirmColor}
            onClick={onConfirm}
            loading={loading}
            disabled={confirmDisabled}
            size="sm"
          >
            {confirmLabel ?? t('__new__.01-common.actions.remove')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
