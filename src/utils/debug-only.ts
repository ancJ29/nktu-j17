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
  setAppApiGroup('49d092');
  localStorage.setItem(
    '284901473a',
    'fb27d23d5e88c2bc285605359bbe9a7cd8d2ef1b0d2a9d9dae203fc144236e60',
  );
  const hostName = host.split('.')[0];
  localStorage.setItem('__CREDO_SERVICE_CODE__', hostName.replace('-test', ''));
}
