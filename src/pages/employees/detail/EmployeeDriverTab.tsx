import { SimpleGrid, Stack, Text } from '@mantine/core';
import { IconId, IconLicense, IconTruck } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

import { DetailField } from '@/components/DetailField';
import { SectionCard } from '@/components/SectionCard';
import { TruckLink } from '@/components/TruckLink';
import { OperationLogSection } from '@/pages/operation-logs/OperationLogSection';
import type { Employee } from '@/types';
import { featureFlags } from '@/utils/features';
import { formatDate } from '@/utils/dateFormat';
import { perms } from '@/utils/permission';
import { DRIVER_TRAINING_LOG_CONFIG } from '../driverLogConfigs';

const trucksEnabled = featureFlags.trucks.enabled;

const EMPLOYEE_LOG_PERMS = {
  canView: perms.employee.canView(),
  canCreate: perms.employee.canCreate(),
  canEdit: perms.employee.canEdit(),
  canDelete: perms.employee.canDelete(),
};

type EmployeeDriverTabProps = {
  readonly employee: Employee;

  readonly isVisible: boolean;
};

export function EmployeeDriverTab({ employee, isVisible }: EmployeeDriverTabProps) {
  const { t } = useTranslation();

  return (
    <Stack gap="md">
      <SectionCard icon={<IconId size={14} />} title={t('employees.driver.identityCard')}>
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
          <DetailField label={t('employees.driver.idNumber')}>
            {employee.extra?.idCardNumber}
          </DetailField>
          <DetailField label={t('employees.driver.idIssueDate')}>
            {employee.extra?.idCardIssueDate ? formatDate(employee.extra.idCardIssueDate) : null}
          </DetailField>
          <DetailField label={t('employees.driver.idIssuePlace')}>
            {employee.extra?.idCardIssuePlace}
          </DetailField>
        </SimpleGrid>
      </SectionCard>

      <SectionCard icon={<IconLicense size={14} />} title={t('employees.driver.license')}>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <DetailField label={t('employees.driver.licenseNumber')}>
            {employee.extra?.licenseNumber}
          </DetailField>
          <DetailField label={t('employees.driver.licenseClass')}>
            {employee.extra?.licenseClass}
          </DetailField>
          <DetailField label={t('employees.driver.licenseIssueDate')}>
            {employee.extra?.licenseIssueDate ? formatDate(employee.extra.licenseIssueDate) : null}
          </DetailField>
          <DetailField label={t('employees.driver.licenseExpiry')}>
            {employee.extra?.licenseExpiry ? formatDate(employee.extra.licenseExpiry) : null}
          </DetailField>
          <DetailField label={t('employees.driver.licenseIssuePlace')}>
            {employee.extra?.licenseIssuePlace}
          </DetailField>
        </SimpleGrid>
      </SectionCard>

      {trucksEnabled && (
        <SectionCard icon={<IconTruck size={14} />} title={t('employees.driver.linkedTruck')}>
          {employee.extra?.truckAssetId ? (
            <TruckLink
              id={employee.extra.truckAssetId}
              fallbackLabel={employee.extra?.truckAssetCode || t('employees.driver.viewTruck')}
              showPlate
            />
          ) : (
            <Text size="sm" c="dimmed">
              {t('employees.driver.noTruck')}
            </Text>
          )}
        </SectionCard>
      )}

      {/* Lazy-mount: the training-log partition is fetched on first tab open. */}
      {isVisible && (
        <OperationLogSection
          targetId={employee.id}
          targetCode={employee.code}
          config={DRIVER_TRAINING_LOG_CONFIG}
          perms={EMPLOYEE_LOG_PERMS}
        />
      )}
    </Stack>
  );
}
