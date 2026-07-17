import { appConfig, themeConfig } from '@/config';
import { ROUTES } from '@/constants/routes';
import { useAuthStore } from '@/stores/useAuthStore';
import { Icon, IconName } from '@credo/base-ui/components';
import type { NavigationItem } from '@/types';
import { getThemeColor } from '@credo/base-ui/utils';
import {
  Avatar,
  Box,
  Card,
  Divider,
  Group,
  SimpleGrid,
  Stack,
  Text,
  UnstyledButton,
  useMantineTheme,
} from '@mantine/core';
import { IconChevronRight } from '@tabler/icons-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { isAutoLoginEmail } from '@/utils/loginEmail';

function getInitials(name?: string): string {
  if (!name) return '?';
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

export default function MorePage() {
  const { t } = useTranslation();
  const theme = useMantineTheme();
  const mainColor = themeConfig.mainColor;
  const user = useAuthStore((s) => s.user);

  const getColor = (color: string) => getThemeColor(theme, color);

  
  const { groups, flatItems } = useMemo(() => {
    const allMobile = appConfig.navigation.mobile.filter((item) => !item.hidden && !item.navbar);
    const groups: NavigationItem[] = [];
    const flatItems: NavigationItem[] = [];
    for (const item of allMobile) {
      if (item.subs && item.subs.length > 0) {
        groups.push(item);
      } else {
        flatItems.push(item);
      }
    }
    return { groups, flatItems };
  }, []);

  const accentColor = getColor(`${mainColor}.7`);

  const userEmail = useMemo(() => {
    const email = user?.email;
    return isAutoLoginEmail(email || '') ? undefined : email;
  }, [user?.email]);

  return (
    <Stack gap="md" pb="xl">
      {/* User Card */}
      <Card
        component={Link}
        to={ROUTES.PROFILE}
        withBorder
        radius="lg"
        padding="md"
        style={{ textDecoration: 'none', color: 'inherit' }}
      >
        <Group gap="md" wrap="nowrap">
          <Avatar
            size={48}
            radius="xl"
            color={mainColor}
            style={{
              background: `linear-gradient(135deg, ${getColor(`${mainColor}.5`)} 0%, ${getColor(`${mainColor}.7`)} 100%)`,
            }}
          >
            <Text size="md" fw={700} c="white">
              {getInitials(user?.name)}
            </Text>
          </Avatar>
          <Box style={{ flex: 1, minWidth: 0 }}>
            <Text size="sm" fw={600} truncate>
              {user?.name || '-'}
            </Text>
            {userEmail && (
              <Text size="xs" c="dimmed" truncate>
                {userEmail}
              </Text>
            )}
          </Box>
          <IconChevronRight size={18} color="var(--mantine-color-dimmed)" />
        </Group>
      </Card>

      {/* Grouped nav sections */}
      {groups.map((group) => (
        <Stack key={group.id} gap="xs">
          <Group gap="xs" px={4}>
            <Icon name={group.icon} size={16} stroke={1.8} style={{ color: accentColor }} />
            <Text size="sm" fw={600}>
              {group.labelKey ? t(group.labelKey, group.label) : group.label}
            </Text>
          </Group>
          <SimpleGrid cols={3} spacing="sm">
            {group.subs!.map((sub) => (
              <GridNavItem
                key={sub.id}
                to={sub.path || '/'}
                icon={sub.icon}
                label={sub.labelKey ? t(sub.labelKey, sub.label) : sub.label}
                color={accentColor}
              />
            ))}
          </SimpleGrid>
        </Stack>
      ))}

      {/* Ungrouped flat nav items */}
      {flatItems.length > 0 && (
        <SimpleGrid cols={3} spacing="sm">
          {flatItems.map((item) => (
            <GridNavItem
              key={item.id}
              to={item.path || '/'}
              icon={item.icon}
              label={item.labelKey ? t(item.labelKey, item.label) : item.label}
              color={accentColor}
            />
          ))}
        </SimpleGrid>
      )}

      <Divider />

      {/* Profile */}
      <SimpleGrid cols={3} spacing="sm">
        <GridNavItem
          to={ROUTES.PROFILE}
          icon={IconName.User}
          label={t('menu.profile')}
          color={accentColor}
        />
      </SimpleGrid>

      {/* Logout — fixed to bottom */}
      <Box
        px="xs"
        pb="md"
        style={{
          position: 'fixed',
          bottom: 64,
          left: 0,
          right: 0,
          zIndex: 50,
          paddingBottom: 'calc(var(--mantine-spacing-md) + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <UnstyledButton
          component={Link}
          to={ROUTES.AUTH.LOGOUT}
          w="100%"
          py="sm"
          px="md"
          style={{
            display: 'block',
            borderRadius: 'var(--mantine-radius-md)',
            border: '1px solid var(--mantine-color-red-3)',
            backgroundColor: 'var(--mantine-color-body)',
          }}
        >
          <Group justify="center" gap="xs">
            <Icon
              name={IconName.Logout}
              size={18}
              stroke={1.8}
              style={{ color: getColor('red.6') }}
            />
            <Text size="sm" fw={500} c="red.6">
              {t('menu.logout')}
            </Text>
          </Group>
        </UnstyledButton>
      </Box>
    </Stack>
  );
}

function GridNavItem({
  to,
  icon,
  label,
  color,
}: {
  to: string;
  icon: IconName;
  label: string;
  color: string;
}) {
  return (
    <UnstyledButton component={Link} to={to} style={{ textDecoration: 'none', color: 'inherit' }}>
      <Card withBorder radius="md" padding="sm" style={{ height: '100%' }}>
        <Stack align="center" gap={6}>
          <Box
            w={40}
            h={40}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 12,
              backgroundColor: 'var(--mantine-color-default-hover)',
            }}
          >
            <Icon name={icon} size={22} stroke={1.8} style={{ color }} />
          </Box>
          <Text size="xs" fw={500} ta="center" lineClamp={2}>
            {label}
          </Text>
        </Stack>
      </Card>
    </UnstyledButton>
  );
}
