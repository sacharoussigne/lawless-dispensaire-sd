import { getAuthSession } from '@/lib/auth';
import { routes } from '@/types/routes';
import { listAccessibleDispensaries } from '@/lib/dispensary/context';
import { redirect } from 'next/navigation';
import { tenantRoutes } from '@/types/routes';

export default async function Home() {
  const session = await getAuthSession();
  if (!session) {
    redirect(routes.auth.login);
  }

  const accessible = await listAccessibleDispensaries(session);
  if (accessible.length === 0) {
    redirect(routes.auth.noDispensaryAccess);
  }
  redirect(tenantRoutes(accessible[0].slug).employee.index);
}
