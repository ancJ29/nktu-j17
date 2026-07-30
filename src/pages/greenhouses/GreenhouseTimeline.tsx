import { useCallback, useMemo, useState } from 'react';
import { ActionIcon, Box, Button, Card, Group, Text, Tooltip } from '@mantine/core';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { ROUTES } from '@/constants/routes';
import { addDays } from '@/utils/cropSchedule';
import { buildTimelineWindow, greenhouseBars, todayMarkerPct } from '@/utils/greenhouseTimeline';
import type { Crop, Greenhouse } from '@/types';

const WINDOW_WEEKS = 13;

const SHIFT_DAYS = 28;

const LABEL_WIDTH = 180;
const ROW_HEIGHT = 34;

const BAR_COLOR = {
  planned: 'var(--mantine-color-blue-4)',
  growing: 'var(--mantine-color-green-6)',
  overdue: 'var(--mantine-color-orange-5)',
} as const;

function tickLabel(date: string): string {
  return `${date.slice(8, 10)}/${date.slice(5, 7)}`;
}

type Props = {
  readonly greenhouses: Greenhouse[];
  readonly crops: Crop[];

  readonly today: string;
};

export function GreenhouseTimeline({ greenhouses, crops, today }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [start, setStart] = useState(() => addDays(today, -7) ?? today);

  const chart = useMemo(() => buildTimelineWindow(start, WINDOW_WEEKS), [start]);

  const shift = useCallback((days: number) => setStart((s) => addDays(s, days) ?? s), []);
  const resetToToday = useCallback(() => setStart(addDays(today, -7) ?? today), [today]);

  if (!chart) return null;

  const markerPct = todayMarkerPct(today, chart);

  return (
    <Card withBorder radius="md" padding="md">
      <Group justify="space-between" mb="sm">
        <Text size="sm" fw={600}>
          {tickLabel(chart.start)} – {tickLabel(chart.end)}
        </Text>
        <Group gap="xs">
          <ActionIcon variant="default" size="sm" onClick={() => shift(-SHIFT_DAYS)}>
            <IconChevronLeft size={16} />
          </ActionIcon>
          <Button variant="default" size="compact-sm" onClick={resetToToday}>
            {t('greenhouses.timeline.today')}
          </Button>
          <ActionIcon variant="default" size="sm" onClick={() => shift(SHIFT_DAYS)}>
            <IconChevronRight size={16} />
          </ActionIcon>
        </Group>
      </Group>

      {greenhouses.length === 0 ? (
        <Text size="sm" c="dimmed" ta="center" py="md">
          {t('greenhouses.noItems')}
        </Text>
      ) : (
        <Box style={{ overflowX: 'auto' }}>
          <Box style={{ minWidth: 720 }}>
            {/* Week ruler */}
            <Group gap={0} wrap="nowrap" mb={4}>
              <Box style={{ width: LABEL_WIDTH, flexShrink: 0 }} />
              <Box style={{ position: 'relative', flex: 1, height: 18 }}>
                {chart.ticks.map((tick) => (
                  <Text
                    key={tick.date}
                    size="xs"
                    c="dimmed"
                    style={{
                      position: 'absolute',
                      left: `${tick.leftPct}%`,
                      transform: 'translateX(-50%)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {tickLabel(tick.date)}
                  </Text>
                ))}
              </Box>
            </Group>

            {greenhouses.map((greenhouse) => {
              const bars = greenhouseBars(crops, greenhouse.code, chart);
              return (
                <Group key={greenhouse.id} gap={0} wrap="nowrap" style={{ height: ROW_HEIGHT }}>
                  <Box style={{ width: LABEL_WIDTH, flexShrink: 0, paddingRight: 8 }}>
                    <Text size="sm" truncate title={greenhouse.name}>
                      {greenhouse.name}
                    </Text>
                  </Box>
                  <Box
                    style={{
                      position: 'relative',
                      flex: 1,
                      height: '100%',
                      borderLeft: '1px solid var(--mantine-color-default-border)',
                    }}
                  >
                    {/* Week gridlines, behind the bars. */}
                    {chart.ticks.map((tick) => (
                      <Box
                        key={tick.date}
                        style={{
                          position: 'absolute',
                          left: `${tick.leftPct}%`,
                          top: 0,
                          bottom: 0,
                          width: 1,
                          background: 'var(--mantine-color-default-border)',
                        }}
                      />
                    ))}
                    {markerPct !== null && (
                      <Box
                        style={{
                          position: 'absolute',
                          left: `${markerPct}%`,
                          top: 0,
                          bottom: 0,
                          width: 2,
                          background: 'var(--mantine-color-red-5)',
                          opacity: 0.6,
                        }}
                      />
                    )}
                    {bars.map((bar) => {
                      const overdue =
                        bar.crop.status === 'growing' &&
                        !!bar.crop.extra?.toDate &&
                        today > bar.crop.extra.toDate;
                      const tone = overdue
                        ? BAR_COLOR.overdue
                        : bar.crop.status === 'growing'
                          ? BAR_COLOR.growing
                          : BAR_COLOR.planned;
                      return (
                        <Tooltip
                          key={bar.crop.id}
                          withArrow
                          label={`${bar.crop.name} (${bar.crop.code})`}
                        >
                          <Box
                            onClick={() =>
                              navigate(ROUTES.CROPS.DETAIL.replace(':id', bar.crop.id))
                            }
                            style={{
                              position: 'absolute',
                              left: `${bar.leftPct}%`,
                              width: `${bar.widthPct}%`,
                              top: 6,
                              height: ROW_HEIGHT - 14,
                              background: tone,
                              cursor: 'pointer',

                              borderRadius: 4,
                              borderTopLeftRadius: bar.clippedStart ? 0 : 4,
                              borderBottomLeftRadius: bar.clippedStart ? 0 : 4,
                              borderTopRightRadius: bar.clippedEnd ? 0 : 4,
                              borderBottomRightRadius: bar.clippedEnd ? 0 : 4,
                              overflow: 'hidden',
                              display: 'flex',
                              alignItems: 'center',
                              paddingInline: 6,
                            }}
                          >
                            <Text size="xs" c="white" truncate>
                              {bar.crop.name}
                            </Text>
                          </Box>
                        </Tooltip>
                      );
                    })}
                  </Box>
                </Group>
              );
            })}
          </Box>
        </Box>
      )}
    </Card>
  );
}
