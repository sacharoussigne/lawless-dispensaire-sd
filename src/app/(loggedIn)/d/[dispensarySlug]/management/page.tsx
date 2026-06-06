import { tenantRoutes } from '@/types/routes';
import { Container, SimpleGrid } from '@mantine/core';
import {
  IconArchive,
  IconBottle,
  IconBuildingStore,
  IconSettings,
  IconTags,
  IconClipboardText,
  IconUsers,
} from '@tabler/icons-react';
import { getAuthSession } from '@/lib/auth';
import { hasRole } from '@/lib/auth/permissions';
import { Role } from '@/types/enum/roles';
import { dispensarySiteTitle, getAppSettings } from '@/lib/appSettings';
import { requireDispensaryFromSlug } from '@/lib/dispensary/context';
import { ModuleCard, type ModuleCardProps } from '@/app/_components/ModuleCard/ModuleCard';
import { PageHeader } from '@/app/_components/PageHeader/PageHeader';

export default async function ManagementPage({
  params,
}: {
  params: Promise<{ dispensarySlug: string }>;
}) {
  const { dispensarySlug } = await params;
  const dispensary = await requireDispensaryFromSlug(dispensarySlug);
  const t = tenantRoutes(dispensarySlug);
  const session = await getAuthSession();
  const settings = await getAppSettings(dispensary.id);
  const showAdminSettings = hasRole(session?.user?.role, Role.ADMIN);
  const siteTitle = dispensarySiteTitle(settings);

  const managementSections: (ModuleCardProps & { visible: boolean })[] = [
    {
      title: "Catégories d'objets",
      description:
        "Organisez les objets par catégories pour avoir un stock plus clair et structuré.",
      icon: IconTags,
      href: t.management.categoryItems,
      visible: true,
    },
    {
      title: 'Objets',
      description:
        "Créez et mettez à jour les objets disponibles dans le stock, leurs paramètres et options.",
      icon: IconBottle,
      href: t.management.items,
      visible: true,
    },
    {
      title: 'Coffres',
      description:
        'Configurez les coffres de stockage, leur ordre et leur organisation physique.',
      icon: IconArchive,
      href: t.management.chests,
      visible: true,
    },
    {
      title: "Groupes d'entreprises",
      description:
        "Regroupez les entreprises par structure pour simplifier le suivi et les conventions.",
      icon: IconUsers,
      href: t.management.companyGroups,
      visible: true,
    },
    {
      title: 'Entreprises',
      description:
        "Gérez les entreprises partenaires, leurs coordonnées et informations de contact.",
      icon: IconBuildingStore,
      href: t.management.companies,
      visible: true,
    },
    {
      title: 'Courriers',
      description:
        'Gérez les courriers utilisés pour les entreprises et le suivi administratif.',
      icon: IconClipboardText,
      href: t.management.mails,
      visible: settings.featureMailsEnabled,
    },
  ];

  const visibleSections = managementSections.filter((s) => s.visible);

  return (
    <Container size="xl" py="xl">
      <PageHeader
        title="Espace gestion"
        description={`Retrouvez ici toutes les actions de configuration et d’administration du ${siteTitle}.`}
      />

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
        {visibleSections.map(({ visible: _visible, ...section }) => (
          <ModuleCard key={section.title} {...section} />
        ))}
        {showAdminSettings && (
          <ModuleCard
            title="Paramètres application"
            description="Nom du site, activation des modules employés (stock, banque, etc.)."
            icon={IconSettings}
            href={t.admin.settings}
          />
        )}
      </SimpleGrid>
    </Container>
  );
}
