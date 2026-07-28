import { appConfig, themeConfig } from '@/config';
import { stripRootOnlyNavItems } from '@/config/navigation';
import { ROUTES } from '@/constants/routes';
import { useAuthStore } from '@/stores/useAuthStore';
import { Icon, IconName } from '@credo/base-ui/components';
import type { NavigationItem } from '@/types';
import { getThemeColor } from '@credo/base-ui/utils';
import {
  Avatar,
  Box,
  Card,
  Group,
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

const ROW_HEIGHT = 56;

type NavSection = {
  id: string;

  title?: string;
  items: NavigationItem[];
};

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
  const isRoot = user?.isRoot ?? false;

  const getColor = (color: string) => getThemeColor(theme, color);
  const accentColor = getColor(`${mainColor}.7`);

  const sections = useMemo<NavSection[]>(() => {
    const visible = stripRootOnlyNavItems(appConfig.navigation.mobile, isRoot).filter(
      (item) => !item.hidden && !item.navbar,
    );

    const result: NavSection[] = [];
    for (const item of visible) {
      if (item.subs && item.subs.length > 0) {
        result.push({
          id: item.id,
          title: item.labelKey ? t(item.labelKey, item.label) : item.label,
          items: item.subs,
        });
        continue;
      }
      const last = result.at(-1);
      if (last && !last.title) last.items.push(item);
      else result.push({ id: item.id, items: [item] });
    }
    return result;
  }, [isRoot, t]);

  const userEmail = useMemo(() => {
    const email = user?.email;
    return isAutoLoginEmail(email || '') ? undefined : email;
  }, [user?.email]);

  return (
    <Stack gap="lg" pb="xl">
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

      {sections.map((section) => (
        <NavListSection key={section.id} title={section.title}>
          {section.items.map((item, index) => (
            <NavListRow
              key={item.id}
              to={item.path || '/'}
              icon={item.icon}
              label={item.labelKey ? t(item.labelKey, item.label) : item.label}
              color={accentColor}
              lastRow={index === section.items.length - 1}
            />
          ))}
        </NavListSection>
      ))}

      <NavListSection title={t('profile.account')}>
        <NavListRow
          to={ROUTES.PROFILE}
          icon={IconName.User}
          label={t('menu.profile')}
          color={accentColor}
        />
        <NavListRow
          to={ROUTES.AUTH.LOGOUT}
          icon={IconName.Logout}
          label={t('menu.logout')}
          color={getColor('red.6')}
          textColor="red.6"
          withChevron={false}
          lastRow
        />
      </NavListSection>
    </Stack>
  );
}

function NavListSection({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <Stack gap={0}>
      {title && (
        <Text size="sm" fw={600} c="dimmed" tt="uppercase" px="xs" pb={4}>
          {title}
        </Text>
      )}
      {children}
    </Stack>
  );
}

function NavListRow({
  to,
  icon,
  label,
  color,
  textColor,
  withChevron = true,
  lastRow = false,
}: {
  to: string;
  icon: IconName;
  label: string;
  color: string;
  textColor?: string;
  withChevron?: boolean;
  lastRow?: boolean;
}) {
  return (
    <UnstyledButton
      component={Link}
      to={to}
      w="100%"
      px="xs"
      style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
    >
      <Group gap="md" wrap="nowrap" align="center">
        <Icon name={icon} size={24} stroke={1.8} style={{ color, flexShrink: 0 }} />
        {/* Hairline lives on the inner box so it insets past the icon (iOS list). */}
        <Group
          gap="md"
          wrap="nowrap"
          h={ROW_HEIGHT}
          flex={1}
          style={
            lastRow ? undefined : { borderBottom: '1px solid var(--mantine-color-default-border)' }
          }
        >
          <Text size="md" c={textColor} flex={1} truncate>
            {label}
          </Text>
          {withChevron && <IconChevronRight size={20} color="var(--mantine-color-dimmed)" />}
        </Group>
      </Group>
    </UnstyledButton>
  );
}
