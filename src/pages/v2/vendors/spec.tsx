import { IconAddressBook, IconAdjustments, IconInfoCircle } from '@tabler/icons-react';
import { ROUTES } from '@/constants/routes';
import { useVendorV2Store } from '@/stores/useVendorV2Store';
import { featureFlags } from '@/utils/features';
import { perms } from '@/utils/permission';
import type { VendorV2Row } from '@/types';
import type { MasterDataSpec } from '../master-data';
import { VendorV2DetailBody } from './VendorV2DetailBody';
import { VendorV2MobileCard } from './VendorV2MobileCard';
import {
  VendorV2ContactFields,
  VendorV2IdentityFields,
  VendorV2StatusField,
} from './VendorV2FormFields';
import { useVendorV2ListFilters } from './vendorV2Filters';
import { useVendorV2Columns, useVendorV2HeaderText } from './vendorV2Display';
import { vendorV2HiddenColumns, vendorV2ListColumns } from './listColumns';
import { EMPTY_VENDOR_V2, patchOf, valuesOf, type VendorV2FormValues } from './vendorV2Form';

export const VENDOR_V2_SPEC: MasterDataSpec<VendorV2Row, VendorV2FormValues> = {
  filterCacheKey: 'cmngt:vendor-v2-list-filters',
  routes: ROUTES.VENDORS_V2,
  simpleMode: featureFlags.vendorsV2.simpleMode,
  can: {
    create: perms.vendor.canCreate(),
    edit: perms.vendor.canEdit(),
    delete: perms.vendor.canDelete(),
  },
  useStore: useVendorV2Store,

  text: (t) => ({
    navTitle: t('nav.vendorsV2'),
    searchPlaceholder: t('vendorsV2.searchPlaceholder'),
    noItems: t('vendorsV2.noItems'),
    detailTitle: t('vendorsV2.detailTitle'),
    addItem: t('vendorsV2.addItem'),
    editItem: t('vendorsV2.editItem'),
    createButton: t('vendorsV2.form.createButton'),
    updateButton: t('vendorsV2.form.updateButton'),
    nameRequired: t('vendorsV2.validation.nameRequired'),
    notFound: {
      title: t('vendorsV2.notFound.title'),
      message: t('vendorsV2.notFound.message'),
      back: t('vendorsV2.notFound.back'),
    },
    archive: {
      title: t('vendorsV2.archiveConfirm.title'),
      message: (name) => t('vendorsV2.archiveConfirm.message', { name }),
      action: t('vendorsV2.dangerZone.archive'),
      actionDescription: t('vendorsV2.dangerZone.archiveDesc'),
    },
    toggle: {
      disable: t('vendorsV2.dangerZone.disable'),
      enable: t('vendorsV2.dangerZone.enable'),
      description: t('vendorsV2.dangerZone.toggleDesc'),
      confirm: (name) => t('vendorsV2.dangerZone.toggleConfirm', { name }),
    },
    duplicate: {
      live: t('vendorsV2.validation.codeDuplicate'),
      archived: t('vendorsV2.validation.codeDuplicateArchived'),
    },
    notifications: {
      created: t('vendorsV2.notifications.createSuccess'),
      updated: t('vendorsV2.notifications.updateSuccess'),
      archived: t('vendorsV2.notifications.archiveSuccess'),
      error: t('vendorsV2.notifications.writeError'),
    },
  }),

  list: {
    searchFields: (v) => [v.name, v.code, v.extra?.shortName, v.phone],
    secondaryOf: (v) => v.extra?.shortName,
    useColumns: useVendorV2Columns,
    listColumnOrder: vendorV2ListColumns,
    hiddenColumns: vendorV2HiddenColumns,
    useFilters: useVendorV2ListFilters,
  },

  form: {
    empty: EMPTY_VENDOR_V2,
    valuesOf,
    patchOf,
    sections: [
      {
        key: 'identity',
        column: 'main',
        icon: <IconInfoCircle size={14} />,
        title: (t) => t('common.labels.basicInfo'),
        Fields: VendorV2IdentityFields,
      },
      {
        key: 'contact',
        column: 'main',
        icon: <IconAddressBook size={14} />,
        title: (t) => t('common.labels.contact'),
        Fields: VendorV2ContactFields,
      },
      {
        key: 'status',
        column: 'side',
        icon: <IconAdjustments size={14} />,
        title: (t) => t('__new__.01-common.labels.status'),
        Fields: VendorV2StatusField,
      },
    ],
  },

  mobile: { Card: VendorV2MobileCard },

  useHeaderText: useVendorV2HeaderText,
  DetailBody: VendorV2DetailBody,
};
