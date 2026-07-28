import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDisclosure } from '@mantine/hooks';
import { useNavigate, useParams } from 'react-router';
import { notifications } from '@mantine/notifications';
import type { TFunction } from 'i18next';
import { ROUTES } from '@/constants/routes';
import { resolveClientCode } from '@/config/client-code';
import type { CaptureResult } from '@/components/ImageUploadPanel';
import { cMngtConnector } from '@credo/connectors/connector';
import { asyncDeduplicator } from '@credo/base-ui/utils';
import { getCurrentEmployeeId } from '@/hooks/useCurrentEmployee';
import { useAuthStore } from '@/stores/useAuthStore';
import { useDeliveryRequestStore } from '@/stores/useDeliveryRequestStore';
import { EntityConflictError } from '@/stores/createEntityStore';
import { useEmployeeStore } from '@/stores/useEmployeeStore';
import {
  getDeliveryRequestStatusOptions,
  isReturnShipmentEnabled,
  perms,
} from '@/utils/permission';
import { applyReturnRestock } from '@/utils/deliveryRequestReturnInventory';
import { useSalesOrderStore } from '@/stores/useSalesOrderStore';
import { useProductStore } from '@/stores/useProductStore';
import { useProductInventoryStore } from '@/stores/useProductInventoryStore';
import { indexInventoryByProduct } from '@/utils/inventoryCommitment';
import {
  getAutoShippingTargetValue,
  runTransition as runSoTransition,
  statusHasCapability as soStatusHasCapability,
  type TransitionFailure as SoTransitionFailure,
} from '@/pages/sales-orders/transitionEngine';
import { formatPlanFailures } from '@/pages/sales-orders/planFailures';
import {
  advanceSoIfFullyDelivered,
  ensureReconcileStoresLoaded,
} from '@/pages/sales-orders/reconcileFromDeliveries';
import { logActivity } from '@/utils/activityLogger';
import { unlinkDRFromSalesOrder } from './linkToSalesOrder';
import { inlineEditSnapshot, type DeliveryRequestInlineFields } from './activityMemo';
import {
  getAllowedTransitions,
  getInitialStatusValue,
  getStatusFlowOrder,
  runTransition,
  type DrFollowUp,
  type TransitionFailure,
} from './transitionEngine';
import { deliveryRequestStatusOptions } from './useDeliveryRequestStatusOptions';
import { findEmployeeByLoginEmail } from '@/utils/loginEmail';
import type {
  DeliveryRequest,
  DeliveryRequestActivityEntry,
  DeliveryRequestDeliveredItem,
  DeliveryRequestExtra,
  DeliveryRequestPhoto,
  Product,
  SalesOrder,
  SalesOrderExtra,
} from '@/types';

type UseDeliveryRequestDetailOptions = {
  skipViewScopeGuard?: boolean;
};

const { resolveStatus } = deliveryRequestStatusOptions;
const canViewAll = perms.deliveryRequest.canViewAll();
const canViewSelf = perms.deliveryRequest.canViewSelf();
const canDeletePerm = perms.deliveryRequest.canDelete();

async function dispatchDrFollowUp(
  followUp: DrFollowUp,
  updatedDr: DeliveryRequest,
  currentEmployee: { id: string; name: string } | undefined,
  t: TFunction,
): Promise<void> {
  switch (followUp.kind) {
    case 'advance-so-on-full-delivery':
      return advanceLinkedSoIfFullyDelivered(updatedDr, currentEmployee, t);
    case 'advance-so-on-dispatch':
      return advanceLinkedSoOnDispatch(updatedDr, currentEmployee, t);
  }
}

function formatFollowUpFailureMessage(
  failure: SoTransitionFailure,
  productsByCode: Map<string, Product>,
  t: TFunction,
): string {
  switch (failure.kind) {
    case 'plan-failure':
      return formatPlanFailures(failure.failures, t, productsByCode);
    case 'patch-error':
    case 'execution-failure':
      return failure.error.message;
    default:
      return failure.kind;
  }
}

async function advanceLinkedSoIfFullyDelivered(
  closedDr: DeliveryRequest,
  currentEmployee: { id: string; name: string } | undefined,
  t: TFunction,
): Promise<void> {
  if (closedDr.direction === 'inbound') return;
  if (!closedDr.salesOrderId) return;

  const soStore = useSalesOrderStore.getState();
  if (!soStore.initialized) await soStore.loadAll();
  const so = useSalesOrderStore.getState().getById(closedDr.salesOrderId) as SalesOrder | undefined;
  if (!so) return;
  await advanceSoIfFullyDelivered({ so, actor: currentEmployee, t, freshDr: closedDr });
}

async function advanceLinkedSoOnDispatch(
  transitionedDr: DeliveryRequest,
  currentEmployee: { id: string; name: string } | undefined,
  t: TFunction,
): Promise<void> {
  if (transitionedDr.direction === 'inbound') return;
  if (!transitionedDr.salesOrderId) return;

  await ensureReconcileStoresLoaded();
  const so = useSalesOrderStore.getState().getById(transitionedDr.salesOrderId) as
    SalesOrder | undefined;
  if (!so || so.isClosed) return;
  const soExtra = (so.extra ?? {}) as SalesOrderExtra;
  if (soExtra.cancellation != null) return;
  const fromStatus = soExtra.status ?? '';
  if (!soStatusHasCapability(fromStatus, 'autoAdvanceOnDispatch')) return;
  const targetStatus = getAutoShippingTargetValue();
  if (!targetStatus) return;
  if (fromStatus === targetStatus) return;

  const products = useProductStore.getState().items;
  const productsByCode = new Map<string, Product>();
  for (const p of products) productsByCode.set(p.code, p);
  const inventoryByProduct = indexInventoryByProduct(useProductInventoryStore.getState().items);

  const result = await runSoTransition({
    order: so,
    toStatusValue: targetStatus,
    actor: currentEmployee,
    productsByCode,
    inventoryByProduct,
  });

  if (result.ok) {
    notifications.show({
      color: 'green',
      message: t('deliveryRequests.notifications.soAutoShippedSuccess', {
        orderNumber: so.orderNumber,
        status: targetStatus,
      }),
    });
    return;
  }

  const message = formatFollowUpFailureMessage(result.failure, productsByCode, t);
  notifications.show({
    color: 'yellow',
    title: t('deliveryRequests.notifications.soAutoShippedFailedTitle'),
    message,
    autoClose: 10000,
  });
}

export type PendingTransition = {
  toValue: string;
  toLabel: string;
  actionLabel: string;
};

export type DeliveryRequestMetaPatch = {
  extra?: Partial<DeliveryRequestExtra>;
  notes?: string;
  scheduledDate?: DeliveryRequest['scheduledDate'];
};

export type UseDeliveryRequestDetailReturn = {
  request: DeliveryRequest | null;
  loading: boolean;
  actionLoading: boolean;
  currentStatus: ReturnType<typeof resolveStatus>;
  allowedTransitions: { value: string; label: string; actionLabel: string; color: string }[];
  statusFlowOrder: string[];
  currentFlowIndex: number;
  activityByStatus: Map<string, DeliveryRequestActivityEntry>;
  currentEmployee: { id: string; name: string } | undefined;
  deliveredQty: Map<string, number>;
  setDeliveredQty: (next: Map<string, number>) => void;
  setLineDeliveredQty: (key: string, value: number) => void;
  pending: PendingTransition | null;

  pendingIsCompletion: boolean;
  note: string;
  setNote: (v: string) => void;
  requestStatusChange: (toValue: string) => void;
  cancelStatusChange: () => void;
  confirmStatusChange: () => Promise<void>;
  handleMetaPatch: (patch: DeliveryRequestMetaPatch) => Promise<void>;

  applyUpdatedRequest: (updated: DeliveryRequest) => void;

  showDelete: boolean;
  deleteOpened: boolean;
  openDelete: () => void;
  closeDelete: () => void;
  handleDelete: () => Promise<void>;

  imageDirectory: string;
  handlePhotosChange: (photos: DeliveryRequestPhoto[]) => Promise<void>;
  cameraOpened: boolean;
  openCamera: () => void;

  openCompletionCamera: () => void;
  closeCamera: () => void;
  cameraUploading: boolean;
  handleMobileCameraCapture: (result: CaptureResult) => Promise<void>;

  completionPhotos: DeliveryRequestPhoto[];
};

export function useDeliveryRequestDetail(
  t: TFunction,
  opts: UseDeliveryRequestDetailOptions = {},
): UseDeliveryRequestDetailReturn {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const invalidateCache = useDeliveryRequestStore((s) => s.invalidate);
  const { user } = useAuthStore();
  const employees = useEmployeeStore((s) => s.items);
  const soInit = useSalesOrderStore((s) => s.initialized);
  const loadSOs = useSalesOrderStore((s) => s.loadAll);
  const productsInit = useProductStore((s) => s.initialized);
  const loadProducts = useProductStore((s) => s.loadAll);
  const inventoryInit = useProductInventoryStore((s) => s.initialized);
  const loadInventory = useProductInventoryStore((s) => s.loadAll);

  const [request, setRequest] = useState<DeliveryRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [cameraOpened, { open: openCameraRaw, close: closeCamera }] = useDisclosure(false);
  const [cameraUploading, setCameraUploading] = useState(false);
  const [deleteOpened, { open: openDelete, close: closeDelete }] = useDisclosure(false);

  const [completionPhotos, setCompletionPhotos] = useState<DeliveryRequestPhoto[]>([]);

  const captureModeRef = useRef<'fab' | 'completion'>('fab');

  const openCamera = useCallback(() => {
    captureModeRef.current = 'fab';
    openCameraRaw();
  }, [openCameraRaw]);
  const openCompletionCamera = useCallback(() => {
    captureModeRef.current = 'completion';
    openCameraRaw();
  }, [openCameraRaw]);

  useEffect(() => {
    if (!soInit) loadSOs();
  }, [soInit, loadSOs]);

  useEffect(() => {
    if (!productsInit) loadProducts();
  }, [productsInit, loadProducts]);
  useEffect(() => {
    if (!inventoryInit) loadInventory();
  }, [inventoryInit, loadInventory]);

  const currentEmployee = useMemo(() => {
    if (!user.email) return undefined;
    return findEmployeeByLoginEmail(employees, user.email);
  }, [user.email, employees]);

  const [deliveredQty, setDeliveredQty] = useState<Map<string, number>>(new Map());
  useEffect(() => {
    if (!request) return;
    const drExtra = (request.extra ?? {}) as DeliveryRequestExtra;
    const persisted = drExtra.deliveredItems ?? [];
    const m = new Map<string, number>();
    for (const it of request.items) {
      const key = `${it.productCode}::${it.unit}`;
      const found = persisted.find((p) => p.productCode === it.productCode && p.unit === it.unit);
      m.set(key, found?.quantity ?? it.quantity);
    }

    setDeliveredQty(m);
  }, [request]);

  const setLineDeliveredQty = useCallback((key: string, value: number) => {
    setDeliveredQty((prev) => {
      const next = new Map(prev);
      next.set(key, value);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!id) return;
    const cached = useDeliveryRequestStore.getState().getById(id) as DeliveryRequest | undefined;
    if (cached) {
      if (cached.extra?.isDeleted) {
        navigate(ROUTES.DELIVERY.LIST, { replace: true });
        return;
      }

      setRequest(cached);
      setLoading(false);
      return;
    }
    setLoading(true);
    asyncDeduplicator.call(`delivery-request:${id}`, async () => {
      await cMngtConnector
        .getDeliveryRequestById({ id })
        .then((res) => {
          if (res.deliveryRequest.extra?.isDeleted) {
            navigate(ROUTES.DELIVERY.LIST, { replace: true });
            return;
          }
          setRequest(res.deliveryRequest);
        })
        .catch(() => {
          notifications.show({
            color: 'red',
            message: t('deliveryRequests.notifications.fetchError'),
          });
          navigate(ROUTES.DELIVERY.LIST);
        })
        .finally(() => setLoading(false));
    });
  }, [id, t, navigate]);

  useEffect(() => {
    if (opts.skipViewScopeGuard) return;
    if (!request) return;
    if (canViewAll) return;
    if (!canViewSelf) {
      notifications.show({
        color: 'yellow',
        message: t('deliveryRequests.notifications.accessDenied'),
      });
      navigate(ROUTES.DELIVERY.LIST);
      return;
    }
    const me = getCurrentEmployeeId();
    if (!me) return;
    const assignedDriverId = (request.extra as { assignedDriverId?: string } | undefined)
      ?.assignedDriverId;
    if (assignedDriverId !== me) {
      notifications.show({
        color: 'yellow',
        message: t('deliveryRequests.notifications.accessDenied'),
      });
      navigate(ROUTES.DELIVERY.LIST);
    }
  }, [request, employees, t, navigate, opts.skipViewScopeGuard]);

  const currentStatus = useMemo(
    () => resolveStatus((request?.extra as { status?: string } | undefined)?.status),
    [request],
  );

  const allowedTransitions = useMemo(() => {
    if (!request) return [];
    const allowedValues = getAllowedTransitions(currentStatus.value);
    return allowedValues
      .map((v) => {
        const opt = resolveStatus(v);
        return {
          value: opt.value,
          label: opt.label,
          actionLabel: opt.actionLabel,
          color: opt.color,
        };
      })
      .filter((opt) => opt.value);
  }, [request, currentStatus.value]);

  const [pending, setPending] = useState<PendingTransition | null>(null);
  const [note, setNote] = useState('');

  const pendingIsCompletion = useMemo(
    () => (pending ? resolveStatus(pending.toValue).stage === 'COMPLETED' : false),
    [pending],
  );

  const requestStatusChange = useCallback(
    (toValue: string) => {
      const target = allowedTransitions.find((o) => o.value === toValue);
      if (!target) return;
      setPending({
        toValue: target.value,
        toLabel: target.label,
        actionLabel: target.actionLabel,
      });
      setNote('');
      setCompletionPhotos([]);
      captureModeRef.current = 'fab';
    },
    [allowedTransitions],
  );

  const cancelStatusChange = useCallback(() => {
    setPending(null);
    setNote('');
    setCompletionPhotos([]);
  }, []);

  const handleTransitionFailure = useCallback(
    (failure: TransitionFailure) => {
      if (failure.kind === 'patch-conflict') {
        notifications.show({
          color: 'yellow',
          title: t('common.conflict.title'),
          message: t('common.conflict.message'),
          autoClose: 8000,
        });
        return;
      }
      if (failure.kind === 'photos-required') {
        const isInbound = request?.direction === 'inbound';
        notifications.show({
          color: 'red',
          title: t('deliveryRequests.notifications.photosRequiredTitle'),
          message: isInbound
            ? t('deliveryRequests.notifications.photosRequiredMessageReceive')
            : t('deliveryRequests.notifications.photosRequiredMessage'),
          autoClose: 8000,
        });
        return;
      }
      const message =
        failure.kind === 'patch-error'
          ? failure.error.message
          : t('deliveryRequests.notifications.updateError');
      notifications.show({ color: 'red', message });
    },
    [t, request],
  );

  const confirmStatusChange = useCallback(async () => {
    if (!pending || !request) return;
    setActionLoading(true);
    try {
      const deliveredItems: DeliveryRequestDeliveredItem[] = request.items.map((it) => ({
        productCode: it.productCode,
        unit: it.unit,
        quantity: deliveredQty.get(`${it.productCode}::${it.unit}`) ?? 0,
      }));

      const result = await runTransition({
        request,
        toStatusValue: pending.toValue,
        actor: currentEmployee,
        ...(note.trim() && { note: note.trim() }),
        deliveredItems,
      });

      if (!result.ok) {
        handleTransitionFailure(result.failure);
        return;
      }
      setRequest(result.updated);
      notifications.show({
        color: 'green',
        message: t('deliveryRequests.notifications.updateSuccess'),
      });
      invalidateCache();

      const priorStatus = (request.extra as DeliveryRequestExtra | undefined)?.status ?? '';
      logActivity('deliveryRequest.statusChange', request.id, {
        requestNumber: result.updated.requestNumber,
        fromStatus: priorStatus,
        toStatus: pending.toValue,
        ...(note.trim() && { note: note.trim() }),
      });

      setPending(null);
      setNote('');
      setCompletionPhotos([]);

      const updatedExtra = (result.updated.extra ?? {}) as DeliveryRequestExtra;
      const toStage = getDeliveryRequestStatusOptions().find(
        (o) => o.value === pending.toValue,
      )?.stage;
      if (
        isReturnShipmentEnabled() &&
        result.updated.direction === 'inbound' &&
        updatedExtra.inboundKind === 'customer-return' &&
        updatedExtra.returnRestock === true &&
        !updatedExtra.returnRestockedAt &&
        toStage === 'COMPLETED'
      ) {
        const restock = await applyReturnRestock(result.updated);
        if (restock.failed > 0) {
          notifications.show({
            color: 'red',
            title: t('deliveryRequests.return.restockFailedTitle'),
            message: t('deliveryRequests.return.restockFailedMessage', { count: restock.failed }),
            autoClose: 8000,
          });
        } else if (restock.succeeded > 0) {
          try {
            const stamped = (await useDeliveryRequestStore.getState().updateSafely({
              id: result.updated.id,
              version: result.updated.version,
              patch: {
                extra: { ...updatedExtra, returnRestockedAt: new Date().toISOString() },
              },
            })) as DeliveryRequest;
            setRequest(stamped);
          } catch {
            // Marker lost — harmless: the status is terminal, so there's no
            // re-entry that could double-apply the restock.
          }
          notifications.show({
            color: 'green',
            message: t('deliveryRequests.return.restockDone', { count: restock.succeeded }),
          });
        }
      }

      for (const followUp of result.followUps) {
        await dispatchDrFollowUp(followUp, result.updated, currentEmployee, t);
      }
    } finally {
      setActionLoading(false);
    }
  }, [
    pending,
    request,
    deliveredQty,
    note,
    currentEmployee,
    t,
    invalidateCache,
    handleTransitionFailure,
  ]);

  const handleMetaPatch = useCallback(
    async (patch: DeliveryRequestMetaPatch) => {
      const { id: drId } = request ?? {};
      if (!drId || !request) return;
      const currentExtra = request.extra ?? {};
      const beforeSnapshot = inlineEditSnapshot(request);
      try {
        const updated = await useDeliveryRequestStore.getState().updateSafely({
          id: drId,
          version: request.version,
          patch: {
            ...(patch.extra ? { extra: { ...currentExtra, ...patch.extra } } : {}),
            ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
            ...(patch.scheduledDate !== undefined ? { scheduledDate: patch.scheduledDate } : {}),
          },
        });
        setRequest(updated as DeliveryRequest);

        const fields: DeliveryRequestInlineFields = {};
        if (patch.extra) {
          const before = currentExtra as DeliveryRequestExtra;
          if (
            'assignedDriverId' in patch.extra &&
            patch.extra.assignedDriverId !== before.assignedDriverId
          ) {
            fields.assignedDriverId = {
              ...(before.assignedDriverId && { from: before.assignedDriverId }),
              ...(patch.extra.assignedDriverId && { to: patch.extra.assignedDriverId }),
            };
          }
          if (
            'deliveryAddress' in patch.extra &&
            patch.extra.deliveryAddress !== before.deliveryAddress
          ) {
            fields.deliveryAddress = { changed: true };
          }
          if ('googleMapUrl' in patch.extra && patch.extra.googleMapUrl !== before.googleMapUrl) {
            fields.googleMapUrl = { changed: true };
          }
        }
        if (patch.scheduledDate !== undefined) {
          const fromMs = beforeSnapshot.scheduledDate;
          const toMs =
            typeof patch.scheduledDate === 'number'
              ? patch.scheduledDate
              : patch.scheduledDate
                ? new Date(patch.scheduledDate as string).getTime()
                : undefined;
          if (fromMs !== toMs) {
            fields.scheduledDate = {
              ...(fromMs !== undefined && { from: fromMs }),
              ...(toMs !== undefined && { to: toMs }),
            };
          }
        }
        if (patch.notes !== undefined && patch.notes !== request.notes) {
          fields.notes = { changed: true };
        }
        if (Object.keys(fields).length > 0) {
          logActivity('deliveryRequest.update', drId, {
            requestNumber: request.requestNumber,
            inlineEdit: true,
            fields,
          });
        }
      } catch (err) {
        if (err instanceof EntityConflictError) {
          if (err.latest) setRequest(err.latest as DeliveryRequest);
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
    [request, t],
  );

  const showDelete = canDeletePerm && request != null;

  const handleDelete = useCallback(async () => {
    if (!request) return;
    const { id: drId } = request;
    const currentExtra = (request.extra ?? {}) as DeliveryRequestExtra;
    setActionLoading(true);
    try {
      await useDeliveryRequestStore.getState().updateSafely({
        id: drId,
        version: request.version,
        patch: { extra: { ...currentExtra, isDeleted: true } },
      });
      notifications.show({
        color: 'green',
        message: t('deliveryRequests.notifications.deleteSuccess'),
      });
      invalidateCache();
      logActivity('deliveryRequest.delete', drId, { requestNumber: request.requestNumber });

      if (request.salesOrderId) {
        try {
          await unlinkDRFromSalesOrder(request.salesOrderId, drId);
        } catch {
          // non-blocking — the SO's hint list keeps a stale id until reconciled
        }
      }
      navigate(ROUTES.DELIVERY.LIST);
    } catch (err) {
      if (err instanceof EntityConflictError) {
        if (err.latest) setRequest(err.latest as DeliveryRequest);
        notifications.show({
          color: 'yellow',
          title: t('common.conflict.title'),
          message: t('common.conflict.message'),
          autoClose: 8000,
        });
      } else {
        notifications.show({
          color: 'red',
          message: t('deliveryRequests.notifications.deleteError'),
        });
      }
    } finally {
      setActionLoading(false);
      closeDelete();
    }
  }, [request, t, invalidateCache, navigate, closeDelete]);

  const imageDirectory = useMemo(() => {
    const clientCode = resolveClientCode();
    const today = new Date().toISOString().slice(0, 10);
    return `/c-mngt/${clientCode}/${today}/delivery-request/${request?.id ?? ''}`;
  }, [request?.id]);

  const handlePhotosChange = useCallback(
    async (photos: DeliveryRequestPhoto[]) => {
      if (!request) return;
      const currentExtra = request.extra ?? {};
      try {
        const updated = await useDeliveryRequestStore.getState().updateSafely({
          id: request.id,
          version: request.version,
          patch: { extra: { ...currentExtra, photos } },
        });
        setRequest(updated as DeliveryRequest);
      } catch (err) {
        if (err instanceof EntityConflictError) {
          if (err.latest) setRequest(err.latest as DeliveryRequest);
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
    [request, t],
  );

  const handleMobileCameraCapture = useCallback(
    async (result: CaptureResult) => {
      if (!request) return;
      setCameraUploading(true);
      try {
        const { dolgaConnector, r2Connector } = await import('@credo/connectors/connector');

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

        const isCompletionCapture = captureModeRef.current === 'completion';
        const newPhoto: DeliveryRequestPhoto = {
          url: presignRes.fileUrl,
          timestamp: result.timestamp,
          fileName,
          ...(currentEmployee && { userId: currentEmployee.id, userName: currentEmployee.name }),
          ...(result.location && { location: result.location }),
          ...(result.latitude != null && { latitude: result.latitude }),
          ...(result.longitude != null && { longitude: result.longitude }),
          ...(isCompletionCapture && { takenAtDelivery: true }),
        };

        const currentPhotos: DeliveryRequestPhoto[] =
          (request.extra as DeliveryRequestExtra | undefined)?.photos ?? [];
        await handlePhotosChange([...currentPhotos, newPhoto]);
        if (isCompletionCapture) setCompletionPhotos((prev) => [...prev, newPhoto]);
      } finally {
        setCameraUploading(false);
        closeCamera();
      }
    },
    [request, imageDirectory, currentEmployee, handlePhotosChange, closeCamera],
  );

  const statusFlowOrder = useMemo(() => getStatusFlowOrder(), []);
  const currentFlowIndex = useMemo(
    () => statusFlowOrder.indexOf(currentStatus.value),
    [statusFlowOrder, currentStatus.value],
  );

  const activityByStatus = useMemo(() => {
    const drExtra = (request?.extra ?? {}) as DeliveryRequestExtra;
    const log = drExtra.activityLog ?? [];
    const map = new Map<string, DeliveryRequestActivityEntry>();
    for (const entry of log) {
      if (entry.toStatus) map.set(entry.toStatus, entry);
    }
    const createdEntry = log.find((e) => e.action === 'created');
    if (createdEntry) {
      const initialStatus = createdEntry.toStatus || getInitialStatusValue() || statusFlowOrder[0];
      if (initialStatus && !map.has(initialStatus)) map.set(initialStatus, createdEntry);
    }
    return map;
  }, [request?.extra, statusFlowOrder]);

  return {
    request,
    loading,
    actionLoading,
    currentStatus,
    allowedTransitions,
    statusFlowOrder,
    currentFlowIndex,
    activityByStatus,
    currentEmployee,
    deliveredQty,
    setDeliveredQty,
    setLineDeliveredQty,
    pending,
    pendingIsCompletion,
    note,
    setNote,
    requestStatusChange,
    cancelStatusChange,
    confirmStatusChange,
    handleMetaPatch,
    applyUpdatedRequest: setRequest,
    showDelete,
    deleteOpened,
    openDelete,
    closeDelete,
    handleDelete,
    imageDirectory,
    handlePhotosChange,
    cameraOpened,
    openCamera,
    openCompletionCamera,
    closeCamera,
    cameraUploading,
    handleMobileCameraCapture,
    completionPhotos,
  };
}
