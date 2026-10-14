import type { Customer } from '@/types';

function addressKey(address: string | undefined): string {
  return (address ?? '').normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
}

export function fillMapUrlFromCustomer(
  customer: Customer | undefined,
  deliveryAddress: string | undefined,
  googleMapUrl: string | undefined,
): string {
  if (googleMapUrl) return googleMapUrl;
  const key = addressKey(deliveryAddress);
  if (!customer) return '';
  const saved = [
    ...(customer.extra?.shippingAddresses ?? []).map((s) => ({
      address: s.address,
      url: s.googleMapUrl,
    })),
    { address: customer.address, url: customer.extra?.addressGoogleMapUrl },
  ];
  return saved.find((s) => s.url && addressKey(s.address) === key)?.url ?? '';
}
