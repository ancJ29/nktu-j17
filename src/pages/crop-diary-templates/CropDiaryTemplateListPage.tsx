import { Stack, Text, ThemeIcon } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconClipboardList } from '@tabler/icons-react';
import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@/constants/routes';
import { useCropDiaryTemplateStore } from '@/stores/useCropDiaryTemplateStore';
import { ListPagination } from '@credo/base-ui/components';
import { device } from '@credo/base-ui/utils';
import { useCachedListFilters } from '@/hooks/useCachedListFilters';
import { useListFilter } from '@/hooks/useListFilter';
import { DesktopFilterBar } from '@/components/DesktopFilterBar';
import { ListPageHeader } from '@/components/ListPageHeader';
import { StickyListChrome } from '@/components/StickyListChrome';
import { MobileFilterBar } from '@/components/MobileFilterBar';
import { perms } from '@/utils/permission';

import { CropDiaryTemplateCardList } from './CropDiaryTemplateCardList';
import { CropDiaryTemplateDataTable } from './CropDiaryTemplateDataTable';

const isMobile = device.isMobile;
const canCreate = perms.cropDiaryTemplate.canCreate();

type Filters = { search: string; page: number };
const FILTER_DEFAULTS: Filters = { search: '', page: 1 };

export function CropDiaryTemplateListPage() {
  const { t } = useTranslation();

  const { items, loading, initialized, error, cachedAt, loadAll, forceRefresh } =
    useCropDiaryTemplateStore();

  const {
    state: filterState,
    updateState,
    clearFilters,
  } = useCachedListFilters('cmngt:crop-diary-template-list-filters', FILTER_DEFAULTS);
  const onSearchChange = useCallback((v: string) => updateState({ search: v }), [updateState]);
  const onPageChange = useCallback((p: number) => updateState({ page: p }), [updateState]);

  const { search, setSearch, page, setPage, pageSize, setPageSize, paginated, totalPages } =
    useListFilter(items, {
      filters: {},
      filterFn: () => true,
      searchFields: (item) => [item.name, item.code],
      search: filterState.search,
      onSearchChange,
      page: filterState.page,
      onPageChange,
    });

  useEffect(() => {
    if (!initialized && !error) loadAll();
  }, [initialized, error, loadAll]);

  useEffect(() => {
    if (error) {
      notifications.show({
        color: 'red',
        title: t('cropDiaryTemplates.notifications.fetchError'),
        message: '',
      });
    }
  }, [error, t]);

  const handleForceRefresh = useCallback(() => forceRefresh(), [forceRefresh]);

  return (
    <Stack gap={isMobile ? 'md' : 'lg'}>
      <StickyListChrome>
        <ListPageHeader
          title={t('cropDiaryTemplates.title')}
          icon={
            <ThemeIcon size={38} radius="md" variant="light" color="primary">
              <IconClipboardList size={20} stroke={1.75} />
            </ThemeIcon>
          }
          subtitle={
            initialized && items.length > 0 ? (
              <Text size="xs" c="dimmed">
                {t('cropDiaryTemplates.summary.total', { count: items.length })}
              </Text>
            ) : undefined
          }
          cachedAt={cachedAt}
          loading={loading}
          onRefresh={handleForceRefresh}
          createCta={{
            to: ROUTES.CROP_DIARY_TEMPLATES.NEW,
            label: t('cropDiaryTemplates.addItem'),
            enabled: canCreate,
          }}
        />

        {isMobile ? (
          <MobileFilterBar
            recordCount={items.length}
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={t('cropDiaryTemplates.searchPlaceholder')}
            hideStatus
            onClear={clearFilters}

            labelChips
          />
        ) : (
          <DesktopFilterBar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={t('cropDiaryTemplates.searchPlaceholder')}
            hideStatus
            onClear={clearFilters}
          />
        )}
      </StickyListChrome>

      {isMobile ? (
        <CropDiaryTemplateCardList templates={paginated} isLoading={loading && !initialized} />
      ) : (
        <CropDiaryTemplateDataTable templates={paginated} isLoading={loading && !initialized} />
      )}

      <ListPagination
        page={page}
        totalPages={totalPages}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </Stack>
  );
}
