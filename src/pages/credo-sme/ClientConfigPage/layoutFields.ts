import { defaultAppConfig } from '@/config/schema';
import type { CredoAppConfig } from '../schema';

export type Variant = 'dark' | 'light';

export type LayoutForm = {
  navbarWidth: number;
  displayIconWhenCollapsed: boolean;
  navbarVariant: Variant;
  headerVariant: Variant;
};

const D = defaultAppConfig.layout;

export const layoutDefaults = (): LayoutForm => ({
  navbarWidth: D.navbar.width,
  displayIconWhenCollapsed: D.navbar.displayIconWhenCollapsed,
  navbarVariant: D.navbar.variant,
  headerVariant: D.header.variant,
});

const asVariant = (v: unknown, fallback: Variant): Variant =>
  v === 'dark' || v === 'light' ? v : fallback;

export const readLayout = (config: CredoAppConfig | null): LayoutForm => {
  const d = layoutDefaults();
  const navbar = config?.layout?.navbar;
  return {
    navbarWidth: typeof navbar?.width === 'number' ? navbar.width : d.navbarWidth,
    displayIconWhenCollapsed:
      typeof navbar?.displayIconWhenCollapsed === 'boolean'
        ? navbar.displayIconWhenCollapsed
        : d.displayIconWhenCollapsed,
    navbarVariant: asVariant(navbar?.variant, d.navbarVariant),
    headerVariant: asVariant(config?.layout?.header?.variant, d.headerVariant),
  };
};

export const applyLayout = (
  storedLayout: CredoAppConfig['layout'],
  form: LayoutForm,
): CredoAppConfig['layout'] => {
  const d = layoutDefaults();

  const navbar = { ...(storedLayout?.navbar ?? {}) } as Record<string, unknown>;
  const header = { ...(storedLayout?.header ?? {}) } as Record<string, unknown>;

  const put = (bag: Record<string, unknown>, key: string, value: unknown, dflt: unknown) => {
    if (value === dflt) delete bag[key];
    else bag[key] = value;
  };
  put(navbar, 'width', form.navbarWidth, d.navbarWidth);
  put(
    navbar,
    'displayIconWhenCollapsed',
    form.displayIconWhenCollapsed,
    d.displayIconWhenCollapsed,
  );
  put(navbar, 'variant', form.navbarVariant, d.navbarVariant);
  put(header, 'variant', form.headerVariant, d.headerVariant);

  const layout = { ...(storedLayout ?? {}) } as Record<string, unknown>;
  if (Object.keys(navbar).length > 0) layout.navbar = navbar;
  else delete layout.navbar;
  if (Object.keys(header).length > 0) layout.header = header;
  else delete layout.header;

  return Object.keys(layout).length > 0 ? (layout as CredoAppConfig['layout']) : undefined;
};
