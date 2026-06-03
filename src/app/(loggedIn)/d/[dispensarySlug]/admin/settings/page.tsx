import { redirect } from 'next/navigation';
import { getAppSettingsForAdmin } from '@/app/_actions/appSettings';
import AppSettingsPageClient from './AppSettingsPageClient';
import { routes } from '@/types/routes';

export default async function AdminAppSettingsPage({ params }: { params: Promise<{ dispensarySlug: string }> }) {
  const { dispensarySlug } = await params;
  const result = await getAppSettingsForAdmin(dispensarySlug);

  if (result.status === 401) {
    redirect(routes.auth.login);
  }
  if (result.status === 403) {
    redirect(routes.auth.noManagementAccess);
  }
  if (result.status !== 200 || !('data' in result)) {
    redirect(routes.auth.noManagementAccess);
  }

  return <AppSettingsPageClient dispensarySlug={dispensarySlug} initial={result.data} />;
}
