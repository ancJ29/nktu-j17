import { lazy } from 'react';
import { resolveClientCode } from '@/config/client-code';

const clientCode = resolveClientCode();

const ReportPageDefault = lazy(() => import('./by-clients/default/ReportPage'));
const ReportPageNKTU = lazy(() => import('./by-clients/nktu/ReportPage'));

export default function ReportPage() {
  switch (clientCode) {
    case 'nktu':
      return <ReportPageNKTU />;
    default:
      return <ReportPageDefault />;
  }
}
