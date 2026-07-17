import { device } from '@credo/base-ui/utils';
import { MobileDetailLayout } from './MobileDetailLayout';
import { PCAppLayout } from './PCAppLayout';

export function AppDetailLayout() {
  if (device.isMobile) {
    return <MobileDetailLayout />;
  }

  return <PCAppLayout />;
}
