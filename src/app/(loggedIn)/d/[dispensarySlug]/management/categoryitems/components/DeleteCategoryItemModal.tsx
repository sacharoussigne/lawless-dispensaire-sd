'use client';

import { usePermissions } from '@/app/_contexts/PermissionsContext';
import { Modal, Stack, Button, Group, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { deleteCategoryItem } from '@/app/_actions/categoryItems';
import { handleAction } from '@/lib/action';
import type { CategoryItemWithItems } from '@/types/categoryItems';

interface DeleteCategoryItemModalProps {
  opened: boolean;
  onClose: () => void;
  categoryItemToDelete: CategoryItemWithItems | null;
  onSuccess: () => void;
}

export function DeleteCategoryItemModal({
  opened,
  onClose,
  categoryItemToDelete,
  onSuccess,
}: DeleteCategoryItemModalProps) {
  const { dispensarySlug } = usePermissions();
  const handleDelete = async () => {
    if (!categoryItemToDelete) return;

    try {
      const result = await deleteCategoryItem(dispensarySlug!, { id: categoryItemToDelete.id });
      handleAction(result);
      notifications.show({
        title: 'Succès',
        message: 'Catégorie d\'objet supprimée avec succès',
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
          Êtes-vous sûr de vouloir supprimer la catégorie d'objet{' '}
          <strong>{categoryItemToDelete?.name}</strong> ?
          {categoryItemToDelete && categoryItemToDelete.items.length > 0 && (
            <Text c="red" size="sm" mt="xs">
              Attention : Cette catégorie contient {categoryItemToDelete.items.length} objet(s).
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

