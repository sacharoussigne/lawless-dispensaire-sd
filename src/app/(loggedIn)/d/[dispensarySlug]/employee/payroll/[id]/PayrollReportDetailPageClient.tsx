'use client';

import PayrollReportDetail from './PayrollReportDetail';
import {
  usePayrollReportDetail,
  type PayrollReportDetail as PayrollReportDetailType,
} from '../hooks/usePayrollQueries';

export default function PayrollReportDetailPageClient({
  reportId,
  initialReport,
  canDelete,
  canEdit,
}: {
  reportId: string;
  initialReport: PayrollReportDetailType;
  canDelete: boolean;
  canEdit: boolean;
}) {
  const { data: report = initialReport } = usePayrollReportDetail(reportId, initialReport);

  return <PayrollReportDetail reportId={reportId} report={report} canDelete={canDelete} canEdit={canEdit} />;
}
