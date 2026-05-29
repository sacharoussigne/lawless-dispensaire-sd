'use client';

import { useState } from 'react';
import {
  Button,
  Card,
  Group,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  listDispensaryMembers,
  removeDispensaryMember,
  searchUsersForDispensaryInvite,
  upsertDispensaryMember,
} from '@/app/_actions/dispensaryMembers';
import { Role, rolesAsString } from '@/types/enum/roles';

const ROLE_OPTIONS = [
  { value: Role.EMPLOYEE, label: 'Employé' },
  { value: Role.INVENTORY_MANAGER, label: 'Gestionnaire stock' },
  { value: Role.INVENTORY_VIEWER, label: 'Lecteur stock' },
  { value: Role.PRIVATE_PRACTITIONER, label: 'Cabinet privé' },
  { value: Role.DIRECTION, label: 'Direction' },
  { value: Role.ADMIN, label: 'Admin dispensaire' },
];

type MemberRow = {
  id: string;
  role: string;
  user: { id: string; name: string };
};

export function DispensaryMembersClient({
  dispensarySlug,
  initialMembers,
  error,
}: {
  dispensarySlug: string;
  initialMembers: MemberRow[];
  error?: string;
}) {
  const [members, setMembers] = useState(initialMembers);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: string; name: string }[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>(Role.EMPLOYEE);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    const result = await listDispensaryMembers(dispensarySlug);
    if (result.status === 200 && result.data) {
      setMembers(result.data as MemberRow[]);
    }
  };

  const handleSearch = async () => {
    const result = await searchUsersForDispensaryInvite(dispensarySlug, search);
    if (result.status === 200 && result.data) {
      setSearchResults(result.data);
    }
  };

  const handleAdd = async () => {
    if (!selectedUserId) return;
    setLoading(true);
    try {
      const result = await upsertDispensaryMember(dispensarySlug, {
        userId: selectedUserId,
        role: selectedRole as (typeof Role)[keyof typeof Role],
      });
      if (result.status !== 200) {
        const message =
          'error' in result && typeof result.error === 'string'
            ? result.error
            : 'Erreur';
        notifications.show({ title: 'Erreur', message, color: 'red' });
        return;
      }
      await refresh();
      setSearch('');
      setSearchResults([]);
      setSelectedUserId(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (userId: string) => {
    const result = await removeDispensaryMember(dispensarySlug, userId);
    if (result.status !== 200) {
      const message =
        'error' in result && typeof result.error === 'string'
          ? result.error
          : 'Erreur';
      notifications.show({ title: 'Erreur', message, color: 'red' });
      return;
    }
    await refresh();
  };

  return (
    <Stack gap="lg">
      <Title order={2}>Membres du dispensaire</Title>
      {error && (
        <Text c="red" size="sm">
          {error}
        </Text>
      )}

      <Card withBorder padding="md">
        <Stack gap="sm">
          <Text fw={600}>Ajouter un membre</Text>
          <Group align="flex-end">
            <TextInput
              label="Rechercher par nom"
              className="flex-1"
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
            />
            <Button variant="default" onClick={handleSearch}>
              Rechercher
            </Button>
          </Group>
          {searchResults.length > 0 && (
            <Select
              label="Utilisateur"
              data={searchResults.map((u) => ({
                value: u.id,
                label: u.name,
              }))}
              value={selectedUserId}
              onChange={setSelectedUserId}
            />
          )}
          <Select
            label="Rôle"
            data={ROLE_OPTIONS}
            value={selectedRole}
            onChange={(v) => setSelectedRole(v ?? Role.EMPLOYEE)}
          />
          <Button loading={loading} onClick={handleAdd} disabled={!selectedUserId}>
            Enregistrer
          </Button>
        </Stack>
      </Card>

      <Stack gap="sm">
        {members.map((m) => (
          <Card key={m.id} withBorder padding="md">
            <Group justify="space-between">
              <div>
                <Text fw={600}>{m.user.name}</Text>
                <Text size="sm" c="dimmed">
                  {rolesAsString(m.role as Role)}
                </Text>
              </div>
              <Button color="red" variant="light" onClick={() => handleRemove(m.user.id)}>
                Retirer
              </Button>
            </Group>
          </Card>
        ))}
      </Stack>
    </Stack>
  );
}
