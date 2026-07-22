import { device } from '@credo/base-ui/utils';
import { SalesOrderConfigErrorBanner } from '@/components/SalesOrderConfigErrorBanner';
import { DeliveryRequestConfigErrorBanner } from '@/components/DeliveryRequestConfigErrorBanner';
import { useInventoryAutoRevalidate } from '@/hooks';
import { useProfileLoadWatchdog } from '@/hooks/useProfileLoadWatchdog';
import { useTokenKeepAlive } from '@/hooks/useTokenKeepAlive';
import { MobileAppLayout } from './MobileAppLayout';
import { PCAppLayout } from './PCAppLayout';

export function AppLayout() {
  
  
  
  useInventoryAutoRevalidate();

  
  
  useProfileLoadWatchdog();

  
  
  
  useTokenKeepAlive();

  return (
    <>
      <SalesOrderConfigErrorBanner />
      <DeliveryRequestConfigErrorBanner />
      {device.isMobile ? <MobileAppLayout /> : <PCAppLayout />}
    </>
  );
}
