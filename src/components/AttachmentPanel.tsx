import {
  ActionIcon,
  Box,
  Button,
  Center,
  Group,
  Image,
  Loader,
  Modal,
  Stack,
  Text,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconCamera,
  IconClipboard,
  IconFile,
  IconFileTypePdf,
  IconMinus,
  IconPhoto,
  IconPlus,
  IconTrash,
  IconUpload,
} from '@tabler/icons-react';
import Cropper from 'react-easy-crop';
import type { Area, Point } from 'react-easy-crop';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { dolgaConnector } from '@credo/connectors/connector';
import { deleteMedia } from '@/utils/mediaStorage';
import { r2Connector } from '@credo/connectors/connector';
import { device } from '@credo/base-ui/utils';
import { formatDateTime } from '@/utils/dateFormat';
import { captureScreenshot, createCroppedImage, blobToScreenshotFile } from '@/utils/screenshot';
import { ImageZoomModal } from './ImageZoomModal';
import type { DateTimeInput } from '@credo/kits/types';

const isMobile = device.isMobile;

export type AttachmentEntry = {
  url: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  timestamp: DateTimeInput;
  userId?: string;
  userName?: string;
  isDeleted?: boolean;
};

type AttachmentPanelProps = {
  attachments: AttachmentEntry[];
  onChange: (attachments: AttachmentEntry[]) => Promise<void>;
  imageDirectory: string;
  editable?: boolean;
  maxFileSizeMB?: number;
  currentUserId?: string;
  currentUserName?: string;
  
  onClaimFiles?: (files: File[]) => File[];
  
  claimHint?: string;
};

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(contentType: string) {
  if (contentType === 'application/pdf') return IconFileTypePdf;
  if (contentType.startsWith('image/')) return IconPhoto;
  return IconFile;
}

function isImageType(contentType: string) {
  return contentType.startsWith('image/');
}

export function AttachmentPanel({
  attachments,
  onChange,
  imageDirectory,
  editable = true,
  maxFileSizeMB = 10,
  currentUserId,
  currentUserName,
  onClaimFiles,
  claimHint,
}: AttachmentPanelProps) {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewOpened, { open: openPreview, close: closePreview }] = useDisclosure(false);
  const [screenshotOpened, { open: openScreenshot, close: closeScreenshot }] = useDisclosure(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const dragCounterRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const visibleAttachments = attachments.filter((a) => !a.isDeleted);

  const handleUpload = useCallback(
    async (files: File[]) => {
      if (!files.length) return;

      
      
      const remaining = onClaimFiles ? onClaimFiles(files) : files;
      if (!remaining.length) return;

      const maxBytes = maxFileSizeMB * 1024 * 1024;
      const validFiles = remaining.filter((f) => {
        if (!ACCEPTED_TYPES.includes(f.type)) {
          notifications.show({
            color: 'red',
            message: t('attachments.invalidType', { name: f.name }),
          });
          return false;
        }
        if (f.size > maxBytes) {
          notifications.show({
            color: 'red',
            message: t('attachments.tooLarge', { name: f.name, max: maxFileSizeMB }),
          });
          return false;
        }
        return true;
      });

      if (!validFiles.length) return;

      setUploading(true);
      try {
        const newEntries: AttachmentEntry[] = [];

        for (const file of validFiles) {
          const ts = Date.now();
          const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
          const fileName = `${ts}-${safeName}`;

          const presignRes = await dolgaConnector.mediaUploadUrl({
            imageDirectory,
            fileName,
          });

          if (!presignRes.uploadUrl) {
            notifications.show({
              color: 'red',
              message: t('attachments.uploadError', { name: file.name }),
            });
            continue;
          }

          const uploadRes = await r2Connector.uploadImage({
            uploadUrl: presignRes.uploadUrl,
            fileContent: file,
            contentType: file.type,
          });

          if (!uploadRes.success || !presignRes.fileUrl) {
            notifications.show({
              color: 'red',
              message: t('attachments.uploadError', { name: file.name }),
            });
            continue;
          }

          newEntries.push({
            url: presignRes.fileUrl,
            fileName: file.name,
            fileSize: file.size,
            contentType: file.type,
            timestamp: Date.now(),
            ...(currentUserId && { userId: currentUserId }),
            ...(currentUserName && { userName: currentUserName }),
          });
        }

        if (newEntries.length > 0) {
          await onChange([...attachments, ...newEntries]);
          notifications.show({
            color: 'green',
            message: t('attachments.uploadSuccess', { count: newEntries.length }),
          });
        }
      } catch {
        notifications.show({ color: 'red', message: t('attachments.uploadError', { name: '' }) });
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [
      attachments,
      onChange,
      imageDirectory,
      maxFileSizeMB,
      t,
      currentUserId,
      currentUserName,
      onClaimFiles,
    ],
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        handleUpload(Array.from(e.target.files));
      }
    },
    [handleUpload],
  );

  const handleScreenshotFile = useCallback(
    async (file: File) => {
      await handleUpload([file]);
      closeScreenshot();
    },
    [handleUpload, closeScreenshot],
  );

  
  
  
  
  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
    if (dragCounterRef.current === 0) setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;
      setIsDragging(false);
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        handleUpload(Array.from(files));
        e.dataTransfer.clearData();
      }
    },
    [handleUpload],
  );

  const handleDelete = useCallback(
    async (attachment: AttachmentEntry) => {
      const updated = attachments.map((a) =>
        a.url === attachment.url ? { ...a, isDeleted: true } : a,
      );
      await onChange(updated);
      deleteMedia(attachment.url);
    },
    [attachments, onChange],
  );

  return (
    <Stack gap="sm" p="sm">
      {/* Upload buttons + drop zone (desktop only) */}
      {editable && !isMobile && (
        <Box
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          p="md"
          style={{
            border: `2px dashed var(--mantine-color-${isDragging ? 'blue-5' : 'gray-3'})`,
            borderRadius: 'var(--mantine-radius-md)',
            backgroundColor: isDragging ? 'var(--mantine-color-blue-0)' : undefined,
            transition: 'border-color 150ms, background-color 150ms',
          }}
        >
          <Stack>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPTED_TYPES.join(',')}
              onChange={handleFileInputChange}
              style={{ display: 'none' }}
            />
            <Group gap="xs">
              <Button
                variant="light"
                size="sm"
                leftSection={uploading ? <Loader size={14} /> : <IconUpload size={14} />}
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? t('attachments.uploading') : t('attachments.upload')}
              </Button>
              <Button
                variant="light"
                size="sm"
                leftSection={<IconCamera size={14} />}
                disabled={uploading}
                onClick={openScreenshot}
              >
                {t('attachments.screenshot')}
              </Button>
            </Group>
            <Text size="xs" c={isDragging ? 'blue.7' : 'dimmed'} fw={isDragging ? 600 : undefined}>
              {isDragging
                ? t('attachments.dropHere')
                : t('attachments.hint', { max: maxFileSizeMB })}
            </Text>
            {claimHint && !isDragging && (
              <Text size="xs" c="dimmed">
                {claimHint}
              </Text>
            )}
          </Stack>
        </Box>
      )}

      {/* Attachment list */}
      {visibleAttachments.length === 0 ? (
        <Stack align="center" py="xl" gap="xs">
          <IconFile size={40} color="var(--mantine-color-gray-4)" />
          <Text c="dimmed" size="sm">
            {t('attachments.empty')}
          </Text>
        </Stack>
      ) : (
        <Stack gap={4}>
          {visibleAttachments.map((att) => {
            const FileIcon = getFileIcon(att.contentType);
            const canPreview = isImageType(att.contentType);

            return (
              <Box
                key={att.url}
                px="sm"
                py="xs"
                style={{
                  borderRadius: 'var(--mantine-radius-sm)',
                  border: '1px solid var(--mantine-color-gray-2)',
                  cursor: canPreview ? 'pointer' : undefined,
                }}
                onClick={
                  canPreview
                    ? () => {
                        setPreviewUrl(att.url);
                        openPreview();
                      }
                    : undefined
                }
              >
                <Group justify="space-between" wrap="nowrap" gap="xs">
                  <Group gap="xs" style={{ flex: 1, minWidth: 0 }}>
                    {canPreview ? (
                      <Image
                        src={att.url}
                        w={36}
                        h={36}
                        fit="cover"
                        radius="sm"
                        style={{ flexShrink: 0 }}
                      />
                    ) : (
                      <FileIcon
                        size={20}
                        color="var(--mantine-color-gray-6)"
                        style={{ flexShrink: 0 }}
                      />
                    )}
                    <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
                      <Text size="xs" fw={500} truncate>
                        {att.fileName}
                      </Text>
                      <Group gap="xs">
                        <Text size="xs" c="dimmed">
                          {formatFileSize(att.fileSize)}
                        </Text>
                        {att.userName && (
                          <>
                            <Text size="xs" c="dimmed">
                              ·
                            </Text>
                            <Text size="xs" c="dimmed">
                              {att.userName}
                            </Text>
                          </>
                        )}
                        <Text size="xs" c="dimmed">
                          ·
                        </Text>
                        <Text size="xs" c="dimmed" ff="monospace">
                          {formatDateTime(att.timestamp)}
                        </Text>
                      </Group>
                    </Stack>
                  </Group>
                  <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
                    {!canPreview && (
                      <ActionIcon
                        variant="subtle"
                        size="sm"
                        component="a"
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                      >
                        <IconFile size={14} />
                      </ActionIcon>
                    )}
                    {editable && (
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(att);
                        }}
                      >
                        <IconTrash size={14} />
                      </ActionIcon>
                    )}
                  </Group>
                </Group>
              </Box>
            );
          })}
        </Stack>
      )}

      {/* Image preview */}
      <ImageZoomModal opened={previewOpened} onClose={closePreview} imageUrl={previewUrl ?? ''} />

      {/* Screenshot paste modal (desktop only) */}
      {!isMobile && (
        <ScreenshotCropModal
          opened={screenshotOpened}
          onClose={closeScreenshot}
          onConfirm={handleScreenshotFile}
          uploading={uploading}
          t={t}
        />
      )}
    </Stack>
  );
}

type ScreenshotCropModalProps = {
  opened: boolean;
  onClose: () => void;
  onConfirm: (file: File) => Promise<void>;
  uploading: boolean;
  
  t: (key: any, opts?: any) => string;
};

function ScreenshotCropModal({
  opened,
  onClose,
  onConfirm,
  uploading,
  t,
}: ScreenshotCropModalProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  const resetState = useCallback(() => {
    setImageSrc(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setIsProcessing(false);
    setIsCapturing(false);
  }, []);

  

  useEffect(() => {
    
    if (!opened) resetState();
  }, [opened, resetState]);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  
  const handleCapture = useCallback(async () => {
    try {
      setIsCapturing(true);
      const dataUrl = await captureScreenshot();
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setImageSrc(dataUrl);
    } catch {
      // permission denied or not supported — silently ignore
    } finally {
      setIsCapturing(false);
    }
  }, []);

  
  useEffect(() => {
    if (!opened) return;
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (!file) continue;
          const reader = new FileReader();
          reader.onload = (ev) => {
            const dataUrl = ev.target?.result as string;
            if (dataUrl) {
              setCrop({ x: 0, y: 0 });
              setZoom(1);
              setImageSrc(dataUrl);
            }
          };
          reader.readAsDataURL(file);
          break;
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [opened]);

  
  const handleApply = useCallback(async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setIsProcessing(true);
    try {
      const blob = await createCroppedImage(imageSrc, croppedAreaPixels);
      const file = blobToScreenshotFile(blob);
      await onConfirm(file);
      resetState();
    } catch {
      // crop failed
    } finally {
      setIsProcessing(false);
    }
  }, [imageSrc, croppedAreaPixels, onConfirm, resetState]);

  const handleCancel = useCallback(() => {
    resetState();
    onClose();
  }, [resetState, onClose]);

  return (
    <Modal
      opened={opened}
      onClose={handleCancel}
      title={t('attachments.screenshotTitle')}
      size="xl"
      centered
    >
      <Stack gap="md">
        {imageSrc ? (
          <Text size="sm" c="dimmed">
            {t('attachments.screenshotCropHint')}
          </Text>
        ) : (
          <Text size="sm" c="dimmed">
            {t('attachments.screenshotInstruction')}
          </Text>
        )}

        {/* Crop area or empty state */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: 450,
            backgroundColor: '#333',
            borderRadius: 'var(--mantine-radius-sm)',
            overflow: 'hidden',
          }}
        >
          {imageSrc ? (
            <>
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={undefined}
                showGrid
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
              {/* Zoom controls */}
              <Group gap="xs" style={{ position: 'absolute', bottom: 16, right: 16, zIndex: 10 }}>
                <ActionIcon
                  variant="filled"
                  size="lg"
                  onClick={() => setZoom((z) => Math.max(z - 0.1, 1))}
                  disabled={zoom <= 1}
                >
                  <IconMinus size={18} />
                </ActionIcon>
                <ActionIcon
                  variant="filled"
                  size="lg"
                  onClick={() => setZoom((z) => Math.min(z + 0.1, 3))}
                  disabled={zoom >= 3}
                >
                  <IconPlus size={18} />
                </ActionIcon>
              </Group>
            </>
          ) : (
            <Center h="100%">
              <Stack align="center" gap="md">
                <IconClipboard size={40} color="var(--mantine-color-gray-5)" />
                <Group gap="md">
                  <Button
                    variant="light"
                    size="lg"
                    leftSection={<IconCamera size={20} />}
                    onClick={handleCapture}
                    loading={isCapturing}
                    disabled={isCapturing}
                    color="gray"
                  >
                    {t('attachments.screenshot')}
                  </Button>
                  <Button
                    variant="light"
                    size="lg"
                    leftSection={<IconClipboard size={20} />}
                    disabled
                    color="gray"
                  >
                    {t('attachments.screenshotPaste')}
                  </Button>
                </Group>
                <Text size="sm" c="dimmed" ta="center">
                  {t('attachments.screenshotHint')}
                </Text>
              </Stack>
            </Center>
          )}
        </div>

        {/* Action buttons */}
        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={handleCancel} disabled={isProcessing || uploading}>
            {t('__new__.01-common.actions.cancel')}
          </Button>
          <Button
            onClick={handleApply}
            disabled={!imageSrc || isProcessing}
            loading={isProcessing || uploading}
          >
            {t('attachments.upload')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
