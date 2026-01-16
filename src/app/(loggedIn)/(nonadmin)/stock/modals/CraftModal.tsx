'use client';

import { useState, useEffect } from 'react';
import {
  Modal,
  Stack,
  Select,
  NumberInput,
  Text,
  Button,
  Group,
  Paper,
  Badge,
} from '@mantine/core';
import { getCraftRecipesByItemId } from '@/app/_actions/craftRecipes';
import { handleAction } from '@/lib/action';
import { notifications } from '@mantine/notifications';
import type { ItemWithRelations } from '@/types/stock';

interface CraftRecipeWithIngredients {
  id: string;
  recipeName: string;
  recipeDescription: string | null;
  craftedItemId: string;
  quantity: number;
  ingredients: {
    id: string;
    usedItemId: string;
    quantity: number;
    usedItem: {
      id: string;
      name: string;
    };
  }[];
}

interface CraftModalProps {
  opened: boolean;
  onClose: () => void;
  items: ItemWithRelations[];
  onCraft: (itemId: string, recipeId: string, quantity: number) => void;
}

export default function CraftModal({ opened, onClose, items, onCraft }: CraftModalProps) {
  const [selectedCraftItem, setSelectedCraftItem] = useState<string | null>(null);
  const [craftQuantity, setCraftQuantity] = useState<number>(1);
  const [selectedRecipe, setSelectedRecipe] = useState<string | null>(null);
  const [craftRecipes, setCraftRecipes] = useState<CraftRecipeWithIngredients[]>([]);
  const [loadingRecipes, setLoadingRecipes] = useState(false);

  // Réinitialiser les états quand la modal se ferme
  useEffect(() => {
    if (!opened) {
      setSelectedCraftItem(null);
      setCraftQuantity(1);
      setSelectedRecipe(null);
      setCraftRecipes([]);
    }
  }, [opened]);

  const handleItemChange = async (value: string | null) => {
    setSelectedCraftItem(value);
    setSelectedRecipe(null);
    if (value) {
      setLoadingRecipes(true);
      try {
        const result = await getCraftRecipesByItemId(value);
        const data = handleAction(result);
        if (data) {
          setCraftRecipes(data);
          if (data.length === 1) {
            setSelectedRecipe(data[0].id);
          }
        }
      } catch (error: any) {
        notifications.show({
          title: 'Erreur',
          message: error.message || 'Erreur lors du chargement des recettes',
          color: 'red',
        });
      } finally {
        setLoadingRecipes(false);
      }
    } else {
      setCraftRecipes([]);
    }
  };

  const handleClose = () => {
    setSelectedCraftItem(null);
    setCraftQuantity(1);
    setSelectedRecipe(null);
    setCraftRecipes([]);
    onClose();
  };

  const handleCraft = () => {
    if (!selectedCraftItem || !selectedRecipe) return;
    onCraft(selectedCraftItem, selectedRecipe, craftQuantity);
  };

  const craftItem = items.find((i) => i.id === selectedCraftItem);
  const hasCraftItemStockToday = craftItem?.stockToday !== null && craftItem?.stockToday !== undefined;

  const isCraftButtonDisabled = (() => {
    if (!selectedCraftItem || (!selectedRecipe && craftRecipes.length > 1) || craftQuantity < 1) {
      return true;
    }
    
    // Vérifier que l'item à craft a un stock d'aujourd'hui
    if (!hasCraftItemStockToday) {
      return true;
    }
    
    const recipe = craftRecipes.find((r) => r.id === selectedRecipe) || craftRecipes[0];
    if (!recipe) return true;
    
    // Calculer le nombre de fois qu'on doit appliquer la recette
    const recipeMultiplier = Math.ceil(craftQuantity / recipe.quantity);
    
    // Vérifier que tous les ingrédients ont un stock d'aujourd'hui ET assez de stock
    const allIngredientsHaveEnough = recipe.ingredients.every((ingredient) => {
      const requiredQuantity = ingredient.quantity * recipeMultiplier;
      const item = items.find((i) => i.id === ingredient.usedItemId);
      // Vérifier que le stock d'aujourd'hui existe
      if (item?.stockToday === null || item?.stockToday === undefined) {
        return false;
      }
      const availableStock = item.stockToday;
      return availableStock >= requiredQuantity;
    });
    
    return !allIngredientsHaveEnough;
  })();

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Craft d'item"
      size="lg"
    >
      <Stack>
        <Select
          label="Item à craft"
          placeholder="Sélectionner un item craftable"
          data={items
            .filter((item) => item.isCraftable)
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
            }))}
          value={selectedCraftItem}
          onChange={handleItemChange}
          searchable
          required
        />

        {selectedCraftItem && craftRecipes.length > 0 && (
          <>
            {!hasCraftItemStockToday ? (
              <Text c="red" size="sm" mt="md">
                Le stock d'aujourd'hui n'est pas fait pour cet item. Veuillez d'abord faire le stock.
              </Text>
            ) : (
              <>
                {craftRecipes.length > 1 ? (
                  <Select
                    label="Recette"
                    placeholder="Sélectionner une recette"
                    data={craftRecipes.map((recipe) => ({
                      value: recipe.id,
                      label: recipe.recipeName,
                    }))}
                    value={selectedRecipe}
                    onChange={(value) => setSelectedRecipe(value)}
                    required
                  />
                ) : (
                  <Text size="sm" c="dimmed">
                    Recette : {craftRecipes[0]?.recipeName}
                  </Text>
                )}

                <NumberInput
                  label="Quantité à craft"
                  placeholder="Quantité"
                  value={craftQuantity}
                  onChange={(value) => setCraftQuantity(typeof value === 'number' ? value : 1)}
                  min={1}
                  required
                />

                {(selectedRecipe || (craftRecipes.length === 1 && craftRecipes[0])) && (() => {
                  const recipe = craftRecipes.find((r) => r.id === selectedRecipe) || craftRecipes[0];
                  if (!recipe) return null;

                  // Calculer le nombre de fois qu'on doit appliquer la recette
                  const recipeMultiplier = Math.ceil(craftQuantity / recipe.quantity);
                  
                  // Vérifier que tous les ingrédients ont un stock d'aujourd'hui ET assez de stock
                  const allIngredientsHaveEnough = recipe.ingredients.every((ingredient) => {
                    const requiredQuantity = ingredient.quantity * recipeMultiplier;
                    const item = items.find((i) => i.id === ingredient.usedItemId);
                    // Vérifier que le stock d'aujourd'hui existe
                    if (item?.stockToday === null || item?.stockToday === undefined) {
                      return false;
                    }
                    const availableStock = item.stockToday;
                    return availableStock >= requiredQuantity;
                  });

                  return (
                    <Stack gap="sm" mt="md">
                      <Text fw={500}>Ingrédients nécessaires :</Text>
                      <Paper p="md" withBorder>
                        <Stack gap="xs">
                          {recipe.ingredients.map((ingredient) => {
                            const requiredQuantity = ingredient.quantity * recipeMultiplier;
                            const item = items.find((i) => i.id === ingredient.usedItemId);
                            const hasStockToday = item?.stockToday !== null && item?.stockToday !== undefined;
                            const availableStock = hasStockToday ? (item.stockToday ?? 0) : 0;
                            const hasEnough = hasStockToday && availableStock >= requiredQuantity;

                            return (
                              <Group key={ingredient.id} justify="space-between" wrap="nowrap">
                                <Text size="sm" style={{ flex: 1 }}>
                                  {ingredient.usedItem.name}
                                </Text>
                                <Group gap="xs" wrap="nowrap">
                                  <Text size="sm" c={hasEnough ? 'green' : 'red'}>
                                    {requiredQuantity} requis
                                  </Text>
                                  {hasStockToday ? (
                                    <>
                                      <Text size="sm" c="dimmed">
                                        / {availableStock} disponible
                                      </Text>
                                      {hasEnough ? (
                                        <Badge color="green" size="sm">✓</Badge>
                                      ) : (
                                        <Badge color="red" size="sm">✗</Badge>
                                      )}
                                    </>
                                  ) : (
                                    <>
                                      <Text size="sm" c="red">
                                        Stock d'aujourd'hui non fait
                                      </Text>
                                      <Badge color="red" size="sm">✗</Badge>
                                    </>
                                  )}
                                </Group>
                              </Group>
                            );
                          })}
                        </Stack>
                      </Paper>
                    </Stack>
                  );
                })()}
              </>
            )}
          </>
        )}

        {selectedCraftItem && craftRecipes.length === 0 && !loadingRecipes && (
          <Text c="dimmed" size="sm">
            Aucune recette disponible pour cet item
          </Text>
        )}

        {loadingRecipes && (
          <Text c="dimmed" size="sm">
            Chargement des recettes...
          </Text>
        )}

        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={handleClose}>
            Annuler
          </Button>
          <Button onClick={handleCraft} disabled={isCraftButtonDisabled}>
            Craft
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

