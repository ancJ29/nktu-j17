import { CustomerV2Link } from './CustomerV2Link';
import { DeliveryNoteV2Link } from './DeliveryNoteV2Link';
import { MaterialV2Link } from './MaterialV2Link';
import { ProductV2Link } from './ProductV2Link';
import { SalesOrderV2Link } from './SalesOrderV2Link';
import { VendorV2Link } from './VendorV2Link';
import type { EntityLinkV2Props } from './entityLinkV2';

export type EntityTypeV2 =
  | 'product-v2'
  | 'material-v2'
  | 'vendor-v2'
  | 'customer-v2'
  | 'sales-order-v2'
  | 'delivery-note-v2';

const BY_TYPE = {
  'product-v2': ProductV2Link,
  'material-v2': MaterialV2Link,
  'vendor-v2': VendorV2Link,
  'customer-v2': CustomerV2Link,
  'sales-order-v2': SalesOrderV2Link,
  'delivery-note-v2': DeliveryNoteV2Link,
} as const satisfies Record<EntityTypeV2, unknown>;

export function ComponentLinkV2({ type, ...props }: EntityLinkV2Props & { type: EntityTypeV2 }) {
  const Link = BY_TYPE[type];
  return <Link {...props} />;
}
