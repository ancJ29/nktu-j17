import {
  ActionIcon,
  Button,
  Group,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
} from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import {
  IconId,
  IconLicense,
  IconPhone,
  IconPlaceholder,
  IconToggleRight,
  IconUser,
} from '@tabler/icons-react';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { generateName } from './faker';
import { SectionCard } from '@/components/SectionCard';
import { DateField } from '@/components/DateField';
import {
  hasAddressForEmployees,
  hasDateOfBirthForEmployees,
  hasDepartmentForEmployees,
  hasEmailForEmployees,
  hasPositionForEmployees,
  hasStartDateForEmployees,
  isDriverDepartment,
} from '@/utils/permission';
import { featureFlags } from '@/utils/features';
import { useTruckAssetStore } from '@/stores/useTruckAssetStore';
import { useEmployeeFieldOptions } from './useEmployeeFieldOptions';
import { isInternal } from '@/config/env';
import { pad } from '../fake-data/_sharedSeed';

const hasEmail = hasEmailForEmployees();
const hasDepartment = hasDepartmentForEmployees();
const hasPosition = hasPositionForEmployees();
const hasStartDate = hasStartDateForEmployees();
const hasAddress = hasAddressForEmployees();
const hasDateOfBirth = hasDateOfBirthForEmployees();
const trucksEnabled = featureFlags.trucks.enabled;

export type EmployeeFormValues = {
  name: string;
  code: string;
  email: string;
  phone: string;
  personalPhoneNumber: string;
  position: string;
  department: string;
  isActive: boolean;
  
  startDate: string | null;
  address: string;
  dateOfBirth: string | null;
  
  idCardNumber: string;
  idCardIssueDate: string | null;
  idCardIssuePlace: string;
  licenseNumber: string;
  licenseClass: string;
  licenseIssueDate: string | null;
  licenseExpiry: string | null;
  licenseIssuePlace: string;
  truckAssetId: string;
};

type SingleEmployeeFormProps = {
  readonly form: UseFormReturnType<EmployeeFormValues>;
  readonly isLoading: boolean;
  readonly isEditMode: boolean;
  readonly onSubmit: (values: EmployeeFormValues) => void;
  readonly onCancel: () => void;
};

export function SingleEmployeeForm({
  form,
  isLoading,
  isEditMode,
  onSubmit,
  onCancel,
}: SingleEmployeeFormProps) {
  const { t } = useTranslation();
  const { departmentOptions, positionOptions } = useEmployeeFieldOptions();

  
  
  const isDriver = isDriverDepartment(form.values.department);

  
  
  
  const truckAssets = useTruckAssetStore((s) => s.items);
  const loadTrucks = useTruckAssetStore((s) => s.loadAll);
  useEffect(() => {
    if (trucksEnabled && isDriver) loadTrucks();
  }, [isDriver, loadTrucks]);
  const truckOptions = useMemo(
    () =>
      truckAssets
        .filter((a) => !a.extra?.isDeleted)
        .map((a) => ({ value: a.id, label: a.extra?.plateNumber || a.code })),
    [truckAssets],
  );

  
  
  
  const positionField = hasPosition ? (
    positionOptions.length > 0 ? (
      <Select
        label={t('common.labels.position')}
        placeholder={t('employees.form.positionPlaceholder')}
        data={positionOptions}
        searchable
        clearable
        {...form.getInputProps('position')}
      />
    ) : (
      <TextInput
        label={t('common.labels.position')}
        placeholder={t('employees.form.positionPlaceholder')}
        {...form.getInputProps('position')}
      />
    )
  ) : null;

  const departmentField = hasDepartment ? (
    departmentOptions.length > 0 ? (
      <Select
        label={t('common.labels.department')}
        placeholder={t('common.labels.department')}
        data={departmentOptions}
        searchable
        clearable
        {...form.getInputProps('department')}
      />
    ) : (
      <TextInput
        label={t('common.labels.department')}
        placeholder={t('common.labels.department')}
        {...form.getInputProps('department')}
      />
    )
  ) : null;

  
  
  
  

  const personalCard = (
    <SectionCard icon={<IconUser size={14} />} title={t('common.labels.basicInfo')}>
      <Stack gap="md">
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <TextInput
            label={t('employees.form.nameLabel')}
            placeholder={t('employees.form.namePlaceholder')}
            withAsterisk
            {...form.getInputProps('name')}
            
            rightSection={
              isInternal ? (
                <ActionIcon
                  variant="default"
                  size="xs"
                  onClick={() => {
                    const name = generateName();
                    form.setFieldValue('name', name.fullName);
                  }}
                >
                  <IconPlaceholder size={14} />
                </ActionIcon>
              ) : undefined
            }
          />
          <TextInput
            label={t('common.labels.code')}
            placeholder={t('employees.form.codePlaceholder')}
            disabled
            styles={{ input: { fontFamily: 'var(--mantine-font-family-monospace)' } }}
            {...form.getInputProps('code')}
          />
        </SimpleGrid>
        {hasEmail && (
          <TextInput
            label={t('common.labels.email')}
            placeholder={t('employees.form.emailPlaceholder')}
            {...form.getInputProps('email')}
          />
        )}
        {(hasDepartment || hasPosition) && (
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            {departmentField}
            {positionField}
          </SimpleGrid>
        )}
        {(hasStartDate || hasDateOfBirth) && (
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            {hasStartDate && (
              <DateField
                label={t('employees.fields.startDate')}
                {...form.getInputProps('startDate')}
              />
            )}
            {hasDateOfBirth && (
              
              
              
              
              
              
              <DateField
                label={t('employees.fields.dateOfBirth')}
                {...form.getInputProps('dateOfBirth')}
              />
            )}
          </SimpleGrid>
        )}
        {hasAddress && (
          <TextInput label={t('employees.fields.address')} {...form.getInputProps('address')} />
        )}
      </Stack>
    </SectionCard>
  );

  
  
  
  const driverCard = isDriver ? (
    <SectionCard icon={<IconLicense size={14} />} title={t('employees.driver.sectionTitle')}>
      <Stack gap="md">
        <Group gap={6}>
          <IconId size={14} />
          <Text fw={600} size="sm">
            {t('employees.driver.identityCard')}
          </Text>
        </Group>
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
          <TextInput
            label={t('employees.driver.idNumber')}
            {...form.getInputProps('idCardNumber')}
          />
          <DateField
            label={t('employees.driver.idIssueDate')}
            {...form.getInputProps('idCardIssueDate')}
          />
          <TextInput
            label={t('employees.driver.idIssuePlace')}
            {...form.getInputProps('idCardIssuePlace')}
          />
        </SimpleGrid>

        <Group gap={6}>
          <IconLicense size={14} />
          <Text fw={600} size="sm">
            {t('employees.driver.license')}
          </Text>
        </Group>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <TextInput
            label={t('employees.driver.licenseNumber')}
            {...form.getInputProps('licenseNumber')}
          />
          <TextInput
            label={t('employees.driver.licenseClass')}
            {...form.getInputProps('licenseClass')}
          />
          <DateField
            label={t('employees.driver.licenseIssueDate')}
            {...form.getInputProps('licenseIssueDate')}
          />
          <DateField
            label={t('employees.driver.licenseExpiry')}
            {...form.getInputProps('licenseExpiry')}
          />
          <TextInput
            label={t('employees.driver.licenseIssuePlace')}
            {...form.getInputProps('licenseIssuePlace')}
          />
        </SimpleGrid>

        {trucksEnabled && (
          <Select
            label={t('employees.driver.linkedTruck')}
            placeholder={t('employees.driver.truckPlaceholder')}
            data={truckOptions}
            searchable
            clearable
            {...form.getInputProps('truckAssetId')}
          />
        )}
      </Stack>
    </SectionCard>
  ) : null;

  const contactsCard = (
    <SectionCard icon={<IconPhone size={14} />} title={t('employees.detail.contactsCardTitle')}>
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <TextInput
          label={t('common.labels.phone')}
          placeholder={t('common.form.phonePlaceholder')}
          {...form.getInputProps('phone')}
          rightSection={
            isInternal ? (
              <ActionIcon
                variant="default"
                size="xs"
                onClick={() => {
                  const phone = `09${pad(Math.floor(Math.random() * 100_000_000), 8)}`;
                  form.setFieldValue('phone', phone);
                }}
              >
                <IconPlaceholder size={14} />
              </ActionIcon>
            ) : undefined
          }
        />
        <TextInput
          label={t('employees.columns.personalPhone')}
          placeholder={t('common.form.phonePlaceholder')}
          {...form.getInputProps('personalPhoneNumber')}
          rightSection={
            isInternal ? (
              <ActionIcon
                variant="default"
                size="xs"
                onClick={() => {
                  const phone = `09${pad(Math.floor(Math.random() * 100_000_000), 8)}`;
                  form.setFieldValue('personalPhoneNumber', phone);
                }}
              >
                <IconPlaceholder size={14} />
              </ActionIcon>
            ) : undefined
          }
        />
      </SimpleGrid>
    </SectionCard>
  );

  const statusCard = isEditMode ? (
    <SectionCard
      icon={<IconToggleRight size={14} />}
      title={t('__new__.01-common.labels.status')}
      padding="md"
    >
      <Switch
        label={t('common.form.isActiveLabel')}
        {...form.getInputProps('isActive', { type: 'checkbox' })}
      />
    </SectionCard>
  ) : null;

  return (
    <form onSubmit={form.onSubmit(onSubmit)}>
      <Stack gap="md">
        {personalCard}
        {contactsCard}
        {driverCard}
        {statusCard}

        <Group justify="flex-end" gap="sm">
          <Button variant="default" size="sm" disabled={isLoading} onClick={onCancel}>
            {t('__new__.01-common.actions.cancel')}
          </Button>
          <Button type="submit" loading={isLoading} size="sm">
            {isEditMode ? t('employees.form.updateButton') : t('employees.form.createButton')}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
