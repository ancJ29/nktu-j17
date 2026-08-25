import { ColorBadge } from '@credo/base-ui/components';
import { lookupLabelOf, useLookupV2Labels } from '@/hooks';

type TagBadgeProps = {
  readonly tag: string;

  readonly lookup?: string;
  readonly color?: string;
};

export function TagBadge({ tag, lookup = 'product-tag', color = '#355ea1' }: TagBadgeProps) {
  const tagLabels = useLookupV2Labels(lookup);

  return <ColorBadge color={color} label={lookupLabelOf(tagLabels, tag)} size="sm" />;
}
