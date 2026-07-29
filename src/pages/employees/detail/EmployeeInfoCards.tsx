import { Box, Group, SimpleGrid, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconClock, IconNote, IconPhone, IconUser } from '@tabler/icons-react';
import {
  CodeLabel,
  InlineTextareaField,
  InlineTextField,
  PhoneNumber,
} from '@credo/base-ui/components';
import { useTranslation } from 'react-i18next';

import { device } from '@credo/base-ui/utils';
import { CopyValueButton } from '@/components/CopyValueButton';
import { DetailField } from '@/components/DetailField';
import { SectionCard } from '@/components/SectionCard';
import type { Employee } from '@/types';
import { formatDate } from '@/utils/dateFormat';
import {
  hasAddressForEmployees,
  hasDateOfBirthForEmployees,
  hasDepartmentForEmployees,
  hasEmailForEmployees,
  hasPositionForEmployees,
  hasStartDateForEmployees,
  perms,
} from '@/utils/permission';

const hasEmail = hasEmailForEmployees();
const hasDepartment = hasDepartmentForEmployees();
const hasPosition = hasPositionForEmployees();
const hasStartDate = hasStartDateForEmployees();
const hasAddress = hasAddressForEmployees();
const hasDateOfBirth = hasDateOfBirthForEmployees();
const canEdit = perms.employee.canEdit();

const isMobile = device.isMobile;

export type InlineEditLabels = {
  edit: string;
  save: string;
  cancel: string;
};

type PersonalCardProps = {
  readonly employee: Employee;
  readonly isRootUser: boolean;
  readonly inlineEditLabels: InlineEditLabels;
  readonly resolveDepartment: (value: string) => string;
  readonly resolvePosition: (value: string) => string;
  readonly onEmailSave: (next: string) => Promise<void>;
};

export function EmployeePersonalCard({
  employee,
  isRootUser,
  inlineEditLabels,
  resolveDepartment,
  resolvePosition,
  onEmailSave,
}: PersonalCardProps) {
  const { t } = useTranslation();

  const loginIdentifier = employee.email ?? '';
  const loginIdentifierField = (
    <InlineTextField
      value={loginIdentifier}
      onSave={onEmailSave}
      canEdit={!isMobile}
      labels={inlineEditLabels}
    />
  );

  return (
    <SectionCard icon={<IconUser size={14} />} title={t('common.labels.basicInfo')}>
      <SimpleGrid cols={2} spacing="md">
        <DetailField label={t('employees.columns.name')}>{employee.name}</DetailField>
        <DetailField label={t('common.labels.code')}>
          {isMobile && employee.code ? (
            <Group gap={4} wrap="nowrap">
              <CodeLabel code={employee.code} />
              <CopyValueButton
                value={employee.code}
                copiedMessage={t('employees.notifications.codeCopied')}
              />
            </Group>
          ) : (
            <CodeLabel code={employee.code} />
          )}
        </DetailField>
      </SimpleGrid>
      {hasEmail && (
        <DetailField label={t('common.labels.email')}>
          {isRootUser ? (
            <InlineTextField
              value={employee.email ?? ''}
              onSave={onEmailSave}
              canEdit={!isMobile}
              labels={inlineEditLabels}
              type="email"
            />
          ) : (
            employee.email
          )}
        </DetailField>
      )}
      {isRootUser && (
        <DetailField label={t('__new__.07-entities.employees.dangerZone.loginIdentifier')}>
          {isMobile && loginIdentifier ? (
            <Group gap={4} wrap="nowrap" align="flex-start">
              <Box style={{ flex: 1, minWidth: 0 }}>{loginIdentifierField}</Box>
              {/* Copies exactly what's displayed. Note that an auto-synthesized
                  login carries the `@auto.local` suffix here, which the
                  set-password modal strips — see employees.md. */}
              <CopyValueButton
                value={loginIdentifier}
                copiedMessage={t('employees.notifications.loginIdentifierCopied')}
              />
            </Group>
          ) : (
            loginIdentifierField
          )}
        </DetailField>
      )}
      {(hasDepartment || hasPosition) && (
        <SimpleGrid cols={2} spacing="md">
          {hasDepartment && (
            <DetailField label={t('common.labels.department')}>
              {employee.department ? resolveDepartment(employee.department) : null}
            </DetailField>
          )}
          {hasPosition && (
            <DetailField label={t('common.labels.position')}>
              {resolvePosition(employee.position)}
            </DetailField>
          )}
        </SimpleGrid>
      )}
      {(hasStartDate || hasDateOfBirth) && (
        <SimpleGrid cols={2} spacing="md">
          {hasStartDate && (
            <DetailField label={t('employees.fields.startDate')}>
              {employee.extra?.startDate ? formatDate(employee.extra.startDate) : null}
            </DetailField>
          )}
          {hasDateOfBirth && (
            <DetailField label={t('employees.fields.dateOfBirth')}>
              {employee.extra?.dateOfBirth ? formatDate(employee.extra.dateOfBirth) : null}
            </DetailField>
          )}
        </SimpleGrid>
      )}
      {hasAddress && (
        <DetailField label={t('employees.fields.address')}>{employee.extra?.address}</DetailField>
      )}
    </SectionCard>
  );
}

export function EmployeeContactsCard({ employee }: { readonly employee: Employee }) {
  const { t } = useTranslation();

  return (
    <SectionCard icon={<IconPhone size={14} />} title={t('employees.detail.contactsCardTitle')}>
      <SimpleGrid cols={2} spacing="md">
        <DetailField label={t('common.labels.phone')}>
          {employee.phone ? (
            <PhoneNumber
              value={employee.phone}
              size="sm"
              copyTooltip={t('__new__.01-common.actions.copy')}
              copiedTooltip={t('common.labels.copied')}
            />
          ) : null}
        </DetailField>
        <DetailField label={t('employees.detail.personalPhone')}>
          {employee.extra?.personalPhoneNumber ? (
            <PhoneNumber
              value={employee.extra.personalPhoneNumber}
              size="sm"
              copyTooltip={t('__new__.01-common.actions.copy')}
              copiedTooltip={t('common.labels.copied')}
            />
          ) : null}
        </DetailField>
      </SimpleGrid>
    </SectionCard>
  );
}

export function EmployeeNotesCard({
  employee,
  inlineEditLabels,
  onNoteSave,
}: {
  readonly employee: Employee;
  readonly inlineEditLabels: InlineEditLabels;
  readonly onNoteSave: (next: string) => Promise<void>;
}) {
  const { t } = useTranslation();

  return (
    <SectionCard icon={<IconNote size={14} />} title={t('__new__.01-common.labels.note')}>
      <InlineTextareaField
        value={employee.extra?.note ?? ''}
        onSave={onNoteSave}
        canEdit={canEdit && !isMobile}
        labels={inlineEditLabels}
        minRows={3}
      />
    </SectionCard>
  );
}

export function EmployeeTimesheetTab() {
  const { t } = useTranslation();

  return (
    <SectionCard
      icon={<IconClock size={14} />}
      title={t('employees.detail.timesheet')}
      padding="lg"
    >
      <Stack align="center" gap="sm" py="xl">
        <ThemeIcon size={56} radius="xl" variant="light" color="gray">
          <IconClock size={28} stroke={1.5} />
        </ThemeIcon>
        <Text fw={600} size="sm">
          {t('employees.detail.timesheetComingSoon')}
        </Text>
        <Text size="xs" c="dimmed" ta="center" maw={320}>
          {t('employees.detail.timesheetComingSoonDesc')}
        </Text>
      </Stack>
    </SectionCard>
  );
}
