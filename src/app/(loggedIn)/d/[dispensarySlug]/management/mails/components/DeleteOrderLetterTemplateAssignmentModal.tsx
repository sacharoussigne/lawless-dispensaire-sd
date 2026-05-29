'use client';

import { usePermissions } from '@/app/_contexts/PermissionsContext';
import { Modal, Text, Button, Group, Stack } from '@mantine/core';
import { deleteOrderLetterTemplateAssignment } from '@/app/_actions/orderLetterTemplateAssignments';
import { handleAction } from '@/lib/action';
import { notifications } from '@mantine/notifications';
import type { OrderMailTemplateAssignment } from '@prisma/client';
import { getOrderTypeLabel } from '@/types/enum/orderType';
import { getOrderStatusLabel } from '@/types/enum/orderStatus';

interface OrderMailTemplateAssignmentWithTemplate extends OrderMailTemplateAssignment {
  mailTemplate: {
    id: string;
    name: string;
  };
}

interface DeleteOrderLetterTemplateAssignmentModalProps {
  opened: boolean;
  onClose: () => void;
  assignmentToDelete: OrderMailTemplateAssignmentWithTemplate | null;
  onSuccess: () => void;
}

export function DeleteOrderLetterTemplateAssignmentModal({
  opened,
  onClose,
  assignmentToDelete,
  onSuccess,
}: DeleteOrderLetterTemplateAssignmentModalProps) {
  const { dispensarySlug } = usePermissions();
  const handleDelete = async () => {
    if (!assignmentToDelete) return;

    try {
      const result = await deleteOrderLetterTemplateAssignment(dispensarySlug!, {
        id: assignmentToDelete.id,
      });

      const data = handleAction(result);
      if (data) {
        notifications.show({
          title: 'Succès',
          message: 'Assignation supprimée avec succès',
          color: 'green',
        });
        onSuccess();
        onClose();
      }
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors de la suppression de l\'assignation',
        color: 'red',
      });
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
