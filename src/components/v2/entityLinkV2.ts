import type { LinkSize } from '../EntityLink';

export type EntityLinkV2Props = {
  id: string | undefined | null;

  fallbackLabel?: string | undefined | null;

  fallbackCode?: string | undefined | null;

  codeBelow?: boolean;

  withoutIcon?: boolean;
  size?: LinkSize;
};

export function chipLabelParts(
  label: string,
  code: string | undefined | null,
  codeBelow: boolean | undefined,
): { label: string; sub?: string } {
  const trimmed = code?.trim();
  if (!trimmed) return { label };
  return codeBelow ? { label, sub: trimmed } : { label: `${label} · ${trimmed}` };
}
