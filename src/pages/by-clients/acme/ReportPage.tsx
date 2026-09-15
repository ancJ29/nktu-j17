import ReportsShell from '@/pages/v2/reports/ReportsShell';
import { ACME_REPORTS } from './reports/list';

export default function AcmeReportPage() {
  return <ReportsShell entries={ACME_REPORTS} />;
}
