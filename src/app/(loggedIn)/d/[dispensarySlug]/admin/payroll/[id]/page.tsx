import { redirect } from 'next/navigation';
import { tenantRoutes } from '@/types/routes';

type PageProps = { params: Promise<{ dispensarySlug: string; id: string }> };

export default async function PayrollReportByIdPage({ params }: PageProps) {
  const { dispensarySlug, id } = await params;
  redirect(tenantRoutes(dispensarySlug).employee.payrollDetail(id));
}
