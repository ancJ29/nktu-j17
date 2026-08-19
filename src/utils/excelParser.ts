import * as XLSX from 'xlsx';
import { LITRE_DECIMAL_SCALE } from '@/utils/number';
import { computeRefuelTotals, refuelConsumption } from '@/utils/refuelStats';
import type { MaintenanceLogExtra, Material, OperationLog, Product } from '@/types';
import {
  itemQuantity,
  maintenanceLineTotal,
  maintenanceVat,
  readMaintenanceItems,
} from '@/pages/assets/truck/maintenanceItems';

export class ExcelParseError extends Error {
  readonly missing: string[];
  constructor(missing: string[]) {
    super(`Missing required column(s): ${missing.join(', ')}`);
    this.name = 'ExcelParseError';
    this.missing = missing;
  }
}

export type BulkEmployee = {
  name: string;
  code?: string;
  email?: string;
  phone?: string;
  personalPhoneNumber?: string;
  position?: string;
  department?: string;

  gender?: string;
};

const REQUIRED_EMPLOYEE_FIELDS: ReadonlyArray<keyof BulkEmployee> = ['name'];

export type EmployeeTemplateOptions = {
  language?: string;
  hasEmail?: boolean;
  hasPosition?: boolean;
  hasDepartment?: boolean;

  departments?: string[];
  positions?: string[];
};

export const parseEmployeeExcelFile = async (file: File): Promise<BulkEmployee[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener('load', (event) => {
      try {
        const data = event.target?.result;
        if (!data) {
          reject(new Error('Failed to read file'));
          return;
        }

        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const sheetData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: '',
        }) as string[][];

        if (sheetData.length < 2) {
          reject(new Error('File must contain at least a header row and one data row'));
          return;
        }

        const headers = sheetData[0].map((h) => String(h).trim().toLowerCase());
        const employees: BulkEmployee[] = [];

        const headerMapping: Record<string, keyof BulkEmployee> = {
          name: 'name',
          code: 'code',
          email: 'email',
          phone: 'phone',
          'work phone': 'phone',
          'personal phone': 'personalPhoneNumber',
          position: 'position',
          department: 'department',

          tên: 'name',
          'họ tên': 'name',
          mã: 'code',
          'mã nhân viên': 'code',
          'điện thoại': 'phone',
          'số điện thoại': 'phone',
          'sđt cá nhân': 'personalPhoneNumber',
          'số điện thoại cá nhân': 'personalPhoneNumber',
          'chức vụ': 'position',
          'phòng ban': 'department',
          'bộ phận': 'department',

          gender: 'gender',
          sex: 'gender',
          'giới tính': 'gender',
          giới: 'gender',
        };

        const presentFields = new Set<keyof BulkEmployee>();
        for (const h of headers) {
          const f = headerMapping[h];
          if (f) presentFields.add(f);
        }
        const missing = REQUIRED_EMPLOYEE_FIELDS.filter((f) => !presentFields.has(f));
        if (missing.length > 0) {
          reject(new ExcelParseError(missing));
          return;
        }

        for (let index = 1; index < sheetData.length; index++) {
          const values = sheetData[index].map((v) => String(v).trim());

          if (values.every((v) => !v)) continue;

          const employee: BulkEmployee = { name: '' };

          for (const [headerIndex, header] of headers.entries()) {
            const value = values[headerIndex];
            if (!value) continue;

            const fieldName = headerMapping[header];
            if (!fieldName) continue;

            employee[fieldName] = value;
          }

          if (employee.name) {
            employees.push(employee);
          }
        }

        resolve(employees);
      } catch (error) {
        reject(
          new Error(
            `Failed to parse Excel file: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
          ),
        );
      }
    });

    reader.addEventListener('error', () => {
      reject(new Error('Failed to read file'));
    });

    reader.readAsArrayBuffer(file);
  });
};

type SampleRow = {
  name: string;
  code: string;
  email: string;
  phone: string;
  personalPhone: string;
  position: string;
  department: string;
};

const SAMPLE_ROWS_VI: SampleRow[] = [
  {
    name: 'Nguyễn Văn An',
    code: 'NV001',
    email: 'an.nguyen@example.com',
    phone: '0901234567',
    personalPhone: '0911111111',
    position: 'Quản lý',
    department: 'Kinh doanh',
  },
  {
    name: 'Trần Thị Bình',
    code: 'NV002',
    email: 'binh.tran@example.com',
    phone: '0987654321',
    personalPhone: '0922222222',
    position: 'Nhân viên',
    department: 'Marketing',
  },
  {
    name: 'Lê Văn Chi',
    code: 'NV003',
    email: 'chi.le@example.com',
    phone: '0912345678',
    personalPhone: '0933333333',
    position: 'Chuyên viên',
    department: 'Kỹ thuật',
  },
];

const SAMPLE_ROWS_EN: SampleRow[] = [
  {
    name: 'John Doe',
    code: 'EMP001',
    email: 'john.doe@example.com',
    phone: '555-1234',
    personalPhone: '555-1111',
    position: 'Manager',
    department: 'Sales',
  },
  {
    name: 'Jane Smith',
    code: 'EMP002',
    email: 'jane.smith@example.com',
    phone: '555-5678',
    personalPhone: '555-2222',
    position: 'Staff',
    department: 'Marketing',
  },
  {
    name: 'Mike Johnson',
    code: 'EMP003',
    email: 'mike.johnson@example.com',
    phone: '555-9012',
    personalPhone: '555-3333',
    position: 'Senior',
    department: 'Engineering',
  },
];

export type BulkProduct = {
  name: string;

  code?: string;

  unit?: string;
  sku?: string;
  barcode?: string;
  description?: string;

  category?: string;

  tags?: string[];

  price?: number;

  basePrice?: number;

  minInventoryValue?: number;

  minInventoryUnit?: string;

  noInventory?: boolean;

  hiddenFromInventoryList?: boolean;
};

const TRUTHY_CELLS = new Set(['yes', 'y', 'true', '1', 'x', 'có', 'co']);
const FALSY_CELLS = new Set(['no', 'n', 'false', '0', 'không', 'khong', 'ko']);

const isTruthyCell = (raw: string) => TRUTHY_CELLS.has(raw.trim().toLowerCase());
const isFalsyCell = (raw: string) => FALSY_CELLS.has(raw.trim().toLowerCase());

const FLAG_HEADERS: Record<
  string,
  { field: 'noInventory' | 'hiddenFromInventoryList'; truthySets: boolean }
> = {
  'inventory-managed': { field: 'noInventory', truthySets: false },
  'inventory managed': { field: 'noInventory', truthySets: false },
  'quản lý tồn kho': { field: 'noInventory', truthySets: false },
  'shown in inventory list': { field: 'hiddenFromInventoryList', truthySets: false },
  'hiển thị trong danh sách tồn kho': { field: 'hiddenFromInventoryList', truthySets: false },

  'not inventory-managed': { field: 'noInventory', truthySets: true },
  'not inventory managed': { field: 'noInventory', truthySets: true },
  'no inventory': { field: 'noInventory', truthySets: true },
  'không quản lý tồn kho': { field: 'noInventory', truthySets: true },
  'hidden from inventory list': { field: 'hiddenFromInventoryList', truthySets: true },
  'hide from inventory list': { field: 'hiddenFromInventoryList', truthySets: true },
  'ẩn khỏi danh sách tồn kho': { field: 'hiddenFromInventoryList', truthySets: true },
};

export type ProductTemplateOptions = {
  language?: string;

  hasPrice?: boolean;

  hasBarcode?: boolean;

  hasHideFromInventoryList?: boolean;

  products?: ReadonlyArray<Product>;

  categoryLabels?: Record<string, string>;

  unitLabels?: Record<string, string>;

  categories?: string[];

  units?: string[];
};

const REQUIRED_PRODUCT_FIELDS: ReadonlyArray<keyof BulkProduct> = ['name'];

export const parseProductExcelFile = async (file: File): Promise<BulkProduct[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener('load', (event) => {
      try {
        const data = event.target?.result;
        if (!data) {
          reject(new Error('Failed to read file'));
          return;
        }

        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const sheetData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: '',
        }) as string[][];

        if (sheetData.length < 2) {
          reject(new Error('File must contain at least a header row and one data row'));
          return;
        }

        const headers = sheetData[0].map((h) => String(h).trim().toLowerCase());
        const products: BulkProduct[] = [];

        const headerMapping: Record<string, keyof BulkProduct> = {
          name: 'name',
          code: 'code',
          unit: 'unit',
          sku: 'sku',
          barcode: 'barcode',
          description: 'description',
          category: 'category',
          tags: 'tags',
          tag: 'tags',
          price: 'price',
          'selling price': 'price',
          'base price': 'basePrice',
          cost: 'basePrice',

          'min stock': 'minInventoryValue',
          'minimum stock': 'minInventoryValue',
          'min inventory': 'minInventoryValue',
          'minimum inventory': 'minInventoryValue',
          'min stock unit': 'minInventoryUnit',
          'minimum stock unit': 'minInventoryUnit',

          tên: 'name',
          'tên sản phẩm': 'name',
          mã: 'code',
          'mã sản phẩm': 'code',
          'đơn vị': 'unit',
          'mã vạch': 'barcode',
          'mô tả': 'description',
          'danh mục': 'category',
          thẻ: 'tags',
          giá: 'price',
          'giá bán': 'price',
          'giá vốn': 'basePrice',
          'giá gốc': 'basePrice',
          'tồn kho tối thiểu': 'minInventoryValue',
          'đơn vị tồn kho tối thiểu': 'minInventoryUnit',
        };

        const presentFields = new Set<keyof BulkProduct>();
        for (const h of headers) {
          const f = headerMapping[h];
          if (f) presentFields.add(f);
        }
        const missing = REQUIRED_PRODUCT_FIELDS.filter((f) => !presentFields.has(f));
        if (missing.length > 0) {
          reject(new ExcelParseError(missing));
          return;
        }

        const numericFields = new Set<keyof BulkProduct>([
          'price',
          'basePrice',
          'minInventoryValue',
        ]);

        for (let index = 1; index < sheetData.length; index++) {
          const values = sheetData[index].map((v) => String(v).trim());

          if (values.every((v) => !v)) continue;

          const product: BulkProduct = { name: '' };

          for (const [headerIndex, header] of headers.entries()) {
            const value = values[headerIndex];
            if (!value) continue;

            const flag = FLAG_HEADERS[header];
            if (flag) {
              const setsFlag = flag.truthySets ? isTruthyCell(value) : isFalsyCell(value);
              if (setsFlag) product[flag.field] = true;
              continue;
            }

            const fieldName = headerMapping[header];
            if (!fieldName) continue;

            if (fieldName === 'tags') {
              const list = value
                .split(';')
                .map((s) => s.trim())
                .filter(Boolean);
              if (list.length > 0) product.tags = list;
              continue;
            }

            if (numericFields.has(fieldName)) {
              if (fieldName === 'minInventoryValue') {
                const m = value.match(/^([\d.,]+)\s*(.*)$/);
                if (m) {
                  const n = Number(m[1].replace(/,/g, ''));
                  if (Number.isFinite(n) && n > 0) {
                    product.minInventoryValue = n;
                    const tail = m[2].trim();
                    if (tail && !product.minInventoryUnit) {
                      product.minInventoryUnit = tail;
                    }
                  }
                }
                continue;
              }
              const n = Number(value.replace(/,/g, ''));
              if (Number.isFinite(n) && n >= 0) {
                (product[fieldName] as number) = n;
              }
              continue;
            }

            product[fieldName] = value as never;
          }

          if (product.name) {
            products.push(product);
          }
        }

        resolve(products);
      } catch (error) {
        reject(
          new Error(
            `Failed to parse Excel file: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
          ),
        );
      }
    });

    reader.addEventListener('error', () => {
      reject(new Error('Failed to read file'));
    });

    reader.readAsArrayBuffer(file);
  });
};

type ProductSampleRow = {
  name: string;
  unit: string;
  sku: string;
  barcode: string;
  description: string;
  category: string;
  price: string;
  basePrice: string;
  minInventoryValue: string;
  minInventoryUnit: string;

  inventoryManaged: string;

  shownInInventoryList: string;
};

const PRODUCT_SAMPLE_ROWS_VI: ProductSampleRow[] = [
  {
    name: 'Cà phê đen đá',
    unit: 'ly',
    sku: 'SKU-COFFEE-01',
    barcode: '8936000000101',
    description: 'Cà phê pha phin truyền thống',
    category: 'Đồ uống',
    price: '25000',
    basePrice: '15000',
    minInventoryValue: '20',
    minInventoryUnit: 'ly',
    inventoryManaged: '',
    shownInInventoryList: '',
  },
  {
    name: 'Bánh mì thịt nguội',
    unit: 'cái',
    sku: 'SKU-SANDWICH-02',
    barcode: '8936000000102',
    description: 'Bánh mì giòn với thịt nguội và rau',
    category: 'Thức ăn',
    price: '35000',
    basePrice: '20000',
    minInventoryValue: '10',
    minInventoryUnit: 'cái',
    inventoryManaged: '',
    shownInInventoryList: '',
  },
  {
    name: 'Nước suối Lavie 500ml',
    unit: 'chai',
    sku: 'SKU-WATER-03',
    barcode: '8936000000103',
    description: 'Nước khoáng thiên nhiên',
    category: 'Đồ uống',
    price: '10000',
    basePrice: '6000',
    minInventoryValue: '50',
    minInventoryUnit: 'chai',
    inventoryManaged: '',
    shownInInventoryList: '',
  },
];

const PRODUCT_SAMPLE_ROWS_EN: ProductSampleRow[] = [
  {
    name: 'Black Iced Coffee',
    unit: 'cup',
    sku: 'SKU-COFFEE-01',
    barcode: '0123456789012',
    description: 'Traditional Vietnamese filter coffee',
    category: 'Beverages',
    price: '25000',
    basePrice: '15000',
    minInventoryValue: '20',
    minInventoryUnit: 'cup',
    inventoryManaged: '',
    shownInInventoryList: '',
  },
  {
    name: 'Ham Sandwich',
    unit: 'piece',
    sku: 'SKU-SANDWICH-02',
    barcode: '0123456789013',
    description: 'Crusty bread with ham and vegetables',
    category: 'Food',
    price: '35000',
    basePrice: '20000',
    minInventoryValue: '10',
    minInventoryUnit: 'piece',
    inventoryManaged: '',
    shownInInventoryList: '',
  },
  {
    name: 'Bottled Water 500ml',
    unit: 'bottle',
    sku: 'SKU-WATER-03',
    barcode: '0123456789014',
    description: 'Natural mineral water',
    category: 'Beverages',
    price: '10000',
    basePrice: '6000',
    minInventoryValue: '50',
    minInventoryUnit: 'bottle',
    inventoryManaged: '',
    shownInInventoryList: '',
  },
];

export const generateProductExcelTemplate = ({
  language,
  hasPrice = true,
  hasBarcode = true,
  hasHideFromInventoryList = false,
  products,
  categoryLabels,
  unitLabels,
  categories,
  units,
}: ProductTemplateOptions = {}) => {
  const isVietnamese = language === 'vi';

  type ColumnKey = keyof ProductSampleRow;
  type Column = { key: ColumnKey; header: string; width: number };

  const labels: Record<ColumnKey, string> = isVietnamese
    ? {
        name: 'Tên sản phẩm',
        unit: 'Đơn vị',
        sku: 'SKU',
        barcode: 'Mã vạch',
        description: 'Mô tả',
        category: 'Danh mục',
        price: 'Giá bán',
        basePrice: 'Giá vốn',
        minInventoryValue: 'Tồn kho tối thiểu',
        minInventoryUnit: 'Đơn vị tồn kho tối thiểu',
        inventoryManaged: 'Quản lý tồn kho',
        shownInInventoryList: 'Hiển thị trong danh sách tồn kho',
      }
    : {
        name: 'Name',
        unit: 'Unit',
        sku: 'SKU',
        barcode: 'Barcode',
        description: 'Description',
        category: 'Category',
        price: 'Price',
        basePrice: 'Base Price',
        minInventoryValue: 'Min stock',
        minInventoryUnit: 'Min stock unit',
        inventoryManaged: 'Inventory-managed',
        shownInInventoryList: 'Shown in inventory list',
      };

  const columns: Column[] = [
    { key: 'name', header: labels.name, width: 28 },
    { key: 'unit', header: labels.unit, width: 10 },

    { key: 'sku', header: labels.sku, width: 18 },
    ...(hasBarcode ? [{ key: 'barcode' as const, header: labels.barcode, width: 16 }] : []),
    { key: 'description', header: labels.description, width: 36 },
    { key: 'category', header: labels.category, width: 18 },

    ...(hasPrice
      ? [
          { key: 'price' as const, header: labels.price, width: 12 },
          { key: 'basePrice' as const, header: labels.basePrice, width: 12 },
        ]
      : []),
    { key: 'minInventoryValue', header: labels.minInventoryValue, width: 14 },
    { key: 'minInventoryUnit', header: labels.minInventoryUnit, width: 16 },
    { key: 'inventoryManaged', header: labels.inventoryManaged, width: 18 },
    ...(hasHideFromInventoryList
      ? [
          {
            key: 'shownInInventoryList' as const,
            header: labels.shownInInventoryList,
            width: 26,
          },
        ]
      : []),
  ];

  const yes = isVietnamese ? 'Có' : 'Yes';
  const no = isVietnamese ? 'Không' : 'No';

  const flagCell = (flagOn: boolean | undefined) => (flagOn ? no : yes);
  const resolveLabel = (val: string | undefined, map?: Record<string, string>) =>
    val ? (map?.[val] ?? val) : '';

  const realRows: ProductSampleRow[] = (products ?? [])
    .filter((p) => !p.extra?.isDeleted)
    .map((p) => {
      const e = p.extra ?? {};
      const min = e.minimumInventory;
      return {
        name: p.name,
        unit: resolveLabel(p.unit, unitLabels),
        sku: e.sku ?? '',
        barcode: e.barcode ?? '',
        description: p.description ?? '',
        category: resolveLabel(e.category, categoryLabels),
        price: typeof p.price === 'number' && p.price > 0 ? String(p.price) : '',
        basePrice: typeof e.basePrice === 'number' && e.basePrice > 0 ? String(e.basePrice) : '',
        minInventoryValue: typeof min?.value === 'number' && min.value > 0 ? String(min.value) : '',
        minInventoryUnit: resolveLabel(min?.unit, unitLabels),
        inventoryManaged: flagCell(e.noInventory),
        shownInInventoryList: flagCell(e.hiddenFromInventoryList),
      };
    });

  const sampleSource = isVietnamese ? PRODUCT_SAMPLE_ROWS_VI : PRODUCT_SAMPLE_ROWS_EN;
  const sampleUnit = (i: number) => (units?.length ? units[i % units.length] : undefined);
  const fallbackRows = sampleSource.map((row, i) => ({
    ...row,
    unit: sampleUnit(i) ?? row.unit,
    minInventoryUnit: sampleUnit(i) ?? row.minInventoryUnit,
    category: categories?.[i] ?? row.category,
    inventoryManaged: yes,
    shownInInventoryList: yes,
  }));

  const bodyRows = realRows.length > 0 ? realRows : fallbackRows;

  const headerRow = columns.map((c) => c.header);
  const dataRows = bodyRows.map((row) => columns.map((c) => row[c.key]));

  const worksheet = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);
  worksheet['!cols'] = columns.map((c) => ({ width: c.width }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, isVietnamese ? 'Sản phẩm' : 'Products');

  XLSX.writeFile(workbook, 'products_template.xlsx');
};

export type BulkMaterial = {
  name: string;

  code?: string;

  units?: string[];

  category?: string;

  costPrice?: number;

  minimumStock?: number;
  specification?: string;
  description?: string;
  memo?: string;
  tags?: string[];

  isActive?: boolean;
};

export type MaterialTemplateOptions = {
  language?: string;

  hasCategory?: boolean;
  hasPricing?: boolean;
  hasMinimumStock?: boolean;
  hasSpecification?: boolean;
  hasDescription?: boolean;
  hasMemo?: boolean;
  hasTags?: boolean;

  multiUnit?: boolean;

  materials?: ReadonlyArray<Material>;

  unitLabels?: Record<string, string>;

  categoryLabels?: Record<string, string>;

  categories?: string[];
  units?: string[];
};

const REQUIRED_MATERIAL_FIELDS: ReadonlyArray<keyof BulkMaterial> = ['name', 'code'];

export const parseMaterialExcelFile = async (file: File): Promise<BulkMaterial[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener('load', (event) => {
      try {
        const data = event.target?.result;
        if (!data) {
          reject(new Error('Failed to read file'));
          return;
        }

        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const sheetData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: '',
        }) as string[][];

        if (sheetData.length < 2) {
          reject(new Error('File must contain at least a header row and one data row'));
          return;
        }

        const headers = sheetData[0].map((h) => String(h).trim().toLowerCase());
        const materials: BulkMaterial[] = [];

        const headerMapping: Record<string, keyof BulkMaterial> = {
          name: 'name',
          'material name': 'name',
          code: 'code',
          'material code': 'code',
          unit: 'units',
          units: 'units',
          category: 'category',
          price: 'costPrice',
          cost: 'costPrice',
          'cost price': 'costPrice',
          'min stock': 'minimumStock',
          'minimum stock': 'minimumStock',
          specification: 'specification',
          'packaging spec': 'specification',
          'packaging specification': 'specification',
          description: 'description',
          memo: 'memo',
          note: 'memo',
          tags: 'tags',
          active: 'isActive',
          status: 'isActive',

          tên: 'name',
          'tên vật tư': 'name',
          mã: 'code',
          'mã vật tư': 'code',
          'đơn vị': 'units',
          'đơn vị tính': 'units',
          'danh mục': 'category',
          giá: 'costPrice',
          'giá vốn': 'costPrice',
          'tồn kho tối thiểu': 'minimumStock',
          'quy cách': 'specification',
          'quy cách đóng gói': 'specification',
          'mô tả': 'description',
          'ghi chú': 'memo',
          thẻ: 'tags',
          'trạng thái': 'isActive',
          'đang sử dụng': 'isActive',
        };

        const presentFields = new Set<keyof BulkMaterial>();
        for (const h of headers) {
          const f = headerMapping[h];
          if (f) presentFields.add(f);
        }
        const missing = REQUIRED_MATERIAL_FIELDS.filter((f) => !presentFields.has(f));
        if (missing.length > 0) {
          reject(new ExcelParseError(missing));
          return;
        }

        const numericFields = new Set<keyof BulkMaterial>(['costPrice', 'minimumStock']);

        const splitList = (raw: string) =>
          raw
            .split(/[,;]/)
            .map((s) => s.trim())
            .filter(Boolean);

        for (let index = 1; index < sheetData.length; index++) {
          const values = sheetData[index].map((v) => String(v).trim());
          if (values.every((v) => !v)) continue;

          const material: BulkMaterial = { name: '' };

          for (const [headerIndex, header] of headers.entries()) {
            const value = values[headerIndex];
            if (!value) continue;

            const fieldName = headerMapping[header];
            if (!fieldName) continue;

            if (fieldName === 'units' || fieldName === 'tags') {
              const list = splitList(value);
              if (list.length > 0) material[fieldName] = list;
              continue;
            }

            if (fieldName === 'isActive') {
              if (isTruthyCell(value)) material.isActive = true;
              else if (isFalsyCell(value)) material.isActive = false;
              continue;
            }

            if (numericFields.has(fieldName)) {
              const n = Number(value.replace(/,/g, ''));
              if (Number.isFinite(n) && n >= 0) (material[fieldName] as number) = n;
              continue;
            }

            material[fieldName] = value as never;
          }

          if (material.name) materials.push(material);
        }

        resolve(materials);
      } catch (error) {
        reject(
          new Error(
            `Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`,
          ),
        );
      }
    });

    reader.addEventListener('error', () => reject(new Error('Failed to read file')));
    reader.readAsArrayBuffer(file);
  });
};

type MaterialSampleRow = {
  name: string;
  code: string;
  units: string;
  category: string;
  costPrice: string;
  minimumStock: string;
  specification: string;
  description: string;
  memo: string;
  tags: string;
  isActive: string;
};

const MATERIAL_SAMPLE_ROWS_VI: MaterialSampleRow[] = [
  {
    name: 'Phân NPK 16-16-8',
    code: 'PNPK01',
    units: 'Bao',
    category: 'Phân bón',
    costPrice: '450000',
    minimumStock: '20',
    specification: 'Bao 25kg',
    description: 'Phân bón tổng hợp NPK',
    memo: '',
    tags: 'Phân bón',
    isActive: '',
  },
  {
    name: 'Màng phủ nông nghiệp',
    code: 'MPNN01',
    units: 'Cuộn',
    category: 'Vật tư',
    costPrice: '320000',
    minimumStock: '10',
    specification: 'Cuộn 400m',
    description: 'Màng phủ luống trồng',
    memo: '',
    tags: 'Màng phủ',
    isActive: '',
  },
  {
    name: 'Khay ươm 50 lỗ',
    code: 'KHAY50',
    units: 'Cái',
    category: 'Vật tư',
    costPrice: '12000',
    minimumStock: '100',
    specification: '50 lỗ/khay',
    description: 'Khay ươm cây giống',
    memo: '',
    tags: 'Ươm giống',
    isActive: '',
  },
];

const MATERIAL_SAMPLE_ROWS_EN: MaterialSampleRow[] = [
  {
    name: 'NPK 16-16-8 Fertilizer',
    code: 'FNPK01',
    units: 'Bag',
    category: 'Fertilizer',
    costPrice: '450000',
    minimumStock: '20',
    specification: '25kg/bag',
    description: 'Compound NPK fertilizer',
    memo: '',
    tags: 'Fertilizer',
    isActive: '',
  },
  {
    name: 'Agricultural Mulch Film',
    code: 'MULCH01',
    units: 'Roll',
    category: 'Supplies',
    costPrice: '320000',
    minimumStock: '10',
    specification: '400m/roll',
    description: 'Bed mulch film',
    memo: '',
    tags: 'Mulch',
    isActive: '',
  },
  {
    name: 'Seedling Tray 50 cells',
    code: 'TRAY50',
    units: 'Piece',
    category: 'Supplies',
    costPrice: '12000',
    minimumStock: '100',
    specification: '50 cells/tray',
    description: 'Seedling nursery tray',
    memo: '',
    tags: 'Nursery',
    isActive: '',
  },
];

export const generateMaterialExcelTemplate = ({
  language,
  hasCategory = false,
  hasPricing = false,
  hasMinimumStock = false,
  hasSpecification = false,
  hasDescription = false,
  hasMemo = false,
  hasTags = false,
  multiUnit = false,
  materials,
  unitLabels,
  categoryLabels,
  categories,
  units,
}: MaterialTemplateOptions = {}) => {
  const isVietnamese = language === 'vi';

  type ColumnKey = keyof MaterialSampleRow;
  type Column = { key: ColumnKey; header: string; width: number };

  const labels: Record<ColumnKey, string> = isVietnamese
    ? {
        name: 'Tên vật tư',
        code: 'Mã vật tư',
        units: 'Đơn vị',
        category: 'Danh mục',
        costPrice: 'Giá vốn',
        minimumStock: 'Tồn kho tối thiểu',
        specification: 'Quy cách đóng gói',
        description: 'Mô tả',
        memo: 'Ghi chú',
        tags: 'Thẻ',
        isActive: 'Đang sử dụng',
      }
    : {
        name: 'Name',
        code: 'Code',
        units: multiUnit ? 'Units' : 'Unit',
        category: 'Category',
        costPrice: 'Cost price',
        minimumStock: 'Min stock',
        specification: 'Packaging specification',
        description: 'Description',
        memo: 'Memo',
        tags: 'Tags',
        isActive: 'Active',
      };

  const columns: Column[] = [
    { key: 'name', header: labels.name, width: 28 },
    { key: 'code', header: labels.code, width: 16 },
    { key: 'units', header: labels.units, width: multiUnit ? 20 : 12 },
    ...(hasCategory ? [{ key: 'category' as const, header: labels.category, width: 18 }] : []),
    ...(hasPricing ? [{ key: 'costPrice' as const, header: labels.costPrice, width: 14 }] : []),
    ...(hasMinimumStock
      ? [{ key: 'minimumStock' as const, header: labels.minimumStock, width: 16 }]
      : []),
    ...(hasSpecification
      ? [{ key: 'specification' as const, header: labels.specification, width: 24 }]
      : []),
    ...(hasDescription
      ? [{ key: 'description' as const, header: labels.description, width: 36 }]
      : []),
    ...(hasMemo ? [{ key: 'memo' as const, header: labels.memo, width: 28 }] : []),
    ...(hasTags ? [{ key: 'tags' as const, header: labels.tags, width: 20 }] : []),
    { key: 'isActive', header: labels.isActive, width: 14 },
  ];

  const yes = isVietnamese ? 'Có' : 'Yes';
  const no = isVietnamese ? 'Không' : 'No';
  const resolveLabel = (val: string | undefined, map?: Record<string, string>) =>
    val ? (map?.[val] ?? val) : '';
  const num = (n: number | undefined) => (typeof n === 'number' && n > 0 ? String(n) : '');

  const realRows: MaterialSampleRow[] = (materials ?? [])
    .filter((m) => !m.extra?.isDeleted)
    .map((m) => {
      const e = m.extra ?? {};
      return {
        name: m.name,
        code: m.code,
        units: (e.units ?? [])
          .map((u) => resolveLabel(u, unitLabels))
          .filter(Boolean)
          .join(', '),
        category: resolveLabel(e.category, categoryLabels),
        costPrice: num(e.costPrice),
        minimumStock: num(e.minimumStock),
        specification: e.specification ?? '',
        description: e.description ?? '',
        memo: e.memo ?? '',
        tags: (e.tags ?? []).join(', '),
        isActive: m.isActive ? yes : no,
      };
    });

  const sampleSource = isVietnamese ? MATERIAL_SAMPLE_ROWS_VI : MATERIAL_SAMPLE_ROWS_EN;
  const sampleUnit = (i: number) => (units?.length ? units[i % units.length] : undefined);
  const fallbackRows = sampleSource.map((row, i) => ({
    ...row,
    units: sampleUnit(i) ?? row.units,
    category: categories?.[i] ?? row.category,
    isActive: yes,
  }));

  const bodyRows = realRows.length > 0 ? realRows : fallbackRows;

  const headerRow = columns.map((c) => c.header);
  const dataRows = bodyRows.map((row) => columns.map((c) => row[c.key]));

  const worksheet = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);
  worksheet['!cols'] = columns.map((c) => ({ width: c.width }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, isVietnamese ? 'Vật tư' : 'Materials');

  XLSX.writeFile(workbook, 'materials_template.xlsx');
};

export type ProductExportOptions = {
  language?: string;
  hasPrice?: boolean;

  categoryLabels?: Record<string, string>;

  tagLabels?: Record<string, string>;

  unitLabels?: Record<string, string>;

  hasHideFromInventoryList?: boolean;

  hasInventory?: boolean;

  onHandByCode?: ReadonlyMap<string, number>;
};

export const exportProductsToExcel = (
  products: ReadonlyArray<Product>,
  {
    language,
    hasPrice = true,
    categoryLabels,
    tagLabels,
    unitLabels,
    hasHideFromInventoryList = false,
    hasInventory = false,
    onHandByCode,
  }: ProductExportOptions = {},
) => {
  const isVietnamese = language === 'vi';

  type ColumnKey =
    | 'name'
    | 'code'
    | 'sku'
    | 'unit'
    | 'barcode'
    | 'description'
    | 'category'
    | 'tags'
    | 'alternativeNames'
    | 'attributes'
    | 'onHand'
    | 'minInventoryValue'
    | 'minInventoryUnit'
    | 'price'
    | 'basePrice'
    | 'inventoryManaged'
    | 'shownInInventoryList'
    | 'status';
  type Column = { key: ColumnKey; header: string; width: number };

  const labels: Record<ColumnKey, string> = isVietnamese
    ? {
        name: 'Tên sản phẩm',
        code: 'Mã sản phẩm',
        sku: 'SKU',
        unit: 'Đơn vị',
        barcode: 'Mã vạch',
        description: 'Mô tả',
        category: 'Danh mục',
        tags: 'Thẻ',
        alternativeNames: 'Tên gọi khác',
        attributes: 'Thuộc tính',
        onHand: 'Tồn kho hiện tại',
        minInventoryValue: 'Tồn kho tối thiểu',
        minInventoryUnit: 'Đơn vị tồn kho tối thiểu',
        price: 'Giá bán',
        basePrice: 'Giá vốn',
        inventoryManaged: 'Quản lý tồn kho',
        shownInInventoryList: 'Hiển thị trong danh sách tồn kho',
        status: 'Trạng thái',
      }
    : {
        name: 'Name',
        code: 'Code',
        sku: 'SKU',
        unit: 'Unit',
        barcode: 'Barcode',
        description: 'Description',
        category: 'Category',
        tags: 'Tags',
        alternativeNames: 'Alternative names',
        attributes: 'Attributes',
        onHand: 'On hand',
        minInventoryValue: 'Min stock',
        minInventoryUnit: 'Min stock unit',
        price: 'Price',
        basePrice: 'Base price',
        inventoryManaged: 'Inventory-managed',
        shownInInventoryList: 'Shown in inventory list',
        status: 'Status',
      };

  const columns: Column[] = [
    { key: 'name', header: labels.name, width: 28 },
    { key: 'code', header: labels.code, width: 14 },
    { key: 'sku', header: labels.sku, width: 18 },
    { key: 'unit', header: labels.unit, width: 10 },
    { key: 'barcode', header: labels.barcode, width: 16 },
    { key: 'description', header: labels.description, width: 36 },
    { key: 'category', header: labels.category, width: 18 },
    { key: 'tags', header: labels.tags, width: 24 },
    { key: 'alternativeNames', header: labels.alternativeNames, width: 28 },
    { key: 'attributes', header: labels.attributes, width: 36 },

    ...(hasInventory ? [{ key: 'onHand' as const, header: labels.onHand, width: 14 }] : []),
    { key: 'minInventoryValue', header: labels.minInventoryValue, width: 14 },
    { key: 'minInventoryUnit', header: labels.minInventoryUnit, width: 16 },
    ...(hasPrice
      ? [
          { key: 'price' as const, header: labels.price, width: 12 },
          { key: 'basePrice' as const, header: labels.basePrice, width: 12 },
        ]
      : []),
    { key: 'inventoryManaged', header: labels.inventoryManaged, width: 18 },
    ...(hasHideFromInventoryList
      ? [
          {
            key: 'shownInInventoryList' as const,
            header: labels.shownInInventoryList,
            width: 26,
          },
        ]
      : []),
    { key: 'status', header: labels.status, width: 12 },
  ];

  const statusActive = isVietnamese ? 'Đang bán' : 'Active';
  const statusInactive = isVietnamese ? 'Ngừng bán' : 'Inactive';
  const flagYes = isVietnamese ? 'Có' : 'Yes';
  const flagNo = isVietnamese ? 'Không' : 'No';
  const resolveLabel = (val: string | undefined, map?: Record<string, string>) =>
    val ? (map?.[val] ?? val) : '';

  const headerRow = columns.map((c) => c.header);
  const dataRows = products
    .filter((p) => !p.extra?.isDeleted)
    .map((p) => {
      const e = p.extra ?? {};
      const min = e.minimumInventory;
      const cells: Record<ColumnKey, string | number> = {
        name: p.name,
        code: p.code,
        sku: e.sku ?? '',
        unit: resolveLabel(p.unit, unitLabels),
        barcode: e.barcode ?? '',
        description: p.description ?? '',
        category: resolveLabel(e.category, categoryLabels),
        tags: (e.tags ?? []).map((tv) => resolveLabel(tv, tagLabels)).join('; '),
        alternativeNames: (e.alternativeNames ?? []).join('; '),
        attributes: (e.attributes ?? [])
          .filter((a) => a.key.trim() && a.value.trim())
          .map((a) => `${a.key.trim()}=${a.value.trim()}`)
          .join('; '),

        onHand: e.noInventory ? '' : (onHandByCode?.get(p.code) ?? 0),
        minInventoryValue: typeof min?.value === 'number' && min.value > 0 ? min.value : '',
        minInventoryUnit: resolveLabel(min?.unit, unitLabels),
        price: typeof p.price === 'number' && p.price > 0 ? p.price : '',
        basePrice: typeof e.basePrice === 'number' && e.basePrice > 0 ? e.basePrice : '',

        inventoryManaged: e.noInventory ? flagNo : flagYes,
        shownInInventoryList: e.hiddenFromInventoryList ? flagNo : flagYes,
        status: p.isActive ? statusActive : statusInactive,
      };
      return columns.map((c) => cells[c.key]);
    });

  const worksheet = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);
  worksheet['!cols'] = columns.map((c) => ({ width: c.width }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, isVietnamese ? 'Sản phẩm' : 'Products');

  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  XLSX.writeFile(workbook, `products_export_${yyyy}-${mm}-${dd}.xlsx`);
};

export type BulkGoodsReceiptItem = {
  sku: string;
  quantity: number;
  unit?: string;
  memo?: string;
};

const REQUIRED_GR_ITEM_FIELDS: ReadonlyArray<keyof BulkGoodsReceiptItem> = ['sku', 'quantity'];

export const parseGoodsReceiptItemsExcelFile = async (
  file: File,
): Promise<BulkGoodsReceiptItem[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener('load', (event) => {
      try {
        const data = event.target?.result;
        if (!data) {
          reject(new Error('Failed to read file'));
          return;
        }

        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const sheetData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: '',
        }) as string[][];

        if (sheetData.length < 2) {
          reject(new Error('File must contain at least a header row and one data row'));
          return;
        }

        const headers = sheetData[0].map((h) => String(h).trim().toLowerCase());

        const headerMapping: Record<string, keyof BulkGoodsReceiptItem> = {
          sku: 'sku',
          quantity: 'quantity',
          qty: 'quantity',
          unit: 'unit',
          memo: 'memo',
          note: 'memo',
          notes: 'memo',

          'số lượng': 'quantity',
          'đơn vị': 'unit',
          'ghi chú': 'memo',
        };

        const presentFields = new Set<keyof BulkGoodsReceiptItem>();
        for (const h of headers) {
          const f = headerMapping[h];
          if (f) presentFields.add(f);
        }
        const missing = REQUIRED_GR_ITEM_FIELDS.filter((f) => !presentFields.has(f));
        if (missing.length > 0) {
          reject(new ExcelParseError(missing));
          return;
        }

        const rows: BulkGoodsReceiptItem[] = [];
        for (let index = 1; index < sheetData.length; index++) {
          const values = sheetData[index].map((v) => String(v).trim());
          if (values.every((v) => !v)) continue;

          let sku = '';
          let quantity: number | undefined;
          let unit: string | undefined;
          let memo: string | undefined;

          for (const [headerIndex, header] of headers.entries()) {
            const value = values[headerIndex];
            if (!value) continue;
            const fieldName = headerMapping[header];
            if (!fieldName) continue;

            if (fieldName === 'quantity') {
              const n = Number(value.replace(/,/g, ''));
              if (Number.isFinite(n) && n > 0) quantity = n;
            } else if (fieldName === 'sku') {
              sku = value;
            } else if (fieldName === 'unit') {
              unit = value;
            } else if (fieldName === 'memo') {
              memo = value;
            }
          }

          if (sku && typeof quantity === 'number' && quantity > 0) {
            rows.push({ sku, quantity, unit, memo });
          }
        }

        resolve(rows);
      } catch (error) {
        reject(
          new Error(
            `Failed to parse Excel file: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
          ),
        );
      }
    });

    reader.addEventListener('error', () => {
      reject(new Error('Failed to read file'));
    });

    reader.readAsArrayBuffer(file);
  });
};

type GRItemSampleRow = { sku: string; quantity: string; unit: string; memo: string };

const GR_ITEM_SAMPLE_ROWS_VI: GRItemSampleRow[] = [
  { sku: 'SKU-COFFEE-01', quantity: '50', unit: 'ly', memo: 'Hàng mới về' },
  { sku: 'SKU-WATER-03', quantity: '24', unit: 'chai', memo: '' },
  { sku: 'SKU-MAT-001', quantity: '10', unit: 'kg', memo: 'Chất lượng tốt' },
];

const GR_ITEM_SAMPLE_ROWS_EN: GRItemSampleRow[] = [
  { sku: 'SKU-COFFEE-01', quantity: '50', unit: 'cup', memo: 'New stock' },
  { sku: 'SKU-WATER-03', quantity: '24', unit: 'bottle', memo: '' },
  { sku: 'SKU-MAT-001', quantity: '10', unit: 'kg', memo: 'Good quality' },
];

export type GoodsReceiptItemsTemplateSample = {
  sku: string;

  unit?: string;

  name?: string;
};

export type GoodsReceiptItemsTemplateOptions = {
  language?: string;

  sampleItems?: ReadonlyArray<GoodsReceiptItemsTemplateSample>;
};

export const generateGoodsReceiptItemsTemplate = ({
  language,
  sampleItems,
}: GoodsReceiptItemsTemplateOptions = {}) => {
  const isVietnamese = language === 'vi';

  type ColumnKey = keyof GRItemSampleRow;
  type Column = { key: ColumnKey; header: string; width: number };

  const labels: Record<ColumnKey, string> = isVietnamese
    ? { sku: 'SKU', quantity: 'Số lượng', unit: 'Đơn vị', memo: 'Ghi chú' }
    : { sku: 'SKU', quantity: 'Quantity', unit: 'Unit', memo: 'Memo' };

  const columns: Column[] = [
    { key: 'sku', header: labels.sku, width: 20 },
    { key: 'quantity', header: labels.quantity, width: 12 },
    { key: 'unit', header: labels.unit, width: 12 },
    { key: 'memo', header: labels.memo, width: 32 },
  ];

  const fallback = isVietnamese ? GR_ITEM_SAMPLE_ROWS_VI : GR_ITEM_SAMPLE_ROWS_EN;
  const real: GRItemSampleRow[] = (sampleItems ?? [])
    .filter((it) => it.sku.trim())
    .slice(0, 3)
    .map((it) => ({
      sku: it.sku.trim(),
      quantity: '1',
      unit: it.unit?.trim() ?? '',
      memo: it.name?.trim() ?? '',
    }));

  const sampleSource: GRItemSampleRow[] =
    real.length >= 3 ? real : [...real, ...fallback.slice(real.length)];
  const headerRow = columns.map((c) => c.header);
  const dataRows = sampleSource.map((row) => columns.map((c) => row[c.key]));

  const worksheet = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);
  worksheet['!cols'] = columns.map((c) => ({ width: c.width }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, isVietnamese ? 'Hàng nhập' : 'Items');

  XLSX.writeFile(workbook, 'goods_receipt_items_template.xlsx');
};

export type BulkSalesOrderItem = {
  sku: string;
  quantity: number;
  unit?: string;
  unitPrice?: number;
};

const REQUIRED_SO_ITEM_FIELDS: ReadonlyArray<keyof BulkSalesOrderItem> = ['sku', 'quantity'];

export type ParseSalesOrderItemsOptions = {
  pricingEnabled?: boolean;
};

export const parseSalesOrderItemsExcelFile = async (
  file: File,
  { pricingEnabled = true }: ParseSalesOrderItemsOptions = {},
): Promise<BulkSalesOrderItem[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener('load', (event) => {
      try {
        const data = event.target?.result;
        if (!data) {
          reject(new Error('Failed to read file'));
          return;
        }

        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const sheetData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: '',
        }) as string[][];

        if (sheetData.length < 2) {
          reject(new Error('File must contain at least a header row and one data row'));
          return;
        }

        const headers = sheetData[0].map((h) => String(h).trim().toLowerCase());

        const headerMapping: Record<string, keyof BulkSalesOrderItem> = {
          sku: 'sku',
          quantity: 'quantity',
          qty: 'quantity',
          unit: 'unit',

          'số lượng': 'quantity',
          'đơn vị': 'unit',
        };
        if (pricingEnabled) {
          headerMapping['unit price'] = 'unitPrice';
          headerMapping['unitprice'] = 'unitPrice';
          headerMapping['price'] = 'unitPrice';
          headerMapping['đơn giá'] = 'unitPrice';
          headerMapping['giá'] = 'unitPrice';
        }

        const presentFields = new Set<keyof BulkSalesOrderItem>();
        for (const h of headers) {
          const f = headerMapping[h];
          if (f) presentFields.add(f);
        }
        const missing = REQUIRED_SO_ITEM_FIELDS.filter((f) => !presentFields.has(f));
        if (missing.length > 0) {
          reject(new ExcelParseError(missing));
          return;
        }

        const rows: BulkSalesOrderItem[] = [];
        for (let index = 1; index < sheetData.length; index++) {
          const values = sheetData[index].map((v) => String(v).trim());
          if (values.every((v) => !v)) continue;

          let sku = '';
          let quantity: number | undefined;
          let unit: string | undefined;
          let unitPrice: number | undefined;

          for (const [headerIndex, header] of headers.entries()) {
            const value = values[headerIndex];
            if (!value) continue;
            const fieldName = headerMapping[header];
            if (!fieldName) continue;

            if (fieldName === 'quantity') {
              const n = Number(value.replace(/,/g, ''));
              if (Number.isFinite(n) && n > 0) quantity = n;
            } else if (fieldName === 'unitPrice') {
              const n = Number(value.replace(/,/g, ''));
              if (Number.isFinite(n) && n >= 0) unitPrice = n;
            } else if (fieldName === 'sku') {
              sku = value;
            } else if (fieldName === 'unit') {
              unit = value;
            }
          }

          if (sku && typeof quantity === 'number' && quantity > 0) {
            rows.push({ sku, quantity, unit, unitPrice });
          }
        }

        resolve(rows);
      } catch (error) {
        reject(
          new Error(
            `Failed to parse Excel file: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
          ),
        );
      }
    });

    reader.addEventListener('error', () => {
      reject(new Error('Failed to read file'));
    });

    reader.readAsArrayBuffer(file);
  });
};

type SOItemSampleRow = { sku: string; quantity: string; unit: string; unitPrice: string };

const SO_ITEM_SAMPLE_ROWS_VI: SOItemSampleRow[] = [
  { sku: 'SKU-COFFEE-01', quantity: '50', unit: 'ly', unitPrice: '20000' },
  { sku: 'SKU-WATER-03', quantity: '24', unit: 'chai', unitPrice: '8000' },
  { sku: 'SKU-PRD-001', quantity: '10', unit: 'cái', unitPrice: '120000' },
];

const SO_ITEM_SAMPLE_ROWS_EN: SOItemSampleRow[] = [
  { sku: 'SKU-COFFEE-01', quantity: '50', unit: 'cup', unitPrice: '20000' },
  { sku: 'SKU-WATER-03', quantity: '24', unit: 'bottle', unitPrice: '8000' },
  { sku: 'SKU-PRD-001', quantity: '10', unit: 'pcs', unitPrice: '120000' },
];

export type SalesOrderItemsTemplateSample = {
  sku: string;

  unit?: string;

  unitPrice?: number;
};

export type SalesOrderItemsTemplateOptions = {
  language?: string;

  sampleItems?: ReadonlyArray<SalesOrderItemsTemplateSample>;

  pricingEnabled?: boolean;
};

export const generateSalesOrderItemsTemplate = ({
  language,
  sampleItems,
  pricingEnabled = true,
}: SalesOrderItemsTemplateOptions = {}) => {
  const isVietnamese = language === 'vi';

  type ColumnKey = keyof SOItemSampleRow;
  type Column = { key: ColumnKey; header: string; width: number };

  const labels: Record<ColumnKey, string> = isVietnamese
    ? { sku: 'SKU', quantity: 'Số lượng', unit: 'Đơn vị', unitPrice: 'Đơn giá' }
    : { sku: 'SKU', quantity: 'Quantity', unit: 'Unit', unitPrice: 'Unit Price' };

  const columns: Column[] = [
    { key: 'sku', header: labels.sku, width: 20 },
    { key: 'quantity', header: labels.quantity, width: 12 },
    { key: 'unit', header: labels.unit, width: 12 },
    ...(pricingEnabled ? [{ key: 'unitPrice' as const, header: labels.unitPrice, width: 14 }] : []),
  ];

  const fallback = isVietnamese ? SO_ITEM_SAMPLE_ROWS_VI : SO_ITEM_SAMPLE_ROWS_EN;
  const real: SOItemSampleRow[] = (sampleItems ?? [])
    .filter((it) => it.sku.trim())
    .slice(0, 3)
    .map((it) => ({
      sku: it.sku.trim(),
      quantity: '1',
      unit: it.unit?.trim() ?? '',
      unitPrice: typeof it.unitPrice === 'number' ? String(it.unitPrice) : '',
    }));
  const sampleSource: SOItemSampleRow[] =
    real.length >= 3 ? real : [...real, ...fallback.slice(real.length)];
  const headerRow = columns.map((c) => c.header);
  const dataRows = sampleSource.map((row) => columns.map((c) => row[c.key]));

  const worksheet = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);
  worksheet['!cols'] = columns.map((c) => ({ width: c.width }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, isVietnamese ? 'Đơn hàng' : 'Items');

  XLSX.writeFile(workbook, 'sales_order_items_template.xlsx');
};

export type BulkSalesOrderItemByName = {
  name: string;
  quantity: number;

  unitPrice?: number;
};

export type ParsedSalesOrderByName = {
  items: BulkSalesOrderItemByName[];

  customerPONumber?: string;
};

const SO_NAME_HEADER_ALIASES = [
  'tên hàng',
  'tên sản phẩm',
  'tên hàng hóa',
  'tên',
  'item name',
  'product name',
  'name',
  'description',
];

const SO_QTY_HEADER_ALIASES = ['số lượng', 'sl', 'quantity', 'qty'];

const SO_PRICE_HEADER_ALIASES = ['đơn giá', 'unit price', 'price', 'giá', 'đơn giá (vnđ)'];

const SO_FOOTER_MARKERS = [
  'cộng tiền hàng',
  'cộng tiền',
  'tiền thuế',
  'thuế suất',
  'tổng tiền',
  'tổng cộng',
  'số tiền viết bằng chữ',
];

const parseVietnameseNumber = (raw: string): number | undefined => {
  const s = raw.trim();
  if (!s) return undefined;
  let normalized: string;
  if (s.includes('.') && s.includes(',')) {
    normalized = s.replace(/\./g, '').replace(',', '.');
  } else if (s.includes(',')) {
    normalized = /,\d{1,2}$/.test(s) ? s.replace(',', '.') : s.replace(/,/g, '');
  } else {
    normalized = s;
  }

  normalized = normalized.replace(/[^\d.-]/g, '');
  const n = Number(normalized);
  return Number.isFinite(n) ? n : undefined;
};

const SO_PO_LABEL_PREFIXES = ['số po', 'số p.o', 'so po', 'po number', 'customer po', 'po no'];

const SO_PO_STOP_LABELS = ['thanh toán', 'thanh toan'];

const extractCustomerPONumber = (sheetData: string[][]): string | undefined => {
  for (const row of sheetData) {
    for (let c = 0; c < row.length; c++) {
      const cell = String(row[c] ?? '').trim();
      if (!cell) continue;
      const lower = cell.toLowerCase();
      const prefix = SO_PO_LABEL_PREFIXES.find((p) => lower.startsWith(p));
      if (!prefix) continue;

      const inline = cell
        .slice(prefix.length)
        .replace(/^[:\s]+/, '')
        .trim();
      if (inline) return inline;

      for (let n = c + 1; n < row.length; n++) {
        const next = String(row[n] ?? '').trim();
        if (!next) continue;
        if (SO_PO_STOP_LABELS.some((s) => next.toLowerCase().startsWith(s))) break;
        return next;
      }
    }
  }
  return undefined;
};

export const parseSalesOrderItemsByNameExcelFile = async (
  file: File,
): Promise<ParsedSalesOrderByName> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener('load', (event) => {
      try {
        const data = event.target?.result;
        if (!data) {
          reject(new Error('Failed to read file'));
          return;
        }

        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const sheetData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: '',
        }) as string[][];

        let headerRowIdx = -1;
        let nameCol = -1;
        let qtyCol = -1;

        let priceCol = -1;
        for (let r = 0; r < sheetData.length; r++) {
          const cells = sheetData[r].map((c) => String(c).trim().toLowerCase());
          const nIdx = cells.findIndex((c) => SO_NAME_HEADER_ALIASES.includes(c));
          const qIdx = cells.findIndex((c) => SO_QTY_HEADER_ALIASES.includes(c));
          if (nIdx !== -1 && qIdx !== -1) {
            headerRowIdx = r;
            nameCol = nIdx;
            qtyCol = qIdx;
            priceCol = cells.findIndex((c) => SO_PRICE_HEADER_ALIASES.includes(c));
            break;
          }
        }

        if (headerRowIdx === -1) {
          reject(new ExcelParseError(['name', 'quantity']));
          return;
        }

        const rows: BulkSalesOrderItemByName[] = [];
        for (let r = headerRowIdx + 1; r < sheetData.length; r++) {
          const name = String(sheetData[r][nameCol] ?? '').trim();
          const lowerName = name.toLowerCase();

          if (SO_FOOTER_MARKERS.some((m) => lowerName.startsWith(m))) break;
          if (!name) continue;
          const quantity = parseVietnameseNumber(String(sheetData[r][qtyCol] ?? ''));
          if (typeof quantity === 'number' && quantity > 0) {
            const unitPrice =
              priceCol === -1
                ? undefined
                : parseVietnameseNumber(String(sheetData[r][priceCol] ?? ''));
            rows.push({
              name,
              quantity,
              ...(typeof unitPrice === 'number' && unitPrice >= 0 && { unitPrice }),
            });
          }
        }

        resolve({ items: rows, customerPONumber: extractCustomerPONumber(sheetData) });
      } catch (error) {
        reject(
          new Error(
            `Failed to parse Excel file: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
          ),
        );
      }
    });

    reader.addEventListener('error', () => {
      reject(new Error('Failed to read file'));
    });

    reader.readAsArrayBuffer(file);
  });
};

export type SalesOrderItemsByNameSample = { name: string };

export type SalesOrderItemsByNameTemplateOptions = {
  language?: string;

  sampleItems?: ReadonlyArray<SalesOrderItemsByNameSample>;
};

const SO_NAME_SAMPLE_ROWS_VI = ['Pát neo bán nguyệt', 'Cùm xiết', 'Khóa móc lò xo'];
const SO_NAME_SAMPLE_ROWS_EN = ['Half-moon anchor plate', 'Tightening clamp', 'Spring hook lock'];

export const generateSalesOrderItemsByNameTemplate = ({
  language,
  sampleItems,
}: SalesOrderItemsByNameTemplateOptions = {}) => {
  const isVietnamese = language === 'vi';
  const labels = isVietnamese
    ? { name: 'Tên hàng', quantity: 'Số lượng' }
    : { name: 'Item Name', quantity: 'Quantity' };

  const fallback = isVietnamese ? SO_NAME_SAMPLE_ROWS_VI : SO_NAME_SAMPLE_ROWS_EN;
  const real = (sampleItems ?? [])
    .map((it) => it.name.trim())
    .filter(Boolean)
    .slice(0, 3);
  const names = real.length >= 3 ? real : [...real, ...fallback.slice(real.length)];

  const headerRow = [labels.name, labels.quantity];
  const dataRows = names.map((name) => [name, '1']);

  const worksheet = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);
  worksheet['!cols'] = [{ width: 40 }, { width: 12 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, isVietnamese ? 'Đơn hàng' : 'Items');

  XLSX.writeFile(workbook, 'sales_order_items_template.xlsx');
};

export const generateEmployeeExcelTemplate = ({
  language,
  hasEmail = true,
  hasPosition = true,
  hasDepartment = true,
  departments,
  positions,
}: EmployeeTemplateOptions = {}) => {
  const isVietnamese = language === 'vi';

  type ColumnKey = keyof SampleRow;
  type Column = { key: ColumnKey; header: string; width: number };

  const labels: Record<ColumnKey, string> = isVietnamese
    ? {
        name: 'Họ tên',
        code: 'Mã nhân viên',
        email: 'Email',
        phone: 'Điện thoại',
        personalPhone: 'SĐT cá nhân',
        position: 'Chức vụ',
        department: 'Phòng ban',
      }
    : {
        name: 'Name',
        code: 'Code',
        email: 'Email',
        phone: 'Phone',
        personalPhone: 'Personal Phone',
        position: 'Position',
        department: 'Department',
      };

  const columns: Column[] = [
    { key: 'name', header: labels.name, width: 20 },
    { key: 'code', header: labels.code, width: 15 },
    ...(hasEmail ? [{ key: 'email' as const, header: labels.email, width: 25 }] : []),
    { key: 'phone', header: labels.phone, width: 15 },
    { key: 'personalPhone', header: labels.personalPhone, width: 15 },
    ...(hasPosition ? [{ key: 'position' as const, header: labels.position, width: 15 }] : []),
    ...(hasDepartment
      ? [{ key: 'department' as const, header: labels.department, width: 15 }]
      : []),
  ];

  const sampleSource = isVietnamese ? SAMPLE_ROWS_VI : SAMPLE_ROWS_EN;
  const sampleRows = sampleSource.map((row, i) => ({
    ...row,
    position: positions?.[i] ?? row.position,
    department: departments?.[i] ?? row.department,
  }));

  const headerRow = columns.map((c) => c.header);
  const dataRows = sampleRows.map((row) => columns.map((c) => row[c.key]));

  const worksheet = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);
  worksheet['!cols'] = columns.map((c) => ({ width: c.width }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, isVietnamese ? 'Nhân viên' : 'Employees');

  XLSX.writeFile(workbook, 'employees_template.xlsx');
};

export type RefuelExportEntry = { vehicleLabel?: string; log: OperationLog };

export type RefuelExportOptions = {
  language?: string;

  periodLabel: string;

  fileTag: string;

  vehicleLabel?: string;
};

const round1 = (n: number) => Math.round(n * 10) / 10;

const roundLitres = (n: number) => {
  const f = 10 ** LITRE_DECIMAL_SCALE;
  return Math.round(n * f) / f;
};

const numCell = (v: unknown): number | string => {
  const n = Number(v);
  return Number.isFinite(n) ? n : '';
};

const safeName = (s: string) => s.replace(/[\\/:*?"<>|[\]]/g, '').trim() || 'export';

function buildRefuelSheet(
  entries: RefuelExportEntry[],
  withVehicle: boolean,
  isVietnamese: boolean,
) {
  type Col = { header: string; width: number };
  const vehicleCol: Col = { header: isVietnamese ? 'Xe' : 'Vehicle', width: 16 };
  const dataCols: Col[] = isVietnamese
    ? [
        { header: 'Ngày', width: 12 },
        { header: 'ODO cũ (km)', width: 12 },
        { header: 'ODO mới (km)', width: 12 },
        { header: 'Quãng đường (km)', width: 14 },
        { header: 'Số lít', width: 10 },
        { header: 'Đơn giá', width: 12 },
        { header: 'Thành tiền', width: 14 },
        { header: 'L/100km', width: 10 },
        { header: 'Nguồn', width: 16 },
        { header: 'Lái xe', width: 18 },
        { header: 'Ghi chú', width: 30 },
      ]
    : [
        { header: 'Date', width: 12 },
        { header: 'Old ODO (km)', width: 12 },
        { header: 'New ODO (km)', width: 12 },
        { header: 'Distance (km)', width: 14 },
        { header: 'Litres', width: 10 },
        { header: 'Unit price', width: 12 },
        { header: 'Amount', width: 14 },
        { header: 'L/100km', width: 10 },
        { header: 'Source', width: 16 },
        { header: 'Driver', width: 18 },
        { header: 'Note', width: 30 },
      ];
  const columns = withVehicle ? [vehicleCol, ...dataCols] : dataCols;

  const dataRows = entries.map(({ log, vehicleLabel }) => {
    const e = log.extra ?? {};
    const cons = refuelConsumption(log);
    const base: (number | string)[] = [
      String(log.logDate).slice(0, 10),
      numCell(e.odometerBefore),
      numCell(e.odometer),
      numCell(e.distanceKm),
      numCell(e.litres),
      numCell(e.unitPrice),
      numCell(e.totalAmount),
      cons == null ? '' : round1(cons),

      e.fuelSource === 'tank'
        ? (e.oilTankCode ?? (isVietnamese ? 'Bồn dầu' : 'Tank'))
        : isVietnamese
          ? 'Ngoài'
          : 'External',
      typeof e.driverName === 'string' ? e.driverName : '',
      typeof e.note === 'string' ? e.note : '',
    ];
    return withVehicle ? [vehicleLabel ?? '', ...base] : base;
  });

  const { litres, cost, distance, avgConsumption } = computeRefuelTotals(entries.map((x) => x.log));
  const totalRow: (number | string)[] = new Array(columns.length).fill('');
  const off = withVehicle ? 1 : 0;
  totalRow[0] = isVietnamese ? 'Tổng' : 'Total';
  totalRow[off + 3] = round1(distance);
  totalRow[off + 4] = roundLitres(litres);
  totalRow[off + 6] = round1(cost);
  totalRow[off + 7] = avgConsumption == null ? '' : round1(avgConsumption);

  const headerRow = columns.map((c) => c.header);
  const worksheet = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows, totalRow]);
  worksheet['!cols'] = columns.map((c) => ({ width: c.width }));
  return worksheet;
}

export const exportRefuelLogsToExcel = (
  logs: ReadonlyArray<OperationLog>,
  { language, periodLabel, fileTag, vehicleLabel }: RefuelExportOptions,
) => {
  const isVietnamese = language === 'vi';
  const worksheet = buildRefuelSheet(
    logs.map((log) => ({ log })),
    false,
    isVietnamese,
  );
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, safeName(periodLabel).slice(0, 31));
  const vehiclePart = vehicleLabel ? `${safeName(vehicleLabel)}_` : '';
  XLSX.writeFile(workbook, `refuel_${vehiclePart}${fileTag}.xlsx`);
};

export const exportFleetRefuelLogsToExcel = (
  entries: ReadonlyArray<RefuelExportEntry>,
  { language, periodLabel, fileTag }: Omit<RefuelExportOptions, 'vehicleLabel'>,
) => {
  const isVietnamese = language === 'vi';
  const worksheet = buildRefuelSheet([...entries], true, isVietnamese);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, safeName(periodLabel).slice(0, 31));
  XLSX.writeFile(workbook, `fleet_refuel_${fileTag}.xlsx`);
};

export const exportMaintenanceLogsToExcel = (
  logs: ReadonlyArray<OperationLog>,
  { language, periodLabel, fileTag, vehicleLabel }: RefuelExportOptions,
) => {
  const isVietnamese = language === 'vi';
  const columns = isVietnamese
    ? [
        { header: 'Ngày', width: 12 },
        { header: 'Loại', width: 16 },
        { header: 'Nhà cung cấp', width: 20 },
        { header: 'Hạng mục', width: 28 },
        { header: 'Đơn giá', width: 14 },
        { header: 'Số lượng', width: 10 },
        { header: 'Thành tiền', width: 14 },
        { header: 'Bảo hành (tháng)', width: 14 },
        { header: 'Tiền công', width: 14 },
        { header: 'VAT', width: 14 },
        { header: 'Tổng cộng', width: 14 },
        { header: 'Đã thanh toán', width: 14 },
        { header: 'Công nợ', width: 14 },
        { header: 'Ghi chú', width: 30 },
      ]
    : [
        { header: 'Date', width: 12 },
        { header: 'Type', width: 16 },
        { header: 'Supplier', width: 20 },
        { header: 'Item', width: 28 },
        { header: 'Unit price', width: 14 },
        { header: 'Qty', width: 10 },
        { header: 'Line total', width: 14 },
        { header: 'Warranty (months)', width: 16 },
        { header: 'Labor', width: 14 },
        { header: 'VAT', width: 14 },
        { header: 'Total', width: 14 },
        { header: 'Paid', width: 14 },
        { header: 'Outstanding', width: 14 },
        { header: 'Note', width: 30 },
      ];

  const dataRows: (number | string)[][] = [];
  let totalGrand = 0;
  let totalOutstanding = 0;

  for (const log of logs) {
    const e = (log.extra ?? {}) as MaintenanceLogExtra;
    const items = readMaintenanceItems(e);
    const grandTotal = Number(e.grandTotal ?? e.cost) || 0;
    const outstanding = grandTotal - (Number(e.accountsReceived) || 0);
    totalGrand += grandTotal;
    totalOutstanding += outstanding;

    const lines = items.length > 0 ? items : [undefined];
    lines.forEach((item, index) => {
      const first = index === 0;
      dataRows.push([
        first ? String(log.logDate).slice(0, 10) : '',
        first ? (e.maintenanceTypeLabel ?? e.maintenanceType ?? '') : '',
        first ? (e.supplier ?? '') : '',
        item?.name ?? '',
        item ? numCell(item.unitPrice) : '',
        item ? itemQuantity(item) : '',
        item ? maintenanceLineTotal(item) : '',
        item?.warrantyMonths ?? '',

        first ? (e.vatRate ? maintenanceVat(e) : '') : '',
        first ? grandTotal : '',
        first ? numCell(e.accountsReceived) : '',
        first ? outstanding : '',
        first ? (e.note ?? '') : '',
      ]);
    });
  }

  const totalRow: (number | string)[] = new Array(columns.length).fill('');
  totalRow[0] = isVietnamese ? 'Tổng' : 'Total';

  totalRow[10] = totalGrand;
  totalRow[12] = totalOutstanding;

  const worksheet = XLSX.utils.aoa_to_sheet([columns.map((c) => c.header), ...dataRows, totalRow]);
  worksheet['!cols'] = columns.map((c) => ({ width: c.width }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, safeName(periodLabel).slice(0, 31));
  const vehiclePart = vehicleLabel ? `${safeName(vehicleLabel)}_` : '';
  XLSX.writeFile(workbook, `maintenance_${vehiclePart}${fileTag}.xlsx`);
};
