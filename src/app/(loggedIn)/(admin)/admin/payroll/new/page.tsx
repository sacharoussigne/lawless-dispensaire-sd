import { redirect } from 'next/navigation';
import { routes } from '@/types/routes';

export default async function PayrollNewPage() {
  redirect(routes.employee.payrollNew);
}
