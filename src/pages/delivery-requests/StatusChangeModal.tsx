import { Button, Group, Modal, Stack, Text, Textarea } from '@mantine/core';
import { IconCamera } from '@tabler/icons-react';
import { device } from '@credo/base-ui/utils';
import type { TFunction } from 'i18next';
import { MobileFilterDrawer } from '@/components/MobileFilterDrawer';
import { ImageUploadPanel, type PhotoEntry } from '@/components/ImageUploadPanel';

const isMobile = device.isMobile;

const noop = async () => {};

type StatusChangeModalProps = {
  opened: boolean;
  onClose: () => void;
  
  targetStatus: { value: string; label: string; actionLabel: string } | null;
  currentStatus: { value: string; label: string; color: string };
  note: string;
  onNoteChange: (v: string) => void;
  onConfirm: () => void;
  loading: boolean;
  
  requirePhotoCapture?: boolean;
  
  capturedPhotos?: PhotoEntry[];
  
  onCapturePhoto?: () => void;
  
  capturing?: boolean;
  t: TFunction;
};

export function StatusChangeModal({
  opened,
  onClose,
  targetStatus,
  currentStatus,
  note,
  onNoteChange,
  onConfirm,
  loading,
  requirePhotoCapture = false,
  capturedPhotos = [],
  onCapturePhoto,
  capturing = false,
  t,
}: StatusChangeModalProps) {
  if (!targetStatus) return null;
  const title = t('deliveryRequests.statusChange.confirmTitle');
  const photoMissing = requirePhotoCapture && capturedPhotos.length === 0;
  const body = (
    <Stack gap="md">
      <Text size="sm">
        {t('deliveryRequests.statusChange.confirmMessage', {
          from: currentStatus.label,
          to: targetStatus.label,
        })}
      </Text>

      {requirePhotoCapture && (
        <Stack gap="xs">
          <Group justify="space-between" align="center">
            <Text size="sm" fw={500}>
              {t('deliveryRequests.statusChange.photoSectionTitle')}
            </Text>
            <Button
              size="compact-sm"
              variant="light"
              leftSection={<IconCamera size={14} />}
              onClick={onCapturePhoto}
              loading={capturing}
            >
              {t('deliveryRequests.statusChange.takePhotoButton')}
            </Button>
          </Group>
          {capturedPhotos.length > 0 ? (
            <ImageUploadPanel
              images={capturedPhotos}
              onChange={noop}
              imageDirectory=""
              editable={false}
              marker=""
              section="grid"
            />
          ) : (
            <Text size="xs" c="dimmed">
              {t('deliveryRequests.statusChange.photoRequiredHint')}
            </Text>
          )}
        </Stack>
      )}

      <Textarea
        label={t('deliveryRequests.statusChange.noteLabel')}
        placeholder={t('deliveryRequests.statusChange.notePlaceholder')}
        value={note}
        onChange={(e) => onNoteChange(e.currentTarget.value)}
        autosize
        minRows={2}
      />
      <Group justify="flex-end" gap="sm">
        <Button variant="default" size="sm" onClick={onClose} disabled={loading}>
          {t('__new__.01-common.actions.cancel')}
        </Button>
        <Button size="sm" loading={loading} disabled={photoMissing} onClick={onConfirm}>
          {targetStatus.actionLabel}
        </Button>
      </Group>
    </Stack>
  );

  if (isMobile) {
    return (
      <MobileFilterDrawer opened={opened} onClose={onClose} title={title} height="auto">
        {body}
      </MobileFilterDrawer>
    );
  }

  return (
    <Modal opened={opened} onClose={onClose} title={title} size="sm">
      {body}
    </Modal>
  );
}
