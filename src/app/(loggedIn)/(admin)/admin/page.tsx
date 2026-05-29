import { redirect } from 'next/navigation';
import { routes } from '@/types/routes';

export default function AdminPage() {
  redirect(routes.platform.users);
}
