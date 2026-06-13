'use client';

import { Modal, Stack, Button, Group, Text } from '@mantine/core';
import type { MailListItem } from '@/types/mails';
import { useDeleteMailMutation } from '../hooks/useMailsQueries';

interface DeleteMailModalProps {
  opened: boolean;
  onClose: () => void;
  mailToDelete: MailListItem | null;
}

export function DeleteMailModal({
  opened,
  onClose,
  mailToDelete,
}: DeleteMailModalProps) {
  const deleteMutation = useDeleteMailMutation();

  const handleDelete = async () => {
    if (!mailToDelete) return;

    await deleteMutation.mutateAsync({ id: mailToDelete.id });
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Supprimer le courrier"
      centered
    >
      <Stack gap="md">
        <Text>
          Êtes-vous sûr de vouloir supprimer le courrier &quot;{mailToDelete?.name}&quot; ?
        </Text>
        <Text size="sm" c="dimmed">
          Cette action est irréversible.
        </Text>
        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={onClose}>
            Annuler
          </Button>
          <Button
            color="danger"
            onClick={handleDelete}
            loading={deleteMutation.isPending}
          >
            Supprimer
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
