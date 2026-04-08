import { Button, Container, Group, Title } from '@mantine/core';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { IconPlus } from '@tabler/icons-react';
import { getAuthSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { checkRolePermission } from '@/lib/auth/permissions';
import { routes } from '@/types/routes';
import PayrollReportsList from './PayrollReportsList';

export default async function PayrollReportsPage() {
  const session = await getAuthSession();
  if (!session?.user) {
    redirect(routes.auth.login);
  }
  if (!checkRolePermission(session.user.role, 'payroll_reports', 'view')) {
    redirect(routes.auth.noManagementAccess);
  }

  const canCreate = checkRolePermission(session.user.role, 'payroll_reports', 'create');

  const rows = await prisma.payrollWeeklyReport.findMany({
    orderBy: { weekStart: 'desc' },
    take: 100,
    select: {
      id: true,
      weekStart: true,
      weekEnd: true,
      createdAt: true,
      createdBy: { select: { name: true, id: true } },
    },
  });

  const reports = rows.map((r) => ({
    id: r.id,
    weekStart: r.weekStart.toISOString(),
    weekEnd: r.weekEnd.toISOString(),
    createdAt: r.createdAt.toISOString(),
    createdBy: r.createdBy,
  }));

  return (
    <Container size="xl">
      <Group justify="space-between" mb="lg">
        <Title order={2}>Rapports salaires hebdomadaires</Title>
        {canCreate && (
          <Link href={`${routes.admin.payroll}/new`} style={{ textDecoration: 'none' }}>
            <Button leftSection={<IconPlus size={18} />}>Nouveau rapport</Button>
          </Link>
        )}
      </Group>
      <PayrollReportsList reports={reports} canDelete={canCreate} />
    </Container>
  );
}
