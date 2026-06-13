'use client';

import { useEffect, useMemo } from 'react';
import {
  Stack,
  TextInput,
  Textarea,
  NumberInput,
  Divider,
  Button,
  Group,
  ActionIcon,
  Select,
  Switch,
} from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { useForm } from '@mantine/form';
import { handleApiZodError } from '@/lib/services/zod';
import { ParsedZodError } from '@/lib/errors/ParsedZodError';
import type { ItemWithRelations, CraftRecipeWithIngredients } from '@/types/items';
import { sortItems } from '@/lib/stock/sortItemsByCategory';
import { AppModal, AppModalFooter } from '@/app/_components/AppModal/AppModal';
import type {
  useCreateCraftRecipeMutation,
  useUpdateCraftRecipeMutation,
} from '../hooks/useItemsQueries';

interface CraftRecipeModalProps {
  opened: boolean;
  onClose: () => void;
  editingRecipe: CraftRecipeWithIngredients | null;
  selectedItem: ItemWithRelations | null;
  items: ItemWithRelations[];
  createMutation: ReturnType<typeof useCreateCraftRecipeMutation>;
  updateMutation: ReturnType<typeof useUpdateCraftRecipeMutation>;
}

export function CraftRecipeModal({
  opened,
  onClose,
  editingRecipe,
  selectedItem,
  items,
  createMutation,
  updateMutation,
}: CraftRecipeModalProps) {
  const craftRecipeForm = useForm({
    initialValues: {
      name: '',
      description: '',
      quantity: 1,
      isEnabled: true,
      ingredients: [] as { usedItemId: string; quantity: number }[],
    },
    validate: {
      name: (value) =>
        value.length < 1 ? 'Le nom de la recette est requis' : null,
      quantity: (value) =>
        value < 1 ? 'La quantité doit être au moins 1' : null,
      ingredients: (value) =>
        value.length < 1 ? 'Au moins un ingrédient est requis' : null,
    },
  });

  useEffect(() => {
    if (editingRecipe) {
      craftRecipeForm.setValues({
        name: editingRecipe.name,
        description: editingRecipe.description || '',
        quantity: editingRecipe.quantity,
        isEnabled: editingRecipe.isEnabled ?? true,
        ingredients: editingRecipe.ingredients.map((ing) => ({
          usedItemId: ing.usedItemId,
          quantity: ing.quantity,
        })),
      });
    } else {
      craftRecipeForm.setValues({
        name: '',
        description: '',
        quantity: 1,
        isEnabled: true,
        ingredients: [],
      });
    }
  }, [editingRecipe, opened]);

  const itemOptions = useMemo(
    () =>
      sortItems(items.filter((item) => item.id !== selectedItem?.id)).map((item) => ({
        value: item.id,
        label: item.name,
      })),
    [items, selectedItem?.id],
  );

  const handleClose = () => {
    onClose();
    craftRecipeForm.reset();
  };

  const handleSubmit = async (values: typeof craftRecipeForm.values) => {
    if (!selectedItem) return;

    try {
      if (editingRecipe) {
        await updateMutation.mutateAsync({
          id: editingRecipe.id,
          name: values.name,
          description: values.description || undefined,
          quantity: values.quantity,
          isEnabled: values.isEnabled,
          ingredients: values.ingredients,
        });
      } else {
        await createMutation.mutateAsync({
          name: values.name,
          description: values.description || undefined,
          craftedItemId: selectedItem.id,
          quantity: values.quantity,
          isEnabled: values.isEnabled,
          ingredients: values.ingredients,
        });
      }

      handleClose();
    } catch (error: unknown) {
      if (error instanceof ParsedZodError) {
        handleApiZodError(error.error, craftRecipeForm);
      }
    }
  };

  const addIngredient = () => {
    craftRecipeForm.insertListItem('ingredients', {
      usedItemId: '',
      quantity: 1,
    });
  };

  const removeIngredient = (index: number) => {
    craftRecipeForm.removeListItem('ingredients', index);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <AppModal
      opened={opened}
      onClose={handleClose}
      title={
        editingRecipe
          ? 'Modifier la recette de craft'
          : 'Créer une recette de craft'
      }
      size="lg"
      footer={
        <AppModalFooter>
          <Button variant="subtle" color="slate" onClick={handleClose}>
            Annuler
          </Button>
          <Button type="submit" form="craft-recipe-modal-form" loading={isPending}>
            {editingRecipe ? 'Modifier' : 'Créer'}
          </Button>
        </AppModalFooter>
      }
    >
      <form id="craft-recipe-modal-form" onSubmit={craftRecipeForm.onSubmit(handleSubmit)}>
        <Stack>
          <TextInput
            label="Nom de la recette"
            placeholder="Nom de la recette"
            required
            {...craftRecipeForm.getInputProps('name')}
          />
          <Textarea
            label="Description"
            placeholder="Description de la recette (optionnel)"
            rows={3}
            {...craftRecipeForm.getInputProps('description')}
          />
          <NumberInput
            label="Quantité produite"
            placeholder="Quantité produite"
            required
            min={1}
            {...craftRecipeForm.getInputProps('quantity')}
          />
          <Switch
            label="Activé"
            description="Si désactivé, la recette ne sera pas visible dans la modal de craft"
            {...craftRecipeForm.getInputProps('isEnabled', { type: 'checkbox' })}
          />
          <Divider label="Ingrédients" labelPosition="left" />
          {craftRecipeForm.values.ingredients.map((_, index) => (
            <Group key={index} align="flex-end" gap="xs">
              <Select
                label={`Ingrédient ${index + 1}`}
                placeholder="Sélectionner un objet"
                data={itemOptions}
                required
                searchable
                style={{ flex: 1 }}
                {...craftRecipeForm.getInputProps(`ingredients.${index}.usedItemId`)}
              />
              <NumberInput
                label="Quantité"
                placeholder="Qty"
                required
                min={1}
                style={{ width: 120 }}
                {...craftRecipeForm.getInputProps(`ingredients.${index}.quantity`)}
              />
              <ActionIcon
                color="danger"
                variant="light"
                onClick={() => removeIngredient(index)}
                disabled={craftRecipeForm.values.ingredients.length === 1}
              >
                <IconTrash size={16} />
              </ActionIcon>
            </Group>
          ))}
          <Button
            variant="light"
            leftSection={<IconPlus size={16} />}
            onClick={addIngredient}
          >
            Ajouter un ingrédient
          </Button>
        </Stack>
      </form>
    </AppModal>
  );
}
