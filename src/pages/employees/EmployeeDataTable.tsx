import React, { useMemo } from 'react';

import { useNavigate } from 'react-router';

import { Group, Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';

import { ROUTES } from '@/constants/routes';
import { ActiveBadge } from '@/components/badges';
import { EmployeeAvatar } from '@/components/EmployeeAvatar';
import type { Employee } from '@/types';

import { DataTable, PhoneNumber } from '@credo/base-ui/components';
import {
  hasAvatarForEmployees,
  hasEmailForEmployees,
  hasDepartmentForEmployees,
  hasPositionForEmployees,
} from '@/utils/permission';

const hasEmail = hasEmailForEmployees();
const hasPosition = hasPositionForEmployees();
const hasDepartment = hasDepartmentForEmployees();
const hasAvatar = hasAvatarForEmployees();

type EmployeeDataTableProps = {
  readonly employees: Employee[];
  readonly isLoading?: boolean;
  readonly resolveDepartment?: (value: string | undefined | null) => string;
  readonly resolvePosition?: (value: string | undefined | null) => string;
};

export function EmployeeDataTable({
  employees,
  isLoading,
  resolveDepartment,
  resolvePosition,
}: EmployeeDataTableProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const columns = useMemo(
    () =>
      [
        {
          key: 'name',
          header: t('employees.columns.name'),
          width: '250px',
          render: (emp: Employee) => (
            <Group gap="xs" wrap="nowrap" align="center">
              {hasAvatar && (
                <EmployeeAvatar
                  name={emp.name}
                  imageUrl={emp.extra?.profileImage}
                  size={28}
                  initialSize="11px"
                />
              )}
              <Text fz="md" fw={500} lh={1.25}>
                {emp.name}
              </Text>
            </Group>
          ),
        },
        ...(hasEmail
          ? [
              {
                key: 'email',
                header: t('common.labels.email'),
                render: (emp: Employee) =>
                  emp.email ? (
                    <Text size="sm">{emp.email}</Text>
                  ) : (
                    <Text size="sm" c="dimmed">
                      -
                    </Text>
                  ),
              },
            ]
          : []),
        ...(hasPosition
          ? [
              {
                key: 'position',
                header: t('common.labels.position'),
                render: resolvePosition
                  ? (emp: Employee) => <Text size="sm">{resolvePosition(emp.position)}</Text>
                  : undefined,
                accessor: resolvePosition ? undefined : ('position' as keyof Employee),
              },
            ]
          : []),
        ...(hasDepartment
          ? [
              {
                key: 'department',
                header: t('common.labels.department'),
                render: resolveDepartment
                  ? (emp: Employee) => <Text size="sm">{resolveDepartment(emp.department)}</Text>
                  : undefined,
                accessor: resolveDepartment ? undefined : ('department' as keyof Employee),
              },
            ]
          : []),
        {
          key: 'phone',
          header: t('common.labels.phone'),
          render: (emp: Employee) => {
            const work = emp.phone?.trim() || '';
            const personal = emp.extra?.personalPhoneNumber?.trim() || '';
            if (!work && !personal) return <Text size="sm">-</Text>;

            const showLabels = !!work && !!personal;
            return (
              <Stack gap={2}>
                {work && (
                  <Group gap={6} wrap="nowrap" align="baseline">
                    {showLabels && (
                      <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
                        {t('employees.columns.phoneLabelWork')}
                      </Text>
                    )}
                    <PhoneNumber
                      value={work}
                      size="sm"
                      c="dimmed"
                      copyTooltip={t('__new__.01-common.actions.copy')}
                      copiedTooltip={t('common.labels.copied')}
                    />
                  </Group>
                )}
                {personal && (
                  <Group gap={6} wrap="nowrap" align="baseline">
                    {showLabels && (
                      <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
                        {t('employees.columns.phoneLabelPersonal')}
                      </Text>
                    )}
                    <PhoneNumber
                      value={personal}
                      size="sm"
                      c="dimmed"
                      copyTooltip={t('__new__.01-common.actions.copy')}
                      copiedTooltip={t('common.labels.copied')}
                    />
                  </Group>
                )}
              </Stack>
            );
          },
        },
        {
          key: 'status',
          header: t('__new__.01-common.labels.status'),
          ta: 'center',
          width: '160px',
          render: (emp: Employee) => (
            <Group justify="center" wrap="nowrap">
              <ActiveBadge
                isActive={emp.isActive}
                activeLabel={t('__new__.01-common.labels.active')}
                inactiveLabel={t('__new__.01-common.labels.inactive')}
                size="sm"
              />
            </Group>
          ),
        },
      ] as {
        key: string;
        header: string;
        render: (emp: Employee) => React.ReactNode;
        ta?: 'left' | 'center' | 'right';
      }[],
    [t, resolveDepartment, resolvePosition],
  );

  const handleRowClick = (emp: Employee) => {
    navigate(ROUTES.EMPLOYEES.DETAIL.replace(':id', emp.id));
  };

  return (
    <DataTable
      withIndex
      noActions
      maxHeight="calc(100vh - 250px)"
      data={employees as (Employee & Record<string, unknown>)[]}
      columns={columns}
      isLoading={isLoading}
      emptyMessage={t('employees.noEmployees')}
      onRowClick={handleRowClick}
    />
  );
}
