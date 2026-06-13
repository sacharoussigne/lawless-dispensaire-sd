'use client';

import PayrollReportsList from './PayrollReportsList';
import {
  usePayrollReports,
  type PayrollReportListItem,
} from './hooks/usePayrollQueries';

export default function PayrollReportsPageClient({
  initialReports,
  canDelete,
}: {
  initialReports: PayrollReportListItem[];
  canDelete: boolean;
}) {
  const { data: reports = initialReports, isFetching } = usePayrollReports(initialReports);

  return (
    <PayrollReportsList reports={reports} canDelete={canDelete} isFetching={isFetching} />
  );
}
