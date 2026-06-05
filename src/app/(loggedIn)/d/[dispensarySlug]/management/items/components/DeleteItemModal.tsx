'use client';

import { usePermissions } from '@/app/_contexts/PermissionsContext';
import { Button, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { deleteItem } from '@/app/_actions/items';
import { handleAction } from '@/lib/action';
import type { ItemWithRelations } from '@/types/items';
import { AppModal, AppModalFooter } from '@/app/_components/AppModal/AppModal';

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
    } catch (error: unknown) {
      notifications.show({
        title: 'Erreur',
        message:
          error instanceof Error ? error.message : 'Erreur lors de la suppression',
        color: 'red',
      });
    }
  };

  return (
    <AppModal
      opened={opened}
      onClose={onClose}
      title="Confirmer la suppression"
      size="md"
      footer={
        <AppModalFooter>
          <Button variant="subtle" onClick={onClose}>
            Annuler
          </Button>
          <Button color="danger" onClick={handleDelete}>
            Supprimer
          </Button>
        </AppModalFooter>
      }
    >
      <Text>
        Êtes-vous sûr de vouloir supprimer l&apos;objet{' '}
        <strong>{itemToDelete?.name}</strong> ?
      </Text>
    </AppModal>
  );
}
