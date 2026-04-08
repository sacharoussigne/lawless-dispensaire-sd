import { redirect } from 'next/navigation';
import { getAuthSession } from '@/lib/auth';
import { checkRolePermission } from '@/lib/auth/permissions';
import { routes } from '@/types/routes';
import PayrollNewPageClient from './PayrollNewPageClient';

export default async function PayrollNewPage() {
  const session = await getAuthSession();
  if (!session?.user) {
    redirect(routes.auth.login);
  }
  if (!checkRolePermission(session.user.role, 'payroll_reports', 'create')) {
    redirect(routes.auth.noManagementAccess);
  }

  return <PayrollNewPageClient />;
}
