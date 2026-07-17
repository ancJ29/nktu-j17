import {
  ActionIcon,
  Button,
  Card,
  Divider,
  Grid,
  Group,
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
import { useCustomerStore, fetchCustomerById } from '@/stores/useCustomerStore';
import { EntityConflictError } from '@/stores/createEntityStore';
import { logActivity } from '@/utils/activityLogger';
import { deepDiff } from '@/utils/deepDiff';
import { device } from '@credo/base-ui/utils';
import { useInitFormFromFetch } from '@/hooks';
import { perms, hasShippingAddressForCustomers } from '@/utils/permission';
import { SectionCard } from '@/components/SectionCard';
import type { Customer, CustomerContact, CustomerExtra, CustomerShippingAddress } from '@/types';

const isMobile = device.isMobile;
const hasShippingAddress = hasShippingAddressForCustomers();

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

type ShippingRow = {
  id: string;
  address: string;
  googleMapUrl: string;
  deliveryHours: string;
};

type CustomerFormValues = {
  
  name: string;
  code: string;
  shortName: string;
  taxCode: string;
  isActive: boolean;

  
  phone: string;
  contactPerson: string;

  
  address: string;
  addressGoogleMapUrl: string;
  shippingAddresses: ShippingRow[];

  
  contacts: ContactRow[];
};

const EMPTY_VALUES: CustomerFormValues = {
  name: '',
  code: '',
  shortName: '',
  taxCode: '',
  isActive: true,
  phone: '',
  contactPerson: '',
  address: '',
  addressGoogleMapUrl: '',
  shippingAddresses: [],
  contacts: [],
};

function emptyContactRow(): ContactRow {
  return { id: newRowId(), name: '', role: '', phone: '', isPrimary: false };
}

function emptyShippingRow(): ShippingRow {
  return { id: newRowId(), address: '', googleMapUrl: '', deliveryHours: '' };
}

export function CustomerFormPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  useEffect(() => {
    if (
      isMobile ||
      (isEdit && !perms.customer.canEdit()) ||
      (!isEdit && !perms.customer.canCreate())
    ) {
      navigate(ROUTES.CUSTOMERS.LIST, { replace: true });
    }
  }, [navigate, isEdit]);

  const [loading, setLoading] = useState(false);
  const snapshotRef = useRef<Customer | null>(null);

  const form = useForm<CustomerFormValues>({
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
      const c = await fetchCustomerById(id);
      snapshotRef.current = c;
      const e = c.extra ?? ({} as CustomerExtra);
      return {
        name: c.name,
        code: c.code,
        shortName: e.shortName ?? '',
        taxCode: e.taxCode ?? '',
        isActive: c.isActive,
        phone: c.phone ?? '',
        contactPerson: c.contactPerson ?? '',
        address: c.address ?? '',
        addressGoogleMapUrl: e.addressGoogleMapUrl ?? '',
        shippingAddresses: (e.shippingAddresses ?? []).map((s) => ({
          id: s.id || newRowId(),
          address: s.address ?? '',
          googleMapUrl: s.googleMapUrl ?? '',
          deliveryHours: s.deliveryHours ?? '',
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
      notifications.show({ color: 'red', message: t('customers.notifications.fetchError') });
      navigate(ROUTES.CUSTOMERS.LIST);
    },
  );

  const handleSubmit = useCallback(
    async (values: CustomerFormValues) => {
      setLoading(true);
      try {
        const prevExtra = snapshotRef.current?.extra ?? ({} as CustomerExtra);

        const cleanContacts: CustomerContact[] = values.contacts
          .filter((c) => c.name.trim() || c.phone.trim() || c.role.trim())
          .map((c) => ({
            id: c.id,
            name: c.name.trim(),
            ...(c.role.trim() ? { role: c.role.trim() } : {}),
            ...(c.phone.trim() ? { phone: c.phone.trim() } : {}),
            ...(c.isPrimary ? { isPrimary: true } : {}),
          }));

        const cleanShipping: CustomerShippingAddress[] = values.shippingAddresses
          .filter((s) => s.address.trim())
          .map((s) => ({
            id: s.id,
            address: s.address.trim(),
            ...(s.googleMapUrl.trim() ? { googleMapUrl: s.googleMapUrl.trim() } : {}),
            ...(s.deliveryHours.trim() ? { deliveryHours: s.deliveryHours.trim() } : {}),
          }));

        
        
        const extra: CustomerExtra = {
          ...prevExtra,
          shortName: values.shortName.trim() || undefined,
          taxCode: values.taxCode.trim() || undefined,
          contacts: cleanContacts.length ? cleanContacts : undefined,
          addressGoogleMapUrl: values.addressGoogleMapUrl.trim() || undefined,
          shippingAddresses: cleanShipping.length ? cleanShipping : undefined,
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
          if (!snapshot) throw new Error('Customer snapshot missing');
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
          const updated = await useCustomerStore.getState().updateSafely({
            id,
            version: snapshot.version,
            patch: after,
          });
          snapshotRef.current = updated;
          const diff = deepDiff(before, after);
          const onlyIsActive = Object.keys(diff).length === 1 && 'isActive' in diff;
          logActivity(onlyIsActive ? 'customer.toggleStatus' : 'customer.update', id, diff);
          notifications.show({
            color: 'green',
            message: t('customers.notifications.updateSuccess'),
          });
          navigate(ROUTES.CUSTOMERS.DETAIL.replace(':id', id));
        } else {
          
          
          
          const created = await useCustomerStore.getState().createSafely({
            patch: { ...basePatch, extra },
          });
          logActivity('customer.create', created.id);
          notifications.show({
            color: 'green',
            message: t('customers.notifications.createSuccess'),
          });
          navigate(ROUTES.CUSTOMERS.DETAIL.replace(':id', created.id));
        }
      } catch (err) {
        if (err instanceof EntityConflictError) {
          if (err.latest) snapshotRef.current = err.latest as Customer;
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
              ? t('customers.notifications.updateError')
              : t('customers.notifications.createError'),
          });
        }
      } finally {
        setLoading(false);
      }
    },
    [isEdit, id, t, navigate],
  );

  if (fetching) return null;

  
  const topActions = (
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
        <Grid.Col span={{ base: 12, md: 6 }}>
          <TextInput
            label={t('common.labels.name')}
            placeholder={t('customers.form.namePlaceholder')}
            withAsterisk
            {...form.getInputProps('name')}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 3 }}>
          <TextInput
            label={t('common.labels.shortName')}
            placeholder={t('customers.form.shortNamePlaceholder')}
            {...form.getInputProps('shortName')}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 3 }}>
          <TextInput
            label={t('common.labels.code')}
            placeholder={t('customers.form.codePlaceholder')}
            withAsterisk
            disabled={isEdit}
            {...form.getInputProps('code')}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <TextInput
            label={t('common.labels.taxCode')}
            placeholder={t('customers.form.taxCodePlaceholder')}
            {...form.getInputProps('taxCode')}
          />
        </Grid.Col>
      </Grid>
    </SectionCard>
  );

  
  
  
  const statusCard = (
    <SectionCard
      icon={<IconAdjustments size={14} />}
      title={t('common.labels.status')}
      padding="md"
    >
      <Switch
        label={t('common.form.isActiveLabel')}
        {...form.getInputProps('isActive', { type: 'checkbox' })}
      />
    </SectionCard>
  );

  
  const addressesCard = (
    <SectionCard
      icon={<IconMapPin size={14} />}
      title={t('common.labels.addresses')}
      padding="md"
      actions={
        hasShippingAddress ? (
          <Button
            variant="subtle"
            size="compact-sm"
            leftSection={<IconPlus size={14} />}
            onClick={() => form.insertListItem('shippingAddresses', emptyShippingRow())}
          >
            {t('customers.form.shippingAddressesAdd')}
          </Button>
        ) : undefined
      }
    >
      <Stack gap="md">
        <Textarea
          label={t('customers.detail.billingAddress')}
          placeholder={t('customers.form.addressPlaceholder')}
          autosize
          minRows={2}
          {...form.getInputProps('address')}
        />
        <TextInput
          label={t('customers.form.googleMapUrlLabel')}
          placeholder={t('customers.form.googleMapUrlPlaceholder')}
          {...form.getInputProps('addressGoogleMapUrl')}
        />
        {!hasShippingAddress || form.values.shippingAddresses.length === 0 ? null : (
          <Stack gap="sm">
            {form.values.shippingAddresses.map((row, index) => (
              <Card key={row.id} withBorder padding="sm" radius="md">
                <Stack gap="sm">
                  <Group justify="space-between" align="center">
                    <Text size="xs" c="dimmed" fw={600}>
                      {t('customers.detail.shippingAddress')} #{index + 1}
                    </Text>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      onClick={() => form.removeListItem('shippingAddresses', index)}
                      aria-label={t('__new__.01-common.actions.remove')}
                    >
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Group>
                  <Textarea
                    label={t('customers.form.shippingAddressLabel')}
                    placeholder={t('common.labels.address')}
                    autosize
                    minRows={2}
                    {...form.getInputProps(`shippingAddresses.${index}.address`)}
                  />
                  <TextInput
                    label={t('customers.form.googleMapUrlLabel')}
                    placeholder={t('customers.form.googleMapUrlPlaceholder')}
                    {...form.getInputProps(`shippingAddresses.${index}.googleMapUrl`)}
                  />
                  <TextInput
                    label={t('customers.form.deliveryHoursLabel')}
                    placeholder={t('customers.form.deliveryHoursPlaceholder')}
                    {...form.getInputProps(`shippingAddresses.${index}.deliveryHours`)}
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
      title={t('customers.contacts.section')}
      padding="md"
      actions={
        <Button
          variant="subtle"
          size="compact-sm"
          leftSection={<IconPlus size={14} />}
          onClick={() => form.insertListItem('contacts', emptyContactRow())}
        >
          {t('customers.contacts.addContact')}
        </Button>
      }
    >
      <Stack gap="md">
        <Grid gutter="md">
          <Grid.Col span={{ base: 12, md: 6 }}>
            <TextInput
              label={t('customers.form.contactPersonLabel')}
              placeholder={t('customers.form.contactPersonPlaceholder')}
              {...form.getInputProps('contactPerson')}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <TextInput
              label={t('common.labels.phone')}
              placeholder={t('common.form.phonePlaceholder')}
              {...form.getInputProps('phone')}
            />
          </Grid.Col>
        </Grid>

        {form.values.contacts.length === 0 ? (
          <Text size="sm" c="dimmed">
            {t('customers.contacts.emptyHint')}
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
                        label={t('customers.form.contactNameLabel')}
                        {...form.getInputProps(`contacts.${index}.name`)}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <TextInput
                        label={t('customers.form.contactRoleLabel')}
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
        {isEdit ? t('customers.editItem') : t('customers.addItem')}
      </Title>

      <Divider />

      {/* eslint-disable-next-line react-hooks/refs -- Mantine form.onSubmit() builds the submit handler during render by design; the internal ref read is safe. */}
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <Grid gutter="md">
            <Grid.Col span={{ base: 12, md: isEdit ? 7 : 12 }}>
              <Stack gap="md">
                {basicInfoCard}
                {addressesCard}
                {contactsCard}
              </Stack>
            </Grid.Col>
            {isEdit && (
              <Grid.Col span={{ base: 12, md: 5 }}>
                <Stack gap="md">{statusCard}</Stack>
              </Grid.Col>
            )}
          </Grid>

          <Group justify="flex-end" gap="sm">
            <Button
              variant="default"
              size="sm"
              disabled={loading}
              onClick={() => navigate(ROUTES.CUSTOMERS.LIST)}
            >
              {t('__new__.01-common.actions.cancel')}
            </Button>
            <Button type="submit" loading={loading} size="sm">
              {isEdit ? t('customers.form.updateButton') : t('customers.form.createButton')}
            </Button>
          </Group>
        </Stack>
      </form>
    </Stack>
  );
}
