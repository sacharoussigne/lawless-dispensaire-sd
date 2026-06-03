'use client';

import { usePermissions } from '@/app/_contexts/PermissionsContext';
import { Modal, Text, Button, Group, Stack } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { deleteMail } from '@/app/_actions/mails';
import { handleAction } from '@/lib/action';
import type { Mail } from '@prisma/client';

interface DeleteMailModalProps {
  opened: boolean;
  onClose: () => void;
  mailToDelete: Mail | null;
  onSuccess: () => void;
}

export function DeleteMailModal({
  opened,
  onClose,
  mailToDelete,
  onSuccess,
}: DeleteMailModalProps) {
  const { dispensarySlug } = usePermissions();
  const handleDelete = async () => {
    if (!mailToDelete) return;

    try {
      const result = await deleteMail(dispensarySlug!, { id: mailToDelete.id });
      handleAction(result);
      notifications.show({
        title: 'Succès',
        message: 'Courrier supprimé avec succès',
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

  if (!mailToDelete) return null;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Supprimer le courrier"
      centered
    >
      <Stack gap="md">
        <Text>
          Êtes-vous sûr de vouloir supprimer le courrier &quot;{mailToDelete.name}&quot; ?
        </Text>
        <Text size="sm" c="dimmed">
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
