'use client';

import { Modal, Stack, Button, Group, Text } from '@mantine/core';
import type { CategoryItemWithCount } from '@/types/categoryItems';
import type { useDeleteCategoryItemMutation } from '../hooks/useCategoryItemsQueries';

interface DeleteCategoryItemModalProps {
  opened: boolean;
  onClose: () => void;
  categoryItemToDelete: CategoryItemWithCount | null;
  deleteMutation: ReturnType<typeof useDeleteCategoryItemMutation>;
}

export function DeleteCategoryItemModal({
  opened,
  onClose,
  categoryItemToDelete,
  deleteMutation,
}: DeleteCategoryItemModalProps) {
  const handleDelete = async () => {
    if (!categoryItemToDelete) return;

    try {
      await deleteMutation.mutateAsync({ id: categoryItemToDelete.id });
      onClose();
    } catch {
      // Error notification handled by mutation
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
          Êtes-vous sûr de vouloir supprimer la catégorie d&apos;objet{' '}
          <strong>{categoryItemToDelete?.name}</strong> ?
          {categoryItemToDelete && categoryItemToDelete._count.items > 0 && (
            <Text c="danger" size="sm" mt="xs">
              Attention : Cette catégorie contient {categoryItemToDelete._count.items} objet(s).
            </Text>
          )}
        </Text>
        <Group justify="flex-end" mt="md">
          <Button variant="subtle" color="slate" onClick={onClose}>
            Annuler
          </Button>
          <Button color="danger" onClick={handleDelete} loading={deleteMutation.isPending}>
            Supprimer
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
