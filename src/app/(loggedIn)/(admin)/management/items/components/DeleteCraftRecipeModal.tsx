'use client';

import { Modal, Stack, Button, Group, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { deleteCraftRecipe } from '@/app/_actions/craftRecipes';
import { handleAction } from '@/lib/action';
import type { CraftRecipeWithIngredients } from '@/types/items';

interface DeleteCraftRecipeModalProps {
  opened: boolean;
  onClose: () => void;
  craftRecipeToDelete: CraftRecipeWithIngredients | null;
  selectedItem: any;
  onSuccess: () => void;
}

export function DeleteCraftRecipeModal({
  opened,
  onClose,
  craftRecipeToDelete,
  onSuccess,
}: DeleteCraftRecipeModalProps) {
  const handleDelete = async () => {
    if (!craftRecipeToDelete) return;

    try {
      const result = await deleteCraftRecipe({ id: craftRecipeToDelete.id });
      handleAction(result);
      notifications.show({
        title: 'Succès',
        message: 'Recette de craft supprimée avec succès',
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
          Êtes-vous sûr de vouloir supprimer la recette de craft{' '}
          <strong>{craftRecipeToDelete?.name}</strong> ?
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

