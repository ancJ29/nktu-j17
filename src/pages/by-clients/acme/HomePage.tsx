import {
  Anchor,
  Box,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { IconChevronRight } from '@tabler/icons-react';
import { useEffect, useMemo } from 'react';
import { Link } from 'react-router';
import { device } from '@credo/base-ui/utils';
import { ROUTES } from '@/constants/routes';
import { buildDeliveryReport } from '@/pages/v2/reports/buildDeliveryReport';
import { buildInventoryStatus } from '@/pages/v2/reports/buildInventoryStatus';
import { buildReceivingReport } from '@/pages/v2/reports/buildReceivingReport';
import { addDays, buildRevenueReport, todayUtc7 } from '@/pages/v2/reports/buildRevenueReport';
import { detailLink } from '@/pages/v2/reports/reportLinks';
import { useWindowRows } from '@/pages/v2/reports/useWindowRows';
import { deliveryNoteFlowErrors, deliveryNoteStageOf } from '@/pages/v2/delivery-notes/statusFlow';
import { goodsReceiptFlowErrors, goodsReceiptStageOf } from '@/pages/v2/goods-receipts/statusFlow';
import { salesOrderFlowErrors, salesOrderStageOf } from '@/pages/v2/sales-orders/statusFlow';
import { useCanAccessReports } from '@/pages/reports/reportAccess';
import { fetchDeliveryNoteV2Window } from '@/stores/useDeliveryNoteV2Store';
import { fetchGoodsReceiptV2Window } from '@/stores/useGoodsReceiptV2Store';
import { fetchSalesOrderV2Window } from '@/stores/useSalesOrderV2Store';
import { useInventoryV2 } from '@/pages/v2/master-data/useInventoryV2';
import { useProductInventoryV2Store } from '@/stores/useProductInventoryV2Store';
import { useProductV2Store } from '@/stores/useProductV2Store';
import { featureFlags } from '@/utils/features';
import { perms } from '@/utils/permission';
import { formatDate } from '@/utils/dateFormat';
import DefaultHomePage from '../default/HomePage';
import { FlowInvalidAlert, KpiCard, LoadingRow, ReportLink } from './reports/reportKit';
import {
  WIDEN_BACK_DAYS,
  deliveryNotesLink,
  formatVnd,
  goodsReceiptsLink,
  mondayOf,
  salesOrdersLink,
} from './reports/reportShared';
import { ACME_REPORTS } from './reports/list';

const isMobile = device.isMobile;

const STOCK_ROWS = 10;

const canViewProducts = perms.product.canView();

function SectionTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <Box>
      <Title order={5}>{title}</Title>
      {sub && (
        <Text size="xs" c="dimmed">
          {sub}
        </Text>
      )}
    </Box>
  );
}

function useOpsFigures(
  fromDay: string,
  toDay: string,
  rows: {
    orders?: Parameters<typeof buildRevenueReport>[0];
    notes?: Parameters<typeof buildDeliveryReport>[0];
    receipts?: Parameters<typeof buildReceivingReport>[0];
  },
) {
  return useMemo(() => {
    if (!rows.orders || !rows.notes || !rows.receipts) return undefined;
    const scopeless = { fromDay, toDay };
    const revenue = buildRevenueReport(rows.orders, {
      ...scopeless,
      grouping: 'day',
      resolveStage: salesOrderStageOf,
    });
    const deliveries = buildDeliveryReport(rows.notes, {
      ...scopeless,
      resolveStage: deliveryNoteStageOf,
    });
    const receiving = buildReceivingReport(rows.receipts, {
      ...scopeless,
      resolveStage: goodsReceiptStageOf,
    });
    return { revenue, deliveries, receiving };
  }, [fromDay, toDay, rows.orders, rows.notes, rows.receipts]);
}

function OpsKpis({
  figures,
  range,
}: {
  figures: NonNullable<ReturnType<typeof useOpsFigures>>;
  range: { fromDay: string; toDay: string };
}) {
  return (
    <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
      <KpiCard
        label="Doanh thu"
        value={formatVnd(figures.revenue.totals.revenue)}
        to={`${ROUTES.REPORTS}#revenue`}
      />
      <KpiCard
        label="Đơn hàng"
        value={String(figures.revenue.totals.orders)}
        to={salesOrdersLink(range)}
      />
      <KpiCard
        label="Giao hàng"
        value={`${figures.deliveries.totals.delivered}/${figures.deliveries.totals.total}`}
        to={deliveryNotesLink(range)}
      />
      <KpiCard
        label="Phiếu nhập"
        value={String(figures.receiving.totals.receipts)}
        to={goodsReceiptsLink(range)}
      />
    </SimpleGrid>
  );
}

function ManagerDashboard() {
  const { today, monday, fetchFromDay } = useMemo(() => {
    const t = todayUtc7();
    const m = mondayOf(t);
    return { today: t, monday: m, fetchFromDay: addDays(m, -WIDEN_BACK_DAYS) };
  }, []);

  const so = useWindowRows(fetchSalesOrderV2Window, fetchFromDay, today);
  const dn = useWindowRows(fetchDeliveryNoteV2Window, fetchFromDay, today);
  const gr = useWindowRows(fetchGoodsReceiptV2Window, fetchFromDay, today);
  const anyError = so.error || dn.error || gr.error;

  const windowRows = { orders: so.rows, notes: dn.rows, receipts: gr.rows };
  const todayFigures = useOpsFigures(today, today, windowRows);
  const weekFigures = useOpsFigures(monday, today, windowRows);

  const flowErrors = [
    ...salesOrderFlowErrors,
    ...deliveryNoteFlowErrors,
    ...goodsReceiptFlowErrors,
  ];

  const inventoryOn = featureFlags.productsV2.inventory && canViewProducts;
  const stock = useInventoryV2(useProductInventoryV2Store, inventoryOn);
  const products = useProductV2Store((s) => s.items);
  const productsInitialized = useProductV2Store((s) => s.initialized);
  const productsLoading = useProductV2Store((s) => s.loading);
  const loadProducts = useProductV2Store((s) => s.loadAll);
  useEffect(() => {
    if (inventoryOn && !productsInitialized && !productsLoading) void loadProducts();
  }, [inventoryOn, productsInitialized, productsLoading, loadProducts]);

  const inventory = useMemo(
    () => (inventoryOn ? buildInventoryStatus([...stock.byItemId.values()], products) : undefined),
    [inventoryOn, stock.byItemId, products],
  );

  return (
    <Box p={{ base: 'xs', md: 'lg' }}>
      <Stack gap="lg">
        <Box>
          <Title order={3}>Tổng quan</Title>
          <Text size="sm" c="dimmed">
            {formatDate(today)}
          </Text>
        </Box>

        {flowErrors.length > 0 && <FlowInvalidAlert errors={flowErrors} />}
        {anyError && (
          <Text size="sm" c="red">
            Không tải được một phần dữ liệu — các số dưới đây có thể thiếu.
          </Text>
        )}

        <Stack gap="sm">
          <SectionTitle title="Hôm nay" />
          {todayFigures ? (
            <OpsKpis figures={todayFigures} range={{ fromDay: today, toDay: today }} />
          ) : (
            <LoadingRow />
          )}
        </Stack>

        <Stack gap="sm">
          <SectionTitle title="Tuần này" sub={`Từ thứ Hai ${formatDate(monday)}`} />
          {weekFigures ? (
            <OpsKpis figures={weekFigures} range={{ fromDay: monday, toDay: today }} />
          ) : (
            <LoadingRow />
          )}
        </Stack>

        {inventoryOn && (
          <Stack gap="sm">
            <SectionTitle title="Tồn kho" sub="Sắp xếp theo lượng còn bán được, thấp nhất trước" />
            <Paper withBorder radius="md">
              <Stack gap={0}>
                {inventory && inventory.items.length === 0 && (
                  <Text c="dimmed" fz="sm" ta="center" py="md">
                    Chưa có sản phẩm nào được kiểm kê.
                  </Text>
                )}
                {(inventory?.items ?? []).slice(0, STOCK_ROWS).map((item, i) => (
                  <Group
                    key={item.itemId}
                    justify="space-between"
                    wrap="nowrap"
                    px="md"
                    py={8}
                    style={
                      i > 0 ? { borderTop: '1px solid var(--mantine-color-gray-2)' } : undefined
                    }
                  >
                    <Box style={{ minWidth: 0 }}>
                      <Text fw={600} fz="sm" lineClamp={1}>
                        <ReportLink to={detailLink(ROUTES.PRODUCTS_V2.DETAIL, item.itemId)}>
                          {item.name}
                        </ReportLink>
                      </Text>
                      <Text c="dimmed" fz="xs">
                        Tồn {item.onHand} · Về {item.incoming} · Giữ {item.outgoing}
                      </Text>
                    </Box>
                    <Text
                      fw={700}
                      fz="sm"
                      c={item.available < 0 ? 'red' : item.available === 0 ? 'orange' : undefined}
                      style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}
                    >
                      {item.available}
                      {item.unit ? (
                        <Text span c="dimmed" fw={500} fz="xs">
                          {' '}
                          {item.unit}
                        </Text>
                      ) : null}
                    </Text>
                  </Group>
                ))}
              </Stack>
            </Paper>
            <Group justify="space-between">
              {inventory && inventory.uncountedProducts > 0 ? (
                <Text size="xs" c="dimmed">
                  {inventory.uncountedProducts} sản phẩm chưa kiểm kê không hiển thị ở trên.
                </Text>
              ) : (
                <span />
              )}
              <Anchor component={Link} to={ROUTES.PRODUCTS_V2.LIST} size="sm">
                Xem tất cả sản phẩm
              </Anchor>
            </Group>
          </Stack>
        )}

        <Stack gap="sm">
          <SectionTitle title="Báo cáo" />
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            {ACME_REPORTS.map((entry) => {
              const Icon = entry.icon;
              return (
                <Anchor
                  key={entry.key}
                  component={Link}
                  to={`/reports#${entry.key}`}
                  underline="never"
                  c="inherit"
                >
                  <Paper withBorder radius="md" p="sm">
                    <Group wrap="nowrap" gap="sm">
                      <ThemeIcon size={36} radius="md" variant="light" color={entry.color}>
                        <Icon size={20} stroke={1.6} />
                      </ThemeIcon>
                      <Text fw={600} fz="sm" style={{ flex: 1 }} lineClamp={1}>
                        {entry.title}
                      </Text>
                      <IconChevronRight
                        size={18}
                        stroke={2}
                        style={{ color: 'var(--mantine-color-dimmed)', flexShrink: 0 }}
                      />
                    </Group>
                  </Paper>
                </Anchor>
              );
            })}
          </SimpleGrid>
        </Stack>

        {!isMobile && (
          <Text size="xs" c="dimmed">
            Trang này được thiết kế cho điện thoại — cài PWA để mở nhanh.
          </Text>
        )}
      </Stack>
    </Box>
  );
}

export default function AcmeHomePage() {
  const canAccess = useCanAccessReports();
  return canAccess ? <ManagerDashboard /> : <DefaultHomePage />;
}
