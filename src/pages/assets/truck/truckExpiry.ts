import type { TruckAssetExtra } from '@/types';

export const URGENT_WINDOW_DAYS = 30;

export const MAX_VISIBLE_URGENT = 3;

export type ExpiryEntry = {
  date: string;

  kindKey: string;

  detail?: string;

  daysLeft: number;
  expired: boolean;
};

export type ExpirySummary = {
  visible: ExpiryEntry[];

  hiddenCount: number;

  urgent: boolean;
};

export function daysBetween(fromIso: string, toIso: string): number {
  const [fy, fm, fd] = fromIso.split('-').map(Number);
  const [ty, tm, td] = toIso.split('-').map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000);
}

function allEntries(extra: TruckAssetExtra, todayIso: string): ExpiryEntry[] {
  const candidates: { date?: string; kindKey: string; detail?: string }[] = [
    { date: extra.inspectionExpiry, kindKey: 'assets.truck.expiry.inspection' },
    { date: extra.badgeExpiry, kindKey: 'assets.truck.expiry.badge' },

    ...(extra.registrationType === 'copy'
      ? [{ date: extra.registrationCopyExpiry, kindKey: 'assets.truck.expiry.registration' }]
      : []),
    ...(extra.insurances ?? []).map((policy) => ({
      date: policy.expiry,
      kindKey: 'assets.truck.expiry.insurance',

      detail: policy.type?.trim() || policy.company?.trim() || undefined,
    })),
  ];

  return candidates
    .filter((c): c is { date: string; kindKey: string; detail?: string } => !!c.date)
    .map((c) => {
      const daysLeft = daysBetween(todayIso, c.date);
      return { ...c, daysLeft, expired: daysLeft < 0 };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function daysToNearestExpiry(
  extra: TruckAssetExtra | undefined,
  todayIso: string,
): number | null {
  if (!extra) return null;
  const entries = allEntries(extra, todayIso);
  return entries.length > 0 ? entries[0].daysLeft : null;
}

export function expirySortKey(extra: TruckAssetExtra | undefined, todayIso: string): number {
  return daysToNearestExpiry(extra, todayIso) ?? Number.POSITIVE_INFINITY;
}

export type ExpiryUrgency = 'all' | 'within7' | 'within30' | 'expired';

export function matchesUrgency(
  extra: TruckAssetExtra | undefined,
  todayIso: string,
  urgency: ExpiryUrgency,
): boolean {
  if (urgency === 'all') return true;
  const days = daysToNearestExpiry(extra, todayIso);

  if (days === null) return false;
  if (urgency === 'expired') return days < 0;
  return days <= (urgency === 'within7' ? 7 : URGENT_WINDOW_DAYS);
}

export function expirySummary(
  extra: TruckAssetExtra | undefined,
  todayIso: string,
  maxVisible: number = MAX_VISIBLE_URGENT,
): ExpirySummary | null {
  if (!extra) return null;
  const entries = allEntries(extra, todayIso);
  if (entries.length === 0) return null;

  const urgent = entries.filter((e) => e.daysLeft <= URGENT_WINDOW_DAYS);
  if (urgent.length === 0) return { visible: [entries[0]], hiddenCount: 0, urgent: false };

  const visible = urgent.slice(0, Math.max(1, maxVisible));
  return { visible, hiddenCount: urgent.length - visible.length, urgent: true };
}
