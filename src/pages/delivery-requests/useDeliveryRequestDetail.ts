import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDisclosure } from '@mantine/hooks';
import { useNavigate, useParams } from 'react-router';
import { notifications } from '@mantine/notifications';
import type { TFunction } from 'i18next';
import { ROUTES } from '@/constants/routes';
import { buildExpiringUploadDirectory } from '@/utils/uploadPath';
import {
  captureResultToFile,
  photoUploadErrorKey,
  uploadPhotoFile,
  RECORD_WRITE_TIMEOUT_MS,
} from '@/utils/photoUpload';
import { writePhotosWithConflictRetry } from '@/utils/photoPersist';
import {
  enqueuePhoto,
  listPendingPhotos,
  markPendingAttached,
  pendingPhotoUrl,
} from '@/utils/photoQueue';
import { withTimeout } from '@/utils/withTimeout';
import { isNetworkFailure } from '@/utils/networkError';
import { flushPhotoQueue } from '@/utils/photoQueueFlush';
import type { CaptureResult } from '@/components/ImageUploadPanel';
import { cMngtConnector } from '@credo/connectors/connector';
import { asyncDeduplicator } from '@credo/base-ui/utils';
import { getCurrentEmployeeId } from '@/hooks/useCurrentEmployee';
import { useDeliveryRequestStore } from '@/stores/useDeliveryRequestStore';
import { EntityConflictError } from '@/stores/createEntityStore';
import { useEmployeeStore } from '@/stores/useEmployeeStore';
import { perms } from '@/utils/permission';
import { useSalesOrderStore } from '@/stores/useSalesOrderStore';
import { useProductStore } from '@/stores/useProductStore';
import { useProductInventoryStore } from '@/stores/useProductInventoryStore';
import { runDrTransitionEffects } from './drTransitionEffects';
import {
  getQueuedTransition,
  queueTransition,
  removeQueuedTransition,
  subscribeTransitionQueue,
  type QueuedTransition,
} from './transitionQueue';
import { flushTransitionQueue } from './transitionQueueFlush';
import { logActivity } from '@/utils/activityLogger';
import { unlinkDRFromSalesOrder } from './linkToSalesOrder';
import { inlineEditSnapshot, type DeliveryRequestInlineFields } from './activityMemo';
import {
  getAllowedTransitions,
  getInitialStatusValue,
  getStatusFlowOrder,
  runTransition,
  type TransitionFailure,
} from './transitionEngine';
import { deliveryRequestStatusOptions } from './useDeliveryRequestStatusOptions';
import { useMyEmployee } from '@/hooks/useMyEmployee';
import type {
  DeliveryRequest,
  DeliveryRequestActivityEntry,
  DeliveryRequestDeliveredItem,
  DeliveryRequestExtra,
  DeliveryRequestPhoto,
} from '@/types';

type UseDeliveryRequestDetailOptions = {
  skipViewScopeGuard?: boolean;
};

const { resolveStatus } = deliveryRequestStatusOptions;
const canViewAll = perms.deliveryRequest.canViewAll();
const canViewSelf = perms.deliveryRequest.canViewSelf();
const canDeletePerm = perms.deliveryRequest.canDelete();

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

  handleMobileCameraCapture: (result: CaptureResult) => Promise<boolean>;

  completionPhotos: DeliveryRequestPhoto[];

  retryPendingPhotos: () => Promise<void>;

  pendingSync: QueuedTransition | null;

  syncPendingCompletion: () => Promise<void>;
  syncingCompletion: boolean;

  discardPendingSync: () => Promise<void>;
};

export function useDeliveryRequestDetail(
  t: TFunction,
  opts: UseDeliveryRequestDetailOptions = {},
): UseDeliveryRequestDetailReturn {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const invalidateCache = useDeliveryRequestStore((s) => s.invalidate);
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

  const [pendingSync, setPendingSync] = useState<QueuedTransition | null>(null);

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

  const currentEmployee = useMyEmployee();

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

      const queuedProof = await listPendingPhotos({
        kind: 'delivery-request',
        id: request.id,
      });

      const result = await runTransition({
        request,
        toStatusValue: pending.toValue,
        actor: currentEmployee,
        ...(note.trim() && { note: note.trim() }),
        deliveredItems,
        hasLocalProof: completionPhotos.length > 0 || queuedProof.length > 0,
      });

      if (!result.ok) {
        if (result.failure.kind === 'patch-error' && isNetworkFailure(result.failure.error)) {
          const queued = await queueTransition({
            id: request.id,
            drNumber: request.requestNumber,
            toStatusValue: pending.toValue,
            toStatusLabel: pending.toLabel,
            ...(note.trim() && { note: note.trim() }),
            deliveredItems,
            ...(currentEmployee && { actor: currentEmployee }),
          });

          if (queued) {
            setPendingSync(queued);
            setPending(null);
            setNote('');
            setCompletionPhotos([]);
            notifications.show({
              color: 'yellow',
              title: t('deliveryRequests.offlineCompletion.queuedTitle'),
              message: t('deliveryRequests.offlineCompletion.queuedMessage', {
                status: pending.toLabel,
              }),
              autoClose: 12000,
            });
            return;
          }
          // Couldn't even store the intent — fall through and report honestly
          // rather than promise a sync that has nowhere to live.
        }
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
      setPending(null);
      setNote('');
      setCompletionPhotos([]);

      const settled = await runDrTransitionEffects({
        updated: result.updated,
        priorStatus,
        toStatusValue: pending.toValue,
        ...(note.trim() && { note: note.trim() }),
        actor: currentEmployee,
        followUps: result.followUps,
        t,
      });
      setRequest(settled);
    } finally {
      setActionLoading(false);
    }
  }, [
    pending,
    request,
    deliveredQty,
    note,
    currentEmployee,
    completionPhotos,
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

  const imageDirectory = useMemo(
    () => buildExpiringUploadDirectory({ type: 'delivery-request', id: request?.id ?? '' }),
    [request?.id],
  );

  const handlePhotosChange = useCallback(
    async (photos: DeliveryRequestPhoto[]) => {
      if (!request) return;
      try {
        const { record, rebased } = await writePhotosWithConflictRetry<
          DeliveryRequest,
          DeliveryRequestPhoto
        >({
          record: request,
          next: photos,
          getPhotos: (rec) => (rec.extra as DeliveryRequestExtra | undefined)?.photos ?? [],
          save: async (rec, nextPhotos) =>
            (await useDeliveryRequestStore.getState().updateSafely({
              id: rec.id,
              version: rec.version,
              patch: { extra: { ...(rec.extra ?? {}), photos: nextPhotos } },
            })) as DeliveryRequest,
        });
        setRequest(record);
        if (rebased) {
          notifications.show({ color: 'blue', message: t('photos.updatedElsewhere') });
        }
      } catch (err) {
        if (err instanceof EntityConflictError && err.latest) {
          setRequest(err.latest as DeliveryRequest);
        }
        throw err;
      }
    },
    [request, t],
  );

  const handleMobileCameraCapture = useCallback(
    async (result: CaptureResult): Promise<boolean> => {
      if (!request) return false;
      setCameraUploading(true);
      const fileName = `photo-${Date.now()}.jpg`;
      try {
        const file = await captureResultToFile(result.base64, fileName);

        const storedName = `${Date.now()}-${fileName}`;
        const isCompletionCapture = captureModeRef.current === 'completion';

        const uploaded = await uploadPhotoFile({
          file,
          imageDirectory,
          fileName: storedName,
        });

        let photoUrl: string;
        let queuedId: string | null = null;

        const queuePayload = {
          blob: file,
          contentType: file.type,
          fileName: storedName,
          displayName: fileName,
          imageDirectory,
          target: { kind: 'delivery-request' as const, id: request.id },
          meta: {
            timestamp: result.timestamp,
            ...(currentEmployee && {
              userId: currentEmployee.id,
              userName: currentEmployee.name,
            }),
            ...(result.location && { location: result.location }),
            ...(result.latitude != null && { latitude: result.latitude }),
            ...(result.longitude != null && { longitude: result.longitude }),
            ...(isCompletionCapture && { takenAtDelivery: true }),
          },
        };

        if (uploaded.ok) {
          photoUrl = uploaded.url;
        } else {
          const queued = await enqueuePhoto(queuePayload);

          if (!queued) {
            notifications.show({
              color: 'red',
              title: t(photoUploadErrorKey(uploaded.reason), { name: fileName }),
              message: t('photos.queueUnavailable'),
              autoClose: 10000,
            });
            return false;
          }

          queuedId = queued.id;
          photoUrl = pendingPhotoUrl(queued.id);
        }

        const newPhoto: DeliveryRequestPhoto = {
          url: photoUrl,
          timestamp: result.timestamp,
          fileName,
          ...(currentEmployee && { userId: currentEmployee.id, userName: currentEmployee.name }),
          ...(result.location && { location: result.location }),
          ...(result.latitude != null && { latitude: result.latitude }),
          ...(result.longitude != null && { longitude: result.longitude }),
          ...(isCompletionCapture && { takenAtDelivery: true }),
        };

        if (isCompletionCapture) setCompletionPhotos((prev) => [...prev, newPhoto]);

        const currentPhotos: DeliveryRequestPhoto[] =
          (request.extra as DeliveryRequestExtra | undefined)?.photos ?? [];
        let attachFailed = false;
        try {
          await withTimeout(
            handlePhotosChange([...currentPhotos, newPhoto]),
            RECORD_WRITE_TIMEOUT_MS,
          );
          if (queuedId) void markPendingAttached(queuedId);
        } catch {
          attachFailed = true;

          if (!queuedId && uploaded.ok) {
            const salvaged = await enqueuePhoto({ ...queuePayload, uploadedUrl: uploaded.url });
            if (salvaged) queuedId = salvaged.id;
          }
        }

        if (queuedId || attachFailed) {
          notifications.show({
            color: 'yellow',
            title: t('photos.queuedTitle'),
            message: t('photos.queuedMessage'),
            autoClose: 10000,
          });
        }

        closeCamera();
        return true;
      } catch {
        notifications.show({ color: 'red', message: t('photos.uploadError', { name: fileName }) });
        return false;
      } finally {
        setCameraUploading(false);
      }
    },
    [request, imageDirectory, currentEmployee, handlePhotosChange, closeCamera, t],
  );

  const requestId = request?.id;
  useEffect(() => {
    if (!requestId) return;
    void flushPhotoQueue({ kind: 'delivery-request', id: requestId }).then((res) => {
      const updated = res.updated.find((entry) => entry.record.id === requestId);
      if (updated) setRequest(updated.record as DeliveryRequest);
    });
  }, [requestId]);

  const [syncingCompletion, setSyncingCompletion] = useState(false);

  useEffect(() => {
    if (!requestId) return;
    let cancelled = false;
    const read = () => {
      void getQueuedTransition(requestId).then((queued) => {
        if (!cancelled) setPendingSync(queued);
      });
    };
    read();
    const unsubscribe = subscribeTransitionQueue(read);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [requestId]);

  const syncPendingCompletion = useCallback(async () => {
    if (!requestId) return;
    setSyncingCompletion(true);
    try {
      const res = await flushTransitionQueue(t, requestId);
      const updated = res.updated.find((record) => record.id === requestId);
      if (updated) setRequest(updated);
      if (res.applied > 0) {
        notifications.show({
          color: 'green',
          title: t('deliveryRequests.offlineCompletion.syncedTitle'),
          message: t('deliveryRequests.offlineCompletion.syncedMessage'),
        });
      } else if (res.blocked > 0) {
        notifications.show({
          color: 'red',
          title: t('deliveryRequests.offlineCompletion.blockedTitle'),
          message: t('deliveryRequests.offlineCompletion.blockedMessage'),
          autoClose: 12000,
        });
      } else {
        notifications.show({
          color: 'yellow',
          message: t('deliveryRequests.offlineCompletion.syncFailed'),
          autoClose: 8000,
        });
      }
    } finally {
      setSyncingCompletion(false);
    }
  }, [requestId, t]);

  const discardPendingSync = useCallback(async () => {
    if (!requestId) return;
    await removeQueuedTransition(requestId);
    setPendingSync(null);
  }, [requestId]);

  const retryPendingPhotos = useCallback(async () => {
    if (!requestId) return;
    const res = await flushPhotoQueue({ kind: 'delivery-request', id: requestId });
    const updated = res.updated.find((entry) => entry.record.id === requestId);
    if (updated) setRequest(updated.record as DeliveryRequest);
    if (res.uploaded > 0) {
      notifications.show({
        color: 'green',
        message: t('photos.uploadSuccess', { count: res.uploaded }),
      });
    } else if (res.failed > 0) {
      notifications.show({ color: 'yellow', message: t('photos.retryFailed'), autoClose: 8000 });
    }
  }, [requestId, t]);

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
    retryPendingPhotos,
    pendingSync,
    syncPendingCompletion,
    syncingCompletion,
    discardPendingSync,
  };
}
