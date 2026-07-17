import { TextInput } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { useEffect } from 'react';
import { EmployeeSelector } from '@/components/selectors';
import { isDriverDepartment } from '@/utils/permission';
import type { Employee } from '@/types';
import type { LogFormValues, TFn } from '@/pages/operation-logs/operationLogConfig';

// Same "is a driver" definition the truck form uses.
const driverFilter = (e: Employee) =>
  e.isActive && !e.extra?.isDeleted && isDriverDepartment(e.department);

/**
 * Driver field for a truck operation log (refuel / trip).
 *
 * - **Truck has an assigned driver** → locked, read-only display of that driver;
 *   every log is stamped with them (seeded into the form here so `buildExtra`
 *   persists `driverName`/`driverId`). No manual entry.
 * - **No assigned driver** → a driver-department `EmployeeSelector`; the log
 *   stores the picked employee's id + name snapshot.
 */
export function LogDriverField({
  form,
  t,
  label,
  assignedDriver,
}: {
  form: UseFormReturnType<LogFormValues>;
  t: TFn;
  label: string;
  assignedDriver?: { id?: string; name: string };
}) {
  const assignedName = assignedDriver?.name?.trim();

  // The modal content re-mounts on each open, so this seeds the assigned driver
  // for both add and edit — the truck's driver is authoritative over any older
  // stored value.
  useEffect(() => {
    if (!assignedName) return;
    form.setFieldValue('driverName', assignedName);
    form.setFieldValue('driverId', assignedDriver?.id ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed once per mount
  }, [assignedName]);

  if (assignedName) {
    return <TextInput label={label} value={assignedName} variant="filled" readOnly />;
  }

  return (
    <EmployeeSelector
      label={label}
      placeholder={t('operationLogs.form.selectDriver')}
      value={String(form.values.driverId || '') || null}
      onChange={(sel) => {
        form.setFieldValue('driverId', sel?.id ?? '');
        form.setFieldValue('driverName', sel?.name ?? '');
      }}
      filter={driverFilter}
      clearable
    />
  );
}
