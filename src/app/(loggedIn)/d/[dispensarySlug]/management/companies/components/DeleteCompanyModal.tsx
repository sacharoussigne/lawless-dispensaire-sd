'use client';

import { usePermissions } from '@/app/_contexts/PermissionsContext';
import { Modal, Stack, Button, Group, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { deleteCompany } from '@/app/_actions/companies';
import { handleAction } from '@/lib/action';
import type { CompanyWithRelations } from '@/types/companies';

interface DeleteCompanyModalProps {
  opened: boolean;
  onClose: () => void;
  companyToDelete: CompanyWithRelations | null;
  onSuccess: () => void;
}

export function DeleteCompanyModal({
  opened,
  onClose,
  companyToDelete,
  onSuccess,
}: DeleteCompanyModalProps) {
  const { dispensarySlug } = usePermissions();
  const handleDelete = async () => {
    if (!companyToDelete) return;

    try {
      const result = await deleteCompany(dispensarySlug!, { id: companyToDelete.id });
      handleAction(result);
      notifications.show({
        title: 'Succès',
        message: 'Entreprise supprimée avec succès',
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
          Êtes-vous sûr de vouloir supprimer l'entreprise{' '}
          <strong>{companyToDelete?.name}</strong> ?
          {companyToDelete && companyToDelete.companyGroups.length > 0 && (
            <Text c="red" size="sm" mt="xs">
              Attention : Cette entreprise contient {companyToDelete.companyGroups.length} groupe(s) d'entreprises.
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

