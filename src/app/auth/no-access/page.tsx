import { type Metadata } from 'next';
import { Container, Title, Text } from '@mantine/core';
import { redirect } from 'next/navigation';
import { getAuthSession } from '@/lib/auth';
import { checkRolePermission } from '@/lib/auth/permissions';
import LogoutButton from './LogoutButton';

export const metadata: Metadata = {
  title: 'Accès refusé',
};

export default async function NoAccessPage() {
  // Vérifier si l'utilisateur a maintenant accès
  const session = await getAuthSession();
  if (session?.user?.role) {
    const hasAccess = checkRolePermission(session.user.role, 'application', 'access');
    if (hasAccess) {
      // Si l'utilisateur a maintenant accès, rediriger vers la page d'accueil
      redirect('/');
    }
  }

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

