import { redirect } from 'next/navigation';
import { routes } from '@/types/routes';

export default async function PayrollReportsPage() {
  redirect(routes.employee.payroll);
}
