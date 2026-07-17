

const STORAGE_KEYS = {
  cMngtAdminAccessKey: '__c_mngt_admin_key__', 
  trustedServiceKey: '__fake_data_trusted_service_key__',
  storageServiceCode: '__fake_data_storage_service_code__',
  storageAccessKey: '__fake_data_storage_access_key__',
  storageInternalAccessKey: '__fake_data_storage_internal_access_key__',
} as const;

export type FakeDataSecrets = {
  cMngtAdminAccessKey: string;
  trustedServiceKey: string;
  storageServiceCode: string;
  storageAccessKey: string;
  storageInternalAccessKey: string;
};

export type FakeDataSecretField = keyof FakeDataSecrets;

export const FAKE_DATA_SECRET_FIELDS: FakeDataSecretField[] = [
  'trustedServiceKey',
  'cMngtAdminAccessKey',
  'storageServiceCode',
  'storageAccessKey',
  'storageInternalAccessKey',
];

function readField(field: FakeDataSecretField): string {
  try {
    return sessionStorage.getItem(STORAGE_KEYS[field]) ?? '';
  } catch {
    return '';
  }
}

export function getFakeDataSecrets(): FakeDataSecrets {
  return {
    cMngtAdminAccessKey: readField('cMngtAdminAccessKey'),
    trustedServiceKey: readField('trustedServiceKey'),
    storageServiceCode: readField('storageServiceCode') || 'c-mngt',
    storageAccessKey: readField('storageAccessKey'),
    storageInternalAccessKey: readField('storageInternalAccessKey'),
  };
}

export function hasAllFakeDataSecrets(): boolean {
  const secrets = getFakeDataSecrets();
  return FAKE_DATA_SECRET_FIELDS.every((f) => secrets[f].trim().length > 0);
}

export function saveFakeDataSecrets(secrets: FakeDataSecrets): void {
  for (const field of FAKE_DATA_SECRET_FIELDS) {
    const value = secrets[field].trim();
    if (value) sessionStorage.setItem(STORAGE_KEYS[field], value);
    else sessionStorage.removeItem(STORAGE_KEYS[field]);
  }
}

export function clearFakeDataSecrets(): void {
  for (const field of FAKE_DATA_SECRET_FIELDS) {
    sessionStorage.removeItem(STORAGE_KEYS[field]);
  }
}
