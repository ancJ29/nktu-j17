/** Separate because two unrelated call sites ask for the same key. */

import { PasswordInput } from '@mantine/core';
import { SSO_ADMIN_KEY_STORAGE, writeSecret } from './secrets';

/** Asked at the point of use, prefilled from sessionStorage: typed once a
 *  session, without the gate pretending to have validated what it cannot reach. */
export function SsoAdminKeyField({
  value,
  onChange,
  action,
}: {
  value: string;
  onChange: (v: string) => void;
  action: string;
}) {
  return (
    <PasswordInput
      label="CREDO_SSO_ADMIN_ACCESS_KEY"
      description={`Sent to the BFF for this ${action} only. It is not stored on the server.`}
      value={value}
      onChange={(e) => {
        onChange(e.currentTarget.value);
        writeSecret(SSO_ADMIN_KEY_STORAGE, e.currentTarget.value);
      }}
      autoComplete="off"
      spellCheck={false}
      size="sm"
    />
  );
}
