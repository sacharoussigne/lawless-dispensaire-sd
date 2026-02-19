'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Modal,
  Stack,
  Select,
  NumberInput,
  Text,
  Button,
  Group,
  Paper,
  Alert,
  Badge,
  Table,
  ScrollArea,
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
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
  canCraft?: boolean;
  onCraft: (
    itemId: string,
    recipeId: string,
    times: number,
    sourceChestId: string | null,
    ingredientChests: { ingredientId: string; chestId: string }[],
    destinationChestId: string | null
  ) => void;
  initialChestId?: string | null;
  chests?: ChestWithStockHistory[];
}

export default function CraftModal({
  opened,
  onClose,
  items,
  canCraft = true,
  onCraft,
  initialChestId = null,
  chests = [],
}: CraftModalProps) {
  const [selectedCraftItem, setSelectedCraftItem] = useState<string | null>(null);
  const [craftQuantity, setCraftQuantity] = useState<number>(1);
  const [selectedRecipe, setSelectedRecipe] = useState<string | null>(null);
  const [craftRecipes, setCraftRecipes] = useState<CraftRecipeWithIngredients[]>([]);
  const [loadingRecipes, setLoadingRecipes] = useState(false);
  const [sourceChestId, setSourceChestId] = useState<string | null>(initialChestId);
  const [destinationChestId, setDestinationChestId] = useState<string | null>(initialChestId);
  const [ingredientChests, setIngredientChests] = useState<Record<string, string>>({});
  const [itemsWithStockByChest, setItemsWithStockByChest] = useState<Record<string, ItemWithRelations[]>>({});
  const [loadingItems, setLoadingItems] = useState(false);
  const cacheRef = useRef<Record<string, ItemWithRelations[]>>({});
  const loadingChestsRef = useRef<Set<string>>(new Set());

  const loadChestItemsIfNeeded = useCallback(async (chestId: string | null) => {
    if (!chestId) {
      return;
    }

    if (cacheRef.current[chestId]) {
      return;
    }

    if (loadingChestsRef.current.has(chestId)) {
      return;
    }

    loadingChestsRef.current.add(chestId);
    setLoadingItems(true);
    
    try {
      const result = await getItemsWithStock(chestId);
      const data = handleAction(result);
      if (data) {
        cacheRef.current[chestId] = data;
        setItemsWithStockByChest((prev) => ({
          ...prev,
          [chestId]: data,
        }));
      }
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors du chargement des stocks',
        color: 'red',
      });
    } finally {
      loadingChestsRef.current.delete(chestId);
      setLoadingItems(false);
    }
  }, []);

  useEffect(() => {
    cacheRef.current = itemsWithStockByChest;
  }, [itemsWithStockByChest]);

  useEffect(() => {
    if (opened && initialChestId !== null) {
      setSourceChestId(initialChestId);
      setDestinationChestId(initialChestId);
    } else if (opened && initialChestId === null) {
      setSourceChestId(null);
      setDestinationChestId(null);
    }
  }, [opened, initialChestId]);

  useEffect(() => {
    if (opened && sourceChestId) {
      loadChestItemsIfNeeded(sourceChestId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, sourceChestId]);

  // Réinitialiser les états quand la modal se ferme
  useEffect(() => {
    if (!opened) {
      setSelectedCraftItem(null);
      setCraftQuantity(1);
      setSelectedRecipe(null);
      setCraftRecipes([]);
      setDestinationChestId(null);
      setIngredientChests({});
    }
  }, [opened]);

  useEffect(() => {
    if (sourceChestId && (!destinationChestId || destinationChestId === sourceChestId)) {
      setDestinationChestId(sourceChestId);
      loadChestItemsIfNeeded(sourceChestId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceChestId]);

  // Réinitialiser les coffres des ingrédients quand le coffre source de base change
  useEffect(() => {
    if (sourceChestId) {
      setIngredientChests((prev) => {
        const updated: Record<string, string> = {};
        // Garder les valeurs existantes mais réinitialiser celles qui n'ont pas été modifiées
        Object.keys(prev).forEach((ingredientId) => {
          updated[ingredientId] = prev[ingredientId];
        });
        return updated;
      });
    }
  }, [sourceChestId]);

  // Réinitialiser les coffres des ingrédients quand la recette change
  useEffect(() => {
    if (selectedRecipe) {
      setIngredientChests({});
    }
  }, [selectedRecipe]);

  const handleItemChange = async (value: string | null) => {
    setSelectedCraftItem(value);
    setSelectedRecipe(null);
    if (value) {
      setLoadingRecipes(true);
      try {
        const result = await getCraftRecipesByItemId(value, true);
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
    setDestinationChestId(null);
    setIngredientChests({});
    onClose();
  };

  const handleIngredientChestChange = useCallback(async (ingredientId: string, chestId: string | null) => {
    if (chestId) {
      await loadChestItemsIfNeeded(chestId);
      
      setIngredientChests((prev) => ({
        ...prev,
        [ingredientId]: chestId,
      }));
    } else {
      setIngredientChests((prev) => {
        const updated = { ...prev };
        delete updated[ingredientId];
        return updated;
      });
    }
  }, [loadChestItemsIfNeeded]);

  const handleCraft = async () => {
    if (!selectedCraftItem || !selectedRecipe || !sourceChestId || !destinationChestId) return;
    
    const recipe = craftRecipes.find((r) => r.id === selectedRecipe);
    if (!recipe) return;

    // Construire le tableau des coffres sources par ingrédient
    const ingredientChestsArray = recipe.ingredients.map((ingredient) => ({
      ingredientId: ingredient.id,
      chestId: ingredientChests[ingredient.id] || sourceChestId,
    }));

    await onCraft(
      selectedCraftItem,
      selectedRecipe,
      craftQuantity,
      sourceChestId,
      ingredientChestsArray,
      destinationChestId
    );
  };

  // Helper pour obtenir le stock disponible d'un item dans un coffre spécifique
  const getItemStockInChest = (itemId: string, chestId: string | null): { stock: number | null; isToday: boolean } => {
    if (!chestId) return { stock: null, isToday: false };
    
    const itemsInChest = itemsWithStockByChest[chestId] || [];
    const item = itemsInChest.find((i) => i.id === itemId);
    
    if (!item) return { stock: null, isToday: false };
    
    if (item.stockToday !== null && item.stockToday !== undefined) {
      return { stock: item.stockToday, isToday: true };
    }
    
    if (item.stockYesterday !== null && item.stockYesterday !== undefined) {
      return { stock: item.stockYesterday, isToday: false };
    }
    
    return { stock: null, isToday: false };
  };

  // Options pour les coffres
  const chestOptions = chests.map((chest) => ({
    value: chest.id,
    label: chest.name,
  }));

  const destinationChestOptions = chests.map((chest) => ({
    value: chest.id,
    label: chest.name,
  }));

  // Vérifications pour le bouton de craft
  const getCraftValidation = () => {
    if (!canCraft) {
      return { canCraft: false, reason: "Vous n'avez pas la permission d'effectuer un craft" };
    }

    if (!sourceChestId) {
      return { canCraft: false, reason: 'Veuillez sélectionner un coffre source de base' };
    }

    if (!destinationChestId) {
      return { canCraft: false, reason: 'Veuillez sélectionner un coffre de destination' };
    }

    if (!selectedCraftItem || !selectedRecipe || craftQuantity < 1) {
      return { canCraft: false, reason: null };
    }

    const recipe = craftRecipes.find((r) => r.id === selectedRecipe);
    if (!recipe) {
      return { canCraft: false, reason: null };
    }

    // Vérifier chaque ingrédient
    const ingredientChecks = recipe.ingredients.map((ingredient) => {
      const requiredQuantity = ingredient.quantity * craftQuantity;
      const ingredientChestId = ingredientChests[ingredient.id] || sourceChestId;
      const stockInfo = getItemStockInChest(ingredient.usedItemId, ingredientChestId);

      return {
        ingredient,
        requiredQuantity,
        stockInfo,
        hasEnough: stockInfo.isToday && stockInfo.stock !== null && stockInfo.stock >= requiredQuantity,
      };
    });

    const missingStockItems = ingredientChecks.filter((check) => !check.stockInfo.isToday || check.stockInfo.stock === null);
    if (missingStockItems.length > 0) {
      return {
        canCraft: false,
        reason: `Stock d'aujourd'hui manquant pour : ${missingStockItems.map((c) => c.ingredient.usedItem.name).join(', ')}`,
      };
    }

    const insufficientStockItems = ingredientChecks.filter((check) => !check.hasEnough);
    if (insufficientStockItems.length > 0) {
      return {
        canCraft: false,
        reason: `Stock insuffisant pour : ${insufficientStockItems
          .map((c) => `${c.ingredient.usedItem.name} (${c.requiredQuantity} requis, ${c.stockInfo.stock} disponible)`)
          .join(', ')}`,
      };
    }

    return { canCraft: true, reason: null };
  };

  const validation = getCraftValidation();
  const isCraftButtonDisabled = !validation.canCraft;

  const selectedRecipeData = craftRecipes.find((r) => r.id === selectedRecipe) || craftRecipes[0];
  const totalQuantityProduced = selectedRecipeData ? selectedRecipeData.quantity * craftQuantity : 0;

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Craft d'objet"
      size="lg"
      yOffset={60}
      scrollAreaComponent={ScrollArea.Autosize}
    >
      <Stack gap="md">
        <Alert icon={<IconAlertCircle size={16} />} title="Information" color="blue">
          Sélectionnez un coffre source de base, puis choisissez individuellement le coffre source pour chaque ingrédient. Le résultat du craft sera déposé dans le coffre de destination.
        </Alert>

        <Group grow align="flex-end">
          <Select
            label="Coffre source de base"
            placeholder="Sélectionner le coffre source"
            data={chestOptions}
            value={sourceChestId}
            onChange={(value) => setSourceChestId(value)}
            required
            clearable={false}
          />

          <Select
            label="Coffre de destination"
            placeholder="Sélectionner le coffre destination"
            data={destinationChestOptions}
            value={destinationChestId}
            onChange={(value) => setDestinationChestId(value)}
            required
            clearable={false}
          />
        </Group>

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
          disabled={loadingItems}
        />

        {selectedCraftItem && craftRecipes.length > 0 && (
          <>
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

            {selectedRecipeData && (
              <>
                <NumberInput
                  label="Nombre de fois à craft"
                  placeholder="Nombre de fois"
                  value={craftQuantity}
                  onChange={(value) => setCraftQuantity(typeof value === 'number' ? value : 1)}
                  min={1}
                  required
                  description={`Quantité totale produite : ${totalQuantityProduced}`}
                />

                <Paper withBorder shadow="xs" p="sm">
                  <Stack gap="xs">
                    <Text size="sm" fw={500}>
                      Ingrédients nécessaires
                    </Text>
                    <Table striped highlightOnHover>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Ingrédient</Table.Th>
                          <Table.Th style={{ width: 180 }}>Coffre source</Table.Th>
                          <Table.Th style={{ width: 120 }}>Stock</Table.Th>
                          <Table.Th style={{ width: 100 }}>Requis</Table.Th>
                          <Table.Th style={{ width: 60 }}>Statut</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {selectedRecipeData.ingredients.map((ingredient) => {
                          const requiredQuantity = ingredient.quantity * craftQuantity;
                          const ingredientChestId = ingredientChests[ingredient.id] || sourceChestId;
                          const stockInfo = getItemStockInChest(ingredient.usedItemId, ingredientChestId);
                          const hasEnough = stockInfo.isToday && stockInfo.stock !== null && stockInfo.stock >= requiredQuantity;

                          return (
                            <Table.Tr key={ingredient.id}>
                              <Table.Td>
                                <Text fw={500}>{ingredient.usedItem.name}</Text>
                              </Table.Td>
                              <Table.Td>
                                <Select
                                  data={chestOptions}
                                  value={ingredientChestId}
                                  onChange={(value) => handleIngredientChestChange(ingredient.id, value)}
                                  size="xs"
                                  disabled={!sourceChestId}
                                />
                              </Table.Td>
                              <Table.Td>
                                {stockInfo.stock !== null ? (
                                  <Badge
                                    color={stockInfo.isToday ? 'blue' : 'orange'}
                                    variant="light"
                                  >
                                    {stockInfo.stock} {stockInfo.isToday ? '' : '(hier)'}
                                  </Badge>
                                ) : (
                                  <Text size="xs" c="red">
                                    Aucun stock
                                  </Text>
                                )}
                              </Table.Td>
                              <Table.Td>
                                <Text size="sm" fw={500}>
                                  {requiredQuantity}
                                </Text>
                              </Table.Td>
                              <Table.Td>
                                {stockInfo.stock !== null ? (
                                  hasEnough ? (
                                    <Badge color="green" size="sm">
                                      ✓
                                    </Badge>
                                  ) : (
                                    <Badge color={stockInfo.isToday ? 'red' : 'orange'} size="sm">
                                      ✗
                                    </Badge>
                                  )
                                ) : (
                                  <Badge color="red" size="sm">
                                    ✗
                                  </Badge>
                                )}
                              </Table.Td>
                            </Table.Tr>
                          );
                        })}
                      </Table.Tbody>
                    </Table>
                  </Stack>
                </Paper>
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

        {loadingItems && (
          <Text c="dimmed" size="sm">
            Chargement des stocks...
          </Text>
        )}

        {validation.reason && (
          <Alert icon={<IconAlertCircle size={16} />} title="Attention" color="orange">
            {validation.reason}
          </Alert>
        )}

        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={handleClose}>
            Annuler
          </Button>
          <Button onClick={handleCraft} disabled={isCraftButtonDisabled} color="blue">
            Craft
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
