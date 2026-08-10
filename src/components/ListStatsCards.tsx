import { useState, type ReactNode } from 'react';
import { Box, Button, Card, Collapse, type MantineColor, SimpleGrid, Text } from '@mantine/core';
import { IconChevronRight } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { FieldLabel } from '@credo/base-ui/components';
import { device } from '@credo/base-ui/utils';
import { isStatsEnabled } from '@/utils/permission';

const isMobile = device.isMobile;

const statsEnabled = isStatsEnabled();

const STATS_HIDDEN_KEY = 'cmngt:list-stats-hidden';

function readStatsHidden(): boolean {
  try {
    return localStorage.getItem(STATS_HIDDEN_KEY) === '1';
  } catch {
    return true;
  }
}

function writeStatsHidden(hidden: boolean): void {
  try {
    if (hidden) localStorage.setItem(STATS_HIDDEN_KEY, '1');
    else localStorage.removeItem(STATS_HIDDEN_KEY);
  } catch {
    // Preference only — losing it costs one extra click, never data.
  }
}

export type ListStatCell = {
  readonly key: string;
  readonly label: string;
  readonly value: ReactNode;
  readonly color?: MantineColor;
};

type ListStatsCardsProps = {
  readonly cells: readonly ListStatCell[];

  readonly visible?: boolean;

  readonly cols?: { base: number; sm: number };
};

export function ListStatsCards({
  cells,
  visible = true,
  cols = { base: 2, sm: 4 },
}: ListStatsCardsProps) {
  const { t } = useTranslation();
  const [hidden, setHidden] = useState(readStatsHidden);

  if (!statsEnabled || isMobile || !visible || cells.length === 0) return null;

  const toggle = () => {
    writeStatsHidden(!hidden);
    setHidden(!hidden);
  };

  return (
    <Box>
      <Button
        variant="subtle"
        color="gray"
        size="compact-xs"
        ml={-7}
        c="dimmed"
        tt="uppercase"
        fw={600}
        lts={0.3}
        aria-expanded={!hidden}
        onClick={toggle}
        leftSection={
          <IconChevronRight
            size={12}
            style={{
              transform: hidden ? 'none' : 'rotate(90deg)',
              transition: 'transform 150ms ease',
            }}
          />
        }
      >
        {t('__new__.01-common.list.stats')}
      </Button>
      <Collapse in={!hidden} transitionDuration={150}>
        <SimpleGrid mt={6} cols={cols}>
          {cells.map((cell) => (
            <Card withBorder p="sm" key={cell.key}>
              <FieldLabel>{cell.label}</FieldLabel>
              <Text size="xl" fw={700} c={cell.color}>
                {cell.value}
              </Text>
            </Card>
          ))}
        </SimpleGrid>
      </Collapse>
    </Box>
  );
}
