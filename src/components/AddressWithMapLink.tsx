import { Anchor, Group, Text, type MantineSize } from '@mantine/core';
import { IconMapPin } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

type AddressWithMapLinkProps = {
  readonly address?: string | null;
  readonly googleMapUrl?: string | null;
  readonly fallback?: string;
  readonly size?: MantineSize;
  readonly fw?: number;
  readonly maxWidth?: string;
  readonly iconLabel?: string;
};

export function AddressWithMapLink({
  address,
  googleMapUrl,
  fallback = '-',
  size = 'sm',
  fw,
  maxWidth = '100%',
  iconLabel,
}: AddressWithMapLinkProps) {
  const mapLink = googleMapUrl ? (
    <Anchor
      href={googleMapUrl}
      target="_blank"
      rel="noopener noreferrer"
      size="xs"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
    >
      <IconMapPin size={14} />
      {iconLabel}
    </Anchor>
  ) : null;
  return (
    <Group gap="xs" align="center" wrap="nowrap" justify="flex-start">
      <Text
        size={size}
        fw={fw}
        style={{
          minWidth: 0,
          textAlign: 'left',
          maxWidth,
        }}
      >
        {address || fallback}
      </Text>
      {mapLink}
    </Group>
  );
}
