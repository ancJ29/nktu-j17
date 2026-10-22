import { Grid, Stack } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { DetailField } from '@/components/DetailField';
import { SectionCard } from '@/components/SectionCard';
import { lookupLabelOf, useLookupV2Labels } from '@/hooks/useLookupV2Options';
import type { MaterialV2Row } from '@/types';
import { useMaterialInventoryV2Store } from '@/stores/useMaterialInventoryV2Store';
import { InventoryV2Section } from '../master-data/InventoryV2Section';
import {
  canManageInventory,
  MATERIAL_CATEGORY_CATEGORY,
  MATERIAL_UNIT_CATEGORY,
  showInventory,
} from './materialV2Form';

export function MaterialV2DetailBody({ row }: { readonly row: MaterialV2Row }) {
  const { t } = useTranslation();
  const categoryLabels = useLookupV2Labels(MATERIAL_CATEGORY_CATEGORY);
  const unitLabels = useLookupV2Labels(MATERIAL_UNIT_CATEGORY);
  const category = row.extra?.category;
  const unit = row.extra?.units?.[0];

  return (
    <Stack gap="md">
      <SectionCard
        icon={<IconInfoCircle size={14} />}
        title={t('common.labels.basicInfo')}
        padding="md"
      >
        <Grid gutter="md">
          <Grid.Col span={{ base: 12, sm: 4 }}>
            <DetailField label={t('common.labels.name')}>{row.name}</DetailField>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 4 }}>
            <DetailField label={t('common.labels.code')}>{row.code}</DetailField>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 4 }}>
            <DetailField label={t('materialsV2.form.unit')}>
              {unit ? lookupLabelOf(unitLabels, unit) : undefined}
            </DetailField>
          </Grid.Col>
          {category ? (
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <DetailField label={t('materialsV2.form.category')}>
                {lookupLabelOf(categoryLabels, category)}
              </DetailField>
            </Grid.Col>
          ) : null}
        </Grid>
      </SectionCard>
    </Stack>
  );
}

export function MaterialV2DetailSide({ row }: { readonly row: MaterialV2Row }) {
  const unitLabels = useLookupV2Labels(MATERIAL_UNIT_CATEGORY);
  const unit = row.extra?.units?.[0];

  if (!showInventory) return null;
  return (
    <InventoryV2Section
      row={row}
      useStore={useMaterialInventoryV2Store}
      canManage={canManageInventory}
      unit={unit ? lookupLabelOf(unitLabels, unit) : undefined}
    />
  );
}
