'use client';

import { Modal, Stack, Button, Group, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { deleteOrder } from '@/app/_actions/orders';
import { handleAction } from '@/lib/action';
import type { OrderWithRelations } from '@/types/orders';

interface DeleteOrderModalProps {
  opened: boolean;
  onClose: () => void;
  orderToDelete: OrderWithRelations | null;
  onSuccess: () => void;
}

export function DeleteOrderModal({
  opened,
  onClose,
  orderToDelete,
  onSuccess,
}: DeleteOrderModalProps) {
  const handleDelete = async () => {
    if (!orderToDelete) return;

    try {
      const result = await deleteOrder({ id: orderToDelete.id });
      handleAction(result);
      notifications.show({
        title: 'Succès',
        message: 'Commande supprimée avec succès',
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
    <Modal opened={opened} onClose={onClose} title="Supprimer la commande">
      <Stack gap="md">
        <Text>
          Êtes-vous sûr de vouloir supprimer la commande{' '}
          <strong>{orderToDelete?.name}</strong> ?
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

