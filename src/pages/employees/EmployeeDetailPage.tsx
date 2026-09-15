import { Button, Divider, Grid, Group, Stack } from '@mantine/core';
import {
  IconArrowLeft,
  IconClock,
  IconEdit,
  IconHistory,
  IconInfoCircle,
  IconLicense,
  IconShield,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Tabs } from '@credo/base-ui/components';
import { device } from '@credo/base-ui/utils';
import { ROUTES } from '@/constants/routes';
import { useEmployeeDetail } from './detail/useEmployeeDetail';

const isMobile = device.isMobile;

export function EmployeeDetailPage() {
  const { t } = useTranslation();
  const parts = useEmployeeDetail();

  if (!parts.ready) return null;
  const { employee, canEdit, header, cards, tabs, panels, modals } = parts;

  const detailsContent = isMobile ? (
    <Stack gap="md">
      {cards.quickActions}
      {cards.personal}
      {cards.contacts}
      {cards.notes}
      {cards.dangerZone}
    </Stack>
  ) : (
    <Grid gutter="md">
      <Grid.Col span={{ base: 12, md: 7 }}>
        <Stack gap="md">
          {cards.personal}
          {cards.contacts}
          {cards.notes}
        </Stack>
      </Grid.Col>
      <Grid.Col span={{ base: 12, md: 5 }}>
        <Stack gap="md">
          {cards.quickActions}
          {cards.dangerZone}
        </Stack>
      </Grid.Col>
    </Grid>
  );

  const topActions = isMobile ? null : (
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
      {canEdit && (
        <Button
          component={Link}
          to={ROUTES.EMPLOYEES.EDIT.replace(':id', employee.id)}
          variant="default"
          size="compact-sm"
          leftSection={<IconEdit size={14} />}
        >
          {t('common.actions.edit')}
        </Button>
      )}
    </Group>
  );

  return (
    <>
      <Stack gap="lg">
        {topActions}
        {header}
        <Divider />
        <Tabs value={tabs.value} onChange={tabs.onChange}>
          <Tabs.List>
            <Tabs.Tab value="details" leftSection={<IconInfoCircle size={16} />}>
              {t('employees.employeeDetails')}
            </Tabs.Tab>
            <Tabs.Tab value="timesheet" leftSection={<IconClock size={16} />}>
              {t('employees.detail.timesheet')}
            </Tabs.Tab>
            {tabs.isDriver && (
              <Tabs.Tab value="driver" leftSection={<IconLicense size={16} />}>
                {t('employees.driver.tab')}
              </Tabs.Tab>
            )}
            {tabs.showActivity && (
              <Tabs.Tab value="activity" leftSection={<IconHistory size={16} />}>
                {t('employees.detail.recentActivities')}
              </Tabs.Tab>
            )}
            {tabs.showPermissions && (
              <Tabs.Tab value="permissions" leftSection={<IconShield size={16} />}>
                {t('profile.permissions')}
              </Tabs.Tab>
            )}
          </Tabs.List>

          <Tabs.Panel value="details" pt="md">
            {detailsContent}
          </Tabs.Panel>

          <Tabs.Panel value="timesheet" pt="md">
            {panels.timesheet}
          </Tabs.Panel>

          {tabs.isDriver && (
            <Tabs.Panel value="driver" pt="md">
              {panels.driver}
            </Tabs.Panel>
          )}

          {tabs.showActivity && (
            <Tabs.Panel value="activity" pt="md">
              {panels.activity}
            </Tabs.Panel>
          )}

          {tabs.showPermissions && (
            <Tabs.Panel value="permissions" pt="md">
              {panels.permissions}
            </Tabs.Panel>
          )}
        </Tabs>
      </Stack>

      {modals}
    </>
  );
}
