import { Button, Divider, Grid, Group, Stack } from '@mantine/core';
import {
  IconArrowLeft,
  IconBan,
  IconCircleCheck,
  IconPencil,
  IconTrash,
} from '@tabler/icons-react';
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import { device } from '@credo/base-ui/utils';
import { ConfirmModal } from '@/components/ConfirmModal';
import { DangerAction } from '@/components/DangerAction';
import { DangerZoneCard } from '@/components/DangerZoneCard';
import { DesktopOnlyGuard } from '@/components/DesktopOnlyGuard';
import { NotFoundState } from '@/components/NotFoundState';
import { MasterDataDetailHeader } from './MasterDataDetailHeader';
import type { MasterDataFormValues, MasterDataRow, MasterDataSpec } from './spec';
import { useMasterDataList, useMasterDataWrites } from './useMasterDataWrites';

const isMobile = device.isMobile;

export function MasterDataDetailPage<
  Row extends MasterDataRow,
  Values extends MasterDataFormValues,
>({ spec }: { readonly spec: MasterDataSpec<Row, Values> }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const text = useMemo(() => spec.text(t), [spec, t]);
  const { items, initialized, loading, loadAll } = useMasterDataList(spec);
  const { setActive, archive, busy } = useMasterDataWrites(spec);
  const [confirmingArchive, setConfirmingArchive] = useState(false);
  const [confirmingToggle, setConfirmingToggle] = useState(false);

  useEffect(() => {
    if (!initialized && !loading) void loadAll();
  }, [initialized, loading, loadAll]);

  const row = useMemo(
    () => items.find((it) => it.id === id && !it.extra?.isDeleted) ?? null,
    [items, id],
  );

  const handleArchive = useCallback(async () => {
    if (!row) return;
    if (await archive(row)) navigate(spec.routes.LIST);
  }, [archive, row, navigate, spec]);

  const handleToggle = useCallback(async () => {
    if (!row) return;
    if (await setActive(row, !row.isActive)) setConfirmingToggle(false);
  }, [setActive, row]);

  if (!initialized) return null;

  const Shell = isMobile && !spec.mobile ? DesktopOnlyGuard : Fragment;

  const statusAction =
    row && spec.can.edit ? (
      <Button
        fullWidth
        size="md"
        variant="light"
        color={row.isActive ? 'orange' : 'green'}
        leftSection={row.isActive ? <IconBan size={16} /> : <IconCircleCheck size={16} />}
        onClick={() => setConfirmingToggle(true)}
      >
        {row.isActive ? text.toggle.disable : text.toggle.enable}
      </Button>
    ) : null;

  return (
    <Shell>
      <Stack gap="lg">
        <Group justify="space-between" wrap="nowrap">
          <Button
            onClick={() => navigate(spec.routes.LIST)}
            variant="subtle"
            size="compact-sm"
            leftSection={<IconArrowLeft size={16} />}
          >
            {t('common.actions.back')}
          </Button>
          {/* Edit is desktop-only: the form it opens redirects on a phone, and
              a CTA leading somewhere the app bounces you back from is a dead
              end rather than an accommodation. */}
          {row && spec.can.edit && !isMobile && (
            <Button
              variant="default"
              size="compact-sm"
              leftSection={<IconPencil size={14} />}
              onClick={() => navigate(spec.routes.EDIT.replace(':id', row.id))}
            >
              {t('common.actions.edit')}
            </Button>
          )}
        </Group>

        {!row ? (
          <NotFoundState
            title={text.notFound.title}
            message={text.notFound.message}
            backLabel={text.notFound.back}
            backTo={spec.routes.LIST}
          />
        ) : (
          <>
            <MasterDataDetailHeader spec={spec} row={row} showTimestamps={!isMobile} />
            <Divider />
            {/* Two columns, never a full-width body: operators want the whole
                record on one screen, and flattening would push the danger zone
                below the fold. A register balances the rail via `DetailSide`. */}
            {isMobile ? (
              <Stack gap="md">
                <spec.DetailBody row={row} />
                {spec.DetailSide ? <spec.DetailSide row={row} /> : null}
                {statusAction}
              </Stack>
            ) : (
              <Grid gutter="md">
                <Grid.Col span={{ base: 12, md: 7 }}>
                  <spec.DetailBody row={row} />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 5 }}>
                  <Stack gap="md">
                    {spec.DetailSide ? <spec.DetailSide row={row} /> : null}
                    {(spec.can.edit || spec.can.delete) && (
                      <DangerZoneCard title={t('__new__.01-common.dangerZone.title')}>
                        {spec.can.edit && (
                          <DangerAction
                            title={row.isActive ? text.toggle.disable : text.toggle.enable}
                            description={text.toggle.description}
                            buttonLabel={t(
                              row.isActive
                                ? '__new__.01-common.dangerZone.disableButton'
                                : '__new__.01-common.dangerZone.enableButton',
                            )}
                            buttonIcon={
                              row.isActive ? <IconBan size={14} /> : <IconCircleCheck size={14} />
                            }
                            buttonColor={row.isActive ? 'orange' : 'green'}
                            onClick={() => setConfirmingToggle(true)}
                          />
                        )}
                        {spec.can.edit && spec.can.delete && <Divider variant="dashed" />}
                        {spec.can.delete && (
                          <DangerAction
                            title={text.archive.action}
                            description={text.archive.actionDescription}
                            buttonLabel={t('common.actions.remove')}
                            buttonIcon={<IconTrash size={14} />}
                            buttonColor="red"
                            onClick={() => setConfirmingArchive(true)}
                          />
                        )}
                      </DangerZoneCard>
                    )}
                  </Stack>
                </Grid.Col>
              </Grid>
            )}
          </>
        )}

        <ConfirmModal
          opened={confirmingArchive}
          onClose={() => setConfirmingArchive(false)}
          onConfirm={handleArchive}
          title={text.archive.title}
          message={text.archive.message(row?.name ?? '')}
          loading={busy}
        />
        {/* Confirm reads as the action it confirms. Left to the modal's own
            defaults this said "Remove" in red over a pause/resume — a delete
            button on a dialog that deletes nothing. */}
        <ConfirmModal
          opened={confirmingToggle}
          onClose={() => setConfirmingToggle(false)}
          onConfirm={handleToggle}
          title={row?.isActive ? text.toggle.disable : text.toggle.enable}
          message={text.toggle.confirm(row?.name ?? '')}
          confirmLabel={t(
            row?.isActive
              ? '__new__.01-common.dangerZone.disableButton'
              : '__new__.01-common.dangerZone.enableButton',
          )}
          confirmColor={row?.isActive ? 'orange' : 'green'}
          loading={busy}
        />
      </Stack>
    </Shell>
  );
}
