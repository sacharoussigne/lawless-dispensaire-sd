'use client';

import { useState } from 'react';
import { Button, Card, Container, Group, Stack, Text, TextInput, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { createDispensary } from '@/app/_actions/dispensaries';
import { tenantRoutes } from '@/types/routes';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type DispensaryRow = {
  id: string;
  slug: string;
  name: string;
  _count: { members: number };
  settings: { dispensaryName: string } | null;
};

export function DispensariesPlatformClient({
  initialDispensaries,
  error,
}: {
  initialDispensaries: DispensaryRow[];
  error?: string;
}) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const result = await createDispensary({
        name: name.trim(),
        slug: slug.trim() || undefined,
      });
      if (result.status !== 201 || !('data' in result) || !result.data) {
        const errMsg =
          'error' in result && typeof result.error === 'string'
            ? result.error
            : 'Création impossible';
        notifications.show({
          title: 'Erreur',
          message: errMsg,
          color: 'red',
        });
        return;
      }
      notifications.show({
        title: 'Dispensaire créé',
        message: result.data.name,
        color: 'green',
      });
      setName('');
      setSlug('');
      router.refresh();
      router.push(tenantRoutes(result.data.slug).employee.index);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size="xl" py="xl" w="100%">
    <Stack gap="lg">
      <Title order={2}>Dispensaires (plateforme)</Title>
      {error && (
        <Text c="red" size="sm">
          {error}
        </Text>
      )}

      <Card withBorder padding="md">
        <Stack gap="sm">
          <Text fw={600}>Créer un dispensaire</Text>
          <TextInput label="Nom" value={name} onChange={(e) => setName(e.currentTarget.value)} />
          <TextInput
            label="Slug (URL)"
            description="Optionnel — généré depuis le nom si vide"
            value={slug}
            onChange={(e) => setSlug(e.currentTarget.value)}
          />
          <Button loading={loading} onClick={handleCreate} disabled={!name.trim()}>
            Créer
          </Button>
        </Stack>
      </Card>

      <Stack gap="sm">
        {initialDispensaries.map((d) => (
          <Card key={d.id} withBorder padding="md">
            <Group justify="space-between">
              <div>
                <Text fw={600}>{d.settings?.dispensaryName ?? d.name}</Text>
                <Text size="sm" c="dimmed">
                  /d/{d.slug} — {d._count.members} membre(s)
                </Text>
              </div>
              <Button component={Link} href={tenantRoutes(d.slug).employee.index} variant="light">
                Ouvrir
              </Button>
            </Group>
          </Card>
        ))}
      </Stack>
    </Stack>
    </Container>
  );
}
