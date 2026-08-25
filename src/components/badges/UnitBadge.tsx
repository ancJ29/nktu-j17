import { ColorBadge } from '@credo/base-ui/components';
import { lookupLabelOf, useLookupV2Labels } from '@/hooks';

type UnitBadgeProps = {
  readonly unit: string;

  readonly base?: boolean;

  readonly color?: string;

  readonly lookup?: string;
};

export function UnitBadge({ unit, base, color, lookup = 'unit' }: UnitBadgeProps) {
  const unitLabels = useLookupV2Labels(lookup);
  const resolvedColor = color ?? (base ? 'blue' : '#1e438a');

  return <ColorBadge color={resolvedColor} label={lookupLabelOf(unitLabels, unit)} size="sm" />;
}
