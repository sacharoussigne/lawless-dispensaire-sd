import { Metadata } from 'next';
import { Container, Title, Text, Button, Group } from '@mantine/core';
import { routes } from '@/types/routes';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Accès refusé - Gestion',
};

export default async function NoManagementAccessPage() {
  return (
    <Container size="sm" style={{ marginTop: '10vh' }}>
      <div style={{ textAlign: 'center' }}>
        <Title order={1} size="h1" mb="md">
          Accès refusé
        </Title>
        <Text size="lg" mb="xl" c="dimmed">
          Vous n'avez pas accès à cette page de gestion. Seuls les administrateurs peuvent accéder à cette section.
        </Text>
        <Group justify="center" gap="md">
          <Link href={routes.stock.index}>
            <Button variant="light">
              Retour à l'accueil
            </Button>
          </Link>
        </Group>
      </div>
    </Container>
  );
}

