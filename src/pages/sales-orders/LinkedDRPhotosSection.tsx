import { useEffect, useMemo, useState } from 'react';
import { Anchor, Center, Group, Loader, Stack, Text } from '@mantine/core';
import { IconTruckDelivery } from '@tabler/icons-react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { cMngtConnector } from '@credo/connectors/connector';
import type { DeliveryRequest, DeliveryRequestExtra } from '@/types';
import { ROUTES } from '@/constants/routes';
import { ImageUploadPanel } from '@/components/ImageUploadPanel';

type Props = {
  
  ids: ReadonlyArray<string>;
};

const noop = async () => {};

export function LinkedDRPhotosSection({ ids }: Props) {
  const { t } = useTranslation();
  const [drs, setDRs] = useState<DeliveryRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  
  
  const idsKey = useMemo(() => Array.from(new Set(ids)).sort().join(','), [ids]);

  useEffect(() => {
    if (!idsKey) {
      
      setDRs([]);
      return;
    }
    let cancelled = false;
    setDRs(null);
    setError(null);
    cMngtConnector
      .getDeliveryRequestsByIds<DeliveryRequestExtra>({ ids: idsKey.split(',') })
      .then((res) => {
        if (cancelled) return;
        setDRs((res.deliveryRequests ?? []) as DeliveryRequest[]);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [idsKey]);

  if (!idsKey) return null;

  if (error) {
    return (
      <Text c="red" size="sm">
        {error}
      </Text>
    );
  }

  if (drs === null) {
    return (
      <Center py="md">
        <Loader size="sm" />
      </Center>
    );
  }

  const withPhotos = drs.filter((d) => (d.extra?.photos ?? []).some((p) => !p.isDeleted));

  if (withPhotos.length === 0) {
    return (
      <Text c="dimmed" size="sm" ta="center" py="sm">
        {t('photos.empty')}
      </Text>
    );
  }

  return (
    <Stack gap="lg">
      {withPhotos.map((dr) => (
        <Stack key={dr.id} gap={4}>
          <Anchor
            component={Link}
            to={ROUTES.DELIVERY.DETAIL.replace(':id', dr.id)}
            underline="hover"
            c="inherit"
          >
            <Group gap={6} wrap="nowrap" component="span" style={{ display: 'inline-flex' }}>
              <IconTruckDelivery size={14} stroke={1.75} style={{ flexShrink: 0 }} />
              <Text size="sm" fw={600} ff="monospace">
                {dr.requestNumber}
              </Text>
            </Group>
          </Anchor>
          <ImageUploadPanel
            images={dr.extra?.photos ?? []}
            onChange={noop}
            imageDirectory=""
            editable={false}
            marker={dr.requestNumber ?? ''}
            section="grid"
          />
        </Stack>
      ))}
    </Stack>
  );
}
