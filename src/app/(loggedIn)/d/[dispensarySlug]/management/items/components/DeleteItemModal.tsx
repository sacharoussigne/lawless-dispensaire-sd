'use client';

import { Button, Text } from '@mantine/core';
import type { ItemWithRelations } from '@/types/items';
import { AppModal, AppModalFooter } from '@/app/_components/AppModal/AppModal';
import type { useDeleteItemMutation } from '../hooks/useItemsQueries';

interface DeleteItemModalProps {
  opened: boolean;
  onClose: () => void;
  itemToDelete: ItemWithRelations | null;
  deleteMutation: ReturnType<typeof useDeleteItemMutation>;
}

export function DeleteItemModal({
  opened,
  onClose,
  itemToDelete,
  deleteMutation,
}: DeleteItemModalProps) {
  const handleDelete = async () => {
    if (!itemToDelete) return;

    try {
      await deleteMutation.mutateAsync({ id: itemToDelete.id });
      onClose();
    } catch {
      // Error notification handled by mutation
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
          <Button variant="subtle" color="slate" onClick={onClose}>
            Annuler
          </Button>
          <Button color="danger" onClick={handleDelete} loading={deleteMutation.isPending}>
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
