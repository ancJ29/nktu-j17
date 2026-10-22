import { Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import {
  createOptionLabelResolver,
  getDepartmentOptions,
  resolveOptions,
} from '@/utils/permission';

export function NoNextStepNote({
  departments,
  withheldByPermission,
}: {
  readonly departments: readonly string[];

  readonly withheldByPermission: boolean;
}) {
  const { t } = useTranslation();
  if (departments.length === 0 && !withheldByPermission) return null;

  const labelOf = createOptionLabelResolver(resolveOptions(getDepartmentOptions()));
  return (
    <Text size="sm" c="dimmed">
      {departments.length > 0
        ? t('common.transitions.onlyDepartments', {
            departments: departments.map((value) => labelOf(value)).join(', '),
          })
        : t('common.transitions.noPermission')}
    </Text>
  );
}
