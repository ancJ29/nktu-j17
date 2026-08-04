import { Box, Group, Image, Stack, Text, UnstyledButton } from '@mantine/core';
import { IconPhoto } from '@tabler/icons-react';
import { ImageUploadPanel } from '@/components/ImageUploadPanel';
import { ResponsiveModal } from '@/components/ResponsiveModal';
import { useAuthStore } from '@/stores/useAuthStore';
import { buildUploadFileName } from '@/utils/uploadPath';
import type { OperationLogPhoto } from '@/types';
import { visiblePhotos, type TFn } from './operationLogConfig';

type FieldProps = {
  readonly photos: OperationLogPhoto[];
  readonly onChange: (next: OperationLogPhoto[]) => void;
  readonly directory: string;
  readonly label: string;
  readonly marker: string;
  readonly t: TFn;
};

export function LogPhotoField({ photos, onChange, directory, label, marker, t }: FieldProps) {
  const authUser = useAuthStore.getState().user;
  const shown = visiblePhotos(photos);
  return (
    <Stack gap={4}>
      <Text size="sm" fw={500}>
        {shown.length > 0 ? `${label} (${shown.length})` : label}
      </Text>
      <ImageUploadPanel
        section={shown.length > 0 ? 'all' : 'upload'}
        uploadControl="button"
        uploadButtonLabel={t('operationLogs.photos.add')}
        images={photos}

        onChange={async (next) => onChange(next as OperationLogPhoto[])}
        imageDirectory={directory}
        buildFileName={buildUploadFileName}
        marker={marker}
        currentUserId={authUser?.email}
        currentUserName={authUser?.name}
      />
    </Stack>
  );
}

type CellProps = {
  readonly photos: OperationLogPhoto[] | undefined;
  readonly onOpen: () => void;
  readonly t: TFn;
};

export function LogPhotoCell({ photos, onOpen, t }: CellProps) {
  const shown = visiblePhotos(photos);
  if (shown.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        —
      </Text>
    );
  }
  return (
    <UnstyledButton onClick={onOpen} aria-label={t('operationLogs.photos.view')}>
      <Group gap={6} wrap="nowrap">
        <Box
          style={{
            width: 34,
            height: 34,
            borderRadius: 'var(--mantine-radius-sm)',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          <Image
            src={shown[0].url}
            w="100%"
            h="100%"
            fit="cover"
            fallbackSrc="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'/>"
          />
        </Box>
        {shown.length > 1 && (
          <Text size="xs" c="dimmed">
            +{shown.length - 1}
          </Text>
        )}
      </Group>
    </UnstyledButton>
  );
}

type GalleryProps = {
  readonly opened: boolean;
  readonly onClose: () => void;
  readonly photos: OperationLogPhoto[] | undefined;
  readonly title: string;
  readonly t: TFn;
};

export function LogPhotoGalleryModal({ opened, onClose, photos, title, t }: GalleryProps) {
  const shown = visiblePhotos(photos);
  return (
    <ResponsiveModal opened={opened} onClose={onClose} title={title} size="lg">
      {shown.length === 0 ? (
        <Stack align="center" py="xl" gap="xs">
          <IconPhoto size={40} color="var(--mantine-color-gray-4)" />
          <Text c="dimmed" size="sm">
            {t('photos.empty')}
          </Text>
        </Stack>
      ) : (
        <ImageUploadPanel
          section="grid"
          images={shown}
          onChange={async () => {}}
          imageDirectory=""
          editable={false}
          marker=""
        />
      )}
    </ResponsiveModal>
  );
}
