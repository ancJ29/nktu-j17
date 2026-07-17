import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Collapse,
  Group,
  Modal,
  Paper,
  Skeleton,
  Stack,
  Table,
  Text,
  Title,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconChevronRight } from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { notifications } from '@mantine/notifications';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { device } from '@credo/base-ui/utils';
import { ROUTES } from '@/constants/routes';
import { perms } from '@/utils/permission';
import { getCurrentEmployeeId } from '@/hooks/useCurrentEmployee';
import { setSalesOrderQueryRange, useSalesOrderStore } from '@/stores/useSalesOrderStore';
import {
  setDeliveryRequestQueryRange,
  useDeliveryRequestStore,
} from '@/stores/useDeliveryRequestStore';
import { useEmployeeStore } from '@/stores/useEmployeeStore';
import { useCustomerStore } from '@/stores/useCustomerStore';
import { resolveSalesOrderCustomerName } from '@/utils/customerDisplay';
import { getSalesOrderReadyMs } from '@/utils/salesOrderReadyDate';
import { defaultLastNDaysRange } from '@/utils/listFilterDateRange';
import { formatDate } from '@/utils/dateFormat';
import type { Customer, DeliveryRequest, SalesOrder } from '@/types';
import { salesOrderFieldOptions } from '@/pages/sales-orders/useSalesOrderFieldOptions';
import { deliveryRequestStatusOptions } from '@/pages/delivery-requests/useDeliveryRequestStatusOptions';
import { reconcileNktuCompletedDeliveries } from './cheatCompleteSalesOrders';
import { migrateNktuCheatData } from './migrateCheatData';
import { useAuthStore } from '@/stores/useAuthStore';

const WINDOW_DAYS = 90;
const PREVIEW_LIMIT = 50;

const MOBILE_PREVIEW = 3;

const isMobile = device.isMobile;

const NEW_PROCESSING_STATUSES = new Set(['new', 'confirmed']);
const READY_STATUS = 'ready';

const canViewAllOrders = perms.salesOrder.canViewAll();
const canViewSelfOrders = perms.salesOrder.canViewSelf();
const canViewAllRequests = perms.deliveryRequest.canViewAll();
const canViewSelfRequests = perms.deliveryRequest.canViewSelf();

const canSeeOrders = canViewAllOrders || canViewSelfOrders;

const SALES_DEPARTMENT_CODE = 'sales';

const { resolveStatus: resolveSoStatus } = salesOrderFieldOptions;
const { resolveStatus: resolveDrStatus } = deliveryRequestStatusOptions;

const soByReadyDesc = (a: SalesOrder, b: SalesOrder) =>
  getSalesOrderReadyMs(b) - getSalesOrderReadyMs(a) || b.orderNumber.localeCompare(a.orderNumber);

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const dash = (v: string | undefined | null): string => (v && v.trim() ? v : '—');

export default function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const soStore = useSalesOrderStore();
  const drStore = useDeliveryRequestStore();
  const empStore = useEmployeeStore();
  const custStore = useCustomerStore();

  
  
  
  const booted = useRef(false);
  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    
    
    
    
    
    const { from, to } = defaultLastNDaysRange(WINDOW_DAYS);
    setSalesOrderQueryRange(from, to);
    setDeliveryRequestQueryRange(from, to);

    
    
    
    
    void Promise.all([soStore.forceRefresh(), drStore.forceRefresh()]).then(() => {
      void reconcileNktuCompletedDeliveries().then((summary) => {
        if (summary.completed > 0 || summary.failed > 0) {
          
          console.info('[nktu] SO-completion reconcile (CHEAT)', summary);
        }
      });
    });
    void empStore.loadAll();
    void custStore.loadAll();
  }, [soStore, drStore, empStore, custStore]);

  
  
  
  
  const salesDeptScoped = useMemo(() => {
    const me = getCurrentEmployeeId();
    if (!me) return false;
    return empStore.items.find((e) => e.id === me)?.department === SALES_DEPARTMENT_CODE;
  }, [empStore.items]);

  
  
  const canSeeRequests = salesDeptScoped || canViewAllRequests || canViewSelfRequests;

  
  const employeeName = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of empStore.items) m.set(e.id, e.name);
    return m;
  }, [empStore.items]);

  const getCustomerByCode = useCallback(
    (code: string): Customer | undefined => custStore.getByCode(code),
    [custStore],
  );

  
  
  
  
  const isRootUser = useAuthStore((s) => s.user?.isRoot ?? false);
  const [migratingCheatData, setMigratingCheatData] = useState(false);
  const runCheatDataMigration = useCallback(async () => {
    setMigratingCheatData(true);
    try {
      const summary = await migrateNktuCheatData();
      console.info('[nktu] cheat-data migration', summary);
      notifications.show({
        color: summary.failed > 0 ? 'yellow' : 'green',
        title: 'Cheat-data migration',
        message: `Scanned ${summary.scanned}, matched ${summary.matched}, notes fixed ${summary.notesFixed}, inventory deducted ${summary.inventoryDeducted}, failed ${summary.failed}. See console for per-order detail; reload to view.`,
        autoClose: 15000,
      });
    } catch (err) {
      notifications.show({
        color: 'red',
        title: 'Cheat-data migration failed',
        message: err instanceof Error ? err.message : String(err),
        autoClose: 12000,
      });
    } finally {
      setMigratingCheatData(false);
    }
  }, []);

  
  
  
  const visibleOrders = useMemo(() => {
    
    const live = soStore.items.filter((o) => !o.extra?.isDeleted);
    if (canViewAllOrders) return live;
    if (!canViewSelfOrders) return [];
    const me = getCurrentEmployeeId();
    if (!me) return [];
    return live.filter((o: SalesOrder) => o.extra?.assignedStaff === me);
  }, [soStore.items]);

  const newOrders = useMemo(
    () =>
      visibleOrders
        .filter((o) => !o.extra?.cancellation && NEW_PROCESSING_STATUSES.has(o.extra?.status ?? ''))
        .sort(soByReadyDesc),
    [visibleOrders],
  );

  const readyOrders = useMemo(
    () =>
      visibleOrders
        .filter((o) => !o.extra?.cancellation && (o.extra?.status ?? '') === READY_STATUS)
        .sort(soByReadyDesc),
    [visibleOrders],
  );

  
  
  
  
  
  
  
  
  
  
  
  
  const visibleRequests = useMemo(() => {
    
    const liveRequests = drStore.items.filter((d) => !d.extra?.isDeleted);
    if (salesDeptScoped) {
      const myOrderIds = new Set(visibleOrders.map((o) => o.id));
      return liveRequests.filter(
        (d) =>
          d.direction !== 'inbound' && d.salesOrderId != null && myOrderIds.has(d.salesOrderId),
      );
    }
    if (canViewAllRequests) return liveRequests;
    if (!canViewSelfRequests) return [];
    const me = getCurrentEmployeeId();
    if (!me) return [];
    return liveRequests.filter((d: DeliveryRequest) => d.extra?.assignedDriverId === me);
  }, [visibleOrders, drStore.items, salesDeptScoped]);

  const todaySchedule = useMemo(() => {
    const now = new Date();
    return visibleRequests
      .filter((d) => {
        if (!d.scheduledDate) return false;
        if (d.closedAt) return false;
        const when = new Date(d.scheduledDate);
        return !Number.isNaN(when.getTime()) && isSameLocalDay(when, now);
      })
      .sort((a, b) => a.requestNumber.localeCompare(b.requestNumber));
  }, [visibleRequests]);

  const soLoading = soStore.loading && !soStore.initialized;
  const drLoading = drStore.loading && !drStore.initialized;

  const openSo = useCallback(
    (id: string) => navigate(ROUTES.SALES_ORDERS.DETAIL.replace(':id', id)),
    [navigate],
  );
  const openDr = useCallback(
    (id: string) => navigate(ROUTES.DELIVERY.DETAIL.replace(':id', id)),
    [navigate],
  );

  const renderSoCard = useCallback(
    (o: SalesOrder) => (
      <SalesOrderCard
        key={o.id}
        order={o}
        employeeName={employeeName}
        getCustomerByCode={getCustomerByCode}
        onClick={openSo}
      />
    ),
    [employeeName, getCustomerByCode, openSo],
  );

  const renderDrCard = useCallback(
    (d: DeliveryRequest) => (
      <DeliveryRequestCard key={d.id} request={d} employeeName={employeeName} onClick={openDr} />
    ),
    [employeeName, openDr],
  );

  if (isMobile) {
    return (
      <Box p="xs">
        <Stack gap="md">
          {canSeeOrders && (
            <MobileSection
              title={t('home.sections.newOrders')}
              countColor="blue"
              items={newOrders}
              loading={soLoading}
              error={soStore.error}
              renderCard={renderSoCard}
            />
          )}
          {canSeeRequests && (
            <MobileSection
              title={t('home.sections.todaySchedule')}
              countColor="orange"
              items={todaySchedule}
              loading={drLoading}
              error={drStore.error}
              renderCard={renderDrCard}
            />
          )}
          {canSeeOrders && (
            <MobileSection
              title={t('home.sections.readyToDeliver')}
              countColor="teal"
              items={readyOrders}
              loading={soLoading}
              error={soStore.error}
              renderCard={renderSoCard}
            />
          )}
        </Stack>
      </Box>
    );
  }

  return (
    <Box p={{ base: 'xs', md: 'lg' }}>
      <Stack gap="lg" mx="auto">
        {/* TEMPORARY root-only migration trigger — remove with migrateCheatData.ts */}
        {isRootUser && (
          <Button
            variant="light"
            color="grape"
            loading={migratingCheatData}
            onClick={runCheatDataMigration}
            style={{ alignSelf: 'flex-start' }}
          >
            Migrate cheat data (notes + inventory)
          </Button>
        )}
        {canSeeOrders && (
          <DashboardSection
            title={t('home.sections.newOrders')}
            count={newOrders.length}
            countColor="blue"
            onViewAll={() => navigate(ROUTES.SALES_ORDERS.LIST)}
            viewAllLabel={t('home.viewAll')}
          >
            <SalesOrderTable
              orders={newOrders}
              loading={soLoading}
              error={soStore.error}
              onRowClick={openSo}
              employeeName={employeeName}
              getCustomerByCode={getCustomerByCode}
              orderColHeader={t('home.columns.orderNumber')}
            />
          </DashboardSection>
        )}

        {canSeeRequests && (
          <DashboardSection
            title={t('home.sections.todaySchedule')}
            count={todaySchedule.length}
            countColor="orange"
            onViewAll={() => navigate(ROUTES.DELIVERY.LIST)}
            viewAllLabel={t('home.viewAll')}
          >
            <DeliveryRequestTable
              requests={todaySchedule}
              loading={drLoading}
              error={drStore.error}
              onRowClick={openDr}
              employeeName={employeeName}
            />
          </DashboardSection>
        )}

        {canSeeOrders && (
          <DashboardSection
            title={t('home.sections.readyToDeliver')}
            count={readyOrders.length}
            countColor="teal"
            onViewAll={() => navigate(ROUTES.SALES_ORDERS.LIST)}
            viewAllLabel={t('home.viewAll')}
          >
            <SalesOrderTable
              orders={readyOrders}
              loading={soLoading}
              error={soStore.error}
              onRowClick={openSo}
              employeeName={employeeName}
              getCustomerByCode={getCustomerByCode}
              orderColHeader={t('home.columns.poNumber')}
            />
          </DashboardSection>
        )}
      </Stack>
    </Box>
  );
}

function DashboardSection({
  title,
  count,
  countColor,
  onViewAll,
  viewAllLabel,
  children,
}: {
  title: string;
  count: number;
  countColor: string;
  onViewAll: () => void;
  viewAllLabel: string;
  children: ReactNode;
}) {
  const [opened, { toggle }] = useDisclosure(true);

  return (
    <Paper withBorder radius="md" shadow="xs">
      <Group justify="space-between" wrap="nowrap" px="lg" py="md">
        <UnstyledButton onClick={toggle} style={{ flex: 1, minWidth: 0 }}>
          <Group gap="sm" wrap="nowrap">
            <IconChevronRight
              size={18}
              stroke={2.4}
              style={{
                transition: 'transform 150ms ease',
                transform: opened ? 'rotate(90deg)' : 'none',
                color: 'var(--mantine-color-dimmed)',
                flexShrink: 0,
              }}
            />
            <Title order={4} fw={700} lineClamp={1}>
              {title}
            </Title>
            <Badge color={countColor} variant="filled" radius="xl" size="md">
              {count}
            </Badge>
          </Group>
        </UnstyledButton>
        <Tooltip label={viewAllLabel} withArrow position="left">
          <ActionIcon
            variant="subtle"
            color="gray"
            radius="xl"
            onClick={onViewAll}
            aria-label={viewAllLabel}
          >
            <IconChevronRight size={20} />
          </ActionIcon>
        </Tooltip>
      </Group>

      <Collapse in={opened}>
        <Box px="lg" pb="md">
          {children}
        </Box>
      </Collapse>
    </Paper>
  );
}

function MobileSection<T extends { id: string }>({
  title,
  countColor,
  items,
  loading,
  error,
  renderCard,
}: {
  title: string;
  countColor: string;
  items: T[];
  loading: boolean;
  error: Error | null;
  renderCard: (item: T) => ReactNode;
}) {
  const { t } = useTranslation();
  const [opened, { toggle }] = useDisclosure(true);
  const [fullOpened, fullModal] = useDisclosure(false);

  const preview = items.slice(0, MOBILE_PREVIEW);
  const hasMore = items.length > MOBILE_PREVIEW;

  let body: ReactNode;
  if (error) {
    body = (
      <Alert color="red" variant="light">
        {t('home.error')}
      </Alert>
    );
  } else if (loading) {
    body = (
      <Stack gap="sm">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} height={84} radius="md" />
        ))}
      </Stack>
    );
  } else if (items.length === 0) {
    body = (
      <Text c="dimmed" size="sm" ta="center" py="md">
        {t('home.empty')}
      </Text>
    );
  } else {
    body = <Stack gap="sm">{preview.map(renderCard)}</Stack>;
  }

  return (
    <Paper withBorder radius="md" shadow="xs" p="sm">
      <UnstyledButton onClick={toggle} w="100%">
        <Group justify="space-between" wrap="nowrap" px={4} py={2}>
          <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
            <Title order={5} fw={700} lineClamp={1}>
              {title}
            </Title>
            <Badge color={countColor} variant="filled" radius="xl" size="md">
              {items.length}
            </Badge>
          </Group>
          <IconChevronRight
            size={20}
            stroke={2.4}
            style={{
              transition: 'transform 150ms ease',
              transform: opened ? 'rotate(90deg)' : 'none',
              color: `var(--mantine-color-${countColor}-6)`,
              flexShrink: 0,
            }}
          />
        </Group>
      </UnstyledButton>

      <Collapse in={opened}>
        <Box pt="sm">
          {body}
          {hasMore && !loading && !error && (
            <Button variant="subtle" fullWidth mt="sm" onClick={fullModal.open}>
              {t('home.expand')}
            </Button>
          )}
        </Box>
      </Collapse>

      <Modal
        opened={fullOpened}
        onClose={fullModal.close}
        fullScreen
        title={
          <Group gap="xs" wrap="nowrap">
            <Title order={5} fw={700} lineClamp={1}>
              {title}
            </Title>
            <Badge color={countColor} variant="filled" radius="xl" size="sm">
              {items.length}
            </Badge>
          </Group>
        }
        styles={{ body: { paddingTop: 'var(--mantine-spacing-md)' } }}
      >
        <Stack gap="sm">{items.map(renderCard)}</Stack>
      </Modal>
    </Paper>
  );
}

function SalesOrderCard({
  order: o,
  employeeName,
  getCustomerByCode,
  onClick,
}: {
  order: SalesOrder;
  employeeName: Map<string, string>;
  getCustomerByCode: (code: string) => Customer | undefined;
  onClick: (id: string) => void;
}) {
  const status = resolveSoStatus(o.extra?.status);
  return (
    <Paper
      withBorder
      radius="md"
      p="sm"
      onClick={() => onClick(o.id)}
      style={{ cursor: 'pointer' }}
    >
      <Group justify="space-between" align="flex-start" wrap="nowrap" gap="sm">
        <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
          <Group gap={6} align="baseline" wrap="wrap">
            <Text size="sm" fw={700}>
              {o.orderNumber}
            </Text>
            {o.notes && (
              <Text size="xs" c="dimmed" lineClamp={1}>
                ({o.notes})
              </Text>
            )}
          </Group>
          <Text size="sm">{dash(resolveSalesOrderCustomerName(o, getCustomerByCode))}</Text>
          <Group gap={8} wrap="nowrap">
            <Text size="sm">{dash(employeeName.get(o.extra?.assignedStaff ?? ''))}</Text>
            <Text size="xs" c="dimmed">
              {formatDate(o.extra?.orderDate ?? o.createdAt)}
            </Text>
          </Group>
        </Stack>
        <StatusPill label={status.label} color={status.color} />
      </Group>
    </Paper>
  );
}

function DeliveryRequestCard({
  request: d,
  employeeName,
  onClick,
}: {
  request: DeliveryRequest;
  employeeName: Map<string, string>;
  onClick: (id: string) => void;
}) {
  const { t } = useTranslation();
  const outbound = d.direction !== 'inbound';
  const status = resolveDrStatus(d.extra?.status);
  const party = outbound ? d.customerName : d.vendorName;
  const driver = employeeName.get(d.extra?.assignedDriverId ?? '') ?? d.extra?.assignedDriverName;
  return (
    <Paper
      withBorder
      radius="md"
      p="sm"
      onClick={() => onClick(d.id)}
      style={{ cursor: 'pointer' }}
    >
      <Group justify="space-between" align="flex-start" wrap="nowrap" gap="sm">
        <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
          <Text size="sm" fw={700}>
            {d.requestNumber}
          </Text>
          <Text size="sm">{dash(party)}</Text>
          <Text size="sm">{dash(driver)}</Text>
        </Stack>
        <Stack gap={4} align="flex-end">
          <Badge
            color={outbound ? 'orange' : 'teal'}
            variant="filled"
            size="sm"
            radius="sm"
            style={{ whiteSpace: 'nowrap' }}
          >
            {outbound
              ? t('deliveryRequests.form.directionOutbound')
              : t('deliveryRequests.form.directionInbound')}
          </Badge>
          <StatusPill label={status.label} color={status.color} />
        </Stack>
      </Group>
    </Paper>
  );
}

const HEAD_PROPS = {
  fz: 'xs',
  fw: 600,
  c: 'dimmed',
  tt: 'uppercase',
  style: { letterSpacing: '0.02em', whiteSpace: 'nowrap' as const },
};

function StatusPill({ label, color }: { label: string; color: string }) {
  return (
    <Badge color={color} variant="filled" size="sm" radius="sm" style={{ whiteSpace: 'nowrap' }}>
      {label}
    </Badge>
  );
}

function TableState({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <Table.Tr>
      <Table.Td colSpan={colSpan}>
        <Box py="lg" ta="center">
          {children}
        </Box>
      </Table.Td>
    </Table.Tr>
  );
}

function SkeletonRows({ colSpan }: { colSpan: number }) {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <Table.Tr key={i}>
          <Table.Td colSpan={colSpan}>
            <Skeleton height={18} radius="sm" my={4} />
          </Table.Td>
        </Table.Tr>
      ))}
    </>
  );
}

const clickableRow = { cursor: 'pointer' };

function SalesOrderTable({
  orders,
  loading,
  error,
  onRowClick,
  employeeName,
  getCustomerByCode,
  orderColHeader,
}: {
  orders: SalesOrder[];
  loading: boolean;
  error: Error | null;
  onRowClick: (id: string) => void;
  employeeName: Map<string, string>;
  getCustomerByCode: (code: string) => Customer | undefined;
  orderColHeader: string;
}) {
  const { t } = useTranslation();
  const COLS = 5;
  const preview = orders.slice(0, PREVIEW_LIMIT);

  return (
    <Table.ScrollContainer minWidth={720}>
      <Table verticalSpacing="sm" highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th {...HEAD_PROPS}>{orderColHeader}</Table.Th>
            <Table.Th {...HEAD_PROPS}>{t('home.columns.customer')}</Table.Th>
            <Table.Th {...HEAD_PROPS}>{t('home.columns.assignedStaff')}</Table.Th>
            <Table.Th {...HEAD_PROPS}>{t('home.columns.status')}</Table.Th>
            <Table.Th {...HEAD_PROPS}>{t('home.columns.orderDate')}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {error ? (
            <TableState colSpan={COLS}>
              <Alert color="red" variant="light">
                {t('home.error')}
              </Alert>
            </TableState>
          ) : loading ? (
            <SkeletonRows colSpan={COLS} />
          ) : preview.length === 0 ? (
            <TableState colSpan={COLS}>
              <Text c="dimmed" size="sm">
                {t('home.empty')}
              </Text>
            </TableState>
          ) : (
            preview.map((o) => {
              const status = resolveSoStatus(o.extra?.status);
              return (
                <Table.Tr key={o.id} style={clickableRow} onClick={() => onRowClick(o.id)}>
                  <Table.Td>
                    <Group gap={6} wrap="nowrap" align="baseline">
                      <Text size="md" fw={500} style={{ whiteSpace: 'nowrap' }}>
                        {o.orderNumber}
                      </Text>
                      {o.notes && (
                        <Text size="xs" c="dimmed" lineClamp={1}>
                          ({o.notes})
                        </Text>
                      )}
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">
                      {dash(resolveSalesOrderCustomerName(o, getCustomerByCode))}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{dash(employeeName.get(o.extra?.assignedStaff ?? ''))}</Text>
                  </Table.Td>
                  <Table.Td>
                    <StatusPill label={status.label} color={status.color} />
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                      {formatDate(o.extra?.orderDate ?? o.createdAt)}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              );
            })
          )}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}

function DeliveryRequestTable({
  requests,
  loading,
  error,
  onRowClick,
  employeeName,
}: {
  requests: DeliveryRequest[];
  loading: boolean;
  error: Error | null;
  onRowClick: (id: string) => void;
  employeeName: Map<string, string>;
}) {
  const { t } = useTranslation();
  const COLS = 4;
  const preview = requests.slice(0, PREVIEW_LIMIT);

  return (
    <Table.ScrollContainer minWidth={720}>
      <Table verticalSpacing="sm" highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th {...HEAD_PROPS}>{t('home.columns.requestNumber')}</Table.Th>
            <Table.Th {...HEAD_PROPS}>{t('home.columns.customer')}</Table.Th>
            <Table.Th {...HEAD_PROPS}>{t('home.columns.assignedDriver')}</Table.Th>
            <Table.Th {...HEAD_PROPS}>{t('home.columns.status')}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {error ? (
            <TableState colSpan={COLS}>
              <Alert color="red" variant="light">
                {t('home.error')}
              </Alert>
            </TableState>
          ) : loading ? (
            <SkeletonRows colSpan={COLS} />
          ) : preview.length === 0 ? (
            <TableState colSpan={COLS}>
              <Text c="dimmed" size="sm">
                {t('home.empty')}
              </Text>
            </TableState>
          ) : (
            preview.map((d) => {
              const outbound = d.direction !== 'inbound';
              const status = resolveDrStatus(d.extra?.status);
              const party = outbound ? d.customerName : d.vendorName;
              const driver =
                employeeName.get(d.extra?.assignedDriverId ?? '') ?? d.extra?.assignedDriverName;
              return (
                <Table.Tr key={d.id} style={clickableRow} onClick={() => onRowClick(d.id)}>
                  <Table.Td>
                    <Text size="md" fw={500} style={{ whiteSpace: 'nowrap' }}>
                      {d.requestNumber}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{dash(party)}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{dash(driver)}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={6} wrap="nowrap">
                      <Badge
                        color={outbound ? 'orange' : 'teal'}
                        variant="filled"
                        size="sm"
                        radius="sm"
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        {outbound
                          ? t('deliveryRequests.form.directionOutbound')
                          : t('deliveryRequests.form.directionInbound')}
                      </Badge>
                      <StatusPill label={status.label} color={status.color} />
                    </Group>
                  </Table.Td>
                </Table.Tr>
              );
            })
          )}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}
