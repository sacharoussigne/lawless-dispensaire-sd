'use client';

import { Button, Text } from '@mantine/core';
import type { CraftRecipeWithIngredients } from '@/types/items';
import { AppModal, AppModalFooter } from '@/app/_components/AppModal/AppModal';
import type { useDeleteCraftRecipeMutation } from '../hooks/useItemsQueries';

interface DeleteCraftRecipeModalProps {
  opened: boolean;
  onClose: () => void;
  craftRecipeToDelete: CraftRecipeWithIngredients | null;
  deleteMutation: ReturnType<typeof useDeleteCraftRecipeMutation>;
}

export function DeleteCraftRecipeModal({
  opened,
  onClose,
  craftRecipeToDelete,
  deleteMutation,
}: DeleteCraftRecipeModalProps) {
  const handleDelete = async () => {
    if (!craftRecipeToDelete) return;

    try {
      await deleteMutation.mutateAsync({ id: craftRecipeToDelete.id });
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
        Êtes-vous sûr de vouloir supprimer la recette de craft{' '}
        <strong>{craftRecipeToDelete?.name}</strong> ?
      </Text>
    </AppModal>
  );
}
