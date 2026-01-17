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
  canCraft?: boolean; // Si false, l'utilisateur peut seulement voir mais pas craft
  onCraft: (itemId: string, recipeId: string, quantity: number) => void;
}

export default function CraftModal({ opened, onClose, items, canCraft = true, onCraft }: CraftModalProps) {
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

  const handleCraft = async () => {
    if (!selectedCraftItem || !selectedRecipe) return;
    await onCraft(selectedCraftItem, selectedRecipe, craftQuantity);
  };

  // Helper pour obtenir le stock disponible et savoir s'il vient d'aujourd'hui
  const getAvailableStock = (item: ItemWithRelations | undefined) => {
    if (!item) return { stock: null, isToday: false };
    
    if (item.stockToday !== null && item.stockToday !== undefined) {
      return { stock: item.stockToday, isToday: true };
    }
    
    // Si pas de stock aujourd'hui, utiliser le stock d'hier (ou le dernier disponible)
    if (item.stockYesterday !== null && item.stockYesterday !== undefined) {
      return { stock: item.stockYesterday, isToday: false };
    }
    
    return { stock: null, isToday: false };
  };

  const selectedCraftItemData = items.find((i) => i.id === selectedCraftItem);
  const craftItemStock = getAvailableStock(selectedCraftItemData);
  const hasCraftItemStockToday = selectedCraftItemData?.stockToday !== null && selectedCraftItemData?.stockToday !== undefined;
  const hasCraftItemStock = craftItemStock.stock !== null;

  // Vérifier si au moins un ingrédient ou l'item crafté utilise un stock d'un jour précédent
  const usesOldStock = (() => {
    if (!selectedCraftItem || !hasCraftItemStock) return false;
    
    if (!craftItemStock.isToday) return true;
    
    const recipe = craftRecipes.find((r) => r.id === selectedRecipe) || craftRecipes[0];
    if (!recipe) return false;
    
    return recipe.ingredients.some((ingredient) => {
      const item = items.find((i) => i.id === ingredient.usedItemId);
      const stock = getAvailableStock(item);
      return stock.stock !== null && !stock.isToday;
    });
  })();

  const isCraftButtonDisabled = (() => {
    // Si l'utilisateur n'a pas la permission de craft, désactiver le bouton
    if (!canCraft) {
      return true;
    }
    
    if (!selectedCraftItem || (!selectedRecipe && craftRecipes.length > 1) || craftQuantity < 1) {
      return true;
    }
    
    // Vérifier que l'item à craft a un stock d'aujourd'hui (obligatoire pour craft)
    if (!hasCraftItemStockToday) {
      return true;
    }
    
    const recipe = craftRecipes.find((r) => r.id === selectedRecipe) || craftRecipes[0];
    if (!recipe) return true;
    
    // craftQuantity représente maintenant le nombre de fois qu'on craft la recette
    // Vérifier que tous les ingrédients ont un stock d'aujourd'hui ET assez de stock
    const allIngredientsHaveEnough = recipe.ingredients.every((ingredient) => {
      const requiredQuantity = ingredient.quantity * craftQuantity;
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
      title="Craft d'objet"
      size="lg"
    >
      <Stack>
        <Select
          label="Objet à craft"
          placeholder="Sélectionner un objet craftable"
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
            {!hasCraftItemStock ? (
              <Text c="red" size="sm" mt="md">
                Aucun stock disponible pour cet objet.
              </Text>
            ) : (
              <>
                {usesOldStock && (
                  <Text c="orange" size="sm" mt="md" fw={500}>
                    ⚠️ Certains stocks affichés proviennent d'un jour précédent. Le craft n'est pas possible sans le stock d'aujourd'hui.
                  </Text>
                )}
                {selectedCraftItemData && craftItemStock.stock !== null && (
                  <Text size="sm" c={craftItemStock.isToday ? 'dimmed' : 'orange'} mt="xs">
                    Stock disponible : {craftItemStock.stock} {craftItemStock.isToday ? '' : '(jour précédent)'}
                  </Text>
                )}
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
                    renderOption={({ option }) => {
                      const recipe = craftRecipes.find((r) => r.id === option.value);
                      return (
                        <div>
                          <div>{option.label}</div>
                          {recipe?.recipeDescription && (
                            <Text size="xs" c="dimmed" mt={2}>
                              {recipe.recipeDescription}
                            </Text>
                          )}
                        </div>
                      );
                    }}
                  />
                ) : (
                  <Stack gap="xs">
                    <Text size="sm" c="dimmed">
                      Recette : {craftRecipes[0]?.recipeName}
                    </Text>
                    {craftRecipes[0]?.recipeDescription && (
                      <Text size="xs" c="dimmed">
                        {craftRecipes[0].recipeDescription}
                      </Text>
                    )}
                  </Stack>
                )}

                {(() => {
                  const recipe = craftRecipes.find((r) => r.id === selectedRecipe) || craftRecipes[0];
                  if (!recipe) return null;
                  
                  const totalQuantity = craftQuantity * recipe.quantity;
                  
                  return (
                    <>
                      <NumberInput
                        label="Nombre de fois à craft"
                        placeholder="Nombre de fois"
                        value={craftQuantity}
                        onChange={(value) => setCraftQuantity(typeof value === 'number' ? value : 1)}
                        min={1}
                        required
                        description={`Quantité totale produite : ${totalQuantity}`}
                      />
                    </>
                  );
                })()}

                {(selectedRecipe || (craftRecipes.length === 1 && craftRecipes[0])) && (() => {
                  const recipe = craftRecipes.find((r) => r.id === selectedRecipe) || craftRecipes[0];
                  if (!recipe) return null;

                  // craftQuantity représente maintenant le nombre de fois qu'on craft la recette
                  return (
                    <Stack gap="sm" mt="md">
                      <Text fw={500}>Ingrédients nécessaires :</Text>
                      <Paper p="md" withBorder>
                        <Stack gap="xs">
                          {recipe.ingredients.map((ingredient) => {
                            const requiredQuantity = ingredient.quantity * craftQuantity;
                            const item = items.find((i) => i.id === ingredient.usedItemId);
                            const stockInfo = getAvailableStock(item);
                            const availableStock = stockInfo.stock ?? 0;
                            const hasEnough = stockInfo.isToday && availableStock >= requiredQuantity;

                            return (
                              <Group key={ingredient.id} justify="space-between" wrap="nowrap">
                                <Text size="sm" style={{ flex: 1 }}>
                                  {ingredient.usedItem.name}
                                </Text>
                                <Group gap="xs" wrap="nowrap">
                                  <Text size="sm" c={hasEnough ? 'green' : 'red'}>
                                    {requiredQuantity} requis
                                  </Text>
                                  {stockInfo.stock !== null ? (
                                    <>
                                      <Text size="sm" c={stockInfo.isToday ? 'dimmed' : 'orange'}>
                                        / {availableStock} disponible{stockInfo.isToday ? '' : ' (jour précédent)'}
                                      </Text>
                                      {hasEnough ? (
                                        <Badge color="green" size="sm">✓</Badge>
                                      ) : (
                                        <Badge color={stockInfo.isToday ? 'red' : 'orange'} size="sm">✗</Badge>
                                      )}
                                    </>
                                  ) : (
                                    <>
                                      <Text size="sm" c="red">
                                        Aucun stock disponible
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
            Aucune recette disponible pour cet objet
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
          <Button 
            onClick={handleCraft} 
            disabled={isCraftButtonDisabled}
            title={!canCraft ? "Vous n'avez pas la permission d'effectuer un craft" : undefined}
          >
            Craft
          </Button>
        </Group>
        {!canCraft && (
          <Text c="orange" size="sm" mt="md">
            ⚠️ Vous avez uniquement la permission de lecture. Vous ne pouvez pas effectuer de craft.
          </Text>
        )}
      </Stack>
    </Modal>
  );
}

