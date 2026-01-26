'use client';

import { useState, useEffect } from 'react';
import {
  Modal,
  Stack,
  Text,
  Button,
  Table,
  Group,
  ActionIcon,
  Badge,
} from '@mantine/core';
import { IconPlus, IconEdit, IconTrash } from '@tabler/icons-react';
import { getCraftRecipesByItemId } from '@/app/_actions/craftRecipes';
import { handleAction } from '@/lib/action';
import { notifications } from '@mantine/notifications';
import { CraftRecipeModal } from './CraftRecipeModal';
import { DeleteCraftRecipeModal } from './DeleteCraftRecipeModal';
import type {
  ItemWithRelations,
  CraftRecipeWithIngredients,
} from '@/types/items';

interface CraftRecipesModalProps {
  opened: boolean;
  onClose: () => void;
  selectedItem: ItemWithRelations | null;
  items: ItemWithRelations[];
  onSuccess: () => void;
}

export function CraftRecipesModal({
  opened,
  onClose,
  selectedItem,
  items,
  onSuccess,
}: CraftRecipesModalProps) {
  const [craftRecipes, setCraftRecipes] = useState<CraftRecipeWithIngredients[]>([]);
  const [loadingCraftRecipes, setLoadingCraftRecipes] = useState(false);
  const [craftRecipeModalOpened, setCraftRecipeModalOpened] = useState(false);
  const [editingCraftRecipe, setEditingCraftRecipe] = useState<CraftRecipeWithIngredients | null>(null);
  const [deleteCraftRecipeModalOpened, setDeleteCraftRecipeModalOpened] = useState(false);
  const [craftRecipeToDelete, setCraftRecipeToDelete] = useState<CraftRecipeWithIngredients | null>(null);

  const loadCraftRecipes = async (itemId: string) => {
    try {
      setLoadingCraftRecipes(true);
      const result = await getCraftRecipesByItemId(itemId);
      const data = handleAction(result);
      if (data) {
        setCraftRecipes(data);
      }
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message:
          error.message || 'Erreur lors du chargement des recettes de craft',
        color: 'red',
      });
    } finally {
      setLoadingCraftRecipes(false);
    }
  };

  useEffect(() => {
    if (opened && selectedItem) {
      loadCraftRecipes(selectedItem.id);
    } else {
      setCraftRecipes([]);
    }
  }, [opened, selectedItem]);

  const handleOpenCraftRecipeModal = (recipe?: CraftRecipeWithIngredients) => {
    setEditingCraftRecipe(recipe || null);
    setCraftRecipeModalOpened(true);
  };

  const handleClose = () => {
    onClose();
    setCraftRecipes([]);
  };

  return (
    <>
      <Modal
        opened={opened}
        onClose={handleClose}
        title={`Recettes de craft - ${selectedItem?.name}`}
        size="xl"
      >
        <Stack>
          <Group justify="space-between">
            <Text>Liste des recettes de craft pour cet objet</Text>
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={() => handleOpenCraftRecipeModal()}
            >
              Ajouter une recette
            </Button>
          </Group>

          {loadingCraftRecipes ? (
            <Text>Chargement...</Text>
          ) : craftRecipes.length === 0 ? (
            <Text c="dimmed">Aucune recette de craft pour cet objet</Text>
          ) : (
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Nom</Table.Th>
                  <Table.Th>Description</Table.Th>
                  <Table.Th>Quantité produite</Table.Th>
                  <Table.Th>Ingrédients</Table.Th>
                  <Table.Th>Activé</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {craftRecipes.map((recipe) => (
                  <Table.Tr key={recipe.id}>
                    <Table.Td>{recipe.name}</Table.Td>
                    <Table.Td>{recipe.description || '-'}</Table.Td>
                    <Table.Td>{recipe.quantity}</Table.Td>
                    <Table.Td>
                      <Stack gap="xs">
                        {recipe.ingredients.map((ing, idx) => (
                          <Text key={idx} size="sm">
                            {ing.quantity}x {ing.usedItem.name}
                          </Text>
                        ))}
                      </Stack>
                    </Table.Td>
                    <Table.Td>
                      {recipe.isEnabled ? (
                        <Badge color="green" variant="light">
                          Oui
                        </Badge>
                      ) : (
                        <Badge color="red" variant="light">
                          Non
                        </Badge>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs" wrap="nowrap">
                        <ActionIcon
                          variant="light"
                          color="blue"
                          onClick={() => handleOpenCraftRecipeModal(recipe)}
                        >
                          <IconEdit size={16} />
                        </ActionIcon>
                        <ActionIcon
                          variant="light"
                          color="red"
                          onClick={() => {
                            setCraftRecipeToDelete(recipe);
                            setDeleteCraftRecipeModalOpened(true);
                          }}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Stack>
      </Modal>

      <CraftRecipeModal
        opened={craftRecipeModalOpened}
        onClose={() => {
          setCraftRecipeModalOpened(false);
          setEditingCraftRecipe(null);
        }}
        editingRecipe={editingCraftRecipe}
        selectedItem={selectedItem}
        items={items}
        onSuccess={() => {
          if (selectedItem) {
            loadCraftRecipes(selectedItem.id);
          }
        }}
      />

      <DeleteCraftRecipeModal
        opened={deleteCraftRecipeModalOpened}
        onClose={() => {
          setDeleteCraftRecipeModalOpened(false);
          setCraftRecipeToDelete(null);
        }}
        craftRecipeToDelete={craftRecipeToDelete}
        selectedItem={selectedItem}
        onSuccess={() => {
          if (selectedItem) {
            loadCraftRecipes(selectedItem.id);
          }
        }}
      />
    </>
  );
}

