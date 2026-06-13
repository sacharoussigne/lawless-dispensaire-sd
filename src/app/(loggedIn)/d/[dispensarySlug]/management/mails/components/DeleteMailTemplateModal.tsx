'use client';

import { Modal, Stack, Button, Group, Text } from '@mantine/core';
import type { MailTemplateListItem } from '@/types/mailTemplates';
import type { useDeleteMailTemplateMutation } from '../hooks/useMailTemplatesQueries';

interface DeleteMailTemplateModalProps {
  opened: boolean;
  onClose: () => void;
  mailTemplateToDelete: MailTemplateListItem | null;
  deleteMutation: ReturnType<typeof useDeleteMailTemplateMutation>;
}

export function DeleteMailTemplateModal({
  opened,
  onClose,
  mailTemplateToDelete,
  deleteMutation,
}: DeleteMailTemplateModalProps) {
  const handleDelete = async () => {
    if (!mailTemplateToDelete) return;

    try {
      await deleteMutation.mutateAsync({ id: mailTemplateToDelete.id });
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
          Êtes-vous sûr de vouloir supprimer le template{' '}
          <strong>{mailTemplateToDelete?.name}</strong> ?
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
