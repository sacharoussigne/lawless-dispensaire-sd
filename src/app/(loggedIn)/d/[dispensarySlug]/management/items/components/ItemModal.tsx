'use client';

import { useEffect, useMemo } from 'react';
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
import { handleApiZodError } from '@/lib/services/zod';
import { ParsedZodError } from '@/lib/errors/ParsedZodError';
import type { ItemWithRelations, CompanyGroupSelect } from '@/types/items';
import type { CategoryItemWithCount } from '@/types/categoryItems';
import { AppModal, AppModalFooter } from '@/app/_components/AppModal/AppModal';
import { FormSection } from '@/app/_components/AppModal/FormSection';
import {
  toCategorySelectOptions,
  toCompanyGroupSelectOptions,
} from '@/lib/items/selectOptions';
import type {
  useCreateItemMutation,
  useUpdateItemMutation,
} from '../hooks/useItemsQueries';

interface ItemModalProps {
  opened: boolean;
  onClose: () => void;
  editingItem: ItemWithRelations | null;
  categoryItems: CategoryItemWithCount[];
  companyGroups: CompanyGroupSelect[];
  createMutation: ReturnType<typeof useCreateItemMutation>;
  updateMutation: ReturnType<typeof useUpdateItemMutation>;
}

export function ItemModal({
  opened,
  onClose,
  editingItem,
  categoryItems,
  companyGroups,
  createMutation,
  updateMutation,
}: ItemModalProps) {
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
  }, [form.values.isCraftable, form.values.companyGroupId]);

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

  const categoryOptions = useMemo(
    () => toCategorySelectOptions(categoryItems),
    [categoryItems],
  );

  const companyGroupOptions = useMemo(
    () => toCompanyGroupSelectOptions(companyGroups),
    [companyGroups],
  );

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

      const payload = {
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
      };

      if (editingItem) {
        await updateMutation.mutateAsync({ id: editingItem.id, ...payload });
      } else {
        await createMutation.mutateAsync(payload);
      }

      handleClose();
    } catch (error: unknown) {
      if (error instanceof ParsedZodError) {
        handleApiZodError(error.error, form);
      }
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <AppModal
      opened={opened}
      onClose={handleClose}
      title={editingItem ? "Modifier l'objet" : 'Créer un objet'}
      size="lg"
      footer={
        <AppModalFooter>
          <Button variant="subtle" color="slate" onClick={handleClose}>
            Annuler
          </Button>
          <Button type="submit" form="item-modal-form" loading={isPending}>
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
