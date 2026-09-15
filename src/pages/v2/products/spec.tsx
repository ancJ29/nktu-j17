import {
  IconAdjustments,
  IconBuildingWarehouse,
  IconCurrencyDong,
  IconInfoCircle,
  IconListDetails,
} from '@tabler/icons-react';
import { ROUTES } from '@/constants/routes';
import { useProductV2Store } from '@/stores/useProductV2Store';
import { featureFlags } from '@/utils/features';
import { perms } from '@/utils/permission';
import type { ProductV2Row } from '@/types';
import type { MasterDataFormSection, MasterDataSpec } from '../master-data';
import { ProductV2DetailBody, ProductV2DetailSide } from './ProductV2DetailBody';
import { ProductV2MobileCard } from './ProductV2MobileCard';
import {
  ProductV2AttributeFields,
  ProductV2IdentityFields,
  ProductV2PriceFields,
  ProductV2StatusField,
  ProductV2StockFields,
} from './ProductV2FormFields';
import { productV2HiddenColumns, productV2ListColumns } from './listColumns';
import { useProductV2Columns, useProductV2HeaderText } from './productV2Display';
import { useProductV2ListFilters } from './productV2Filters';
import {
  canEditPrice,
  EMPTY_PRODUCT_V2,
  patchOf,
  showInventory,
  valuesOf,
  type ProductV2FormValues,
} from './productV2Form';

const priceSection: MasterDataFormSection<ProductV2FormValues> = {
  key: 'price',
  column: 'side',
  icon: <IconCurrencyDong size={14} />,
  title: (t) => t('productsV2.form.price'),
  Fields: ProductV2PriceFields,
};

const stockSection: MasterDataFormSection<ProductV2FormValues> = {
  key: 'stock',
  column: 'side',
  icon: <IconBuildingWarehouse size={14} />,
  title: (t) => t('productsV2.form.stock'),
  Fields: ProductV2StockFields,
};

export const PRODUCT_V2_SPEC: MasterDataSpec<ProductV2Row, ProductV2FormValues> = {
  filterCacheKey: 'cmngt:product-v2-list-filters',
  routes: ROUTES.PRODUCTS_V2,
  simpleMode: featureFlags.productsV2.simpleMode,
  can: {
    create: perms.product.canCreate(),
    edit: perms.product.canEdit(),
    delete: perms.product.canDelete(),
  },
  useStore: useProductV2Store,

  text: (t) => ({
    navTitle: showInventory ? t('productsV2.titleWithInventory') : t('nav.productsV2'),
    statusLabels: {
      active: t('productsV2.status.active'),
      inactive: t('productsV2.status.inactive'),
    },
    searchPlaceholder: t('productsV2.searchPlaceholder'),
    noItems: t('productsV2.noItems'),
    detailTitle: t('productsV2.detailTitle'),
    addItem: t('productsV2.addItem'),
    editItem: t('productsV2.editItem'),
    createButton: t('productsV2.form.createButton'),
    updateButton: t('productsV2.form.updateButton'),
    nameRequired: t('productsV2.validation.nameRequired'),
    notFound: {
      title: t('productsV2.notFound.title'),
      message: t('productsV2.notFound.message'),
      back: t('productsV2.notFound.back'),
    },
    archive: {
      title: t('productsV2.archiveConfirm.title'),
      message: (name) => t('productsV2.archiveConfirm.message', { name }),
      action: t('productsV2.dangerZone.archive'),
      actionDescription: t('productsV2.dangerZone.archiveDesc'),
    },
    toggle: {
      disable: t('productsV2.dangerZone.disable'),
      enable: t('productsV2.dangerZone.enable'),
      description: t('productsV2.dangerZone.toggleDesc'),
      confirm: (name) => t('productsV2.dangerZone.toggleConfirm', { name }),
    },
    duplicate: {
      live: t('productsV2.validation.codeDuplicate'),
      archived: t('productsV2.validation.codeDuplicateArchived'),
    },
    notifications: {
      created: t('productsV2.notifications.createSuccess'),
      updated: t('productsV2.notifications.updateSuccess'),
      archived: t('productsV2.notifications.archiveSuccess'),
      error: t('productsV2.notifications.writeError'),
    },
  }),

  list: {
    ignoreColumns: ['code', 'name'],
    displayOrderColumns: {
      product: 20,
      category: 21,
      price: 30,
      onHand: 40,
      minStock: 41,
      status: 99,
    },
    searchFields: (p) => [p.name, p.code, p.extra?.category, p.unit],
    useColumns: useProductV2Columns,
    listColumnOrder: productV2ListColumns,
    hiddenColumns: productV2HiddenColumns,
    useFilters: useProductV2ListFilters,
  },

  form: {
    empty: EMPTY_PRODUCT_V2,
    valuesOf,
    patchOf,
    sections: [
      {
        key: 'identity',
        column: 'main',
        icon: <IconInfoCircle size={14} />,
        title: (t) => t('common.labels.basicInfo'),
        Fields: ProductV2IdentityFields,
      },
      ...(canEditPrice ? [priceSection] : []),
      ...(featureFlags.productsV2.inventory ? [stockSection] : []),

      {
        key: 'attributes',
        column: 'main',
        icon: <IconListDetails size={14} />,
        title: (t) => t('productsV2.form.attributes'),
        Fields: ProductV2AttributeFields,
      },
      {
        key: 'status',
        column: 'side',
        icon: <IconAdjustments size={14} />,
        title: (t) => t('__new__.01-common.labels.status'),
        Fields: ProductV2StatusField,
      },
    ],
  },

  mobile: { Card: ProductV2MobileCard },

  useHeaderText: useProductV2HeaderText,
  DetailBody: ProductV2DetailBody,
  DetailSide: ProductV2DetailSide,
};
