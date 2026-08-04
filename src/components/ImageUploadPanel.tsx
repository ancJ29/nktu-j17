import {
  ActionIcon,
  Affix,
  Badge,
  Box,
  Button,
  Center,
  FileButton,
  Group,
  Image,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconCamera,
  IconCheck,
  IconCloudUpload,
  IconDeviceFloppy,
  IconPhoto,
  IconPlaceholder,
  IconRotate,
  IconTrash,
  IconTruckDelivery,
  IconUpload,
  IconX,
} from '@tabler/icons-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { device } from '@credo/base-ui/utils';
import { deleteMedia } from '@/utils/mediaStorage';
import { captureResultToFile, photoUploadErrorKey, uploadPhotoFile } from '@/utils/photoUpload';
import {
  getPendingPhoto,
  isPendingPhotoUrl,
  pendingPhotoId,
  removePendingPhoto,
} from '@/utils/photoQueue';
import { flushPhotoQueue } from '@/utils/photoQueueFlush';
import { shareOrDownloadFile } from '@/utils/pdfExport';
import { ImageZoomModal } from './ImageZoomModal';
import type { DateTimeInput } from '@credo/kits/types';
import { isInternal } from '@/config/env';

const isMobile = device.isMobile;

export type PhotoEntry = {
  url: string;
  timestamp: DateTimeInput;
  userId?: string;
  userName?: string;
  fileName?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  isDeleted?: boolean;

  takenAtDelivery?: boolean;
};

type ImageUploadPanelProps = {
  images: PhotoEntry[];

  onChange: (images: PhotoEntry[]) => Promise<void>;

  imageDirectory: string;

  editable?: boolean;

  maxFileSizeMB?: number;

  compressTargetKB?: number;

  marker: string;

  currentUserId?: string;
  currentUserName?: string;

  externalCamera?: boolean;

  section?: 'all' | 'upload' | 'grid';

  buildFileName?: (originalName: string) => string;

  uploadControl?: 'auto' | 'button';

  uploadButtonLabel?: string;

  onRetryPending?: () => void | Promise<void>;
};

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function usePendingPhotoPreviews(photos: PhotoEntry[]): Record<string, string> {
  const [previews, setPreviews] = useState<Record<string, string>>({});

  const pendingKey = photos
    .map((photo) => photo.url)
    .filter(isPendingPhotoUrl)
    .join('|');

  useEffect(() => {
    let cancelled = false;
    const created: string[] = [];

    const load = async () => {
      const ids = pendingKey ? pendingKey.split('|').map((url) => pendingPhotoId(url)) : [];
      const entries = await Promise.all(
        ids.map(async (id) => {
          if (!id) return null;
          const pending = await getPendingPhoto(id);
          return pending ? ([id, URL.createObjectURL(pending.blob)] as const) : null;
        }),
      );

      if (cancelled) {
        entries.forEach((entry) => entry && URL.revokeObjectURL(entry[1]));
        return;
      }
      const map: Record<string, string> = {};
      entries.forEach((entry) => {
        if (!entry) return;
        map[entry[0]] = entry[1];
        created.push(entry[1]);
      });
      setPreviews(map);
    };

    void load();

    return () => {
      cancelled = true;
      created.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [pendingKey]);

  return previews;
}

export function ImageUploadPanel({
  images,
  onChange,
  imageDirectory,
  editable = true,
  maxFileSizeMB = 50,
  compressTargetKB = 500,
  marker,
  currentUserId,
  currentUserName,
  externalCamera = false,
  section = 'all',
  buildFileName,
  uploadControl = 'auto',
  uploadButtonLabel,
  onRetryPending,
}: ImageUploadPanelProps) {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewOpened, { open: openPreview, close: closePreview }] = useDisclosure(false);
  const [cameraOpened, { open: openCamera, close: closeCamera }] = useDisclosure(false);
  const resetRef = useRef<() => void>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const dragDepthRef = useRef(0);

  const handleUpload = useCallback(
    async (files: File[]) => {
      if (!files.length) return;

      const maxBytes = maxFileSizeMB * 1024 * 1024;
      const validFiles = files.filter((f) => {
        if (!ACCEPTED_TYPES.includes(f.type)) {
          notifications.show({
            color: 'red',
            message: t('photos.invalidType', { name: f.name }),
          });
          return false;
        }
        if (f.size > maxBytes) {
          notifications.show({
            color: 'red',
            message: t('photos.tooLarge', { name: f.name, max: maxFileSizeMB }),
          });
          return false;
        }
        return true;
      });

      if (!validFiles.length) return;

      setUploading(true);

      const newEntries: PhotoEntry[] = [];
      try {
        for (const rawFile of validFiles) {
          try {
            const file = await compressImageFile(rawFile, { targetKB: compressTargetKB });
            const fileName = buildFileName
              ? buildFileName(file.name)
              : `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

            const result = await uploadPhotoFile({ file, imageDirectory, fileName });

            if (!result.ok) {
              notifications.show({
                color: 'red',
                message: t(photoUploadErrorKey(result.reason), { name: rawFile.name }),
                autoClose: 8000,
              });
              continue;
            }

            newEntries.push({
              url: result.url,
              timestamp: Date.now(),
              fileName: rawFile.name,
              ...(currentUserId && { userId: currentUserId }),
              ...(currentUserName && { userName: currentUserName }),
            });
          } catch {
            notifications.show({
              color: 'red',
              message: t('photos.uploadError', { name: rawFile.name }),
            });
          }
        }

        if (newEntries.length > 0) {
          try {
            await onChange([...images, ...newEntries]);
            notifications.show({
              color: 'green',
              message: t('photos.uploadSuccess', { count: newEntries.length }),
            });
          } catch {
            notifications.show({
              color: 'red',
              title: t('photos.saveFailedTitle'),
              message: t('photos.saveFailed', { count: newEntries.length }),
              autoClose: 10000,
            });
          }
        }
      } finally {
        setUploading(false);
        resetRef.current?.();
      }
    },
    [
      images,
      onChange,
      imageDirectory,
      maxFileSizeMB,
      compressTargetKB,
      t,
      currentUserId,
      currentUserName,
      buildFileName,
    ],
  );

  const handleCapturedPhoto = useCallback(
    async (result: CaptureResult): Promise<boolean> => {
      const fileName = `photo-${Date.now()}.jpg`;

      setUploading(true);
      try {
        const file = await captureResultToFile(result.base64, fileName);
        const storedName = buildFileName
          ? buildFileName(fileName)
          : `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

        const uploaded = await uploadPhotoFile({
          file,
          imageDirectory,
          fileName: storedName,
        });

        if (!uploaded.ok) {
          notifications.show({
            color: 'red',
            message: t(photoUploadErrorKey(uploaded.reason), { name: fileName }),
            autoClose: 8000,
          });
          return false;
        }

        const newEntry: PhotoEntry = {
          url: uploaded.url,
          timestamp: result.timestamp,
          fileName,
          ...(currentUserId && { userId: currentUserId }),
          ...(currentUserName && { userName: currentUserName }),
          ...(result.location && { location: result.location }),
          ...(result.latitude != null && { latitude: result.latitude }),
          ...(result.longitude != null && { longitude: result.longitude }),
        };

        try {
          await onChange([...images, newEntry]);
          notifications.show({ color: 'green', message: t('photos.uploadSuccess', { count: 1 }) });
        } catch {
          notifications.show({
            color: 'red',
            title: t('photos.saveFailedTitle'),
            message: t('photos.saveFailed', { count: 1 }),
            autoClose: 10000,
          });

          return false;
        }

        closeCamera();
        return true;
      } catch {
        notifications.show({ color: 'red', message: t('photos.uploadError', { name: fileName }) });
        return false;
      } finally {
        setUploading(false);
      }
    },
    [
      images,
      onChange,
      imageDirectory,
      t,
      currentUserId,
      currentUserName,
      closeCamera,
      buildFileName,
    ],
  );

  const handleDelete = useCallback(
    async (photo: PhotoEntry) => {
      setDeleting(photo.url);
      try {
        const updated = images.map((p) => (p.url === photo.url ? { ...p, isDeleted: true } : p));

        await onChange(updated);
        const queueId = pendingPhotoId(photo.url);

        if (queueId) void removePendingPhoto(queueId);
        else deleteMedia(photo.url);
      } catch {
        notifications.show({ color: 'red', message: t('photos.deleteError') });
      } finally {
        setDeleting(null);
      }
    },
    [images, onChange, t],
  );

  const visiblePhotos = images.filter((p) => !p.isDeleted);
  const pendingCount = visiblePhotos.filter((p) => isPendingPhotoUrl(p.url)).length;
  const pendingPreviews = usePendingPhotoPreviews(visiblePhotos);

  const handleRetryPending = useCallback(async () => {
    setRetrying(true);
    try {
      if (onRetryPending) await onRetryPending();
      else await flushPhotoQueue();
    } finally {
      setRetrying(false);
    }
  }, [onRetryPending]);

  const handleSaveToDevice = useCallback(
    async (photo: PhotoEntry) => {
      const queueId = pendingPhotoId(photo.url);
      if (!queueId) return;
      const entry = await getPendingPhoto(queueId);
      if (!entry) {
        notifications.show({ color: 'red', message: t('photos.saveToDeviceFailed') });
        return;
      }

      const safeMarker = marker.replace(/[^a-zA-Z0-9._-]/g, '_') || 'photo';
      const result = await shareOrDownloadFile(
        entry.blob,
        `${safeMarker}-${entry.id}.jpg`,
        'image/jpeg',
      );
      if (result !== 'cancelled') {
        notifications.show({ color: 'green', message: t('photos.savedToDevice') });
      }
    },
    [marker, t],
  );

  const handlePreview = (photo: PhotoEntry, src?: string) => {
    setPreviewUrl(src ?? photo.url);
    openPreview();
  };

  const showUpload = section === 'all' || section === 'upload';
  const showGrid = section === 'all' || section === 'grid';

  return (
    <Stack gap={isMobile ? 2 : 'md'} p={isMobile ? 4 : 'md'}>
      {/* Inline file-picker button — the modal-safe control (see `uploadControl`) */}
      {showUpload && editable && uploadControl === 'button' && (
        <FileButton
          resetRef={resetRef}
          onChange={handleUpload}
          accept={ACCEPTED_TYPES.join(',')}
          multiple
        >
          {(props) => (
            <Button
              {...props}
              size="compact-sm"
              variant="light"
              loading={uploading}
              leftSection={isMobile ? <IconCamera size={14} /> : <IconUpload size={14} />}
            >
              {uploadButtonLabel ?? t('photos.addPhotos')}
            </Button>
          )}
        </FileButton>
      )}

      {/* Desktop: drag-and-drop zone */}
      {showUpload && editable && uploadControl === 'auto' && !isMobile && (
        <Box
          onDragEnter={(e) => {
            e.preventDefault();
            dragDepthRef.current += 1;
            if (e.dataTransfer.types.includes('Files')) setIsDragOver(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            dragDepthRef.current -= 1;
            if (dragDepthRef.current <= 0) {
              dragDepthRef.current = 0;
              setIsDragOver(false);
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            dragDepthRef.current = 0;
            setIsDragOver(false);
            if (uploading) return;
            const files = Array.from(e.dataTransfer.files);
            if (files.length > 0) handleUpload(files);
          }}
          style={{
            border: `1.5px dashed ${
              isDragOver
                ? 'var(--mantine-primary-color-filled)'
                : 'var(--mantine-color-default-border)'
            }`,
            borderRadius: 'var(--mantine-radius-md)',
            background: isDragOver
              ? 'var(--mantine-primary-color-light)'
              : 'var(--mantine-color-default-hover)',
            padding: 24,
            transition: 'background-color 140ms ease, border-color 140ms ease',
            cursor: uploading ? 'not-allowed' : 'pointer',
            position: 'relative',
          }}
        >
          {isInternal && (
            <ActionIcon
              style={{
                position: 'absolute',
                top: 5,
                right: 5,
              }}
              variant="default"
              size="xs"
              onClick={() => {
                const dummyPhoto = {
                  url: 'https://developers.elementor.com/docs/assets/img/elementor-placeholder-image.png',
                  timestamp: Date.now(),
                  fileName: 'dummy-photo.jpg',
                  userId: '',
                  userName: '',
                  location: '',
                  latitude: 0,
                  longitude: 0,
                };
                onChange([...images, dummyPhoto]);
              }}
            >
              <IconPlaceholder size={14} />
            </ActionIcon>
          )}
          <FileButton
            resetRef={resetRef}
            onChange={handleUpload}
            accept={ACCEPTED_TYPES.join(',')}
            multiple
          >
            {(props) => (
              <Stack
                gap={6}
                align="center"
                onClick={uploading ? undefined : props.onClick}
                style={{ cursor: uploading ? 'not-allowed' : 'pointer' }}
              >
                <Box
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--mantine-primary-color-light)',
                    color: 'var(--mantine-primary-color-filled)',
                  }}
                >
                  {uploading ? <Loader size={20} /> : <IconUpload size={20} />}
                </Box>
                <Text size="sm" fw={600}>
                  {uploading
                    ? t('photos.uploading')
                    : isDragOver
                      ? t('photos.dropHere')
                      : t('photos.dragOrClick')}
                </Text>
                <Text size="xs" c="dimmed">
                  {compressTargetKB > 0
                    ? t('photos.hintCompressed', { kb: compressTargetKB })
                    : t('photos.hint', { max: maxFileSizeMB })}
                </Text>
              </Stack>
            )}
          </FileButton>
        </Box>
      )}

      {/* Mobile: floating camera FAB (only when not externally managed) */}
      {showUpload && editable && uploadControl === 'auto' && isMobile && !externalCamera && (
        <Affix position={{ bottom: 80, right: 20 }} zIndex={100}>
          <ActionIcon
            size={56}
            radius="xl"
            variant="filled"
            onClick={openCamera}
            loading={uploading}
            style={{ boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)' }}
          >
            <IconCamera size={24} />
          </ActionIcon>
        </Affix>
      )}

      {/* Queued photos — the record already carries them; only the bytes are
          still on the device. Surfaced as a line the operator can act on, so a
          photo waiting on signal is visible rather than a silent debt. */}
      {showGrid && pendingCount > 0 && (
        <Group gap="xs" justify="space-between" wrap="nowrap" px={isMobile ? 4 : 0}>
          <Group gap={6} wrap="nowrap">
            <IconCloudUpload size={14} color="var(--mantine-color-orange-6)" />
            <Text size="xs" c="dimmed">
              {t('photos.pendingCount', { count: pendingCount })}
            </Text>
          </Group>
          <Button
            size="compact-xs"
            variant="light"
            color="orange"
            loading={retrying}
            onClick={handleRetryPending}
          >
            {t('photos.retryPending')}
          </Button>
        </Group>
      )}

      {/* Image grid */}
      {showGrid &&
        (visiblePhotos.length === 0 ? (
          <Stack align="center" py="xl" gap="xs">
            <IconPhoto size={40} color="var(--mantine-color-gray-4)" />
            <Text c="dimmed" size="sm">
              {t('photos.empty')}
            </Text>
          </Stack>
        ) : (
          <SimpleGrid cols={{ base: 3, sm: 3, md: 4 }} spacing={isMobile ? 2 : 'sm'}>
            {visiblePhotos.map((photo) => {
              const queueId = pendingPhotoId(photo.url);
              const previewSrc = queueId ? pendingPreviews[queueId] : photo.url;
              return (
                <Box
                  key={photo.url}
                  pos="relative"
                  style={{
                    borderRadius: isMobile ? 2 : 'var(--mantine-radius-md)',
                    overflow: 'hidden',
                    aspectRatio: '1',
                    cursor: 'pointer',
                    ...(queueId && { outline: '2px solid var(--mantine-color-orange-5)' }),
                  }}
                  onClick={() => handlePreview(photo, previewSrc)}
                >
                  <Image
                    src={previewSrc}
                    w="100%"
                    h="100%"
                    fit="cover"
                    fallbackSrc="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'/>"
                  />
                  {queueId && (
                    <Tooltip label={t('photos.pendingBadge')} withArrow>
                      <Badge
                        color="orange"
                        variant="filled"
                        size="xs"
                        circle={isMobile}
                        leftSection={isMobile ? undefined : <IconCloudUpload size={11} />}
                        pos="absolute"
                        bottom={isMobile ? 2 : 4}
                        left={isMobile ? 2 : 4}
                        style={{ pointerEvents: 'none' }}
                      >
                        {isMobile ? <IconCloudUpload size={11} /> : t('photos.pendingBadge')}
                      </Badge>
                    </Tooltip>
                  )}
                  {/* Only queued photos get this: their bytes are on the device,
                    and it's the operator's own copy of evidence that hasn't
                    reached the server yet. An uploaded photo is already safe. */}
                  {queueId && (
                    <Tooltip label={t('photos.saveToDevice')} withArrow>
                      <ActionIcon
                        variant="filled"
                        color="dark"
                        size={isMobile ? 'xs' : 'sm'}
                        pos="absolute"
                        bottom={isMobile ? 2 : 4}
                        right={isMobile ? 2 : 4}
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleSaveToDevice(photo);
                        }}
                      >
                        <IconDeviceFloppy size={isMobile ? 10 : 12} />
                      </ActionIcon>
                    </Tooltip>
                  )}
                  {photo.takenAtDelivery && (
                    <Tooltip label={t('photos.takenAtDeliveryBadge')} withArrow>
                      <Badge
                        color="teal"
                        variant="filled"
                        size="xs"
                        circle={isMobile}
                        leftSection={isMobile ? undefined : <IconTruckDelivery size={11} />}
                        pos="absolute"
                        top={isMobile ? 2 : 4}
                        left={isMobile ? 2 : 4}
                        style={{ pointerEvents: 'none' }}
                      >
                        {isMobile ? (
                          <IconTruckDelivery size={11} />
                        ) : (
                          t('photos.takenAtDeliveryBadge')
                        )}
                      </Badge>
                    </Tooltip>
                  )}
                  {editable && (
                    <ActionIcon
                      variant="filled"
                      color="red"
                      size={isMobile ? 'xs' : 'sm'}
                      pos="absolute"
                      top={isMobile ? 2 : 4}
                      right={isMobile ? 2 : 4}
                      loading={deleting === photo.url}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isInternal) {
                          return null;
                        }
                        handleDelete(photo);
                      }}
                    >
                      <IconTrash size={isMobile ? 10 : 12} />
                    </ActionIcon>
                  )}
                </Box>
              );
            })}
          </SimpleGrid>
        ))}

      {/* Preview modal with zoom/rotate */}
      {showGrid && (
        <ImageZoomModal opened={previewOpened} onClose={closePreview} imageUrl={previewUrl ?? ''} />
      )}

      {/* Camera capture (mobile only, when not externally managed) */}
      {showUpload && uploadControl === 'auto' && isMobile && !externalCamera && (
        <CameraCapture
          opened={cameraOpened}
          onClose={closeCamera}
          onCapture={handleCapturedPhoto}
          uploading={uploading}
          marker={marker}
          userName={currentUserName}
          compressTargetKB={compressTargetKB}
          t={t}
        />
      )}
    </Stack>
  );
}

export type CaptureResult = {
  base64: string;
  timestamp: DateTimeInput;
  location?: string;
  latitude?: number;
  longitude?: number;
};

type CameraCaptureProps = {
  opened: boolean;
  onClose: () => void;

  onCapture: (result: CaptureResult) => Promise<boolean>;
  uploading: boolean;
  marker: string;
  userName?: string;

  compressTargetKB?: number;

  t: (key: any) => string;
};

type CameraView = 'camera' | 'review';

function getGeoCoords(): Promise<GeolocationCoordinates | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos.coords),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  });
}

const GEOCODE_TIMEOUT_MS = 6_000;

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const fallback = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GEOCODE_TIMEOUT_MS);
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=0`,
      { signal: controller.signal },
    );
    if (!res.ok) return fallback;
    const data = await res.json();
    return data.display_name ?? fallback;
  } catch {
    return fallback;
  } finally {
    clearTimeout(timer);
  }
}

function drawOverlay(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, lines: string[]) {
  if (lines.length === 0) return;

  const fontSize = Math.max(16, canvas.width * 0.025);
  ctx.font = `${fontSize}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  const padding = fontSize * 0.5;
  const lineHeight = fontSize * 1.3;
  const maxWidth = Math.max(...lines.map((l) => ctx.measureText(l).width));
  const totalHeight = lines.length * lineHeight + padding * 2;

  const x = padding;
  const y = canvas.height - totalHeight - padding;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(x, y, maxWidth + padding * 2, totalHeight);

  ctx.fillStyle = 'white';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = 2;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;

  lines.forEach((line, i) => {
    ctx.fillText(line, x + padding, y + padding + i * lineHeight);
  });

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

function compressImage(
  base64: string,
  { targetKB = 500, maxDim = 2048, minQuality = 0.5 } = {},
): Promise<string> {
  return new Promise((resolve) => {
    const img = document.createElement('img');
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64);
        return;
      }

      let { width, height } = img;
      const max = Math.max(width, height);
      if (max > maxDim) {
        const scale = maxDim / max;
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      const targetBytes = targetKB * 1024;
      let quality = 0.85;
      let result = canvas.toDataURL('image/jpeg', quality);

      while (result.length * 0.75 > targetBytes && quality > minQuality) {
        quality -= 0.05;
        result = canvas.toDataURL('image/jpeg', quality);
      }

      resolve(result);
    };
    img.src = base64;
  });
}

async function compressImageFile(
  file: File,
  {
    targetKB = 500,
    maxDim = 2048,
    minQuality = 0.5,
  }: { targetKB?: number; maxDim?: number; minQuality?: number } = {},
): Promise<File> {
  if (targetKB <= 0) return file;
  if (file.type === 'image/gif') return file;
  if (file.size <= targetKB * 1024) return file;

  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  const compressed = await compressImage(base64, { targetKB, maxDim, minQuality });
  const blob = await (await fetch(compressed)).blob();
  const dotIdx = file.name.lastIndexOf('.');
  const baseName = dotIdx > 0 ? file.name.slice(0, dotIdx) : file.name;
  return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' });
}

export function CameraCapture({
  opened,
  onClose,
  onCapture,
  uploading,
  marker,
  userName,
  compressTargetKB = 500,
  t,
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState(false);
  const [viewMode, setViewMode] = useState<CameraView>('camera');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);

  const startCamera = useCallback(async () => {
    try {
      setCameraError(false);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 2048 },
          height: { ideal: 1536 },
          facingMode: 'environment',
        },
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch {
      setCameraError(true);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [stream]);

  useEffect(() => {
    if (opened && viewMode === 'camera') {
      startCamera();
    }
    return () => {
      if (opened) stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, viewMode]);

  const captureMetaRef = useRef<Omit<CaptureResult, 'base64'>>({ timestamp: 0 });

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    const now = new Date();
    const timestamp = now.getTime();

    const overlayLines: string[] = [];
    if (marker) overlayLines.push(marker);
    if (userName) overlayLines.push(userName);
    overlayLines.push(now.toLocaleString());

    let location: string | undefined;
    let latitude: number | undefined;
    let longitude: number | undefined;

    setLoadingLocation(true);
    try {
      const coords = await getGeoCoords();
      if (coords) {
        latitude = coords.latitude;
        longitude = coords.longitude;
        location = await reverseGeocode(latitude, longitude);

        if (location) {
          let line = '';
          let count = 0;
          for (const word of location.split(' ')) {
            count += word.length + 1;
            if (count < 40) {
              line += `${word} `;
            } else {
              overlayLines.push(line.trim());
              line = `${word} `;
              count = word.length;
            }
          }
          if (line.trim()) overlayLines.push(line.trim());
        }
      }
    } finally {
      setLoadingLocation(false);
    }

    drawOverlay(ctx, canvas, overlayLines);

    const raw = canvas.toDataURL('image/jpeg', 0.85);
    const base64 =
      compressTargetKB > 0 ? await compressImage(raw, { targetKB: compressTargetKB }) : raw;

    captureMetaRef.current = { timestamp, location, latitude, longitude };

    setCapturedPhoto(base64);
    setViewMode('review');
    stopCamera();
  }, [stopCamera, marker, userName, compressTargetKB]);

  const handleClose = useCallback(() => {
    stopCamera();
    setCapturedPhoto(null);
    setCameraError(false);
    setViewMode('camera');
    onClose();
  }, [stopCamera, onClose]);

  const retakePhoto = useCallback(() => {
    setCapturedPhoto(null);
    setViewMode('camera');
  }, []);

  const saveToDevice = useCallback(async () => {
    if (!capturedPhoto) return;
    const safeMarker = marker.replace(/[^a-zA-Z0-9._-]/g, '_') || 'photo';
    const fileName = `${safeMarker}-${Date.now()}.jpg`;
    try {
      const file = await captureResultToFile(capturedPhoto, fileName);
      const result = await shareOrDownloadFile(file, fileName, 'image/jpeg');
      if (result !== 'cancelled') {
        notifications.show({ color: 'green', message: t('photos.savedToDevice') });
      }
    } catch {
      notifications.show({ color: 'red', message: t('photos.saveToDeviceFailed') });
    }
  }, [capturedPhoto, marker, t]);

  const acceptPhoto = useCallback(async () => {
    if (!capturedPhoto) return;
    let accepted = false;
    try {
      accepted = await onCapture({
        base64: capturedPhoto,
        ...captureMetaRef.current,
      });
    } catch {
      accepted = false;
    }

    if (!accepted) return;
    setCapturedPhoto(null);
    setViewMode('camera');
  }, [capturedPhoto, onCapture]);

  if (!opened) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        backgroundColor: 'black',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Loading location overlay */}
      {loadingLocation && (
        <Center
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 10000,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
          }}
        >
          <Box ta="center" p="md">
            <Loader color="white" size="xl" />
            <Text c="white" size="sm" mt="sm">
              {t('photos.loadingLocation')}
            </Text>
          </Box>
        </Center>
      )}

      {/* Camera view */}
      {viewMode === 'camera' && !cameraError && (
        <div style={{ flex: 1, position: 'relative', backgroundColor: 'black' }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />

          {/* Close */}
          <Button
            pos="absolute"
            top={16}
            right={16}
            size="md"
            variant="subtle"
            color="white"
            onClick={handleClose}
            styles={{ root: { backgroundColor: 'rgba(0, 0, 0, 0.5)', color: 'white' } }}
          >
            <IconX size={20} />
          </Button>

          {/* Capture */}
          <Button
            pos="absolute"
            bottom={32}
            left="50%"
            style={{ transform: 'translateX(-50%)' }}
            size="xl"
            radius="xl"
            color="white"
            variant="filled"
            leftSection={<IconCamera size={28} />}
            onClick={capturePhoto}
            styles={{ root: { backgroundColor: 'rgba(255, 255, 255, 0.9)', color: 'black' } }}
          >
            {t('photos.capture')}
          </Button>
        </div>
      )}

      {/* Review view */}
      {viewMode === 'review' && capturedPhoto && (
        <>
          <div style={{ flex: 1, position: 'relative', backgroundColor: 'black' }}>
            <Image
              src={capturedPhoto}
              alt="Captured"
              fit="contain"
              style={{ width: '100%', height: '100%' }}
            />

            <Button
              pos="absolute"
              top={16}
              left={16}
              size="md"
              variant="subtle"
              color="white"
              onClick={handleClose}
              styles={{ root: { backgroundColor: 'rgba(0, 0, 0, 0.5)', color: 'white' } }}
            >
              <IconX size={20} />
            </Button>
          </div>

          {/* Action buttons */}
          <Group
            p="md"
            justify="center"
            gap="md"
            wrap="nowrap"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
          >
            <Button
              size="lg"
              variant="outline"
              color="red"
              leftSection={<IconRotate size={20} />}
              onClick={retakePhoto}
              disabled={uploading}
              styles={{ root: { borderColor: 'white', color: 'white' } }}
            >
              {t('photos.retake')}
            </Button>
            {/* The operator's own copy. Offered on every capture, not only on
                failure: the moment they'd want it is before they know whether
                the upload will work, and this is the last screen that still
                holds the bytes. Must run straight off the tap — Web Share
                needs the transient activation. */}
            <Button
              size="lg"
              variant="outline"
              leftSection={<IconDeviceFloppy size={20} />}
              onClick={saveToDevice}
              disabled={uploading}
              styles={{ root: { borderColor: 'white', color: 'white' } }}
            >
              {t('photos.saveToDevice')}
            </Button>
            <Button
              size="lg"
              variant="filled"
              color="green"
              leftSection={uploading ? <Loader size={20} color="white" /> : <IconCheck size={20} />}
              onClick={acceptPhoto}
              disabled={uploading}
            >
              {uploading ? t('photos.uploading') : t('photos.keep')}
            </Button>
          </Group>
        </>
      )}

      {/* Camera error */}
      {cameraError && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Button
            pos="absolute"
            top={16}
            left={16}
            size="md"
            variant="subtle"
            color="white"
            onClick={handleClose}
            styles={{ root: { backgroundColor: 'rgba(0, 0, 0, 0.5)', color: 'white' } }}
          >
            <IconX size={20} />
          </Button>
          <Stack align="center" gap="md">
            <IconCamera size={48} color="white" />
            <Text c="white" ta="center" size="lg">
              {t('photos.permissionDenied')}
            </Text>
            <Button onClick={startCamera} leftSection={<IconCamera size={16} />} size="lg">
              {t('photos.tryAgain')}
            </Button>
          </Stack>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}
