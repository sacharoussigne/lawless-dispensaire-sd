'use client';

import { useRequiredDispensarySlug } from '@/app/_contexts/PermissionsContext';
import { Modal, Stack, TextInput, Button, Group } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { createBankAccount } from '@/app/_actions/bankAccounts';
import { handleAction } from '@/lib/action';
import { ParsedZodError } from '@/lib/errors/ParsedZodError';
import { handleApiZodError } from '@/lib/services/zod';

interface CreateBankAccountModalProps {
  opened: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateBankAccountModal({
  opened,
  onClose,
  onSuccess,
}: CreateBankAccountModalProps) {
  const dispensarySlug = useRequiredDispensarySlug();
  const form = useForm({
    initialValues: {
      name: '',
    },
    validate: {
      name: (value) => (value.length < 1 ? 'Le nom est requis' : null),
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    try {
      const result = await createBankAccount(dispensarySlug, {
        name: values.name,
      });

      const data = handleAction(result);
      if (data) {
        notifications.show({
          title: 'Succès',
          message: 'Compte bancaire créé avec succès',
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
          message: error.message || 'Erreur lors de la création du compte',
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
      title="Créer un compte bancaire"
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
            <Button type="submit">Créer</Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
