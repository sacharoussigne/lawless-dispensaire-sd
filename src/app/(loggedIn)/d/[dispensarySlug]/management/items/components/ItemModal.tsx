'use client';

import { usePermissions } from '@/app/_contexts/PermissionsContext';
import { useEffect } from 'react';
import {
  Stack,
  TextInput,
  Textarea,
  NumberInput,
  Select,
  Switch,
  Button,
  Group,
  Text,
  SimpleGrid,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { createItem, updateItem } from '@/app/_actions/items';
import { handleAction } from '@/lib/action';
import { handleApiZodError } from '@/lib/services/zod';
import { ParsedZodError } from '@/lib/errors/ParsedZodError';
import type { ItemWithRelations, CategoryItem, CompanyGroup } from '@/types/items';
import { AppModal, AppModalFooter } from '@/app/_components/AppModal/AppModal';
import { FormSection } from '@/app/_components/AppModal/FormSection';

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
  const { dispensarySlug } = usePermissions();
  const form = useForm({
    initialValues: {
      name: '',
      description: '',
      minimalQuantity: 0,
      isCraftable: false,
      isEnabled: true,
      canBeSold: false,
      price: null as number | null,
      weight: null as number | null,
      categoryId: '',
      companyGroupId: '',
    },
    validate: {
      name: (value) => (value.length < 1 ? 'Le nom est requis' : null),
      minimalQuantity: (value) =>
        value < 0 ? 'La quantité minimale doit être positive' : null,
      categoryId: (value) => (!value ? 'La catégorie est requise' : null),
      price: (value) => {
        if (value !== null && value !== undefined && value <= 0) {
          return 'Le prix doit être positif';
        }
        return null;
      },
    },
  });

  useEffect(() => {
    if (form.values.isCraftable && form.values.companyGroupId) {
      form.setFieldValue('companyGroupId', '');
    }
  }, [form.values.isCraftable]);

  useEffect(() => {
    if (editingItem) {
      form.setValues({
        name: editingItem.name,
        description: editingItem.description || '',
        minimalQuantity: editingItem.minimalQuantity,
        isCraftable: editingItem.isCraftable,
        isEnabled: editingItem.isEnabled ?? true,
        canBeSold: editingItem.canBeSold ?? false,
        price: editingItem.price ? Number(editingItem.price) : null,
        weight: editingItem.weight ?? null,
        categoryId: editingItem.categoryId || '',
        companyGroupId: editingItem.companyGroupId || '',
      });
    } else {
      form.reset();
    }
  }, [editingItem, opened]);

  const handleClose = () => {
    onClose();
    form.reset();
  };

  const handleSubmit = async (values: typeof form.values) => {
    try {
      const companyGroupId = values.isCraftable
        ? undefined
        : values.companyGroupId || undefined;

      const priceToSave =
        values.price !== null && values.price !== undefined ? values.price : null;

      const result = editingItem
        ? await updateItem(dispensarySlug!, {
            id: editingItem.id,
            name: values.name,
            description: values.description || undefined,
            minimalQuantity: values.minimalQuantity,
            isCraftable: values.isCraftable,
            isEnabled: values.isEnabled,
            canBeSold: values.canBeSold,
            price: priceToSave,
            weight: values.weight,
            categoryId: values.categoryId,
            companyGroupId,
          })
        : await createItem(dispensarySlug!, {
            name: values.name,
            description: values.description || undefined,
            minimalQuantity: values.minimalQuantity,
            isCraftable: values.isCraftable,
            isEnabled: values.isEnabled,
            canBeSold: values.canBeSold,
            price: priceToSave,
            weight: values.weight,
            categoryId: values.categoryId,
            companyGroupId,
          });

      handleAction(result);
      notifications.show({
        title: 'Succès',
        message: editingItem
          ? 'Objet modifié avec succès'
          : 'Objet créé avec succès',
        color: 'green',
      });
      handleClose();
      onSuccess();
    } catch (error: unknown) {
      console.error(error);
      if (error instanceof ParsedZodError) {
        handleApiZodError(error.error, form);
      } else {
        notifications.show({
          title: 'Erreur',
          message:
            error instanceof Error ? error.message : 'Erreur lors de la sauvegarde',
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
    <AppModal
      opened={opened}
      onClose={handleClose}
      title={editingItem ? "Modifier l'objet" : 'Créer un objet'}
      size="lg"
      footer={
        <AppModalFooter>
          <Button variant="subtle" onClick={handleClose}>
            Annuler
          </Button>
          <Button type="submit" form="item-modal-form">
            {editingItem ? 'Modifier' : 'Créer'}
          </Button>
        </AppModalFooter>
      }
    >
      <form id="item-modal-form" onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <FormSection title="Informations générales">
            <TextInput
              label="Nom"
              placeholder="Nom de l'objet"
              required
              {...form.getInputProps('name')}
            />
            <Textarea
              label="Description"
              placeholder="Description de l'objet (optionnel)"
              rows={3}
              autosize
              minRows={3}
              {...form.getInputProps('description')}
            />
          </FormSection>

          <FormSection title="Stock et catégorisation">
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <NumberInput
                label="Quantité minimale"
                placeholder="Quantité minimale"
                required
                min={0}
                {...form.getInputProps('minimalQuantity')}
              />
              <Select
                label="Catégorie"
                placeholder="Sélectionner une catégorie"
                data={categoryOptions}
                required
                searchable
                {...form.getInputProps('categoryId')}
              />
            </SimpleGrid>
            <NumberInput
              label="Poids (kg)"
              placeholder="Poids (optionnel)"
              min={0}
              step={0.01}
              decimalScale={2}
              fixedDecimalScale
              {...form.getInputProps('weight')}
            />

            <Group grow align="flex-start" mt="xs">
              <Switch
                label="Peut être crafté"
                {...form.getInputProps('isCraftable', { type: 'checkbox' })}
              />
              <Switch
                label="Activé"
                description="Si désactivé, l'objet ne sera pas visible dans la page de stock"
                {...form.getInputProps('isEnabled', { type: 'checkbox' })}
              />
            </Group>

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
          </FormSection>

          <FormSection title="Vente et tarification">
            <NumberInput
              label="Prix de référence"
              placeholder="0,00"
              min={0}
              step={0.01}
              decimalScale={2}
              fixedDecimalScale
              leftSection={<Text size="sm" c="dimmed">$</Text>}
              leftSectionWidth={28}
              description="Optionnel"
              {...form.getInputProps('price')}
            />
            <Switch
              mt="xs"
              label="Peut être vendu"
              description="Inclut cet objet dans les commandes sortantes (vente)"
              {...form.getInputProps('canBeSold', { type: 'checkbox' })}
            />
          </FormSection>
        </Stack>
      </form>
    </AppModal>
  );
}
