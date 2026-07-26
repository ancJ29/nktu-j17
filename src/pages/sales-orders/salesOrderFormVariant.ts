

export type SalesOrderFormVariant = {
  
  excelMode: 'sku' | 'by-name';
  
  defaultDeliveryMethod: string;
  
  showAddressPicker: boolean;
  
  showInternalDeliverySwitch: boolean;
  
  showVatShippingToggles: boolean;
  
  showVatTag: boolean;
  
  showShippingFee: boolean;
  
  showDownloadTemplateButton: boolean;
  
  headerLayout: 'twoColumn' | 'compactFourColumn';
  
  customerPicker: 'selector' | 'nameCodeSelect';
  
  clientSpecific?: {
    
    NKTU?: {
      
      deliveryMethodDrivesInternalDelivery?: boolean;
      
      splitNotes?: {
        warehouseDepartmentCode: string;
      };
    };
  };
};

export const DEFAULT_SALES_ORDER_FORM_VARIANT: SalesOrderFormVariant = {
  excelMode: 'sku',
  defaultDeliveryMethod: '',
  showAddressPicker: true,
  showInternalDeliverySwitch: true,
  showVatShippingToggles: true,
  showVatTag: true,
  showShippingFee: true,
  showDownloadTemplateButton: true,
  headerLayout: 'twoColumn',
  customerPicker: 'selector',
};

export const NKTU_SALES_ORDER_FORM_VARIANT: SalesOrderFormVariant = {
  excelMode: 'by-name',
  defaultDeliveryMethod: 'internal',
  showAddressPicker: false,
  showInternalDeliverySwitch: false,
  showVatShippingToggles: false,
  showVatTag: false,
  showShippingFee: false,
  showDownloadTemplateButton: false,
  headerLayout: 'compactFourColumn',
  customerPicker: 'nameCodeSelect',
  clientSpecific: {
    NKTU: {
      deliveryMethodDrivesInternalDelivery: true,
      splitNotes: {
        warehouseDepartmentCode: 'warehouse',
      },
    },
  },
};
