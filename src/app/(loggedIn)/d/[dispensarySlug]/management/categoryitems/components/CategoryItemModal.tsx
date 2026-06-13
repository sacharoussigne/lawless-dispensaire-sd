'use client';

import { useEffect } from 'react';
import {
  Modal,
  Stack,
  TextInput,
  ColorInput,
  Button,
  Group,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { handleApiZodError } from '@/lib/services/zod';
import { ParsedZodError } from '@/lib/errors/ParsedZodError';
import type { CategoryItemWithCount } from '@/types/categoryItems';
import type {
  useCreateCategoryItemMutation,
  useUpdateCategoryItemMutation,
} from '../hooks/useCategoryItemsQueries';

interface CategoryItemModalProps {
  opened: boolean;
  onClose: () => void;
  editingCategoryItem: CategoryItemWithCount | null;
  createMutation: ReturnType<typeof useCreateCategoryItemMutation>;
  updateMutation: ReturnType<typeof useUpdateCategoryItemMutation>;
}

export function CategoryItemModal({
  opened,
  onClose,
  editingCategoryItem,
  createMutation,
  updateMutation,
}: CategoryItemModalProps) {
  const form = useForm({
    initialValues: {
      name: '',
      color: '#ffffff',
    },
    validate: {
      name: (value) => (value.length < 1 ? 'Le nom est requis' : null),
      color: (value) => (!value || value.length < 1 ? 'La couleur est requise' : null),
    },
  });

  useEffect(() => {
    if (editingCategoryItem) {
      form.setValues({
        name: editingCategoryItem.name,
        color: editingCategoryItem.color || '#ffffff',
      });
    } else {
      form.reset();
    }
  }, [editingCategoryItem, opened]);

  const handleSubmit = async (values: typeof form.values) => {
    try {
      if (editingCategoryItem) {
        await updateMutation.mutateAsync({
          id: editingCategoryItem.id,
          name: values.name,
          color: values.color || '#ffffff',
        });
      } else {
        await createMutation.mutateAsync({
          name: values.name,
          color: values.color || '#ffffff',
        });
      }
      onClose();
      form.reset();
    } catch (error: unknown) {
      if (error instanceof ParsedZodError) {
        handleApiZodError(error.error, form);
      }
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      opened={opened}
      onClose={() => {
        onClose();
        form.reset();
      }}
      title={editingCategoryItem ? 'Modifier la catégorie d\'objet' : 'Créer une catégorie d\'objet'}
      size="md"
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <TextInput
            label="Nom"
            placeholder="Nom de la catégorie d'objet"
            required
            {...form.getInputProps('name')}
          />
          <ColorInput
            label="Couleur"
            placeholder="Sélectionner une couleur"
            format="hex"
            required
            {...form.getInputProps('color')}
          />
          <Group justify="flex-end" mt="md">
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
            <Button type="submit" loading={isPending}>
              {editingCategoryItem ? 'Modifier' : 'Créer'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
