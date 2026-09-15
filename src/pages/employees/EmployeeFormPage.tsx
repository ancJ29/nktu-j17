import { Button, Divider, Group, Stack, Title } from '@mantine/core';
import { IconArrowLeft, IconFileSpreadsheet, IconUserPlus } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Tabs } from '@credo/base-ui/components';
import { device } from '@credo/base-ui/utils';
import { ROUTES } from '@/constants/routes';
import { useEmployeeForm } from './useEmployeeForm';

const isMobile = device.isMobile;

export function EmployeeFormPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<string | null>('single');
  const parts = useEmployeeForm();

  if (!parts.ready) return null;
  const { pageTitle, single, bulk } = parts;

  return (
    <Stack gap="lg">
      {/* Back (desktop only) · flat Title · Divider. No big header card — the
          form cards below carry the visual weight. */}
      {!isMobile && (
        <Group justify="space-between">
          <Button
            component={Link}
            to={ROUTES.EMPLOYEES.LIST}
            variant="subtle"
            size="compact-sm"
            leftSection={<IconArrowLeft size={16} />}
          >
            {t('common.actions.back')}
          </Button>
        </Group>
      )}

      <Title order={isMobile ? 4 : 3} lh={1.2}>
        {pageTitle}
      </Title>

      <Divider />

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
