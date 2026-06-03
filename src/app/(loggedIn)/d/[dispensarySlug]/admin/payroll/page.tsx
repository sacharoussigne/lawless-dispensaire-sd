import { redirect } from 'next/navigation';
import { tenantRoutes } from '@/types/routes';

export default async function PayrollReportsPage({ params }: { params: Promise<{ dispensarySlug: string }> }) {
  const { dispensarySlug } = await params;
  const t = tenantRoutes(dispensarySlug);
  redirect(t.employee.payroll);
}
