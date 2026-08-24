import { isInternal } from '@/config/env';
import { setAppApiGroup } from '@/config/env';
import { compareEnvVar } from '@credo/kits/misc';

const enable = compareEnvVar('__DEBUG_CODE__', 'd92ac588f3b0');
if (enable) {
  console.log('debug-only enabled');
  console.log(JSON.stringify(import.meta.env, null, 2));
}

const host = window.location.hostname.toLowerCase();

if (isInternal && host.includes('-test.internal.cr3do.dev')) {
  setAppApiGroup('49a092');
  const hostName = host.split('.')[0];
  localStorage.setItem('__CREDO_SERVICE_CODE__', hostName.replace('-test', ''));
}
