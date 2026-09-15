import type { CredoAppConfig } from '../schema';

export type AppIdentityForm = {
  name: string;

  nameHtml: string;
  description: string;
};

export const readAppIdentity = (config: CredoAppConfig | null): AppIdentityForm => ({
  name: config?.app?.name ?? '',
  nameHtml: config?.app?.nameHtml ?? '',
  description: config?.app?.description ?? '',
});

export const applyAppIdentity = (
  app: CredoAppConfig['app'],
  form: AppIdentityForm,
): CredoAppConfig['app'] => {
  const next = { ...app };
  const name = form.name.trim();
  if (name) next.name = name;
  for (const key of ['nameHtml', 'description'] as const) {
    const value = form[key].trim();
    if (value) next[key] = value;
    else delete next[key];
  }
  return next;
};

export const appIdentityIssues = (form: AppIdentityForm): string[] =>
  form.name.trim() ? [] : ['App name is required — it is the tab title and the PWA manifest name.'];
