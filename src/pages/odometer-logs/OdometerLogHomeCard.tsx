import { Badge, Button, Card, Group, Image, Stack, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconCheck, IconGauge } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { logger } from '@credo/base-ui/utils';
import { useMyEmployee } from '@/hooks/useMyEmployee';
import { odometerLogBundle } from '@/stores/useOdometerLogStore';
import type { OdometerLog } from '@/types';
import { todayInVnDateString } from '@/utils/dateTimeField';
import { featureFlags } from '@/utils/features';
import { isDriverDepartment, perms } from '@/utils/permission';
import { OdometerLogModal } from './OdometerLogModal';
import { visibleLogPhotos } from './odometerLogModel';

/**
 * The driver's daily prompt, on their home screen.
 *
 * **The un-logged state is the feature.** A card that only appears once there is
 * something to show would be a receipt for work already done; what makes a daily
 * habit stick is an outstanding task that is visibly outstanding. So this renders
 * in both states and leads with the one the driver has to act on.
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

  const photo = visibleLogPhotos(entry?.extra?.photos)[0];

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
          {entry && (
            <Badge color="teal" variant="light" leftSection={<IconCheck size={11} />}>
              {t('odometerLog.home.done')}
            </Badge>
          )}
        </Group>

        {entry ? (
          <Group gap="sm" wrap="nowrap" align="center">
            {photo && (
              <Image
                src={photo.url}
                w={56}
                h={56}
                fit="cover"
                radius="sm"
                fallbackSrc="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'/>"
              />
            )}
            <Text size="xl" fw={700} ff="monospace">
              {entry.extra.km.toLocaleString()}
              <Text span size="sm" c="dimmed" ff="text">
                {' km'}
              </Text>
            </Text>
          </Group>
        ) : (
          <Text size="sm" c="dimmed">
            {t('odometerLog.home.prompt')}
          </Text>
        )}

        <Button
          fullWidth
          variant={entry ? 'light' : 'filled'}
          leftSection={<IconGauge size={16} />}
          onClick={open}
          loading={!loaded}
        >
          {entry ? t('odometerLog.form.editTitle') : t('odometerLog.home.cta')}
        </Button>
      </Stack>

      <OdometerLogModal
        opened={opened}
        onClose={close}
        employee={me}
        existing={entry}
        initialDate={today}
        onSaved={setEntry}
      />
    </Card>
  );
}
