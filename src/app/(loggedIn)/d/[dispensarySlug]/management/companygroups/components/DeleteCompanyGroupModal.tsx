'use client';

import { usePermissions } from '@/app/_contexts/PermissionsContext';
import { Modal, Stack, Button, Group, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { deleteCompanyGroup } from '@/app/_actions/companyGroups';
import { handleAction } from '@/lib/action';
import type { CompanyGroupWithRelations } from '@/types/companyGroups';

interface DeleteCompanyGroupModalProps {
  opened: boolean;
  onClose: () => void;
  companyGroupToDelete: CompanyGroupWithRelations | null;
  onSuccess: () => void;
}

export function DeleteCompanyGroupModal({
  opened,
  onClose,
  companyGroupToDelete,
  onSuccess,
}: DeleteCompanyGroupModalProps) {
  const { dispensarySlug } = usePermissions();
  const handleDelete = async () => {
    if (!companyGroupToDelete) return;

    try {
      const result = await deleteCompanyGroup(dispensarySlug!, { id: companyGroupToDelete.id });
      handleAction(result);
      notifications.show({
        title: 'Succès',
        message: 'Groupe d\'entreprises supprimé avec succès',
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
          Êtes-vous sûr de vouloir supprimer le groupe d'entreprises{' '}
          <strong>{companyGroupToDelete?.name}</strong> ?
          {companyGroupToDelete &&
            (companyGroupToDelete.items.length > 0 ||
              companyGroupToDelete.companies.length > 0) && (
              <Text c="red" size="sm" mt="xs">
                Attention : Ce groupe d'entreprises contient{' '}
                {companyGroupToDelete.items.length} item(s) et{' '}
                {companyGroupToDelete.companies.length} entreprise(s).
              </Text>
            )}
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

