'use client';

import { usePermissions } from '@/app/_contexts/PermissionsContext';
import { useEffect } from 'react';
import { Modal, Stack, TextInput, Button, Group } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { updateBankAccount } from '@/app/_actions/bankAccounts';
import { handleAction } from '@/lib/action';
import { ParsedZodError } from '@/lib/errors/ParsedZodError';
import { handleApiZodError } from '@/lib/services/zod';
import type { BankAccountWithRelations } from '@/types/bankAccounts';

interface EditBankAccountModalProps {
  opened: boolean;
  onClose: () => void;
  editingAccount: BankAccountWithRelations | null;
  onSuccess: () => void;
}

export function EditBankAccountModal({
  opened,
  onClose,
  editingAccount,
  onSuccess,
}: EditBankAccountModalProps) {
  const { dispensarySlug } = usePermissions();
  const form = useForm({
    initialValues: {
      name: '',
    },
    validate: {
      name: (value) => (value.length < 1 ? 'Le nom est requis' : null),
    },
  });

  useEffect(() => {
    if (editingAccount) {
      form.setValues({
        name: editingAccount.name,
      });
    }
  }, [editingAccount]);

  const handleSubmit = async (values: typeof form.values) => {
    if (!editingAccount) return;

    try {
      const result = await updateBankAccount(dispensarySlug!, {
        id: editingAccount.id,
        name: values.name,
      });

      const data = handleAction(result);
      if (data) {
        notifications.show({
          title: 'Succès',
          message: 'Compte bancaire modifié avec succès',
          color: 'green',
        });
        onClose();
        form.reset();
        onSuccess();
      }
    } catch (error: any) {
      if (error instanceof ParsedZodError) {
        handleApiZodError(error.error, form);
      } else {
        notifications.show({
          title: 'Erreur',
          message: error.message || 'Erreur lors de la modification du compte',
          color: 'red',
        });
      }
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={() => {
        onClose();
        form.reset();
      }}
      title="Modifier le compte bancaire"
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <TextInput
            label="Nom du compte"
            placeholder="Ex: Compte principal"
            required
            {...form.getInputProps('name')}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit">Enregistrer</Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
