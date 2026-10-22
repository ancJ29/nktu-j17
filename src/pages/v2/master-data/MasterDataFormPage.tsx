import { Button, Divider, Grid, Group, Stack, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconArrowLeft } from '@tabler/icons-react';
import { useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import { device } from '@credo/base-ui/utils';
import { DesktopOnlyGuard } from '@/components/DesktopOnlyGuard';
import { Form } from '@/components/Form';
import { SectionCard } from '@/components/SectionCard';
import type { MasterDataFormValues, MasterDataRow, MasterDataSpec } from './spec';
import { useMasterDataForm, useMasterDataList, useMasterDataWrites } from './useMasterDataWrites';

const isMobile = device.isMobile;

export function MasterDataFormPage<Row extends MasterDataRow, Values extends MasterDataFormValues>({
  spec,
}: {
  readonly spec: MasterDataSpec<Row, Values>;
}) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { items, initialized, loading, loadAll } = useMasterDataList(spec);

  useEffect(() => {
    if (!initialized && !loading) void loadAll();
  }, [initialized, loading, loadAll]);

  const blockedOnMobile = isMobile && !!spec.mobile;
  useEffect(() => {
    if (!blockedOnMobile) return;
    notifications.show({
      color: 'yellow',
      message: t('common.desktopOnly.message'),
      autoClose: 4000,
    });
    navigate(id ? spec.routes.DETAIL.replace(':id', id) : spec.routes.LIST, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockedOnMobile]);

  const editing = useMemo(
    () => (id ? (items.find((it) => it.id === id) ?? null) : null),
    [items, id],
  );

  if (blockedOnMobile) return null;
  if (id && !initialized) return null;
  return <MasterDataFormBody spec={spec} editing={editing} isEdit={!!id} />;
}

function MasterDataFormBody<Row extends MasterDataRow, Values extends MasterDataFormValues>({
  spec,
  editing,
  isEdit,
}: {
  readonly spec: MasterDataSpec<Row, Values>;
  readonly editing: Row | null;
  readonly isEdit: boolean;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const text = useMemo(() => spec.text(t), [spec, t]);
  const { save, busy } = useMasterDataWrites(spec);

  const form = useMasterDataForm(spec, editing);

  const handleSubmit = useCallback(
    async (values: Values) => {
      const saved = await save(values, editing, form);
      if (saved) navigate(spec.routes.DETAIL.replace(':id', saved.id));
    },
    [save, editing, form, navigate, spec],
  );

  const cards = spec.form.sections.map(({ key, column, icon, title, Fields }) => ({
    key,
    column,
    card: (
      <SectionCard key={key} icon={icon} title={title(t)} padding="md">
        <Fields form={form} isEditing={isEdit} />
      </SectionCard>
    ),
  }));

  return (
    <DesktopOnlyGuard>
      <Stack gap="lg">
        <Group gap="sm">
          <Button
            onClick={() => navigate(-1)}
            variant="subtle"
            size="compact-sm"
            leftSection={<IconArrowLeft size={16} />}
          >
            {t('common.actions.back')}
          </Button>
        </Group>

        <Title order={3}>{isEdit ? text.editItem : text.addItem}</Title>
        <Divider />

        <Form form={form} onSubmit={handleSubmit}>
          <Stack gap="md">
            <Grid gutter="md">
              <Grid.Col span={{ base: 12, md: 7 }}>
                <Stack gap="md">
                  {cards.filter((c) => c.column === 'main').map((c) => c.card)}
                </Stack>
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 5 }}>
                <Stack gap="md">
                  {cards.filter((c) => c.column === 'side').map((c) => c.card)}
                </Stack>
              </Grid.Col>
            </Grid>

            <Group justify="flex-end" gap="sm">
              <Button variant="default" disabled={busy} onClick={() => navigate(spec.routes.LIST)}>
                {t('common.actions.cancel')}
              </Button>
              <Button type="submit" loading={busy}>
                {isEdit ? text.updateButton : text.createButton}
              </Button>
            </Group>
          </Stack>
        </Form>
      </Stack>
    </DesktopOnlyGuard>
  );
}
