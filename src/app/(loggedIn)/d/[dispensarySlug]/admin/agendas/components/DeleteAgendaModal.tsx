'use client';

import { useState } from 'react';
import { Button, Text } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { AppModal, AppModalFooter } from '@/app/_components/AppModal/AppModal';
import { deleteAgenda } from '@/app/_actions/agenda/agendas';
import { handleAction } from '@/lib/action';

interface DeleteAgendaModalProps {
  opened: boolean;
  onClose: () => void;
  dispensarySlug: string;
  agendaId: string | null;
  agendaName: string;
  onSuccess: () => void;
}

export function DeleteAgendaModal({
  opened,
  onClose,
  dispensarySlug,
  agendaId,
  agendaName,
  onSuccess,
}: DeleteAgendaModalProps) {
  const [submitting, setSubmitting] = useState(false);

  const handleDelete = async () => {
    if (!agendaId) return;
    setSubmitting(true);
    try {
      const result = await deleteAgenda(dispensarySlug, agendaId);
      handleAction(result);
      notifications.show({
        title: 'Succès',
        message: 'Agenda supprimé',
        color: 'green',
      });
      onSuccess();
      onClose();
    } catch (error: unknown) {
      notifications.show({
        title: 'Erreur',
        message: error instanceof Error ? error.message : 'Suppression impossible',
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
      title="Supprimer l'agenda"
      icon={IconTrash}
      footer={
        <AppModalFooter>
          <Button variant="subtle" color="slate" onClick={onClose}>
            Annuler
          </Button>
          <Button color="danger" loading={submitting} onClick={handleDelete}>
            Supprimer
          </Button>
        </AppModalFooter>
      }
    >
      <Text>
        Confirmer la suppression de l&apos;agenda <strong>{agendaName}</strong> ?
        Tous les événements et listes associés seront supprimés.
      </Text>
    </AppModal>
  );
}
