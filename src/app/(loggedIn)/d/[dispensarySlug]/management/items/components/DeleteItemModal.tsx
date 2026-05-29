'use client';

import { usePermissions } from '@/app/_contexts/PermissionsContext';
import { Modal, Stack, Button, Group, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { deleteItem } from '@/app/_actions/items';
import { handleAction } from '@/lib/action';
import type { ItemWithRelations } from '@/types/items';

interface DeleteItemModalProps {
  opened: boolean;
  onClose: () => void;
  itemToDelete: ItemWithRelations | null;
  onSuccess: () => void;
}

export function DeleteItemModal({
  opened,
  onClose,
  itemToDelete,
  onSuccess,
}: DeleteItemModalProps) {
  const { dispensarySlug } = usePermissions();
  const handleDelete = async () => {
    if (!itemToDelete) return;

    try {
      const result = await deleteItem(dispensarySlug!, { id: itemToDelete.id });
      handleAction(result);
      notifications.show({
        title: 'Succès',
        message: 'Objet supprimé avec succès',
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
          Êtes-vous sûr de vouloir supprimer l'objet{' '}
          <strong>{itemToDelete?.name}</strong> ?
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

