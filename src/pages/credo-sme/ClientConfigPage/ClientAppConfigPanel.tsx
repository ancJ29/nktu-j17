import {
  ActionIcon,
  Alert,
  Button,
  Code,
  CopyButton,
  Group,
  Loader,
  Stack,
  Tooltip,
} from '@mantine/core';
import { useHotkeys } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconArrowLeft,
  IconBraces,
  IconCheck,
  IconChevronDown,
  IconChevronRight,
  IconCopy,
  IconDeviceFloppy,
  IconLock,
  IconLayoutSidebar,
  IconMenu2,
  IconPalette,
  IconPhoto,
  IconRefresh,
  IconSettings,
  IconShieldLock,
  IconTruck,
  IconUsers,
  IconCategory2,
  IconShoppingCart,
  IconTruckDelivery,
  IconPackage,
  IconBox,
  IconBuilding,
  IconId,
  IconHistory,
  IconPackageImport,
  IconSignature,
} from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { credoSmeConnector } from '@credo/connectors/connector';
import type { CredoSmeClientConfig } from '@credo/connectors/types';
import { CredoAppConfigSchema, type CredoAppConfig } from '../schema';
import { BrandingSection } from './BrandingSection';
import { CarriedThroughSection } from './CarriedThroughSection';
import { CollapsibleSection } from './CollapsibleSection';
import { applyEmployees, readEmployees, type EmployeeForm } from './employeeFields';
import { EmployeeSection } from './EmployeeSection';
import { applyActivityLog, readActivityLog } from './activityLogFields';
import { ActivityLogSection } from './ActivityLogSection';
import {
  applyOptions,
  readDepartmentOptions,
  readLanguageCodes,
  readPositionOptions,
  type DepartmentOption,
  type PositionOption,
} from './optionFields';
import { DepartmentsSection } from './DepartmentsSection';
import { PositionsSection } from './PositionsSection';
import {
  applyPermissions,
  clampDepartmentOverlays,
  readPermissions,
  type PermissionForm,
} from './permissionFields';
import {
  applyPermissionMode,
  readPermissionMode,
  type PermissionModeForm,
} from './permissionModeFields';
import { PermissionsSection } from './PermissionsSection';
import { ConfigJsonSection } from './ConfigJsonSection';
import { applyLogos, emptyLogos, readLogos, type LogoField } from './logoFields';
import {
  applyAppIdentity,
  appIdentityIssues,
  readAppIdentity,
  type AppIdentityForm,
} from './appIdentityFields';
import { AppIdentitySection } from './AppIdentitySection';
import { applyTheme, readTheme, resolvePalette, type ThemeForm } from './themeFields';
import {
  applyNavigation,
  readLegacyPc,
  readNavigation,
  type NavigationForm,
} from './navigationFields';
import { NavigationSection } from './NavigationSection';
import { applyLayout, readLayout, type LayoutForm } from './layoutFields';
import { LayoutSection } from './LayoutSection';
import { ThemeSection } from './ThemeSection';
import { PanelHeader } from './PanelHeader';
import { applyVendorsV2, readVendorsV2, type VendorsV2Form } from './vendorFields';
import { VendorsSection } from './VendorsSection';
import { applyCustomersV2, readCustomersV2, type CustomersV2Form } from './customerFields';
import { CustomersSection } from './CustomersSection';
import { applyProductsV2, readProductsV2, type ProductsV2Form } from './productFields';
import { ProductsSection } from './ProductsSection';
import { applyMaterialsV2, readMaterialsV2, type MaterialsV2Form } from './materialFields';
import { MaterialsSection } from './MaterialsSection';
import {
  applyGoodsReceiptsV2,
  readGoodsReceiptsV2,
  readStatusFlowDraft,
  customFieldIssues,
  statusFlowIssues,
  type GoodsReceiptsV2Form,
} from './goodsReceiptFields';
import { GoodsReceiptsSection } from './GoodsReceiptsSection';
import {
  applySalesOrdersV2,
  readSalesOrdersV2,
  readStatusFlowDraft as readSalesOrderFlowDraft,
  customFieldIssues as salesOrderFieldIssues,
  statusFlowIssues as salesOrderFlowIssues,
  type SalesOrdersV2Form,
} from './salesOrderFields';
import { SalesOrdersV2Section } from './SalesOrdersV2Section';
import {
  applyDeliveryNotesV2,
  readDeliveryNotesV2,
  readStatusFlowDraft as readDeliveryNoteFlowDraft,
  customFieldIssues as deliveryNoteFieldIssues,
  statusFlowIssues as deliveryNoteFlowIssues,
  type DeliveryNotesV2Form,
} from './deliveryNoteFields';
import { DeliveryNotesV2Section } from './DeliveryNotesV2Section';
import { applyLookupV2, readLookupV2, type LookupsV2Form } from './lookupFields';
import { LookupsSection } from './LookupsSection';

const SECTION_KEYS = [
  'identity',
  'branding',
  'theme',
  'navigation',
  'layout',
  'employees',
  'departments',
  'positions',
  'vendors',
  'customers',
  'products',
  'materials',
  'goodsReceipts',
  'salesOrders',
  'deliveryNotes',
  'lookups',
  'activityLog',
  'permissions',
  'carried',
  'json',
] as const;
type SectionKey = (typeof SECTION_KEYS)[number];

export function ClientAppConfigPanel({
  client,
  onBack,
}: {
  client: CredoSmeClientConfig;
  onBack: () => void;
}) {
  const code = client.clientServiceCode;

  const [stored, setStored] = useState<CredoAppConfig | null>(null);

  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [logos, setLogos] = useState<Record<LogoField, string>>(() => emptyLogos());
  const [identity, setIdentity] = useState<AppIdentityForm>(() => readAppIdentity(null));
  const [theme, setTheme] = useState<ThemeForm>(() => readTheme(null));
  const [navigation, setNavigation] = useState<NavigationForm>(() => readNavigation(null));
  const [layout, setLayout] = useState<LayoutForm>(() => readLayout(null));

  const [legacyPc, setLegacyPc] = useState(() => readLegacyPc(null));
  const [vendorsV2, setVendorsV2] = useState<VendorsV2Form>(() => readVendorsV2(null));
  const [customersV2, setCustomersV2] = useState<CustomersV2Form>(() => readCustomersV2(null));
  const [productsV2, setProductsV2] = useState<ProductsV2Form>(() => readProductsV2(null));
  const [materialsV2, setMaterialsV2] = useState<MaterialsV2Form>(() => readMaterialsV2(null));
  const [goodsReceiptsV2, setGoodsReceiptsV2] = useState<GoodsReceiptsV2Form>(() =>
    readGoodsReceiptsV2(null),
  );
  const [deliveryNotesV2, setDeliveryNotesV2] = useState<DeliveryNotesV2Form>(() =>
    readDeliveryNotesV2(null),
  );
  const [salesOrdersV2, setSalesOrdersV2] = useState<SalesOrdersV2Form>(() =>
    readSalesOrdersV2(null),
  );
  const [lookupV2, setLookupV2] = useState<LookupsV2Form>(() => readLookupV2(null));
  const [employees, setEmployees] = useState<EmployeeForm>(() => readEmployees(null));
  const [permissions, setPermissions] = useState<PermissionForm>(() => readPermissions(null));
  const [permissionMode, setPermissionMode] = useState<PermissionModeForm>(() =>
    readPermissionMode(null),
  );
  const [departmentOptions, setDepartmentOptions] = useState<DepartmentOption[]>([]);
  const [positionOptions, setPositionOptions] = useState<PositionOption[]>([]);

  const [langCodes, setLangCodes] = useState<string[]>(() => readLanguageCodes(null));
  const [activityLog, setActivityLog] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await credoSmeConnector.getAppConfigAdmin({ clientServiceCode: code });
      if (!res.success) {
        throw new Error((res as { message?: string }).message ?? 'getAppConfigAdmin failed');
      }

      const parsed = res.config === null ? null : CredoAppConfigSchema.safeParse(res.config);
      if (parsed && !parsed.success) {
        throw new Error(
          `Stored config does not match this editor's schema — ${parsed.error.issues
            .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
            .join('; ')}`,
        );
      }

      const config = parsed?.data ?? null;
      setStored(config);
      setLogos(readLogos(config));
      setIdentity(readAppIdentity(config));
      setTheme(readTheme(config));
      setNavigation(readNavigation(config));
      setLayout(readLayout(config));
      setLegacyPc(readLegacyPc(config));
      setVendorsV2(readVendorsV2(config));
      setCustomersV2(readCustomersV2(config));
      setProductsV2(readProductsV2(config));
      setMaterialsV2(readMaterialsV2(config));
      setGoodsReceiptsV2(readGoodsReceiptsV2(config));
      setSalesOrdersV2(readSalesOrdersV2(config));
      setDeliveryNotesV2(readDeliveryNotesV2(config));
      setLookupV2(readLookupV2(config));
      setEmployees(readEmployees(config));
      setPermissions(readPermissions(config));
      setPermissionMode(readPermissionMode(config));
      setDepartmentOptions(readDepartmentOptions(config));
      setPositionOptions(readPositionOptions(config));
      setLangCodes(readLanguageCodes(config));
      setActivityLog(readActivityLog(config));
      setLoaded(true);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    void load();
  }, [load]);

  const pending = useMemo<CredoAppConfig | null>(
    () =>
      loaded
        ? {
            ...(stored ?? {}),
            version: stored?.version ?? '',

            app: applyAppIdentity(applyLogos(stored?.app, logos, client.clientName), identity),
            themeConfig: applyTheme(stored?.themeConfig, theme),
            navigationV2: applyNavigation(stored?.navigationV2, navigation),
            layout: applyLayout(stored?.layout, layout),

            features: applyPermissionMode(
              applyActivityLog(
                applyOptions(
                  applyEmployees(
                    applyLookupV2(
                      applyDeliveryNotesV2(
                        applySalesOrdersV2(
                          applyGoodsReceiptsV2(
                            applyMaterialsV2(
                              applyProductsV2(
                                applyCustomersV2(
                                  applyVendorsV2(stored?.features, vendorsV2),
                                  customersV2,
                                ),
                                productsV2,
                              ),
                              materialsV2,
                            ),
                            goodsReceiptsV2,
                          ),
                          salesOrdersV2,
                        ),
                        deliveryNotesV2,
                      ),
                      lookupV2,
                    ),
                    employees,
                  ),
                  departmentOptions,
                  positionOptions,
                ),
                activityLog,
              ),
              permissionMode,
            ),
            permissions: applyPermissions(stored?.permissions, permissions),
          }
        : null,
    [
      loaded,
      stored,
      logos,
      identity,
      theme,
      navigation,
      layout,
      vendorsV2,
      customersV2,
      productsV2,
      materialsV2,
      goodsReceiptsV2,
      salesOrdersV2,
      deliveryNotesV2,
      lookupV2,
      employees,
      permissions,
      permissionMode,
      departmentOptions,
      positionOptions,
      activityLog,
      client.clientName,
    ],
  );

  const [openSections, setOpenSections] = useState<Set<SectionKey>>(() => new Set());

  const showDepartments = employees.flags.department || departmentOptions.length > 0;
  const showPositions = employees.flags.position || positionOptions.length > 0;

  const visibleKeys = useMemo(
    () =>
      SECTION_KEYS.filter(
        (key) =>
          (key !== 'departments' || showDepartments) && (key !== 'positions' || showPositions),
      ),
    [showDepartments, showPositions],
  );
  const allOpen = visibleKeys.every((key) => openSections.has(key));

  const toggleSection = useCallback((key: SectionKey) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setOpenSections((prev) =>
      visibleKeys.every((key) => prev.has(key)) ? new Set() : new Set(visibleKeys),
    );
  }, [visibleKeys]);

  const handleApplyJson = useCallback((next: CredoAppConfig) => {
    setStored(next);
    setLogos(readLogos(next));
    setIdentity(readAppIdentity(next));
    setTheme(readTheme(next));
    setNavigation(readNavigation(next));
    setLayout(readLayout(next));
    setLegacyPc(readLegacyPc(next));
    setVendorsV2(readVendorsV2(next));
    setCustomersV2(readCustomersV2(next));
    setProductsV2(readProductsV2(next));
    setMaterialsV2(readMaterialsV2(next));
    setGoodsReceiptsV2(readGoodsReceiptsV2(next));
    setSalesOrdersV2(readSalesOrdersV2(next));
    setDeliveryNotesV2(readDeliveryNotesV2(next));
    setLookupV2(readLookupV2(next));
    setEmployees(readEmployees(next));
    setPermissions(readPermissions(next));
    setPermissionMode(readPermissionMode(next));
    setDepartmentOptions(readDepartmentOptions(next));
    setPositionOptions(readPositionOptions(next));
    setLangCodes(readLanguageCodes(next));
    setActivityLog(readActivityLog(next));
    notifications.show({
      color: 'blue',
      title: 'Applied to the editor',
      message: 'Nothing is saved yet — review the fields, then Save config.',
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!pending) return;

    const identityErrors = appIdentityIssues(identity);
    if (identityErrors.length > 0) {
      notifications.show({
        color: 'red',
        title: 'App identity is incomplete',
        message: identityErrors.join('; '),
      });
      return;
    }

    const departmentValues = departmentOptions.map((option) => option.value);
    for (const [module, issues] of [
      ['Goods receipt', statusFlowIssues(goodsReceiptsV2, departmentValues)],
      ['Sales order', salesOrderFlowIssues(salesOrdersV2, departmentValues)],
      ['Delivery note', deliveryNoteFlowIssues(deliveryNotesV2, departmentValues)],
    ] as const) {
      if (issues.errors.length > 0) {
        notifications.show({
          color: 'red',
          title: `${module} status flow config is invalid`,
          message: issues.errors.join('; '),
        });
        return;
      }
    }

    for (const [module, issues] of [
      ['Goods receipt', customFieldIssues(goodsReceiptsV2, departmentValues)],
      ['Sales order', salesOrderFieldIssues(salesOrdersV2, departmentValues)],
      ['Delivery note', deliveryNoteFieldIssues(deliveryNotesV2, departmentValues)],
    ] as const) {
      if (issues.errors.length > 0) {
        notifications.show({
          color: 'red',
          title: `${module} custom field config is invalid`,
          message: issues.errors.join('; '),
        });
        return;
      }
    }

    const clamped = clampDepartmentOverlays(pending.features?.employees?.departmentOptions ?? []);
    const safe: CredoAppConfig =
      clamped.dropped.length > 0
        ? {
            ...pending,
            features: {
              ...pending.features,
              employees: {
                ...pending.features?.employees,
                departmentOptions: clamped.options,
              },
            },
          }
        : pending;

    if (clamped.dropped.length > 0) {
      notifications.show({
        color: 'yellow',
        title: 'Department grants removed',
        message: `A department can restrict, never widen — dropped ${clamped.dropped
          .map((d) => `${d.department}.${d.path}`)
          .join(', ')}.`,
        autoClose: false,
      });
    }

    const config: CredoAppConfig = { ...safe, version: `1.0.${Date.now().toString(36)}` };

    setSaving(true);
    try {
      const res = await credoSmeConnector.setAppConfig({
        clientServiceCode: code,
        config,
      });
      if (!res.success) {
        throw new Error((res as { message?: string }).message ?? 'setAppConfig failed');
      }
      setStored(config);
      notifications.show({
        color: 'green',
        title: 'Config saved',
        message: `${code} now serves version ${config.version}.`,
      });
    } catch (err) {
      notifications.show({
        color: 'red',
        title: 'Save failed',
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSaving(false);
    }
  }, [pending, code, identity, goodsReceiptsV2, salesOrdersV2, deliveryNotesV2, departmentOptions]);

  useHotkeys([['mod+S', () => void handleSave()]]);

  return (
    <Stack gap="lg">
      <PanelHeader
        icon={<IconSettings size={22} style={{ opacity: 0.6 }} />}
        title={client.clientName}
        subtitle={
          <>
            App config for <Code>{code}</Code>, read and written through credo-sme.
          </>
        }
        actions={
          <Group gap="xs" wrap="nowrap">
            <Tooltip label="Reload from server" withArrow>
              <ActionIcon variant="subtle" onClick={() => void load()} loading={loading}>
                <IconRefresh size={16} />
              </ActionIcon>
            </Tooltip>
            <Button
              size="compact-sm"
              variant="default"
              leftSection={<IconArrowLeft size={14} />}
              onClick={onBack}
            >
              Back to clients
            </Button>
            <Button
              size="compact-sm"
              variant="default"
              leftSection={allOpen ? <IconChevronRight size={12} /> : <IconChevronDown size={12} />}
              onClick={toggleAll}
            >
              {allOpen ? 'Collapse all' : 'Expand all'}
            </Button>
            {/* Primary, so not inside the JSON section — that starts collapsed. */}
            <CopyButton value={pending ? JSON.stringify(pending, null, 2) : ''}>
              {({ copied, copy }) => (
                <Button
                  size="compact-sm"
                  variant="default"
                  color={copied ? 'green' : undefined}
                  leftSection={copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                  onClick={copy}
                  disabled={!pending}
                >
                  {copied ? 'Copied' : 'Copy JSON'}
                </Button>
              )}
            </CopyButton>
            <Button
              size="compact-sm"
              variant="default"
              onClick={() => void handleSave()}
              loading={saving}
              disabled={!pending}
              leftSection={<IconDeviceFloppy size={16} />}
            >
              Save config
            </Button>
          </Group>
        }
      />

      {loading && !loaded && (
        <Group justify="center" py="lg">
          <Loader size="sm" />
        </Group>
      )}

      {loadError && (
        <Alert color="red" variant="light" title="Could not read the config">
          {loadError}
          {!loaded && ' — saving is disabled until a read succeeds.'}
        </Alert>
      )}

      {loaded && !stored && (
        <Alert color="yellow" variant="light">
          This client has no stored config. Saving will create one from the fields below — every
          other section falls back to the app&apos;s own schema defaults.
        </Alert>
      )}

      {loaded && (
        <>
          <CollapsibleSection
            icon={<IconBraces size={18} />}
            title="JSON"
            description="The whole blob as this editor would save it — read it, or replace it with one you paste."
            opened={openSections.has('json')}
            onToggle={() => toggleSection('json')}
          >
            <ConfigJsonSection config={pending} stored={stored} onApply={handleApplyJson} />
          </CollapsibleSection>

          <CollapsibleSection
            icon={<IconSignature size={18} />}
            title="App identity"
            description="The client's name as the browser tab, the home-screen app and the header show it."
            opened={openSections.has('identity')}
            onToggle={() => toggleSection('identity')}
          >
            <AppIdentitySection
              value={identity}
              palette={resolvePalette(theme)}
              onChange={setIdentity}
            />
          </CollapsibleSection>

          <CollapsibleSection
            icon={<IconPhoto size={18} />}
            title="Branding assets"
            description="Logo, favicon and PWA icons. An empty field falls back to the built-in asset."
            opened={openSections.has('branding')}
            onToggle={() => toggleSection('branding')}
          >
            <BrandingSection logos={logos} onChange={setLogos} />
          </CollapsibleSection>

          <CollapsibleSection
            icon={<IconPalette size={18} />}
            title="Theme"
            description="The brand palette this client's app resolves every shade against."
            opened={openSections.has('theme')}
            onToggle={() => toggleSection('theme')}
          >
            <ThemeSection value={theme} onChange={setTheme} />
          </CollapsibleSection>

          <CollapsibleSection
            icon={<IconMenu2 size={18} />}
            title="Navigation (desktop)"
            description="The v2 PC menu and who sees each item. Absent means this client stays on the legacy navigation."
            opened={openSections.has('navigation')}
            onToggle={() => toggleSection('navigation')}
          >
            <NavigationSection
              value={navigation}
              legacyPc={legacyPc}
              departmentOptions={departmentOptions}
              permissions={permissions}
              onChange={setNavigation}
            />
          </CollapsibleSection>

          <CollapsibleSection
            icon={<IconLayoutSidebar size={18} />}
            title="Layout"
            description="Navbar width and the two chrome styles. Anything left at the app's own answer is not stored."
            opened={openSections.has('layout')}
            onToggle={() => toggleSection('layout')}
          >
            <LayoutSection value={layout} onChange={setLayout} />
          </CollapsibleSection>

          <CollapsibleSection
            icon={<IconLock size={18} />}
            title="Permissions"
            description="The CLIENT layer for the modules credo-sme enforces. The same grid sets each department's restrictions, further down."
            opened={openSections.has('permissions')}
            onToggle={() => toggleSection('permissions')}
          >
            <PermissionsSection
              value={permissions}
              onChange={setPermissions}
              mode={permissionMode}
              onModeChange={setPermissionMode}
            />
          </CollapsibleSection>

          <CollapsibleSection
            icon={<IconUsers size={18} />}
            title="Employees"
            description="Module flags and the auto-code format. Departments and positions stay on the c-mngt page."
            opened={openSections.has('employees')}
            onToggle={() => toggleSection('employees')}
          >
            <EmployeeSection value={employees} onChange={setEmployees} />
          </CollapsibleSection>

          {showDepartments && (
            <CollapsibleSection
              icon={<IconBuilding size={18} />}
              title="Departments"
              description="Values, labels, and the restriction each department applies over the client layer."
              opened={openSections.has('departments')}
              onToggle={() => toggleSection('departments')}
            >
              <DepartmentsSection
                options={departmentOptions}
                langCodes={langCodes}
                orphaned={!employees.flags.department}
                clientPermissions={permissions}
                onChange={setDepartmentOptions}
              />
            </CollapsibleSection>
          )}

          {showPositions && (
            <CollapsibleSection
              icon={<IconId size={18} />}
              title="Positions"
              description="Values and labels. Positions carry no permissions — there is no such layer."
              opened={openSections.has('positions')}
              onToggle={() => toggleSection('positions')}
            >
              <PositionsSection
                options={positionOptions}
                langCodes={langCodes}
                orphaned={!employees.flags.position}
                onChange={setPositionOptions}
              />
            </CollapsibleSection>
          )}

          <CollapsibleSection
            icon={<IconTruck size={18} />}
            title="Vendors (v2)"
            description="Serve the vendor pages from credo-sme, over their own register — alongside the existing ones, never instead of them."
            opened={openSections.has('vendors')}
            onToggle={() => toggleSection('vendors')}
          >
            <VendorsSection value={vendorsV2} onChange={setVendorsV2} />
          </CollapsibleSection>

          <CollapsibleSection
            icon={<IconShoppingCart size={18} />}
            title="Customers (v2)"
            description="Its own register and its own flag — the customer pages this client runs today are untouched."
            opened={openSections.has('customers')}
            onToggle={() => toggleSection('customers')}
          >
            <CustomersSection value={customersV2} onChange={setCustomersV2} />
          </CollapsibleSection>

          <CollapsibleSection
            icon={<IconPackage size={18} />}
            title="Products (v2)"
            description="Its own register and its own flag — the product pages this client runs today are untouched."
            opened={openSections.has('products')}
            onToggle={() => toggleSection('products')}
          >
            <ProductsSection value={productsV2} onChange={setProductsV2} />
          </CollapsibleSection>

          <CollapsibleSection
            icon={<IconBox size={18} />}
            title="Materials (v2)"
            description="Its own register and its own flag — the material pages this client runs today are untouched."
            opened={openSections.has('materials')}
            onToggle={() => toggleSection('materials')}
          >
            <MaterialsSection value={materialsV2} onChange={setMaterialsV2} />
          </CollapsibleSection>

          <CollapsibleSection
            icon={<IconShoppingCart size={18} />}
            title="Sales orders (v2)"
            description="Outbound orders on credo-sme — its own register. Confirming one LOCKS v2 stock; the delivery note is what deducts it."
            opened={openSections.has('salesOrders')}
            onToggle={() => toggleSection('salesOrders')}
          >
            <SalesOrdersV2Section
              value={salesOrdersV2}
              onChange={setSalesOrdersV2}
              departmentOptions={departmentOptions.map((option) => ({
                value: option.value,
                label: Object.values(option.label ?? {}).find(Boolean) ?? option.value,
              }))}
              storedFlowUnreadable={
                readSalesOrderFlowDraft(stored?.features?.salesOrdersV2?.statusFlow).unreadable
              }
            />
          </CollapsibleSection>

          <CollapsibleSection
            icon={<IconTruckDelivery size={18} />}
            title="Delivery notes (v2)"
            description="What ships an order — its own register. A note DEDUCTS v2 stock, and never gives it back."
            opened={openSections.has('deliveryNotes')}
            onToggle={() => toggleSection('deliveryNotes')}
          >
            <DeliveryNotesV2Section
              value={deliveryNotesV2}
              onChange={setDeliveryNotesV2}
              departmentOptions={departmentOptions.map((option) => ({
                value: option.value,
                label: Object.values(option.label ?? {}).find(Boolean) ?? option.value,
              }))}
              storedFlowUnreadable={
                readDeliveryNoteFlowDraft(stored?.features?.deliveryNotesV2?.statusFlow).unreadable
              }
            />
          </CollapsibleSection>

          <CollapsibleSection
            icon={<IconPackageImport size={18} />}
            title="Goods receipts (v2)"
            description="Inbound stock on credo-sme — its own register, and it posts to the v2 inventory rather than the one the current pages write."
            opened={openSections.has('goodsReceipts')}
            onToggle={() => toggleSection('goodsReceipts')}
          >
            <GoodsReceiptsSection
              value={goodsReceiptsV2}
              onChange={setGoodsReceiptsV2}
              departmentOptions={departmentOptions.map((option) => ({
                value: option.value,
                label: Object.values(option.label ?? {}).find(Boolean) ?? option.value,
              }))}
              storedFlowUnreadable={
                readStatusFlowDraft(stored?.features?.goodsReceiptsV2?.statusFlow).unreadable
              }
            />
          </CollapsibleSection>

          <CollapsibleSection
            icon={<IconCategory2 size={18} />}
            title="Lookups (v2)"
            description="Whether this client gets the Meta-data manager, and over what."
            opened={openSections.has('lookups')}
            onToggle={() => toggleSection('lookups')}
          >
            <LookupsSection value={lookupV2} onChange={setLookupV2} />
          </CollapsibleSection>

          <CollapsibleSection
            icon={<IconHistory size={18} />}
            title="Activity log"
            description="Whether the app records who changed what, per record."
            opened={openSections.has('activityLog')}
            onToggle={() => toggleSection('activityLog')}
          >
            <ActivityLogSection enabled={activityLog} onChange={setActivityLog} />
          </CollapsibleSection>

          <CollapsibleSection
            icon={<IconShieldLock size={18} />}
            title="Not modelled here — carried through unchanged"
            description="The sections this editor does not render, sent back exactly as they were read."
            opened={openSections.has('carried')}
            onToggle={() => toggleSection('carried')}
          >
            <CarriedThroughSection config={pending} />
          </CollapsibleSection>
        </>
      )}
    </Stack>
  );
}
