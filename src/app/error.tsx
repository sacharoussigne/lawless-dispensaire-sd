'use client';

import { useEffect } from 'react';
import { Button, Container, Title, Text, Stack } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Composant de gestion d'erreur global pour l'application
 * Affiche une interface utilisateur en cas d'erreur dans les Server Components
 */
export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log l'erreur à un service de monitoring (ex: Sentry, LogRocket, etc.)
    console.error('Application error:', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
  }, [error]);

  return (
    <Container size="lg" py="xl">
      <Stack align="center" gap="md">
        <IconAlertCircle size={64} color="red" />
        <Title order={2}>Une erreur est survenue</Title>
        <Text c="dimmed" ta="center" maw={600}>
          {error.message || 'Une erreur inattendue s\'est produite. Veuillez réessayer.'}
        </Text>
        {error.digest && (
          <Text size="xs" c="dimmed">
            Code d'erreur: {error.digest}
          </Text>
        )}
        <Button onClick={reset} mt="md" size="md">
          Réessayer
        </Button>
      </Stack>
    </Container>
  );
}

