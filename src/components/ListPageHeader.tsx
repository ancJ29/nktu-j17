import type { ReactNode } from 'react';
import { ActionIcon, Button, Group, Stack, Title } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { Link } from 'react-router';
import { device } from '@credo/base-ui/utils';
import { CacheStatus } from './CacheStatus';

const isMobile = device.isMobile;

type CreateCta = {
  label: string;
  
  to?: string;
  
  onClick?: () => void;
  
  mobileVariant?: 'icon' | 'hidden';
  
  enabled?: boolean;
};

type ListPageHeaderProps = {
  readonly title: string;
  readonly cachedAt: number | null;
  readonly loading: boolean;
  readonly onRefresh: () => void;
  readonly icon?: ReactNode;
  readonly subtitle?: ReactNode;
  readonly extraActions?: ReactNode;
  readonly createCta?: CreateCta;
};

export function ListPageHeader({
  title,
  cachedAt,
  loading,
  onRefresh,
  icon,
  subtitle,
  extraActions,
  createCta,
}: ListPageHeaderProps) {
  const enabled = createCta?.enabled ?? true;
  const mobileVariant = createCta?.mobileVariant ?? 'icon';
  const showCta = !!createCta && enabled && !(isMobile && mobileVariant === 'hidden');

  if (isMobile) {
    return (
      <Stack gap={2} style={{ minWidth: 0 }}>
        <Group justify="space-between" wrap="nowrap" align="flex-start">
          <Title order={4}>{title}</Title>
          <Group gap="xs" wrap="nowrap">
            <CacheStatus
              cachedAt={cachedAt}
              loading={loading}
              onRefresh={onRefresh}
              compact={true}
            />
            {showCta && createCta && renderCta(createCta)}
          </Group>
        </Group>
        {subtitle}
      </Stack>
    );
  }

  return (
    <Group justify="space-between" wrap="nowrap" align="flex-start">
      <Group gap="sm" wrap="nowrap" align="center" style={{ minWidth: 0 }}>
        {icon}
        <Stack gap={2} style={{ minWidth: 0 }}>
          <Title order={3}>{title}</Title>
          {subtitle}
        </Stack>
      </Group>
      <Group gap="xs" wrap="nowrap">
        {extraActions}
        <CacheStatus cachedAt={cachedAt} loading={loading} onRefresh={onRefresh} compact={false} />
        {showCta && createCta && renderCta(createCta)}
      </Group>
    </Group>
  );
}

function renderCta(cta: CreateCta) {
  if (isMobile) {
    
    if (cta.to) {
      return (
        <ActionIcon component={Link} to={cta.to} variant="filled" size="md">
          <IconPlus size={16} />
        </ActionIcon>
      );
    }
    return (
      <ActionIcon onClick={cta.onClick} variant="filled" size="md">
        <IconPlus size={16} />
      </ActionIcon>
    );
  }
  
  if (cta.to) {
    return (
      <Button component={Link} to={cta.to} leftSection={<IconPlus size={16} />} size="sm">
        {cta.label}
      </Button>
    );
  }
  return (
    <Button onClick={cta.onClick} leftSection={<IconPlus size={16} />} size="sm">
      {cta.label}
    </Button>
  );
}
