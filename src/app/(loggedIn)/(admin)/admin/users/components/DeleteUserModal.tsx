'use client';

import { Modal, Stack, Button, Group, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { deleteUser } from '@/app/_actions/users';
import { handleAction } from '@/lib/action';
import type { User } from '@/types/users';

interface DeleteUserModalProps {
  opened: boolean;
  onClose: () => void;
  userToDelete: User | null;
  onSuccess: () => void;
}

export function DeleteUserModal({
  opened,
  onClose,
  userToDelete,
  onSuccess,
}: DeleteUserModalProps) {
  const handleDelete = async () => {
    if (!userToDelete) return;

    try {
      const result = await deleteUser({ id: userToDelete.id });
      handleAction(result);
      notifications.show({
        title: 'Succès',
        message: 'Utilisateur supprimé avec succès',
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
    <Modal opened={opened} onClose={onClose} title="Supprimer l'utilisateur">
      <Stack gap="md">
        <Text>
          Êtes-vous sûr de vouloir supprimer l'utilisateur{' '}
          <strong>{userToDelete?.name}</strong> ({userToDelete?.email}) ?
        </Text>
        <Text size="sm" c="red">
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

