import { cMngtConnector } from '@credo/connectors/connector';
import { generateId, newVersion } from '@credo/kits/string';
import { generateName } from '../../../scripts/faker/name';
import type { IndustryName } from '../../../scripts/faker/industry';
import {
  configureSeedConnectors,
  pad,
  pick,
  pickN,
  randomInt,
  writeSingleModeEnvelope,
} from './_sharedSeed';
import type { FakeDataSecrets } from './fakeDataSecrets';

const FALLBACK_CODE_PREFIX = 'CST-';
const FALLBACK_CODE_PAD_LENGTH = 4;

const FAKE_GOOGLE_MAP_URL = 'https://maps.app.goo.gl/kqV6gLRZrhef8WUs8';

type CustomerConfig = {
  codePrefix: string;
  codePadLength: number;
};

async function loadCustomerConfig(
  clientCode: string,
  log: (line: string) => void,
): Promise<CustomerConfig> {
  try {
    const res = await cMngtConnector.getAppConfig({ clientServiceCode: clientCode });
    const customers = (
      res.config as {
        features?: {
          customers?: {
            codePrefix?: string;
            codePadLength?: number;
          };
        };
      }
    )?.features?.customers;

    const codePrefix = customers?.codePrefix ?? FALLBACK_CODE_PREFIX;
    const codePadLength = customers?.codePadLength ?? FALLBACK_CODE_PAD_LENGTH;
    log(`Customer code format: "${codePrefix}" + ${codePadLength}-digit number.`);
    return { codePrefix, codePadLength };
  } catch (err) {
    log(`Warning: could not load config (${(err as Error).message}) — using fallbacks.`);
    return { codePrefix: FALLBACK_CODE_PREFIX, codePadLength: FALLBACK_CODE_PAD_LENGTH };
  }
}

export type SeedCustomersOptions = {
  clientCode: string;
  industry: IndustryName;
  count: number;
  secrets: FakeDataSecrets;

  items?: ManualCustomerInput[];
  onLog?: (line: string) => void;
};

export type SeedCustomersResult = {
  generated: number;
};

export type ManualCustomerInput = {
  name?: string;
  code?: string;
  email?: string;
  phone?: string;
  address?: string;
  contactPerson?: string;
  isActive?: boolean;
  extra?: Record<string, unknown>;
};

type CustomerRecord = {
  id: string;
  name: string;
  code: string;
  email: string;
  phone: string;
  address: string;
  contactPerson: string;
  isActive: boolean;
  extra: Record<string, unknown>;
  version: string;
  createdAt: number;
  updatedAt: number;
};

const COMPANY_SUFFIXES = ['TNHH', 'CP', 'TM-DV', 'XNK'];

const CUSTOMER_TYPES_BY_INDUSTRY: Record<IndustryName, string[]> = {
  food: [
    'Nhà Hàng',
    'Quán Cafe',
    'Quán Ăn',
    'Khách Sạn',
    'Cửa Hàng Tạp Hóa',
    'Siêu Thị Mini',
    'Tiệm Bánh',
    'Căng Tin',
    'Bếp Ăn Công Nghiệp',
    'Chuỗi Đồ Uống',
    'Trường Học',
  ],
  mechanical: [
    'Nhà Máy',
    'Xưởng Cơ Khí',
    'Công Ty Xây Dựng',
    'Nhà Thầu',
    'Xưởng Sản Xuất',
    'Cơ Sở Lắp Ráp',
    'Công Ty Chế Tạo',
    'Nhà Máy Sản Xuất',
    'Xưởng Gia Công',
  ],
};

const CUSTOMER_CATEGORIES = ['Đại lý', 'Bán lẻ', 'Bán sỉ', 'Khách lẻ', 'Khách dự án'];

const TAGS = ['VIP', 'Vàng', 'Mới', 'Thân thiết', 'Thanh toán nhanh', 'Cần theo dõi'];

const STREETS = [
  'Phú Thọ Hòa',
  'Lũy Bán Bích',
  'Tân Kỳ Tân Quý',
  'Lê Trọng Tấn',
  'Gò Dầu',
  'Trường Chinh',
  'Cộng Hòa',
  'Nguyễn Sơn',
  'Âu Cơ',
  'Thoại Ngọc Hầu',
  'Cách Mạng Tháng 8',
  'Hai Bà Trưng',
  'Nguyễn Thị Minh Khai',
  'Pasteur',
  'Lý Tự Trọng',
];

const AREAS = [
  'Quận 1',
  'Quận 3',
  'Quận 5',
  'Quận 7',
  'Quận 10',
  'Tân Bình',
  'Tân Phú',
  'Phú Nhuận',
  'Bình Thạnh',
  'Thủ Đức',
  'Gò Vấp',
  'Bình Dương',
  'Đồng Nai',
];

const INDUSTRIAL_PARKS = [
  'KCN Sóng Thần 1',
  'KCN Sóng Thần 2',
  'KCN Tân Bình',
  'KCN Vĩnh Lộc',
  'KCN Tân Tạo',
  'KCN Hiệp Phước',
  'KCN Linh Trung',
  'KCN Long Hậu',
];

const CONTACT_ROLES = [
  'Giám đốc',
  'Phó giám đốc',
  'Kế toán',
  'Mua hàng',
  'Trưởng phòng',
  'Nhân viên kinh doanh',
  'Quản lý kho',
];

const PRICE_LISTS = [
  'Giá đại lý cấp 1',
  'Giá đại lý cấp 2',
  'Giá bán lẻ',
  'Giá khách dự án',
  'Giá ưu đãi',
];

const PAYMENT_TERMS = [
  'Thanh toán ngay',
  'NET 7 ngày',
  'NET 15 ngày',
  'NET 30 ngày',
  'NET 45 ngày',
];

const DELIVERY_METHODS = [
  'Giao tận kho',
  'Giao tại cửa hàng',
  'Khách tự nhận',
  'Giao theo yêu cầu',
];

const CUSTOMER_SOURCES = [
  'Giới thiệu',
  'Website',
  'Hội chợ',
  'Hotline',
  'Nhân viên kinh doanh',
  'Mạng xã hội',
];

const RECEIVING_HOURS = [
  '7:30 - 16:30 (T2 - T6)',
  '8:00 - 17:00 (T2 - T7)',
  '7:00 - 11:30, 13:30 - 17:30 (T2 - T6)',
  'Cả ngày (T2 - CN)',
];

const NOTES_POOL = [
  'Khách hàng thân thiết, ưu tiên giao hàng nhanh.',
  'Yêu cầu xuất hóa đơn VAT cho mọi đơn hàng.',
  'Giờ làm việc cao điểm 11h - 14h, tránh gọi điện.',
  'Thanh toán đúng hạn, có chiết khấu thêm 1%.',
  'Cần thông báo trước khi giao trên 50 thùng.',
];

function buildEmailFrom(name: string, domain: string): string {
  const ascii = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '');
  return `${ascii}@${domain}`;
}

function randomMobile(): string {
  const prefix = pick(['090', '091', '093', '094', '096', '097', '098', '081', '082', '083']);
  return `${prefix}${pad(Math.floor(Math.random() * 10_000_000), 7)}`;
}

function randomPastDate(maxYearsAgo: number): string {
  const now = Date.now();
  const span = maxYearsAgo * 365 * 24 * 60 * 60 * 1000;
  const ts = now - Math.floor(Math.random() * span);
  return new Date(ts).toISOString().slice(0, 10);
}

function generateContacts(
  primaryFullName: string,
  primaryRole: string,
  primaryPhone: string,
  primaryEmail: string,
): Array<Record<string, unknown>> {
  const extraCount = randomInt(0, 2);
  const primary = {
    id: generateId(),
    name: primaryFullName,
    role: primaryRole,
    phone: primaryPhone,
    email: primaryEmail,
    isPrimary: true,
  };
  const additionals = Array.from({ length: extraCount }, () => {
    const { fullName } = generateName();
    return {
      id: generateId(),
      name: fullName,
      role: pick(CONTACT_ROLES),
      phone: randomMobile(),
      email: buildEmailFrom(fullName, primaryEmail.split('@')[1] ?? 'cr3do.dev'),
    };
  });
  return [primary, ...additionals];
}

function generateShippingAddresses(): Array<Record<string, unknown>> {
  const count = randomInt(0, 2);
  return Array.from({ length: count }, () => {
    const park = pick(INDUSTRIAL_PARKS);
    const lot = `Lô ${pick(['A', 'B', 'C', 'D'])}${randomInt(1, 9)}`;
    const area = pick(AREAS);
    return {
      id: generateId(),
      address: `${park}, ${lot}, ${area}`,
      googleMapUrl: FAKE_GOOGLE_MAP_URL,
      deliveryHours: pick(RECEIVING_HOURS),
    };
  });
}

function generateCustomers(
  industry: IndustryName,
  count: number,
  clientCode: string,
  config: CustomerConfig,
): CustomerRecord[] {
  const now = Date.now();
  const types = CUSTOMER_TYPES_BY_INDUSTRY[industry];
  const lowerClient = clientCode.toLowerCase();
  const domain = `${lowerClient}.cr3do.dev`;

  return Array.from({ length: count }, (_, index): CustomerRecord => {
    const { firstName, fullName } = generateName();
    const suffix = pick(COMPANY_SUFFIXES);
    const businessType = pick(types);

    const companyName = `Công ty ${suffix} ${businessType} ${firstName}`;
    const shortName = firstName.trim();
    const code = `${config.codePrefix}${pad(index + 1, config.codePadLength)}`;
    const phone = `028${pad(Math.floor(Math.random() * 10_000_000), 7)}`;
    const email = `${code.toLowerCase()}@${domain}`;
    const street = pick(STREETS);
    const area = pick(AREAS);
    const address = `${randomInt(1, 500)} ${street}, ${area}`;
    const taxCode = pad(Math.floor(Math.random() * 1_000_000_000), 10);

    const customerType = pick(CUSTOMER_CATEGORIES);
    const tags = pickN(TAGS, 0, 2);
    const website =
      Math.random() < 0.6
        ? `https://${shortName.toLowerCase().replace(/\s+/g, '')}.example.com`
        : undefined;
    const primaryRole = pick(['Giám đốc', 'Chủ doanh nghiệp', 'Trưởng phòng mua hàng']);
    const contactsList = generateContacts(
      fullName,
      primaryRole,
      randomMobile(),
      buildEmailFrom(fullName, domain),
    );
    const shipping = generateShippingAddresses();

    const extra: Record<string, unknown> = {
      shortName,
      customerType,
      taxCode,
      contacts: contactsList,
      addressGoogleMapUrl: FAKE_GOOGLE_MAP_URL,
      priceList: pick(PRICE_LISTS),
      defaultDiscountPercent: pick([0, 1, 2, 3, 5, 7, 10]),
      paymentTerms: pick(PAYMENT_TERMS),
      creditLimit: randomInt(2, 20) * 10_000_000,
      accountManager: generateName().fullName,
      deliveryMethod: pick(DELIVERY_METHODS),
      source: pick(CUSTOMER_SOURCES),
      becameCustomerDate: randomPastDate(5),
    };
    if (tags.length) extra.tags = tags;
    if (website) extra.website = website;
    if (shipping.length) extra.shippingAddresses = shipping;
    if (Math.random() < 0.4) {
      extra.notes = [
        {
          id: generateId(),
          text: pick(NOTES_POOL),
          createdAt: now,
          createdBy: 'seed@fake.local',
          createdByName: 'Fake seeder',
        },
      ];
    }

    return {
      id: generateId(),
      name: companyName,
      code,
      email,
      phone,
      address,
      contactPerson: fullName,
      isActive: true,
      extra,
      version: newVersion(),
      createdAt: now,
      updatedAt: now,
    };
  });
}

function buildCustomersFromManualInput(
  rows: ManualCustomerInput[],
  clientCode: string,
  config: CustomerConfig,
): CustomerRecord[] {
  const now = Date.now();
  const lowerClient = clientCode.toLowerCase();
  const domain = `${lowerClient}.cr3do.dev`;

  return rows.map((row, index): CustomerRecord => {
    const code = row.code?.trim() || `${config.codePrefix}${pad(index + 1, config.codePadLength)}`;
    const name = row.name?.trim() || code;
    const email = row.email?.trim() || `${code.toLowerCase()}@${domain}`;

    return {
      id: generateId(),
      name,
      code,
      email,
      phone: row.phone ?? '',
      address: row.address ?? '',
      contactPerson: row.contactPerson ?? '',
      isActive: row.isActive ?? true,
      extra: row.extra ?? {},
      version: newVersion(),
      createdAt: now,
      updatedAt: now,
    };
  });
}

export async function seedFakeCustomers(opts: SeedCustomersOptions): Promise<SeedCustomersResult> {
  const { clientCode, industry, count, secrets, items: manualItems, onLog } = opts;
  const log = onLog ?? (() => {});

  configureSeedConnectors(secrets, clientCode);

  const customerConfig = await loadCustomerConfig(clientCode, log);

  let items: CustomerRecord[];
  if (manualItems) {
    log(`Source: JSON input (${manualItems.length} rows)`);
    items = buildCustomersFromManualInput(manualItems, clientCode, customerConfig);
  } else {
    log(`Industry: ${industry} | Generating ${count} customer(s)...`);
    items = generateCustomers(industry, count, clientCode, customerConfig);
  }

  await writeSingleModeEnvelope({
    clientCode,
    storageServiceCode: secrets.storageServiceCode,
    entity: 'customers',
    items,
    log,
  });

  log(`Done — wrote ${items.length} customer(s).`);
  return { generated: items.length };
}
