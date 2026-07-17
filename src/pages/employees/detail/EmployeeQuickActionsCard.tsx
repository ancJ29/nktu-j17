/**
 * Quick actions — QR login token + set password.
 *
 * Present on mobile too (unlike the danger zone): a QR login is exactly what a
 * warehouse worker needs when opening the app on a second device. Setting a
 * password stays desktop-only.
 *
 * Renders nothing when neither action is available, so the caller can drop it in
 * unconditionally.
 */

import { Button, Stack } from '@mantine/core';
import { IconBolt, IconLock, IconQrcode } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

import { SectionCard } from '@/components/SectionCard';
import { device } from '@credo/base-ui/utils';
import { perms } from '@/utils/permission';

const isMobile = device.isMobile;
const canSetPassword = perms.employee.canSetPassword();

type EmployeeQuickActionsCardProps = {
  /** Already folded: feature flags × permission × the employee's own allowLogin. */
  readonly allowLogin: boolean;
  readonly onOpenLoginToken: () => void;
  readonly onOpenPasswordModal: () => void;
};

export function EmployeeQuickActionsCard({
  allowLogin,
  onOpenLoginToken,
  onOpenPasswordModal,
}: EmployeeQuickActionsCardProps) {
  const { t } = useTranslation();

  const showPassword = !isMobile && canSetPassword;
  if (!allowLogin && !showPassword) return null;

  return (
    <SectionCard
      icon={<IconBolt size={14} />}
      title={t('employees.detail.quickActions')}
      padding="md"
    >
      <Stack gap="sm">
        {allowLogin && (
          <Button
            variant="light"
            size="sm"
            leftSection={<IconQrcode size={14} />}
            onClick={onOpenLoginToken}
            fullWidth
          >
            {t('employees.loginToken.button')}
          </Button>
        )}
        {showPassword && (
          <Button
            variant="light"
            size="sm"
            leftSection={<IconLock size={14} />}
            onClick={onOpenPasswordModal}
            fullWidth
          >
            {t('__new__.07-entities.employees.dangerZone.changePasswordButton')}
          </Button>
        )}
      </Stack>
    </SectionCard>
  );
}
