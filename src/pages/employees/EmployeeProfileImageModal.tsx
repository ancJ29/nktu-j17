import {
  ActionIcon,
  Box,
  Button,
  FileButton,
  Group,
  Loader,
  Modal,
  Stack,
  Text,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconMinus, IconPlus, IconTrash, IconUpload } from '@tabler/icons-react';
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Cropper from 'react-easy-crop';
import type { Area, Point } from 'react-easy-crop';
import { dolgaConnector, r2Connector } from '@credo/connectors/connector';
import { EntityConflictError } from '@/stores/createEntityStore';
import { useEmployeeStore } from '@/stores/useEmployeeStore';
import type { Employee, EmployeeExtra } from '@/types';
import { deleteMedia } from '@/utils/mediaStorage';
import { buildUploadDirectory, buildUploadFileName } from '@/utils/uploadPath';
import { createCroppedImage } from '@/utils/screenshot';
import { EmployeeAvatar } from '@/components/EmployeeAvatar';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE_MB = 5;

type Props = {
  opened: boolean;
  onClose: () => void;
  employee: Employee;
  onUpdated: (employee: Employee) => void;
};

type View = 'select' | 'crop';

export function EmployeeProfileImageModal({ opened, onClose, employee, onUpdated }: Props) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [view, setView] = useState<View>('select');
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [originalName, setOriginalName] = useState<string>('profile.png');
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const dragDepthRef = useRef(0);
  const resetRef = useRef<() => void>(null);

  const currentUrl = employee.extra?.profileImage;

  const resetView = useCallback(() => {
    setView('select');
    setImageSrc(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  }, []);

  const handleClose = useCallback(() => {
    if (busy) return;
    resetView();
    onClose();
  }, [busy, onClose, resetView]);

  const persistUrl = useCallback(
    async (nextUrl: string | undefined) => {
      const nextExtra: EmployeeExtra = { ...employee.extra, profileImage: nextUrl };
      try {
        const updated = await useEmployeeStore.getState().updateSafely({
          id: employee.id,
          version: employee.version,
          patch: { extra: nextExtra },
        });
        onUpdated(updated);
      } catch (err) {
        if (err instanceof EntityConflictError) {
          if (err.latest) onUpdated(err.latest as Employee);
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
    [employee, onUpdated, t],
  );

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleFile = useCallback(
    (file: File | null) => {
      if (!file) return;
      if (!ACCEPTED_TYPES.includes(file.type)) {
        notifications.show({ color: 'red', message: t('photos.invalidType', { name: file.name }) });
        return;
      }
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        notifications.show({
          color: 'red',
          message: t('photos.tooLarge', { name: file.name, max: MAX_FILE_SIZE_MB }),
        });
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        if (!dataUrl) return;
        setOriginalName(file.name);
        setImageSrc(dataUrl);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setCroppedAreaPixels(null);
        setView('crop');
        resetRef.current?.();
      };
      reader.readAsDataURL(file);
    },
    [t],
  );

  const handleConfirmCrop = useCallback(async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setBusy(true);
    try {
      const blob = await createCroppedImage(imageSrc, croppedAreaPixels);
      const file = new File([blob], originalName.replace(/\.[^.]+$/, '.png'), {
        type: 'image/png',
      });
      const fileName = buildUploadFileName(file.name);
      const presign = await dolgaConnector.mediaUploadUrl({
        imageDirectory: buildUploadDirectory({ type: 'employee', id: employee.id, noDate: true }),
        fileName,
      });
      if (!presign.uploadUrl || !presign.fileUrl) {
        notifications.show({
          color: 'red',
          message: t('employees.detail.profileImageUploadError'),
        });
        return;
      }
      const uploadRes = await r2Connector.uploadImage({
        uploadUrl: presign.uploadUrl,
        fileContent: file,
        contentType: file.type,
      });
      if (!uploadRes.success) {
        notifications.show({
          color: 'red',
          message: t('employees.detail.profileImageUploadError'),
        });
        return;
      }
      
      
      const previousUrl = currentUrl;
      await persistUrl(presign.fileUrl);
      if (previousUrl !== presign.fileUrl) {
        deleteMedia(previousUrl);
      }
      notifications.show({
        color: 'green',
        message: t('employees.detail.profileImageUploadSuccess'),
      });
      resetView();
      onClose();
    } catch {
      notifications.show({
        color: 'red',
        message: t('employees.detail.profileImageUploadError'),
      });
    } finally {
      setBusy(false);
    }
  }, [
    imageSrc,
    croppedAreaPixels,
    originalName,
    employee.id,
    currentUrl,
    persistUrl,
    resetView,
    onClose,
    t,
  ]);

  const handleRemove = useCallback(async () => {
    setBusy(true);
    try {
      const previousUrl = currentUrl;
      await persistUrl(undefined);
      deleteMedia(previousUrl);
      notifications.show({
        color: 'green',
        message: t('employees.detail.profileImageRemoveSuccess'),
      });
      resetView();
      onClose();
    } catch {
      notifications.show({
        color: 'red',
        message: t('employees.detail.profileImageUploadError'),
      });
    } finally {
      setBusy(false);
    }
  }, [currentUrl, onClose, persistUrl, resetView, t]);

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={t('employees.detail.profileImageChange')}
      centered
      size={view === 'crop' ? 'lg' : 'md'}
    >
      <Stack gap="md">
        {view === 'select' && (
          <>
            <Group justify="center">
              <EmployeeAvatar
                imageUrl={currentUrl}
                name={employee.name}
                size={120}
                initialSize="48px"
                radius="100%"
              />
            </Group>

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
                if (busy) return;
                const file = e.dataTransfer.files[0];
                if (file) handleFile(file);
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
                cursor: busy ? 'not-allowed' : 'pointer',
              }}
            >
              <FileButton
                resetRef={resetRef}
                onChange={handleFile}
                accept={ACCEPTED_TYPES.join(',')}
              >
                {(props) => (
                  <Stack
                    gap={6}
                    align="center"
                    onClick={busy ? undefined : props.onClick}
                    style={{ cursor: busy ? 'not-allowed' : 'pointer' }}
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
                      <IconUpload size={20} />
                    </Box>
                    <Text size="sm" fw={600}>
                      {isDragOver
                        ? t('employees.detail.profileImageDropHere')
                        : t('employees.detail.profileImageDragOrClick')}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {t('employees.detail.profileImageHint', { max: MAX_FILE_SIZE_MB })}
                    </Text>
                  </Stack>
                )}
              </FileButton>
            </Box>

            <Group justify="space-between">
              {currentUrl ? (
                <Button
                  variant="subtle"
                  color="red"
                  size="sm"
                  leftSection={<IconTrash size={14} />}
                  onClick={handleRemove}
                  disabled={busy}
                >
                  {t('employees.detail.profileImageRemove')}
                </Button>
              ) : (
                <span />
              )}
              <Button variant="default" size="sm" onClick={handleClose} disabled={busy}>
                {t('__new__.01-common.actions.cancel')}
              </Button>
            </Group>
          </>
        )}

        {view === 'crop' && imageSrc && (
          <>
            <Text size="sm" c="dimmed">
              {t('employees.detail.profileImageCropHint')}
            </Text>
            <div
              style={{
                position: 'relative',
                width: '100%',
                height: 380,
                backgroundColor: '#222',
                borderRadius: 'var(--mantine-radius-sm)',
                overflow: 'hidden',
              }}
            >
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
              <Group gap="xs" style={{ position: 'absolute', bottom: 12, right: 12, zIndex: 10 }}>
                <ActionIcon
                  variant="filled"
                  size="lg"
                  onClick={() => setZoom((z) => Math.max(z - 0.1, 1))}
                  disabled={zoom <= 1 || busy}
                  aria-label="Zoom out"
                >
                  <IconMinus size={18} />
                </ActionIcon>
                <ActionIcon
                  variant="filled"
                  size="lg"
                  onClick={() => setZoom((z) => Math.min(z + 0.1, 3))}
                  disabled={zoom >= 3 || busy}
                  aria-label="Zoom in"
                >
                  <IconPlus size={18} />
                </ActionIcon>
              </Group>
              {busy && (
                <Box
                  pos="absolute"
                  top={0}
                  left={0}
                  right={0}
                  bottom={0}
                  style={{
                    background: 'rgba(0,0,0,0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 11,
                  }}
                >
                  <Loader color="white" />
                </Box>
              )}
            </div>
            <Group justify="space-between">
              <Button variant="default" size="sm" onClick={resetView} disabled={busy}>
                {t('employees.detail.profileImageReselect')}
              </Button>
              <Group gap="sm">
                <Button variant="default" size="sm" onClick={handleClose} disabled={busy}>
                  {t('__new__.01-common.actions.cancel')}
                </Button>
                <Button
                  size="sm"
                  onClick={handleConfirmCrop}
                  loading={busy}
                  disabled={!croppedAreaPixels}
                >
                  {t('employees.detail.profileImageUpload')}
                </Button>
              </Group>
            </Group>
          </>
        )}
      </Stack>
    </Modal>
  );
}
