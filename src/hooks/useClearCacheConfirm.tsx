import { useCallback } from 'react';
import { useDisclosure } from '@mantine/hooks';
import { useTranslation } from 'react-i18next';
import { ConfirmModal } from '@/components/ConfirmModal';
import { forceClearCache } from '@/utils/forceClearCache';

export function useClearCacheConfirm(): { open: () => void; modal: React.ReactNode } {
  const { t } = useTranslation();
  const [opened, { open, close }] = useDisclosure(false);

  const confirm = useCallback(() => {
    forceClearCache().catch(console.error);
  }, []);

  return {
    open,
    modal: (
      <ConfirmModal
        opened={opened}
        onClose={close}
        onConfirm={confirm}
        title={t('menu.clearCache')}
        message={t('menu.clearCacheConfirm')}
        confirmLabel={t('menu.clearCache')}
      />
    ),
  };
}
