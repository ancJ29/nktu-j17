import { Card, Group, Skeleton, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconUsers } from '@tabler/icons-react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';

import { ROUTES } from '@/constants/routes';
import {
  hasAvatarForEmployees,
  hasDepartmentForEmployees,
  hasPositionForEmployees,
} from '@/utils/permission';
import { PhoneNumber } from '@credo/base-ui/components';
import { ActiveBadge } from '@/components/badges';
import { EmployeeAvatar } from '@/components/EmployeeAvatar';
import type { Employee } from '@/types';

type EmployeeCardListProps = {
  readonly employees: Employee[];
  readonly isLoading?: boolean;
  readonly resolveDepartment?: (value: string | undefined | null) => string;
  readonly resolvePosition?: (value: string | undefined | null) => string;
};

const hasPosition = hasPositionForEmployees();
const hasDepartment = hasDepartmentForEmployees();
const hasAvatar = hasAvatarForEmployees();

function EmployeeCardSkeleton() {
  return (
    <Card withBorder padding="sm">
      <Stack gap="xs">
        <Group justify="space-between">
          <Skeleton h={16} w="60%" />
          <Skeleton h={20} w={60} radius="xl" />
        </Group>
        <Skeleton h={12} w="40%" />
        <Skeleton h={12} w="50%" />
      </Stack>
    </Card>
  );
}

export function EmployeeCardList({
  employees,
  isLoading,
  resolveDepartment,
  resolvePosition,
}: EmployeeCardListProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Stack gap="sm">
        {Array.from({ length: 5 }, (_, i) => (
          <EmployeeCardSkeleton key={i} />
        ))}
      </Stack>
    );
  }

  if (employees.length === 0) {
    return (
      <Card withBorder padding="xl" radius="md">
        <Stack align="center" gap="sm" py="md">
          <ThemeIcon size={56} radius="xl" variant="light" color="gray">
            <IconUsers size={28} stroke={1.5} />
          </ThemeIcon>
          <Text fw={600} size="sm">
            {t('employees.emptyTitle')}
          </Text>
          <Text size="xs" c="dimmed" ta="center" maw={260}>
            {t('employees.emptyMessage')}
          </Text>
        </Stack>
      </Card>
    );
  }

  return (
    <Stack gap="sm">
      {employees.map((emp) => {
        const departmentLabel =
          hasDepartment && emp.department
            ? resolveDepartment
              ? resolveDepartment(emp.department)
              : emp.department
            : null;
        const positionLabel =
          hasPosition && emp.position
            ? resolvePosition
              ? resolvePosition(emp.position)
              : emp.position
            : null;

        const work = emp.phone?.trim() || '';
        const personal = emp.extra?.personalPhoneNumber?.trim() || '';
        const showPhoneLabels = !!work && !!personal;

        return (
          <Card
            key={emp.id}
            withBorder
            padding="sm"
            onClick={() => navigate(ROUTES.EMPLOYEES.DETAIL.replace(':id', emp.id))}
            style={{ cursor: 'pointer' }}
          >
            <Group justify="space-between" wrap="nowrap" align="flex-start">
              {hasAvatar && (
                <EmployeeAvatar
                  name={emp.name}
                  imageUrl={emp.extra?.profileImage}
                  size={40}
                  initialSize="16px"
                  style={{ flexShrink: 0 }}
                />
              )}
              <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
                <Text fw={700} size="md" truncate>
                  {emp.name}
                </Text>

                {departmentLabel && (
                  <Text size="xs" c="dimmed" truncate>
                    {t('common.labels.department')}: {departmentLabel}
                  </Text>
                )}

                {positionLabel && (
                  <Text size="xs" c="dimmed" truncate>
                    {t('common.labels.position')}: {positionLabel}
                  </Text>
                )}

                {/* Phone block: when both numbers are present, prefix each
                    with a small dim label so they're distinguishable.
                    When only one is present, the existing single-number
                    layout is preserved (no label needed). */}
                {work && (
                  <Group gap={6} wrap="nowrap" align="baseline">
                    <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
                      {showPhoneLabels
                        ? t('employees.columns.phoneLabelWork')
                        : t('common.labels.phone')}
                      :
                    </Text>
                    <PhoneNumber
                      value={work}
                      size="xs"
                      c="dimmed"
                      copyTooltip={t('__new__.01-common.actions.copy')}
                      copiedTooltip={t('common.labels.copied')}
                    />
                  </Group>
                )}
                {personal && (
                  <Group gap={6} wrap="nowrap" align="baseline">
                    <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
                      {showPhoneLabels
                        ? t('employees.columns.phoneLabelPersonal')
                        : t('common.labels.phone')}
                      :
                    </Text>
                    <PhoneNumber
                      value={personal}
                      size="xs"
                      c="dimmed"
                      copyTooltip={t('__new__.01-common.actions.copy')}
                      copiedTooltip={t('common.labels.copied')}
                    />
                  </Group>
                )}
              </Stack>

              <ActiveBadge
                isActive={emp.isActive}
                activeLabel={t('__new__.01-common.labels.active')}
                inactiveLabel={t('__new__.01-common.labels.inactive')}
                style={{ flexShrink: 0 }}
              />
            </Group>
          </Card>
        );
      })}
    </Stack>
  );
}
