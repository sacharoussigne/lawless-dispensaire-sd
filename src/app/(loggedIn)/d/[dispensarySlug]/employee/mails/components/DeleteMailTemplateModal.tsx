'use client';

import { Modal, Stack, Button, Group, Text } from '@mantine/core';
import type { MailTemplateListItem } from '@/types/mails';
import { useDeleteUserMailTemplateMutation } from '../hooks/useMailsQueries';

interface DeleteMailTemplateModalProps {
  opened: boolean;
  onClose: () => void;
  mailTemplateToDelete: MailTemplateListItem | null;
}

export function DeleteMailTemplateModal({
  opened,
  onClose,
  mailTemplateToDelete,
}: DeleteMailTemplateModalProps) {
  const deleteMutation = useDeleteUserMailTemplateMutation();

  const handleDelete = async () => {
    if (!mailTemplateToDelete) return;

    await deleteMutation.mutateAsync({ id: mailTemplateToDelete.id });
    onClose();
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
          Êtes-vous sûr de vouloir supprimer le template{' '}
          <strong>{mailTemplateToDelete?.name}</strong> ?
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
