import { IconAddressBook, IconAdjustments, IconInfoCircle } from '@tabler/icons-react';
import { ROUTES } from '@/constants/routes';
import { useCustomerV2Store } from '@/stores/useCustomerV2Store';
import { featureFlags } from '@/utils/features';
import { perms } from '@/utils/permission';
import type { CustomerV2Row } from '@/types';
import type { MasterDataSpec } from '../master-data';
import { CustomerV2DetailBody } from './CustomerV2DetailBody';
import { CustomerV2MobileCard } from './CustomerV2MobileCard';
import {
  CustomerV2ContactFields,
  CustomerV2IdentityFields,
  CustomerV2StatusField,
} from './CustomerV2FormFields';
import { useCustomerV2ListFilters } from './customerV2Filters';
import { useCustomerV2Columns, useCustomerV2HeaderText } from './customerV2Display';
import { customerV2HiddenColumns, customerV2ListColumns } from './listColumns';
import { EMPTY_CUSTOMER_V2, patchOf, valuesOf, type CustomerV2FormValues } from './customerV2Form';

export const CUSTOMER_V2_SPEC: MasterDataSpec<CustomerV2Row, CustomerV2FormValues> = {
  filterCacheKey: 'cmngt:customer-v2-list-filters',
  routes: ROUTES.CUSTOMERS_V2,
  simpleMode: featureFlags.customersV2.simpleMode,
  can: {
    create: perms.customer.canCreate(),
    edit: perms.customer.canEdit(),
    delete: perms.customer.canDelete(),
  },
  useStore: useCustomerV2Store,

  text: (t) => ({
    navTitle: t('nav.customersV2'),
    searchPlaceholder: t('customersV2.searchPlaceholder'),
    noItems: t('customersV2.noItems'),
    detailTitle: t('customersV2.detailTitle'),
    addItem: t('customersV2.addItem'),
    editItem: t('customersV2.editItem'),
    createButton: t('customersV2.form.createButton'),
    updateButton: t('customersV2.form.updateButton'),
    nameRequired: t('customersV2.validation.nameRequired'),
    notFound: {
      title: t('customersV2.notFound.title'),
      message: t('customersV2.notFound.message'),
      back: t('customersV2.notFound.back'),
    },
    archive: {
      title: t('customersV2.archiveConfirm.title'),
      message: (name) => t('customersV2.archiveConfirm.message', { name }),
      action: t('customersV2.dangerZone.archive'),
      actionDescription: t('customersV2.dangerZone.archiveDesc'),
    },
    toggle: {
      disable: t('customersV2.dangerZone.disable'),
      enable: t('customersV2.dangerZone.enable'),
      description: t('customersV2.dangerZone.toggleDesc'),
      confirm: (name) => t('customersV2.dangerZone.toggleConfirm', { name }),
    },
    duplicate: {
      live: t('customersV2.validation.codeDuplicate'),
      archived: t('customersV2.validation.codeDuplicateArchived'),
    },
    notifications: {
      created: t('customersV2.notifications.createSuccess'),
      updated: t('customersV2.notifications.updateSuccess'),
      archived: t('customersV2.notifications.archiveSuccess'),
      error: t('customersV2.notifications.writeError'),
    },
  }),

  list: {
    searchFields: (c) => [c.name, c.code, c.extra?.shortName, c.phone],
    secondaryOf: (c) => c.extra?.shortName,
    useColumns: useCustomerV2Columns,
    listColumnOrder: customerV2ListColumns,
    hiddenColumns: customerV2HiddenColumns,
    useFilters: useCustomerV2ListFilters,
  },

  form: {
    empty: EMPTY_CUSTOMER_V2,
    valuesOf,
    patchOf,
    sections: [
      {
        key: 'identity',
        column: 'main',
        icon: <IconInfoCircle size={14} />,
        title: (t) => t('common.labels.basicInfo'),
        Fields: CustomerV2IdentityFields,
      },
      {
        key: 'contact',
        column: 'main',
        icon: <IconAddressBook size={14} />,
        title: (t) => t('common.labels.contact'),
        Fields: CustomerV2ContactFields,
      },
      {
        key: 'status',
        column: 'side',
        icon: <IconAdjustments size={14} />,
        title: (t) => t('__new__.01-common.labels.status'),
        Fields: CustomerV2StatusField,
      },
    ],
  },

  mobile: { Card: CustomerV2MobileCard },

  useHeaderText: useCustomerV2HeaderText,
  DetailBody: CustomerV2DetailBody,
};
