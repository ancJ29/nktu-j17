import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import type { TFunction } from 'i18next';
import { ROUTES } from '@/constants/routes';
import { cMngtConnector } from '@credo/connectors/connector';
import { useAuthStore } from '@/stores/useAuthStore';
import { useSalesOrderStore } from '@/stores/useSalesOrderStore';
import { EntityConflictError } from '@/stores/createEntityStore';
import { useDeliveryRequestStore } from '@/stores/useDeliveryRequestStore';
import { useEmployeeStore } from '@/stores/useEmployeeStore';
import { useLocationStore } from '@/stores/useLocationStore';
import { useProductInventoryStore } from '@/stores/useProductInventoryStore';
import { useProductStore } from '@/stores/useProductStore';
import { resolveClientCode } from '@/config/client-code';
import type {
  DeliveryRequest,
  InventoryLinkage,
  InventoryLinkageSnapshotEntry,
  Product,
  SalesOrder,
  SalesOrderActivityEntry,
  SalesOrderAttachment,
  SalesOrderCancellation,
  SalesOrderChatEntry,
  SalesOrderExtra,
  SalesOrderPhoto,
} from '@/types';
import {
  buildReleasedLinkage,
  buildReservedLinkage,
  buildShippedLinkage,
} from '@/utils/inventoryLinkage';
import type { CaptureResult } from '@/components/ImageUploadPanel';
import { getCurrentEmployeeStamp } from '@/hooks/useCurrentEmployee';
import { indexInventoryByProduct } from '@/utils/inventoryCommitment';
import {
  buildLinkageSnapshotFromReserveOps,
  executeReservationPlan,
  planReleaseFromLinkage,
  planReservation,
  planReservationDiff,
  planShipFromLinkage,
  planUnshipFromLinkage,
  rollbackAppliedOps,
  type AppliedOp,
} from '@/utils/inventoryReservation';
import { emitInventoryActivityForApplied } from '@/utils/inventoryActivityEmit';
import { formatPlanFailures } from './planFailures';
import { logActivity } from '@/utils/activityLogger';
import type { SalesOrderInlineFields, SalesOrderReleasedRow } from './activityMemo';
import { salesOrderFieldOptions } from './useSalesOrderFieldOptions';
import {
  deriveIsClosedFromStage,
  getAllowedTransitions,
  getAutoCompletionTargetValue,
  getCancellationTargetStatusValue,
  getInitialStatusValue,
  getStatusFlowOrder,
  runTransition,
  statusHasCapability,
  type TransitionFailure,
} from './transitionEngine';
import { deriveSoDeliveryIssues, type SoDeliveryIssue } from './deliveryReconciliation';
import { dispatchSoFollowUp } from './followUps';
import { advanceSoIfFullyDelivered } from './reconcileFromDeliveries';
import { softDeleteLinkedDeliveryRequests } from '@/pages/delivery-requests/deliveryRequestDelete';
import type { Stage } from './capabilities/types';
import { device } from '@credo/base-ui/utils';
import { getCurrentEmployeeId } from '@/hooks/useCurrentEmployee';
import {
  getSalesOrderCompletionEvidence,
  isAdditionalDRAllowed,
  isProductInventoryEnabled,
  isReturnShipmentEnabled,
  perms,
} from '@/utils/permission';
import { findEmployeeByLoginEmail } from '@/utils/loginEmail';

const isMobile = device.isMobile;
const additionalDRAllowed = isAdditionalDRAllowed();
const returnShipmentEnabled = isReturnShipmentEnabled();
const productInventoryEnabled = isProductInventoryEnabled();
const completionEvidence = getSalesOrderCompletionEvidence();
const canViewAll = perms.salesOrder.canViewAll();
const canViewSelf = perms.salesOrder.canViewSelf();
const canDeletePerm = perms.salesOrder.canDelete();

const canTransitionStatusPerm = perms.salesOrder.canTransitionStatus();

function notifyTransitionFailure(
  failure: TransitionFailure,
  t: TFunction,
  productByCode: Map<string, Product>,
): void {
  switch (failure.kind) {
    case 'plan-failure':
      notifications.show({
        color: 'red',
        title: t('salesOrders.notifications.reservationPlanFailedTitle'),
        message: formatPlanFailures(failure.failures, t, productByCode),
        autoClose: 12000,
      });
      return;
    case 'execution-failure':
      if (failure.orphanedRowIds.length > 0) {
        notifications.show({
          color: 'red',
          title: t('salesOrders.notifications.reservationFailedTitle'),
          message: t('salesOrders.notifications.reservationFailedDirty', {
            rows: failure.orphanedRowIds.join(', '),
          }),
          autoClose: 0,
        });
      } else {
        notifications.show({
          color: 'red',
          title: t('salesOrders.notifications.reservationFailedTitle'),
          message: t('salesOrders.notifications.reservationFailedRolledBack', {
            error: failure.error.message,
          }),
          autoClose: 12000,
        });
      }
      return;
    case 'patch-conflict':
      if (failure.orphanedRowIds && failure.orphanedRowIds.length > 0) {
        notifications.show({
          color: 'red',
          title: t('salesOrders.notifications.reservationFailedTitle'),
          message: t('salesOrders.notifications.reservationFailedDirty', {
            rows: failure.orphanedRowIds.join(', '),
          }),
          autoClose: 0,
        });
      } else {
        notifications.show({
          color: 'yellow',
          title: t('common.conflict.title'),
          message: t('common.conflict.message'),
          autoClose: 8000,
        });
      }
      return;
    case 'patch-error':
      if (failure.orphanedRowIds && failure.orphanedRowIds.length > 0) {
        notifications.show({
          color: 'red',
          title: t('salesOrders.notifications.reservationFailedTitle'),
          message: t('salesOrders.notifications.reservationFailedDirty', {
            rows: failure.orphanedRowIds.join(', '),
          }),
          autoClose: 0,
        });
      } else {
        notifications.show({
          color: 'red',
          message: t('salesOrders.notifications.statusChangeError'),
        });
      }
      return;
    case 'requires-missing':
      notifications.show({
        color: 'red',
        title: t('salesOrders.notifications.statusChangeError'),
        message: t('salesOrders.notifications.planFailureUnsupportedTransition', {
          from: failure.from,
          to: failure.to,
        }),
        autoClose: 8000,
      });
      return;
    case 'transition-not-allowed':
    case 'unknown-from-status':
    case 'unknown-to-status':
      notifications.show({
        color: 'red',
        message: t('salesOrders.notifications.statusChangeError'),
      });
      return;
  }
}

type UseSalesOrderDetailOptions = {
  clientSpecific?: {
    NKTU?: {
      deliveryToggleEnabled?: boolean;

      internalDeliveryMethodCode?: string;

      externalDeliveryMethodCode?: string;
    };
  };
};

export function useSalesOrderDetail(opts: UseSalesOrderDetailOptions = {}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const forceRefresh = useSalesOrderStore((s) => s.forceRefresh);
  const fieldOptions = salesOrderFieldOptions;
  const { resolveStatus } = fieldOptions;
  const { user } = useAuthStore();
  const { items: employees, loadAll: loadEmployees, initialized: empInit } = useEmployeeStore();

  const products = useProductStore((s) => s.items);
  const productsInit = useProductStore((s) => s.initialized);
  const loadProducts = useProductStore((s) => s.loadAll);
  const inventoryInit = useProductInventoryStore((s) => s.initialized);
  const loadInventory = useProductInventoryStore((s) => s.loadAll);
  const inventoryRows = useProductInventoryStore((s) => s.items);
  const locationsInit = useLocationStore((s) => s.initialized);
  const loadLocations = useLocationStore((s) => s.loadAll);
  const drs = useDeliveryRequestStore((s) => s.items);
  const drsInit = useDeliveryRequestStore((s) => s.initialized);
  const loadDRs = useDeliveryRequestStore((s) => s.loadAll);

  const [order, setOrder] = useState<SalesOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [statusChangeOpened, { open: openStatusChange, close: closeStatusChange }] =
    useDisclosure(false);
  const [cameraOpened, { open: openCamera, close: closeCamera }] = useDisclosure(false);
  const [cameraUploading, setCameraUploading] = useState(false);
  const [targetStatus, setTargetStatus] = useState<{
    value: string;
    label: string;
    actionLabel: string;
  } | null>(null);
  const [statusNote, setStatusNote] = useState('');

  const [cancelOpened, { open: openCancel, close: closeCancel }] = useDisclosure(false);
  const [cancelReason, setCancelReason] = useState('');

  const currentEmployee = useMemo(() => {
    if (!user.email) return undefined;
    return findEmployeeByLoginEmail(employees, user.email);
  }, [user.email, employees]);

  useEffect(() => {
    if (!empInit) loadEmployees();
    if (!productsInit) loadProducts();
    if (!inventoryInit) loadInventory();
    if (!locationsInit) loadLocations();
    if (!drsInit) loadDRs();
  }, [
    empInit,
    productsInit,
    inventoryInit,
    locationsInit,
    drsInit,
    loadEmployees,
    loadProducts,
    loadInventory,
    loadLocations,
    loadDRs,
  ]);

  useEffect(() => {
    void useProductInventoryStore.getState().revalidate();
  }, []);

  useEffect(() => {
    if (!id) return;
    const cached = useSalesOrderStore.getState().getById(id) as SalesOrder | undefined;
    if (cached) {
      if (cached.extra?.isDeleted) {
        navigate(ROUTES.SALES_ORDERS.LIST, { replace: true });
        return;
      }

      setOrder(cached);
      setLoading(false);
      return;
    }
    setLoading(true);
    cMngtConnector
      .getSalesOrderById({ id })
      .then((res) => {
        const fetched = res.salesOrder as SalesOrder;
        if (fetched.extra?.isDeleted) {
          navigate(ROUTES.SALES_ORDERS.LIST, { replace: true });
          return;
        }
        setOrder(fetched);
      })
      .catch(() => {
        notifications.show({ color: 'red', message: t('salesOrders.notifications.fetchError') });
        navigate(ROUTES.SALES_ORDERS.LIST);
      })
      .finally(() => setLoading(false));
  }, [id, t, navigate]);

  useEffect(() => {
    if (!order) return;
    if (canViewAll) return;
    if (!canViewSelf) {
      notifications.show({ color: 'yellow', message: t('salesOrders.notifications.accessDenied') });
      navigate(ROUTES.SALES_ORDERS.LIST);
      return;
    }
    const me = getCurrentEmployeeId();
    if (!me) return;
    if (order.extra?.assignedStaff !== me) {
      notifications.show({ color: 'yellow', message: t('salesOrders.notifications.accessDenied') });
      navigate(ROUTES.SALES_ORDERS.LIST);
    }
  }, [order, employees, t, navigate]);

  const autoAdvancedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!order || order.isClosed) return;
    if (!canTransitionStatusPerm) return;
    if (!drsInit || !productsInit || !inventoryInit) return;
    if (autoAdvancedRef.current === order.id) return;
    autoAdvancedRef.current = order.id;
    void advanceSoIfFullyDelivered({ so: order, actor: currentEmployee, t }).then((outcome) => {
      if (outcome === 'advanced') {
        const fresh = useSalesOrderStore.getState().getById(order.id) as SalesOrder | undefined;
        if (fresh) setOrder(fresh);
      }
    });
  }, [order, drsInit, productsInit, inventoryInit, currentEmployee, t]);

  const productByCode = useMemo(() => {
    const m = new Map<string, Product>();
    for (const p of products) m.set(p.code, p);
    return m;
  }, [products]);

  const handleStatusChange = useCallback(
    async (newStatus: string, note?: string) => {
      if (!id || !order) return;
      setActionLoading(true);

      await useProductInventoryStore.getState().revalidate();
      const freshInventoryByProduct = indexInventoryByProduct(
        useProductInventoryStore.getState().items,
      );
      const result = await runTransition({
        order,
        toStatusValue: newStatus,
        actor: currentEmployee ? { id: currentEmployee.id, name: currentEmployee.name } : undefined,
        note,
        productsByCode: productByCode,
        inventoryByProduct: freshInventoryByProduct,
      });
      if (result.ok) {
        setOrder(result.updated);
        notifications.show({
          color: 'green',
          message: t('salesOrders.notifications.statusChangeSuccess'),
        });
        forceRefresh();

        const updatedExtra = (result.updated.extra ?? {}) as SalesOrderExtra;
        const fromStatusValue = (order.extra as SalesOrderExtra | undefined)?.status ?? '';
        const inventoryAction =
          updatedExtra.inventoryLinkage?.lastTransition?.via?.kind === 'completion-auto-ship'
            ? 'auto-ship-on-completion'
            : updatedExtra.inventoryLinkage?.lastTransition?.action;
        logActivity('salesOrder.statusChange', id, {
          orderNumber: result.updated.orderNumber,
          fromStatus: fromStatusValue,
          toStatus: newStatus,
          ...(note ? { note } : {}),
          ...(inventoryAction ? { inventoryAction } : {}),
        });

        const actor = currentEmployee
          ? { id: currentEmployee.id, name: currentEmployee.name }
          : undefined;
        for (const followUp of result.followUps) {
          await dispatchSoFollowUp(followUp, result.updated, actor, t);
        }
      } else {
        notifyTransitionFailure(result.failure, t, productByCode);
        if (result.failure.kind === 'patch-conflict') {
          const fresh = useSalesOrderStore.getState().getById(id) as SalesOrder | undefined;
          if (fresh) setOrder(fresh);
        }
      }
      setActionLoading(false);
      closeStatusChange();
      setStatusNote('');
      setTargetStatus(null);
    },
    [id, order, t, currentEmployee, productByCode, forceRefresh, closeStatusChange],
  );

  const handleCancel = useCallback(
    async (reason?: string) => {
      if (!id || !order) return;
      setActionLoading(true);
      const currentExtra = (order.extra ?? {}) as SalesOrderExtra;
      const fromStatus = currentExtra.status ?? '';
      const cancellation: SalesOrderCancellation = {
        at: Date.now(),
        ...(currentEmployee && {
          by: { id: currentEmployee.id, name: currentEmployee.name },
        }),
        ...(reason ? { reason } : {}),
        fromStatus,
      };
      const log: SalesOrderActivityEntry[] = currentExtra.activityLog ?? [];

      const linkage = currentExtra.inventoryLinkage;
      const shouldAutoRelease =
        linkage?.state === 'reserved' &&
        linkage.reservedSnapshot != null &&
        linkage.reservedSnapshot.length > 0;

      let nextLinkage: InventoryLinkage | undefined = linkage;
      let autoReleaseFailed = false;
      let appliedInventoryOps: readonly AppliedOp[] = [];

      if (shouldAutoRelease) {
        await useProductInventoryStore.getState().revalidate();
        const freshInventoryByProduct = indexInventoryByProduct(
          useProductInventoryStore.getState().items,
        );
        const planResult = planReleaseFromLinkage({
          snapshot: linkage!.reservedSnapshot!,
          so: order,
          productsByCode: productByCode,
          inventoryByProduct: freshInventoryByProduct,
        });
        if (!planResult.ok) {
          autoReleaseFailed = true;
        } else if (planResult.plan.ops.length > 0) {
          const exec = await executeReservationPlan(planResult.plan.ops);
          if (!exec.ok) {
            autoReleaseFailed = true;
            useProductInventoryStore.getState().forceRefresh();
          } else {
            appliedInventoryOps = exec.applied;
            nextLinkage = buildReleasedLinkage(
              cancellation.at,
              currentEmployee ? { id: currentEmployee.id, name: currentEmployee.name } : undefined,
              { kind: 'cancel-auto-release' },
            );
          }
        }
      }

      const cancellationEntry: SalesOrderActivityEntry = {
        timestamp: cancellation.at,
        action: 'cancellation_set',
        ...getCurrentEmployeeStamp(),
        ...(reason ? { note: reason } : {}),
      };

      const cancellationTargetStatus = getCancellationTargetStatusValue();
      const statusChangeEntry: SalesOrderActivityEntry | null =
        cancellationTargetStatus && cancellationTargetStatus !== fromStatus
          ? {
              timestamp: cancellation.at,
              action: 'status_change',
              fromStatus,
              toStatus: cancellationTargetStatus,
              ...getCurrentEmployeeStamp(),
              ...(reason ? { note: reason } : {}),
            }
          : null;
      const targetStage = cancellationTargetStatus
        ? (resolveStatus(cancellationTargetStatus).stage as Stage)
        : undefined;
      const nextIsClosed = targetStage ? deriveIsClosedFromStage(targetStage) : undefined;

      try {
        const updated = await useSalesOrderStore.getState().updateSafely({
          id,
          version: order.version,
          patch: {
            ...(nextIsClosed === true ? { isClosed: true } : {}),
            extra: {
              ...currentExtra,
              ...(cancellationTargetStatus ? { status: cancellationTargetStatus } : {}),
              cancellation,
              activityLog: [
                ...log,
                ...(statusChangeEntry ? [statusChangeEntry] : []),
                cancellationEntry,
              ],
              ...(nextLinkage ? { inventoryLinkage: nextLinkage } : {}),
            },
          },
        });
        setOrder(updated as SalesOrder);
        if (autoReleaseFailed) {
          notifications.show({
            color: 'yellow',
            title: t('salesOrders.notifications.cancellationSetSuccess'),
            message: t('salesOrders.notifications.cancelAutoReleaseFailed'),
            autoClose: 12000,
          });
        } else {
          notifications.show({
            color: 'yellow',
            message: t('salesOrders.notifications.cancellationSetSuccess'),
          });
        }
        forceRefresh();

        if (appliedInventoryOps.length > 0) {
          emitInventoryActivityForApplied(appliedInventoryOps, {
            kind: 'SO',
            id: order.id,
            label: order.orderNumber,
            suffix: '(cancel)',
          });
        }

        logActivity('salesOrder.cancel', id, {
          orderNumber: order.orderNumber,
          fromStatus,
          ...(reason ? { reason } : {}),
          inventoryReleased: shouldAutoRelease && !autoReleaseFailed,
          ...(autoReleaseFailed && { autoReleaseFailed: true }),
        });
      } catch (err) {
        if (err instanceof EntityConflictError) {
          if (err.latest) setOrder(err.latest as SalesOrder);
          notifications.show({
            color: 'yellow',
            title: t('common.conflict.title'),
            message: t('common.conflict.message'),
            autoClose: 8000,
          });
        } else {
          notifications.show({
            color: 'red',
            message: t('salesOrders.notifications.statusChangeError'),
          });
        }
      } finally {
        setActionLoading(false);
        closeCancel();
        setCancelReason('');
      }
    },
    [id, order, currentEmployee, resolveStatus, productByCode, t, forceRefresh, closeCancel],
  );

  const [manualReleaseOpened, { open: openManualRelease, close: closeManualRelease }] =
    useDisclosure(false);

  const [deleteOpened, { open: openDelete, close: closeDelete }] = useDisclosure(false);

  const [createDROpened, { open: openCreateDR, close: closeCreateDR }] = useDisclosure(false);
  const [createReturnOpened, { open: openCreateReturn, close: closeCreateReturn }] =
    useDisclosure(false);

  const handleManualRelease = useCallback(async () => {
    if (!id || !order) return;
    const currentExtra = (order.extra ?? {}) as SalesOrderExtra;
    const linkage = currentExtra.inventoryLinkage;
    if (
      linkage?.state !== 'reserved' ||
      !linkage.reservedSnapshot ||
      linkage.reservedSnapshot.length === 0
    ) {
      notifications.show({
        color: 'red',
        message: t('salesOrders.notifications.manualReleaseNoSnapshot'),
      });
      return;
    }
    setActionLoading(true);
    const at = Date.now();

    await useProductInventoryStore.getState().revalidate();
    const freshInventoryByProduct = indexInventoryByProduct(
      useProductInventoryStore.getState().items,
    );
    const planResult = planReleaseFromLinkage({
      snapshot: linkage.reservedSnapshot,
      so: order,
      productsByCode: productByCode,
      inventoryByProduct: freshInventoryByProduct,
    });
    if (!planResult.ok) {
      notifications.show({
        color: 'red',
        title: t('salesOrders.notifications.reservationPlanFailedTitle'),
        message: formatPlanFailures(planResult.failures, t, productByCode),
        autoClose: 12000,
      });
      setActionLoading(false);
      closeManualRelease();
      return;
    }
    let manualReleaseApplied: readonly AppliedOp[] = [];
    if (planResult.plan.ops.length > 0) {
      const exec = await executeReservationPlan(planResult.plan.ops);
      if (!exec.ok) {
        useProductInventoryStore.getState().forceRefresh();
        notifications.show({
          color: 'red',
          title: t('salesOrders.notifications.reservationPlanFailedTitle'),
          message: exec.error.message,
          autoClose: 12000,
        });
        setActionLoading(false);
        closeManualRelease();
        return;
      }
      manualReleaseApplied = exec.applied;
    }

    const nextLinkage = buildReleasedLinkage(
      at,
      currentEmployee ? { id: currentEmployee.id, name: currentEmployee.name } : undefined,
      { kind: 'manual-release' },
    );

    try {
      const updated = await useSalesOrderStore.getState().updateSafely({
        id,
        version: order.version,
        patch: {
          extra: {
            ...currentExtra,
            inventoryLinkage: nextLinkage,
          },
        },
      });
      setOrder(updated as SalesOrder);
      notifications.show({
        color: 'teal',
        message: t('salesOrders.notifications.manualReleaseSuccess'),
      });
      forceRefresh();

      if (manualReleaseApplied.length > 0) {
        emitInventoryActivityForApplied(manualReleaseApplied, {
          kind: 'SO',
          id: order.id,
          label: order.orderNumber,
          suffix: '(manual release)',
        });
      }

      const releasedRows: SalesOrderReleasedRow[] = planResult.plan.ops.map((op) => ({
        productCode: op.itemCode,
        locationCode: op.locationCode,
        byUnit: { ...op.deltas },
      }));
      logActivity('salesOrder.manualRelease', id, {
        orderNumber: order.orderNumber,
        releasedRows,
      });
    } catch (err) {
      if (err instanceof EntityConflictError) {
        if (err.latest) setOrder(err.latest as SalesOrder);
        notifications.show({
          color: 'yellow',
          title: t('common.conflict.title'),
          message: t('common.conflict.message'),
          autoClose: 8000,
        });
      } else {
        notifications.show({
          color: 'red',
          message: t('salesOrders.notifications.statusChangeError'),
        });
      }
    } finally {
      setActionLoading(false);
      closeManualRelease();
    }
  }, [id, order, t, currentEmployee, productByCode, forceRefresh, closeManualRelease]);

  const handleDelete = useCallback(async () => {
    if (!id || !order) return;
    const currentExtra = (order.extra ?? {}) as SalesOrderExtra;

    const stage = resolveStatus(currentExtra.status).stage as Stage;
    if (stage === 'COMPLETED') {
      notifications.show({
        color: 'red',
        message: t('salesOrders.notifications.deleteBlockedCompleted'),
      });
      closeDelete();
      return;
    }
    setActionLoading(true);
    const at = Date.now();

    const linkage = currentExtra.inventoryLinkage;
    const hasSnapshot = linkage?.reservedSnapshot != null && linkage.reservedSnapshot.length > 0;
    const rollbackState =
      (linkage?.state === 'reserved' || linkage?.state === 'shipped') && hasSnapshot
        ? linkage.state
        : null;

    let nextLinkage: InventoryLinkage | undefined = linkage;
    let appliedInventoryOps: readonly AppliedOp[] = [];

    if (rollbackState) {
      await useProductInventoryStore.getState().revalidate();
      const freshInventoryByProduct = indexInventoryByProduct(
        useProductInventoryStore.getState().items,
      );
      const planInputs = {
        snapshot: linkage!.reservedSnapshot!,
        so: order,
        productsByCode: productByCode,
        inventoryByProduct: freshInventoryByProduct,
      };
      const planResult =
        rollbackState === 'reserved'
          ? planReleaseFromLinkage(planInputs)
          : planUnshipFromLinkage(planInputs);
      if (!planResult.ok) {
        notifications.show({
          color: 'red',
          title: t('salesOrders.notifications.reservationPlanFailedTitle'),
          message: formatPlanFailures(planResult.failures, t, productByCode),
          autoClose: 12000,
        });
        setActionLoading(false);
        closeDelete();
        return;
      }
      if (planResult.plan.ops.length > 0) {
        const exec = await executeReservationPlan(planResult.plan.ops);
        if (!exec.ok) {
          useProductInventoryStore.getState().forceRefresh();
          notifications.show({
            color: 'red',
            title: t('salesOrders.notifications.reservationPlanFailedTitle'),
            message: exec.error.message,
            autoClose: 12000,
          });
          setActionLoading(false);
          closeDelete();
          return;
        }
        appliedInventoryOps = exec.applied;
      }
      nextLinkage = buildReleasedLinkage(
        at,
        currentEmployee ? { id: currentEmployee.id, name: currentEmployee.name } : undefined,
        { kind: 'delete-rollback' },
      );
    }

    const deleteEntry: SalesOrderActivityEntry = {
      timestamp: at,
      action: 'deleted',
      ...getCurrentEmployeeStamp(),
    };
    const log: SalesOrderActivityEntry[] = currentExtra.activityLog ?? [];

    try {
      await useSalesOrderStore.getState().updateSafely({
        id,
        version: order.version,
        patch: {
          extra: {
            ...currentExtra,
            isDeleted: true,
            activityLog: [...log, deleteEntry],
            ...(nextLinkage ? { inventoryLinkage: nextLinkage } : {}),
          },
        },
      });
      notifications.show({
        color: 'green',
        message: t('salesOrders.notifications.deleteSuccess'),
      });
      forceRefresh();

      if (appliedInventoryOps.length > 0) {
        emitInventoryActivityForApplied(appliedInventoryOps, {
          kind: 'SO',
          id: order.id,
          label: order.orderNumber,
          suffix: '(delete)',
        });
      }
      logActivity('salesOrder.delete', id, {
        orderNumber: order.orderNumber,
        fromStatus: currentExtra.status ?? '',
        ...(rollbackState === 'reserved' ? { inventoryReleased: true } : {}),
        ...(rollbackState === 'shipped' ? { inventoryUnshipped: true } : {}),
      });

      const cascade = await softDeleteLinkedDeliveryRequests(order.id);
      if (cascade.failed > 0) {
        notifications.show({
          color: 'yellow',
          title: t('salesOrders.notifications.deleteSuccess'),
          message: t('salesOrders.notifications.deleteLinkedDRsFailed', { count: cascade.failed }),
          autoClose: 8000,
        });
      }
      navigate(ROUTES.SALES_ORDERS.LIST);
    } catch (err) {
      if (err instanceof EntityConflictError) {
        if (err.latest) setOrder(err.latest as SalesOrder);
        notifications.show({
          color: 'yellow',
          title: t('common.conflict.title'),
          message: t('common.conflict.message'),
          autoClose: 8000,
        });
      } else {
        notifications.show({
          color: 'red',
          message: t('salesOrders.notifications.deleteError'),
        });
      }
    } finally {
      setActionLoading(false);
      closeDelete();
    }
  }, [
    id,
    order,
    resolveStatus,
    currentEmployee,
    productByCode,
    t,
    forceRefresh,
    navigate,
    closeDelete,
  ]);

  const handleSendChat = useCallback(
    async (message: string) => {
      if (!id || !order) return;
      const currentExtra = order.extra ?? {};
      const currentChat: SalesOrderChatEntry[] = currentExtra.chatHistory ?? [];
      const newEntry: SalesOrderChatEntry = {
        timestamp: Date.now(),
        message,
        ...(currentEmployee && { userId: currentEmployee.id, userName: currentEmployee.name }),
      };
      try {
        const updated = await useSalesOrderStore.getState().updateSafely({
          id,
          version: order.version,
          patch: { extra: { ...currentExtra, chatHistory: [...currentChat, newEntry] } },
        });
        setOrder(updated);
      } catch (err) {
        if (err instanceof EntityConflictError) {
          if (err.latest) setOrder(err.latest as SalesOrder);
          notifications.show({
            color: 'yellow',
            title: t('common.conflict.title'),
            message: t('common.conflict.message'),
            autoClose: 8000,
          });
        } else {
          throw err;
        }
      }
    },
    [id, order, currentEmployee, t],
  );

  const imageDirectory = useMemo(() => {
    const clientCode = resolveClientCode();
    const today = new Date().toISOString().slice(0, 10);
    return `/c-mngt/${clientCode}/${today}/sales-order/${id}`;
  }, [id]);

  const handlePhotosChange = useCallback(
    async (photos: SalesOrderPhoto[]) => {
      if (!id || !order) return;
      const currentExtra = order.extra ?? {};
      try {
        const updated = await useSalesOrderStore.getState().updateSafely({
          id,
          version: order.version,
          patch: { extra: { ...currentExtra, photos } },
        });
        setOrder(updated);
      } catch (err) {
        if (err instanceof EntityConflictError) {
          if (err.latest) setOrder(err.latest as SalesOrder);
          notifications.show({
            color: 'yellow',
            title: t('common.conflict.title'),
            message: t('common.conflict.message'),
            autoClose: 8000,
          });
        } else {
          throw err;
        }
      }
    },
    [id, order, t],
  );

  const handleAttachmentsChange = useCallback(
    async (attachments: SalesOrderAttachment[]) => {
      if (!id || !order) return;
      const currentExtra = order.extra ?? {};
      try {
        const updated = await useSalesOrderStore.getState().updateSafely({
          id,
          version: order.version,
          patch: { extra: { ...currentExtra, attachments } },
        });
        setOrder(updated);
      } catch (err) {
        if (err instanceof EntityConflictError) {
          if (err.latest) setOrder(err.latest as SalesOrder);
          notifications.show({
            color: 'yellow',
            title: t('common.conflict.title'),
            message: t('common.conflict.message'),
            autoClose: 8000,
          });
        } else {
          throw err;
        }
      }
    },
    [id, order, t],
  );

  const handleMetaPatch = useCallback(
    async (patch: { extra?: Partial<SalesOrderExtra>; notes?: string }) => {
      if (!id || !order) return;
      const currentExtra = order.extra ?? {};
      try {
        const updated = await useSalesOrderStore.getState().updateSafely({
          id,
          version: order.version,
          patch: {
            ...(patch.extra ? { extra: { ...currentExtra, ...patch.extra } } : {}),
            ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
          },
        });
        setOrder(updated as SalesOrder);

        const fields: SalesOrderInlineFields = {};
        if (patch.extra) {
          const before = currentExtra as SalesOrderExtra;
          if (
            'assignedStaff' in patch.extra &&
            patch.extra.assignedStaff !== before.assignedStaff
          ) {
            fields.assignedStaff = {
              ...(before.assignedStaff && { from: before.assignedStaff }),
              ...(patch.extra.assignedStaff && { to: patch.extra.assignedStaff }),
            };
          }
          if (
            'deliveryMethod' in patch.extra &&
            patch.extra.deliveryMethod !== before.deliveryMethod
          ) {
            fields.deliveryMethod = {
              ...(before.deliveryMethod && { from: before.deliveryMethod }),
              ...(patch.extra.deliveryMethod && { to: patch.extra.deliveryMethod }),
            };
          }
          if ('deliveryDate' in patch.extra && patch.extra.deliveryDate !== before.deliveryDate) {
            const fromMs =
              typeof before.deliveryDate === 'number'
                ? before.deliveryDate
                : before.deliveryDate
                  ? new Date(before.deliveryDate).getTime()
                  : undefined;
            const toMs =
              typeof patch.extra.deliveryDate === 'number'
                ? patch.extra.deliveryDate
                : patch.extra.deliveryDate
                  ? new Date(patch.extra.deliveryDate as string).getTime()
                  : undefined;
            fields.deliveryDate = {
              ...(fromMs !== undefined && { from: fromMs }),
              ...(toMs !== undefined && { to: toMs }),
            };
          }

          if ('clientSpecific' in patch.extra) {
            const beforeNktu = before.clientSpecific?.NKTU;
            const afterNktu = patch.extra.clientSpecific?.NKTU;
            if ((beforeNktu?.warehouseNote ?? '') !== (afterNktu?.warehouseNote ?? '')) {
              fields.warehouseNote = { changed: true };
            }
            if ((beforeNktu?.driverNote ?? '') !== (afterNktu?.driverNote ?? '')) {
              fields.driverNote = { changed: true };
            }
          }
        }
        if (patch.notes !== undefined && patch.notes !== order.notes) {
          fields.notes = { changed: true };
        }
        if (Object.keys(fields).length > 0) {
          logActivity('salesOrder.update', id, {
            orderNumber: order.orderNumber,
            inlineEdit: true,
            fields,
          });
        }
      } catch (err) {
        if (err instanceof EntityConflictError) {
          if (err.latest) setOrder(err.latest as SalesOrder);
          notifications.show({
            color: 'yellow',
            title: t('common.conflict.title'),
            message: t('common.conflict.message'),
            autoClose: 8000,
          });
        }
        throw err;
      }
    },
    [id, order, t],
  );

  const handleItemMemoPatch = useCallback(
    async (itemIndex: number, memo: string) => {
      if (!id || !order) return;
      const current = order.items[itemIndex];
      if (!current || (current.memo ?? '') === memo) return;
      const nextItems = order.items.map((it, i) => (i === itemIndex ? { ...it, memo } : it));
      try {
        const updated = await useSalesOrderStore.getState().updateSafely({
          id,
          version: order.version,
          patch: { items: nextItems },
        });
        setOrder(updated as SalesOrder);
        logActivity('salesOrder.update', id, {
          orderNumber: order.orderNumber,
          inlineEdit: true,
          fields: { itemMemo: { changed: true } } satisfies SalesOrderInlineFields,
        });
      } catch (err) {
        if (err instanceof EntityConflictError) {
          if (err.latest) setOrder(err.latest as SalesOrder);
          notifications.show({
            color: 'yellow',
            title: t('common.conflict.title'),
            message: t('common.conflict.message'),
            autoClose: 8000,
          });
        }
        throw err;
      }
    },
    [id, order, t],
  );

  const handleToggleDeliveryMethod = useCallback(async () => {
    if (!order) return;
    if (!opts.clientSpecific?.NKTU?.deliveryToggleEnabled) return;

    const goExternal = (order.extra as SalesOrderExtra | undefined)?.isInternalDelivery !== false;
    await handleMetaPatch({
      extra: {
        deliveryMethod: goExternal
          ? opts.clientSpecific?.NKTU?.externalDeliveryMethodCode
          : opts.clientSpecific?.NKTU?.internalDeliveryMethodCode,
        isInternalDelivery: !goExternal,
      },
    });
  }, [order, handleMetaPatch, opts.clientSpecific]);

  const handleMobileCameraCapture = useCallback(
    async (result: CaptureResult) => {
      if (!id || !order) return;
      setCameraUploading(true);
      try {
        const { dolgaConnector } = await import('@credo/connectors/connector');
        const { r2Connector } = await import('@credo/connectors/connector');

        const res = await fetch(result.base64);
        const blob = await res.blob();
        const fileName = `photo-${Date.now()}.jpg`;
        const file = new File([blob], fileName, { type: 'image/jpeg' });

        const presignRes = await dolgaConnector.mediaUploadUrl({
          imageDirectory,
          fileName: `${Date.now()}-${fileName}`,
        });
        if (!presignRes.uploadUrl || !presignRes.fileUrl) return;

        const uploadRes = await r2Connector.uploadImage({
          uploadUrl: presignRes.uploadUrl,
          fileContent: file,
          contentType: file.type,
        });
        if (!uploadRes.success) return;

        const newPhoto: SalesOrderPhoto = {
          url: presignRes.fileUrl,
          timestamp: result.timestamp,
          fileName,
          ...(currentEmployee && { userId: currentEmployee.id, userName: currentEmployee.name }),
          ...(result.location && { location: result.location }),
          ...(result.latitude != null && { latitude: result.latitude }),
          ...(result.longitude != null && { longitude: result.longitude }),
        };

        const currentPhotos: SalesOrderPhoto[] = order.extra?.photos ?? [];
        await handlePhotosChange([...currentPhotos, newPhoto]);
      } finally {
        setCameraUploading(false);
        closeCamera();
      }
    },
    [id, order, imageDirectory, currentEmployee, handlePhotosChange, closeCamera],
  );

  const extra = (order?.extra ?? {}) as SalesOrderExtra;
  const currentStatusValue = extra.status ?? '';
  const isCancelled = extra.cancellation != null;

  const cancelTargetStatusValue = getCancellationTargetStatusValue();
  const allowedNextStatuses = useMemo(() => {
    if (isCancelled) return [];
    return getAllowedTransitions(currentStatusValue).map((v) => resolveStatus(v));
  }, [currentStatusValue, resolveStatus, isCancelled]);

  const statusFlowOrder = getStatusFlowOrder();
  const currentFlowIndex = statusFlowOrder.indexOf(currentStatusValue);

  const activityByStatus = useMemo(() => {
    const log = extra.activityLog ?? [];
    const map = new Map<string, SalesOrderActivityEntry>();
    for (const entry of log) {
      if (entry.toStatus) map.set(entry.toStatus, entry);
    }

    const createdEntry = log.find((e) => e.action === 'created');
    if (createdEntry) {
      const initialStatus = createdEntry.toStatus || getInitialStatusValue() || statusFlowOrder[0];
      if (initialStatus && !map.has(initialStatus)) map.set(initialStatus, createdEntry);
    }
    return map;
  }, [extra.activityLog, statusFlowOrder]);

  const currentStatus = order ? resolveStatus(extra.status) : null;
  const isUrgent = extra.isUrgent === true;

  const isExternalDelivery = extra.isInternalDelivery === false;

  const handleCopyOrder = useCallback(() => {
    if (!order) return;
    const e = order.extra ?? {};
    navigate(ROUTES.SALES_ORDERS.NEW, {
      state: {
        copyFrom: {
          customerCode: e.customerCode,

          customerName: order.customerName,
          isIndividualCustomer: e.isIndividualCustomer,
          isInternalDelivery: e.isInternalDelivery,
          deliveryAddress: e.deliveryAddress,
          googleMapUrl: e.googleMapUrl,
          deliveryMethod: e.deliveryMethod,
          assignedStaff: e.assignedStaff,
          isUrgent: e.isUrgent,
          tags: e.tags,
          notes: order.notes,
          items: order.items,
        },
      },
    });
  }, [order, navigate]);

  const canCreateDR = useMemo(() => {
    if (isMobile) return false;
    if (!order || isCancelled) return false;
    if (order.extra.isInternalDelivery === false) return false;
    return statusHasCapability(currentStatusValue, 'canCreateDR');
  }, [order, isCancelled, currentStatusValue]);

  const cancelReachableViaTransition = useMemo(
    () =>
      cancelTargetStatusValue != null &&
      allowedNextStatuses.some((s) => s.value === cancelTargetStatusValue),
    [cancelTargetStatusValue, allowedNextStatuses],
  );
  const canCancel = useMemo(() => {
    return order != null && !isCancelled && !cancelReachableViaTransition;
  }, [order, isCancelled, cancelReachableViaTransition]);

  const canManualRelease = useMemo(() => {
    if (!order || !isCancelled) return false;
    const linkage = extra.inventoryLinkage;
    return (
      linkage?.state === 'reserved' &&
      Array.isArray(linkage.reservedSnapshot) &&
      linkage.reservedSnapshot.length > 0
    );
  }, [order, isCancelled, extra.inventoryLinkage]);

  const showDelete = useMemo(() => {
    if (!order || !canDeletePerm) return false;
    return currentStatus?.stage !== 'COMPLETED';
  }, [order, currentStatus]);

  const handleCreateDR = useCallback(() => {
    if (!order) return;
    openCreateDR();
  }, [order, openCreateDR]);

  const refreshLinkedDRs = useCallback(() => {
    void useDeliveryRequestStore.getState().forceRefresh();
  }, []);

  const linkedDRs: DeliveryRequest[] = useMemo(() => {
    if (!order) return [];

    return drs.filter(
      (d) => d.salesOrderId === order.id && !d.extra?.isDeleted,
    ) as DeliveryRequest[];
  }, [drs, order]);

  const reconcileIssues: SoDeliveryIssue[] = useMemo(() => {
    if (!order || !drsInit || !inventoryInit || !productsInit) return [];
    const status = (order.extra as SalesOrderExtra | undefined)?.status ?? '';
    const completionTarget = getAutoCompletionTargetValue();
    return deriveSoDeliveryIssues({
      so: order,
      liveDrsForSo: linkedDRs,
      evidence: completionEvidence,
      currentStage: resolveStatus(status).stage as Stage | undefined,
      completionReachable:
        completionTarget != null && getAllowedTransitions(status).includes(completionTarget),
      inventoryRows,
      productsByCode: productByCode,
      inventoryEnabled: productInventoryEnabled,
    });
  }, [
    order,
    drsInit,
    inventoryInit,
    productsInit,
    linkedDRs,
    resolveStatus,
    inventoryRows,
    productByCode,
  ]);

  const [reconcileOpened, { open: openReconcile, close: closeReconcile }] = useDisclosure(false);

  const handleReconcileRepair = useCallback(async () => {
    if (!id || !order) return;
    setActionLoading(true);
    const failRed = (message: string) =>
      notifications.show({
        color: 'red',
        title: t('salesOrders.reconcile.failedTitle'),
        message,
        autoClose: 12000,
      });
    try {
      await useProductInventoryStore.getState().revalidate();
      let inventoryByProduct = indexInventoryByProduct(useProductInventoryStore.getState().items);
      let workingOrder = order;
      const actor = currentEmployee
        ? { id: currentEmployee.id, name: currentEmployee.name }
        : undefined;
      const repaired: string[] = [];
      const derive = () => {
        const status = (workingOrder.extra as SalesOrderExtra | undefined)?.status ?? '';
        const completionTarget = getAutoCompletionTargetValue();
        return deriveSoDeliveryIssues({
          so: workingOrder,
          liveDrsForSo: linkedDRs,
          evidence: completionEvidence,
          currentStage: resolveStatus(status).stage as Stage | undefined,
          completionReachable:
            completionTarget != null && getAllowedTransitions(status).includes(completionTarget),
          inventoryRows: useProductInventoryStore.getState().items,
          productsByCode: productByCode,
          inventoryEnabled: productInventoryEnabled,
        });
      };
      const reindex = () =>
        (inventoryByProduct = indexInventoryByProduct(useProductInventoryStore.getState().items));

      let issues = derive();

      const extra0 = (workingOrder.extra ?? {}) as SalesOrderExtra;
      const linkage0 = extra0.inventoryLinkage;
      if (
        issues.some((i) => i.kind === 'reservation-drift') &&
        linkage0?.state === 'reserved' &&
        (linkage0.reservedSnapshot?.length ?? 0) > 0
      ) {
        const diff = planReservationDiff({
          oldSnapshot: linkage0.reservedSnapshot!,
          newItems: workingOrder.items,
          so: workingOrder,
          productsByCode: productByCode,
          inventoryByProduct,
        });
        if (!diff.ok) {
          failRed(formatPlanFailures(diff.failures, t, productByCode));
          return;
        }
        let applied: readonly AppliedOp[] = [];
        if (diff.plan.ops.length > 0) {
          const exec = await executeReservationPlan(diff.plan.ops);
          if (!exec.ok) {
            useProductInventoryStore.getState().forceRefresh();
            failRed(exec.error.message);
            return;
          }
          applied = exec.applied;
        }
        const nextLinkage = buildReservedLinkage(diff.newSnapshot, Date.now(), actor, {
          kind: 'reconcile-repair',
        });
        try {
          workingOrder = (await useSalesOrderStore.getState().updateSafely({
            id,
            version: workingOrder.version,
            patch: {
              extra: {
                ...(workingOrder.extra as SalesOrderExtra),
                inventoryLinkage: nextLinkage,
              },
            },
          })) as SalesOrder;
        } catch (err) {
          if (applied.length > 0) await rollbackAppliedOps(applied);
          useProductInventoryStore.getState().forceRefresh();
          throw err;
        }
        repaired.push('realigned-reservation');
        reindex();
        issues = derive();
      }

      const behind = issues.find((i) => i.kind === 'so-behind-deliveries');
      if (behind && behind.kind === 'so-behind-deliveries' && !behind.blockedByMatrix) {
        const target = getAutoCompletionTargetValue();
        if (target) {
          const extraNow = (workingOrder.extra ?? {}) as SalesOrderExtra;
          const linkNow = extraNow.inventoryLinkage;
          const holdsLive =
            linkNow?.state === 'reserved' && (linkNow.reservedSnapshot?.length ?? 0) > 0;
          if (productInventoryEnabled && !holdsLive && linkNow?.state !== 'shipped') {
            const plan = planReservation({
              action: 'reserve',
              so: workingOrder,
              productsByCode: productByCode,
              inventoryByProduct,
            });
            if (plan.ok && plan.plan.ops.length > 0) {
              const exec = await executeReservationPlan(plan.plan.ops);
              if (!exec.ok) {
                useProductInventoryStore.getState().forceRefresh();
                failRed(exec.error.message);
                return;
              }
              const reservedLinkage = buildReservedLinkage(
                buildLinkageSnapshotFromReserveOps(plan.plan.ops),
                Date.now(),
                actor,
                { kind: 'reconcile-repair' },
              );
              try {
                workingOrder = (await useSalesOrderStore.getState().updateSafely({
                  id,
                  version: workingOrder.version,
                  patch: {
                    extra: {
                      ...(workingOrder.extra as SalesOrderExtra),
                      inventoryLinkage: reservedLinkage,
                    },
                  },
                })) as SalesOrder;
              } catch (err) {
                await rollbackAppliedOps(exec.applied);
                useProductInventoryStore.getState().forceRefresh();
                throw err;
              }
              reindex();
            }
          }
          const result = await runTransition({
            order: workingOrder,
            toStatusValue: target,
            actor,
            productsByCode: productByCode,
            inventoryByProduct,
          });
          if (!result.ok) {
            failRed(
              result.failure.kind === 'plan-failure'
                ? formatPlanFailures(result.failure.failures, t, productByCode)
                : result.failure.kind === 'patch-error' ||
                    result.failure.kind === 'execution-failure'
                  ? result.failure.error.message
                  : result.failure.kind,
            );
            return;
          }
          workingOrder = result.updated;
          for (const followUp of result.followUps) {
            await dispatchSoFollowUp(followUp, result.updated, actor, t);
          }
          repaired.push('completed');
          reindex();
          issues = derive();
        }
      }

      const notDeducted = issues.find((i) => i.kind === 'completed-not-deducted');
      if (notDeducted && notDeducted.kind === 'completed-not-deducted') {
        let linkNow = ((workingOrder.extra ?? {}) as SalesOrderExtra).inventoryLinkage;
        let reserveApplied: readonly AppliedOp[] = [];
        if (notDeducted.reason === 'no-deduction-recorded') {
          const plan = planReservation({
            action: 'reserve',
            so: workingOrder,
            productsByCode: productByCode,
            inventoryByProduct,
          });
          if (!plan.ok) {
            failRed(formatPlanFailures(plan.failures, t, productByCode));
            return;
          }
          if (plan.plan.ops.length > 0) {
            const exec = await executeReservationPlan(plan.plan.ops);
            if (!exec.ok) {
              useProductInventoryStore.getState().forceRefresh();
              failRed(exec.error.message);
              return;
            }
            reserveApplied = exec.applied;
            linkNow = buildReservedLinkage(
              buildLinkageSnapshotFromReserveOps(plan.plan.ops),
              Date.now(),
              actor,
              { kind: 'reconcile-repair' },
            );
            reindex();
          }
        }
        const snapshot = linkNow?.state === 'reserved' ? (linkNow.reservedSnapshot ?? []) : [];
        if (snapshot.length > 0) {
          const ship = planShipFromLinkage({
            snapshot,
            so: workingOrder,
            productsByCode: productByCode,
            inventoryByProduct,
          });
          if (!ship.ok) {
            if (reserveApplied.length > 0) await rollbackAppliedOps(reserveApplied);
            useProductInventoryStore.getState().forceRefresh();
            failRed(formatPlanFailures(ship.failures, t, productByCode));
            return;
          }
          let shipApplied: readonly AppliedOp[] = [];
          if (ship.plan.ops.length > 0) {
            const exec = await executeReservationPlan(ship.plan.ops);
            if (!exec.ok) {
              if (reserveApplied.length > 0) await rollbackAppliedOps(reserveApplied);
              useProductInventoryStore.getState().forceRefresh();
              failRed(exec.error.message);
              return;
            }
            shipApplied = exec.applied;
          }
          const shippedLinkage = buildShippedLinkage(Date.now(), actor, {
            kind: 'reconcile-repair',
          });
          try {
            workingOrder = (await useSalesOrderStore.getState().updateSafely({
              id,
              version: workingOrder.version,
              patch: {
                extra: {
                  ...(workingOrder.extra as SalesOrderExtra),
                  inventoryLinkage: shippedLinkage,
                },
              },
            })) as SalesOrder;
          } catch (err) {
            if (shipApplied.length > 0) await rollbackAppliedOps(shipApplied);
            if (reserveApplied.length > 0) await rollbackAppliedOps(reserveApplied);
            useProductInventoryStore.getState().forceRefresh();
            throw err;
          }
          if (shipApplied.length > 0) {
            emitInventoryActivityForApplied(shipApplied, {
              kind: 'SO',
              id: workingOrder.id,
              label: workingOrder.orderNumber,
              suffix: '(reconcile repair)',
            });
          }
          repaired.push('shipped');
          reindex();
          issues = derive();
        }
      }

      const orphaned = issues.find((i) => i.kind === 'orphaned-holds');
      if (orphaned && orphaned.kind === 'orphaned-holds') {
        const entries: InventoryLinkageSnapshotEntry[] = [];
        for (const r of useProductInventoryStore.getState().items) {
          const hold = r.extra?.reservedBySalesOrder?.[workingOrder.id]?.byUnit;
          if (!hold) continue;
          const byUnit = Object.fromEntries(Object.entries(hold).filter(([, q]) => q > 0));
          if (Object.keys(byUnit).length > 0) {
            entries.push({
              rowId: r.id,
              itemCode: r.itemCode,
              locationCode: r.locationCode,
              byUnit,
            });
          }
        }
        if (entries.length > 0) {
          const rel = planReleaseFromLinkage({
            snapshot: entries,
            so: workingOrder,
            productsByCode: productByCode,
            inventoryByProduct,
          });
          if (!rel.ok) {
            failRed(formatPlanFailures(rel.failures, t, productByCode));
            return;
          }
          if (rel.plan.ops.length > 0) {
            const exec = await executeReservationPlan(rel.plan.ops);
            if (!exec.ok) {
              useProductInventoryStore.getState().forceRefresh();
              failRed(exec.error.message);
              return;
            }
            repaired.push('released-orphaned-holds');
          }
        }
      }

      if (repaired.length > 0) {
        setOrder(workingOrder);
        forceRefresh();
        useProductInventoryStore.getState().forceRefresh();
        notifications.show({
          color: 'teal',
          message: t('salesOrders.reconcile.repairSuccess', {
            actions: repaired.join(', '),
          }),
        });

        logActivity('salesOrder.reconcileRepair', workingOrder.id, {
          orderNumber: workingOrder.orderNumber,
          actions: repaired,
        });
      } else {
        notifications.show({ color: 'blue', message: t('salesOrders.reconcile.nothingToRepair') });
      }
    } catch (err) {
      if (err instanceof EntityConflictError) {
        if (err.latest) setOrder(err.latest as SalesOrder);
        notifications.show({
          color: 'yellow',
          title: t('common.conflict.title'),
          message: t('common.conflict.message'),
          autoClose: 8000,
        });
      } else {
        failRed(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setActionLoading(false);
      closeReconcile();
    }
  }, [
    id,
    order,
    currentEmployee,
    linkedDRs,
    resolveStatus,
    productByCode,
    t,
    forceRefresh,
    closeReconcile,
  ]);

  const canCreateAdditionalDR = useMemo(() => {
    if (isMobile) return false;
    if (!additionalDRAllowed) return false;
    if (!order || isCancelled) return false;
    if (order.extra.isInternalDelivery === false) return false;

    return linkedDRs.some((d) => d.direction !== 'inbound');
  }, [order, isCancelled, linkedDRs]);

  const handleCreateReturn = useCallback(() => {
    if (!order) return;
    openCreateReturn();
  }, [order, openCreateReturn]);

  const canCreateReturnShipment = useMemo(() => {
    if (isMobile) return false;
    if (!returnShipmentEnabled) return false;
    if (!order || isCancelled) return false;
    const hasClosedOutboundDR = linkedDRs.some((d) => d.direction !== 'inbound' && d.isClosed);
    const soCompleted = currentStatus?.stage === 'COMPLETED';
    return hasClosedOutboundDR || soCompleted;
  }, [order, isCancelled, linkedDRs, currentStatus]);

  return {
    order,
    loading,
    extra,
    currentStatus,
    isUrgent,
    isCancelled,
    currentEmployee,
    fieldOptions,

    allowedNextStatuses,
    statusFlowOrder,
    currentFlowIndex,
    activityByStatus,

    statusChangeOpened,
    openStatusChange,
    closeStatusChange,
    targetStatus,
    setTargetStatus,
    statusNote,
    setStatusNote,
    actionLoading,
    handleStatusChange,

    cancelOpened,
    openCancel,
    closeCancel,
    cancelReason,
    setCancelReason,
    canCancel,
    handleCancel,

    cancelTargetStatusValue,

    canManualRelease,
    manualReleaseOpened,
    openManualRelease,
    closeManualRelease,
    handleManualRelease,

    reconcileIssues,
    reconcileOpened,
    openReconcile,
    closeReconcile,
    handleReconcileRepair,

    showDelete,
    deleteOpened,
    openDelete,
    closeDelete,
    handleDelete,

    handleCopyOrder,
    handleCreateDR,
    canCreateDR,
    canCreateAdditionalDR,
    createDROpened,
    closeCreateDR,
    handleCreateReturn,
    canCreateReturnShipment,
    createReturnOpened,
    closeCreateReturn,
    refreshLinkedDRs,
    linkedDRs,

    drsInit,

    handleSendChat,

    imageDirectory,
    handlePhotosChange,

    handleAttachmentsChange,

    handleMetaPatch,
    handleItemMemoPatch,
    handleToggleDeliveryMethod,
    isExternalDelivery,
    employees,

    cameraOpened,
    openCamera,
    closeCamera,
    cameraUploading,
    handleMobileCameraCapture,

    t,
  };
}
