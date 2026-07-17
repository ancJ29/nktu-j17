

import { cMngtConnector } from '@credo/connectors/connector';
import { generateId, newVersion } from '@credo/kits/string';
import { generateName } from '../../../scripts/faker/name';
import type { IndustryName } from '../../../scripts/faker/industry';
import {
  configureSeedConnectors,
  pad,
  pick,
  randomInt,
  writeSingleModeEnvelope,
} from './_sharedSeed';
import type { FakeDataSecrets } from './fakeDataSecrets';

const FALLBACK_CODE_PREFIX = 'VND-';
const FALLBACK_CODE_PAD_LENGTH = 4;

const FAKE_GOOGLE_MAP_URL = 'https://maps.app.goo.gl/kqV6gLRZrhef8WUs8';

type VendorConfig = {
  codePrefix: string;
  codePadLength: number;
};

async function loadVendorConfig(
  clientCode: string,
  log: (line: string) => void,
): Promise<VendorConfig> {
  try {
    const res = await cMngtConnector.getAppConfig({ clientServiceCode: clientCode });
    const vendors = (
      res.config as {
        features?: {
          vendors?: {
            codePrefix?: string;
            codePadLength?: number;
          };
        };
      }
    )?.features?.vendors;

    const codePrefix = vendors?.codePrefix ?? FALLBACK_CODE_PREFIX;
    const codePadLength = vendors?.codePadLength ?? FALLBACK_CODE_PAD_LENGTH;
    log(`Vendor code format: "${codePrefix}" + ${codePadLength}-digit number.`);
    return { codePrefix, codePadLength };
  } catch (err) {
    log(`Warning: could not load config (${(err as Error).message}) — using fallbacks.`);
    return { codePrefix: FALLBACK_CODE_PREFIX, codePadLength: FALLBACK_CODE_PAD_LENGTH };
  }
}

export type SeedVendorsOptions = {
  clientCode: string;
  industry: IndustryName;
  count: number;
  secrets: FakeDataSecrets;
  
  items?: ManualVendorInput[];
  onLog?: (line: string) => void;
};

export type SeedVendorsResult = {
  generated: number;
};

export type ManualVendorInput = {
  name?: string;
  code?: string;
  email?: string;
  phone?: string;
  address?: string;
  contactPerson?: string;
  isActive?: boolean;
  extra?: Record<string, unknown>;
};

type VendorRecord = {
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

const COMPANY_SUFFIXES = ['TNHH', 'CP', 'SX-TM', 'XNK', 'TM-DV'];

const BUSINESS_NICHES_BY_INDUSTRY: Record<IndustryName, string[]> = {
  food: [
    'Thực Phẩm',
    'Nguyên Liệu',
    'Bột Mì',
    'Gia Vị',
    'Dầu Ăn',
    'Bao Bì',
    'Đóng Gói',
    'Sữa & Bơ',
    'Hương Liệu',
    'Phụ Gia',
    'Thịt Chế Biến',
    'Đường & Mật',
  ],
  mechanical: [
    'Cơ Khí',
    'Vật Tư Kim Loại',
    'Linh Kiện',
    'Phụ Tùng',
    'Dụng Cụ',
    'Điện Tử',
    'Vật Liệu Hàn',
    'Khuôn Mẫu',
    'Chế Tạo Máy',
    'Bao Bì Công Nghiệp',
  ],
};

const VENDOR_TYPES = ['Nguyên vật liệu', 'Dịch vụ', 'Vận chuyển', 'Thiết bị'];

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
];

const AREAS = [
  'KCN Tân Tạo',
  'KCN Vĩnh Lộc',
  'KCN Tân Bình',
  'Bình Dương',
  'Đồng Nai',
  'Long An',
  'Tân Phú',
  'Quận 5',
  'Quận 7',
  'Thủ Đức',
];

const CONTACT_ROLES = [
  'Giám đốc',
  'Giám đốc kinh doanh',
  'Trưởng phòng kinh doanh',
  'Kế toán trưởng',
  'Kế toán',
  'Nhân viên kinh doanh',
  'Quản lý kho',
];

const PAYMENT_TERMS = [
  'Thanh toán ngay',
  'NET 7 ngày',
  'NET 15 ngày',
  'NET 30 ngày',
  'NET 45 ngày',
];

const BANKS = [
  'Vietcombank',
  'ACB',
  'Techcombank',
  'BIDV',
  'Vietinbank',
  'Sacombank',
  'MB Bank',
  'TPBank',
];

const NOTES_POOL = [
  'NCC giao hàng chậm vào cuối tháng. Nên đặt trước 2 tuần.',
  'Yêu cầu xác nhận đơn qua email trước khi giao.',
  'Có chiết khấu thêm khi đặt số lượng lớn.',
  'Liên hệ chị Hoa kế toán cho mọi vấn đề hóa đơn.',
  'Giao hàng vào buổi sáng, tránh khung giờ 11h-13h.',
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
    
    ...(Math.random() < 0.3 ? { zalo: randomMobile() } : { zalo: primaryPhone }),
    email: primaryEmail,
    isPrimary: true,
  };
  const additionals = Array.from({ length: extraCount }, () => {
    const { fullName } = generateName();
    const phone = randomMobile();
    return {
      id: generateId(),
      name: fullName,
      role: pick(CONTACT_ROLES),
      phone,
      zalo: phone,
      email: buildEmailFrom(fullName, primaryEmail.split('@')[1] ?? 'cr3do.dev'),
    };
  });
  return [primary, ...additionals];
}

function generateBankAccounts(holderName: string): Array<Record<string, unknown>> {
  
  const r = Math.random();
  const count = r < 0.1 ? 0 : r < 0.7 ? 1 : 2;
  return Array.from({ length: count }, () => ({
    id: generateId(),
    bank: pick(BANKS),
    accountNumber: pad(Math.floor(Math.random() * 1_000_000_000_0), 10),
    accountHolder: holderName,
  }));
}

function generateVendors(
  industry: IndustryName,
  count: number,
  clientCode: string,
  config: VendorConfig,
): VendorRecord[] {
  const now = Date.now();
  const niches = BUSINESS_NICHES_BY_INDUSTRY[industry];
  const lowerClient = clientCode.toLowerCase();
  const domain = `${lowerClient}.cr3do.dev`;

  return Array.from({ length: count }, (_, index): VendorRecord => {
    const { firstName, fullName } = generateName();
    const suffix = pick(COMPANY_SUFFIXES);
    const niche = pick(niches);
    
    const companyName = `Công ty ${suffix} ${niche} ${firstName}`;
    const shortName = `${niche} ${firstName}`;
    const code = `${config.codePrefix}${pad(index + 1, config.codePadLength)}`;
    const phone = `028${pad(Math.floor(Math.random() * 10_000_000), 7)}`;
    const email = `${code.toLowerCase()}@${domain}`;
    const street = pick(STREETS);
    const area = pick(AREAS);
    const address = `${randomInt(1, 500)} ${street}, ${area}`;
    const taxCode = pad(Math.floor(Math.random() * 1_000_000_000), 10);

    const vendorType = pick(VENDOR_TYPES);
    const website =
      Math.random() < 0.5
        ? `https://${shortName.toLowerCase().replace(/\s+/g, '')}.example.com`
        : undefined;
    const primaryRole = pick(['Giám đốc', 'Giám đốc kinh doanh', 'Chủ doanh nghiệp']);
    const contactPhone = randomMobile();
    const contactEmail = buildEmailFrom(fullName, domain);
    const contactsList = generateContacts(fullName, primaryRole, contactPhone, contactEmail);
    const bankAccounts = generateBankAccounts(companyName);

    const extra: Record<string, unknown> = {
      shortName,
      vendorType,
      taxCode,
      payableCreditLimit: randomInt(2, 20) * 10_000_000,
      paymentTerms: pick(PAYMENT_TERMS),
      accountManager: generateName().fullName,
      zalo: phone, 
      contacts: contactsList,
      addressGoogleMapUrl: FAKE_GOOGLE_MAP_URL,
      
      invoiceName: companyName.toUpperCase(),
      invoiceEmail: `ketoan-${code.toLowerCase()}@${domain}`,
      invoiceRecipient: fullName,
    };
    if (website) extra.website = website;
    if (bankAccounts.length) extra.bankAccounts = bankAccounts;
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

function buildVendorsFromManualInput(
  rows: ManualVendorInput[],
  clientCode: string,
  config: VendorConfig,
): VendorRecord[] {
  const now = Date.now();
  const lowerClient = clientCode.toLowerCase();
  const domain = `${lowerClient}.cr3do.dev`;

  return rows.map((row, index): VendorRecord => {
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

export async function seedFakeVendors(opts: SeedVendorsOptions): Promise<SeedVendorsResult> {
  const { clientCode, industry, count, secrets, items: manualItems, onLog } = opts;
  const log = onLog ?? (() => {});

  configureSeedConnectors(secrets, clientCode);

  const vendorConfig = await loadVendorConfig(clientCode, log);

  let items: VendorRecord[];
  if (manualItems) {
    log(`Source: JSON input (${manualItems.length} rows)`);
    items = buildVendorsFromManualInput(manualItems, clientCode, vendorConfig);
  } else {
    log(`Industry: ${industry} | Generating ${count} vendor(s)...`);
    items = generateVendors(industry, count, clientCode, vendorConfig);
  }

  await writeSingleModeEnvelope({
    clientCode,
    storageServiceCode: secrets.storageServiceCode,
    entity: 'vendors',
    items,
    log,
  });

  log(`Done — wrote ${items.length} vendor(s).`);
  return { generated: items.length };
}
