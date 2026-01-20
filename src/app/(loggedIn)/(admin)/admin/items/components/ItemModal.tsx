'use client';

import { useEffect } from 'react';
import {
  Modal,
  Stack,
  TextInput,
  Textarea,
  NumberInput,
  Select,
  Switch,
  Button,
  Group,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { createItem, updateItem } from '@/app/_actions/items';
import { handleAction } from '@/lib/action';
import { handleApiZodError } from '@/lib/services/zod';
import { ParsedZodError } from '@/lib/errors/ParsedZodError';
import type { ItemWithRelations, CategoryItem, CompanyGroup } from '@/types/items';

interface ItemModalProps {
  opened: boolean;
  onClose: () => void;
  editingItem: ItemWithRelations | null;
  categoryItems: CategoryItem[];
  companyGroups: CompanyGroup[];
  onSuccess: () => void;
}

export function ItemModal({
  opened,
  onClose,
  editingItem,
  categoryItems,
  companyGroups,
  onSuccess,
}: ItemModalProps) {
  const form = useForm({
    initialValues: {
      name: '',
      description: '',
      idealQuantity: 0,
      isCraftable: false,
      categoryId: '',
      companyGroupId: '',
    },
    validate: {
      name: (value) => (value.length < 1 ? 'Le nom est requis' : null),
      idealQuantity: (value) =>
        value < 0 ? 'La quantité idéale doit être positive' : null,
      categoryId: (value) => (!value ? 'La catégorie est requise' : null),
    },
  });

  // Réinitialiser companyGroupId si isCraftable devient true
  useEffect(() => {
    if (form.values.isCraftable && form.values.companyGroupId) {
      form.setFieldValue('companyGroupId', '');
    }
  }, [form.values.isCraftable]);

  // Initialiser le formulaire quand l'item change
  useEffect(() => {
    if (editingItem) {
      form.setValues({
        name: editingItem.name,
        description: editingItem.description || '',
        idealQuantity: editingItem.idealQuantity,
        isCraftable: editingItem.isCraftable,
        categoryId: editingItem.categoryId || '',
        companyGroupId: editingItem.companyGroupId || '',
      });
    } else {
      form.reset();
    }
  }, [editingItem, opened]);

  const handleSubmit = async (values: typeof form.values) => {
    try {
      let result;
      // Si l'item est craftable, on force companyGroupId à null
      const companyGroupId = values.isCraftable
        ? undefined
        : values.companyGroupId || undefined;

      if (editingItem) {
        result = await updateItem({
          id: editingItem.id,
          name: values.name,
          description: values.description || undefined,
          idealQuantity: values.idealQuantity,
          isCraftable: values.isCraftable,
          categoryId: values.categoryId,
          companyGroupId,
        });
      } else {
        result = await createItem({
          name: values.name,
          description: values.description || undefined,
          idealQuantity: values.idealQuantity,
          isCraftable: values.isCraftable,
          categoryId: values.categoryId,
          companyGroupId,
        });
      }

      handleAction(result);
      notifications.show({
        title: 'Succès',
        message: editingItem
          ? 'Objet modifié avec succès'
          : 'Objet créé avec succès',
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

  const categoryOptions = [...categoryItems]
    .sort((a, b) => {
      if (a.order !== undefined && b.order !== undefined) {
        return a.order - b.order;
      }
      if (a.order !== undefined) return -1;
      if (b.order !== undefined) return 1;
      return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });
    })
    .map((category) => ({
      value: category.id,
      label: category.name,
    }));

  const companyGroupOptions = [...companyGroups]
    .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }))
    .map((group) => ({
      value: group.id,
      label: group.name,
    }));

  return (
    <Modal
      opened={opened}
      onClose={() => {
        onClose();
        form.reset();
      }}
      title={editingItem ? "Modifier l'objet" : 'Créer un objet'}
      size="md"
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <TextInput
            label="Nom"
            placeholder="Nom de l'objet"
            required
            {...form.getInputProps('name')}
          />
          <Textarea
            label="Description"
            placeholder="Description de l'objet (optionnel)"
            rows={4}
            {...form.getInputProps('description')}
          />
          <NumberInput
            label="Quantité idéale"
            placeholder="Quantité idéale"
            required
            min={0}
            {...form.getInputProps('idealQuantity')}
          />
          <Select
            label="Catégorie"
            placeholder="Sélectionner une catégorie"
            data={categoryOptions}
            required
            searchable
            {...form.getInputProps('categoryId')}
          />
          <Switch
            label="Peut être crafté"
            {...form.getInputProps('isCraftable', { type: 'checkbox' })}
          />
          {!form.values.isCraftable && (
            <Select
              label="Groupe d'entreprises"
              placeholder="Sélectionner un groupe d'entreprises (optionnel)"
              data={companyGroupOptions}
              clearable
              searchable
              {...form.getInputProps('companyGroupId')}
            />
          )}
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
              {editingItem ? 'Modifier' : 'Créer'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

