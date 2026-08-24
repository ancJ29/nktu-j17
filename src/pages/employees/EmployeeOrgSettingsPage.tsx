import type { ConfigOption, DepartmentOption } from '@credo/kits/types';
import { Alert, Button, Group, MultiSelect, Paper, Stack, Text, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconInfoCircle } from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { cMngtConnector } from '@credo/connectors/connector';
import { device } from '@credo/base-ui/utils';
import { appConfig } from '@/config';
import { ROUTES } from '@/constants/routes';
import { ConfigOptionEditor } from '@/pages/config/AppConfigPage/editors/ConfigOptionEditor';
import { DeptPermissionsSection } from '@/pages/config/AppConfigPage/sections/DeptPermissionsSection';
import { useIsRoot } from '@/hooks/useIsRoot';
import { useEmployeeStore } from '@/stores/useEmployeeStore';
import {
  isPermissionManagementEnabled,
  isPermissionManagementRootUserOnly,
  perms,
} from '@/utils/permission';
import { scheduleReload } from '@/utils/scheduleReload';
import { GuardedDepartmentEditor } from './GuardedDepartmentEditor';
import { collectDepartmentConfigRefs, countEmployeesByDepartment } from './orgReferences';

const isMobile = device.isMobile;

export function EmployeeOrgSettingsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isRootUser = useIsRoot();

  const rootLocked = isPermissionManagementRootUserOnly() && !isRootUser;

  useEffect(() => {
    if (isMobile || rootLocked) {
      navigate(ROUTES.EMPLOYEES.LIST, { replace: true });
    }
  }, [navigate, rootLocked]);

  const employees = appConfig.features.employees;
  const languages = appConfig.languages;
  const clientPermissions = appConfig.permissions ?? {};

  const canModify = isPermissionManagementEnabled() && perms.permissionManagement.canModify();

  const [departmentOptions, setDepartmentOptions] = useState<DepartmentOption[]>(
    employees.departmentOptions ?? [],
  );
  const [positionOptions, setPositionOptions] = useState<ConfigOption[]>(
    employees.positionOptions ?? [],
  );
  const [driverDepartments, setDriverDepartments] = useState<string[]>(
    employees.driverDepartments ?? [],
  );
  const [saving, setSaving] = useState(false);

  const { items: employeeItems, initialized: employeesLoaded, loadAll } = useEmployeeStore();
  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const [lockedValues] = useState<ReadonlySet<string>>(
    () => new Set((employees.departmentOptions ?? []).map((d) => d.value)),
  );

  const employeeCounts = useMemo(() => countEmployeesByDepartment(employeeItems), [employeeItems]);

  const configRefs = useMemo(
    () =>
      collectDepartmentConfigRefs(appConfig, {
        salesOrderPic: t('employees.org.refSalesOrderPic'),
        goodsReceiptPic: t('employees.org.refGoodsReceiptPic'),
        salesOrderStatus: (status) => t('employees.org.refSalesOrderStatus', { status }),
        transportOrderStatus: (status) => t('employees.org.refTransportOrderStatus', { status }),
      }),
    [t],
  );

  const getRemovalBlockers = useCallback(
    (value: string): string[] => {
      const reasons: string[] = [];
      if (!employeesLoaded) {
        reasons.push(t('employees.org.refCheckingEmployees'));
      } else if ((employeeCounts[value] ?? 0) > 0) {
        reasons.push(t('employees.org.refAssignedEmployees', { count: employeeCounts[value] }));
      }
      if (driverDepartments.includes(value)) reasons.push(t('employees.org.refDriverDepartment'));
      reasons.push(...(configRefs[value] ?? []));
      return reasons;
    },
    [employeesLoaded, employeeCounts, driverDepartments, configRefs, t],
  );

  const departmentMultiSelectData = useMemo(
    () =>
      departmentOptions.map((d) => {
        const labels = d.label ?? {};
        const label = labels.en || labels.vi || Object.values(labels)[0] || d.value;
        return { value: d.value, label: label || d.value };
      }),
    [departmentOptions],
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await cMngtConnector.setEmployeeConfig({
        employees: { departmentOptions, positionOptions, driverDepartments },
      });
      if (res.success) {
        notifications.show({ color: 'green', message: t('employees.org.saved') });

        scheduleReload('employee org config saved');
      } else {
        notifications.show({ color: 'red', message: t('employees.org.saveFailed') });
      }
    } catch {
      notifications.show({ color: 'red', message: t('employees.org.saveFailed') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack gap="md">
      <Group justify="space-between" align="flex-start">
        <Stack gap={2}>
          <Title order={3}>{t('employees.org.title')}</Title>
          <Text c="dimmed" fz="sm">
            {t('employees.org.description')}
          </Text>
        </Stack>
        {canModify && (
          <Button onClick={handleSave} loading={saving}>
            {t('__new__.01-common.actions.save')}
          </Button>
        )}
      </Group>

      {!canModify && (
        <Alert icon={<IconInfoCircle size={16} />} color="gray">
          {t('employees.org.readOnly')}
        </Alert>
      )}

      <Paper withBorder p="md">
        <GuardedDepartmentEditor
          options={departmentOptions}
          onChange={setDepartmentOptions}
          languages={languages}
          label={t('employees.org.departments')}
          lockedValues={lockedValues}
          getRemovalBlockers={getRemovalBlockers}
        />
      </Paper>

      <Paper withBorder p="md">
        <ConfigOptionEditor
          options={positionOptions}
          onChange={setPositionOptions}
          languages={languages}
          label={t('employees.org.positions')}
        />
      </Paper>

      {employees.driverProfile && (
        <Paper withBorder p="md">
          <Text fz="sm" fw={600} mb={4}>
            {t('employees.org.driverDepartments')}
          </Text>
          <Text fz="xs" c="dimmed" mb="xs">
            {t('employees.org.driverDepartmentsHint')}
          </Text>
          <MultiSelect
            data={departmentMultiSelectData}
            value={driverDepartments}
            onChange={setDriverDepartments}
            placeholder={t('employees.org.driverDepartmentsPlaceholder')}
            nothingFoundMessage={t('employees.org.noDepartments')}
            searchable
            clearable
            size="sm"
          />
        </Paper>
      )}

      <Paper withBorder p="md">
        <Text fz="sm" fw={600} mb="xs">
          {t('employees.org.permissionOverlays')}
        </Text>
        <DeptPermissionsSection
          departmentOptions={departmentOptions}
          clientPermissions={clientPermissions}
          onDepartmentOptionsChange={setDepartmentOptions}
          languages={languages}
        />
      </Paper>
    </Stack>
  );
}
