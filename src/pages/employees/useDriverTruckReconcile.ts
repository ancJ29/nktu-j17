import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { notifications } from '@mantine/notifications';

import { appConfig } from '@/config';
import { syncTruckLinkFromDriver } from '@/utils/driverTruckLink';
import type { EmployeeFormValues } from './SingleEmployeeForm';

export function useDriverTruckReconcile() {
  const { t } = useTranslation();

  return useCallback(
    async (values: EmployeeFormValues, employeeId: string, prevTruckId?: string) => {
      if (!appConfig.features.trucks.enabled) return;

      const newTruckId = values.truckAssetId || undefined;

      if (!newTruckId && !prevTruckId) return;

      try {
        await syncTruckLinkFromDriver({
          driverId: employeeId,

          driver: {
            id: employeeId,
            name: values.name,
            phone: values.phone || values.personalPhoneNumber,
            licenseNumber: values.licenseNumber,
            licenseClass: values.licenseClass,
          },
          prevTruckId,
          newTruckId,
        });
      } catch {
        notifications.show({
          color: 'yellow',
          message: t('employees.notifications.truckLinkWarning'),
        });
      }
    },
    [t],
  );
}
