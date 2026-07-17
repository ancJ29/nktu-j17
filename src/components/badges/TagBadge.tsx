import { ColorBadge } from '@credo/base-ui/components';
import { lookupLabelOf, useLookupLabels } from '@/hooks';

type TagBadgeProps = {
  readonly tag: string;
  
  readonly lookup?: string;
  readonly color?: string;
};

export function TagBadge({ tag, lookup = 'product-tag', color = '#355ea1' }: TagBadgeProps) {
  const tagLabels = useLookupLabels(lookup);

  return <ColorBadge color={color} label={lookupLabelOf(tagLabels, tag)} size="sm" />;
}
