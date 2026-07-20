import {
  ActionIcon,
  Button,
  Card,
  Divider,
  Grid,
  Group,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
  Textarea,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
  IconAddressBook,
  IconAdjustments,
  IconArrowLeft,
  IconInfoCircle,
  IconMapPin,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import { ROUTES } from '@/constants/routes';
import type { VendorFormVariant } from './vendorFormVariant';
import { useVendorStore, fetchVendorById } from '@/stores/useVendorStore';
import { EntityConflictError } from '@/stores/createEntityStore';
import { logActivity } from '@/utils/activityLogger';
import { deepDiff } from '@/utils/deepDiff';
import { device } from '@credo/base-ui/utils';
import { useInitFormFromFetch } from '@/hooks';
import { perms } from '@/utils/permission';
import { SectionCard } from '@/components/SectionCard';
import type { Vendor, VendorContact, VendorExtra, VendorPickupAddress } from '@/types';

const isMobile = device.isMobile;

function newRowId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

type ContactRow = {
  id: string;
  name: string;
  role: string;
  phone: string;
  isPrimary: boolean;
};

type PickupRow = {
  id: string;
  address: string;
  googleMapUrl: string;
  deliveryHours: string;
};

type VendorFormValues = {
  name: string;
  code: string;
  shortName: string;
  isActive: boolean;
  isDomestic: boolean;

  phone: string;
  contactPerson: string;

  address: string;
  addressGoogleMapUrl: string;
  pickupAddresses: PickupRow[];

  contacts: ContactRow[];
};

const EMPTY_VALUES: VendorFormValues = {
  name: '',
  code: '',
  shortName: '',
  isActive: true,
  isDomestic: true,
  phone: '',
  contactPerson: '',
  address: '',
  addressGoogleMapUrl: '',
  pickupAddresses: [],
  contacts: [],
};

function emptyContactRow(): ContactRow {
  return { id: newRowId(), name: '', role: '', phone: '', isPrimary: false };
}

function emptyPickupRow(): PickupRow {
  return { id: newRowId(), address: '', googleMapUrl: '', deliveryHours: '' };
}

type VendorFormProps = {
  readonly variant: VendorFormVariant;
};

export function VendorForm({ variant }: VendorFormProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  useEffect(() => {
    if (isMobile || (isEdit && !perms.vendor.canEdit()) || (!isEdit && !perms.vendor.canCreate())) {
      navigate(ROUTES.VENDORS.LIST, { replace: true });
    }
  }, [navigate, isEdit]);

  const [loading, setLoading] = useState(false);
  const snapshotRef = useRef<Vendor | null>(null);

  const form = useForm<VendorFormValues>({
    initialValues: EMPTY_VALUES,
    validate: {
      name: (v) => (v.trim() ? null : t('common.validation.nameRequired')),
      code: (v) => (v.trim() ? null : t('common.validation.codeRequired')),
    },
  });

  const fetching = useInitFormFromFetch(
    form,
    id,
    async (id) => {
      const v = await fetchVendorById(id);
      snapshotRef.current = v;
      const e = v.extra ?? ({} as VendorExtra);
      return {
        name: v.name,
        code: v.code,
        shortName: e.shortName ?? '',
        isActive: v.isActive,
        isDomestic: e.isDomestic ?? true,
        phone: v.phone ?? '',
        contactPerson: v.contactPerson ?? '',
        address: v.address ?? '',
        addressGoogleMapUrl: e.addressGoogleMapUrl ?? '',
        pickupAddresses: (e.pickupAddresses ?? []).map((p) => ({
          id: p.id || newRowId(),
          address: p.address ?? '',
          googleMapUrl: p.googleMapUrl ?? '',
          deliveryHours: p.deliveryHours ?? '',
        })),
        contacts: (e.contacts ?? []).map((co) => ({
          id: co.id || newRowId(),
          name: co.name ?? '',
          role: co.role ?? '',
          phone: co.phone ?? '',
          isPrimary: co.isPrimary ?? false,
        })),
      };
    },
    () => {
      notifications.show({ color: 'red', message: t('vendors.notifications.fetchError') });
      navigate(ROUTES.VENDORS.LIST);
    },
  );

  const handleSubmit = useCallback(
    async (values: VendorFormValues) => {
      setLoading(true);
      try {
        const prevExtra = snapshotRef.current?.extra ?? ({} as VendorExtra);

        const cleanContacts: VendorContact[] = values.contacts
          .filter((c) => c.name.trim() || c.phone.trim() || c.role.trim())
          .map((c) => ({
            id: c.id,
            name: c.name.trim(),
            ...(c.role.trim() ? { role: c.role.trim() } : {}),
            ...(c.phone.trim() ? { phone: c.phone.trim() } : {}),
            ...(c.isPrimary ? { isPrimary: true } : {}),
          }));

        const cleanPickup: VendorPickupAddress[] = values.pickupAddresses
          .filter((p) => p.address.trim())
          .map((p) => ({
            id: p.id,
            address: p.address.trim(),
            ...(p.googleMapUrl.trim() ? { googleMapUrl: p.googleMapUrl.trim() } : {}),
            ...(p.deliveryHours.trim() ? { deliveryHours: p.deliveryHours.trim() } : {}),
          }));

        
        
        const extra: VendorExtra = {
          ...prevExtra,
          shortName: values.shortName.trim() || undefined,
          isDomestic: values.isDomestic,
          contacts: cleanContacts.length ? cleanContacts : undefined,
          addressGoogleMapUrl: values.addressGoogleMapUrl.trim() || undefined,
          pickupAddresses: cleanPickup.length ? cleanPickup : undefined,
        };

        const basePatch = {
          name: values.name.trim(),
          code: values.code.trim(),
          phone: values.phone.trim(),
          address: values.address.trim(),
          contactPerson: values.contactPerson.trim(),
          isActive: values.isActive,
        };

        if (isEdit && id) {
          const snapshot = snapshotRef.current;
          if (!snapshot) throw new Error('Vendor snapshot missing');
          const before = {
            name: snapshot.name,
            code: snapshot.code,
            phone: snapshot.phone,
            address: snapshot.address,
            contactPerson: snapshot.contactPerson,
            isActive: snapshot.isActive,
            extra: snapshot.extra,
          };
          const after = { ...basePatch, extra };
          const updated = await useVendorStore.getState().updateSafely({
            id,
            version: snapshot.version,
            patch: after,
          });
          snapshotRef.current = updated;
          const diff = deepDiff(before, after);
          const onlyIsActive = Object.keys(diff).length === 1 && 'isActive' in diff;
          logActivity(onlyIsActive ? 'vendor.toggleStatus' : 'vendor.update', id, diff);
          notifications.show({
            color: 'green',
            message: t('vendors.notifications.updateSuccess'),
          });
          navigate(ROUTES.VENDORS.DETAIL.replace(':id', id));
        } else {
          
          
          
          const created = await useVendorStore.getState().createSafely({
            patch: { ...basePatch, extra },
          });
          logActivity('vendor.create', created.id);
          notifications.show({
            color: 'green',
            message: t('vendors.notifications.createSuccess'),
          });
          navigate(ROUTES.VENDORS.DETAIL.replace(':id', created.id));
        }
      } catch (err) {
        if (err instanceof EntityConflictError) {
          if (err.latest) snapshotRef.current = err.latest as Vendor;
          notifications.show({
            color: 'yellow',
            title: t('common.conflict.title'),
            message: t('common.conflict.message'),
            autoClose: 8000,
          });
        } else {
          notifications.show({
            color: 'red',
            message: isEdit
              ? t('vendors.notifications.updateError')
              : t('vendors.notifications.createError'),
          });
        }
      } finally {
        setLoading(false);
      }
    },
    [isEdit, id, t, navigate],
  );

  if (fetching) return null;

  
  
  const topActions = isMobile ? null : (
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
  );

  const basicInfoCard = (
    <SectionCard
      icon={<IconInfoCircle size={14} />}
      title={t('common.labels.basicInfo')}
      padding="md"
    >
      <Grid gutter="md">
        <Grid.Col span={12}>
          <TextInput
            label={t('common.labels.name')}
            placeholder={t('vendors.form.namePlaceholder')}
            withAsterisk
            {...form.getInputProps('name')}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <TextInput
            label={t('common.labels.shortName')}
            placeholder={t('vendors.form.shortNamePlaceholder')}
            {...form.getInputProps('shortName')}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <TextInput
            label={t('common.labels.code')}
            placeholder={t('vendors.form.codePlaceholder')}
            withAsterisk
            disabled={isEdit}
            {...form.getInputProps('code')}
          />
        </Grid.Col>
      </Grid>
    </SectionCard>
  );

  
  
  const statusCard = (
    <SectionCard
      icon={<IconAdjustments size={14} />}
      title={t('__new__.01-common.labels.status')}
      padding="md"
    >
      <Stack gap="md">
        {variant.originField.kind === 'select' ? (
          
          
          
          <Select
            label={t('vendors.form.originLabel')}
            allowDeselect={false}
            data={[
              { value: 'domestic', label: t(variant.originField.labels.domestic) },
              { value: 'overseas', label: t(variant.originField.labels.overseas) },
            ]}
            value={form.values.isDomestic ? 'domestic' : 'overseas'}
            onChange={(v) => form.setFieldValue('isDomestic', v !== 'overseas')}
          />
        ) : (
          <Switch
            label={t('vendors.form.isDomesticLabel')}
            description={t('vendors.form.isDomesticDescription')}
            {...form.getInputProps('isDomestic', { type: 'checkbox' })}
          />
        )}
        {isEdit && (
          <Switch
            label={t('vendors.form.isActiveLabel')}
            {...form.getInputProps('isActive', { type: 'checkbox' })}
          />
        )}
      </Stack>
    </SectionCard>
  );

  const addressesCard = (
    <SectionCard
      icon={<IconMapPin size={14} />}
      title={t('common.labels.addresses')}
      padding="md"
      actions={
        <Button
          variant="subtle"
          size="compact-sm"
          leftSection={<IconPlus size={14} />}
          onClick={() => form.insertListItem('pickupAddresses', emptyPickupRow())}
        >
          {t('vendors.form.pickupAddressesAdd')}
        </Button>
      }
    >
      <Stack gap="md">
        <Textarea
          label={t('vendors.detail.billingAddress')}
          placeholder={t('vendors.form.addressPlaceholder')}
          autosize
          minRows={2}
          {...form.getInputProps('address')}
        />
        <TextInput
          label={t('vendors.form.googleMapUrlLabel')}
          placeholder={t('vendors.form.googleMapUrlPlaceholder')}
          {...form.getInputProps('addressGoogleMapUrl')}
        />
        {form.values.pickupAddresses.length === 0 ? null : (
          <Stack gap="sm">
            {form.values.pickupAddresses.map((row, index) => (
              <Card key={row.id} withBorder padding="sm" radius="md">
                <Stack gap="sm">
                  <Group justify="space-between" align="center">
                    <Text size="xs" c="dimmed" fw={600}>
                      {t('vendors.detail.pickupAddress')} #{index + 1}
                    </Text>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      onClick={() => form.removeListItem('pickupAddresses', index)}
                      aria-label={t('__new__.01-common.actions.remove')}
                    >
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Group>
                  <Textarea
                    label={t('vendors.form.pickupAddressLabel')}
                    placeholder={t('common.labels.address')}
                    autosize
                    minRows={2}
                    {...form.getInputProps(`pickupAddresses.${index}.address`)}
                  />
                  <TextInput
                    label={t('vendors.form.googleMapUrlLabel')}
                    placeholder={t('vendors.form.googleMapUrlPlaceholder')}
                    {...form.getInputProps(`pickupAddresses.${index}.googleMapUrl`)}
                  />
                  <TextInput
                    label={t('vendors.form.deliveryHoursLabel')}
                    placeholder={t('vendors.form.deliveryHoursPlaceholder')}
                    {...form.getInputProps(`pickupAddresses.${index}.deliveryHours`)}
                  />
                </Stack>
              </Card>
            ))}
          </Stack>
        )}
      </Stack>
    </SectionCard>
  );

  const contactsCard = (
    <SectionCard
      icon={<IconAddressBook size={14} />}
      title={t('vendors.contacts.section')}
      padding="md"
      actions={
        <Button
          variant="subtle"
          size="compact-sm"
          leftSection={<IconPlus size={14} />}
          onClick={() => form.insertListItem('contacts', emptyContactRow())}
        >
          {t('vendors.contacts.addContact')}
        </Button>
      }
    >
      <Stack gap="md">
        <Grid gutter="md">
          <Grid.Col span={{ base: 12, md: 6 }}>
            <TextInput
              label={t('vendors.form.contactPersonLabel')}
              placeholder={t('vendors.form.contactPersonPlaceholder')}
              {...form.getInputProps('contactPerson')}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <TextInput
              label={t('common.labels.phone')}
              placeholder={t('vendors.form.phonePlaceholder')}
              {...form.getInputProps('phone')}
            />
          </Grid.Col>
        </Grid>

        {form.values.contacts.length === 0 ? (
          <Text size="sm" c="dimmed">
            {t('vendors.contacts.emptyHint')}
          </Text>
        ) : (
          <Stack gap="sm">
            {form.values.contacts.map((row, index) => (
              <Card key={row.id} withBorder padding="sm" radius="md">
                <Stack gap="sm">
                  <Group justify="space-between" align="center">
                    <Text size="xs" c="dimmed" fw={600}>
                      #{index + 1}
                    </Text>
                    <Group gap="xs">
                      <Switch
                        label={t('common.labels.primaryContact')}
                        size="sm"
                        {...form.getInputProps(`contacts.${index}.isPrimary`, {
                          type: 'checkbox',
                        })}
                      />
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        onClick={() => form.removeListItem('contacts', index)}
                        aria-label={t('__new__.01-common.actions.remove')}
                      >
                        <IconTrash size={14} />
                      </ActionIcon>
                    </Group>
                  </Group>
                  <Grid gutter="sm">
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <TextInput
                        label={t('vendors.form.contactNameLabel')}
                        {...form.getInputProps(`contacts.${index}.name`)}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <TextInput
                        label={t('vendors.form.contactRoleLabel')}
                        {...form.getInputProps(`contacts.${index}.role`)}
                      />
                    </Grid.Col>
                    <Grid.Col span={12}>
                      <TextInput
                        label={t('common.labels.phone')}
                        {...form.getInputProps(`contacts.${index}.phone`)}
                      />
                    </Grid.Col>
                  </Grid>
                </Stack>
              </Card>
            ))}
          </Stack>
        )}
      </Stack>
    </SectionCard>
  );

  return (
    <Stack gap="lg">
      {topActions}

      <Title order={isMobile ? 4 : 3}>
        {isEdit ? t('vendors.editItem') : t('vendors.addItem')}
      </Title>

      <Divider />

      {/* eslint-disable-next-line react-hooks/refs -- Mantine form.onSubmit() builds the submit handler during render by design; the internal ref read is safe. */}
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <Grid gutter="md">
            <Grid.Col span={{ base: 12, md: 7 }}>
              <Stack gap="md">
                {basicInfoCard}
                {addressesCard}
                {contactsCard}
              </Stack>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 5 }}>
              <Stack gap="md">{statusCard}</Stack>
            </Grid.Col>
          </Grid>

          <Group justify="flex-end" gap="sm">
            <Button
              variant="default"
              size="sm"
              disabled={loading}
              onClick={() => navigate(ROUTES.VENDORS.LIST)}
            >
              {t('__new__.01-common.actions.cancel')}
            </Button>
            <Button type="submit" loading={loading} size="sm">
              {isEdit ? t('vendors.form.updateButton') : t('vendors.form.createButton')}
            </Button>
          </Group>
        </Stack>
      </form>
    </Stack>
  );
}
