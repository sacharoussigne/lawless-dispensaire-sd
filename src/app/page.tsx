import { getAuthSession } from '@/lib/auth';
import { routes } from '@/types/routes';
import { redirect } from 'next/navigation';

export default async function Home() {
  const session = await getAuthSession();
  if (!session) {
      redirect(routes.auth.login)
  } else {
      redirect(routes.employee.index)
  }
}
