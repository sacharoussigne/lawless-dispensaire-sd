'use client';

import { useState } from 'react';
import {
  Button,
  Card,
  Container,
  Group,
  MultiSelect,
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
import {
  DISPENSARY_MEMBER_ROLES,
  DispensaryMemberRole,
  Role,
  parseRoleList,
  rolesAsString,
} from '@/types/enum/roles';

const ROLE_OPTIONS = DISPENSARY_MEMBER_ROLES.map((role) => ({
  value: role,
  label: rolesAsString(role),
}));

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
  const [selectedRoles, setSelectedRoles] = useState<string[]>([Role.EMPLOYEE]);
  const [loading, setLoading] = useState(false);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [roleEdits, setRoleEdits] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(initialMembers.map((m) => [m.user.id, parseRoleList(m.role)])),
  );

  const refresh = async () => {
    const result = await listDispensaryMembers(dispensarySlug);
    if (result.status === 200 && result.data) {
      const rows = result.data as MemberRow[];
      setMembers(rows);
      setRoleEdits(
        Object.fromEntries(rows.map((m) => [m.user.id, parseRoleList(m.role)])),
      );
    }
  };

  const getRolesForMember = (member: MemberRow): string[] => {
    if (roleEdits[member.user.id] !== undefined) {
      return roleEdits[member.user.id];
    }
    return parseRoleList(member.role);
  };

  const handleSearch = async () => {
    const result = await searchUsersForDispensaryInvite(dispensarySlug, search);
    if (result.status === 200 && result.data) {
      setSearchResults(result.data);
    }
  };

  const saveMemberRoles = async (
    userId: string,
    roles: string[],
    options?: { successMessage?: string },
  ) => {
    if (roles.length === 0) {
      notifications.show({
        title: 'Erreur',
        message: 'Sélectionnez au moins un rôle.',
        color: 'red',
      });
      return false;
    }

    const result = await upsertDispensaryMember(dispensarySlug, {
      userId,
      roles: roles as DispensaryMemberRole[],
    });

    if (result.status !== 200) {
      const message =
        'error' in result && typeof result.error === 'string' ? result.error : 'Erreur';
      notifications.show({ title: 'Erreur', message, color: 'red' });
      return false;
    }

    if (options?.successMessage) {
      notifications.show({
        title: 'Enregistré',
        message: options.successMessage,
        color: 'green',
      });
    }
    await refresh();
    return true;
  };

  const handleAdd = async () => {
    if (!selectedUserId) return;
    setLoading(true);
    try {
      const ok = await saveMemberRoles(selectedUserId, selectedRoles, {
        successMessage: 'Membre ajouté',
      });
      if (!ok) return;
      setSearch('');
      setSearchResults([]);
      setSelectedUserId(null);
      setSelectedRoles([Role.EMPLOYEE]);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRoles = async (userId: string) => {
    const roles = roleEdits[userId] ?? [];
    setSavingUserId(userId);
    try {
      await saveMemberRoles(userId, roles, { successMessage: 'Rôles mis à jour' });
    } finally {
      setSavingUserId(null);
    }
  };

  const handleRemove = async (userId: string) => {
    const result = await removeDispensaryMember(dispensarySlug, userId);
    if (result.status !== 200) {
      const message =
        'error' in result && typeof result.error === 'string' ? result.error : 'Erreur';
      notifications.show({ title: 'Erreur', message, color: 'red' });
      return;
    }
    await refresh();
  };

  const rolesChanged = (member: MemberRow) => {
    const current = getRolesForMember(member).slice().sort().join(',');
    const original = parseRoleList(member.role).slice().sort().join(',');
    return current !== original;
  };

  return (
    <Container size="xl" py="xl" w="100%">
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
          <MultiSelect
            label="Rôles"
            data={ROLE_OPTIONS}
            value={selectedRoles}
            onChange={setSelectedRoles}
            searchable
            clearable={false}
          />
          <Button
            loading={loading}
            onClick={handleAdd}
            disabled={!selectedUserId || selectedRoles.length === 0}
          >
            Enregistrer
          </Button>
        </Stack>
      </Card>

      <Stack gap="sm">
        {members.map((m) => {
          const memberRoles = getRolesForMember(m);
          return (
            <Card key={m.id} withBorder padding="md">
              <Stack gap="sm">
                <Group justify="space-between" align="flex-start">
                  <Text fw={600}>{m.user.name}</Text>
                  <Button
                    color="red"
                    variant="light"
                    size="xs"
                    onClick={() => handleRemove(m.user.id)}
                  >
                    Retirer
                  </Button>
                </Group>
                <MultiSelect
                  label="Rôles"
                  data={ROLE_OPTIONS}
                  value={memberRoles}
                  onChange={(roles) =>
                    setRoleEdits((prev) => ({ ...prev, [m.user.id]: roles }))
                  }
                  searchable
                  clearable={false}
                />
                <Group justify="flex-end">
                  <Button
                    variant="light"
                    loading={savingUserId === m.user.id}
                    disabled={!rolesChanged(m) || memberRoles.length === 0}
                    onClick={() => handleSaveRoles(m.user.id)}
                  >
                    Enregistrer les rôles
                  </Button>
                </Group>
              </Stack>
            </Card>
          );
        })}
      </Stack>
    </Stack>
    </Container>
  );
}
