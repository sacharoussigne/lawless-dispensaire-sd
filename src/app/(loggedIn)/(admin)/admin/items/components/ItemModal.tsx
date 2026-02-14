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
      isEnabled: true,
      canBeSold: false,
      price: null as number | null,
      categoryId: '',
      companyGroupId: '',
    },
    validate: {
      name: (value) => (value.length < 1 ? 'Le nom est requis' : null),
      idealQuantity: (value) =>
        value < 0 ? 'La quantité idéale doit être positive' : null,
      categoryId: (value) => (!value ? 'La catégorie est requise' : null),
      price: (value, values) => {
        // Le prix peut être défini si canBeSold est activé OU si l'item n'est pas craftable
        const canHavePrice = values.canBeSold || !values.isCraftable;
        if (canHavePrice && (value === null || value === undefined || value <= 0)) {
          return 'Le prix est requis et doit être positif';
        }
        return null;
      },
    },
  });

  // Réinitialiser companyGroupId si isCraftable devient true
  useEffect(() => {
    if (form.values.isCraftable && form.values.companyGroupId) {
      form.setFieldValue('companyGroupId', '');
    }
  }, [form.values.isCraftable]);

  // Réinitialiser le prix si ni canBeSold ni !isCraftable
  useEffect(() => {
    const canHavePrice = form.values.canBeSold || !form.values.isCraftable;
    if (!canHavePrice && form.values.price !== null) {
      form.setFieldValue('price', null);
    }
  }, [form.values.canBeSold, form.values.isCraftable]);

  // Initialiser le formulaire quand l'item change
  useEffect(() => {
    if (editingItem) {
      form.setValues({
        name: editingItem.name,
        description: editingItem.description || '',
        idealQuantity: editingItem.idealQuantity,
        isCraftable: editingItem.isCraftable,
        isEnabled: editingItem.isEnabled ?? true,
        canBeSold: editingItem.canBeSold ?? false,
        price: editingItem.price ? Number(editingItem.price) : null,
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

      // Le prix peut être défini si canBeSold est activé OU si l'item n'est pas craftable
      const canHavePrice = values.canBeSold || !values.isCraftable;
      const priceToSave = canHavePrice ? values.price : null;

      if (editingItem) {
        result = await updateItem({
          id: editingItem.id,
          name: values.name,
          description: values.description || undefined,
          idealQuantity: values.idealQuantity,
          isCraftable: values.isCraftable,
          isEnabled: values.isEnabled,
          canBeSold: values.canBeSold,
          price: priceToSave,
          categoryId: values.categoryId,
          companyGroupId,
        });
      } else {
        result = await createItem({
          name: values.name,
          description: values.description || undefined,
          idealQuantity: values.idealQuantity,
          isCraftable: values.isCraftable,
          isEnabled: values.isEnabled,
          canBeSold: values.canBeSold,
          price: priceToSave,
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
          <Switch
            label="Activé"
            description="Si désactivé, l'objet ne sera pas visible dans la page de stock"
            {...form.getInputProps('isEnabled', { type: 'checkbox' })}
          />
          <Switch
            label="Peut être vendu"
            description="Si activé, cet objet peut être vendu dans les commandes"
            {...form.getInputProps('canBeSold', { type: 'checkbox' })}
          />
          {(form.values.canBeSold || !form.values.isCraftable) && (
            <NumberInput
              label="Prix"
              placeholder="Prix de vente"
              required
              min={0}
              step={0.01}
              decimalScale={2}
              fixedDecimalScale
              leftSection="€"
              description={form.values.isCraftable ? "Prix de vente de l'objet" : "Prix de vente de l'objet (disponible car l'objet n'est pas craftable)"}
              {...form.getInputProps('price')}
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

