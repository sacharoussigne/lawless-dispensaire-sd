'use client';

import { useEffect } from 'react';
import {
  Modal,
  Stack,
  TextInput,
  Textarea,
  Button,
  Group,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { createChest, updateChest } from '@/app/_actions/chests';
import { handleAction } from '@/lib/action';
import { handleApiZodError } from '@/lib/services/zod';
import { ParsedZodError } from '@/lib/errors/ParsedZodError';
import type { ChestWithStockHistory } from '@/types/chests';

interface ChestModalProps {
  opened: boolean;
  onClose: () => void;
  editingChest: ChestWithStockHistory | null;
  onSuccess: () => void;
}

export function ChestModal({
  opened,
  onClose,
  editingChest,
  onSuccess,
}: ChestModalProps) {
  const form = useForm({
    initialValues: {
      name: '',
      description: '',
    },
    validate: {
      name: (value) => (value.length < 1 ? 'Le nom est requis' : null),
    },
  });

  // Initialiser le formulaire quand le coffre change
  useEffect(() => {
    if (editingChest) {
      form.setValues({
        name: editingChest.name,
        description: editingChest.description || '',
      });
    } else {
      form.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingChest, opened]);

  const handleSubmit = async (values: typeof form.values) => {
    try {
      let result;
      if (editingChest) {
        result = await updateChest({
          id: editingChest.id,
          name: values.name,
          description: values.description || undefined,
        });
      } else {
        result = await createChest({
          name: values.name,
          description: values.description || undefined,
        });
      }

      handleAction(result);
      notifications.show({
        title: 'Succès',
        message: editingChest
          ? 'Coffre modifié avec succès'
          : 'Coffre créé avec succès',
        color: 'green',
      });
      onClose();
      form.reset();
      onSuccess();
    } catch (error: any) {
      if (error instanceof ParsedZodError) {
        handleApiZodError(error.error, form);
      } else {
        notifications.show({
          title: 'Erreur',
          message: error.message || 'Erreur lors de la sauvegarde',
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
      title={editingChest ? 'Modifier le coffre' : 'Créer un coffre'}
      size="md"
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
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
          <Group justify="flex-end" mt="md">
            <Button
              variant="subtle"
              onClick={() => {
                onClose();
                form.reset();
              }}
            >
              Annuler
            </Button>
            <Button type="submit">
              {editingChest ? 'Modifier' : 'Créer'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
