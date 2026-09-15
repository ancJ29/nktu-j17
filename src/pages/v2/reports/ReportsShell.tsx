import {
  Box,
  Button,
  Group,
  Paper,
  Stack,
  Text,
  ThemeIcon,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { IconArrowLeft, IconChevronRight, IconReportAnalytics } from '@tabler/icons-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { device } from '@credo/base-ui/utils';
import { ForbiddenState } from '@/components/ForbiddenState';
import { useCanAccessReports } from '@/pages/reports/reportAccess';
import type { ClientReportEntry } from './registry';

const isMobile = device.isMobile;

interface ReportRoute {
  key?: string;
  param?: string;
}

function parseHash(entries: ClientReportEntry[]): ReportRoute {
  const raw = window.location.hash.replace(/^#\/?/, '');
  if (!raw) return {};
  const [key, param] = raw.split('/');
  return entries.some((e) => e.key === key) ? { key, param: param || undefined } : {};
}

function useReportRoute(entries: ClientReportEntry[]): [ReportRoute, (r: ReportRoute) => void] {
  const [route, setRoute] = useState<ReportRoute>(() => parseHash(entries));

  useEffect(() => {
    const onHashChange = () => setRoute(parseHash(entries));
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [entries]);

  const go = useCallback((next: ReportRoute) => {
    if (!next.key) {
      window.history.pushState(null, '', window.location.pathname + window.location.search);
      setRoute({});
      return;
    }

    window.location.hash = next.param ? `${next.key}/${next.param}` : next.key;
  }, []);

  return [route, go];
}

function ReportMenu({
  entries,
  onOpen,
}: {
  entries: ClientReportEntry[];
  onOpen: (key: string) => void;
}) {
  const { t } = useTranslation();
  return (
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
        {entries.map((entry) => {
          const Icon = entry.icon;
          return (
            <UnstyledButton key={entry.key} onClick={() => onOpen(entry.key)}>
              <Paper withBorder radius="md" shadow="xs" p="md">
                <Group wrap="nowrap" gap="md">
                  <ThemeIcon size={44} radius="md" variant="light" color={entry.color}>
                    <Icon size={24} stroke={1.6} />
                  </ThemeIcon>
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Text fw={700}>{entry.title}</Text>
                    <Text size="sm" c="dimmed" lineClamp={2}>
                      {entry.desc}
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
  );
}

export default function ReportsShell({ entries }: { entries: ClientReportEntry[] }) {
  const { t } = useTranslation();
  const [route, go] = useReportRoute(entries);
  const canAccess = useCanAccessReports();

  if (!canAccess) {
    return <ForbiddenState />;
  }

  const entry = route.key ? entries.find((e) => e.key === route.key) : undefined;

  return (
    <Box p={{ base: 'xs', md: 'lg' }}>
      {!entry ? (
        <ReportMenu entries={entries} onOpen={(key) => go({ key })} />
      ) : (
        <Stack gap={isMobile ? 'sm' : 'lg'}>
          <Group>
            <Button
              variant="subtle"
              color="gray"
              size="compact-sm"
              leftSection={<IconArrowLeft size={16} />}
              onClick={() => go({})}
            >
              {t('report.back')}
            </Button>
          </Group>
          <entry.Component
            param={route.param}
            onParamChange={(param) => go({ key: entry.key, param })}
          />
        </Stack>
      )}
    </Box>
  );
}
