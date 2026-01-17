import { Metadata } from 'next';
import { Container, Title, Text } from '@mantine/core';
import LogoutButton from './LogoutButton';

export const metadata: Metadata = {
  title: 'Accès refusé',
};

export default async function NoAccessPage() {
  return (
    <Container size="sm" style={{ marginTop: '10vh' }}>
      <div style={{ textAlign: 'center' }}>
        <Title order={1} size="h1" mb="md">
          Accès refusé
        </Title>
        <Text size="lg" mb="xl" c="dimmed">
          Vous n'avez pas accès à cette application. Veuillez contacter un administrateur pour obtenir les permissions nécessaires.
        </Text>
        <LogoutButton />
      </div>
    </Container>
  );
}

