'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ActionIcon,
  Button,
  Group,
  Select,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { IconTrash, IconUsers } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { AppModal, AppModalFooter } from '@/app/_components/AppModal/AppModal';
import {
  removeAgendaMember,
  searchDispensaryUsersForAgenda,
  upsertAgendaMember,
} from '@/app/_actions/agenda/members';
import { getAgendaWithMembers } from '@/app/_actions/agenda/agendas';
import { handleAction } from '@/lib/action';
import {
  AGENDA_ACCESS_LEVELS,
  agendaAccessLevelLabel,
  type AgendaMemberDTO,
} from '@/types/agenda';
import type { AgendaAccessLevel } from '@prisma/client';

interface AgendaMembersModalProps {
  opened: boolean;
  onClose: () => void;
  dispensarySlug: string;
  agendaId: string | null;
  agendaName: string;
}

export function AgendaMembersModal({
  opened,
  onClose,
  dispensarySlug,
  agendaId,
  agendaName,
}: AgendaMembersModalProps) {
  const [members, setMembers] = useState<AgendaMemberDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<
    { id: string; name: string; email: string }[]
  >([]);
  const [accessLevel, setAccessLevel] = useState<AgendaAccessLevel>('READ');

  const loadMembers = useCallback(async () => {
    if (!agendaId) return;
    setLoading(true);
    try {
      const result = await getAgendaWithMembers(dispensarySlug, agendaId);
      const data = handleAction(result);
      if (data) {
        setMembers(data.members as AgendaMemberDTO[]);
      }
    } catch (error: unknown) {
      notifications.show({
        title: 'Erreur',
        message: error instanceof Error ? error.message : 'Chargement impossible',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  }, [agendaId, dispensarySlug]);

  useEffect(() => {
    if (opened && agendaId) {
      void loadMembers();
    }
  }, [opened, agendaId, loadMembers]);

  useEffect(() => {
    if (!opened || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const result = await searchDispensaryUsersForAgenda(
          dispensarySlug,
          searchQuery,
        );
        const data = handleAction(result);
        if (data) {
          setSearchResults(
            data.filter((u) => !members.some((m) => m.userId === u.id)),
          );
        }
      } catch {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, dispensarySlug, members, opened]);

  const handleAddMember = async (userId: string) => {
    if (!agendaId) return;
    try {
      const result = await upsertAgendaMember(dispensarySlug, {
        agendaId,
        userId,
        accessLevel,
      });
      handleAction(result);
      setSearchQuery('');
      await loadMembers();
    } catch (error: unknown) {
      notifications.show({
        title: 'Erreur',
        message: error instanceof Error ? error.message : 'Ajout impossible',
        color: 'red',
      });
    }
  };

  const handleUpdateLevel = async (userId: string, level: AgendaAccessLevel) => {
    if (!agendaId) return;
    try {
      const result = await upsertAgendaMember(dispensarySlug, {
        agendaId,
        userId,
        accessLevel: level,
      });
      handleAction(result);
      await loadMembers();
    } catch (error: unknown) {
      notifications.show({
        title: 'Erreur',
        message: error instanceof Error ? error.message : 'Mise à jour impossible',
        color: 'red',
      });
    }
  };

  const handleRemove = async (userId: string) => {
    if (!agendaId) return;
    try {
      const result = await removeAgendaMember(dispensarySlug, { agendaId, userId });
      handleAction(result);
      await loadMembers();
    } catch (error: unknown) {
      notifications.show({
        title: 'Erreur',
        message: error instanceof Error ? error.message : 'Suppression impossible',
        color: 'red',
      });
    }
  };

  return (
    <AppModal
      opened={opened}
      onClose={onClose}
      title={`Membres — ${agendaName}`}
      icon={IconUsers}
      size="lg"
      footer={
        <AppModalFooter>
          <Button variant="subtle" color="slate" onClick={onClose}>
            Fermer
          </Button>
        </AppModalFooter>
      }
    >
      <Stack gap="md">
        <Group align="flex-end" grow>
          <TextInput
            label="Rechercher un utilisateur"
            placeholder="Nom ou email…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
          />
          <Select
            label="Permission"
            data={AGENDA_ACCESS_LEVELS.map((l) => ({
              value: l,
              label: agendaAccessLevelLabel(l),
            }))}
            value={accessLevel}
            onChange={(v) => setAccessLevel((v as AgendaAccessLevel) ?? 'READ')}
          />
        </Group>

        {searchResults.length > 0 && (
          <Stack gap="xs">
            {searchResults.map((user) => (
              <Group key={user.id} justify="space-between">
                <Text size="sm">
                  {user.name} <Text span c="dimmed" size="xs">({user.email})</Text>
                </Text>
                <Button
                  size="xs"
                  color="sage"
                  variant="light"
                  onClick={() => void handleAddMember(user.id)}
                >
                  Ajouter
                </Button>
              </Group>
            ))}
          </Stack>
        )}

        <Stack gap="sm">
          <Text fw={500} size="sm">Membres actuels</Text>
          {loading && <Text size="sm" c="dimmed">Chargement…</Text>}
          {!loading && members.length === 0 && (
            <Text size="sm" c="dimmed">Aucun membre</Text>
          )}
          {members.map((member) => (
            <Group key={member.id} justify="space-between" wrap="nowrap">
              <Text size="sm" style={{ flex: 1 }}>
                {member.user.name}
              </Text>
              <Select
                size="xs"
                w={140}
                data={AGENDA_ACCESS_LEVELS.map((l) => ({
                  value: l,
                  label: agendaAccessLevelLabel(l),
                }))}
                value={member.accessLevel}
                onChange={(v) =>
                  handleUpdateLevel(member.userId, (v as AgendaAccessLevel) ?? member.accessLevel)
                }
              />
              <ActionIcon
                variant="light"
                color="danger"
                onClick={() => handleRemove(member.userId)}
              >
                <IconTrash size={16} />
              </ActionIcon>
            </Group>
          ))}
        </Stack>
      </Stack>
    </AppModal>
  );
}
