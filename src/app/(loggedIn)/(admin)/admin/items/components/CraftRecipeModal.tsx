'use client';

import { useEffect } from 'react';
import {
  Modal,
  Stack,
  TextInput,
  Textarea,
  NumberInput,
  Divider,
  Button,
  Group,
  ActionIcon,
  Select,
} from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { createCraftRecipe, updateCraftRecipe } from '@/app/_actions/craftRecipes';
import { handleAction } from '@/lib/action';
import { handleApiZodError } from '@/lib/services/zod';
import { ParsedZodError } from '@/lib/errors/ParsedZodError';
import type {
  ItemWithRelations,
  CraftRecipeWithIngredients,
} from '@/types/items';

interface CraftRecipeModalProps {
  opened: boolean;
  onClose: () => void;
  editingRecipe: CraftRecipeWithIngredients | null;
  selectedItem: ItemWithRelations | null;
  items: ItemWithRelations[];
  onSuccess: () => void;
}

export function CraftRecipeModal({
  opened,
  onClose,
  editingRecipe,
  selectedItem,
  items,
  onSuccess,
}: CraftRecipeModalProps) {
  const craftRecipeForm = useForm({
    initialValues: {
      name: '',
      description: '',
      quantity: 1,
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
        ingredients: [],
      });
    }
  }, [editingRecipe, opened]);

  const handleSubmit = async (values: typeof craftRecipeForm.values) => {
    if (!selectedItem) return;

    try {
      let result;
      if (editingRecipe) {
        result = await updateCraftRecipe({
          id: editingRecipe.id,
          name: values.name,
          description: values.description || undefined,
          quantity: values.quantity,
          ingredients: values.ingredients,
        });
      } else {
        result = await createCraftRecipe({
          name: values.name,
          description: values.description || undefined,
          craftedItemId: selectedItem.id,
          quantity: values.quantity,
          ingredients: values.ingredients,
        });
      }

      handleAction(result);
      notifications.show({
        title: 'Succès',
        message: editingRecipe
          ? 'Recette de craft modifiée avec succès'
          : 'Recette de craft créée avec succès',
        color: 'green',
      });
      onClose();
      craftRecipeForm.reset();
      onSuccess();
    } catch (error: any) {
      if (error instanceof ParsedZodError) {
        handleApiZodError(error.error, craftRecipeForm);
      } else {
        notifications.show({
          title: 'Erreur',
          message: error.message || 'Erreur lors de la sauvegarde',
          color: 'red',
        });
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

  const itemOptions = items
    .filter((item) => item.id !== selectedItem?.id)
    .sort((a, b) => {
      if (a.order !== undefined && b.order !== undefined) {
        return a.order - b.order;
      }
      if (a.order !== undefined) return -1;
      if (b.order !== undefined) return 1;
      return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });
    })
    .map((item) => ({
      value: item.id,
      label: item.name,
    }));

  return (
    <Modal
      opened={opened}
      onClose={() => {
        onClose();
        craftRecipeForm.reset();
      }}
      title={
        editingRecipe
          ? 'Modifier la recette de craft'
          : 'Créer une recette de craft'
      }
      size="lg"
    >
      <form onSubmit={craftRecipeForm.onSubmit(handleSubmit)}>
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
          <Divider label="Ingrédients" labelPosition="left" />
          {craftRecipeForm.values.ingredients.map((ingredient, index) => (
            <Group key={index} align="flex-end" gap="xs">
              <Select
                label={`Ingrédient ${index + 1}`}
                placeholder="Sélectionner un objet"
                data={itemOptions}
                required
                searchable
                style={{ flex: 1 }}
                {...craftRecipeForm.getInputProps(
                  `ingredients.${index}.usedItemId`
                )}
              />
              <NumberInput
                label="Quantité"
                placeholder="Qty"
                required
                min={1}
                style={{ width: 120 }}
                {...craftRecipeForm.getInputProps(
                  `ingredients.${index}.quantity`
                )}
              />
              <ActionIcon
                color="red"
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
          <Group justify="flex-end" mt="md">
            <Button
              variant="subtle"
              onClick={() => {
                onClose();
                craftRecipeForm.reset();
              }}
            >
              Annuler
            </Button>
            <Button type="submit">
              {editingRecipe ? 'Modifier' : 'Créer'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

