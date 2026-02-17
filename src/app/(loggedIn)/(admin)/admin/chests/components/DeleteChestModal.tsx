'use client';

import { Modal, Stack, Button, Group, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { deleteChest } from '@/app/_actions/chests';
import { handleAction } from '@/lib/action';
import type { ChestWithStockHistory } from '@/types/chests';

interface DeleteChestModalProps {
  opened: boolean;
  onClose: () => void;
  chestToDelete: ChestWithStockHistory | null;
  onSuccess: () => void;
}

export function DeleteChestModal({
  opened,
  onClose,
  chestToDelete,
  onSuccess,
}: DeleteChestModalProps) {
  const handleDelete = async () => {
    if (!chestToDelete) return;

    try {
      const result = await deleteChest({ id: chestToDelete.id });
      handleAction(result);
      notifications.show({
        title: 'Succès',
        message: 'Coffre supprimé avec succès',
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
          Êtes-vous sûr de vouloir supprimer le coffre{' '}
          <strong>{chestToDelete?.name}</strong> ?
          {chestToDelete && chestToDelete.stockHistory.length > 0 && (
            <Text c="red" size="sm" mt="xs">
              Attention : Ce coffre contient {chestToDelete.stockHistory.length} enregistrement(s) de stock.
              Tous les stocks associés seront également supprimés.
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
