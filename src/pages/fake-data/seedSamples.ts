import type { CMngtAppConfig } from '@credo/kits/types';
import type { ManualCustomerInput } from './seedFakeCustomers';
import type { ManualEmployeeInput } from './seedFakeEmployees';
import type { ManualLookupInput } from './seedFakeLookups';
import type { ManualProductInput } from './seedFakeProducts';
import type { ManualVendorInput } from './seedFakeVendors';

export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function codeBuilder(
  prefix: string | undefined,
  padLength: number | undefined,
  fallbackPrefix: string,
): (n: number) => string {
  return (n) => `${prefix ?? fallbackPrefix}${String(n).padStart(padLength ?? 4, '0')}`;
}

export function buildEmployeeSamples(cfg: CMngtAppConfig | null): ManualEmployeeInput[] {
  const departments = (cfg?.features?.employees?.departmentOptions ?? []).map((d) => d.value);
  const dept = (i: number): string | undefined =>
    departments.length > 0 ? departments[i % departments.length] : undefined;
  return [
    { lastName: 'Nguyễn', firstName: 'Văn An', department: dept(0), phone: '0901-234-567' },
    {
      lastName: 'Trần',
      firstName: 'Thị Bích',
      department: dept(1),
      phone: '0902-345-678',
      personalPhone: '0912-000-111',
    },
    { lastName: 'Lê', firstName: 'Minh Cường', department: dept(2), phone: '' },
  ];
}

const LOOKUP_SAMPLE_POOL: Record<string, ManualLookupInput[]> = {
  unit: [
    { category: 'unit', value: 'CÁI', label: 'Cái', sortOrder: 1 },
    { category: 'unit', value: 'THÙNG', label: 'Thùng', sortOrder: 2 },
    { category: 'unit', value: 'KG', label: 'Kg', sortOrder: 3 },
  ],
  'product-category': [
    { category: 'product-category', value: 'THIẾT BỊ', label: 'Thiết bị' },
    { category: 'product-category', value: 'PHỤ KIỆN', label: 'Phụ kiện' },
  ],
  'product-tag': [{ category: 'product-tag', value: 'BÁN CHẠY', label: 'Bán chạy' }],
  'material-category': [{ category: 'material-category', value: 'VẬT TƯ', label: 'Vật tư' }],
  'material-unit': [{ category: 'material-unit', value: 'KG', label: 'Kg' }],
};

export function buildLookupSamples(cfg: CMngtAppConfig | null): ManualLookupInput[] {
  const enabledCategories = cfg?.features?.lookups?.enabledCategories ?? [];
  const isEnabled = (id: string) =>
    enabledCategories.length === 0 || enabledCategories.includes(id);
  return Object.entries(LOOKUP_SAMPLE_POOL)
    .filter(([id]) => isEnabled(id))
    .flatMap(([, rows]) => rows);
}

export function buildProductSamples(cfg: CMngtAppConfig | null): ManualProductInput[] {
  const f = cfg?.features?.products;
  const code = codeBuilder(f?.codePrefix, f?.codePadLength, 'PRD-');
  const withPrice = f?.priceManagement === true;
  return [
    {
      name: 'Sản phẩm mẫu A',
      code: code(1),
      unit: 'CÁI',
      units: ['CÁI', 'THÙNG'],
      unitConversions: [{ unit: 'THÙNG', quantity: 24, baseUnit: 'CÁI' }],
      category: 'THIẾT BỊ',
      sku: 'SKU-0001',
      minStock: 10,
      ...(withPrice ? { price: 150000, basePrice: 120000 } : {}),
    },
    {
      name: 'Sản phẩm mẫu B',
      code: code(2),
      unit: 'CÁI',
      units: ['CÁI'],
      category: 'PHỤ KIỆN',
      ...(withPrice ? { price: 45000 } : {}),
    },
  ];
}

export function buildVendorSamples(cfg: CMngtAppConfig | null): ManualVendorInput[] {
  const f = cfg?.features?.vendors;
  const code = codeBuilder(f?.codePrefix, f?.codePadLength, 'VND-');
  return [
    {
      name: 'Nhà cung cấp mẫu A',
      code: code(1),
      phone: '0281-234-567',
      address: '12 Lê Lợi, Q.1, TP.HCM',
      contactPerson: 'Anh Tuấn',
      extra: { taxCode: '0312345678' },
    },
    { name: 'Nhà cung cấp mẫu B' },
  ];
}

export function buildCustomerSamples(cfg: CMngtAppConfig | null): ManualCustomerInput[] {
  const f = cfg?.features?.customers;
  const code = codeBuilder(f?.codePrefix, f?.codePadLength, 'CST-');
  return [
    {
      name: 'Khách hàng mẫu A',
      code: code(1),
      phone: '0903-111-222',
      address: '45 Trần Hưng Đạo, Thủ Dầu Một, Bình Dương',
      contactPerson: 'Chị Hoa',
      extra: { shortName: 'KH A', taxCode: '0309876543' },
    },
    { name: 'Khách hàng mẫu B' },
  ];
}
