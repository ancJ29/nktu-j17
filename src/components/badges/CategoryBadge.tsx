import { ColorBadge } from '@credo/base-ui/components';
import { lookupLabelOf, useLookupV2Labels } from '@/hooks';

type CategoryBadgeProps = {
  readonly category: string | undefined;

  readonly lookup?: string;
  readonly color?: string;
};

export function CategoryBadge({
  category,
  lookup = 'product-category',
  color,
}: CategoryBadgeProps) {
  const categoryLabels = useLookupV2Labels(lookup);

  return <ColorBadge color={color} label={lookupLabelOf(categoryLabels, category)} size="sm" />;
}
