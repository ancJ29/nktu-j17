import {
  ActionIcon,
  Button,
  Card,
  Divider,
  Grid,
  Group,
  Input,
  NumberInput,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  Textarea,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
  IconArrowLeft,
  IconBox,
  IconClipboardCheck,
  IconFileCertificate,
  IconHash,
  IconLicense,
  IconLock,
  IconMapPin,
  IconPlus,
  IconShieldCheck,
  IconTrash,
  IconTruck,
  IconUser,
} from '@tabler/icons-react';
import { type ReactNode, useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams } from 'react-router';
import { ROUTES } from '@/constants/routes';
import { cMngtConnector } from '@credo/connectors/connector';
import { device } from '@credo/base-ui/utils';
import { DateField } from '@/components/DateField';
import { EmployeeSelector } from '@/components/selectors';
import { useInitFormFromFetch } from '@/hooks';
import { isDriverDepartment, perms } from '@/utils/permission';
import { TRUCK_ASSET_RECORD_TARGET, useTruckAssetStore } from '@/stores/useTruckAssetStore';
import type {
  Employee,
  RegistrationType,
  TruckAssetCopyFrom,
  TruckAssetExtra,
  TruckAssetRow,
  TruckInsurance,
} from '@/types';
import { useTruckFormSave } from './useTruckFormSave';
import { syncDriverLinkFromTruck } from '@/utils/driverTruckLink';
import { useLookupV2Options } from '@/hooks/useLookupV2Options';
import { buildNextTruckCode, FALLBACK_PAD, FALLBACK_PREFIX, TYPE_PAD } from './truckCode';

const isMobile = device.isMobile;
const ROUTES_T = ROUTES.ASSETS.TRUCKS;

const TRUCK_TYPE_CATEGORY = 'truck-type';

const driverEmployeeFilter = (e: Employee) =>
  e.isActive && !e.extra?.isDeleted && isDriverDepartment(e.department);

type InsuranceRow = { id: string; company: string; type: string; expiry: string | null };

let insuranceRowSeq = 0;
const newInsuranceRowId = () => `ins-${(insuranceRowSeq += 1)}`;

const emptyInsuranceRow = (): InsuranceRow => ({
  id: newInsuranceRowId(),
  company: '',
  type: '',
  expiry: null,
});

function seedInsuranceRows(e: TruckAssetExtra): InsuranceRow[] {
  if (e.insurances?.length) {
    return e.insurances.map((i) => ({
      id: newInsuranceRowId(),
      company: i.company ?? '',
      type: i.type ?? '',
      expiry: i.expiry ?? null,
    }));
  }
  const legacy: InsuranceRow[] = [];
  if (e.civilInsuranceCompany || e.civilInsuranceExpiry) {
    legacy.push({
      id: newInsuranceRowId(),
      company: e.civilInsuranceCompany ?? '',
      type: '',
      expiry: e.civilInsuranceExpiry ?? null,
    });
  }
  if (e.otherInsuranceCompany || e.otherInsuranceExpiry) {
    legacy.push({
      id: newInsuranceRowId(),
      company: e.otherInsuranceCompany ?? '',
      type: '',
      expiry: e.otherInsuranceExpiry ?? null,
    });
  }
  return legacy;
}

type TruckFormValues = {
  name: string;
  code: string;
  truckType: string;
  plateNumber: string;
  makeModel: string;
  model: string;
  year: number | string;
  capacityTons: number | string;
  description: string;

  boxType: string;
  engineNumber: string;
  chassisNumber: string;
  boxLengthMm: number | string;
  boxWidthMm: number | string;
  boxHeightMm: number | string;
  boxVolumeM3: number | string;
  tireSize: string;

  inspectionExpiry: string | null;
  badgeExpiry: string | null;

  registrationType: RegistrationType;
  registrationCopyExpiry: string | null;

  insurances: InsuranceRow[];

  driverId: string;
  driverName: string;
  driverPhone: string;
  licenseNumber: string;
  licenseClass: string;
  baseLocation: string;
  region: string;
  isActive: boolean;
  notes: string;
};

function FormSection({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <Card withBorder radius="md" padding="lg">
      <Group gap="xs" mb="xs">
        <ThemeIcon size={28} radius="md" variant="light" color="primary">
          {icon}
        </ThemeIcon>
        <Text fw={600} size="sm">
          {title}
        </Text>
      </Group>
      <Divider mb="md" />
      <Stack gap="md">{children}</Stack>
    </Card>
  );
}

export function TruckAssetFormPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const { loading, submit } = useTruckFormSave();
  const snapshotRef = useRef<TruckAssetRow | null>(null);

  const totalTrucks = useTruckAssetStore((s) => s.items.length);
  const trucksInitialized = useTruckAssetStore((s) => s.initialized);
  const trucksError = useTruckAssetStore((s) => s.error);
  const loadTrucks = useTruckAssetStore((s) => s.loadAll);

  const truckTypes = useLookupV2Options(TRUCK_TYPE_CATEGORY);
  const hasTruckTypes = truckTypes.length > 0;

  const truckTypesRef = useRef(truckTypes);
  useEffect(() => {
    truckTypesRef.current = truckTypes;
  }, [truckTypes]);

  const copyFrom = !isEdit
    ? (location.state as { copyFrom?: TruckAssetCopyFrom } | null)?.copyFrom
    : undefined;
  const copyFromId = copyFrom?.copyFromId;

  useEffect(() => {
    if (isMobile || (isEdit && !perms.truck.canEdit()) || (!isEdit && !perms.truck.canCreate())) {
      navigate(ROUTES_T.LIST, { replace: true });
    }
  }, [navigate, isEdit]);

  const form = useForm<TruckFormValues>({
    initialValues: {
      name: '',

      code: '',
      truckType: '',
      plateNumber: '',
      makeModel: '',
      model: '',
      year: '',
      capacityTons: '',
      description: '',
      boxType: '',
      engineNumber: '',
      chassisNumber: '',
      boxLengthMm: '',
      boxWidthMm: '',
      boxHeightMm: '',
      boxVolumeM3: '',
      tireSize: '',
      inspectionExpiry: null,
      badgeExpiry: null,
      registrationType: 'original',
      registrationCopyExpiry: null,
      insurances: [],
      driverId: '',
      driverName: '',
      driverPhone: '',
      licenseNumber: '',
      licenseClass: '',
      baseLocation: '',
      region: '',
      isActive: true,
      notes: '',
    },
    validate: {
      name: (v) => (v.trim() ? null : t('common.validation.nameRequired')),

      truckType: (v) =>
        truckTypesRef.current.length > 0 && !v ? t('assets.truck.validation.typeRequired') : null,
      plateNumber: (v) => (v.trim() ? null : t('assets.truck.validation.plateNumberRequired')),
      code: (v) =>
        truckTypesRef.current.length > 0 || v.trim() ? null : t('common.validation.codeRequired'),
      capacityTons: (v) =>
        v === '' || Number(v) >= 0 ? null : t('assets.truck.validation.capacityInvalid'),
      year: (v) =>
        v === '' || (Number(v) >= 1900 && Number(v) <= 2200)
          ? null
          : t('assets.truck.validation.yearInvalid'),
      boxLengthMm: (v) =>
        v === '' || Number(v) >= 0 ? null : t('assets.truck.validation.dimensionInvalid'),
      boxWidthMm: (v) =>
        v === '' || Number(v) >= 0 ? null : t('assets.truck.validation.dimensionInvalid'),
      boxHeightMm: (v) =>
        v === '' || Number(v) >= 0 ? null : t('assets.truck.validation.dimensionInvalid'),
      boxVolumeM3: (v) =>
        v === '' || Number(v) >= 0 ? null : t('assets.truck.validation.volumeInvalid'),
    },
  });

  useEffect(() => {
    if (!isEdit && !trucksInitialized && !trucksError) loadTrucks();
  }, [isEdit, trucksInitialized, trucksError, loadTrucks]);

  useEffect(() => {
    if (isEdit) return;
    const types = truckTypes;
    const picked = form.values.truckType;

    if (types.length === 1 && !picked) {
      form.setFieldValue('truckType', types[0].value);
      return;
    }
    if (types.length > 1 && !picked) {
      if (form.values.code) form.setFieldValue('code', '');
      return;
    }

    const prefix = picked || FALLBACK_PREFIX;
    const pad = picked ? TYPE_PAD : FALLBACK_PAD;
    const codes = useTruckAssetStore.getState().items.map((it) => it.code);
    form.setFieldValue('code', buildNextTruckCode(prefix, codes, pad));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, truckTypes, form.values.truckType, totalTrucks]);

  const typeSelectData = useMemo(() => {
    const picked = form.values.truckType;
    if (picked && !truckTypes.some((o) => o.value === picked)) {
      return [...truckTypes, { value: picked, label: picked }];
    }
    return truckTypes;
  }, [truckTypes, form.values.truckType]);

  const fetching = useInitFormFromFetch(
    form,
    id,
    async (id) => {
      const res = await cMngtConnector.getSingleRecordById(TRUCK_ASSET_RECORD_TARGET, { id });
      const a = res.item as TruckAssetRow;
      snapshotRef.current = a;
      const e = a.extra ?? {};
      return {
        name: a.name,
        code: a.code,
        truckType: e.truckType ?? '',
        plateNumber: e.plateNumber ?? '',
        makeModel: e.makeModel ?? '',
        model: e.model ?? '',
        year: e.year ?? '',
        capacityTons: e.capacityTons ?? '',
        description: a.description || '',
        boxType: e.boxType ?? '',
        engineNumber: e.engineNumber ?? '',
        chassisNumber: e.chassisNumber ?? '',
        boxLengthMm: e.boxLengthMm ?? '',
        boxWidthMm: e.boxWidthMm ?? '',
        boxHeightMm: e.boxHeightMm ?? '',
        boxVolumeM3: e.boxVolumeM3 ?? '',
        tireSize: e.tireSize ?? '',
        inspectionExpiry: e.inspectionExpiry ?? null,
        badgeExpiry: e.badgeExpiry ?? null,

        registrationType: e.registrationType ?? (e.registrationCopyExpiry ? 'copy' : 'original'),
        registrationCopyExpiry: e.registrationCopyExpiry ?? null,
        insurances: seedInsuranceRows(e),
        driverId: e.driverId ?? '',
        driverName: e.driverName ?? '',
        driverPhone: e.driverPhone ?? '',
        licenseNumber: e.licenseNumber ?? '',
        licenseClass: e.licenseClass ?? '',
        baseLocation: e.baseLocation ?? '',
        region: e.region ?? '',
        isActive: a.isActive,
        notes: e.notes ?? '',
      };
    },
    () => {
      notifications.show({ color: 'red', message: t('assets.notifications.fetchError') });
      navigate(ROUTES_T.LIST);
    },
  );

  useEffect(() => {
    if (!copyFrom) return;
    form.setValues({
      name: copyFrom.name,
      description: copyFrom.description,

      truckType: copyFrom.truckType ?? '',
      makeModel: copyFrom.makeModel ?? '',
      model: copyFrom.model ?? '',
      year: copyFrom.year ?? '',
      capacityTons: copyFrom.capacityTons ?? '',
      boxType: copyFrom.boxType ?? '',
      boxLengthMm: copyFrom.boxLengthMm ?? '',
      boxWidthMm: copyFrom.boxWidthMm ?? '',
      boxHeightMm: copyFrom.boxHeightMm ?? '',
      boxVolumeM3: copyFrom.boxVolumeM3 ?? '',
      tireSize: copyFrom.tireSize ?? '',
      baseLocation: copyFrom.baseLocation ?? '',
      region: copyFrom.region ?? '',
      notes: copyFrom.notes ?? '',
    });
    // Run once on mount for a copy-create; `form` is a stable Mantine instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = useCallback(
    async (values: TruckFormValues) => {
      const cleanInsurances: TruckInsurance[] = values.insurances
        .map((r) => ({
          ...(r.company.trim() && { company: r.company.trim() }),
          ...(r.type.trim() && { type: r.type.trim() }),
          ...(r.expiry && { expiry: r.expiry }),
        }))
        .filter((r) => Object.keys(r).length > 0);

      const extra: TruckAssetExtra = {
        ...snapshotRef.current?.extra,
        ...(values.truckType.trim() && { truckType: values.truckType.trim() }),
        ...(values.notes.trim() && { notes: values.notes.trim() }),
        ...(values.plateNumber.trim() && { plateNumber: values.plateNumber.trim() }),
        ...(values.makeModel.trim() && { makeModel: values.makeModel.trim() }),
        ...(values.model.trim() && { model: values.model.trim() }),
        ...(values.year !== '' && { year: Number(values.year) }),
        ...(values.capacityTons !== '' && { capacityTons: Number(values.capacityTons) }),
        ...(values.boxType.trim() && { boxType: values.boxType.trim() }),
        ...(values.engineNumber.trim() && { engineNumber: values.engineNumber.trim() }),
        ...(values.chassisNumber.trim() && { chassisNumber: values.chassisNumber.trim() }),
        ...(values.boxLengthMm !== '' && { boxLengthMm: Number(values.boxLengthMm) }),
        ...(values.boxWidthMm !== '' && { boxWidthMm: Number(values.boxWidthMm) }),
        ...(values.boxHeightMm !== '' && { boxHeightMm: Number(values.boxHeightMm) }),
        ...(values.boxVolumeM3 !== '' && { boxVolumeM3: Number(values.boxVolumeM3) }),
        ...(values.tireSize.trim() && { tireSize: values.tireSize.trim() }),
        ...(values.inspectionExpiry && { inspectionExpiry: values.inspectionExpiry }),
        ...(values.badgeExpiry && { badgeExpiry: values.badgeExpiry }),

        registrationType: values.registrationType,
        registrationCopyExpiry:
          values.registrationType === 'copy'
            ? values.registrationCopyExpiry || undefined
            : undefined,

        registrationOriginalExpiry: undefined,
        insurances: cleanInsurances.length ? cleanInsurances : undefined,
        civilInsuranceCompany: undefined,
        civilInsuranceExpiry: undefined,
        otherInsuranceCompany: undefined,
        otherInsuranceExpiry: undefined,

        driverId: values.driverId || undefined,
        driverName: values.driverId ? values.driverName.trim() || undefined : undefined,
        driverPhone: values.driverId ? values.driverPhone.trim() || undefined : undefined,
        licenseNumber: values.driverId ? values.licenseNumber.trim() || undefined : undefined,
        licenseClass: values.driverId ? values.licenseClass.trim() || undefined : undefined,
        ...(values.baseLocation.trim() && { baseLocation: values.baseLocation.trim() }),
        ...(values.region.trim() && { region: values.region.trim() }),

        ...(copyFromId && { copyFromId }),
      };

      const prevDriverId = snapshotRef.current?.extra?.driverId;
      const result = await submit({
        isEdit,
        id,
        snapshot: snapshotRef.current,
        core: {
          name: values.name,
          code: values.code,
          description: values.description,
          isActive: values.isActive,
        },
        extra,
      });
      if (result) {
        snapshotRef.current = result;

        try {
          await syncDriverLinkFromTruck({
            truckId: result.id,
            truckCode: result.extra?.plateNumber || result.code,
            prevDriverId,
            newDriverId: values.driverId || undefined,
          });
        } catch {
          notifications.show({
            color: 'yellow',
            message: t('assets.notifications.driverLinkWarning'),
          });
        }
      }
    },
    [isEdit, id, submit, t, copyFromId],
  );

  const navigateToList = useCallback(() => navigate(ROUTES_T.LIST), [navigate]);

  if (fetching) return null;

  const pageTitle = isEdit ? t('assets.truck.editItem') : t('assets.truck.addItem');

  return (
    <Stack gap="lg">
      {!isMobile && (
        <Group gap="sm">
          <Button
            onClick={() => window.history.back()}
            variant="subtle"
            size="compact-sm"
            leftSection={<IconArrowLeft size={16} />}
          >
            {t('__new__.01-common.actions.back')}
          </Button>
        </Group>
      )}

      <Title order={isMobile ? 4 : 3}>{pageTitle}</Title>

      {/* eslint-disable-next-line react-hooks/refs -- Mantine form.onSubmit() builds the submit handler during render by design; the internal ref read is safe. */}
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          {/* Two-column card layout on desktop (PC); collapses to one column on
              mobile — the tall truck form uses horizontal space rather than one
              long scroll. */}
          <Grid gutter="md">
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Stack gap="md">
                <FormSection
                  icon={<IconTruck size={16} stroke={1.75} />}
                  title={t('assets.truck.form.basicSection')}
                >
                  <TextInput
                    label={t('common.labels.name')}
                    placeholder={t('assets.truck.form.namePlaceholder')}
                    withAsterisk
                    size="md"
                    {...form.getInputProps('name')}
                  />
                  {hasTruckTypes && (
                    <Select
                      label={t('assets.truck.form.typeLabel')}
                      placeholder={t('assets.truck.form.typePlaceholder')}
                      data={typeSelectData}
                      withAsterisk

                      disabled={isEdit || truckTypes.length === 1}
                      searchable
                      allowDeselect={false}
                      {...form.getInputProps('truckType')}
                    />
                  )}
                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                    <TextInput
                      label={t('common.labels.code')}
                      placeholder={
                        hasTruckTypes && !form.values.truckType
                          ? t('assets.truck.form.codeAwaitingType')
                          : undefined
                      }
                      leftSection={<IconHash size={14} />}
                      rightSection={<IconLock size={14} color="var(--mantine-color-dimmed)" />}
                      readOnly
                      styles={{
                        input: {
                          fontFamily: 'var(--mantine-font-family-monospace)',
                          backgroundColor: 'var(--mantine-color-default-hover)',
                          cursor: 'not-allowed',
                        },
                      }}
                      {...form.getInputProps('code')}
                    />
                    <TextInput
                      label={t('assets.truck.form.plateLabel')}
                      placeholder={t('assets.truck.form.platePlaceholder')}
                      withAsterisk
                      disabled={isEdit}
                      {...form.getInputProps('plateNumber')}
                    />
                  </SimpleGrid>
                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                    <TextInput
                      label={t('assets.truck.form.makeModelLabel')}
                      placeholder={t('assets.truck.form.makeModelPlaceholder')}
                      {...form.getInputProps('makeModel')}
                    />
                    <TextInput
                      label={t('assets.truck.form.modelLabel')}
                      placeholder={t('assets.truck.form.modelPlaceholder')}
                      {...form.getInputProps('model')}
                    />
                  </SimpleGrid>
                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                    <NumberInput
                      label={t('assets.truck.form.yearLabel')}
                      placeholder={t('assets.truck.form.yearPlaceholder')}
                      min={1900}
                      max={2200}
                      {...form.getInputProps('year')}
                    />
                    <NumberInput
                      label={t('assets.truck.form.capacityLabel')}
                      placeholder={t('assets.truck.form.capacityPlaceholder')}
                      min={0}
                      suffix=" t"
                      {...form.getInputProps('capacityTons')}
                    />
                  </SimpleGrid>
                  <Textarea
                    label={t('common.labels.description')}
                    placeholder={t('assets.truck.form.descriptionPlaceholder')}
                    autosize
                    minRows={2}
                    maxRows={6}
                    {...form.getInputProps('description')}
                  />
                </FormSection>

                <FormSection
                  icon={<IconBox size={16} stroke={1.75} />}
                  title={t('assets.truck.form.specSection')}
                >
                  <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                    <TextInput
                      label={t('assets.truck.form.boxTypeLabel')}
                      placeholder={t('assets.truck.form.boxTypePlaceholder')}
                      {...form.getInputProps('boxType')}
                    />
                    <TextInput
                      label={t('assets.truck.form.engineNumberLabel')}
                      placeholder={t('assets.truck.form.engineNumberPlaceholder')}
                      {...form.getInputProps('engineNumber')}
                    />
                    <TextInput
                      label={t('assets.truck.form.chassisNumberLabel')}
                      placeholder={t('assets.truck.form.chassisNumberPlaceholder')}
                      {...form.getInputProps('chassisNumber')}
                    />
                  </SimpleGrid>
                  <Input.Wrapper label={t('assets.truck.form.boxDimensionsLabel')}>
                    <SimpleGrid cols={3} spacing="xs">
                      <NumberInput
                        placeholder={t('assets.truck.form.boxLengthPlaceholder')}
                        min={0}
                        suffix=" mm"
                        {...form.getInputProps('boxLengthMm')}
                      />
                      <NumberInput
                        placeholder={t('assets.truck.form.boxWidthPlaceholder')}
                        min={0}
                        suffix=" mm"
                        {...form.getInputProps('boxWidthMm')}
                      />
                      <NumberInput
                        placeholder={t('assets.truck.form.boxHeightPlaceholder')}
                        min={0}
                        suffix=" mm"
                        {...form.getInputProps('boxHeightMm')}
                      />
                    </SimpleGrid>
                  </Input.Wrapper>
                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                    <NumberInput
                      label={t('assets.truck.form.boxVolumeLabel')}
                      placeholder={t('assets.truck.form.boxVolumePlaceholder')}
                      min={0}
                      decimalScale={2}
                      suffix=" m³"
                      {...form.getInputProps('boxVolumeM3')}
                    />
                    <TextInput
                      label={t('assets.truck.form.tireSizeLabel')}
                      placeholder={t('assets.truck.form.tireSizePlaceholder')}
                      {...form.getInputProps('tireSize')}
                    />
                  </SimpleGrid>
                </FormSection>
              </Stack>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Stack gap="md">
                <FormSection
                  icon={<IconFileCertificate size={16} stroke={1.75} />}
                  title={t('assets.truck.form.registrationSection')}
                >
                  <Input.Wrapper label={t('assets.truck.form.registrationTypeLabel')}>
                    <SegmentedControl
                      fullWidth
                      data={[
                        {
                          value: 'original',
                          label: t('assets.truck.form.registrationTypeOriginal'),
                        },
                        { value: 'copy', label: t('assets.truck.form.registrationTypeCopy') },
                      ]}
                      value={form.values.registrationType}
                      onChange={(v) =>
                        form.setFieldValue('registrationType', v as RegistrationType)
                      }
                    />
                  </Input.Wrapper>
                  {form.values.registrationType === 'copy' && (
                    <DateField
                      label={t('assets.truck.form.registrationCopyExpiryLabel')}
                      description={t('assets.truck.form.registrationCopyExpiryHint')}
                      {...form.getInputProps('registrationCopyExpiry')}
                    />
                  )}
                </FormSection>

                <FormSection
                  icon={<IconClipboardCheck size={16} stroke={1.75} />}
                  title={t('assets.truck.form.inspectionSection')}
                >
                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                    <DateField
                      label={t('assets.truck.form.inspectionExpiryLabel')}
                      {...form.getInputProps('inspectionExpiry')}
                    />
                    <DateField
                      label={t('assets.truck.form.badgeExpiryLabel')}
                      {...form.getInputProps('badgeExpiry')}
                    />
                  </SimpleGrid>
                </FormSection>

                <FormSection
                  icon={<IconShieldCheck size={16} stroke={1.75} />}
                  title={t('assets.truck.form.insuranceSection')}
                >
                  {form.values.insurances.length === 0 ? (
                    <Text size="sm" c="dimmed">
                      {t('assets.truck.form.insuranceEmpty')}
                    </Text>
                  ) : (
                    <Stack gap="sm">
                      {form.values.insurances.map((row, index) => (
                        <Card key={row.id} withBorder padding="sm" radius="md">
                          <Stack gap="sm">
                            <Group justify="space-between" align="center">
                              <Text size="xs" c="dimmed" fw={600}>
                                {t('assets.truck.form.insuranceLineLabel')} #{index + 1}
                              </Text>
                              <ActionIcon
                                variant="subtle"
                                color="red"
                                onClick={() => form.removeListItem('insurances', index)}
                              >
                                <IconTrash size={14} />
                              </ActionIcon>
                            </Group>
                            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                              <TextInput
                                label={t('assets.truck.form.insuranceCompanyLabel')}
                                placeholder={t('assets.truck.form.insuranceCompanyPlaceholder')}
                                {...form.getInputProps(`insurances.${index}.company`)}
                              />
                              <TextInput
                                label={t('assets.truck.form.insuranceTypeLabel')}
                                placeholder={t('assets.truck.form.insuranceTypePlaceholder')}
                                {...form.getInputProps(`insurances.${index}.type`)}
                              />
                            </SimpleGrid>
                            <DateField
                              label={t('assets.truck.form.insuranceExpiryLabel')}
                              {...form.getInputProps(`insurances.${index}.expiry`)}
                            />
                          </Stack>
                        </Card>
                      ))}
                    </Stack>
                  )}
                  <Button
                    variant="light"
                    size="compact-sm"
                    leftSection={<IconPlus size={14} />}
                    onClick={() => form.insertListItem('insurances', emptyInsuranceRow())}
                    style={{ alignSelf: 'flex-start' }}
                  >
                    {t('assets.truck.form.insuranceAdd')}
                  </Button>
                </FormSection>

                <FormSection
                  icon={<IconUser size={16} stroke={1.75} />}
                  title={t('assets.truck.form.driverSection')}
                >
                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                    <EmployeeSelector
                      label={t('assets.truck.form.driverNameLabel')}
                      placeholder={t('assets.truck.form.driverNamePlaceholder')}
                      value={form.values.driverId || null}
                      onChange={(sel) => {
                        if (!sel) {
                          form.setFieldValue('driverId', '');
                          form.setFieldValue('driverName', '');
                          form.setFieldValue('driverPhone', '');
                          form.setFieldValue('licenseNumber', '');
                          form.setFieldValue('licenseClass', '');
                          return;
                        }

                        const de = sel.employee.extra ?? {};
                        form.setFieldValue('driverId', sel.id);
                        form.setFieldValue('driverName', sel.name);
                        form.setFieldValue(
                          'driverPhone',
                          sel.employee.phone || de.personalPhoneNumber || '',
                        );
                        form.setFieldValue('licenseNumber', de.licenseNumber || '');
                        form.setFieldValue('licenseClass', de.licenseClass || '');
                      }}
                      filter={driverEmployeeFilter}
                      clearable
                      nothingFoundMessage={t('assets.truck.form.noDrivers')}
                    />
                    <TextInput
                      label={t('assets.truck.form.driverPhoneLabel')}
                      description={t('assets.truck.form.fromDriverProfile')}
                      placeholder={t('assets.truck.form.driverPhonePlaceholder')}
                      variant="filled"
                      readOnly
                      {...form.getInputProps('driverPhone')}
                    />
                    <TextInput
                      label={t('assets.truck.form.licenseNumberLabel')}
                      description={t('assets.truck.form.fromDriverProfile')}
                      placeholder={t('assets.truck.form.licenseNumberPlaceholder')}
                      leftSection={<IconLicense size={14} />}
                      variant="filled"
                      readOnly
                      {...form.getInputProps('licenseNumber')}
                    />
                    <TextInput
                      label={t('assets.truck.form.licenseClassLabel')}
                      description={t('assets.truck.form.fromDriverProfile')}
                      placeholder={t('assets.truck.form.licenseClassPlaceholder')}
                      variant="filled"
                      readOnly
                      {...form.getInputProps('licenseClass')}
                    />
                  </SimpleGrid>
                </FormSection>

                <FormSection
                  icon={<IconMapPin size={16} stroke={1.75} />}
                  title={t('assets.truck.form.operationSection')}
                >
                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                    <TextInput
                      label={t('assets.truck.form.baseLocationLabel')}
                      placeholder={t('assets.truck.form.baseLocationPlaceholder')}
                      {...form.getInputProps('baseLocation')}
                    />
                    <TextInput
                      label={t('assets.truck.form.regionLabel')}
                      placeholder={t('assets.truck.form.regionPlaceholder')}
                      {...form.getInputProps('region')}
                    />
                  </SimpleGrid>
                  <Textarea
                    label={t('__new__.01-common.labels.note')}
                    placeholder={t('assets.form.notesPlaceholder')}
                    autosize
                    minRows={2}
                    maxRows={6}
                    {...form.getInputProps('notes')}
                  />
                </FormSection>
              </Stack>
            </Grid.Col>
          </Grid>

          {isEdit && (
            <Card withBorder radius="md" padding="lg">
              <Switch
                label={t('__new__.01-common.labels.active')}
                {...form.getInputProps('isActive', { type: 'checkbox' })}
              />
            </Card>
          )}

          <Group justify="flex-end" gap="sm">
            <Button variant="default" size="sm" disabled={loading} onClick={navigateToList}>
              {t('__new__.01-common.actions.cancel')}
            </Button>
            <Button type="submit" loading={loading} size="sm">
              {isEdit ? t('__new__.01-common.actions.save') : t('assets.form.createButton')}
            </Button>
          </Group>
        </Stack>
      </form>
    </Stack>
  );
}
