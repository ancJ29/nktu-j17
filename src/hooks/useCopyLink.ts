import { useCallback } from 'react';
import { notifications } from '@mantine/notifications';
import { useTranslation } from 'react-i18next';

export function useCopyLink(): () => Promise<void> {
  const { t } = useTranslation();
  return useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      notifications.show({
        color: 'green',
        message: t('common.labels.linkCopied'),
        autoClose: 2000,
      });
    } catch {
      notifications.show({
        color: 'red',
        message: t('common.labels.linkCopyError'),
      });
    }
  }, [t]);
}
