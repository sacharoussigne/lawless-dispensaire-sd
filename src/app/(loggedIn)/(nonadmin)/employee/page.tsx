import { routes } from '@/types/routes';
import { Button, Card, Container, Group, SimpleGrid, Text, Title } from '@mantine/core';
import {
  IconBox,
  IconClipboardList,
  IconSearch,
  IconBuildingBank,
  IconUserHeart,
  IconMail,
} from '@tabler/icons-react';
import { getAuthSession } from '@/lib/auth';
import { calculatePermissions } from '@/lib/auth/calculatePermissions';
import { checkRolePermission } from '@/lib/auth/permissions';
import { getAppSettings } from '@/lib/appSettings';

export default async function EmployeePage() {
  const session = await getAuthSession();
  const role = session?.user?.role || null;
  const permissions = calculatePermissions(role);
  const appSettings = await getAppSettings();

  const employeeSections = [
    {
      title: 'Stock',
      description:
        'Consultez et gérez le stock des objets disponibles dans les différents coffres.',
      icon: IconBox,
      href: routes.stock.index,
      hasAccess:
        appSettings.featureStockEnabled && (permissions?.stock.view ?? false),
      color: 'blue',
    },
    {
      title: 'Commandes',
      description:
        'Gérez les commandes passées aux entreprises et suivez leur statut.',
      icon: IconClipboardList,
      href: routes.orders.index,
      hasAccess:
        appSettings.featureOrdersEnabled && (permissions?.orders.view ?? false),
      color: 'green',
    },
    {
      title: 'Recherche',
      description:
        'Recherchez rapidement des objets dans le système avec des filtres avancés.',
      icon: IconSearch,
      href: routes.searchItems.index,
      hasAccess:
        appSettings.featureSearchEnabled &&
        checkRolePermission(role, 'search', 'access'),
      color: 'orange',
    },
    {
      title: 'Banque',
      description:
        'Consultez et gérez les comptes bancaires et les transactions financières.',
      icon: IconBuildingBank,
      href: routes.bank.index,
      hasAccess:
        appSettings.featureBankEnabled &&
        checkRolePermission(role, 'bank', 'access'),
      color: 'violet',
    },
    {
      title: 'Cabinet privé',
      description:
        'Accédez à l\'espace dédié au cabinet privé et à ses fonctionnalités spécifiques.',
      icon: IconUserHeart,
      href: routes.privatePractice.index,
      hasAccess:
        appSettings.featurePrivatePracticeEnabled &&
        checkRolePermission(role, 'private_practice', 'access'),
      color: 'pink',
    },
    {
      title: 'Courriers',
      description:
        'Gérez vos courriers envoyés et créez des modèles de courriers personnalisés.',
      icon: IconMail,
      href: routes.employee.mails,
      hasAccess:
        appSettings.featureMailsEnabled &&
        checkRolePermission(role, 'mails', 'access'),
      color: 'violet',
    },
  ] as const;

  const availableSections = employeeSections.filter((section) => section.hasAccess);

  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={1}>Espace employé</Title>
          <Text c="dimmed" mt="xs">
            Retrouvez ici toutes les fonctionnalités disponibles selon vos permissions.
          </Text>
        </div>
      </Group>

      {availableSections.length === 0 ? (
        <Card withBorder shadow="sm" radius="md" padding="lg">
          <Text c="dimmed" ta="center" py="xl">
            Aucune fonctionnalité disponible avec vos permissions actuelles.
          </Text>
        </Card>
      ) : (
        <SimpleGrid
          cols={{ base: 1, sm: 2, lg: 3 }}
          spacing="lg"
        >
          {availableSections.map((section) => {
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
                    color={section.color as any}
                  >
                    Accéder
                  </Button>
                </Group>
              </Card>
            );
          })}
        </SimpleGrid>
      )}
    </Container>
  );
}
