import { MultiSelect } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { buildWarehouseStaffOptions } from '@/pages/sales-orders/salesOrderWarehouseStaff';
import { useEmployeeStore } from '@/stores/useEmployeeStore';
import {
  getDeliveryRequestWarehouseStaffDepartments,
  isDeliveryRequestWarehouseStaffAllowed,
  makeEmployeeDepartmentFilter,
} from '@/utils/permission';

const warehouseStaffAllowed = isDeliveryRequestWarehouseStaffAllowed();
const warehouseStaffEmployeeFilter = makeEmployeeDepartmentFilter(
  getDeliveryRequestWarehouseStaffDepartments(),
);

export function DeliveryRequestWarehouseStaffSelect({
  value,
  onChange,
  inline = false,
}: {
  readonly value: string[];
  readonly onChange: (next: string[]) => void;

  readonly inline?: boolean;
}) {
  const { t } = useTranslation();
  const employees = useEmployeeStore((s) => s.items);
  if (!warehouseStaffAllowed) return null;
  return (
    <MultiSelect
      label={inline ? undefined : t('deliveryRequests.form.warehouseStaffLabel')}
      placeholder={t('deliveryRequests.form.warehouseStaffPlaceholder')}
      data={buildWarehouseStaffOptions(employees, warehouseStaffEmployeeFilter, value)}
      value={value}
      onChange={onChange}
      searchable
      clearable
      autoFocus={inline}
    />
  );
}
