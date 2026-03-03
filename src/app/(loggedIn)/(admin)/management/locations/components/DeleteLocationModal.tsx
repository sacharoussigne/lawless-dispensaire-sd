'use client';

import { Modal, Stack, Button, Group, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { deleteLocation } from '@/app/_actions/locations';
import { handleAction } from '@/lib/action';
import type { LocationWithCompanies } from '@/types/locations';

interface DeleteLocationModalProps {
  opened: boolean;
  onClose: () => void;
  locationToDelete: LocationWithCompanies | null;
  onSuccess: () => void;
}

export function DeleteLocationModal({
  opened,
  onClose,
  locationToDelete,
  onSuccess,
}: DeleteLocationModalProps) {
  const handleDelete = async () => {
    if (!locationToDelete) return;

    try {
      const result = await deleteLocation({ id: locationToDelete.id });
      handleAction(result);
      notifications.show({
        title: 'Succès',
        message: 'Lieu supprimé avec succès',
        color: 'green',
      });
      onClose();
      onSuccess();
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors de la suppression',
        color: 'red',
      });
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Confirmer la suppression"
      size="md"
    >
      <Stack>
        <Text>
          Êtes-vous sûr de vouloir supprimer le lieu{' '}
          <strong>{locationToDelete?.name}</strong> ?
          {locationToDelete && locationToDelete.companies.length > 0 && (
            <Text c="red" size="sm" mt="xs">
              Attention : Ce lieu contient {locationToDelete.companies.length}{' '}
              entreprise(s).
            </Text>
          )}
        </Text>
        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={onClose}>
            Annuler
          </Button>
          <Button color="red" onClick={handleDelete}>
            Supprimer
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

