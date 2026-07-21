

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ActionIcon, Alert, Badge, Box, Button, Drawer, Group, Stack, Text } from '@mantine/core';
import { DateField } from '@/components/DateField';
import { notifications } from '@mantine/notifications';
import {
  IconCalendar,
  IconChevronDown,
  IconChevronUp,
  IconGripVertical,
  IconInfoCircle,
} from '@tabler/icons-react';
import type { TFunction } from 'i18next';
import { EmployeeSelector } from '@/components/selectors';
import { useDeliveryRequestStore } from '@/stores/useDeliveryRequestStore';
import { useEmployeeStore } from '@/stores/useEmployeeStore';
import { EntityConflictError } from '@/stores/createEntityStore';
import { appConfig } from '@/config';
import {
  getDeliveryRequestDriverDepartments,
  makeEmployeeDepartmentFilter,
} from '@/utils/permission';
import type { DeliveryRequest, DeliveryRequestExtra } from '@/types';
import { DeliveryRequestKindBadge } from './DeliveryRequestKindBadge';
import { deliveryRequestPartyIsCustomer } from './deliveryRequestParty';
import { buildDisplayOrderNumber, formatYYMMDD_GMT7 } from './displayOrderNumber';

const driverEmployeeFilter = makeEmployeeDepartmentFilter(getDeliveryRequestDriverDepartments());

type DeliveryReorderModalProps = {
  opened: boolean;
  onClose: () => void;
  t: TFunction;
};

function isSameDayGmt7(isoTimestamp: string, anchorDate: Date): boolean {
  return formatYYMMDD_GMT7(new Date(isoTimestamp)) === formatYYMMDD_GMT7(anchorDate);
}

export function DeliveryReorderModal({ opened, onClose, t }: DeliveryReorderModalProps) {
  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size="50vw"
      padding="lg"
      title={t('deliveryRequests.reorder.title')}
    >
      {opened ? <ReorderForm onClose={onClose} t={t} /> : null}
    </Drawer>
  );
}

type ReorderFormProps = {
  onClose: () => void;
  t: TFunction;
};

type SortableDeliveryRowProps = {
  id: string;
  dr: DeliveryRequest;
  index: number;
  isLast: boolean;
  disabled: boolean;
  onMove: (from: number, to: number) => void;
  t: TFunction;
};

const TOUCH_TARGET = 44;

function SortableDeliveryRow({
  id,
  dr,
  index,
  isLast,
  disabled,
  onMove,
  t,
}: SortableDeliveryRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled,
  });

  
  
  const partyName = deliveryRequestPartyIsCustomer(dr)
    ? dr.customerName || dr.salesOrderNumber
    : dr.vendorName || dr.vendorCode;

  return (
    <Group
      ref={setNodeRef}
      gap="sm"
      wrap="nowrap"
      p="xs"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        borderRadius: 'var(--mantine-radius-md)',
        
        
        
        border: `1px solid ${
          isDragging ? 'var(--mantine-color-blue-5)' : 'var(--mantine-color-default-border)'
        }`,
        background: isDragging ? 'var(--mantine-color-blue-light)' : 'var(--mantine-color-body)',
        boxShadow: isDragging ? 'var(--mantine-shadow-md)' : undefined,
        
        position: 'relative',
        zIndex: isDragging ? 2 : undefined,
      }}
    >
      <Box
        {...attributes}
        {...listeners}
        title={t('deliveryRequests.reorder.dragHint')}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: `0 0 ${TOUCH_TARGET}px`,
          alignSelf: 'stretch',
          minHeight: TOUCH_TARGET,
          borderRadius: 'var(--mantine-radius-sm)',
          
          
          background: 'var(--mantine-color-default-hover)',
          color: 'var(--mantine-color-dimmed)',
          cursor: disabled ? 'not-allowed' : isDragging ? 'grabbing' : 'grab',
          
          
          touchAction: 'none',
        }}
      >
        <IconGripVertical size={20} />
      </Box>
      <Badge variant="filled" color="blue" size="lg" style={{ minWidth: 36, textAlign: 'center' }}>
        {index + 1}
      </Badge>
      <Box style={{ flex: 1, minWidth: 0 }}>
        <Group gap="xs" wrap="nowrap">
          <Text size="sm" fw={600} truncate>
            {dr.requestNumber}
          </Text>
          <DeliveryRequestKindBadge dr={dr} size="xs" />
        </Group>
        <Text size="xs" c="dimmed" truncate>
          {partyName || '—'}
        </Text>
      </Box>
      <Group gap={4} wrap="nowrap">
        <ActionIcon
          variant="light"
          size={TOUCH_TARGET}
          disabled={disabled || index === 0}
          onClick={() => onMove(index, index - 1)}
        >
          <IconChevronUp size={20} />
        </ActionIcon>
        <ActionIcon
          variant="light"
          size={TOUCH_TARGET}
          disabled={disabled || isLast}
          onClick={() => onMove(index, index + 1)}
        >
          <IconChevronDown size={20} />
        </ActionIcon>
      </Group>
    </Group>
  );
}

function ReorderForm({ onClose, t }: ReorderFormProps) {
  const allDrs = useDeliveryRequestStore((s) => s.items) as DeliveryRequest[];
  const drsInit = useDeliveryRequestStore((s) => s.initialized);
  const loadDrs = useDeliveryRequestStore((s) => s.loadAll);
  const employees = useEmployeeStore((s) => s.items);

  
  
  useEffect(() => {
    if (!drsInit) loadDrs();
  }, [drsInit, loadDrs]);

  const [date, setDate] = useState<Date | null>(null);
  const [driverId, setDriverId] = useState<string | null>(null);
  
  const [manualOrder, setManualOrder] = useState<string[] | null>(null);
  const [saving, setSaving] = useState(false);

  
  
  const handleDateChange = useCallback((v: Date | null) => {
    setDate(v);
    setManualOrder(null);
  }, []);
  const handleDriverChange = useCallback((v: string | null) => {
    setDriverId(v);
    setManualOrder(null);
  }, []);

  const driver = useMemo(
    () => (driverId ? (employees.find((e) => e.id === driverId) ?? null) : null),
    [driverId, employees],
  );

  
  
  
  const matchingDrs = useMemo<DeliveryRequest[]>(() => {
    if (!date || !driverId) return [];
    const matches = allDrs.filter((d) => {
      if (!d.scheduledDate) return false;
      if (!isSameDayGmt7(new Date(d.scheduledDate).toISOString(), date)) return false;
      const drExtra = (d.extra ?? {}) as DeliveryRequestExtra;
      return drExtra.assignedDriverId === driverId;
    });
    return matches.sort((a, b) => {
      const ax = ((a.extra ?? {}) as DeliveryRequestExtra).displayOrderNumber ?? '';
      const bx = ((b.extra ?? {}) as DeliveryRequestExtra).displayOrderNumber ?? '';
      if (ax && bx) return ax < bx ? -1 : 1;
      if (ax) return -1;
      if (bx) return 1;
      return a.createdAt < b.createdAt ? -1 : 1;
    });
  }, [allDrs, date, driverId]);

  
  
  
  
  const displayedIds = useMemo<string[]>(() => {
    const naturalIds = matchingDrs.map((d) => d.id);
    if (manualOrder == null) return naturalIds;
    const idSet = new Set(naturalIds);
    const fromManual = manualOrder.filter((id) => idSet.has(id));
    const seen = new Set(fromManual);
    const newcomers = naturalIds.filter((id) => !seen.has(id));
    return [...fromManual, ...newcomers];
  }, [matchingDrs, manualOrder]);

  const drById = useMemo(() => {
    const m = new Map<string, DeliveryRequest>();
    for (const d of allDrs) m.set(d.id, d);
    return m;
  }, [allDrs]);

  
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  
  const moveByIndex = useCallback(
    (from: number, to: number) => {
      if (from < 0 || to < 0 || from === to || to >= displayedIds.length) return;
      setManualOrder(arrayMove(displayedIds, from, to));
    },
    [displayedIds],
  );

  const handleDragEnd = useCallback(
    (e: DragEndEvent) => {
      const { active, over } = e;
      if (!over || active.id === over.id) return;
      moveByIndex(displayedIds.indexOf(String(active.id)), displayedIds.indexOf(String(over.id)));
    },
    [displayedIds, moveByIndex],
  );

  const handleSave = useCallback(async () => {
    if (!date || !driver) return;
    if (displayedIds.length === 0) {
      notifications.show({
        color: 'gray',
        message: t('deliveryRequests.reorder.noMatching'),
      });
      return;
    }
    setSaving(true);
    const codePrefix = appConfig.features?.employees?.codePrefix ?? '';
    const store = useDeliveryRequestStore.getState();
    
    
    const workingMap = new Map(drById);
    const failures: { id: string; reason: string }[] = [];
    let written = 0;
    
    
    for (let i = 0; i < displayedIds.length; i++) {
      const id = displayedIds[i]!;
      const dr = workingMap.get(id);
      if (!dr) {
        failures.push({ id, reason: 'missing' });
        continue;
      }
      const seq = i + 1;
      const newNumber = buildDisplayOrderNumber(date, driver, codePrefix, seq);
      const currentExtra = (dr.extra ?? {}) as DeliveryRequestExtra;
      if (currentExtra.displayOrderNumber === newNumber) {
        
        continue;
      }
      try {
        await store.updateSafely({
          id,
          version: dr.version,
          patch: { extra: { ...currentExtra, displayOrderNumber: newNumber } },
        });
        written += 1;
      } catch (err) {
        if (err instanceof EntityConflictError) {
          failures.push({ id, reason: 'conflict' });
          if (err.latest) {
            
            workingMap.set(id, err.latest as DeliveryRequest);
          }
        } else {
          failures.push({ id, reason: err instanceof Error ? err.message : String(err) });
        }
      }
    }
    setSaving(false);
    if (failures.length === 0) {
      notifications.show({
        color: 'green',
        message: t('deliveryRequests.reorder.saveSuccess', { count: written }),
      });
    } else if (written > 0) {
      notifications.show({
        color: 'yellow',
        title: t('deliveryRequests.reorder.partialTitle'),
        message: t('deliveryRequests.reorder.partial', {
          ok: written,
          fail: failures.length,
        }),
        autoClose: 10000,
      });
    } else {
      notifications.show({
        color: 'red',
        title: t('deliveryRequests.reorder.saveFailedTitle'),
        message: t('deliveryRequests.reorder.saveFailed', { count: failures.length }),
      });
    }
  }, [date, driver, displayedIds, drById, t]);

  return (
    <Stack gap="md">
      <Group grow align="flex-start">
        <DateField
          futureOnly
          label={t('deliveryRequests.reorder.dateLabel')}
          placeholder={t('deliveryRequests.reorder.datePlaceholder')}
          leftSection={<IconCalendar size={16} />}
          value={date}
          onChange={(v) => handleDateChange(typeof v === 'string' ? (v ? new Date(v) : null) : v)}
        />
        <EmployeeSelector
          label={t('deliveryRequests.reorder.driverLabel')}
          placeholder={t('deliveryRequests.reorder.driverPlaceholder')}
          clearable
          filter={driverEmployeeFilter}
          value={driverId}
          onChange={(sel) => handleDriverChange(sel?.id ?? null)}
        />
      </Group>

      {!date || !driverId ? (
        <Alert color="gray" variant="light" icon={<IconInfoCircle size={16} />}>
          {t('deliveryRequests.reorder.pickPrompt')}
        </Alert>
      ) : displayedIds.length === 0 ? (
        <Alert color="gray" variant="light" icon={<IconInfoCircle size={16} />}>
          {t('deliveryRequests.reorder.noMatching')}
        </Alert>
      ) : (
        <Stack gap="xs">
          <Text size="xs" c="dimmed">
            {t('deliveryRequests.reorder.preview', {
              preview: driver
                ? buildDisplayOrderNumber(
                    date,
                    driver,
                    appConfig.features?.employees?.codePrefix ?? '',
                    1,
                  )
                : '',
            })}
          </Text>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={displayedIds} strategy={verticalListSortingStrategy}>
              <Stack gap={6} style={saving ? { opacity: 0.6, pointerEvents: 'none' } : undefined}>
                {displayedIds.map((id, idx) => {
                  const dr = drById.get(id);
                  if (!dr) return null;
                  return (
                    <SortableDeliveryRow
                      key={id}
                      id={id}
                      dr={dr}
                      index={idx}
                      isLast={idx === displayedIds.length - 1}
                      disabled={saving}
                      onMove={moveByIndex}
                      t={t}
                    />
                  );
                })}
              </Stack>
            </SortableContext>
          </DndContext>
        </Stack>
      )}

      <Group justify="flex-end" gap="sm">
        <Button variant="default" onClick={onClose} disabled={saving}>
          {t('__new__.01-common.actions.cancel')}
        </Button>
        <Button
          onClick={handleSave}
          loading={saving}
          disabled={!date || !driverId || displayedIds.length === 0}
        >
          {t('deliveryRequests.reorder.saveButton')}
        </Button>
      </Group>
    </Stack>
  );
}
