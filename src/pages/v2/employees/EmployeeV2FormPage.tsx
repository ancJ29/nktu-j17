import { Box, Button, Divider, Group, Stack, Title } from '@mantine/core';
import { IconArrowLeft, IconFileSpreadsheet, IconUserPlus } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Tabs } from '@credo/base-ui/components';
import { device } from '@credo/base-ui/utils';
import { ROUTES } from '@/constants/routes';
import { useEmployeeForm } from '@/pages/employees/useEmployeeForm';
import { ACTION_BAR_HEIGHT, ACTION_BAR_Z, STICKY_ACTION_BAR_TOP } from '@/pages/v2/stickyChrome';

const isMobile = device.isMobile;

export function EmployeeV2FormPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<string | null>('single');
  const parts = useEmployeeForm();

  if (!parts.ready) return null;
  const { pageTitle, single, bulk } = parts;

  return (
    <Stack gap="lg">
      {!isMobile && (
        <Box
          pos="sticky"
          top={STICKY_ACTION_BAR_TOP}
          h={ACTION_BAR_HEIGHT}
          style={{ zIndex: ACTION_BAR_Z }}
          bg="var(--mantine-color-body)"
        >
          <Group justify="space-between" wrap="nowrap" h="100%">
            <Button
              component={Link}
              to={ROUTES.EMPLOYEES.LIST}
              variant="subtle"
              size="compact-sm"
              leftSection={<IconArrowLeft size={16} />}
            >
              {t('common.actions.back')}
            </Button>
            <Title order={4} lh={1.2}>
              {pageTitle}
            </Title>
          </Group>
        </Box>
      )}

      {isMobile && (
        <>
          <Title order={4} lh={1.2}>
            {pageTitle}
          </Title>
          <Divider />
        </>
      )}

      {!bulk ? (
        single
      ) : (
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="single" leftSection={<IconUserPlus size={16} />}>
              {t('employees.addEmployee')}
            </Tabs.Tab>
            <Tabs.Tab value="bulk" leftSection={<IconFileSpreadsheet size={16} />}>
              {t('employees.bulkImport.title')}
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="single" pt="md">
            {single}
          </Tabs.Panel>

          <Tabs.Panel value="bulk" pt="md">
            {bulk}
          </Tabs.Panel>
        </Tabs>
      )}
    </Stack>
  );
}
