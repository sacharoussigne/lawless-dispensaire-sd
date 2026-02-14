'use client';

import { Modal, Stack, Button, Group, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { deleteLetterTemplate } from '@/app/_actions/letterTemplates';
import { handleAction } from '@/lib/action';
import type { LetterTemplate } from '@/types/letterTemplates';

interface DeleteLetterTemplateModalProps {
  opened: boolean;
  onClose: () => void;
  letterTemplateToDelete: LetterTemplate | null;
  onSuccess: () => void;
}

export function DeleteLetterTemplateModal({
  opened,
  onClose,
  letterTemplateToDelete,
  onSuccess,
}: DeleteLetterTemplateModalProps) {
  const handleDelete = async () => {
    if (!letterTemplateToDelete) return;

    try {
      const result = await deleteLetterTemplate({ id: letterTemplateToDelete.id });
      handleAction(result);
      notifications.show({
        title: 'Succès',
        message: 'Template supprimé avec succès',
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
          Êtes-vous sûr de vouloir supprimer le template{' '}
          <strong>{letterTemplateToDelete?.name}</strong> ?
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
