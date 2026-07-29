import { ActionIcon, type ActionIconProps } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconCopy } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

const COPY_TOAST_MS = 2000;

type CopyValueButtonProps = {
  readonly value: string;

  readonly copiedMessage: string;
  readonly size?: ActionIconProps['size'];

  readonly ariaLabel?: string;
};

export function CopyValueButton({
  value,
  copiedMessage,
  size = 'sm',
  ariaLabel,
}: CopyValueButtonProps) {
  const { t } = useTranslation();
  const clipboard = useClipboard({ timeout: 1500 });

  return (
    <ActionIcon
      variant="subtle"
      size={size}
      color={clipboard.copied ? 'teal' : 'gray'}
      aria-label={ariaLabel ?? t('__new__.01-common.actions.copy')}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        clipboard.copy(value);
        notifications.show({
          color: 'teal',
          message: copiedMessage,
          autoClose: COPY_TOAST_MS,
        });
      }}
    >
      {clipboard.copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
    </ActionIcon>
  );
}
