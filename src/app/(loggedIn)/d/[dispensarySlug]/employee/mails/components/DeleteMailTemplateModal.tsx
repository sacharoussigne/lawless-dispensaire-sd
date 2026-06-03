'use client';

import { usePermissions } from '@/app/_contexts/PermissionsContext';
import { Modal, Stack, Button, Group, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { deleteUserMailTemplate } from '@/app/_actions/mailTemplates';
import { handleAction } from '@/lib/action';
import type { MailTemplate } from '@/types/mailTemplates';

interface DeleteMailTemplateModalProps {
  opened: boolean;
  onClose: () => void;
  mailTemplateToDelete: MailTemplate | null;
  onSuccess: () => void;
}

export function DeleteMailTemplateModal({
  opened,
  onClose,
  mailTemplateToDelete,
  onSuccess,
}: DeleteMailTemplateModalProps) {
  const { dispensarySlug } = usePermissions();
  const handleDelete = async () => {
    if (!mailTemplateToDelete) return;

    try {
      const result = await deleteUserMailTemplate(dispensarySlug!, { id: mailTemplateToDelete.id });
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
          <strong>{mailTemplateToDelete?.name}</strong> ?
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
