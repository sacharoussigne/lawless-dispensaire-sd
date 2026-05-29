import { Container, Title } from '@mantine/core';
import { redirect } from 'next/navigation';
import { getAuthSession } from '@/lib/auth';
import { checkRolePermission } from '@/lib/auth/permissions';
import { getAppSettings } from '@/lib/appSettings';
import { routes } from '@/types/routes';
import StockStatisticsPageClient from './StockStatisticsPageClient';

export default async function StockStatisticsPage() {
  const session = await getAuthSession();
  if (!session?.user) {
    redirect(routes.auth.login);
  }

  const appSettings = await getAppSettings();
  if (!appSettings.featureStockEnabled) {
    redirect(routes.employee.index);
  }

  if (!checkRolePermission(session.user.role, 'stock_statistics', 'view')) {
    redirect(routes.auth.noManagementAccess);
  }

  return (
    <Container size="xl" py="xl">
      <Title order={1} mb="xl">
        Statistiques de stock
      </Title>
      <StockStatisticsPageClient />
    </Container>
  );
}
