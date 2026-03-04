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
import { notifications } from '@mantine/notifications';
import { createCategoryItem, updateCategoryItem } from '@/app/_actions/categoryItems';
import { handleAction } from '@/lib/action';
import { handleApiZodError } from '@/lib/services/zod';
import { ParsedZodError } from '@/lib/errors/ParsedZodError';
import type { CategoryItemWithItems } from '@/types/categoryItems';

interface CategoryItemModalProps {
  opened: boolean;
  onClose: () => void;
  editingCategoryItem: CategoryItemWithItems | null;
  onSuccess: () => void;
}

export function CategoryItemModal({
  opened,
  onClose,
  editingCategoryItem,
  onSuccess,
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

  // Initialiser le formulaire quand la catégorie change
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
      let result;
      if (editingCategoryItem) {
        result = await updateCategoryItem({
          id: editingCategoryItem.id,
          name: values.name,
          color: values.color || '#ffffff',
        });
      } else {
        result = await createCategoryItem({
          name: values.name,
          color: values.color || '#ffffff',
        });
      }

      handleAction(result);
      notifications.show({
        title: 'Succès',
        message: editingCategoryItem
          ? 'Catégorie d\'objet modifiée avec succès'
          : 'Catégorie d\'objet créée avec succès',
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
              onClick={() => {
                onClose();
                form.reset();
              }}
            >
              Annuler
            </Button>
            <Button type="submit">
              {editingCategoryItem ? 'Modifier' : 'Créer'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

