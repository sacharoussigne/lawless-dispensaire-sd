import { Container, Group, Text, Title } from '@mantine/core';
import { redirect } from 'next/navigation';
import { getAuthSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { checkRolePermission } from '@/lib/auth/permissions';
import { routes } from '@/types/routes';
import PayrollNewReportButton from './PayrollNewReportButton';
import PayrollReportsList from './PayrollReportsList';

export default async function PayrollReportsPage({ params }: { params: Promise<{ dispensarySlug: string }> }) {
  const session = await getAuthSession();
  if (!session?.user) {
    redirect(routes.auth.login);
  }
  if (!checkRolePermission(session.user.role, 'payroll_reports', 'view')) {
    redirect(routes.auth.noManagementAccess);
  }

  const canCreate = checkRolePermission(session.user.role, 'payroll_reports', 'create');

  const rows = await prisma.payrollWeeklyReport.findMany({
    orderBy: [{ weekStart: 'desc' }, { reportType: 'asc' }],
    take: 100,
    select: {
      id: true,
      weekStart: true,
      weekEnd: true,
      reportType: true,
      createdAt: true,
      createdBy: { select: { name: true, id: true } },
    },
  });

  const reports = rows.map((r) => ({
    id: r.id,
    weekStart: r.weekStart.toISOString(),
    weekEnd: r.weekEnd.toISOString(),
    reportType: r.reportType,
    createdAt: r.createdAt.toISOString(),
    createdBy: r.createdBy,
  }));

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
      <PayrollReportsList reports={reports} canDelete={canCreate} />
    </Container>
  );
}

