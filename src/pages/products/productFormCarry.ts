import type { ProductExtra } from '@/types';

export function carriedExtraOf(snapshotExtra: ProductExtra | undefined): Partial<ProductExtra> {
  const out: Partial<ProductExtra> = {};
  if (snapshotExtra?.images && snapshotExtra.images.length > 0) out.images = snapshotExtra.images;
  if (snapshotExtra?.vendorCodes && snapshotExtra.vendorCodes.length > 0)
    out.vendorCodes = snapshotExtra.vendorCodes;
  if (snapshotExtra?.techSpecs && snapshotExtra.techSpecs.length > 0)
    out.techSpecs = snapshotExtra.techSpecs;
  return out;
}
