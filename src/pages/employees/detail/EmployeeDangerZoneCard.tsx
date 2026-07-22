/**
 * Danger zone — deactivate / delete.
 *
 * Split by device on purpose: **deactivate is available on mobile, delete is
 * not**. Locking an account is the one danger-zone action with a real field
 * use-case — a manager who learns of a leaked account or a walk-out needs to cut
 * access from their phone, and it is reversible. Delete is permanent, so it
 * stays desktop-only, the same call the product team made for "delete sales
 * order". Mobile therefore takes the sanctioned Variant F shape (one full-width
 * button where the danger zone sits on desktop), not a shrunken red card — see
 * `docs/guidelines/single-mode-modules/detail-page-pattern.md § F`.
 * Renders nothing when the operator has no applicable right, so the caller can
 * drop it in unconditionally.
 *
 * Both actions are more consequential than they look: `isActive` is the c-sso
 * login gate, and "delete" is a soft delete that flips the same flag — so either
 * button revokes the employee's ability to sign in. The confirm modals and the
 * SSO-outcome toasts live in `useEmployeeDangerZone`.
 */

import {
  ActionIcon,
  Button,
  Card,
  Divider,
  Group,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
} from '@mantine/core';
import { IconAlertTriangle, IconLock, IconLockOpen, IconTrash } from '@tabler/icons-react';
import { FieldLabel } from '@credo/base-ui/components';
import { useTranslation } from 'react-i18next';

import type { Employee } from '@/types';
import { device } from '@credo/base-ui/utils';
import { perms } from '@/utils/permission';

const isMobile = device.isMobile;
const canDelete = perms.employee.canDelete();
const canToggleStatus = perms.employee.canToggleStatus();

type EmployeeDangerZoneCardProps = {
  readonly employee: Employee;
  readonly onToggleStatus: () => void;
  readonly onDelete: () => void;
};

export function EmployeeDangerZoneCard({
  employee,
  onToggleStatus,
  onDelete,
}: EmployeeDangerZoneCardProps) {
  const { t } = useTranslation();

  if (isMobile) {
    if (!canToggleStatus) return null;
    return (
      <Button
        variant="light"
        color={employee.isActive ? 'orange' : 'green'}
        size="sm"
        leftSection={employee.isActive ? <IconLock size={16} /> : <IconLockOpen size={16} />}
        onClick={onToggleStatus}
        fullWidth
      >
        {employee.isActive
          ? t('__new__.07-entities.employees.dangerZone.disableButton')
          : t('__new__.07-entities.employees.dangerZone.enableButton')}
      </Button>
    );
  }

  if (!canToggleStatus && !canDelete) return null;

  return (
    <Card
      withBorder
      radius="md"
      padding="lg"
      style={{
        borderColor: 'var(--mantine-color-red-3)',
        background: 'var(--mantine-color-red-0)',
      }}
    >
      <Stack gap="md">
        <Group gap={8}>
          <ThemeIcon size={20} radius="sm" variant="transparent" color="red">
            <IconAlertTriangle size={14} />
          </ThemeIcon>
          <FieldLabel c="red" fw={700} lts={0.5}>
            {t('__new__.01-common.dangerZone.title')}
          </FieldLabel>
        </Group>

        {canToggleStatus && (
          <Group justify="space-between" wrap="nowrap" align="flex-start" gap="md">
            <Stack gap={2} style={{ minWidth: 0 }}>
              <Text fw={600} size="sm">
                {employee.isActive
                  ? t('__new__.07-entities.employees.dangerZone.disableEmployee')
                  : t('__new__.07-entities.employees.dangerZone.enableEmployee')}
              </Text>
              <Text size="xs" c="dimmed">
                {employee.isActive
                  ? t('__new__.07-entities.employees.dangerZone.disableEmployeeDesc')
                  : t('__new__.07-entities.employees.dangerZone.enableEmployeeDesc')}
              </Text>
            </Stack>
            <Tooltip
              label={
                employee.isActive
                  ? t('__new__.07-entities.employees.dangerZone.disableButton')
                  : t('__new__.07-entities.employees.dangerZone.enableButton')
              }
              withArrow
            >
              <ActionIcon
                variant="default"
                size="lg"
                color={employee.isActive ? 'orange' : 'green'}
                onClick={onToggleStatus}
              >
                {employee.isActive ? <IconLock size={16} /> : <IconLockOpen size={16} />}
              </ActionIcon>
            </Tooltip>
          </Group>
        )}

        {canToggleStatus && canDelete && <Divider variant="dashed" />}

        {canDelete && (
          <Group justify="space-between" wrap="nowrap" align="flex-start" gap="md">
            <Stack gap={2} style={{ minWidth: 0 }}>
              <Text fw={600} size="sm">
                {t('__new__.07-entities.employees.dangerZone.deleteEmployee')}
              </Text>
              <Text size="xs" c="dimmed">
                {t('__new__.07-entities.employees.dangerZone.deleteEmployeeDesc')}
              </Text>
            </Stack>
            <Tooltip label={t('__new__.01-common.actions.remove')} withArrow>
              <ActionIcon variant="default" size="lg" onClick={onDelete}>
                <IconTrash size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
        )}
      </Stack>
    </Card>
  );
}
