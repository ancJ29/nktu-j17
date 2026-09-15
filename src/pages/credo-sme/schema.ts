import z from 'zod';
import type { CredoSmeAppConfig } from '@credo/connectors/types';

const OptionSchema = z.looseObject({
  value: z.string(),
  label: z.record(z.string(), z.string()),
});

const ModuleOverlaySchema = z
  .looseObject({
    canView: z.boolean().optional(),
    canCreate: z.boolean().optional(),
    canEdit: z.boolean().optional(),
    canDelete: z.boolean().optional(),
    actions: z.looseObject({}).optional(),
  })
  .optional();

const OptionWithPermissionsSchema = OptionSchema.extend({
  permissions: z.looseObject({}).optional(),
});

export const CredoAppConfigSchema = z.looseObject({
  date: z.coerce.date().optional().describe('The date and time the config was updated'),
  version: z.string().describe('The version of the config'),

  schemaVersion: z.number().optional().describe('The schema version of the config'),
  features: z
    .looseObject({
      employees: z
        .looseObject({
          enabled: z.boolean().optional(),
          selfManage: z.boolean().optional(),

          v2: z.boolean().optional(),
          email: z.boolean().optional(),
          position: z.boolean().optional(),
          department: z.boolean().optional(),
          allowLogin: z.boolean().optional(),
          bulkImport: z.boolean().optional(),
          avatar: z.boolean().optional(),
          startDate: z.boolean().optional(),
          address: z.boolean().optional(),
          dateOfBirth: z.boolean().optional(),
          driverProfile: z.boolean().optional(),
          codePrefix: z.string().optional(),
          codePadLength: z.number().int().min(0).max(12).optional(),

          departmentOptions: z.array(OptionWithPermissionsSchema).optional(),

          positionOptions: z.array(OptionSchema).optional(),
        })
        .optional(),

      activityLog: z.looseObject({ enabled: z.boolean().optional() }).optional(),
      lookupV2: z
        .looseObject({
          enabled: z.boolean().optional().describe('Show the Meta-data manager'),
          enabledCategories: z
            .array(z.string())
            .optional()
            .describe('The category subset — see `lookupFields.ts`'),
        })
        .optional(),
      vendorsV2: z
        .looseObject({
          enabled: z.boolean().optional().describe('Show the credo-sme vendor pages'),
          simpleMode: z
            .boolean()
            .optional()
            .describe('Edit in a modal and read in a drawer, instead of on their own pages'),
          codePrefix: z.string().optional().describe('Prefix for auto-generated v2 vendor codes'),
          codePadLength: z
            .number()
            .int()
            .min(0)
            .max(12)
            .optional()
            .describe('Zero-pad width for the numeric part of the code'),
          listColumns: z
            .array(z.string())
            .optional()
            .describe('Pinned sequence for the vendor table'),
          hiddenColumns: z
            .array(z.string())
            .optional()
            .describe('Columns the vendor table never draws — hiding wins over pinning'),
        })
        .optional(),
      materialsV2: z
        .looseObject({
          enabled: z.boolean().optional().describe('Show the credo-sme material pages'),
          simpleMode: z
            .boolean()
            .optional()
            .describe('Edit in a modal and read in a drawer, instead of on their own pages'),
          codePrefix: z.string().optional().describe('Prefix for auto-generated v2 material codes'),
          codePadLength: z
            .number()
            .int()
            .min(0)
            .max(12)
            .optional()
            .describe('Zero-pad width for the numeric part of the code'),

          unitCategory: z
            .string()
            .optional()
            .describe("'material-unit' (dedicated) or 'unit' (shared with products)"),
          inventory: z
            .boolean()
            .optional()
            .describe('Show stock on the material list and detail page'),
          listColumns: z
            .array(z.string())
            .optional()
            .describe('Pinned sequence for the material table'),
          hiddenColumns: z
            .array(z.string())
            .optional()
            .describe('Columns the material table never draws — hiding wins over pinning'),
        })
        .optional(),
      goodsReceiptsV2: z
        .looseObject({
          enabled: z.boolean().optional().describe('Show the credo-sme goods-receipt pages'),
          defaultRangeDays: z
            .number()
            .int()
            .min(1)
            .max(92)
            .optional()
            .describe('Trailing days the list opens on (the sync caps at 92)'),
          codePrefix: z.string().optional().describe('Receipt-number prefix, e.g. GR-'),
          codePadLength: z.number().optional().describe('Zero-pad width for the daily sequence'),

          statusFlow: z
            .unknown()
            .optional()
            .describe('Client statuses + transition matrix; absent = the default flow'),
          defaultListStatuses: z
            .array(z.string())
            .optional()
            .describe("The receipt list's resting status selection"),

          customFields: z
            .unknown()
            .optional()
            .describe("The client's own fields on a receipt; absent = none"),
          listColumns: z
            .array(z.string())
            .optional()
            .describe('Pinned sequence for the receipt table'),
          hiddenColumns: z
            .array(z.string())
            .optional()
            .describe('Columns the receipt table never draws — hiding wins over pinning'),
        })
        .optional(),

      salesOrdersV2: z
        .looseObject({
          enabled: z.boolean().optional().describe('Show the credo-sme sales-order pages'),
          defaultRangeDays: z
            .number()
            .int()
            .min(1)
            .max(92)
            .optional()
            .describe('Trailing days the list opens on (the sync caps at 92)'),
          codePrefix: z.string().optional().describe('Order-number prefix, e.g. SO-'),
          codePadLength: z.number().optional().describe('Zero-pad width for the daily sequence'),
          statusFlow: z
            .unknown()
            .optional()
            .describe('Client statuses + transition matrix; absent = the default flow'),
          defaultListStatuses: z
            .array(z.string())
            .optional()
            .describe("The order list's resting status selection"),
          customFields: z
            .unknown()
            .optional()
            .describe("The client's own fields on an order; absent = none"),
          paymentTracking: z
            .boolean()
            .optional()
            .describe('Record what an order has been paid (needs canManagePayment to write)'),
          autoCompleteOnFullDelivery: z
            .boolean()
            .optional()
            .describe('Close an order by itself once its notes have delivered every line'),
          listColumns: z
            .array(z.string())
            .optional()
            .describe('Pinned sequence for the order table'),
          hiddenColumns: z
            .array(z.string())
            .optional()
            .describe('Columns the order table never draws — hiding wins over pinning'),
        })
        .optional(),
      deliveryNotesV2: z
        .looseObject({
          enabled: z.boolean().optional().describe('Show the credo-sme delivery-note pages'),
          defaultRangeDays: z
            .number()
            .int()
            .min(1)
            .max(92)
            .optional()
            .describe('Trailing days the list opens on (the sync caps at 92)'),
          codePrefix: z.string().optional().describe('Note-number prefix, e.g. DN-'),
          codePadLength: z.number().optional().describe('Zero-pad width for the daily sequence'),
          statusFlow: z
            .unknown()
            .optional()
            .describe('Client statuses + transition matrix; absent = the default flow'),
          defaultListStatuses: z
            .array(z.string())
            .optional()
            .describe("The note list's resting status selection"),
          customFields: z
            .unknown()
            .optional()
            .describe("The client's own fields on a note; absent = none"),
          listColumns: z
            .array(z.string())
            .optional()
            .describe('Pinned sequence for the note table'),
          hiddenColumns: z
            .array(z.string())
            .optional()
            .describe('Columns the note table never draws — hiding wins over pinning'),
          deliveryPhotoRequired: z
            .boolean()
            .optional()
            .describe('Internal deliveries must attach a photo before completing (BFF-enforced)'),
        })
        .optional(),
      permissionManagement: z
        .looseObject({
          useServerPermissions: z
            .boolean()
            .optional()
            .describe("Gate on credo-sme's permission build instead of the browser's"),
        })
        .optional(),
      productsV2: z
        .looseObject({
          enabled: z.boolean().optional().describe('Show the credo-sme product pages'),
          simpleMode: z
            .boolean()
            .optional()
            .describe('Edit in a modal and read in a drawer, instead of on their own pages'),
          codePrefix: z.string().optional().describe('Prefix for auto-generated v2 product codes'),
          codePadLength: z
            .number()
            .int()
            .min(0)
            .max(12)
            .optional()
            .describe('Zero-pad width for the numeric part of the code'),
          priceManagement: z
            .boolean()
            .optional()
            .describe('Reveal the price field to holders of product.canViewPrice'),
          productPhoto: z
            .boolean()
            .optional()
            .describe('Offer photo uploads on the product detail page (needs simple mode off)'),
          inventory: z
            .boolean()
            .optional()
            .describe('Show stock on the product list and detail page'),
          incomingColumn: z.boolean().optional().describe('Inbound stock in its own column'),
          incomingReceipts: z.boolean().optional().describe('Receipts table on the product page'),
          outgoingOrders: z
            .boolean()
            .optional()
            .describe('Holding sales orders table on the product page'),
          listColumns: z
            .array(z.string())
            .optional()
            .describe('Pinned sequence for the product table'),
          hiddenColumns: z
            .array(z.string())
            .optional()
            .describe('Columns the product table never draws — hiding wins over pinning'),
        })
        .optional(),
      customersV2: z
        .looseObject({
          enabled: z.boolean().optional().describe('Show the credo-sme customer pages'),
          simpleMode: z
            .boolean()
            .optional()
            .describe('Edit in a modal and read in a drawer, instead of on their own pages'),
          codePrefix: z.string().optional().describe('Prefix for auto-generated v2 customer codes'),
          codePadLength: z
            .number()
            .int()
            .min(0)
            .max(12)
            .optional()
            .describe('Zero-pad width for the numeric part of the code'),
          listColumns: z
            .array(z.string())
            .optional()
            .describe('Pinned sequence for the customer table'),
          hiddenColumns: z
            .array(z.string())
            .optional()
            .describe('Columns the customer table never draws — hiding wins over pinning'),
        })
        .optional(),
    })
    .optional(),

  permissions: z
    .looseObject({
      employee: ModuleOverlaySchema,
      vendor: ModuleOverlaySchema,
      lookupV2: ModuleOverlaySchema,
    })
    .optional(),
  app: z.looseObject({
    name: z.string().describe('The name of the app'),

    nameHtml: z.string().optional().describe('The name of the app, as inline HTML'),
    description: z.string().optional().describe('The description of the app'),
    logoUrl: z.string().optional().describe('The URL of the logo'),
    logoDarkBgUrl: z.string().optional().describe('The URL of the logo for dark background'),
    faviconUrl: z.string().optional().describe('The URL of the favicon'),
    pwaIcon192Url: z.string().optional().describe('The URL of the PWA icon 192x192'),
    pwaIcon512Url: z.string().optional().describe('The URL of the PWA icon 512x512'),
    pwaIconMaskableUrl: z.string().optional().describe('The URL of the PWA icon maskable 512x512'),
  }),

  themeConfig: z
    .looseObject({
      mainColor: z.string().optional(),
      customPalette: z.array(z.string()).optional(),
    })
    .optional(),

  layout: z
    .looseObject({
      navbar: z
        .looseObject({
          width: z.number().optional(),
          displayIconWhenCollapsed: z.boolean().optional(),
          variant: z.string().optional(),
        })
        .optional(),
      header: z.looseObject({ variant: z.string().optional() }).optional(),
    })
    .optional(),

  navigationV2: z
    .looseObject({
      pc: z.array(z.looseObject({ id: z.string() })),
    })
    .optional(),
  // will add more fields here later
});

export type CredoAppConfig = z.infer<typeof CredoAppConfigSchema>;

const _parsedIsSendable: CredoSmeAppConfig = {} as CredoAppConfig;

const _wireIsParsable: z.input<typeof CredoAppConfigSchema> = {} as CredoSmeAppConfig;
void _parsedIsSendable;
void _wireIsParsable;
