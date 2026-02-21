'use client';

import { Modal, Stack, Text, Button, Group } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { deleteBankAccount } from '@/app/_actions/bankAccounts';
import { handleAction } from '@/lib/action';
import type { BankAccountWithRelations } from '@/types/bankAccounts';

interface DeleteBankAccountModalProps {
  opened: boolean;
  onClose: () => void;
  accountToDelete: BankAccountWithRelations | null;
  onSuccess: () => void;
}

export function DeleteBankAccountModal({
  opened,
  onClose,
  accountToDelete,
  onSuccess,
}: DeleteBankAccountModalProps) {
  const handleDelete = async () => {
    if (!accountToDelete) return;

    try {
      const result = await deleteBankAccount({
        id: accountToDelete.id,
      });

      const data = handleAction(result);
      if (data) {
        notifications.show({
          title: 'Succès',
          message: 'Compte bancaire supprimé avec succès',
          color: 'green',
        });
        onClose();
        onSuccess();
      }
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors de la suppression du compte',
        color: 'red',
      });
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Supprimer le compte bancaire"
    >
      <Stack gap="md">
        <Text>
          Êtes-vous sûr de vouloir supprimer le compte "{accountToDelete?.name}" ?
          Cette action est irréversible.
        </Text>

        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onClose}>
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
