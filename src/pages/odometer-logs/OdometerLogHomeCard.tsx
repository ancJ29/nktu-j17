import { Badge, Button, Card, Group, Image, Stack, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconCheck, IconClockHour4, IconGauge } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { logger } from '@credo/base-ui/utils';
import { useMyEmployee } from '@/hooks/useMyEmployee';
import { odometerLogBundle } from '@/stores/useOdometerLogStore';
import type { OdometerLog } from '@/types';
import { todayInVnDateString } from '@/utils/dateTimeField';
import { featureFlags } from '@/utils/features';
import { formatNumber } from '@/utils/number';
import { isDriverDepartment, perms } from '@/utils/permission';
import { OdometerLogModal } from './OdometerLogModal';
import { hasKm, readFuelCost, readKm, visibleLogPhotos } from './odometerLogModel';

/**
 * The driver's daily prompt, on their home screen.
 *
 * **The un-logged state is the feature.** A card that only appears once there is
 * something to show would be a receipt for work already done; what makes a daily
 * habit stick is an outstanding task that is visibly outstanding. So this renders
 * in both states and leads with the one the driver has to act on.
 *
 * A third state sits between them since drivers may save photos first and type
 * the km at the end of the shift (plan §13): the photos show back, and the card
 * still leads with the outstanding number, because the grid counts that day
 * missing until it lands.
 *
 * It also answers "did my tap register?" — the logged state shows the number and
 * the photo back. Without that, the cheapest way for a driver to resolve the
 * doubt is to submit again, which is the behaviour the one-per-day rule exists to
 * make harmless but nobody should be relying on.
 *
 * Reads **one partition** (today) rather than the list's range: this is a card on
 * a dashboard, and the question it answers is one day wide.
 */
export function OdometerLogHomeCard() {
  const { t } = useTranslation();
  const me = useMyEmployee();
  const [opened, { open, close }] = useDisclosure(false);
  const [today] = useState(todayInVnDateString);
  const [entry, setEntry] = useState<OdometerLog | undefined>();
  const [loaded, setLoaded] = useState(false);

  const enabled = featureFlags.nktuOdometerLog.enabled;
  const eligible =
    enabled && !!me && isDriverDepartment(me.department) && perms.odometerLog.canCreate();

  useEffect(() => {
    if (!eligible || !me) return;
    let cancelled = false;
    odometerLogBundle
      .queryPartition(today)
      .then((logs) => {
        if (cancelled) return;
        setEntry(logs.find((log) => log.extra?.employeeId === me.id && !log.extra?.isDeleted));
        setLoaded(true);
      })
      .catch((err) => {
        // A failed read must not hide the button: "we couldn't check" and "you
        // already logged" are different answers, and only one of them should
        // stop a driver from logging.
        logger.error('Odometer today lookup failed:', err);
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [eligible, me, today]);

  if (!eligible || !me) return null;

  const photos = visibleLogPhotos(entry?.extra?.photos);
  const fuelCost = readFuelCost(entry);
  const done = hasKm(entry);
  const kmPending = !!entry && !done;

  return (
    <Card withBorder radius="md" padding="md">
      <Stack gap="sm">
        <Group gap="xs" justify="space-between" wrap="nowrap">
          <Group gap={6} wrap="nowrap">
            <IconGauge size={16} />
            <Text fw={600} size="sm">
              {t('odometerLog.home.title')}
            </Text>
          </Group>
          {done && (
            <Badge color="teal" variant="light" leftSection={<IconCheck size={11} />}>
              {t('odometerLog.home.done')}
            </Badge>
          )}
          {kmPending && (
            <Badge color="orange" variant="light" leftSection={<IconClockHour4 size={11} />}>
              {t('odometerLog.home.kmPending')}
            </Badge>
          )}
        </Group>

        {entry ? (
          <Stack gap="xs">
            {kmPending && (
              <Text size="sm" c="dimmed">
                {t('odometerLog.home.kmPendingPrompt')}
              </Text>
            )}
            <Group gap="md" wrap="wrap" align="baseline">
              {done && (
                <Text size="xl" fw={700} ff="monospace">
                  {formatNumber(readKm(entry))}
                  <Text span size="sm" c="dimmed" ff="text">
                    {' km'}
                  </Text>
                </Text>
              )}
              {fuelCost !== undefined && (
                <Text size="sm" c="dimmed">
                  {t('odometerLog.home.fuelCost', { amount: formatNumber(fuelCost) })}
                </Text>
              )}
            </Group>
            {/* Every photo, not the first: the strip is the driver's receipt
                that the second shot (or the fuel bill) landed too. */}
            {photos.length > 0 && (
              <Group gap={6} wrap="wrap">
                {photos.map((photo) => (
                  <Image
                    key={photo.url}
                    src={photo.url}
                    w={48}
                    h={48}
                    fit="cover"
                    radius="sm"
                    fallbackSrc="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'/>"
                  />
                ))}
              </Group>
            )}
          </Stack>
        ) : (
          <Text size="sm" c="dimmed">
            {t('odometerLog.home.prompt')}
          </Text>
        )}

        <Button
          fullWidth
          variant={done ? 'light' : 'filled'}
          leftSection={<IconGauge size={16} />}
          onClick={open}
          loading={!loaded}
        >
          {done
            ? t('odometerLog.home.edit')
            : kmPending
              ? t('odometerLog.home.addKm')
              : t('odometerLog.home.cta')}
        </Button>
      </Stack>

      <OdometerLogModal
        opened={opened}
        onClose={close}
        employee={me}
        existing={entry}
        initialDate={today}
        // The modal can save another day (a correction to yesterday); only
        // today's entry is this card's to show.
        onSaved={(log) => {
          if (log.recordDate === today) setEntry(log);
        }}
      />
    </Card>
  );
}
