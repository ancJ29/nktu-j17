

export type SalesOrderDetailVariant = {
  
  showDeliveryNotePrint: boolean;
  
  showShippingFee: boolean;
  
  showVatTag: boolean;
  
  notesAlwaysEditable: boolean;
  
  itemMemoEditable: boolean;
  
  showShortageAlert: boolean;
  
  itemProductPhotoOnHover: boolean;
  
  clientSpecific?: {
    
    NKTU?: {
      
      deliveryMethodDrivesInternalDelivery?: boolean;
      
      internalDeliveryMethodCode?: string;
      
      externalDeliveryMethodCode?: string;
      
      hideDeliveredActionForWarehouse?: {
        deliveredStatusValue: string;
        warehouseDepartmentCode: string;
        deliveryMethods: string[];
      };
      
      splitNotes?: {
        warehouseDepartmentCode: string;
      };
    };
  };
};

export const DEFAULT_SALES_ORDER_DETAIL_VARIANT: SalesOrderDetailVariant = {
  showDeliveryNotePrint: false,
  showShortageAlert: true,
  showShippingFee: true,
  showVatTag: true,
  notesAlwaysEditable: false,
  itemMemoEditable: false,
  itemProductPhotoOnHover: false,
};

export const NKTU_SALES_ORDER_DETAIL_VARIANT: SalesOrderDetailVariant = {
  showDeliveryNotePrint: true,
  showShortageAlert: false,
  showShippingFee: false,
  showVatTag: false,
  notesAlwaysEditable: true,
  itemMemoEditable: true,
  itemProductPhotoOnHover: true,
  clientSpecific: {
    NKTU: {
      deliveryMethodDrivesInternalDelivery: true,
      internalDeliveryMethodCode: 'internal',
      externalDeliveryMethodCode: 'unknown_external',
      hideDeliveredActionForWarehouse: {
        deliveredStatusValue: 'delivered',
        warehouseDepartmentCode: 'warehouse',
        deliveryMethods: ['internal', 'freight'],
      },
      splitNotes: {
        warehouseDepartmentCode: 'warehouse',
      },
    },
  },
};
