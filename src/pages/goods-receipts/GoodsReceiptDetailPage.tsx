import {
  ActionIcon,
  Alert,
  Anchor,
  Badge,
  Box,
  Button,
  Divider,
  Drawer,
  Grid,
  Group,
  Modal,
  rem,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core';
import { useEffect, useState } from 'react';
import {
  IconAlertTriangle,
  IconArrowLeft,
  IconArrowRight,
  IconBuildingWarehouse,
  IconCheck,
  IconClipboardCheck,
  IconClipboardList,
  IconCopy,
  IconEdit,
  IconHistory,
  IconNote,
  IconPackage,
  IconRefresh,
  IconTrendingUp,
  IconTruckDelivery,
  IconX,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { ROUTES } from '@/constants/routes';
import { cMngtConnector } from '@credo/connectors/connector';
import { CodeLabel, FieldLabel, Tabs } from '@credo/base-ui/components';
import { asyncDeduplicator, device } from '@credo/base-ui/utils';
import { EmployeeLink } from '@/components/EmployeeLink';
import { ProductLink } from '@/components/ProductLink';
import { SectionCard } from '@/components/SectionCard';
import { VendorLink } from '@/components/VendorLink';
import { useProductStore } from '@/stores/useProductStore';
import { formatDate, formatDateTime } from '@/utils/dateFormat';
import { lookupLabelOf, useLookupLabels } from '@/hooks';
import { isActivityLoggingEnabled, isLocationsEnabled } from '@/utils/permission';
import { ActivityByTargetPanel } from '@/components/activity/ActivityByTargetPanel';
import type { GoodsReceipt, GoodsReceiptItem } from '@/types';
import { useGoodsReceiptDetail } from './useGoodsReceiptDetail';
import {
  GoodsReceiptItemsListMobile,
  GoodsReceiptItemsTableDesktop,
} from './GoodsReceiptItemsTable';
import { resolveBaseUnitDisplay } from './goodsReceiptUnitDisplay';
import type { DateTimeInput, NullableDateTimeInput } from '@credo/kits/types';
import { NumberField } from '@/components/NumberField';

const isMobile = device.isMobile;
const locationsEnabled = isLocationsEnabled();

const activityLogTabVisible = !isMobile && isActivityLoggingEnabled();

const STICKY_CTA_BOTTOM = 76;

const STICKY_CTA_RESERVATION = 80;

function StatusStrip({
  receipt,
  compact,
}: {
  readonly receipt: GoodsReceipt;
  readonly compact: boolean;
}) {
  const { t } = useTranslation();

  const isReceived = receipt.status === 'received';
  const isCancelled = receipt.status === 'cancelled';

  const mainDone = isReceived;

  return (
    <Box
      style={{
        background: 'var(--mantine-color-gray-0)',
        borderRadius: 'var(--mantine-radius-md)',
        padding: compact ? '12px 14px' : '14px 18px',
        border: '1px solid var(--mantine-color-default-border)',
      }}
    >
      <Group gap={compact ? 10 : 16} wrap="nowrap" align="center">
        <Node
          label={t('goodsReceipts.statuses.draft')}
          icon={<IconClipboardList size={14} />}
          state={isReceived || isCancelled ? 'done-neutral' : 'active-gray'}
          timestamp={receipt.createdAt}
          compact={compact}
          showLabelWhenInactive
        />
        <Connector state={mainDone ? 'done' : 'pending'} />
        <Node
          label={t('goodsReceipts.statuses.received')}
          icon={isReceived ? <IconCheck size={14} /> : <IconTruckDelivery size={14} />}
          state={isReceived ? 'active-green' : isCancelled ? 'skipped' : 'pending'}
          timestamp={receipt.receivedAt}
          compact={compact}
          showLabelWhenInactive={!compact || !isCancelled}
        />
        {(isCancelled || receipt.cancelledAt) && (
          <>
            <Connector state="cancelled" />
            <Node
              label={t('goodsReceipts.statuses.cancelled')}
              icon={<IconX size={14} />}
              state="active-red"
              timestamp={receipt.cancelledAt}
              compact={compact}
              showLabelWhenInactive
            />
          </>
        )}
      </Group>
    </Box>
  );
}

type NodeState =
  'active-gray' | 'active-green' | 'active-red' | 'done-neutral' | 'pending' | 'skipped';

const NODE_PALETTE: Record<NodeState, { color: string; variant: 'filled' | 'light' | 'outline' }> =
  {
    'active-gray': { color: 'gray', variant: 'filled' },
    'active-green': { color: 'green', variant: 'filled' },
    'active-red': { color: 'red', variant: 'filled' },
    'done-neutral': { color: 'green', variant: 'light' },
    pending: { color: 'gray', variant: 'outline' },
    skipped: { color: 'gray', variant: 'outline' },
  };

function Node({
  label,
  icon,
  state,
  timestamp,
  compact,
  showLabelWhenInactive,
}: {
  readonly label: string;
  readonly icon: React.ReactNode;
  readonly state: NodeState;
  readonly timestamp?: NullableDateTimeInput;
  readonly compact: boolean;
  readonly showLabelWhenInactive: boolean;
}) {
  const isActive = state.startsWith('active-');
  const p = NODE_PALETTE[state];
  const muted = state === 'pending' || state === 'skipped';

  return (
    <Stack gap={2} align="center" style={{ minWidth: compact ? 64 : 90 }}>
      <ThemeIcon size={compact ? 28 : 32} radius="xl" color={p.color} variant={p.variant}>
        {icon}
      </ThemeIcon>
      {(isActive || showLabelWhenInactive) && (
        <Text
          size="xs"
          fw={isActive ? 700 : 500}
          c={muted ? 'dimmed' : undefined}
          ta="center"
          lh={1.1}
        >
          {label}
        </Text>
      )}
      {timestamp && !muted && (
        <Text size="10px" c="dimmed" ta="center" lh={1.1} style={{ whiteSpace: 'nowrap' }}>
          {formatDateTime(timestamp)}
        </Text>
      )}
    </Stack>
  );
}

function Connector({ state }: { readonly state: 'done' | 'pending' | 'cancelled' }) {
  const styles =
    state === 'done'
      ? { background: 'var(--mantine-color-green-5)', borderTop: 'none' }
      : state === 'cancelled'
        ? {
            background: 'transparent',
            borderTop: '2px dashed var(--mantine-color-red-4)',
            height: 0,
          }
        : {
            background: 'transparent',
            borderTop: '2px dashed var(--mantine-color-gray-4)',
            height: 0,
          };
  return (
    <Box
      style={{
        flex: 1,
        height: state === 'done' ? 2 : 0,
        minWidth: 18,
        marginTop: 14,
        ...styles,
      }}
    />
  );
}

export function GoodsReceiptDetailPage() {
  const { t } = useTranslation();
  const detail = useGoodsReceiptDetail(t);
  const {
    receipt,
    loading,
    actionLoading,
    status,
    isReceived,
    isCancelled,
    showConfirmCta,
    showCancelCta,
    showEditCta,
    showCopyCta,
    canEditItems,
    stockPostedOnDraft,
    confirmAction,
    confirmOpened,
    openConfirm,
    closeConfirm,
    runAction,
    handleCopyReceipt,
    postingStatus,
    showRepostCta,
    repostOpened,
    openRepost,
    closeRepost,
    reposting,
    handleRepostInventory,
    editingItemIdx,
    setEditingItemIdx,
    savingItem,
    handleSaveItemQuantity,
  } = detail;

  const [activeTab, setActiveTab] = useState<string | null>('receipt');

  const unitLabels = useLookupLabels('unit');

  const products = useProductStore((s) => s.items);

  if (loading || !receipt || !status) return null;

  const unitTotals = new Map<string, number>();
  for (const it of receipt.items) {
    const key = it.unit || '';
    unitTotals.set(key, (unitTotals.get(key) ?? 0) + it.quantity);
  }
  const unitTotalsArr = Array.from(unitTotals.entries()).filter(([u]) => u);

  const headerColor = isCancelled ? 'red' : isReceived ? 'green' : 'gray';
  const thumbSize = isMobile ? 56 : 72;
  const thumbIconSize = isMobile ? 28 : 32;

  const titleBlock = (
    <Group
      gap={isMobile ? 'sm' : 'md'}
      wrap="nowrap"
      align="flex-start"
      style={{ minWidth: 0, flex: 1 }}
    >
      <ThemeIcon size={thumbSize} radius={12} variant="light" color={headerColor}>
        <IconClipboardCheck size={thumbIconSize} />
      </ThemeIcon>
      <Stack gap={6} style={{ minWidth: 0, flex: 1 }}>
        <Stack gap={2} style={{ minWidth: 0 }}>
          <Title order={isMobile ? 5 : 3} lh={1.2}>
            {t('goodsReceipts.detailTitle')}
          </Title>
          <CodeLabel code={receipt.receiptNumber} size={isMobile ? 'xs' : 'sm'} />
        </Stack>
        <Group gap={6} wrap="wrap" align="center">
          <Badge color={status.color} variant="filled" size={isMobile ? 'sm' : 'md'} radius="sm">
            {t(status.labelKey)}
          </Badge>
          <Group gap={4} wrap="nowrap" align="center" style={{ minWidth: 0 }}>
            <Text span size="sm" c="dimmed" fs="italic">
              {t('goodsReceipts.detail.from')}
            </Text>
            <VendorLink code={receipt.vendorCode} name={receipt.vendorName} size="sm" />
          </Group>
          {locationsEnabled && receipt.locationName && (
            <Group gap={4} wrap="nowrap" align="center" style={{ minWidth: 0 }}>
              <Text span size="sm" c="dimmed" mx={2}>
                ·
              </Text>
              <Text span size="sm" fw={600}>
                {receipt.locationName}
              </Text>
            </Group>
          )}
        </Group>
      </Stack>
    </Group>
  );

  const isSingleUnitHero = unitTotalsArr.length === 1;
  const heroBlock = (
    <Stack
      gap={4}
      align={isMobile ? 'flex-start' : 'flex-end'}
      style={{ flexShrink: 0, minWidth: 0 }}
    >
      {isSingleUnitHero ? (
        <>
          <FieldLabel>{t('goodsReceipts.detail.heroLabel')}</FieldLabel>
          <Group gap={6} wrap="nowrap" align="baseline">
            <Text size={isMobile ? 'lg' : '28px'} fw={800} lh={1.1}>
              {unitTotalsArr[0][1].toLocaleString()}
            </Text>
            <Text size="sm" c="dimmed">
              {lookupLabelOf(unitLabels, unitTotalsArr[0][0])}
            </Text>
          </Group>
          {(() => {
            const single = receipt.items[0];
            if (!single) return null;
            const tail = resolveBaseUnitDisplay(single, products, unitLabels);
            if (!tail) return null;
            return (
              <Text size="xs" c="dimmed" lh={1.2}>
                {tail}
              </Text>
            );
          })()}
        </>
      ) : (
        unitTotalsArr.length > 0 &&
        !isMobile && (
          <Text size="xs" c="dimmed" ta="right" lh={1.3}>
            {unitTotalsArr.map(([u, q], i) => (
              <Text span key={u}>
                {i > 0 && ' · '}
                <Text span fw={600}>
                  {q.toLocaleString()}
                </Text>{' '}
                {lookupLabelOf(unitLabels, u)}
              </Text>
            ))}
          </Text>
        )
      )}
      {!isMobile && (
        <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
          {t('goodsReceipts.detail.headerTimestamps', {
            updated: formatDateTime(receipt.updatedAt),
            created: formatDateTime(receipt.createdAt),
          })}
        </Text>
      )}
    </Stack>
  );

  const headerRow = isMobile ? (
    <Stack gap="sm">
      <Group justify="space-between" align="flex-start" wrap="nowrap" gap="sm">
        {titleBlock}
        {showEditCta && (
          <Tooltip label={t('__new__.01-common.actions.edit')}>
            <ActionIcon
              component={Link}
              to={ROUTES.GOODS_RECEIPTS.EDIT.replace(':id', receipt.id)}
              variant="light"
              size="lg"
              style={{ flexShrink: 0 }}
            >
              <IconEdit size={16} />
            </ActionIcon>
          </Tooltip>
        )}
      </Group>
      <Group justify="space-between" align="flex-end" wrap="wrap" gap="sm">
        {heroBlock}
      </Group>
    </Stack>
  ) : (
    <Group align="flex-start" justify="space-between" wrap="nowrap" gap="lg">
      {titleBlock}
      {heroBlock}
    </Group>
  );

  const topActions = isMobile ? null : (
    <Group justify="space-between">
      <Button
        onClick={() => window.history.back()}
        variant="subtle"
        size="compact-sm"
        leftSection={<IconArrowLeft size={16} />}
      >
        {t('__new__.01-common.actions.back')}
      </Button>
      <Group gap="xs">
        {showCopyCta && (
          <Button
            variant="subtle"
            size="compact-sm"
            leftSection={<IconCopy size={14} />}
            onClick={handleCopyReceipt}
          >
            {t('__new__.01-common.actions.copy')}
          </Button>
        )}
        {showEditCta && (
          <Button
            component={Link}
            to={ROUTES.GOODS_RECEIPTS.EDIT.replace(':id', receipt.id)}
            variant="default"
            size="compact-sm"
            leftSection={<IconEdit size={14} />}
          >
            {t('__new__.01-common.actions.edit')}
          </Button>
        )}
        {showCancelCta && (
          <Button
            variant="light"
            color="red"
            size="compact-sm"
            leftSection={<IconX size={14} />}
            loading={actionLoading && confirmAction === 'cancel'}
            onClick={() => openConfirm('cancel')}
          >
            {t('__new__.07-entities.goodsReceipts.actions.cancel')}
          </Button>
        )}
        {showConfirmCta && (
          <Button
            color="green"
            size="compact-sm"
            leftSection={<IconCheck size={14} />}
            loading={actionLoading && confirmAction === 'confirmReceived'}
            onClick={() => openConfirm('confirmReceived')}
          >
            {t('__new__.07-entities.goodsReceipts.actions.confirmReceived')}
          </Button>
        )}
      </Group>
    </Group>
  );

  const hasReference = !!receipt.reference?.trim();
  const assignedTo = receipt.extra?.assignedTo;
  const copyFromId = receipt.extra?.copyFromId;
  const generalInfoCard = (
    <SectionCard
      icon={<IconClipboardList size={14} />}
      title={t('goodsReceipts.detail.cardGeneral')}
    >
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <Stack gap={4}>
          <FieldLabel>{t('common.labels.vendor')}</FieldLabel>
          <VendorLink code={receipt.vendorCode} name={receipt.vendorName} size="sm" />
        </Stack>
        {locationsEnabled && (
          <FieldSlot label={t('goodsReceipts.columns.locationName')} value={receipt.locationName} />
        )}
        <FieldSlot
          label={t('goodsReceipts.columns.receivedDate')}
          value={receipt.receivedDate ? formatDate(receipt.receivedDate) : '-'}
        />
        {hasReference && (
          <FieldSlot label={t('goodsReceipts.columns.reference')} value={receipt.reference} mono />
        )}
        {/* PIC slot — show as a link when set, italic dimmed empty state
            otherwise. Hiding the row entirely would conflate "no operator
            assigned yet" with "feature absent"; keeping the slot makes the
            ownership question visible. */}
        <Stack gap={4}>
          <FieldLabel>{t('common.labels.assignedTo')}</FieldLabel>
          {assignedTo ? (
            <EmployeeLink id={assignedTo} size="sm" />
          ) : (
            <Text size="sm" c="dimmed" fs="italic">
              {t('goodsReceipts.detail.noAssignedTo')}
            </Text>
          )}
        </Stack>
        {/* Copied-from slot — present only when this receipt was created via
            the Copy CTA. Hides entirely otherwise (absence is meaningful, no
            "—" placeholder), matching the reference-row policy. */}
        {copyFromId && (
          <Stack gap={4}>
            <FieldLabel>{t('goodsReceipts.detail.copiedFrom')}</FieldLabel>
            <CopiedFromLink id={copyFromId} />
          </Stack>
        )}
      </SimpleGrid>
    </SectionCard>
  );

  const wasReceived = isCancelled && !!receipt.receivedAt;
  const showInventoryEffect = (isReceived || wasReceived) && receipt.items.length > 0;
  const effectColor = wasReceived ? 'red' : 'green';
  const effectSign = wasReceived ? '−' : '+';
  const inventoryEffectCard = showInventoryEffect ? (
    <SectionCard
      icon={<IconTrendingUp size={14} />}
      title={t(
        wasReceived
          ? 'goodsReceipts.detail.cardInventoryEffectReversed'
          : 'goodsReceipts.detail.cardInventoryEffect',
      )}
      padding="md"
    >
      <Stack gap="sm">
        {/* The receipt says `received`, but some rows never got the bump — the
            confirm's best-effort write loop died mid-flight. Offer the repair. */}
        {showRepostCta && (
          <Alert color="orange" variant="light" icon={<IconAlertTriangle size={16} />}>
            <Stack gap={8}>
              <Text size="sm">
                {t('goodsReceipts.detail.inventoryNotPostedWarning', {
                  count: postingStatus?.missingCount ?? 0,
                })}
              </Text>
              <Group>
                <Button
                  size="compact-sm"
                  color="orange"
                  loading={reposting}
                  onClick={openRepost}
                  leftSection={<IconRefresh size={14} />}
                >
                  {t('goodsReceipts.detail.repostInventoryAction')}
                </Button>
              </Group>
            </Stack>
          </Alert>
        )}
        <Stack gap={6}>
          {receipt.items.map((item, idx) => {
            const lineState = isReceived ? postingStatus?.byItemCode.get(item.itemCode) : undefined;
            const notPosted = lineState === 'missing' || lineState === 'orphaned';
            const lineColor = notPosted ? 'orange' : lineState === 'skipped' ? 'gray' : effectColor;
            return (
              <Group key={idx} gap={8} wrap="nowrap" align="baseline">
                <ThemeIcon size={16} radius="xl" color={lineColor} variant="light">
                  {notPosted ? (
                    <IconAlertTriangle size={10} />
                  ) : wasReceived ? (
                    <IconX size={10} />
                  ) : (
                    <IconCheck size={10} />
                  )}
                </ThemeIcon>
                <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                  <Group gap={4} wrap="wrap" align="baseline">
                    <ProductLink code={item.itemCode} name={item.itemName} size="sm" />
                    {lineState === 'missing' && (
                      <Badge size="xs" color="orange" variant="light" radius="sm">
                        {t('goodsReceipts.detail.lineNotPosted')}
                      </Badge>
                    )}
                    {lineState === 'orphaned' && (
                      <Badge size="xs" color="red" variant="light" radius="sm">
                        {t('goodsReceipts.detail.lineOrphaned')}
                      </Badge>
                    )}
                    {lineState === 'skipped' && (
                      <Badge size="xs" color="gray" variant="light" radius="sm">
                        {t('goodsReceipts.detail.lineNoStockTracking')}
                      </Badge>
                    )}
                  </Group>
                  <Group gap={4} wrap="nowrap" align="baseline">
                    <Text
                      size="sm"
                      fw={700}
                      c={lineColor}
                      td={notPosted || lineState === 'skipped' ? 'line-through' : undefined}
                    >
                      {effectSign}
                      {item.quantity.toLocaleString()}
                    </Text>
                    <Text size="sm" c="dimmed">
                      {lookupLabelOf(unitLabels, item.unit)}
                    </Text>
                    {locationsEnabled && receipt.locationName && (
                      <>
                        <Text size="sm" c="dimmed">
                          →
                        </Text>
                        <Group gap={4} wrap="nowrap" align="center">
                          <IconBuildingWarehouse size={12} color="var(--mantine-color-dimmed)" />
                          <Text size="sm">{receipt.locationName}</Text>
                        </Group>
                      </>
                    )}
                  </Group>
                </Stack>
              </Group>
            );
          })}
        </Stack>
        <Group justify="flex-end">
          <Button
            component={Link}
            to={ROUTES.INVENTORY.PRODUCTS}
            variant="subtle"
            size="compact-sm"
            rightSection={<IconArrowRight size={14} />}
          >
            {t('goodsReceipts.detail.inventoryEffectViewAction')}
          </Button>
        </Group>
      </Stack>
    </SectionCard>
  ) : null;

  const notesCard = (
    <SectionCard
      icon={<IconNote size={14} />}
      title={t('__new__.01-common.labels.note')}
      padding="md"
    >
      {receipt.notes?.trim() ? (
        <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
          {receipt.notes}
        </Text>
      ) : (
        <Text size="sm" c="dimmed" fs="italic">
          {t('goodsReceipts.detail.noNotes')}
        </Text>
      )}
    </SectionCard>
  );

  const itemsCard = (
    <SectionCard
      icon={<IconPackage size={14} />}
      title={t('goodsReceipts.detail.itemsTitle')}
      padding={isMobile ? 'md' : 'sm'}
      actions={
        <Badge variant="default" size="sm" radius="sm" tt="none">
          {receipt.items.length} {t('goodsReceipts.detail.heroLineUnit')}
        </Badge>
      }
    >
      {isMobile ? (
        <GoodsReceiptItemsListMobile
          items={receipt.items}
          unitLabels={unitLabels}
          products={products}
          onItemTap={canEditItems ? (idx) => setEditingItemIdx(idx) : undefined}
        />
      ) : (
        <GoodsReceiptItemsTableDesktop
          items={receipt.items}
          unitLabels={unitLabels}
          products={products}
        />
      )}
    </SectionCard>
  );

  const auditCard = (
    <SectionCard icon={<IconHistory size={14} />} title={t('goodsReceipts.detail.cardAudit')}>
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <ActorSlot
          label={t('goodsReceipts.detail.auditCreatedBy')}
          actor={receipt.extra?.createdBy}
          timestamp={receipt.createdAt}
        />
        <ActorSlot
          label={t('goodsReceipts.detail.auditLastUpdatedBy')}
          actor={receipt.extra?.lastUpdatedBy}
          timestamp={receipt.updatedAt}
        />
      </SimpleGrid>
      {(receipt.receivedAt || receipt.cancelledAt) && (
        <>
          <Divider />
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            {receipt.receivedAt && (
              <TimelineSlot
                label={t('goodsReceipts.detail.receivedAt')}
                color="green"
                icon={<IconCheck size={12} />}
                timestamp={receipt.receivedAt}
                actor={receipt.extra?.receivedBy}
              />
            )}
            {receipt.cancelledAt && (
              <TimelineSlot
                label={t('goodsReceipts.detail.cancelledAt')}
                color="red"
                icon={<IconX size={12} />}
                timestamp={receipt.cancelledAt}
              />
            )}
          </SimpleGrid>
        </>
      )}
    </SectionCard>
  );

  const mobileBody = (
    <Tabs defaultValue="items" keepMounted={false}>
      <Tabs.List grow>
        <Tabs.Tab value="items" leftSection={<IconPackage size={16} />}>
          {t('goodsReceipts.detail.tabItems')}
        </Tabs.Tab>
        <Tabs.Tab value="info" leftSection={<IconClipboardList size={16} />}>
          {t('goodsReceipts.detail.tabInfo')}
        </Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="items" pt="md">
        <Stack gap="md">
          {itemsCard}
          {inventoryEffectCard}
        </Stack>
      </Tabs.Panel>
      <Tabs.Panel value="info" pt="md">
        <Stack gap="md">
          {generalInfoCard}
          {notesCard}
          {auditCard}
        </Stack>
      </Tabs.Panel>
    </Tabs>
  );

  const desktopGrid = (
    <Grid gutter="md">
      <Grid.Col span={{ base: 12, md: 7 }}>
        <Stack gap="md">
          {itemsCard}
          {notesCard}
        </Stack>
      </Grid.Col>
      <Grid.Col span={{ base: 12, md: 5 }}>
        <Stack gap="md">
          {generalInfoCard}
          {inventoryEffectCard}
          {auditCard}
        </Stack>
      </Grid.Col>
    </Grid>
  );

  const desktopBody = activityLogTabVisible ? (
    <Tabs value={activeTab} onChange={setActiveTab}>
      <Tabs.List>
        <Tabs.Tab value="receipt" leftSection={<IconClipboardList size={16} />}>
          {t('goodsReceipts.detail.tabReceipt')}
        </Tabs.Tab>
        <Tabs.Tab value="activityLog" leftSection={<IconHistory size={16} />}>
          {t('goodsReceipts.detail.tabActivityLog')}
        </Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="receipt" pt="md">
        {desktopGrid}
      </Tabs.Panel>
      <Tabs.Panel value="activityLog" pt="md">
        {/* Lazy-mount: the by-target panel fires `getByTarget` on mount,
            so we only mount it when the tab is selected. */}
        {activeTab === 'activityLog' && (
          <ActivityByTargetPanel targetId={receipt.id} i18nNamespace="goodsReceipts.detail" />
        )}
      </Tabs.Panel>
    </Tabs>
  ) : (
    desktopGrid
  );

  const stickyBar =
    isMobile && (showConfirmCta || showCancelCta) ? (
      <Box
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: `calc(${STICKY_CTA_BOTTOM}px + env(safe-area-inset-bottom, 0px))`,
          display: 'flex',
          justifyContent: 'center',
          gap: 8,
          padding: '0 16px',
          zIndex: 150,

          pointerEvents: 'none',
        }}
      >
        {showCancelCta && (
          <Button
            variant="white"
            color="red"
            size="md"
            radius="xl"
            leftSection={<IconX size={16} />}
            loading={actionLoading && confirmAction === 'cancel'}
            onClick={() => openConfirm('cancel')}
            style={{
              pointerEvents: 'auto',
              boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15), 0 2px 6px rgba(0, 0, 0, 0.08)',
            }}
          >
            {t('__new__.07-entities.goodsReceipts.actions.cancel')}
          </Button>
        )}
        {showConfirmCta && (
          <Button
            color="green"
            size="md"
            radius="xl"
            leftSection={<IconCheck size={16} />}
            loading={actionLoading && confirmAction === 'confirmReceived'}
            onClick={() => openConfirm('confirmReceived')}
            style={{
              pointerEvents: 'auto',
              boxShadow: '0 6px 20px rgba(34, 139, 34, 0.4), 0 2px 6px rgba(0, 0, 0, 0.1)',
            }}
          >
            {t('__new__.07-entities.goodsReceipts.actions.confirmReceived')}
          </Button>
        )}
      </Box>
    ) : null;

  return (
    <>
      <Stack
        gap={isMobile ? 'md' : 'lg'}

        style={
          stickyBar
            ? {
                paddingBottom: `calc(${STICKY_CTA_RESERVATION}px + env(safe-area-inset-bottom, 0px))`,
              }
            : undefined
        }
      >
        {topActions}
        {headerRow}
        <StatusStrip receipt={receipt} compact={isMobile} />
        {/* The confirm posts stock before flipping status (it has to — the
            posting flag is only writable while draft), so a flip that failed
            mid-flight leaves a draft whose goods are already on the inventory
            rows. Nothing else on the page shows that: the status still reads
            "draft". Say it plainly, and name the two ways out — re-confirm
            (idempotent, the markers make the re-post a no-op) or cancel
            (reverses the bump). Editing is hidden while this is up. */}
        {stockPostedOnDraft && (
          <Alert color="orange" variant="light" icon={<IconAlertTriangle size={16} />}>
            <Text size="sm">{t('goodsReceipts.detail.stockPostedOnDraftWarning')}</Text>
          </Alert>
        )}
        {isMobile ? mobileBody : desktopBody}
      </Stack>

      {stickyBar}

      {/* Locked shut while the action runs: the status flip is followed by a
          sequential inventory write per line, and letting the operator dismiss
          (and navigate away) mid-loop is exactly what leaves a receipt
          `received` with only some rows posted. */}
      <Modal
        opened={confirmOpened}
        onClose={() => {
          if (actionLoading) return;
          closeConfirm();
        }}
        closeOnClickOutside={!actionLoading}
        closeOnEscape={!actionLoading}
        withCloseButton={!actionLoading}
        title={
          confirmAction === 'confirmReceived'
            ? t('goodsReceipts.confirm.confirmTitle')
            : t('goodsReceipts.confirm.cancelTitle')
        }
        centered
      >
        <Stack gap="md">
          <Text size="sm">
            {confirmAction === 'confirmReceived'
              ? t('goodsReceipts.confirm.confirmMessage')
              : t('goodsReceipts.confirm.cancelMessage')}
          </Text>
          {actionLoading && (
            <Text size="xs" c="dimmed">
              {t('goodsReceipts.confirm.inventoryInProgress')}
            </Text>
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={closeConfirm} disabled={actionLoading}>
              {t('__new__.01-common.actions.cancel')}
            </Button>
            <Button
              color={confirmAction === 'confirmReceived' ? 'green' : 'red'}
              loading={actionLoading}
              onClick={runAction}
            >
              {confirmAction === 'confirmReceived'
                ? t('__new__.07-entities.goodsReceipts.actions.confirmReceived')
                : t('__new__.07-entities.goodsReceipts.actions.cancel')}
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Repair confirmation. Explicit rather than one-click, because a receipt
          confirmed before the `receivedByGoodsReceipt` marker shipped carries no
          marker at all — every line reads "not posted" even though its stock IS
          on the row, and re-posting that receipt would double-count. Only the
          operator can tell "the write never ran" from "the write predates the
          marker". Posting is idempotent per row, so a mistaken second press on a
          genuinely-repaired receipt is harmless. */}
      <Modal
        opened={repostOpened}
        onClose={() => {
          if (reposting) return;
          closeRepost();
        }}
        closeOnClickOutside={!reposting}
        closeOnEscape={!reposting}
        withCloseButton={!reposting}
        title={t('goodsReceipts.confirm.repostTitle')}
        centered
      >
        <Stack gap="md">
          <Text size="sm">
            {t('goodsReceipts.confirm.repostMessage', {
              count: postingStatus?.missingCount ?? 0,
            })}
          </Text>
          <Alert color="orange" variant="light" icon={<IconAlertTriangle size={16} />}>
            <Text size="xs">{t('goodsReceipts.confirm.repostWarning')}</Text>
          </Alert>
          <Group justify="flex-end">
            <Button variant="default" onClick={closeRepost} disabled={reposting}>
              {t('__new__.01-common.actions.cancel')}
            </Button>
            <Button color="orange" loading={reposting} onClick={handleRepostInventory}>
              {t('goodsReceipts.detail.repostInventoryAction')}
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Mobile per-item quantity-edit drawer. Mounts at the page root so it
          can read `receipt` and dispatch `updateSafely` directly. The drawer
          is rendered unconditionally (so the close transition plays); inner
          form mounts only when an item is being edited and is keyed by idx
          to reset internal state when the operator switches rows. */}
      <Drawer
        opened={editingItemIdx !== null}
        onClose={() => {
          if (savingItem) return;
          setEditingItemIdx(null);
        }}
        position="bottom"
        size="auto"
        title={t('goodsReceipts.detail.editQuantityTitle')}
        styles={{
          content: { borderTopLeftRadius: rem(16), borderTopRightRadius: rem(16) },
          header: { borderTopLeftRadius: rem(16), borderTopRightRadius: rem(16) },
          body: { paddingBottom: rem(24) },
        }}
      >
        {editingItemIdx !== null && receipt.items[editingItemIdx] && (
          <QuantityEditForm
            key={editingItemIdx}
            item={receipt.items[editingItemIdx]}
            unitLabel={lookupLabelOf(unitLabels, receipt.items[editingItemIdx].unit)}
            saving={savingItem}
            onCancel={() => setEditingItemIdx(null)}
            onSave={(newQty) => handleSaveItemQuantity(editingItemIdx, newQty)}
          />
        )}
      </Drawer>
    </>
  );
}

function QuantityEditForm({
  item,
  unitLabel,
  saving,
  onCancel,
  onSave,
}: {
  readonly item: GoodsReceiptItem;
  readonly unitLabel: string;
  readonly saving: boolean;
  readonly onCancel: () => void;
  readonly onSave: (newQty: number) => void;
}) {
  const { t } = useTranslation();
  const [qty, setQty] = useState<number>(item.quantity);
  const valid = Number.isFinite(qty) && qty >= 0;
  const dirty = qty !== item.quantity;

  return (
    <Stack gap="md">
      <Stack gap={2}>
        <FieldLabel>
          {item.itemType === 'product'
            ? t('common.labels.product')
            : t('goodsReceipts.itemTypes.material')}
        </FieldLabel>
        <Text size="md" fw={600} lh={1.3}>
          {item.itemName}
        </Text>
        <Text size="xs" c="dimmed" ff="monospace">
          {item.itemCode}
        </Text>
      </Stack>

      <NumberField
        label={t('common.labels.quantity')}
        value={qty}
        emptyValue={0}
        onChange={setQty}
        min={0}
        size="md"
        autoFocus
        rightSection={
          <Text size="sm" c="dimmed" pr={8}>
            {unitLabel}
          </Text>
        }
        rightSectionWidth={72}
      />

      <Group justify="flex-end" gap="sm" mt="xs">
        <Button variant="default" onClick={onCancel} disabled={saving}>
          {t('__new__.01-common.actions.cancel')}
        </Button>
        <Button
          color="green"
          onClick={() => onSave(qty)}
          loading={saving}
          disabled={!valid || !dirty}
        >
          {t('goodsReceipts.form.updateButton')}
        </Button>
      </Group>
    </Stack>
  );
}

function CopiedFromLink({ id }: { readonly id: string }) {
  const [receiptNumber, setReceiptNumber] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    asyncDeduplicator
      .call(`goods-receipt:${id}`, async () => {
        const res = await cMngtConnector.getGoodsReceiptById({ id });
        return res.goodsReceipt as GoodsReceipt;
      })
      .then((r) => {
        if (cancelled) return;
        setReceiptNumber(r.receiptNumber);
      })
      .catch(() => {
        if (cancelled) return;

        setMissing(true);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (missing) {
    return (
      <Text size="sm" c="dimmed" ff="monospace">
        {id}
      </Text>
    );
  }
  if (!receiptNumber) {
    return (
      <Text size="sm" c="dimmed">
        …
      </Text>
    );
  }
  return (
    <Anchor
      component={Link}
      to={ROUTES.GOODS_RECEIPTS.DETAIL.replace(':id', id)}
      size="sm"
      fw={500}
      underline="hover"
      c="inherit"
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      {receiptNumber}
    </Anchor>
  );
}

function FieldSlot({
  label,
  value,
  mono,
}: {
  readonly label: string;
  readonly value: string | undefined | null;
  readonly mono?: boolean;
}) {
  return (
    <Stack gap={4}>
      <FieldLabel>{label}</FieldLabel>
      <Text size="sm" fw={500} ff={mono ? 'monospace' : undefined}>
        {value || '-'}
      </Text>
    </Stack>
  );
}

function ActorSlot({
  label,
  actor,
  timestamp,
}: {
  readonly label: string;
  readonly actor: string | undefined;
  readonly timestamp: NullableDateTimeInput;
}) {
  const { t } = useTranslation();
  return (
    <Stack gap={4}>
      <FieldLabel>{label}</FieldLabel>
      <EmployeeLink id={actor} size="sm" />
      <Text size="xs" c="dimmed">
        {t('goodsReceipts.detail.auditAt', { datetime: formatDateTime(timestamp) })}
      </Text>
    </Stack>
  );
}

function TimelineSlot({
  label,
  color,
  icon,
  timestamp,
  actor,
}: {
  readonly label: string;
  readonly color: string;
  readonly icon: React.ReactNode;
  readonly timestamp: DateTimeInput;

  readonly actor?: string;
}) {
  const { t } = useTranslation();
  return (
    <Stack gap={4}>
      <Group gap={6} wrap="nowrap">
        <ThemeIcon size={18} radius="xl" color={color} variant="light">
          {icon}
        </ThemeIcon>
        <FieldLabel>{label}</FieldLabel>
      </Group>
      <Text size="sm" fw={500}>
        {formatDateTime(timestamp)}
      </Text>
      {actor && (
        <Group gap={4} wrap="nowrap" align="center">
          <Text size="xs" c="dimmed" fs="italic">
            {t('goodsReceipts.detail.auditBy')}
          </Text>
          <EmployeeLink id={actor} size="xs" />
        </Group>
      )}
    </Stack>
  );
}
