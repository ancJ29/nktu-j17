import type { ComponentType, ReactNode } from 'react';
import type { DataTableColumn } from '@credo/base-ui/components';
import type { UseFormReturnType } from '@mantine/form';
import type { TFunction } from 'i18next';
import type { SelectFilter } from '@/components/DesktopFilterBar';
import type { QuickFilterChip } from '@/components/QuickFilterChips';
import type { createEntityStore } from '@/stores/createEntityStore';
import type { SingleRecordRow } from '@/stores/createSingleRecordsStore';
import type { defaultNS } from '@/i18n';

export type Translate = TFunction<typeof defaultNS>;

export type MasterDataRow = SingleRecordRow & {
  code: string;
  name: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
  extra?: { isDeleted?: boolean } & Record<string, unknown>;
};

export type MasterDataFormValues = { code: string; name: string };

export type MasterDataListFiltersHook<Row> = (
  rows: readonly Row[],
  values: Readonly<Record<string, string>>,
  setValue: (key: string, value: string | null) => void,
) => {
  readonly filters: SelectFilter[];
  readonly chips?: readonly QuickFilterChip[];
  readonly predicate: (row: Row) => boolean;
};

type FlatUpdateBody = { version: string; expectedListHash?: string } & Record<string, unknown>;
type FlatCreateBody = { expectedListHash?: string } & Record<string, unknown>;

export type MasterDataStore<Row extends MasterDataRow> = ReturnType<
  typeof createEntityStore<Row, FlatUpdateBody, FlatCreateBody>
>;

export type MasterDataRoutes = {
  readonly LIST: string;
  readonly NEW: string;
  readonly DETAIL: string;
  readonly EDIT: string;
};

export type MasterDataText = {
  readonly navTitle: string;

  readonly statusLabels?: { readonly active: string; readonly inactive: string };
  readonly searchPlaceholder: string;
  readonly noItems: string;
  readonly detailTitle: string;
  readonly addItem: string;
  readonly editItem: string;
  readonly createButton: string;
  readonly updateButton: string;
  readonly nameRequired: string;
  readonly notFound: {
    readonly title: string;
    readonly message: string;
    readonly back: string;
  };
  readonly archive: {
    readonly title: string;
    readonly message: (name: string) => string;
    readonly action: string;
    readonly actionDescription: string;
  };
  readonly toggle: {
    readonly disable: string;
    readonly enable: string;
    readonly description: string;
    readonly confirm: (name: string) => string;
  };

  readonly duplicate: { readonly live: string; readonly archived: string };
  readonly notifications: {
    readonly created: string;
    readonly updated: string;
    readonly archived: string;
    readonly error: string;
  };
};

export type MasterDataFormSection<Values extends MasterDataFormValues> = {
  readonly key: string;
  readonly column: 'main' | 'side';
  readonly icon: ReactNode;
  readonly title: (t: Translate) => string;
  readonly Fields: ComponentType<{
    readonly form: UseFormReturnType<Values>;
    readonly isEditing: boolean;
  }>;
};

export type MasterDataHeaderText = {
  readonly secondary?: string;

  readonly tag?: string;
};

export type MasterDataSpec<Row extends MasterDataRow, Values extends MasterDataFormValues> = {
  readonly filterCacheKey: string;
  readonly routes: MasterDataRoutes;

  readonly simpleMode: boolean;

  readonly can: {
    readonly create: boolean;
    readonly edit: boolean;
    readonly delete: boolean;
  };
  readonly useStore: MasterDataStore<Row>;
  readonly text: (t: Translate) => MasterDataText;
  readonly list: {
    readonly searchFields: (row: Row) => Array<string | undefined | null>;

    readonly secondaryOf?: (row: Row) => string | undefined;

    readonly useColumns: (rows: readonly Row[]) => Array<DataTableColumn<Row>>;

    readonly ignoreColumns?: ReadonlyArray<string>;

    readonly displayOrderColumns?: Readonly<Record<string, number>>;

    readonly listColumnOrder?: readonly string[];

    readonly hiddenColumns?: readonly string[];

    readonly useFilters?: MasterDataListFiltersHook<Row>;
  };
  readonly form: {
    readonly empty: Values;
    readonly valuesOf: (row: Row) => Values;
    readonly patchOf: (values: Values, editing: Row | null) => Record<string, unknown>;
    readonly sections: ReadonlyArray<MasterDataFormSection<Values>>;
  };

  readonly mobile?: {
    readonly Card: ComponentType<{ readonly row: Row }>;
  };
  readonly useHeaderText: (row: Row) => MasterDataHeaderText;
  readonly DetailBody: ComponentType<{ readonly row: Row }>;

  readonly DetailSide?: ComponentType<{ readonly row: Row }>;
};
