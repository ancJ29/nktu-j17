import { RecordThumb } from '@/components/RecordThumb';
import type { Product } from '@/types';

type ProductThumbProps = {
  readonly product: Product;
  readonly size?: number;
  readonly radius?: number | string;
};

export function ProductThumb({ product, size = 40, radius = 8 }: ProductThumbProps) {
  return (
    <RecordThumb
      url={product.extra?.images?.[0]?.url}
      alt={product.name}
      size={size}
      radius={radius}
    />
  );
}
