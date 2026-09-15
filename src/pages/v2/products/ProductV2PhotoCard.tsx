/**
 * Product photos, on the detail page.
 *
 * The record already exists here, so a change persists the moment it is made
 * and there is no draft folder to clean up afterwards
 * ([photo-upload.md §3](../../../../docs/guidelines/photo-upload.md)). The bytes
 * are KEPT media — a photo is part of the product, not evidence about a dated
 * event — so the directory comes from `buildUploadDirectory`, which buries the
 * date under a `{type}` segment where no retention sweep can address it (§1).
 *
 * The `type` segment is `product`, shared with the v1 register: same retention
 * class, same meaning, and the id segment already separates the two.
 */

import { notifications } from '@mantine/notifications';
import { IconPhoto } from '@tabler/icons-react';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ImageUploadPanel, type PhotoEntry } from '@/components/ImageUploadPanel';
import { SectionCard } from '@/components/SectionCard';
import { useMyEmployee } from '@/hooks';
import { useProductV2Store } from '@/stores/useProductV2Store';
import { writePhotosWithConflictRetry } from '@/utils/photoPersist';
import { perms } from '@/utils/permission';
import { buildUploadDirectory, buildUploadFileName } from '@/utils/uploadPath';
import type { ProductV2Row } from '@/types';

/** Uploading is its own capability — reading the register is enough to SEE. */
const canUploadPhoto = perms.product.canUploadPhoto();

const entriesOf = (row: ProductV2Row): PhotoEntry[] =>
  (row.extra?.images ?? []).map((image) => ({ url: image.url, timestamp: '' }));

export function ProductV2PhotoCard({ row }: { readonly row: ProductV2Row }) {
  const { t } = useTranslation();
  const me = useMyEmployee();
  const images = useMemo(() => entriesOf(row), [row]);

  /**
   * Never swallows: by the time this runs the bytes are in R2, so a lost record
   * write is an orphaned blob the operator cannot see. A throw is what lets the
   * panel say so instead of showing a green toast over a product with no photo.
   */
  const handleChange = useCallback(
    async (next: PhotoEntry[]) => {
      const { rebased } = await writePhotosWithConflictRetry<ProductV2Row, PhotoEntry>({
        record: row,
        next,
        getPhotos: entriesOf,
        save: (record, photos) =>
          useProductV2Store.getState().updateSafely({
            id: record.id,
            version: record.version,
            patch: {
              extra: {
                ...record.extra,
                images: photos.filter((photo) => !photo.isDeleted).map(({ url }) => ({ url })),
              },
            },
          }),
      });
      if (rebased) {
        notifications.show({ color: 'yellow', message: t('photos.updatedElsewhere') });
      }
    },
    [row, t],
  );

  return (
    <SectionCard icon={<IconPhoto size={14} />} title={t('productsV2.photos.title')} padding="md">
      <ImageUploadPanel
        images={images}
        onChange={handleChange}
        editable={canUploadPhoto}
        imageDirectory={buildUploadDirectory({ type: 'product', id: row.id })}
        buildFileName={buildUploadFileName}
        marker={row.name || row.code}
        currentUserId={me?.id}
        currentUserName={me?.name}
      />
    </SectionCard>
  );
}
