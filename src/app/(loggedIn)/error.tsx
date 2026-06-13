'use client';

import { useEffect } from 'react';
import { Button, Container, Title, Text, Stack } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Composant de gestion d'erreur pour les routes authentifiées
 * Affiche une interface utilisateur en cas d'erreur dans les Server Components
 */
export default function Error({ error, reset }: ErrorProps) {
  const router = useRouter();

  useEffect(() => {
    // Log l'erreur à un service de monitoring
    console.error('Authenticated route error:', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
  }, [error]);

  const handleGoHome = () => {
    router.push('/');
  };

  return (
    <Container size="lg" py="xl">
      <Stack align="center" gap="md">
        <IconAlertCircle size={64} color="var(--disp-danger)" />
        <Title order={2}>Une erreur est survenue</Title>
        <Text c="dimmed" ta="center" maw={600}>
          {error.message || 'Une erreur inattendue s\'est produite lors du chargement de la page.'}
        </Text>
        {error.digest && (
          <Text size="xs" c="dimmed">
            Code d'erreur: {error.digest}
          </Text>
        )}
        <Stack gap="sm" mt="md">
          <Button onClick={reset} size="md">
            Réessayer
          </Button>
          <Button variant="outline" onClick={handleGoHome} size="md">
            Retour à l'accueil
          </Button>
        </Stack>
      </Stack>
    </Container>
  );
}

