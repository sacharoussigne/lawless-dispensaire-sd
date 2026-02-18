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
import { getItemsWithStock } from '@/app/_actions/stock';
import { handleAction } from '@/lib/action';
import { notifications } from '@mantine/notifications';
import type { ItemWithRelations } from '@/types/stock';
import type { ChestWithStockHistory } from '@/types/chests';

interface CraftRecipeWithIngredients {
  id: string;
  name: string;
  description: string | null;
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
  onCraft: (itemId: string, recipeId: string, quantity: number, chestId: string | null) => void;
  initialChestId?: string | null; // Coffre pré-sélectionné depuis la vue stock
  chests?: ChestWithStockHistory[]; // Liste des coffres disponibles
}

export default function CraftModal({ opened, onClose, items, canCraft = true, onCraft, initialChestId = null, chests = [] }: CraftModalProps) {
  const [selectedCraftItem, setSelectedCraftItem] = useState<string | null>(null);
  const [craftQuantity, setCraftQuantity] = useState<number>(1);
  const [selectedRecipe, setSelectedRecipe] = useState<string | null>(null);
  const [craftRecipes, setCraftRecipes] = useState<CraftRecipeWithIngredients[]>([]);
  const [loadingRecipes, setLoadingRecipes] = useState(false);
  const [selectedChestId, setSelectedChestId] = useState<string | null>(initialChestId || null);
  const [itemsWithStock, setItemsWithStock] = useState<ItemWithRelations[]>(items);
  const [loadingItems, setLoadingItems] = useState(false);

  // Mettre à jour selectedChestId quand initialChestId change (quand on change de coffre dans la vue stock)
  useEffect(() => {
    if (opened && initialChestId !== null) {
      setSelectedChestId(initialChestId);
    } else if (opened && initialChestId === null) {
      setSelectedChestId(null);
    }
  }, [opened, initialChestId]);

  // Charger les items avec le stock du coffre sélectionné dans le modal
  useEffect(() => {
    if (opened) {
      const loadItemsForChest = async () => {
        setLoadingItems(true);
        try {
          const result = await getItemsWithStock(selectedChestId);
          const data = handleAction(result);
          if (data) {
            setItemsWithStock(data);
            // Réinitialiser la sélection de l'item crafté quand le coffre change
            // pour éviter des incohérences avec les stocks
            setSelectedCraftItem(null);
            setSelectedRecipe(null);
            setCraftRecipes([]);
          }
        } catch (error: any) {
          notifications.show({
            title: 'Erreur',
            message: error.message || 'Erreur lors du chargement des stocks',
            color: 'red',
          });
        } finally {
          setLoadingItems(false);
        }
      };
      loadItemsForChest();
    }
  }, [opened, selectedChestId]);

  // Réinitialiser les états quand la modal se ferme
  useEffect(() => {
    if (!opened) {
      setSelectedCraftItem(null);
      setCraftQuantity(1);
      setSelectedRecipe(null);
      setCraftRecipes([]);
      // Ne pas réinitialiser selectedChestId, on garde la valeur initiale
    }
  }, [opened]);

  const handleItemChange = async (value: string | null) => {
    setSelectedCraftItem(value);
    setSelectedRecipe(null);
    if (value) {
      setLoadingRecipes(true);
      try {
        const result = await getCraftRecipesByItemId(value, true); // onlyEnabled = true pour la modal de craft
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
    await onCraft(selectedCraftItem, selectedRecipe, craftQuantity, selectedChestId);
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

  const selectedCraftItemData = itemsWithStock.find((i) => i.id === selectedCraftItem);
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
      const item = itemsWithStock.find((i) => i.id === ingredient.usedItemId);
      const stock = getAvailableStock(item);
      return stock.stock !== null && !stock.isToday;
    });
  })();

  const craftButtonDisabledReason = (() => {
    // Si l'utilisateur n'a pas la permission de craft
    if (!canCraft) {
      return "Vous n'avez pas la permission d'effectuer un craft";
    }
    
    // Si aucun coffre n'est sélectionné, désactiver le craft
    if (selectedChestId === null) {
      return "Veuillez sélectionner un coffre pour effectuer le craft";
    }
    
    if (!selectedCraftItem || (!selectedRecipe && craftRecipes.length > 1) || craftQuantity < 1) {
      return null; // Pas de message spécifique pour ces cas
    }
    
    // Vérifier que l'item à craft a un stock d'aujourd'hui (obligatoire pour craft)
    if (!hasCraftItemStockToday) {
      if (!hasCraftItemStock) {
        return "Aucun stock disponible pour cet objet";
      }
      return "Le stock d'aujourd'hui est requis pour effectuer un craft";
    }
    
    const recipe = craftRecipes.find((r) => r.id === selectedRecipe) || craftRecipes[0];
    if (!recipe) return null;
    
    // craftQuantity représente maintenant le nombre de fois qu'on craft la recette
    // Vérifier que tous les ingrédients ont un stock d'aujourd'hui ET assez de stock
    const ingredientChecks = recipe.ingredients.map((ingredient) => {
      const requiredQuantity = ingredient.quantity * craftQuantity;
      const item = itemsWithStock.find((i) => i.id === ingredient.usedItemId);
      // Vérifier que le stock d'aujourd'hui existe
      if (item?.stockToday === null || item?.stockToday === undefined) {
        return { hasStock: false, hasEnough: false, itemName: item?.name || ingredient.usedItem.name };
      }
      const availableStock = item.stockToday;
      return { 
        hasStock: true, 
        hasEnough: availableStock >= requiredQuantity,
        itemName: item.name,
        required: requiredQuantity,
        available: availableStock
      };
    });
    
    const missingStockItems = ingredientChecks.filter(check => !check.hasStock);
    if (missingStockItems.length > 0) {
      return `Stock d'aujourd'hui manquant pour : ${missingStockItems.map(c => c.itemName).join(', ')}`;
    }
    
    const insufficientStockItems = ingredientChecks.filter(check => !check.hasEnough);
    if (insufficientStockItems.length > 0) {
      return `Stock insuffisant pour : ${insufficientStockItems.map(c => `${c.itemName} (${c.required} requis, ${c.available} disponible)`).join(', ')}`;
    }
    
    return null; // Tout est OK
  })();

  const isCraftButtonDisabled = craftButtonDisabledReason !== null;

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Craft d'objet"
      size="lg"
    >
      <Stack>
        {chests.length > 0 && (
          <Select
            label="Coffre"
            placeholder="Sélectionner un coffre"
            data={chests.map((chest) => ({
              value: chest.id,
              label: chest.name,
            }))}
            value={selectedChestId}
            onChange={(value) => setSelectedChestId(value)}
            required
            clearable={false}
          />
        )}
        <Select
          label="Objet à craft"
          placeholder="Sélectionner un objet craftable"
          data={itemsWithStock
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
          disabled={loadingItems}
        />

        {selectedCraftItem && craftRecipes.length > 0 && (
          <>
            {!hasCraftItemStock && (
              <Text c="orange" size="sm" mt="md" fw={500}>
                ⚠️ Aucun stock disponible pour cet objet. Le craft n'est pas possible sans stock.
              </Text>
            )}
            {hasCraftItemStock && usesOldStock && (
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
                  label: recipe.name,
                }))}
                value={selectedRecipe}
                onChange={(value) => setSelectedRecipe(value)}
                required
                renderOption={({ option }) => {
                  const recipe = craftRecipes.find((r) => r.id === option.value);
                  return (
                    <div>
                      <div>{option.label}</div>
                      {recipe?.description && (
                        <Text size="xs" c="dimmed" mt={2}>
                          {recipe.description}
                        </Text>
                      )}
                    </div>
                  );
                }}
              />
            ) : (
              <Stack gap="xs">
                <Text size="sm" c="dimmed">
                  Recette : {craftRecipes[0]?.name}
                </Text>
                {craftRecipes[0]?.description && (
                  <Text size="xs" c="dimmed">
                    {craftRecipes[0].description}
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
                        const item = itemsWithStock.find((i) => i.id === ingredient.usedItemId);
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

        {loadingItems && (
          <Text c="dimmed" size="sm">
            Chargement des stocks...
          </Text>
        )}

        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={handleClose}>
            Annuler
          </Button>
          <Button 
            onClick={handleCraft} 
            disabled={isCraftButtonDisabled}
            title={craftButtonDisabledReason || undefined}
          >
            Craft
          </Button>
        </Group>
        {craftButtonDisabledReason && (
          <Text c="orange" size="sm" mt="md">
            ⚠️ {craftButtonDisabledReason}
          </Text>
        )}
      </Stack>
    </Modal>
  );
}

