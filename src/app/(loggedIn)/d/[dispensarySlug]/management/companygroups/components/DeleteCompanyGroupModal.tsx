'use client';

import { Button, Text } from '@mantine/core';
import type { CompanyGroupWithRelations } from '@/types/companyGroups';
import { AppModal, AppModalFooter } from '@/app/_components/AppModal/AppModal';
import type { useDeleteCompanyGroupMutation } from '../hooks/useCompanyGroupsQueries';

interface DeleteCompanyGroupModalProps {
  opened: boolean;
  onClose: () => void;
  companyGroupToDelete: CompanyGroupWithRelations | null;
  deleteMutation: ReturnType<typeof useDeleteCompanyGroupMutation>;
}

export function DeleteCompanyGroupModal({
  opened,
  onClose,
  companyGroupToDelete,
  deleteMutation,
}: DeleteCompanyGroupModalProps) {
  const handleDelete = async () => {
    if (!companyGroupToDelete) return;

    try {
      await deleteMutation.mutateAsync({ id: companyGroupToDelete.id });
      onClose();
    } catch {
      // Error notification handled by mutation
    }
  };

  const itemCount = companyGroupToDelete?._count.items ?? 0;
  const companyCount = companyGroupToDelete?.companies.length ?? 0;

  return (
    <AppModal
      opened={opened}
      onClose={onClose}
      title="Confirmer la suppression"
      size="md"
      footer={
        <AppModalFooter>
          <Button variant="subtle" color="slate" onClick={onClose}>
            Annuler
          </Button>
          <Button color="danger" onClick={handleDelete} loading={deleteMutation.isPending}>
            Supprimer
          </Button>
        </AppModalFooter>
      }
    >
      <Text>
        Êtes-vous sûr de vouloir supprimer le groupe d&apos;entreprises{' '}
        <strong>{companyGroupToDelete?.name}</strong> ?
        {(itemCount > 0 || companyCount > 0) && (
          <Text c="danger" size="sm" mt="xs">
            Attention : Ce groupe d&apos;entreprises contient {itemCount} objet(s) et{' '}
            {companyCount} entreprise(s).
          </Text>
        )}
      </Text>
    </AppModal>
  );
}
