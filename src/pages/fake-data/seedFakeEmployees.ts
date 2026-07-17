

import { cMngtConnector, cSsoConnector, cStorageConnector } from '@credo/connectors/connector';
import { generateId, generatePassword } from '@credo/kits/string';
import { generateName } from '../../../scripts/faker/name';
import type { FakeDataSecrets } from './fakeDataSecrets';

export type ManualEmployeeInput = {
  name?: string;
  firstName?: string;
  lastName?: string;
  department?: string;
  phone?: string;
  personalPhone?: string;
  email?: string;
  position?: string;
  code?: string;
  gender?: 'M' | 'F';
  notes?: string;
};

export type SeedEmployeesOptions = {
  clientCode: string;
  
  count: number;
  skipSso: boolean;
  secrets: FakeDataSecrets;
  
  items?: ManualEmployeeInput[];
  
  onLog?: (line: string) => void;
};

export type SeedEmployeesResult = {
  generated: number;
  ssoCreated: number;
  ssoFailed: number;
  ssoFailures: Array<{ email: string; error: string }>;
};

type EmployeeRecord = {
  id: string;
  name: string;
  code: string;
  email: string;
  phone: string;
  position: string;
  department: string;
  isActive: boolean;
  extra: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

const FALLBACK_DEPARTMENTS = ['Kinh Doanh', 'Giao nhận', 'Kế toán', 'Nhân sự', 'Kho'];

const FALLBACK_CODE_PREFIX = 'EMP-';
const FALLBACK_CODE_PAD_LENGTH = 4;
const SSO_CONCURRENCY = 20;

const RANDOM_MIN_PER_DEPARTMENT = 2;
const RANDOM_MAX_PER_DEPARTMENT = 5;

function ssoServiceCode(clientServiceCode: string) {
  return `c-mngt-${clientServiceCode}`;
}

function pad(n: number, len: number): string {
  return String(n).padStart(len, '0');
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

type EmployeeConfig = {
  departments: string[];
  codePrefix: string;
  codePadLength: number;
};

async function loadEmployeeConfig(
  clientCode: string,
  log: (line: string) => void,
): Promise<EmployeeConfig> {
  try {
    const res = await cMngtConnector.getAppConfig({ clientServiceCode: clientCode });
    const employees = (
      res.config as {
        features?: {
          employees?: {
            departmentOptions?: { value: string }[];
            codePrefix?: string;
            codePadLength?: number;
          };
        };
      }
    )?.features?.employees;

    const opts = employees?.departmentOptions;
    const departments = opts && opts.length > 0 ? opts.map((o) => o.value) : FALLBACK_DEPARTMENTS;
    if (opts && opts.length > 0) {
      log(`Loaded ${departments.length} department(s) from config: ${departments.join(', ')}`);
    } else {
      log('No department options in config — using fallback departments.');
    }

    const codePrefix = employees?.codePrefix ?? FALLBACK_CODE_PREFIX;
    const codePadLength = employees?.codePadLength ?? FALLBACK_CODE_PAD_LENGTH;
    log(`Employee code format: "${codePrefix}" + ${codePadLength}-digit number.`);
    return { departments, codePrefix, codePadLength };
  } catch (err) {
    log(`Warning: could not load config (${(err as Error).message}) — using fallbacks.`);
    return {
      departments: FALLBACK_DEPARTMENTS,
      codePrefix: FALLBACK_CODE_PREFIX,
      codePadLength: FALLBACK_CODE_PAD_LENGTH,
    };
  }
}

async function loadOperatorAccessKey(
  clientCode: string,
  log: (line: string) => void,
): Promise<string | null> {
  try {
    const res = await cMngtConnector.getClientByServiceCode<{ operatorAccessKey?: string }>({
      clientServiceCode: clientCode,
    });
    const key = res.clientConfig?.extra?.operatorAccessKey;
    if (key) {
      log(`Found operatorAccessKey for ${clientCode} — SSO creation enabled.`);
      return key;
    }
    log(`Warning: client "${clientCode}" has no operatorAccessKey — SSO creation disabled.`);
    return null;
  } catch (err) {
    log(`Warning: could not fetch client config for ${clientCode}: ${(err as Error).message}`);
    return null;
  }
}

function generateEmployees(config: EmployeeConfig): EmployeeRecord[] {
  const now = new Date().toISOString();
  const records: EmployeeRecord[] = [];
  let index = 0;
  for (const dept of config.departments) {
    const span = RANDOM_MAX_PER_DEPARTMENT - RANDOM_MIN_PER_DEPARTMENT + 1;
    const perDept = RANDOM_MIN_PER_DEPARTMENT + Math.floor(Math.random() * span);
    for (let k = 0; k < perDept; k++) {
      const { fullName, firstName, lastName, gender } = generateName();
      const code = `${config.codePrefix}${pad(index + 1, config.codePadLength)}`;
      const phone = `09${pad(Math.floor(Math.random() * 100_000_000), 8)}`;
      const email = `${code.toLowerCase().trim()}@auto.local`;
      records.push({
        id: generateId(),
        name: fullName,
        code,
        email,
        phone,
        position: '',
        department: dept,
        isActive: true,
        extra: {
          allowLogin: true,
          loginEmail: email,
          loginPassword: generatePassword(),
          notes: `Fake employee ${index + 1} (${dept})`,
          firstName,
          lastName,
          gender,
        },
        createdAt: now,
        updatedAt: now,
      });
      index++;
    }
  }
  return records;
}

function buildFromManualInput(
  rows: ManualEmployeeInput[],
  config: EmployeeConfig,
): EmployeeRecord[] {
  const now = new Date().toISOString();
  return rows.map((row, index): EmployeeRecord => {
    const code = row.code?.trim() || `${config.codePrefix}${pad(index + 1, config.codePadLength)}`;
    const firstName = row.firstName?.trim() ?? '';
    const lastName = row.lastName?.trim() ?? '';
    const name = row.name?.trim() || [lastName, firstName].filter(Boolean).join(' ').trim() || code;
    const email = row.email?.trim() || `${code.toLowerCase().trim()}@auto.local`;
    const phone = row.phone?.trim() || `09${pad(Math.floor(Math.random() * 100_000_000), 8)}`;
    const department =
      row.department?.trim() || (config.departments.length > 0 ? pick(config.departments) : '');
    return {
      id: generateId(),
      name,
      code,
      email,
      phone,
      position: row.position?.trim() ?? '',
      department,
      isActive: true,
      extra: {
        allowLogin: true,
        loginEmail: email,
        loginPassword: generatePassword(),
        notes: row.notes?.trim() || `Imported employee ${index + 1}`,
        firstName,
        lastName,
        ...(row.gender && { gender: row.gender }),
        ...(row.personalPhone?.trim() && {
          personalPhoneNumber: row.personalPhone.trim(),
        }),
      },
      createdAt: now,
      updatedAt: now,
    };
  });
}

async function removeExistingEmployeeSsoUsers(
  clientCode: string,
  storageServiceCode: string,
  operatorAccessKey: string | null,
  log: (line: string) => void,
): Promise<void> {
  if (!operatorAccessKey) {
    log('SSO cleanup skipped: no operatorAccessKey available.');
    return;
  }

  const key = `employees.${clientCode}`;
  let items: Array<{ extra?: { loginEmail?: unknown } }> = [];
  try {
    const res = await cStorageConnector.getRecordByKey<{
      items?: Array<{ extra?: { loginEmail?: unknown } }>;
    }>({ serviceCode: storageServiceCode, key });
    items = res?.record?.data?.items ?? [];
  } catch (err) {
    log(`SSO cleanup skipped: could not read ${key} (${(err as Error).message}).`);
    return;
  }

  const emails = items
    .map((emp) => emp?.extra?.loginEmail)
    .filter((e): e is string => typeof e === 'string' && e.trim().length > 0);
  if (emails.length === 0) {
    log(`SSO cleanup: no existing employee login emails under ${key}.`);
    return;
  }

  log(`Removing ${emails.length} existing SSO user(s) before overwrite...`);
  try {
    const res = await cSsoConnector.operatorDeleteUsers(operatorAccessKey, {
      serviceCode: ssoServiceCode(clientCode),
      emails,
    });
    const failed = (res.results ?? []).filter((r) => !r.success);
    if (failed.length > 0) {
      log(`  SSO cleanup: ${emails.length - failed.length} removed, ${failed.length} failed.`);
      for (const f of failed.slice(0, 5)) {
        log(`    ${f.email}: ${f.error ?? 'unknown error'}`);
      }
    } else {
      log(`  Removed ${emails.length} SSO user(s).`);
    }
  } catch (err) {
    log(`SSO cleanup failed (${(err as Error).message}) — continuing.`);
  }
}

async function writeEmployeesEnvelope(
  clientCode: string,
  storageServiceCode: string,
  items: EmployeeRecord[],
  log: (line: string) => void,
): Promise<void> {
  const key = `employees.${clientCode}`;
  const envelope = {
    items,
    meta: {
      updatedAt: new Date().toISOString(),
      version: 1,
      hash: Date.now().toString(36),
    },
  };
  log(`Writing ${key} (${items.length} record(s))...`);
  await cStorageConnector.pushRecord({
    serviceCode: storageServiceCode,
    key,
    data: envelope,
    isPrivate: undefined,
    description: undefined,
  });

  for (const sub of ['master-data', 'master-data-version'] as const) {
    const fullKey = `${sub}.${clientCode}`;
    try {
      await cStorageConnector.removeRecord({ serviceCode: storageServiceCode, key: fullKey });
      log(`  Invalidated: ${fullKey}`);
    } catch {
      log(`  Skipped (not found): ${fullKey}`);
    }
  }
}

async function createSsoUsers(
  clientCode: string,
  operatorAccessKey: string,
  employees: EmployeeRecord[],
  log: (line: string) => void,
): Promise<{
  ssoCreated: number;
  ssoFailed: number;
  ssoFailures: Array<{ email: string; error: string }>;
}> {
  const serviceCode = ssoServiceCode(clientCode);
  const result = {
    ssoCreated: 0,
    ssoFailed: 0,
    ssoFailures: [] as Array<{ email: string; error: string }>,
  };

  log(
    `Creating ${employees.length} SSO user(s) at ${serviceCode} (concurrency=${SSO_CONCURRENCY})...`,
  );

  for (let i = 0; i < employees.length; i += SSO_CONCURRENCY) {
    const batch = employees.slice(i, i + SSO_CONCURRENCY);
    const outcomes = await Promise.allSettled(
      batch.map(async (emp) => {
        const email = emp.extra.loginEmail as string;
        const password = emp.extra.loginPassword as string;
        const res = await cSsoConnector.operatorAddUser(operatorAccessKey, {
          serviceCode,
          email,
          password,
        });
        if (!res.success) throw new Error('operatorAddUser returned success=false');
        return email;
      }),
    );

    for (let j = 0; j < outcomes.length; j++) {
      const outcome = outcomes[j]!;
      const emp = batch[j]!;
      if (outcome.status === 'fulfilled') {
        result.ssoCreated++;
      } else {
        result.ssoFailed++;
        result.ssoFailures.push({
          email: (emp.extra.loginEmail as string) ?? '?',
          error: (outcome.reason as Error).message,
        });
      }
    }

    const done = Math.min(i + SSO_CONCURRENCY, employees.length);
    log(
      `  SSO progress: ${done}/${employees.length} (created=${result.ssoCreated}, failed=${result.ssoFailed})`,
    );
  }

  return result;
}

export async function seedFakeEmployees(opts: SeedEmployeesOptions): Promise<SeedEmployeesResult> {
  
  
  
  const { clientCode, skipSso, secrets, items: manualItems, onLog } = opts;
  const log = (line: string) => onLog?.(line);

  
  
  
  
  
  
  
  
  cMngtConnector.setTrustedServiceKey(secrets.trustedServiceKey);
  cMngtConnector.setClientCode(clientCode);
  cMngtConnector.setAccessKey(secrets.cMngtAdminAccessKey);
  cStorageConnector.setTrustedServiceKey(secrets.trustedServiceKey);
  cStorageConnector.configureForAdmin({
    superAdminAccessKey: '',
    internalAccessKey: secrets.storageInternalAccessKey,
    accessKey: secrets.storageAccessKey,
  });
  cSsoConnector.setTrustedServiceKey(secrets.trustedServiceKey);

  const sourceLabel = manualItems
    ? `JSON input (${manualItems.length} rows)`
    : `random (${RANDOM_MIN_PER_DEPARTMENT}-${RANDOM_MAX_PER_DEPARTMENT} per department)`;
  log(`Scope: ${clientCode} | Source: ${sourceLabel} | SkipSSO: ${skipSso}`);

  const [config, operatorAccessKey] = await Promise.all([
    loadEmployeeConfig(clientCode, log),
    skipSso ? Promise.resolve(null) : loadOperatorAccessKey(clientCode, log),
  ]);

  let items: EmployeeRecord[];
  if (manualItems) {
    log(`Building ${manualItems.length} employee(s) from JSON input...`);
    items = buildFromManualInput(manualItems, config);
  } else {
    
    
    log(
      `Generating employees: ${RANDOM_MIN_PER_DEPARTMENT}-${RANDOM_MAX_PER_DEPARTMENT} per department × ${config.departments.length} dept(s)...`,
    );
    items = generateEmployees(config);
    log(
      `  Generated ${items.length} employee(s) across ${config.departments.length} department(s).`,
    );
  }

  await removeExistingEmployeeSsoUsers(
    clientCode,
    secrets.storageServiceCode,
    operatorAccessKey,
    log,
  );

  await writeEmployeesEnvelope(clientCode, secrets.storageServiceCode, items, log);
  log(`Wrote ${items.length} employee(s) to employees.${clientCode}.`);

  let ssoResult = {
    ssoCreated: 0,
    ssoFailed: 0,
    ssoFailures: [] as Array<{ email: string; error: string }>,
  };
  if (skipSso) {
    log('SSO creation skipped (--skip-sso).');
  } else if (!operatorAccessKey) {
    log('SSO creation skipped (no operatorAccessKey available).');
  } else {
    ssoResult = await createSsoUsers(clientCode, operatorAccessKey, items, log);
    log(`SSO summary: created=${ssoResult.ssoCreated}, failed=${ssoResult.ssoFailed}`);
  }

  return {
    generated: items.length,
    ...ssoResult,
  };
}
