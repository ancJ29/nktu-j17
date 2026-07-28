import {
  Box,
  Button,
  Container,
  Group,
  Paper,
  Stack,
  Text,
  ThemeIcon,
  Title,
  UnstyledButton,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconCalendarStats,
  IconCalendarWeek,
  IconChevronRight,
  IconReportAnalytics,
  IconTruckDelivery,
  type TablerIcon,
} from '@tabler/icons-react';
import type { TFunction } from 'i18next';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { device } from '@credo/base-ui/utils';
import DeliveryReportView from './reports/DeliveryReportView';
import SalesReportView from './reports/SalesReportView';
import { useEmployeeStore } from '@/stores/useEmployeeStore';
import { getCurrentEmployeeId } from '@/hooks/useCurrentEmployee';
import { ForbiddenState } from '@/components/ForbiddenState';
import { useAuthStore } from '@/stores/useAuthStore';

const isMobile = device.isMobile;

type ReportView = 'menu' | 'sales-monthly' | 'sales-weekly' | 'inventory' | 'delivery';
type ReportKind = Exclude<ReportView, 'menu'>;

interface ReportRoute {
  view: ReportView;

  period?: string;
}

const KNOWN_VIEWS: ReportView[] = ['sales-monthly', 'sales-weekly', 'inventory', 'delivery'];

function typeLabels(t: TFunction, kind: ReportKind): { title: string; desc: string } {
  switch (kind) {
    case 'sales-monthly':
      return { title: t('report.types.monthly.title'), desc: t('report.types.monthly.desc') };
    case 'sales-weekly':
      return { title: t('report.types.weekly.title'), desc: t('report.types.weekly.desc') };
    case 'inventory':
      return { title: t('report.types.inventory.title'), desc: t('report.types.inventory.desc') };
    case 'delivery':
      return { title: t('report.types.delivery.title'), desc: t('report.types.delivery.desc') };
  }
}

function parseHash(): ReportRoute {
  const raw = window.location.hash.replace(/^#\/?/, '');
  if (!raw) return { view: 'menu' };
  const [view, period] = raw.split('/');
  return KNOWN_VIEWS.includes(view as ReportView)
    ? { view: view as ReportView, period: period || undefined }
    : { view: 'menu' };
}

function useReportRoute(): [ReportRoute, (route: ReportRoute) => void] {
  const [route, setRoute] = useState<ReportRoute>(parseHash);

  useEffect(() => {
    const onHashChange = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const go = useCallback((next: ReportRoute) => {
    if (next.view === 'menu') {
      window.history.pushState(null, '', window.location.pathname + window.location.search);
      setRoute({ view: 'menu' });
      return;
    }

    window.location.hash = next.period ? `${next.view}/${next.period}` : next.view;
  }, []);

  return [route, go];
}

interface MenuEntry {
  view: ReportKind;
  icon: TablerIcon;
  color: string;
}

const MENU: MenuEntry[] = [
  { view: 'sales-monthly', icon: IconCalendarStats, color: 'primary' },
  { view: 'sales-weekly', icon: IconCalendarWeek, color: 'teal' },

  { view: 'delivery', icon: IconTruckDelivery, color: 'grape' },
];

const MANAGER_DEPARTMENT_CODE = 'manager';

function useCanAccessReportMenu(): boolean {
  const { items: employees } = useEmployeeStore();
  const currentEmployee = useMemo(
    () =>
      getCurrentEmployeeId() ? employees.find((e) => e.id === getCurrentEmployeeId()) : undefined,
    [employees],
  );

  const isRootUser = useAuthStore((s) => !!s.user?.isRoot);
  return currentEmployee?.department === MANAGER_DEPARTMENT_CODE || isRootUser;
}

function ReportMenu({ onOpen }: { onOpen: (view: ReportKind) => void }) {
  const { t } = useTranslation();
  const canAccess = useCanAccessReportMenu();
  if (!canAccess) {
    return <ForbiddenState />;
  }

  return (
    <Box p={{ base: 'xs', md: 'lg' }}>
      <Stack gap="lg">
        <Group gap="sm" wrap="nowrap">
          <ThemeIcon size={40} radius="md" variant="light" color="primary">
            <IconReportAnalytics size={22} stroke={1.6} />
          </ThemeIcon>
          <Box>
            <Title order={3}>{t('report.menu.heading')}</Title>
            <Text size="sm" c="dimmed">
              {t('report.menu.subtitle')}
            </Text>
          </Box>
        </Group>

        <Stack gap="sm">
          {MENU.map((entry) => {
            const { title, desc } = typeLabels(t, entry.view);
            const Icon = entry.icon;
            return (
              <UnstyledButton key={entry.view} onClick={() => onOpen(entry.view)}>
                <Paper withBorder radius="md" shadow="xs" p="md">
                  <Group wrap="nowrap" gap="md">
                    <ThemeIcon size={44} radius="md" variant="light" color={entry.color}>
                      <Icon size={24} stroke={1.6} />
                    </ThemeIcon>
                    <Box style={{ flex: 1, minWidth: 0 }}>
                      <Text fw={700}>{title}</Text>
                      <Text size="sm" c="dimmed" lineClamp={2}>
                        {desc}
                      </Text>
                    </Box>
                    <IconChevronRight
                      size={20}
                      stroke={2}
                      style={{ color: 'var(--mantine-color-dimmed)', flexShrink: 0 }}
                    />
                  </Group>
                </Paper>
              </UnstyledButton>
            );
          })}
        </Stack>
      </Stack>
    </Box>
  );
}

function ReportFrame({ onBack, children }: { onBack: () => void; children: ReactNode }) {
  const { t } = useTranslation();

  const canAccess = useCanAccessReportMenu();
  if (!canAccess) {
    return <ForbiddenState />;
  }

  return (
    <Box p={{ base: 'xs', md: 'lg' }}>
      <Stack gap={isMobile ? 'sm' : 'lg'}>
        <Group>
          <Button
            variant="subtle"
            color="gray"
            size="compact-sm"
            leftSection={<IconArrowLeft size={16} />}
            onClick={onBack}
          >
            {t('report.back')}
          </Button>
        </Group>
        {children}
      </Stack>
    </Box>
  );
}

function ReportComingSoon({ kind }: { kind: ReportKind }) {
  const { t } = useTranslation();
  return (
    <Container size="sm" py="xl">
      <Stack align="center" gap="sm" py="xl">
        <ThemeIcon size={64} radius="xl" variant="light" color="gray">
          <IconReportAnalytics size={32} stroke={1.5} />
        </ThemeIcon>
        <Title order={3} ta="center">
          {typeLabels(t, kind).title}
        </Title>
        <Text size="sm" c="dimmed" ta="center" maw={360}>
          {t('report.wip.desc')}
        </Text>
      </Stack>
    </Container>
  );
}

export default function ReportPage() {
  const { t } = useTranslation();
  const [route, go] = useReportRoute();

  if (route.view === 'menu') {
    return <ReportMenu onOpen={(view) => go({ view })} />;
  }

  const kind = route.view;

  let body: ReactNode;
  if (kind === 'sales-monthly' || kind === 'sales-weekly') {
    body = (
      <SalesReportView
        title={typeLabels(t, kind).title}
        kind={kind}
        period={route.period}
        onPeriodChange={(period) => go({ view: kind, period })}
      />
    );
  } else if (kind === 'delivery') {
    body = (
      <DeliveryReportView
        title={typeLabels(t, kind).title}
        period={route.period}
        onPeriodChange={(period) => go({ view: kind, period })}
      />
    );
  } else {
    body = <ReportComingSoon kind={kind} />;
  }

  return <ReportFrame onBack={() => go({ view: 'menu' })}>{body}</ReportFrame>;
}
