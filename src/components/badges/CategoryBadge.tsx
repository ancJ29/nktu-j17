import { ColorBadge } from '@credo/base-ui/components';
import { lookupLabelOf, useLookupLabels } from '@/hooks';

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
  const categoryLabels = useLookupLabels(lookup);

  return <ColorBadge color={color} label={lookupLabelOf(categoryLabels, category)} size="sm" />;
}
