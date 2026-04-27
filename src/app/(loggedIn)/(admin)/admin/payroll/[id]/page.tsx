import { notFound, redirect } from 'next/navigation';
import { getAuthSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { checkRolePermission } from '@/lib/auth/permissions';
import { routes } from '@/types/routes';
import PayrollReportDetail from './PayrollReportDetail';

type PageProps = { params: Promise<{ id: string }> };

export default async function PayrollReportByIdPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getAuthSession();
  if (!session?.user) {
    redirect(routes.auth.login);
  }
  if (!checkRolePermission(session.user.role, 'payroll_reports', 'view')) {
    redirect(routes.auth.noManagementAccess);
  }

  const canDelete = checkRolePermission(session.user.role, 'payroll_reports', 'create');

  const report = await prisma.payrollWeeklyReport.findUnique({
    where: { id },
    include: { createdBy: { select: { name: true, email: true } } },
  });

  if (!report) {
    notFound();
  }

  return (
    <PayrollReportDetail
      canDelete={canDelete}
      canEdit={canDelete}
      report={{
        id: report.id,
        weekStart: report.weekStart.toISOString(),
        weekEnd: report.weekEnd.toISOString(),
        reportType: report.reportType,
        resultJson: report.resultJson,
        errorMessage: report.errorMessage,
        createdAt: report.createdAt.toISOString(),
        createdBy: report.createdBy,
      }}
    />
  );
}
