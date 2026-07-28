import { Anchor, Group, Text, Tooltip, type MantineSize } from '@mantine/core';
import { IconMapPin } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { device } from '@credo/base-ui/utils';

const isMobile = device.isMobile;

type AddressWithMapLinkProps = {
  readonly address?: string | null;

  readonly googleMapUrl?: string | null;

  readonly fallback?: string;

  readonly size?: MantineSize;

  readonly fw?: number;
};

export function AddressWithMapLink({
  address,
  googleMapUrl,
  fallback = '-',
  size = 'sm',
  fw,
}: AddressWithMapLinkProps) {
  const { t } = useTranslation();
  const mapLink = googleMapUrl ? (
    <Anchor
      href={googleMapUrl}
      target="_blank"
      rel="noopener noreferrer"
      size="xs"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
    >
      <IconMapPin size={14} />
      {t('__new__.01-common.actions.openInMaps')}
    </Anchor>
  ) : null;
  return (
    <Group gap="xs" align="center" wrap="nowrap" justify="flex-start">
      <Text size={size} fw={fw} style={{ minWidth: 0, textAlign: 'left' }}>
        {address || fallback}
      </Text>
      {mapLink ? (
        isMobile ? (
          mapLink
        ) : (
          <Tooltip label={t('__new__.01-common.hints.openInMaps')}>{mapLink}</Tooltip>
        )
      ) : null}
    </Group>
  );
}
