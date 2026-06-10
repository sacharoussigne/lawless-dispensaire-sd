'use client';

import { useEffect, useState } from 'react';
import { Button, Group, Stack, Text, TextInput, Textarea } from '@mantine/core';
import { IconCalendarEvent } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { AppModal, AppModalFooter } from '@/app/_components/AppModal/AppModal';
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
  const [ownerResults, setOwnerResults] = useState<
    { id: string; name: string }[]
  >([]);
  const [submitting, setSubmitting] = useState(false);

  const isCreate = !agenda?.id;

  useEffect(() => {
    if (opened) {
      setName(agenda?.name ?? '');
      setDescription(agenda?.description ?? '');
      setOwnerQuery('');
      setOwnerUserId(null);
      setOwnerName('');
      setOwnerResults([]);
    }
  }, [opened, agenda]);

  useEffect(() => {
    if (!opened || !isCreate || ownerQuery.trim().length < 2) {
      setOwnerResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const result = await searchDispensaryUsersForAgenda(
          dispensarySlug,
          ownerQuery,
          { adminContext: true },
        );
        const data = handleAction(result);
        if (data) {
          setOwnerResults(data);
        }
      } catch {
        setOwnerResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [opened, isCreate, ownerQuery, dispensarySlug]);

  const handleSubmit = async () => {
    if (isCreate && !ownerUserId) {
      notifications.show({
        title: 'Erreur',
        message: 'Veuillez sélectionner un propriétaire',
        color: 'red',
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
        color: 'green',
      });
      onSuccess();
      onClose();
    } catch (error: unknown) {
      notifications.show({
        title: 'Erreur',
        message: error instanceof Error ? error.message : 'Échec de l\'opération',
        color: 'red',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const selectOwner = (user: { id: string; name: string }) => {
    setOwnerUserId(user.id);
    setOwnerName(user.name);
    setOwnerQuery(user.name);
    setOwnerResults([]);
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
          <TextInput
            label="Propriétaire"
            description="Recherche par pseudo (membre du dispensaire)"
            placeholder="Pseudo…"
            value={ownerQuery}
            onChange={(e) => {
              setOwnerQuery(e.currentTarget.value);
              if (ownerUserId && e.currentTarget.value !== ownerName) {
                setOwnerUserId(null);
                setOwnerName('');
              }
            }}
            autoComplete="off"
            name="agenda-owner-user-search"
            data-1p-ignore
            data-lpignore="true"
            data-form-type="other"
            required
          />
          {ownerUserId && (
            <Text size="sm" c="dimmed">
              Propriétaire sélectionné : {ownerName}
            </Text>
          )}
          {ownerResults.length > 0 && !ownerUserId && (
            <Stack gap={4}>
              {ownerResults.map((user) => (
                <Group key={user.id} justify="space-between">
                  <Text size="sm">{user.name}</Text>
                  <Button
                    size="xs"
                    color="sage"
                    variant="light"
                    onClick={() => selectOwner(user)}
                  >
                    Sélectionner
                  </Button>
                </Group>
              ))}
            </Stack>
          )}
        </Stack>
      )}
    </AppModal>
  );
}
