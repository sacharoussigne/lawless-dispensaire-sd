import { routes } from '@/types/routes';
import { Button, Card, Container, Group, SimpleGrid, Text, Title } from '@mantine/core';
import {
  IconBuildingSkyscraper,
  IconCategory2,
  IconClipboardText,
  IconInbox,
  IconLayoutGrid,
  IconSettings,
  IconUsersGroup,
} from '@tabler/icons-react';
import { getAuthSession } from '@/lib/auth';
import { hasRole } from '@/lib/auth/permissions';
import { Role } from '@/types/enum/roles';
import { dispensarySiteTitle, getAppSettings } from '@/lib/appSettings';

const managementSections = [
  {
    title: "Catégories d'objets",
    description:
      "Organisez les objets par catégories pour avoir un stock plus clair et structuré.",
    icon: IconCategory2,
    href: routes.management.categoryItems,
    color: 'teal',
  },
  {
    title: 'Objets',
    description:
      "Créez et mettez à jour les objets disponibles dans le stock, leurs paramètres et options.",
    icon: IconLayoutGrid,
    href: routes.management.items,
    color: 'grape',
  },
  {
    title: 'Coffres',
    description:
      'Configurez les coffres de stockage, leur ordre et leur organisation physique.',
    icon: IconInbox,
    href: routes.management.chests,
    color: 'orange',
  },
  {
    title: "Groupes d'entreprises",
    description:
      "Regroupez les entreprises par structure pour simplifier le suivi et les conventions.",
    icon: IconUsersGroup,
    href: routes.management.companyGroups,
    color: 'indigo',
  },
  {
    title: "Entreprises",
    description:
      "Gérez les entreprises partenaires, leurs coordonnées et informations de contact.",
    icon: IconBuildingSkyscraper,
    href: routes.management.companies,
    color: 'blue',
  },
  {
    title: 'Courriers',
    description:
      'Gérez les courriers utilisés pour les entreprises et le suivi administratif.',
    icon: IconClipboardText,
    href: routes.management.mails,
    color: 'violet',
  },
] as const;

export default async function ManagementPage() {
  const session = await getAuthSession();
  const settings = await getAppSettings();
  const showAdminSettings = hasRole(session?.user?.role, Role.ADMIN);
  const siteTitle = dispensarySiteTitle(settings);

  const visibleSections = managementSections.filter(
    (s) => s.href !== routes.management.mails || settings.featureMailsEnabled,
  );

  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={1}>Espace gestion</Title>
          <Text c="dimmed" mt="xs">
            Retrouvez ici toutes les actions de configuration et d’administration
            du {siteTitle}.
          </Text>
        </div>
      </Group>

      <SimpleGrid
        cols={{ base: 1, sm: 2, lg: 3 }}
        spacing="lg"
      >
        {visibleSections.map((section) => {
          const Icon = section.icon;
          return (
            <Card
              key={section.title}
              withBorder
              shadow="sm"
              radius="md"
              padding="lg"
            >
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
        {showAdminSettings && (
          <Card
            key="admin-app-settings"
            withBorder
            shadow="sm"
            radius="md"
            padding="lg"
          >
            <Group mb="md" align="flex-start">
              <div className="rounded-full p-2" style={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
                <IconSettings size={24} stroke={1.8} />
              </div>
              <div>
                <Text fw={600}>Paramètres application</Text>
                <Text size="sm" c="dimmed" mt={4}>
                  Nom du site, activation des modules employés (stock, banque, etc.).
                </Text>
              </div>
            </Group>

            <Group justify="flex-end" mt="md">
              <Button
                component="a"
                href={routes.admin.settings}
                variant="light"
                color="gray"
              >
                Accéder
              </Button>
            </Group>
          </Card>
        )}
      </SimpleGrid>
    </Container>
  );
}
