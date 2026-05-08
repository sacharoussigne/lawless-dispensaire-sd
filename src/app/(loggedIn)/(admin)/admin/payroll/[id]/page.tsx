import { redirect } from 'next/navigation';
import { routes } from '@/types/routes';

type PageProps = { params: Promise<{ id: string }> };

export default async function PayrollReportByIdPage({ params }: PageProps) {
  const { id } = await params;
  redirect(routes.employee.payrollDetail(id));
}
