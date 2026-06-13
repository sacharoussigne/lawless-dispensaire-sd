'use client';

import { useEffect } from 'react';
import { Stack, TextInput, Textarea, Switch, Button } from '@mantine/core';
import { useForm } from '@mantine/form';
import { handleApiZodError } from '@/lib/services/zod';
import { ParsedZodError } from '@/lib/errors/ParsedZodError';
import type { ChestWithStockHistory } from '@/types/chests';
import { AppModal, AppModalFooter } from '@/app/_components/AppModal/AppModal';
import type {
  useCreateChestMutation,
  useUpdateChestMutation,
} from '../hooks/useChestsQueries';

interface ChestModalProps {
  opened: boolean;
  onClose: () => void;
  editingChest: ChestWithStockHistory | null;
  createMutation: ReturnType<typeof useCreateChestMutation>;
  updateMutation: ReturnType<typeof useUpdateChestMutation>;
}

export function ChestModal({
  opened,
  onClose,
  editingChest,
  createMutation,
  updateMutation,
}: ChestModalProps) {
  const form = useForm({
    initialValues: {
      name: '',
      description: '',
      isEnabled: true,
    },
    validate: {
      name: (value) => (value.length < 1 ? 'Le nom est requis' : null),
    },
  });

  useEffect(() => {
    if (editingChest) {
      form.setValues({
        name: editingChest.name,
        description: editingChest.description || '',
        isEnabled: editingChest.isEnabled ?? true,
      });
    } else {
      form.reset();
    }
  }, [editingChest, opened]);

  const isPending = createMutation.isPending || updateMutation.isPending;
  const formId = 'chest-modal-form';

  const handleSubmit = async (values: typeof form.values) => {
    try {
      const payload = {
        name: values.name,
        description: values.description || undefined,
        isEnabled: values.isEnabled,
      };

      if (editingChest) {
        await updateMutation.mutateAsync({ id: editingChest.id, ...payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      onClose();
      form.reset();
    } catch (error: unknown) {
      if (error instanceof ParsedZodError) {
        handleApiZodError(error.error, form);
      }
    }
  };

  return (
    <AppModal
      opened={opened}
      onClose={() => {
        onClose();
        form.reset();
      }}
      title={editingChest ? 'Modifier le coffre' : 'Créer un coffre'}
      size="md"
      footer={
        <AppModalFooter>
          <Button
            variant="subtle"
            color="slate"
            onClick={() => {
              onClose();
              form.reset();
            }}
          >
            Annuler
          </Button>
          <Button type="submit" form={formId} loading={isPending}>
            {editingChest ? 'Modifier' : 'Créer'}
          </Button>
        </AppModalFooter>
      }
    >
      <form id={formId} onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <TextInput
            label="Nom"
            placeholder="Nom du coffre"
            required
            {...form.getInputProps('name')}
          />
          <Textarea
            label="Description"
            placeholder="Description du coffre (optionnel)"
            rows={4}
            {...form.getInputProps('description')}
          />
          <Switch
            label="Coffre activé"
            description="Un coffre désactivé ne sera pas disponible dans les sélections"
            {...form.getInputProps('isEnabled', { type: 'checkbox' })}
          />
        </Stack>
      </form>
    </AppModal>
  );
}
