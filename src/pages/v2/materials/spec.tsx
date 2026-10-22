import { IconAdjustments, IconInfoCircle } from '@tabler/icons-react';
import { ROUTES } from '@/constants/routes';
import { useMaterialV2Store } from '@/stores/useMaterialV2Store';
import { featureFlags } from '@/utils/features';
import { perms } from '@/utils/permission';
import type { MaterialV2Row } from '@/types';
import type { MasterDataSpec } from '../master-data';
import { MaterialV2DetailBody, MaterialV2DetailSide } from './MaterialV2DetailBody';
import { MaterialV2MobileCard } from './MaterialV2MobileCard';
import { MaterialV2IdentityFields, MaterialV2StatusField } from './MaterialV2FormFields';
import { materialV2HiddenColumns, materialV2ListColumns } from './listColumns';
import { useMaterialV2ListFilters } from './materialV2Filters';
import { useMaterialV2Columns, useMaterialV2HeaderText } from './materialV2Display';
import { EMPTY_MATERIAL_V2, patchOf, valuesOf, type MaterialV2FormValues } from './materialV2Form';

export const MATERIAL_V2_SPEC: MasterDataSpec<MaterialV2Row, MaterialV2FormValues> = {
  filterCacheKey: 'cmngt:material-v2-list-filters',
  routes: ROUTES.MATERIALS_V2,
  simpleMode: featureFlags.materialsV2.simpleMode,
  can: {
    create: perms.material.canCreate(),
    edit: perms.material.canEdit(),
    delete: perms.material.canDelete(),
  },
  useStore: useMaterialV2Store,

  text: (t) => ({
    navTitle: t('nav.materialsV2'),
    searchPlaceholder: t('materialsV2.searchPlaceholder'),
    noItems: t('materialsV2.noItems'),
    detailTitle: t('materialsV2.detailTitle'),
    addItem: t('materialsV2.addItem'),
    editItem: t('materialsV2.editItem'),
    createButton: t('materialsV2.form.createButton'),
    updateButton: t('materialsV2.form.updateButton'),
    nameRequired: t('materialsV2.validation.nameRequired'),
    notFound: {
      title: t('materialsV2.notFound.title'),
      message: t('materialsV2.notFound.message'),
      back: t('materialsV2.notFound.back'),
    },
    archive: {
      title: t('materialsV2.archiveConfirm.title'),
      message: (name) => t('materialsV2.archiveConfirm.message', { name }),
      action: t('materialsV2.dangerZone.archive'),
      actionDescription: t('materialsV2.dangerZone.archiveDesc'),
    },
    toggle: {
      disable: t('materialsV2.dangerZone.disable'),
      enable: t('materialsV2.dangerZone.enable'),
      description: t('materialsV2.dangerZone.toggleDesc'),
      confirm: (name) => t('materialsV2.dangerZone.toggleConfirm', { name }),
    },
    duplicate: {
      live: t('materialsV2.validation.codeDuplicate'),
      archived: t('materialsV2.validation.codeDuplicateArchived'),
    },
    notifications: {
      created: t('materialsV2.notifications.createSuccess'),
      updated: t('materialsV2.notifications.updateSuccess'),
      archived: t('materialsV2.notifications.archiveSuccess'),
      error: t('materialsV2.notifications.writeError'),
    },
  }),

  list: {
    searchFields: (m) => [m.name, m.code, m.extra?.category, m.extra?.units?.[0]],
    useColumns: useMaterialV2Columns,
    listColumnOrder: materialV2ListColumns,
    hiddenColumns: materialV2HiddenColumns,
    useFilters: useMaterialV2ListFilters,
  },

  form: {
    empty: EMPTY_MATERIAL_V2,
    valuesOf,
    patchOf,
    sections: [
      {
        key: 'identity',
        column: 'main',
        icon: <IconInfoCircle size={14} />,
        title: (t) => t('common.labels.basicInfo'),
        Fields: MaterialV2IdentityFields,
      },
      {
        key: 'status',
        column: 'side',
        icon: <IconAdjustments size={14} />,
        title: (t) => t('__new__.01-common.labels.status'),
        Fields: MaterialV2StatusField,
      },
    ],
  },

  mobile: { Card: MaterialV2MobileCard },

  useHeaderText: useMaterialV2HeaderText,
  DetailBody: MaterialV2DetailBody,
  DetailSide: MaterialV2DetailSide,
};
