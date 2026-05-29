import { Container, Title } from '@mantine/core';
import { redirect } from 'next/navigation';
import { getAuthSession } from '@/lib/auth';
import { checkRolePermission } from '@/lib/auth/permissions';
import { requireDispensaryFromSlug } from '@/lib/dispensary/context';
import { getAppSettings } from '@/lib/appSettings';
import { routes, tenantRoutes } from '@/types/routes';
import StockStatisticsPageClient from './StockStatisticsPageClient';

export default async function StockStatisticsPage({ params }: { params: Promise<{ dispensarySlug: string }> }) {
  const { dispensarySlug } = await params;
  const dispensary = await requireDispensaryFromSlug(dispensarySlug);
  const session = await getAuthSession();
  if (!session?.user) {
    redirect(routes.auth.login);
  }

  const appSettings = await getAppSettings(dispensary.id);
  if (!appSettings.featureStockEnabled) {
    redirect(tenantRoutes(dispensarySlug).employee.index);
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
