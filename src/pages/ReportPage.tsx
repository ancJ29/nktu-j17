import { lazy } from 'react';
import { resolveClientCode } from '@/config/client-code';

const clientCode = resolveClientCode();

const ReportPageDefault = lazy(() => import('./by-clients/default/ReportPage'));
const ReportPageNKTU = lazy(() => import('./by-clients/nktu/ReportPage'));
const ReportPageAcme = lazy(() => import('./by-clients/acme/ReportPage'));

export default function ReportPage() {
  switch (clientCode) {
    case 'nktu':
      return <ReportPageNKTU />;
    case 'acme':
      return <ReportPageAcme />;
    default:
      return <ReportPageDefault />;
  }
}
