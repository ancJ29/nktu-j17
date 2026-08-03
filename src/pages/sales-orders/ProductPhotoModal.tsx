import { useMemo, useState } from 'react';
import { Box, Group, Image, Modal, Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { useProductStore } from '@/stores/useProductStore';

const IMAGE_FALLBACK =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 60 60'><rect width='60' height='60' fill='%23eee'/></svg>";

type Props = {
  opened: boolean;
  onClose: () => void;

  productCode: string;

  productName?: string;
};

export function ProductPhotoModal({ opened, onClose, productCode, productName }: Props) {
  const { t } = useTranslation();
  const products = useProductStore((s) => s.items);

  const [activeIndex, setActiveIndex] = useState(0);

  const images = useMemo(() => {
    const product = products.find((p) => p.code === productCode);
    return product?.extra?.images ?? [];
  }, [products, productCode]);

  const active = images[activeIndex] ?? images[0];
  const title = productName?.trim() || productCode;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      centered
      size="lg"
      title={
        <Group gap="xs" wrap="nowrap">
          <Text fw={600} lineClamp={1}>
            {title}
          </Text>
          <Text size="xs" ff="monospace" c="dimmed">
            {productCode}
          </Text>
        </Group>
      }
    >
      {images.length === 0 ? (
        <Text c="dimmed" size="sm" fs="italic" ta="center" py="lg">
          {t('salesOrders.detail.productPhotosEmptyForProduct')}
        </Text>
      ) : (
        <Stack gap="sm">
          <Image
            src={active?.url}
            alt={title}
            fit="contain"
            mah="60vh"
            fallbackSrc={IMAGE_FALLBACK}
          />
          {/* Thumbnail strip — only earns its space when there's a choice to
              make. Doubles as the photo count for the line. */}
          {images.length > 1 && (
            <Group gap="xs" wrap="wrap">
              {images.map((img, i) => (
                <Box
                  key={`${img.url}-${i}`}
                  onClick={() => setActiveIndex(i)}
                  style={{
                    width: 56,
                    height: 56,
                    cursor: 'pointer',
                    borderRadius: 6,
                    overflow: 'hidden',
                    border:
                      i === activeIndex
                        ? '2px solid var(--mantine-primary-color-filled)'
                        : '1px solid var(--mantine-color-default-border)',
                  }}
                >
                  <Image
                    src={img.url}
                    alt={`${title} ${i + 1}`}
                    w="100%"
                    h="100%"
                    fit="cover"
                    fallbackSrc={IMAGE_FALLBACK}
                  />
                </Box>
              ))}
            </Group>
          )}
        </Stack>
      )}
    </Modal>
  );
}
