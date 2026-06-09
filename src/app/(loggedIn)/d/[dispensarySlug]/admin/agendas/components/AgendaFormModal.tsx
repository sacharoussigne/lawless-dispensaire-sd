'use client';

import { useEffect, useState } from 'react';
import { Button, TextInput, Textarea } from '@mantine/core';
import { IconCalendarEvent } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { AppModal, AppModalFooter } from '@/app/_components/AppModal/AppModal';
import { createAgenda, updateAgenda } from '@/app/_actions/agenda/agendas';
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
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (opened) {
      setName(agenda?.name ?? '');
      setDescription(agenda?.description ?? '');
    }
  }, [opened, agenda]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
      };

      const result = agenda?.id
        ? await updateAgenda(dispensarySlug, { id: agenda.id, ...payload })
        : await createAgenda(dispensarySlug, payload);

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
    </AppModal>
  );
}
