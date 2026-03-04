import { redirect } from 'next/navigation';
import { routes } from '@/types/routes';

export default function ManagementPage() {
  redirect(routes.management.companies);
}
