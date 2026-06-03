import { redirect } from 'next/navigation';
import { routes } from '@/types/routes';

export default function AdminUsersRedirectPage() {
  redirect(routes.platform.users);
}
