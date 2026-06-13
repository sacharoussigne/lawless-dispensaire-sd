import { notFound, redirect } from 'next/navigation';
import { getPayrollReportById } from '@/app/_actions/payrollReports';
import { getAuthSession } from '@/lib/auth';
import { checkRolePermission } from '@/lib/auth/permissions';
import { getEffectiveRoleForDispensary, requireDispensaryFromSlug } from '@/lib/dispensary/context';
import type { AuthSession } from '@/types/session';
import { routes } from '@/types/routes';
import PayrollReportDetailPageClient from './PayrollReportDetailPageClient';

type PageProps = { params: Promise<{ dispensarySlug: string; id: string }> };

export default async function PayrollReportByIdPage({ params }: PageProps) {
  const { dispensarySlug, id } = await params;
  const dispensary = await requireDispensaryFromSlug(dispensarySlug);
  const session = await getAuthSession();
  if (!session?.user) {
    redirect(routes.auth.login);
  }

  const effectiveRole = await getEffectiveRoleForDispensary(session as AuthSession, dispensary.id);
  if (!checkRolePermission(effectiveRole, 'payroll_reports', 'view')) {
    redirect(routes.auth.noManagementAccess);
  }

  const canDelete = checkRolePermission(effectiveRole, 'payroll_reports', 'create');

  const result = await getPayrollReportById(dispensarySlug, id);
  if (result.status === 404) {
    notFound();
  }
  if (result.status !== 200 || !('data' in result)) {
    throw new Error('Erreur lors du chargement du rapport');
  }

  return (
    <PayrollReportDetailPageClient
      reportId={id}
      initialReport={result.data.report}
      canDelete={canDelete}
      canEdit={canDelete}
    />
  );
}
