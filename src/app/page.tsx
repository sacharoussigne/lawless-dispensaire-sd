import { getAuthSession } from '@/lib/auth';
import { routes } from '@/types/routes';
import { DEFAULT_DISPENSARY_SLUG } from '@/lib/dispensary/constants';
import { listAccessibleDispensaries } from '@/lib/dispensary/context';
import { redirect } from 'next/navigation';
import { tenantRoutes } from '@/types/routes';

export default async function Home() {
  const session = await getAuthSession();
  if (!session) {
    redirect(routes.auth.login);
  }

  const accessible = await listAccessibleDispensaries(session);
  const slug = accessible[0]?.slug ?? DEFAULT_DISPENSARY_SLUG;
  redirect(tenantRoutes(slug).employee.index);
}
