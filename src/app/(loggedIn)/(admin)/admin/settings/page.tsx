import { redirect } from 'next/navigation';
import { getAppSettingsForAdmin } from '@/app/_actions/appSettings';
import AppSettingsPageClient from './AppSettingsPageClient';
import { routes } from '@/types/routes';

export default async function AdminAppSettingsPage() {
  const result = await getAppSettingsForAdmin();

  if (result.status === 401) {
    redirect(routes.auth.login);
  }
  if (result.status === 403) {
    redirect(routes.auth.noManagementAccess);
  }
  if (result.status !== 200 || !('data' in result)) {
    redirect(routes.auth.noManagementAccess);
  }

  return <AppSettingsPageClient initial={result.data} />;
}
