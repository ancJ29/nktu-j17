

import {
  Alert,
  Box,
  Button,
  Checkbox,
  Group,
  Modal,
  ScrollArea,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconBuildingWarehouse,
  IconCalendar,
  IconInfoCircle,
  IconPackageExport,
  IconPackageImport,
  IconTestPipe,
} from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { DateField } from '@/components/DateField';
import { CustomerSelector, EmployeeSelector, VendorSelector } from '@/components/selectors';
import { SegmentTabs } from '@/components/SegmentTabs';
import { useAuthStore } from '@/stores/useAuthStore';
import { useCustomerStore } from '@/stores/useCustomerStore';
import { useDeliveryRequestStore } from '@/stores/useDeliveryRequestStore';
import { useEmployeeStore } from '@/stores/useEmployeeStore';
import { useSalesOrderStore } from '@/stores/useSalesOrderStore';
import { useVendorStore } from '@/stores/useVendorStore';
import { resolveSalesOrderCustomerName } from '@/utils/customerDisplay';
import {
  getDeliveryRequestDriverDepartments,
  makeEmployeeDepartmentFilter,
} from '@/utils/permission';
import type { CMngtDeliveryRequestDirection } from '@credo/connectors/types';
import type { Customer, SalesOrder, Vendor } from '@/types';
import { bulkCreateOutboundDeliveryRequests } from './bulkCreateDeliveryRequests';
import { createDeliveryRequestRecord } from './createDeliveryRequest';
import {
  resolveCustomerPickupAddress,
  resolveVendorInboundAddress,
  toDateTimeInputOrUndefined,
} from './deliveryRequestFormShared';
import { getInitialStatusValue } from './transitionEngine';
import { findEmployeeByLoginEmail } from '@/utils/loginEmail';

const driverEmployeeFilter = makeEmployeeDepartmentFilter(getDeliveryRequestDriverDepartments());

type NKTUCreateDeliveryRequestModalProps = {
  opened: boolean;
  onClose: () => void;
  
  onCreated?: () => void;
};

export function NKTUCreateDeliveryRequestModal({
  opened,
  onClose,
  onCreated,
}: NKTUCreateDeliveryRequestModalProps) {
  const { t } = useTranslation();
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t('deliveryRequests.addItem')}
      size="sm"
      centered
    >
      {opened ? <CreateBody onClose={onClose} onCreated={onCreated} t={t} /> : null}
    </Modal>
  );
}

type CreateBodyProps = {
  onClose: () => void;
  onCreated?: () => void;
  t: TFunction;
};

function CreateBody({ onClose, onCreated, t }: CreateBodyProps) {
  const [loading, setLoading] = useState(false);

  
  const [direction, setDirection] = useState<CMngtDeliveryRequestDirection>('outbound');
  const [driverId, setDriverId] = useState<string | null>(null);
  const [date, setDate] = useState<Date | null>(null);
  const [notes, setNotes] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerCode, setCustomerCode] = useState<string | null>(null);
  
  
  
  const [inboundSource, setInboundSource] = useState<'vendor' | 'customer-sample'>('vendor');
  const [vendorName, setVendorName] = useState('');
  const [vendorCode, setVendorCode] = useState('');
  
  
  
  const [oneOffVendor, setOneOffVendor] = useState(false);
  
  
  const [sampleCustomer, setSampleCustomer] = useState<Customer | null>(null);
  const [sampleCustomerName, setSampleCustomerName] = useState('');

  
  const salesOrders = useSalesOrderStore((s) => s.items);
  const soInit = useSalesOrderStore((s) => s.initialized);
  const loadSalesOrders = useSalesOrderStore((s) => s.loadAll);
  const deliveryRequests = useDeliveryRequestStore((s) => s.items);
  const drInit = useDeliveryRequestStore((s) => s.initialized);
  const loadDRs = useDeliveryRequestStore((s) => s.loadAll);
  const customersInit = useCustomerStore((s) => s.initialized);
  const loadCustomers = useCustomerStore((s) => s.loadAll);
  const getCustomerByCode = useCustomerStore((s) => s.getByCode);
  const vendors = useVendorStore((s) => s.items);
  const vendorsInit = useVendorStore((s) => s.initialized);
  const loadVendors = useVendorStore((s) => s.loadAll);
  const employees = useEmployeeStore((s) => s.items);
  const employeesInit = useEmployeeStore((s) => s.initialized);
  const loadEmployees = useEmployeeStore((s) => s.loadAll);
  const { user } = useAuthStore();
  const currentEmployee = useMemo(() => {
    if (!user.email) return undefined;
    return findEmployeeByLoginEmail(employees, user.email);
  }, [user.email, employees]);

  
  useEffect(() => {
    if (!soInit) loadSalesOrders();
    if (!drInit) loadDRs();
    if (!customersInit) loadCustomers();
    if (!vendorsInit) loadVendors();
    if (!employeesInit) loadEmployees();
  }, [
    soInit,
    drInit,
    customersInit,
    vendorsInit,
    employeesInit,
    loadSalesOrders,
    loadDRs,
    loadCustomers,
    loadVendors,
    loadEmployees,
  ]);

  const driver = useMemo(
    () => (driverId ? (employees.find((e) => e.id === driverId) ?? null) : null),
    [driverId, employees],
  );

  
  
  
  
  const ordersWithDR = useMemo(() => {
    const s = new Set<string>();
    for (const dr of deliveryRequests) {
      if (dr.salesOrderId && !dr.extra?.isDeleted) s.add(dr.salesOrderId);
    }
    return s;
  }, [deliveryRequests]);

  
  
  
  const eligibleOrdersAll = useMemo(
    () =>
      salesOrders
        .filter((so) => !so.isClosed && !so.extra?.isDeleted && !ordersWithDR.has(so.id))
        .sort((a, b) => b.orderNumber.localeCompare(a.orderNumber)),
    [salesOrders, ordersWithDR],
  );

  
  
  const customerCodesWithOpenSO = useMemo(() => {
    const s = new Set<string>();
    for (const so of eligibleOrdersAll) {
      const code = so.extra?.customerCode;
      if (code) s.add(code);
    }
    return s;
  }, [eligibleOrdersAll]);

  
  
  const customerWithOpenSOFilter = useCallback(
    (c: Customer) => c.isActive && !c.extra?.isDeleted && customerCodesWithOpenSO.has(c.code),
    [customerCodesWithOpenSO],
  );

  
  const eligibleOrders = useMemo(
    () =>
      customerCode ? eligibleOrdersAll.filter((so) => so.extra?.customerCode === customerCode) : [],
    [eligibleOrdersAll, customerCode],
  );

  
  
  
  const activeVendorFilter = useCallback((v: Vendor) => !v.extra?.isDeleted && v.isActive, []);

  const isInbound = direction === 'inbound';

  const handleDirectionChange = (next: CMngtDeliveryRequestDirection) => {
    if (next === direction) return;
    setDirection(next);
    
    if (next === 'inbound') {
      setSelectedIds(new Set());
      setCustomerId(null);
      setCustomerCode(null);
    } else {
      setInboundSource('vendor');
      setVendorName('');
      setVendorCode('');
      setOneOffVendor(false);
      setSampleCustomer(null);
      setSampleCustomerName('');
    }
  };

  const handleInboundSourceChange = (next: 'vendor' | 'customer-sample') => {
    if (next === inboundSource) return;
    setInboundSource(next);
    
    if (next === 'vendor') {
      setSampleCustomer(null);
      setSampleCustomerName('');
    } else {
      setVendorName('');
      setVendorCode('');
      setOneOffVendor(false);
    }
  };

  
  const toggleOne = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const allSelected = eligibleOrders.length > 0 && selectedIds.size === eligibleOrders.length;
  const someSelected = selectedIds.size > 0 && !allSelected;
  const toggleAll = useCallback(() => {
    setSelectedIds((prev) =>
      prev.size === eligibleOrders.length ? new Set() : new Set(eligibleOrders.map((o) => o.id)),
    );
  }, [eligibleOrders]);

  
  const handleSaveOutbound = useCallback(async () => {
    if (!driver || !date || selectedIds.size === 0) return;
    const selected = eligibleOrders.filter((o) => selectedIds.has(o.id));
    setLoading(true);
    try {
      const { created, failures, linkFailures } = await bulkCreateOutboundDeliveryRequests({
        salesOrders: selected,
        driver,
        scheduledDate: date,
        notes,
        isUrgent,
        resolveCustomerName: (so) => resolveSalesOrderCustomerName(so, getCustomerByCode),
      });

      if (failures.length === 0 && created.length > 0) {
        notifications.show({
          color: 'green',
          message: t('deliveryRequests.bulkCreate.saveSuccess', {
            count: created.length,
            driver: driver.name,
          }),
        });
        if (linkFailures > 0) {
          notifications.show({
            color: 'yellow',
            message: t('deliveryRequests.bulkCreate.linkWarning', { count: linkFailures }),
            autoClose: 8000,
          });
        }
        onCreated?.();
        onClose();
      } else if (created.length > 0) {
        notifications.show({
          color: 'yellow',
          title: t('deliveryRequests.bulkCreate.partialTitle'),
          message: t('deliveryRequests.bulkCreate.partial', {
            ok: created.length,
            fail: failures.length,
          }),
          autoClose: 10000,
        });
        onCreated?.();
        onClose();
      } else {
        notifications.show({
          color: 'red',
          title: t('deliveryRequests.bulkCreate.saveFailedTitle'),
          message: t('deliveryRequests.bulkCreate.saveFailed', { count: failures.length }),
        });
      }
    } finally {
      setLoading(false);
    }
  }, [
    driver,
    date,
    selectedIds,
    eligibleOrders,
    notes,
    isUrgent,
    getCustomerByCode,
    t,
    onClose,
    onCreated,
  ]);

  const handleSaveInbound = useCallback(async () => {
    const isSample = inboundSource === 'customer-sample';
    if ((isSample ? !sampleCustomerName.trim() : !vendorName.trim()) || !driver || !date) return;
    setLoading(true);
    
    
    
    
    const matchedVendor =
      !isSample && vendorCode.trim()
        ? vendors.find((v) => v.code === vendorCode.trim())
        : undefined;
    const { deliveryAddress, googleMapUrl } = isSample
      ? resolveCustomerPickupAddress(sampleCustomer)
      : resolveVendorInboundAddress(matchedVendor);
    try {
      const { linkFailed } = await createDeliveryRequestRecord({
        direction: 'inbound',
        
        ...(isSample ? { inboundKind: 'customer-sample' as const } : {}),
        salesOrderId: '',
        salesOrderNumber: '',
        customerName: isSample ? sampleCustomerName.trim() : '',
        vendorCode: isSample ? '' : vendorCode.trim(),
        vendorName: isSample ? '' : vendorName.trim(),
        deliveryAddress,
        googleMapUrl,
        scheduledDate: toDateTimeInputOrUndefined(date),
        notes: notes.trim(),
        items: [],
        assignedDriverId: driver.id,
        assignedDriverName: driver.name,
        isUrgent,
        currentEmployee: currentEmployee
          ? { id: currentEmployee.id, name: currentEmployee.name }
          : undefined,
        
        initialStatus: 'pending',
        defaultStatus: getInitialStatusValue() ?? '',
      });
      
      
      if (linkFailed) {
        notifications.show({
          color: 'yellow',
          title: t('deliveryRequests.notifications.createSuccess'),
          message: t('deliveryRequests.notifications.linkSalesOrderFailed'),
          autoClose: 8000,
        });
      }
      notifications.show({
        color: 'green',
        message: t('deliveryRequests.notifications.createSuccess'),
      });
      onCreated?.();
      onClose();
    } catch {
      notifications.show({
        color: 'red',
        message: t('deliveryRequests.notifications.createError'),
      });
    } finally {
      setLoading(false);
    }
  }, [
    inboundSource,
    sampleCustomer,
    sampleCustomerName,
    vendorName,
    vendorCode,
    vendors,
    driver,
    date,
    notes,
    isUrgent,
    currentEmployee,
    t,
    onClose,
    onCreated,
  ]);

  const scheduledDateLabel = isInbound
    ? t('deliveryRequests.form.scheduledDateLabelReceive')
    : t('deliveryRequests.bulkCreate.dateRequiredLabel');

  const canSubmit = isInbound
    ? (inboundSource === 'customer-sample' ? !!sampleCustomerName.trim() : !!vendorName.trim()) &&
      !!driver &&
      !!date
    : !!driver && !!date && selectedIds.size > 0;

  return (
    <Stack gap="md">
      <SegmentTabs<CMngtDeliveryRequestDirection>
        value={direction}
        onChange={handleDirectionChange}
        data={[
          {
            value: 'outbound',
            label: t('deliveryRequests.form.directionOutbound'),
            icon: <IconPackageExport size={22} />,
            description: t('deliveryRequests.form.directionOutboundDesc'),
          },
          {
            value: 'inbound',
            label: t('deliveryRequests.form.directionInbound'),
            icon: <IconPackageImport size={22} />,
            description: t('deliveryRequests.form.directionInboundDesc'),
          },
        ]}
      />

      {isInbound && (
        <Stack gap="xs">
          <SegmentTabs<'vendor' | 'customer-sample'>
            value={inboundSource}
            onChange={handleInboundSourceChange}
            data={[
              {
                value: 'vendor',
                label: t('deliveryRequests.receiveSource.vendor'),
                icon: <IconBuildingWarehouse size={22} />,
                description: t('deliveryRequests.receiveSource.vendorDesc'),
              },
              {
                value: 'customer-sample',
                label: t('deliveryRequests.receiveSource.sample'),
                icon: <IconTestPipe size={22} />,
                description: t('deliveryRequests.receiveSource.sampleDesc'),
              },
            ]}
          />
          {inboundSource === 'vendor' ? (
            <Stack gap={6}>
              <Switch
                size="xs"
                label={t('deliveryRequests.form.unregisteredVendorLabel')}
                checked={oneOffVendor}
                onChange={(e) => {
                  setOneOffVendor(e.currentTarget.checked);
                  
                  
                  setVendorName('');
                  setVendorCode('');
                }}
              />
              {oneOffVendor ? (
                <TextInput
                  label={t('deliveryRequests.form.vendorLabel')}
                  placeholder={t('deliveryRequests.form.vendorTypePlaceholder')}
                  withAsterisk
                  value={vendorName}
                  onChange={(e) => {
                    setVendorName(e.currentTarget.value);
                    setVendorCode('');
                  }}
                />
              ) : (
                <VendorSelector
                  label={t('deliveryRequests.form.vendorLabel')}
                  placeholder={t('deliveryRequests.form.vendorPlaceholder')}
                  withAsterisk
                  clearable
                  filter={activeVendorFilter}
                  value={vendorCode || null}
                  onChange={(sel) => {
                    setVendorName(sel?.name ?? '');
                    setVendorCode(sel?.code ?? '');
                  }}
                />
              )}
            </Stack>
          ) : (
            <CustomerSelector
              label={t('common.labels.customer')}
              placeholder={t('common.labels.customer')}
              withAsterisk
              clearable
              value={sampleCustomer?.id ?? null}
              onChange={(sel) => {
                setSampleCustomer(sel?.customer ?? null);
                setSampleCustomerName(sel?.name ?? '');
              }}
            />
          )}
        </Stack>
      )}

      <Group grow align="flex-start">
        <EmployeeSelector
          label={t('deliveryRequests.form.driverLabel')}
          placeholder={t('deliveryRequests.form.driverPlaceholder')}
          withAsterisk
          clearable
          filter={driverEmployeeFilter}
          value={driverId}
          onChange={(sel) => setDriverId(sel?.id ?? null)}
        />
        <DateField
          futureOnly
          withAsterisk
          label={scheduledDateLabel}
          placeholder={t('deliveryRequests.form.scheduledDatePlaceholder')}
          leftSection={<IconCalendar size={16} />}
          clearable
          value={date}
          onChange={(v) => setDate(typeof v === 'string' ? (v ? new Date(v) : null) : v)}
        />
      </Group>

      {/* Outbound: pick a customer first, then its open sales orders show as a
          batch checklist (SOs without a DR yet). No orders are listed until a
          customer is selected. */}
      {!isInbound && (
        <Stack gap="xs">
          <CustomerSelector
            label={t('common.labels.customer')}
            placeholder={t('common.labels.customer')}
            withAsterisk
            clearable
            filter={customerWithOpenSOFilter}
            nothingFoundMessage={t('deliveryRequests.bulkCreate.noCustomersWithOpenSO')}
            value={customerId}
            onChange={(sel) => {
              setCustomerId(sel?.id ?? null);
              setCustomerCode(sel?.customer.code ?? null);
              
              
              setSelectedIds(new Set());
            }}
          />
          {!customerCode ? (
            <Alert color="gray" variant="light" icon={<IconInfoCircle size={16} />}>
              {t('deliveryRequests.bulkCreate.selectCustomerFirst')}
            </Alert>
          ) : eligibleOrders.length === 0 ? (
            <Alert color="gray" variant="light" icon={<IconInfoCircle size={16} />}>
              {t('deliveryRequests.bulkCreate.noEligibleOrdersForCustomer')}
            </Alert>
          ) : (
            <Stack gap="xs">
              <Group justify="space-between">
                <Checkbox
                  checked={allSelected}
                  indeterminate={someSelected}
                  onChange={toggleAll}
                  label={t('deliveryRequests.bulkCreate.selectAll')}
                />
                <Text size="xs" c="dimmed">
                  {t('deliveryRequests.bulkCreate.selectedCount', { count: selectedIds.size })}
                </Text>
              </Group>
              <ScrollArea.Autosize mah={320}>
                <Stack gap={4}>
                  {eligibleOrders.map((so) => (
                    <OrderRow
                      key={so.id}
                      order={so}
                      checked={selectedIds.has(so.id)}
                      customerName={resolveSalesOrderCustomerName(so, getCustomerByCode)}
                      onToggle={() => toggleOne(so.id)}
                    />
                  ))}
                </Stack>
              </ScrollArea.Autosize>
            </Stack>
          )}
        </Stack>
      )}

      <Textarea
        label={t('__new__.01-common.labels.note')}
        placeholder={t('deliveryRequests.form.notesPlaceholder')}
        autosize
        minRows={2}
        value={notes}
        onChange={(e) => setNotes(e.currentTarget.value)}
      />

      <Switch
        label={t('deliveryRequests.form.isUrgentLabel')}
        description={t('deliveryRequests.form.isUrgentDesc')}
        color="red"
        checked={isUrgent}
        onChange={(e) => setIsUrgent(e.currentTarget.checked)}
      />

      <Group justify="flex-end" gap="sm" mt="md">
        <Button variant="default" size="sm" disabled={loading} onClick={onClose}>
          {t('__new__.01-common.actions.cancel')}
        </Button>
        <Button
          size="sm"
          loading={loading}
          disabled={!canSubmit}
          onClick={isInbound ? handleSaveInbound : handleSaveOutbound}
        >
          {isInbound
            ? t('deliveryRequests.form.createButton')
            : t('deliveryRequests.bulkCreate.createButton', { count: selectedIds.size })}
        </Button>
      </Group>
    </Stack>
  );
}

type OrderRowProps = {
  order: SalesOrder;
  checked: boolean;
  customerName: string | undefined;
  onToggle: () => void;
};

function OrderRow({ order, checked, customerName, onToggle }: OrderRowProps) {
  return (
    <Group
      gap="sm"
      wrap="nowrap"
      p="xs"
      onClick={onToggle}
      style={{
        borderRadius: 'var(--mantine-radius-sm)',
        border: '1px solid var(--mantine-color-default-border)',
        cursor: 'pointer',
      }}
    >
      <Checkbox checked={checked} onChange={onToggle} onClick={(e) => e.stopPropagation()} />
      <Box style={{ flex: 1, minWidth: 0 }}>
        <Text size="sm" fw={600} truncate>
          {order.orderNumber}
        </Text>
        <Text size="xs" c="dimmed" truncate>
          {customerName || '—'}
        </Text>
      </Box>
    </Group>
  );
}
