'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button, Stack, Text, TextInput, Textarea } from '@mantine/core';
import { IconCalendarEvent } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { AppModal, AppModalFooter } from '@/app/_components/AppModal/AppModal';
import { UserPseudoSearch } from '@/app/_components/UserPseudoSearch/UserPseudoSearch';
import { createAgenda, updateAgenda } from '@/app/_actions/agenda/agendas';
import { searchDispensaryUsersForAgenda } from '@/app/_actions/agenda/members';
import { handleAction } from '@/lib/action';

type AgendaFormData = {
  id?: string;
  name: string;
  description: string | null;
};

interface AgendaFormModalProps {
  opened: boolean;
  onClose: () => void;
  dispensarySlug: string;
  agenda: AgendaFormData | null;
  onSuccess: () => void;
}

export function AgendaFormModal({
  opened,
  onClose,
  dispensarySlug,
  agenda,
  onSuccess,
}: AgendaFormModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [ownerQuery, setOwnerQuery] = useState('');
  const [ownerUserId, setOwnerUserId] = useState<string | null>(null);
  const [ownerName, setOwnerName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isCreate = !agenda?.id;

  const searchAgendaUsers = useCallback(
    async (query: string) => {
      const result = await searchDispensaryUsersForAgenda(
        dispensarySlug,
        query,
        { adminContext: true },
      );
      const data = handleAction(result);
      return data ?? [];
    },
    [dispensarySlug],
  );

  useEffect(() => {
    if (opened) {
      setName(agenda?.name ?? '');
      setDescription(agenda?.description ?? '');
      setOwnerQuery('');
      setOwnerUserId(null);
      setOwnerName('');
    }
  }, [opened, agenda]);

  const handleSubmit = async () => {
    if (isCreate && !ownerUserId) {
      notifications.show({
        title: 'Erreur',
        message: 'Veuillez sélectionner un propriétaire',
        color: 'danger',
      });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
      };

      const result = agenda?.id
        ? await updateAgenda(dispensarySlug, { id: agenda.id, ...payload })
        : await createAgenda(dispensarySlug, {
            ...payload,
            ownerUserId: ownerUserId!,
          });

      handleAction(result);
      notifications.show({
        title: 'Succès',
        message: agenda?.id ? 'Agenda mis à jour' : 'Agenda créé',
        color: 'moss',
      });
      onSuccess();
      onClose();
    } catch (error: unknown) {
      notifications.show({
        title: 'Erreur',
        message: error instanceof Error ? error.message : 'Échec de l\'opération',
        color: 'danger',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const selectOwner = (user: { id: string; name: string }) => {
    setOwnerUserId(user.id);
    setOwnerName(user.name);
    setOwnerQuery(user.name);
  };

  return (
    <AppModal
      opened={opened}
      onClose={onClose}
      title={agenda?.id ? 'Modifier l\'agenda' : 'Nouvel agenda'}
      icon={IconCalendarEvent}
      footer={
        <AppModalFooter>
          <Button variant="subtle" color="slate" onClick={onClose}>
            Annuler
          </Button>
          <Button color="sage" loading={submitting} onClick={handleSubmit}>
            {agenda?.id ? 'Enregistrer' : 'Créer'}
          </Button>
        </AppModalFooter>
      }
    >
      <TextInput
        label="Nom"
        value={name}
        onChange={(e) => setName(e.currentTarget.value)}
        required
      />
      <Textarea
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.currentTarget.value)}
        minRows={3}
      />
      {isCreate && (
        <Stack gap="xs">
          <UserPseudoSearch
            label="Propriétaire"
            description="Recherche par pseudo (membre du dispensaire)"
            inputName="agenda-owner-user-search"
            enabled={opened && isCreate}
            query={ownerQuery}
            onQueryChange={(next) => {
              setOwnerQuery(next);
              if (ownerUserId && next !== ownerName) {
                setOwnerUserId(null);
                setOwnerName('');
              }
            }}
            onSearch={searchAgendaUsers}
            onSelect={selectOwner}
            hideResults={!!ownerUserId}
            clearQueryOnSelect={false}
          />
          {ownerUserId && (
            <Text size="sm" c="dimmed">
              Propriétaire sélectionné : {ownerName}
            </Text>
          )}
        </Stack>
      )}
    </AppModal>
  );
}
