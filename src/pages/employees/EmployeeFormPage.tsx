import { Button, Divider, Group, Stack, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconArrowLeft, IconFileSpreadsheet, IconUserPlus } from '@tabler/icons-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router';
import { appConfig } from '@/config';
import { ROUTES } from '@/constants/routes';
import { codeToLoginEmail, AUTO_LOGIN_DOMAIN } from '@/utils/loginEmail';
import { cMngtConnector } from '@credo/connectors/connector';
import { useEmployeeStore } from '@/stores/useEmployeeStore';
import { useTruckAssetStore } from '@/stores/useTruckAssetStore';
import { EntityConflictError } from '@/stores/createEntityStore';
import { isListVersionConflict, readListHash } from '@/utils/listVersionConflict';
import { device } from '@credo/base-ui/utils';
import { Tabs } from '@credo/base-ui/components';
import { useInitFormFromFetch } from '@/hooks';

import {
  hasBulkImportForEmployees,
  hasDepartmentForEmployees,
  hasEmailForEmployees,
  hasPositionForEmployees,
  perms,
} from '@/utils/permission';
import type { Employee, EmployeeExtra } from '@/types';
import {
  ExcelParseError,
  generateEmployeeExcelTemplate,
  parseEmployeeExcelFile,
} from '@/utils/excelParser';
import { useEmployeeFieldOptions } from './useEmployeeFieldOptions';
import { SingleEmployeeForm, type EmployeeFormValues } from './SingleEmployeeForm';
import { useDriverTruckReconcile } from './useDriverTruckReconcile';
import { BulkImportForm } from './BulkImportForm';
import { generatePassword, randomString } from '@credo/kits/string';
import { logActivity } from '@/utils/activityLogger';
import { deepDiff } from '@/utils/deepDiff';

const hasBulkImport = hasBulkImportForEmployees();
const hasEmail = hasEmailForEmployees();
const hasPosition = hasPositionForEmployees();
const hasDepartment = hasDepartmentForEmployees();
const isMobile = device.isMobile;
const canEdit = perms.employee.canEdit();

function buildProfileExtra(values: EmployeeFormValues): Partial<EmployeeExtra> {
  const truck = values.truckAssetId
    ? useTruckAssetStore.getState().items.find((a) => a.id === values.truckAssetId)
    : undefined;

  const truckAssetCode: Partial<EmployeeExtra> = truck
    ? { truckAssetCode: truck.extra?.plateNumber || truck.code }
    : values.truckAssetId
      ? {}
      : { truckAssetCode: undefined };

  return {
    ...truckAssetCode,
    startDate: values.startDate || undefined,
    address: values.address.trim() || undefined,
    dateOfBirth: values.dateOfBirth || undefined,
    idCardNumber: values.idCardNumber.trim() || undefined,
    idCardIssueDate: values.idCardIssueDate || undefined,
    idCardIssuePlace: values.idCardIssuePlace.trim() || undefined,
    licenseNumber: values.licenseNumber.trim() || undefined,
    licenseClass: values.licenseClass.trim() || undefined,
    licenseIssueDate: values.licenseIssueDate || undefined,
    licenseExpiry: values.licenseExpiry || undefined,
    licenseIssuePlace: values.licenseIssuePlace.trim() || undefined,
    truckAssetId: values.truckAssetId || undefined,
  };
}

function profileFormValues(emp: Employee) {
  const e = emp.extra ?? {};
  return {
    startDate: e.startDate ?? null,
    address: e.address ?? '',
    dateOfBirth: e.dateOfBirth ?? null,
    idCardNumber: e.idCardNumber ?? '',
    idCardIssueDate: e.idCardIssueDate ?? null,
    idCardIssuePlace: e.idCardIssuePlace ?? '',
    licenseNumber: e.licenseNumber ?? '',
    licenseClass: e.licenseClass ?? '',
    licenseIssueDate: e.licenseIssueDate ?? null,
    licenseExpiry: e.licenseExpiry ?? null,
    licenseIssuePlace: e.licenseIssuePlace ?? '',
    truckAssetId: e.truckAssetId ?? '',
  };
}

function buildNextEmployeeCode(n: number): string {
  const { codePrefix, codePadLength } = appConfig.features.employees;
  return `${codePrefix}${n.toString().padStart(Math.max(0, codePadLength), '0')}`;
}

const PHONE_ALLOWED = /^[0-9+\s\-()]+$/;

function isPhoneShapeValid(value: string): boolean {
  const v = value.trim();
  if (!v) return true;
  return v.length >= 10 && v.length <= 15 && PHONE_ALLOWED.test(v);
}

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function isEmailShapeValid(value: string): boolean {
  const v = value.trim();
  if (!v) return true;
  return EMAIL_SHAPE.test(v);
}

export function EmployeeFormPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { departmentOptions, positionOptions } = useEmployeeFieldOptions();
  const isEdit = !!id;
  const forceRefresh = useEmployeeStore((s) => s.forceRefresh);
  const totalEmployees = useEmployeeStore((s) => s.items.length);

  const reconcileTruckLink = useDriverTruckReconcile();

  useEffect(() => {
    if (isMobile || (isEdit && !canEdit) || (!isEdit && !perms.employee.canCreate())) {
      navigate(ROUTES.EMPLOYEES.LIST, { replace: true });
    }
  }, [navigate, isEdit]);

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>('single');

  const bulkNavTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(bulkNavTimer.current), []);

  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const fileRef = useRef<File | undefined>(undefined);
  const [file, setFile] = useState<File | undefined>();
  const [importResult, setImportResult] = useState<
    { summary: { total: number; success: number; failed: number }; errors?: string[] } | undefined
  >();

  const form = useForm<EmployeeFormValues>({
    initialValues: {
      name: '',
      code: isEdit ? '' : buildNextEmployeeCode(totalEmployees + 1),
      email: '',
      phone: '',
      personalPhoneNumber: '',
      position: '',
      department: '',
      isActive: true,
      startDate: null,
      address: '',
      dateOfBirth: null,
      idCardNumber: '',
      idCardIssueDate: null,
      idCardIssuePlace: '',
      licenseNumber: '',
      licenseClass: '',
      licenseIssueDate: null,
      licenseExpiry: null,
      licenseIssuePlace: '',
      truckAssetId: '',
    },
    validate: {
      name: (v) => (v.trim() ? null : t('employees.validation.nameRequired')),
      code: (v) => (v.trim() ? null : t('employees.validation.codeRequired')),
      email: (v) => (isEmailShapeValid(v) ? null : t('employees.validation.emailInvalid')),
      phone: (v) => (isPhoneShapeValid(v) ? null : t('employees.validation.phoneInvalid')),
      personalPhoneNumber: (v) =>
        isPhoneShapeValid(v) ? null : t('employees.validation.phoneInvalid'),
    },
  });

  useEffect(() => {
    if (isEdit) return;
    form.setFieldValue('code', buildNextEmployeeCode(totalEmployees + 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, totalEmployees]);

  const snapshotRef = useRef<Employee | null>(null);

  const resetFormFromEmployee = useCallback(
    (emp: Employee) => {
      snapshotRef.current = emp;
      form.setValues({
        name: emp.name,
        code: emp.code,
        email: emp.email || '',
        phone: emp.phone || '',
        personalPhoneNumber: emp.extra?.personalPhoneNumber || '',
        position: emp.position || '',
        department: emp.department || '',
        isActive: emp.isActive,
        ...profileFormValues(emp),
      });
    },
    [form],
  );

  const fetching = useInitFormFromFetch(
    form,
    id,
    async (id) => {
      const res = await cMngtConnector.getEmployeeById<EmployeeExtra>({ id });
      const emp = res.employee;
      snapshotRef.current = emp;
      return {
        name: emp.name,
        code: emp.code,
        email: emp.email || '',
        phone: emp.phone || '',
        personalPhoneNumber: emp.extra?.personalPhoneNumber || '',
        position: emp.position || '',
        department: emp.department || '',
        isActive: emp.isActive,
        ...profileFormValues(emp),
      };
    },
    () => {
      notifications.show({
        color: 'red',
        message: t('employees.notifications.fetchError'),
      });
      navigate(ROUTES.EMPLOYEES.LIST);
    },
  );

  const handleSubmit = useCallback(
    async (values: EmployeeFormValues) => {
      setLoading(true);
      try {
        const { personalPhoneNumber } = values;

        const rest = {
          name: values.name,
          code: values.code,
          email: values.email,
          phone: values.phone,
          position: values.position,
          department: values.department,
          isActive: values.isActive,
        };
        if (isEdit && id) {
          const snapshot = snapshotRef.current;
          if (!snapshot) {
            throw new Error('Employee snapshot missing');
          }
          const extra: EmployeeExtra = {
            ...snapshot.extra,
            allowLogin: snapshot.extra?.allowLogin ?? true,
            personalPhoneNumber: personalPhoneNumber || undefined,
            ...buildProfileExtra(values),
          };
          await useEmployeeStore
            .getState()
            .updateSafely({ id, version: snapshot.version, patch: { ...rest, extra } });
          const before = {
            name: snapshot.name,
            code: snapshot.code,
            email: snapshot.email,
            phone: snapshot.phone,
            position: snapshot.position,
            department: snapshot.department,
            isActive: snapshot.isActive,
            extra: snapshot.extra,
          };
          const after = { ...rest, extra };
          const diff = deepDiff(before, after);

          const onlyIsActive = Object.keys(diff).length === 1 && 'isActive' in diff;
          logActivity(onlyIsActive ? 'employee.toggleStatus' : 'employee.update', id, diff);
          notifications.show({
            color: 'green',
            message: t('employees.notifications.updateSuccess'),
          });
          await reconcileTruckLink(values, id, snapshot.extra?.truckAssetId);
          navigate(ROUTES.EMPLOYEES.DETAIL.replace(':id', id));
        } else {
          const email = rest.email?.trim() || generateLoginEmail(rest.code);
          const extra: EmployeeExtra = {
            allowLogin: true,
            loginPassword: generatePassword(),
            ...(personalPhoneNumber && { personalPhoneNumber }),
            ...buildProfileExtra(values),
          };
          const expectedListHash = readListHash(useEmployeeStore, 'employees');
          const res = await cMngtConnector.createEmployee<EmployeeExtra>({
            ...rest,
            email,
            extra,
            ...(expectedListHash && { expectedListHash }),
          });
          logActivity('employee.create', res.employee.id);

          forceRefresh();

          if (res.ssoWarning) {
            notifications.show({
              color: 'yellow',
              title: t('employees.notifications.createSuccess'),
              message: t('employees.notifications.ssoWarning', { reason: res.ssoWarning }),
              autoClose: 10000,
            });
          } else {
            notifications.show({
              color: 'green',
              message: t('employees.notifications.createSuccess'),
            });
          }
          await reconcileTruckLink(values, res.employee.id);
          navigate(ROUTES.EMPLOYEES.DETAIL.replace(':id', res.employee.id));
        }
      } catch (err) {
        if (err instanceof EntityConflictError) {
          if (err.latest) resetFormFromEmployee(err.latest as Employee);
          notifications.show({
            color: 'yellow',
            title: t('common.conflict.title'),
            message: t('common.conflict.message'),
            autoClose: 8000,
          });
        } else if (!isEdit && isListVersionConflict(err)) {
          await useEmployeeStore.getState().forceRefresh();
          const newCode = buildNextEmployeeCode(useEmployeeStore.getState().items.length + 1);
          form.setFieldValue('code', newCode);
          notifications.show({
            color: 'yellow',
            title: t('common.conflict.title'),
            message: t('employees.notifications.listConflictMessage', { code: newCode }),
            autoClose: 10000,
          });
        } else {
          notifications.show({
            color: 'red',
            message: isEdit
              ? t('employees.notifications.updateError')
              : t('employees.notifications.createError'),
          });
        }
      } finally {
        setLoading(false);
      }
    },
    [isEdit, id, t, navigate, forceRefresh, resetFormFromEmployee, form, reconcileTruckLink],
  );

  const navigateToList = useCallback(() => navigate(ROUTES.EMPLOYEES.LIST), [navigate]);

  const handleDownloadSample = useCallback(async () => {
    setIsDownloading(true);
    try {
      generateEmployeeExcelTemplate({
        language: i18n.language,
        hasEmail,
        hasPosition,
        hasDepartment,
        positions: positionOptions.map((o) => o.label),
        departments: departmentOptions.map((o) => o.label),
      });
      notifications.show({
        color: 'green',
        message: t('common.bulkImport.downloadSuccess'),
      });
    } catch {
      notifications.show({
        color: 'red',
        message: t('employees.notifications.createError'),
      });
    } finally {
      setIsDownloading(false);
    }
  }, [t, i18n.language, positionOptions, departmentOptions]);

  const handleFileSelect = useCallback((selectedFile: File) => {
    fileRef.current = selectedFile;
    setFile(selectedFile);
    setImportResult(undefined);
  }, []);

  const handleFileRemove = useCallback(() => {
    fileRef.current = undefined;
    setFile(undefined);
    setImportResult(undefined);
  }, []);

  const handleBulkUpload = useCallback(async () => {
    if (!fileRef.current) return;

    setIsBulkLoading(true);
    setImportResult(undefined);

    try {
      const employees = await parseEmployeeExcelFile(fileRef.current);

      if (employees.length === 0) {
        notifications.show({
          color: 'red',
          message: t('employees.bulkImport.noValidRows'),
        });
        return;
      }

      let nextCodeNum = totalEmployees + 1;
      const items = employees.map((emp) => {
        const code = emp.code?.trim() || buildNextEmployeeCode(nextCodeNum++);
        const email = emp.email?.trim() || generateLoginEmail(code);
        const { firstName, lastName } = splitVietnameseName(emp.name);
        const gender = normalizeGender(emp.gender);
        const extra: EmployeeExtra = {
          allowLogin: true,
          loginPassword: generatePassword(),
          ...(firstName && { firstName }),
          ...(lastName && { lastName }),
          ...(gender && { gender }),
          ...(emp.personalPhoneNumber && { personalPhoneNumber: emp.personalPhoneNumber }),
        };
        return {
          name: emp.name,
          code,
          email: emp.email?.trim() || email,
          phone: emp.phone || '',
          position: resolveOptionValue(emp.position, positionOptions),
          department: resolveOptionValue(emp.department, departmentOptions),
          extra,
        };
      });

      const res = await cMngtConnector.importBatchEmployees<EmployeeExtra>({ items });
      const total = res.summary?.total ?? employees.length;
      const success = res.summary?.created ?? 0;
      const failed = res.summary?.errors ?? Math.max(0, total - success);
      const errorNames = (res.errors ?? []).map(
        (e) =>
          `${employees[e.index]?.name ?? t('common.bulkImport.rowLabel', { n: e.index + 1 })}: ${e.message}`,
      );

      forceRefresh();
      setImportResult({
        summary: { total, success, failed },
        errors: errorNames.length > 0 ? errorNames : undefined,
      });

      const ssoFailed = res.ssoFailed ?? 0;

      if (failed === 0 && ssoFailed === 0) {
        notifications.show({
          color: 'green',
          message: t('employees.notifications.createSuccess'),
        });
        bulkNavTimer.current = setTimeout(() => navigate(ROUTES.EMPLOYEES.LIST), 2000);
      } else if (failed === 0) {
        notifications.show({
          color: 'yellow',
          title: t('employees.bulkImport.ssoWarningTitle'),
          message: t('employees.bulkImport.ssoWarningMessage', { failed: ssoFailed, total }),
          autoClose: false,
        });
      } else {
        notifications.show({
          color: 'yellow',
          message: t('common.bulkImport.partialSuccess', {
            success,
            total,
          }),
        });
      }
    } catch (err) {
      if (err instanceof ExcelParseError) {
        const labels: Record<string, string> = {
          name: t('employees.columns.name'),
          code: t('common.labels.code'),
        };
        const columns = err.missing.map((f) => labels[f] ?? f).join(', ');
        notifications.show({
          color: 'red',
          title: t('employees.bulkImport.missingColumnTitle'),
          message: t('employees.bulkImport.missingColumnMessage', { columns }),
          autoClose: 10000,
        });
        return;
      }
      notifications.show({
        color: 'red',
        message: t('employees.notifications.createError'),
      });
    } finally {
      setIsBulkLoading(false);
    }
  }, [t, forceRefresh, navigate, totalEmployees, departmentOptions, positionOptions]);

  const validateFileType = useCallback((f: File) => {
    const validTypes = [
      'text/csv',

      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    return validTypes.includes(f.type) || /\.(csv|xlsx|xls)$/i.test(f.name);
  }, []);

  if (fetching) return null;

  const pageTitle = isEdit ? t('employees.editEmployee') : t('employees.addEmployee');

  const topActions = isMobile ? null : (
    <Group justify="space-between">
      <Button
        component={Link}
        to={ROUTES.EMPLOYEES.LIST}
        variant="subtle"
        size="compact-sm"
        leftSection={<IconArrowLeft size={16} />}
      >
        {t('__new__.01-common.actions.back')}
      </Button>
    </Group>
  );

  return (
    <Stack gap="lg">
      {topActions}

      <Title order={isMobile ? 4 : 3} lh={1.2}>
        {pageTitle}
      </Title>

      <Divider />

      {isEdit || !hasBulkImport ? (
        <SingleEmployeeForm
          form={form}
          isLoading={loading}
          isEditMode={isEdit}
          onSubmit={handleSubmit}
          onCancel={navigateToList}
        />
      ) : (
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="single" leftSection={<IconUserPlus size={16} />}>
              {t('employees.addEmployee')}
            </Tabs.Tab>
            <Tabs.Tab value="bulk" leftSection={<IconFileSpreadsheet size={16} />}>
              {t('employees.bulkImport.title')}
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="single" pt="md">
            <SingleEmployeeForm
              form={form}
              isLoading={loading}
              isEditMode={false}
              onSubmit={handleSubmit}
              onCancel={navigateToList}
            />
          </Tabs.Panel>

          <Tabs.Panel value="bulk" pt="md">
            <BulkImportForm
              isLoading={isBulkLoading}
              isDownloading={isDownloading}
              file={file}
              importResult={importResult}
              onDownloadSample={handleDownloadSample}
              onFileSelect={handleFileSelect}
              onFileRemove={handleFileRemove}
              onImport={handleBulkUpload}
              onCancel={navigateToList}
              validateFileType={validateFileType}
            />
          </Tabs.Panel>
        </Tabs>
      )}
    </Stack>
  );
}

function generateLoginEmail(code: string | undefined) {
  const slug = code?.trim();
  return slug ? codeToLoginEmail(slug) : `emp-${randomString(10, true)}@${AUTO_LOGIN_DOMAIN}`;
}

function splitVietnameseName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  const [lastName, ...rest] = parts;
  return { lastName, firstName: rest.join(' ') };
}

function resolveOptionValue(
  input: string | undefined,
  options: ReadonlyArray<{ value: string; label: string }>,
): string {
  const trimmed = input?.trim();
  if (!trimmed) return '';
  const lower = trimmed.toLowerCase();
  const byValue = options.find((o) => o.value.toLowerCase() === lower);
  if (byValue) return byValue.value;
  const byLabel = options.find((o) => o.label.toLowerCase() === lower);
  if (byLabel) return byLabel.value;
  return trimmed;
}

const GENDER_MALE = new Set(['m', 'male', 'nam']);
const GENDER_FEMALE = new Set(['f', 'female', 'nữ', 'nu']);
function normalizeGender(input: string | undefined): 'M' | 'F' | undefined {
  const v = input?.trim().toLowerCase();
  if (!v) return undefined;
  if (GENDER_MALE.has(v)) return 'M';
  if (GENDER_FEMALE.has(v)) return 'F';
  return undefined;
}
