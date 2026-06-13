'use client';

import { Modal, Text, Button, Group, Stack } from '@mantine/core';
import { getOrderTypeLabel } from '@/types/enum/orderType';
import { getOrderStatusLabel } from '@/types/enum/orderStatus';
import type {
  OrderLetterTemplateAssignmentWithTemplate,
  useDeleteOrderLetterAssignmentMutation,
} from '../hooks/useMailTemplatesQueries';

interface DeleteOrderLetterTemplateAssignmentModalProps {
  opened: boolean;
  onClose: () => void;
  assignmentToDelete: OrderLetterTemplateAssignmentWithTemplate | null;
  deleteMutation: ReturnType<typeof useDeleteOrderLetterAssignmentMutation>;
}

export function DeleteOrderLetterTemplateAssignmentModal({
  opened,
  onClose,
  assignmentToDelete,
  deleteMutation,
}: DeleteOrderLetterTemplateAssignmentModalProps) {
  const handleDelete = async () => {
    if (!assignmentToDelete) return;

    try {
      await deleteMutation.mutateAsync({ id: assignmentToDelete.id });
      onClose();
    } catch {
      // Error notification handled by mutation
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Supprimer l'assignation"
      size="md"
    >
      <Stack>
        <Text>
          Êtes-vous sûr de vouloir supprimer l'assignation pour :
        </Text>
        {assignmentToDelete && (
          <Text fw={500}>
            Type : {getOrderTypeLabel(assignmentToDelete.orderType)} - Statut :{' '}
            {getOrderStatusLabel(assignmentToDelete.orderStatus)}
          </Text>
        )}
        <Text c="dimmed" size="sm">
          Cette action est irréversible.
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
