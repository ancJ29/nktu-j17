import { Box, Button, Divider, Grid, Group, Stack } from '@mantine/core';
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
import { Link, useNavigate, useParams } from 'react-router';
import { Tabs } from '@credo/base-ui/components';
import { device } from '@credo/base-ui/utils';
import { ROUTES } from '@/constants/routes';
import { useEmployeeDetail } from '@/pages/employees/detail/useEmployeeDetail';
import { RecordNotFound } from '@/pages/v2/detailBlocks';
import { ACTION_BAR_HEIGHT, ACTION_BAR_Z, STICKY_ACTION_BAR_TOP } from '@/pages/v2/stickyChrome';

const isMobile = device.isMobile;

export function EmployeeV2DetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const parts = useEmployeeDetail();

  if (!parts.ready) {
    return parts.loading || !id ? null : (
      <RecordNotFound
        title={t('employees.notFound.title')}
        message={t('employees.notFound.message')}
        backLabel={t('common.actions.back')}
        onBack={() => navigate(ROUTES.EMPLOYEES.LIST)}
      />
    );
  }

  const { employee, canEdit, header, cards, tabs, panels, modals } = parts;

  const rail = (
    <Stack gap="md">
      {cards.quickActions}
      {cards.dangerZone}
    </Stack>
  );

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
      <Grid.Col span={{ base: 12, md: 5 }}>{rail}</Grid.Col>
    </Grid>
  );

  return (
    <>
      <Stack gap="lg">
        {/* Hidden on mobile: the shared bottom navigation already offers Back
            and Home, and a pinned bar on a phone costs a row of the record. */}
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
          </Box>
        )}

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
