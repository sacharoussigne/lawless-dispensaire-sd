'use client';

import { Button, Text } from '@mantine/core';
import type { CompanyWithRelations } from '@/types/companies';
import { AppModal, AppModalFooter } from '@/app/_components/AppModal/AppModal';
import type { useDeleteCompanyMutation } from '../hooks/useCompaniesQueries';

interface DeleteCompanyModalProps {
  opened: boolean;
  onClose: () => void;
  companyToDelete: CompanyWithRelations | null;
  deleteMutation: ReturnType<typeof useDeleteCompanyMutation>;
}

export function DeleteCompanyModal({
  opened,
  onClose,
  companyToDelete,
  deleteMutation,
}: DeleteCompanyModalProps) {
  const handleDelete = async () => {
    if (!companyToDelete) return;

    try {
      await deleteMutation.mutateAsync({ id: companyToDelete.id });
      onClose();
    } catch {
      // Error notification handled by mutation
    }
  };

  const groupCount = companyToDelete?._count.companyGroups ?? 0;
  const orderCount = companyToDelete?._count.orders ?? 0;

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
        Êtes-vous sûr de vouloir supprimer l&apos;entreprise{' '}
        <strong>{companyToDelete?.name}</strong> ?
        {groupCount > 0 && (
          <Text c="danger" size="sm" mt="xs">
            Attention : Cette entreprise est membre de {groupCount} groupe(s) d&apos;entreprises.
          </Text>
        )}
        {orderCount > 0 && (
          <Text c="danger" size="sm" mt="xs">
            Attention : {orderCount} commande(s) liée(s) à cette entreprise seront supprimées.
          </Text>
        )}
      </Text>
    </AppModal>
  );
}
