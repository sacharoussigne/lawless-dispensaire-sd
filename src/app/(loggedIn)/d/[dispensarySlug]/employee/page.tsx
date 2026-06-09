import { tenantRoutes } from '@/types/routes';
import { Container, SimpleGrid } from '@mantine/core';
import {
  IconAbacus,
  IconArchive,
  IconCalendarEvent,
  IconCalendarWeek,
  IconCashRegister,
  IconMail,
  IconNotebook,
  IconReportMoney,
  IconStethoscope,
} from '@tabler/icons-react';
import { getAuthSession } from '@/lib/auth';
import { calculatePermissions } from '@/lib/auth/calculatePermissions';
import { checkRolePermission } from '@/lib/auth/permissions';
import { dispensarySiteTitle, getAppSettings } from '@/lib/appSettings';
import type { AuthSession } from '@/types/session';
import { getEffectiveRoleForDispensary, requireDispensaryFromSlug } from '@/lib/dispensary/context';
import { userHasAnyAgendaAccess } from '@/lib/agenda/access';
import { isPlatformAdmin } from '@/lib/dispensary/platformAdmin';
import { hasRole } from '@/lib/auth/permissions';
import { Role } from '@/types/enum/roles';
import { ModuleCard, type ModuleCardProps } from '@/app/_components/ModuleCard/ModuleCard';
import { PageHeader } from '@/app/_components/PageHeader/PageHeader';

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
  const userId = session?.user?.id;
  const agendaModuleAccess = userId
    ? await userHasAnyAgendaAccess(
        dispensary.id,
        userId,
        session.user.role,
        effectiveRole,
      ) ||
      isPlatformAdmin(session.user.role) ||
      hasRole(effectiveRole, Role.ADMIN)
    : false;

  const employeeSections: (ModuleCardProps & { hasAccess: boolean })[] = [
    {
      title: 'Stock',
      description:
        'Consultez et gérez le stock des objets disponibles dans les différents coffres.',
      icon: IconArchive,
      href: t.stock.index,
      hasAccess: appSettings.featureStockEnabled && (permissions?.stock.view ?? false),
    },
    {
      title: 'Commandes',
      description: 'Gérez les commandes passées aux entreprises et suivez leur statut.',
      icon: IconNotebook,
      href: t.orders.index,
      hasAccess: appSettings.featureOrdersEnabled && (permissions?.orders.view ?? false),
    },
    {
      title: 'Banque',
      description: 'Suivez les comptes bancaires et les transactions hebdomadaires.',
      icon: IconCashRegister,
      href: t.bank.index,
      hasAccess:
        appSettings.featureBankEnabled && checkRolePermission(effectiveRole, 'bank', 'access'),
    },
    {
      title: 'Cabinet privé',
      description: 'Gérez les consultations et patients du cabinet privé.',
      icon: IconStethoscope,
      href: t.privatePractice.index,
      hasAccess:
        appSettings.featurePrivatePracticeEnabled &&
        checkRolePermission(effectiveRole, 'private_practice', 'access'),
    },
    {
      title: 'Courriers',
      description: 'Rédigez et gérez les courriers et modèles.',
      icon: IconMail,
      href: t.employee.mails,
      hasAccess: appSettings.featureMailsEnabled && checkRolePermission(effectiveRole, 'mails', 'access'),
    },
    {
      title: 'Salaires',
      description: 'Consultez les rapports de paie hebdomadaires.',
      icon: IconReportMoney,
      href: t.employee.payroll,
      hasAccess: appSettings.featurePayrollEnabled && (permissions?.payrollReports.view ?? false),
    },
    {
      title: 'Agenda',
      description: 'Calendrier partagé et listes de tâches de l\'organisation.',
      icon: IconCalendarEvent,
      href: t.agenda.index,
      hasAccess: appSettings.featureAgendaEnabled && agendaModuleAccess,
    },
    {
      title: 'Activité hebdo',
      description: 'Suivez l’activité hebdomadaire du dispensaire.',
      icon: IconCalendarWeek,
      href: t.weeklyActivity.index,
      hasAccess:
        appSettings.featureWeeklyDispensaryActivityEnabled &&
        (permissions?.weeklyDispensaryActivity.view ?? false),
    },
    {
      title: 'Stats stock',
      description: 'Visualisez les statistiques de stock.',
      icon: IconAbacus,
      href: t.employee.stockStatistics,
      hasAccess: appSettings.featureStockEnabled && (permissions?.stockStatistics.view ?? false),
    },
  ];

  const visibleSections = employeeSections.filter((s) => s.hasAccess);

  return (
    <Container size="xl" py="xl">
      <PageHeader
        title="Espace employé"
        description={`Retrouvez ici les outils du quotidien pour le ${siteTitle}.`}
      />

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
        {visibleSections.map(({ hasAccess: _access, ...section }) => (
          <ModuleCard key={section.title} {...section} />
        ))}
      </SimpleGrid>
    </Container>
  );
}
