'use client';

import { useState } from 'react';
import {
  Stack,
  Text,
  Button,
  Table,
  Group,
  ActionIcon,
  Badge,
  Loader,
  Center,
} from '@mantine/core';
import { IconPlus, IconEdit, IconTrash } from '@tabler/icons-react';
import { CraftRecipeModal } from './CraftRecipeModal';
import { DeleteCraftRecipeModal } from './DeleteCraftRecipeModal';
import type { ItemWithRelations, CraftRecipeWithIngredients } from '@/types/items';
import { apothecaryBooleanPills } from '@/lib/apothecaryPill';
import { AppModal } from '@/app/_components/AppModal/AppModal';
import {
  useCraftRecipesQuery,
  useCreateCraftRecipeMutation,
  useUpdateCraftRecipeMutation,
  useDeleteCraftRecipeMutation,
} from '../hooks/useItemsQueries';

interface CraftRecipesModalProps {
  opened: boolean;
  onClose: () => void;
  selectedItem: ItemWithRelations | null;
  items: ItemWithRelations[];
}

export function CraftRecipesModal({
  opened,
  onClose,
  selectedItem,
  items,
}: CraftRecipesModalProps) {
  const itemId = selectedItem?.id ?? '';
  const { data: craftRecipes = [], isFetching } = useCraftRecipesQuery(itemId, opened);
  const createMutation = useCreateCraftRecipeMutation(itemId);
  const updateMutation = useUpdateCraftRecipeMutation(itemId);
  const deleteMutation = useDeleteCraftRecipeMutation(itemId);

  const [craftRecipeModalOpened, setCraftRecipeModalOpened] = useState(false);
  const [editingCraftRecipe, setEditingCraftRecipe] = useState<CraftRecipeWithIngredients | null>(null);
  const [deleteCraftRecipeModalOpened, setDeleteCraftRecipeModalOpened] = useState(false);
  const [craftRecipeToDelete, setCraftRecipeToDelete] = useState<CraftRecipeWithIngredients | null>(null);

  const handleOpenCraftRecipeModal = (recipe?: CraftRecipeWithIngredients) => {
    setEditingCraftRecipe(recipe || null);
    setCraftRecipeModalOpened(true);
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <>
      <AppModal
        opened={opened}
        onClose={handleClose}
        title={`Recettes de craft - ${selectedItem?.name ?? ''}`}
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

          {isFetching ? (
            <Center py="md">
              <Loader size="sm" />
            </Center>
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
                        {recipe.ingredients.map((ing) => (
                          <Text key={ing.id} size="sm">
                            {ing.quantity}x {ing.usedItem.name}
                          </Text>
                        ))}
                      </Stack>
                    </Table.Td>
                    <Table.Td>
                      {recipe.isEnabled ? (
                        <Badge variant="outline" radius="sm" style={apothecaryBooleanPills.yes}>
                          Oui
                        </Badge>
                      ) : (
                        <Badge variant="outline" radius="sm" style={apothecaryBooleanPills.noAlert}>
                          Non
                        </Badge>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs" wrap="nowrap">
                        <ActionIcon
                          variant="light"
                          color="slate"
                          onClick={() => handleOpenCraftRecipeModal(recipe)}
                          title="Modifier"
                        >
                          <IconEdit size={16} />
                        </ActionIcon>
                        <ActionIcon
                          variant="light"
                          color="danger"
                          onClick={() => {
                            setCraftRecipeToDelete(recipe);
                            setDeleteCraftRecipeModalOpened(true);
                          }}
                          title="Supprimer"
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
      </AppModal>

      <CraftRecipeModal
        opened={craftRecipeModalOpened}
        onClose={() => {
          setCraftRecipeModalOpened(false);
          setEditingCraftRecipe(null);
        }}
        editingRecipe={editingCraftRecipe}
        selectedItem={selectedItem}
        items={items}
        createMutation={createMutation}
        updateMutation={updateMutation}
      />

      <DeleteCraftRecipeModal
        opened={deleteCraftRecipeModalOpened}
        onClose={() => {
          setDeleteCraftRecipeModalOpened(false);
          setCraftRecipeToDelete(null);
        }}
        craftRecipeToDelete={craftRecipeToDelete}
        deleteMutation={deleteMutation}
      />
    </>
  );
}
