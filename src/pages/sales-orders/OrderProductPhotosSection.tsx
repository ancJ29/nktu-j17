import { useMemo, useState } from 'react';
import { Badge, Card, Divider, Group, Image, SimpleGrid, Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { FieldLabel } from '@credo/base-ui/components';
import { ImageZoomModal } from '@/components/ImageZoomModal';
import { ProductLink } from '@/components/ProductLink';
import { useProductStore } from '@/stores/useProductStore';
import type { SalesOrderItem } from '@/types';

type Props = {
  items: ReadonlyArray<SalesOrderItem>;
};

export function OrderProductPhotosSection({ items }: Props) {
  const { t } = useTranslation();
  const products = useProductStore((s) => s.items);
  const [zoomUrl, setZoomUrl] = useState<string | null>(null);

  const productByCode = useMemo(() => {
    const m = new Map<string, (typeof products)[number]>();
    for (const p of products) m.set(p.code, p);
    return m;
  }, [products]);

  const groups = useMemo(() => {
    const seen = new Set<string>();
    const out: Array<{ code: string; name: string | undefined }> = [];
    for (const it of items) {
      const code = it.productCode;
      if (!code || seen.has(code)) continue;
      seen.add(code);
      out.push({ code, name: it.productName });
    }
    return out;
  }, [items]);

  if (groups.length === 0) {
    return (
      <Text c="dimmed" size="sm" ta="center" py="sm">
        {t('salesOrders.detail.productPhotosEmpty')}
      </Text>
    );
  }

  return (
    <>
      <Stack gap="lg">
        {groups.map((g, idx) => {
          const product = productByCode.get(g.code);
          const images = product?.extra?.images ?? [];
          return (
            <Stack key={g.code} gap="xs">
              {idx > 0 && <Divider />}
              <Group justify="space-between" wrap="nowrap" gap="xs">
                <FieldLabel size="sm" lts={0.5}>
                  <ProductLink code={g.code} name={g.name} />
                </FieldLabel>
                {images.length > 0 && (
                  <Badge size="sm" variant="light" color="gray">
                    {images.length}
                  </Badge>
                )}
              </Group>
              {images.length === 0 ? (
                <Text c="dimmed" size="sm" fs="italic">
                  {t('salesOrders.detail.productPhotosEmptyForProduct')}
                </Text>
              ) : (
                <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="sm">
                  {images.map((img, i) => (
                    <Card
                      key={`${img.url}-${i}`}
                      withBorder
                      padding={0}
                      radius="md"
                      style={{ cursor: 'zoom-in', overflow: 'hidden', aspectRatio: '1 / 1' }}
                      onClick={() => setZoomUrl(img.url)}
                    >
                      <Image
                        src={img.url}
                        alt={`${g.name ?? g.code} ${i + 1}`}
                        fit="cover"
                        h="100%"
                        w="100%"
                        fallbackSrc="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 60 60'><rect width='60' height='60' fill='%23eee'/></svg>"
                      />
                    </Card>
                  ))}
                </SimpleGrid>
              )}
            </Stack>
          );
        })}
      </Stack>
      <ImageZoomModal
        opened={zoomUrl !== null}
        onClose={() => setZoomUrl(null)}
        imageUrl={zoomUrl ?? ''}
      />
    </>
  );
}
