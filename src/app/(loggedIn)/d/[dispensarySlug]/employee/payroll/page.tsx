import { Container, Group, Text, Title } from '@mantine/core';
import { redirect } from 'next/navigation';
import { listPayrollReports } from '@/app/_actions/payrollReports';
import { getAuthSession } from '@/lib/auth';
import { checkRolePermission } from '@/lib/auth/permissions';
import { getEffectiveRoleForDispensary, requireDispensaryFromSlug } from '@/lib/dispensary/context';
import { getDataOrThrow } from '@/lib/response';
import type { AuthSession } from '@/types/session';
import { routes } from '@/types/routes';
import PayrollNewReportButton from './PayrollNewReportButton';
import PayrollReportsPageClient from './PayrollReportsPageClient';

export default async function PayrollReportsPage({ params }: { params: Promise<{ dispensarySlug: string }> }) {
  const { dispensarySlug } = await params;
  const dispensary = await requireDispensaryFromSlug(dispensarySlug);
  const session = await getAuthSession();
  if (!session?.user) {
    redirect(routes.auth.login);
  }

  const effectiveRole = await getEffectiveRoleForDispensary(session as AuthSession, dispensary.id);
  if (!checkRolePermission(effectiveRole, 'payroll_reports', 'view')) {
    redirect(routes.auth.noManagementAccess);
  }

  const canCreate = checkRolePermission(effectiveRole, 'payroll_reports', 'create');

  const result = await listPayrollReports(dispensarySlug);
  const { reports } = getDataOrThrow(result, 'Erreur lors du chargement des rapports salaires');

  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" mb="xl" align="flex-start">
        <div>
          <Title order={1}>Rapports salaires hebdomadaires</Title>
          <Text c="dimmed" mt="xs">
            Historique des analyses de présences et caisses, avec montants pour virements.
          </Text>
        </div>
        {canCreate && <PayrollNewReportButton />}
      </Group>
      <PayrollReportsPageClient initialReports={reports} canDelete={canCreate} />
    </Container>
  );
}
