import { tenantRoutes } from '@/types/routes';
import { Button, Card, Container, Group, SimpleGrid, Text, Title } from '@mantine/core';
import {
  IconBox,
  IconClipboardList,
  IconBuildingBank,
  IconUserHeart,
  IconMail,
  IconReportMoney,
  IconHeartbeat,
  IconChartBar,
} from '@tabler/icons-react';
import { getAuthSession } from '@/lib/auth';
import { calculatePermissions } from '@/lib/auth/calculatePermissions';
import { checkRolePermission } from '@/lib/auth/permissions';
import { dispensarySiteTitle, getAppSettings } from '@/lib/appSettings';
import type { AuthSession } from '@/types/session';
import { getEffectiveRoleForDispensary, requireDispensaryFromSlug } from '@/lib/dispensary/context';

export default async function EmployeePage({
  params,
}: {
  params: Promise<{ dispensarySlug: string }>;
}) {
  const { dispensarySlug } = await params;
  const dispensary = await requireDispensaryFromSlug(dispensarySlug);
  const session = await getAuthSession();
  const effectiveRole = await getEffectiveRoleForDispensary(session as AuthSession | null, dispensary.id);
  const permissions = calculatePermissions(effectiveRole);
  const appSettings = await getAppSettings(dispensary.id);
  const t = tenantRoutes(dispensarySlug);
  const siteTitle = dispensarySiteTitle(appSettings);

  const employeeSections = [
    {
      title: 'Stock',
      description:
        'Consultez et gérez le stock des objets disponibles dans les différents coffres.',
      icon: IconBox,
      href: t.stock.index,
      hasAccess: appSettings.featureStockEnabled && (permissions?.stock.view ?? false),
      color: 'blue',
    },
    {
      title: 'Commandes',
      description: 'Gérez les commandes passées aux entreprises et suivez leur statut.',
      icon: IconClipboardList,
      href: t.orders.index,
      hasAccess: appSettings.featureOrdersEnabled && (permissions?.orders.view ?? false),
      color: 'grape',
    },
    {
      title: 'Banque',
      description: 'Suivez les comptes bancaires et les transactions hebdomadaires.',
      icon: IconBuildingBank,
      href: t.bank.index,
      hasAccess:
        appSettings.featureBankEnabled && checkRolePermission(effectiveRole, 'bank', 'access'),
      color: 'teal',
    },
    {
      title: 'Cabinet privé',
      description: 'Gérez les consultations et patients du cabinet privé.',
      icon: IconUserHeart,
      href: t.privatePractice.index,
      hasAccess:
        appSettings.featurePrivatePracticeEnabled &&
        checkRolePermission(effectiveRole, 'private_practice', 'access'),
      color: 'pink',
    },
    {
      title: 'Courriers',
      description: 'Rédigez et gérez les courriers et modèles.',
      icon: IconMail,
      href: t.employee.mails,
      hasAccess: appSettings.featureMailsEnabled && checkRolePermission(effectiveRole, 'mails', 'access'),
      color: 'orange',
    },
    {
      title: 'Salaires',
      description: 'Consultez les rapports de paie hebdomadaires.',
      icon: IconReportMoney,
      href: t.employee.payroll,
      hasAccess: appSettings.featurePayrollEnabled && (permissions?.payrollReports.view ?? false),
      color: 'yellow',
    },
    {
      title: 'Activité hebdo',
      description: 'Suivez l’activité hebdomadaire du dispensaire.',
      icon: IconHeartbeat,
      href: t.weeklyActivity.index,
      hasAccess:
        appSettings.featureWeeklyDispensaryActivityEnabled &&
        (permissions?.weeklyDispensaryActivity.view ?? false),
      color: 'red',
    },
    {
      title: 'Stats stock',
      description: 'Visualisez les statistiques de stock.',
      icon: IconChartBar,
      href: t.employee.stockStatistics,
      hasAccess: appSettings.featureStockEnabled && (permissions?.stockStatistics.view ?? false),
      color: 'cyan',
    },
  ] as const;

  const visibleSections = employeeSections.filter((s) => s.hasAccess);

  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={1}>Espace employé</Title>
          <Text c="dimmed" mt="xs">
            Retrouvez ici les outils du quotidien pour le {siteTitle}.
          </Text>
        </div>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
        {visibleSections.map((section) => {
          const Icon = section.icon;
          return (
            <Card key={section.title} withBorder shadow="sm" radius="md" padding="lg">
              <Group mb="md" align="flex-start">
                <div className="rounded-full p-2" style={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
                  <Icon size={24} stroke={1.8} />
                </div>
                <div>
                  <Text fw={600}>{section.title}</Text>
                  <Text size="sm" c="dimmed" mt={4}>
                    {section.description}
                  </Text>
                </div>
              </Group>

              <Group justify="flex-end" mt="md">
                <Button
                  component="a"
                  href={section.href}
                  variant="light"
                  color={section.color}
                >
                  Accéder
                </Button>
              </Group>
            </Card>
          );
        })}
      </SimpleGrid>
    </Container>
  );
}
