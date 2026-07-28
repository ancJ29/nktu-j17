import { ActionIcon, Box, Group, Stack, Title, Tooltip } from '@mantine/core';
import { IconCamera } from '@tabler/icons-react';
import { CodeLabel, ColorBadge } from '@credo/base-ui/components';
import { useTranslation } from 'react-i18next';

import { ActiveBadge } from '@/components/badges';
import { EmployeeAvatar } from '@/components/EmployeeAvatar';
import { TimestampLine } from '@/components/TimestampLine';
import type { Employee } from '@/types';
import { device } from '@credo/base-ui/utils';
import { hasDepartmentForEmployees, hasPositionForEmployees } from '@/utils/permission';

const isMobile = device.isMobile;
const hasDepartment = hasDepartmentForEmployees();
const hasPosition = hasPositionForEmployees();

type EmployeeDetailHeaderProps = {
  readonly employee: Employee;
  readonly profileImageUrl: string | undefined;
  readonly canEditProfileImage: boolean;
  readonly onOpenProfileImage: () => void;
  readonly resolveDepartment: (value: string) => string;
  readonly resolvePosition: (value: string) => string;
};

export function EmployeeDetailHeader({
  employee,
  profileImageUrl,
  canEditProfileImage,
  onOpenProfileImage,
  resolveDepartment,
  resolvePosition,
}: EmployeeDetailHeaderProps) {
  const { t } = useTranslation();

  const avatar = (
    <EmployeeAvatar
      imageUrl={profileImageUrl}
      name={employee.name}
      size={isMobile ? 56 : 72}
      initialSize={isMobile ? '24px' : '30px'}
    />
  );

  const employeeIcon = canEditProfileImage ? (
    <Tooltip label={t('employees.detail.profileImageChange')} withArrow>
      <Box
        role="button"
        tabIndex={0}
        onClick={onOpenProfileImage}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpenProfileImage();
          }
        }}
        pos="relative"
        style={{ cursor: 'pointer', display: 'inline-block', flexShrink: 0 }}
      >
        {avatar}
        <ActionIcon
          component="span"
          size="sm"
          radius="xl"
          variant="filled"
          aria-hidden
          pos="absolute"
          style={{ bottom: -4, right: -4, pointerEvents: 'none' }}
        >
          <IconCamera size={12} />
        </ActionIcon>
      </Box>
    </Tooltip>
  ) : (
    avatar
  );

  const departmentLabel =
    hasDepartment && employee.department ? resolveDepartment(employee.department) : null;
  const positionLabel =
    hasPosition && employee.position ? resolvePosition(employee.position) : null;

  const badges = (
    <Group gap={6} wrap="wrap" mt={isMobile ? undefined : 2}>
      <ActiveBadge
        isActive={employee.isActive}
        activeLabel={t('common.status.active')}
        inactiveLabel={t('common.status.inactive')}
        size="sm"
      />
      <ColorBadge label={departmentLabel} />
      <ColorBadge label={positionLabel} />
    </Group>
  );

  if (isMobile) {
    return (
      <Stack gap="sm">
        <Group gap="md" wrap="nowrap" align="flex-start">
          {employeeIcon}
          <Stack gap={4} style={{ minWidth: 0, flex: 1 }}>
            <Title order={5} lh={1.2}>
              {employee.name}
            </Title>
            {employee.code && <CodeLabel code={employee.code} />}
          </Stack>
        </Group>
        {badges}
      </Stack>
    );
  }

  return (
    <Group align="flex-start" justify="space-between" wrap="nowrap" gap="lg">
      <Group gap="md" wrap="nowrap" align="flex-start" style={{ flex: 1, minWidth: 0 }}>
        {employeeIcon}
        <Stack gap={6} style={{ minWidth: 0 }}>
          <Title order={3} lh={1.2}>
            {employee.name}
          </Title>
          {employee.code && <CodeLabel code={employee.code} />}
          {badges}
        </Stack>
      </Group>
      <Stack gap="xs" align="flex-end" style={{ flexShrink: 0 }}>
        <TimestampLine updatedAt={employee.updatedAt} createdAt={employee.createdAt} />
      </Stack>
    </Group>
  );
}
