'use client';

import { Button, Text } from '@mantine/core';
import { AppModal, AppModalFooter } from '@/app/_components/AppModal/AppModal';
import type { OrderSummary } from '@/types/orders';
import { useDeleteOrderMutation } from '../hooks/useOrdersQueries';

interface DeleteOrderModalProps {
  opened: boolean;
  onClose: () => void;
  orderToDelete: OrderSummary | null;
}

export function DeleteOrderModal({
  opened,
  onClose,
  orderToDelete,
}: DeleteOrderModalProps) {
  const deleteOrderMutation = useDeleteOrderMutation();

  const handleDelete = async () => {
    if (!orderToDelete) return;

    try {
      await deleteOrderMutation.mutateAsync({ id: orderToDelete.id });
      onClose();
    } catch {
      // Notification handled by mutation hook
    }
  };

  return (
    <AppModal
      opened={opened}
      onClose={onClose}
      title="Supprimer la commande"
      size="md"
      footer={
        <AppModalFooter>
          <Button variant="subtle" color="slate" onClick={onClose}>
            Annuler
          </Button>
          <Button
            color="danger"
            onClick={handleDelete}
            loading={deleteOrderMutation.isPending}
          >
            Supprimer
          </Button>
        </AppModalFooter>
      }
    >
      <Text>
        Êtes-vous sûr de vouloir supprimer la commande{' '}
        <strong>{orderToDelete?.name}</strong> ?
      </Text>
    </AppModal>
  );
}
