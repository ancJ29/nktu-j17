import { device } from '@credo/base-ui/utils';
import { SalesOrderConfigErrorBanner } from '@/components/SalesOrderConfigErrorBanner';
import { DeliveryRequestConfigErrorBanner } from '@/components/DeliveryRequestConfigErrorBanner';
import { useInventoryAutoRevalidate, useV2RegisterSync } from '@/hooks';
import { useProfileLoadWatchdog } from '@/hooks/useProfileLoadWatchdog';
import { MobileAppLayout } from './MobileAppLayout';
import { PCAppLayout } from './PCAppLayout';

export function AppLayout() {
  useInventoryAutoRevalidate();

  useV2RegisterSync();

  useProfileLoadWatchdog();

  return (
    <>
      <SalesOrderConfigErrorBanner />
      <DeliveryRequestConfigErrorBanner />
      {device.isMobile ? <MobileAppLayout /> : <PCAppLayout />}
    </>
  );
}
