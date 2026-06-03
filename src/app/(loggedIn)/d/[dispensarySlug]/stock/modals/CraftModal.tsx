'use client';

import { usePermissions } from '@/app/_contexts/PermissionsContext';
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Modal,
  Stack,
  Select,
  NumberInput,
  Text,
  Button,
  Group,
  Alert,
  ScrollArea,
  Divider,
  SimpleGrid,
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { getCraftRecipesByItemId } from '@/app/_actions/craftRecipes';
import { getItemsWithStock } from '@/app/_actions/stock';
import { handleAction } from '@/lib/action';
import { notifications } from '@mantine/notifications';
import type { ItemWithRelations } from '@/types/stock';
import type { ChestWithStockHistory } from '@/types/chests';
import {
  type CraftContextV1,
  loadCraftNavStack,
  pushCraftNavStack,
  popCraftNavStack,
  clearCraftNavStack,
  getLastRecipeIdForItem,
  setLastRecipeIdForItem,
} from './craftNavStorage';
import { CraftNavigationBar } from './components/CraftNavigationBar';
import { CraftIngredientsTable, type CraftIngredientRow } from './components/CraftIngredientsTable';

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
  ) => Promise<{ ok: true; quantityProduced?: number } | { ok: false }>;
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
  const { dispensarySlug } = usePermissions();
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
  const [navStack, setNavStack] = useState<CraftContextV1[]>([]);
  const cacheRef = useRef<Record<string, ItemWithRelations[]>>({});
  const loadingChestsRef = useRef<Set<string>>(new Set());

  const loadChestItemsIfNeeded = useCallback(async (chestId: string | null, opts?: { force?: boolean }) => {
    if (!chestId) {
      return;
    }

    const force = opts?.force ?? false;

    if (!force && cacheRef.current[chestId]) {
      return;
    }

    if (loadingChestsRef.current.has(chestId)) {
      return;
    }

    loadingChestsRef.current.add(chestId);
    setLoadingItems(true);
    
    try {
      const result = await getItemsWithStock(dispensarySlug!, chestId);
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

  const refreshChests = useCallback(async (chestIds: Array<string | null | undefined>) => {
    const unique = Array.from(new Set(chestIds.filter(Boolean))) as string[];
    if (unique.length === 0) return;
    await Promise.all(unique.map((id) => loadChestItemsIfNeeded(id, { force: true })));
  }, [loadChestItemsIfNeeded]);

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
    if (!opened) return;
    setNavStack(loadCraftNavStack());
  }, [opened]);

  useEffect(() => {
    if (opened && sourceChestId) {
      loadChestItemsIfNeeded(sourceChestId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, sourceChestId]);

  // Reset states when modal closes
  useEffect(() => {
    if (!opened) {
      setSelectedCraftItem(null);
      setCraftQuantity(1);
      setSelectedRecipe(null);
      setCraftRecipes([]);
      setDestinationChestId(null);
      setIngredientChests({});
      setNavStack([]);
    }
  }, [opened]);

  useEffect(() => {
    if (sourceChestId && (!destinationChestId || destinationChestId === sourceChestId)) {
      setDestinationChestId(sourceChestId);
      loadChestItemsIfNeeded(sourceChestId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceChestId]);

  // Reset ingredient chests when base source chest changes
  useEffect(() => {
    if (sourceChestId) {
      setIngredientChests((prev) => {
        const updated: Record<string, string> = {};
        // Keep existing values but reset those that haven't been modified
        Object.keys(prev).forEach((ingredientId) => {
          updated[ingredientId] = prev[ingredientId];
        });
        return updated;
      });
    }
  }, [sourceChestId]);

  // Reset ingredient chests when recipe changes
  useEffect(() => {
    if (selectedRecipe) {
      setIngredientChests({});
    }
  }, [selectedRecipe]);

  const loadRecipesForItem = useCallback(async (itemId: string) => {
    setLoadingRecipes(true);
    try {
      const result = await getCraftRecipesByItemId(dispensarySlug!, itemId, true);
      const data = handleAction(result);
      return (data ?? []) as CraftRecipeWithIngredients[];
    } finally {
      setLoadingRecipes(false);
    }
  }, []);

  const handleItemChange = async (value: string | null, opts?: { preselectRecipeId?: string | null }) => {
    setSelectedCraftItem(value);
    setSelectedRecipe(null);
    if (value) {
      try {
        const data = await loadRecipesForItem(value);
        setCraftRecipes(data);

        const preselect = opts?.preselectRecipeId ?? null;
        if (preselect && data.some((r) => r.id === preselect)) {
          setSelectedRecipe(preselect);
          setLastRecipeIdForItem(value, preselect);
          return;
        }

        if (data.length === 1) {
          setSelectedRecipe(data[0].id);
          setLastRecipeIdForItem(value, data[0].id);
          return;
        }

        const last = getLastRecipeIdForItem(value);
        if (last && data.some((r) => r.id === last)) {
          setSelectedRecipe(last);
          return;
        }
      } catch (error: any) {
        notifications.show({
          title: 'Erreur',
          message: error.message || 'Erreur lors du chargement des recettes',
          color: 'red',
        });
      } finally {
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
    clearCraftNavStack();
    setNavStack([]);
    onClose();
  };

  const applyContext = useCallback(async (ctx: CraftContextV1) => {
    setSourceChestId(ctx.sourceChestId);
    setDestinationChestId(ctx.destinationChestId);
    setIngredientChests(ctx.ingredientChests || {});
    setCraftQuantity(ctx.times || 1);

    if (ctx.craftedItemId) {
      await handleItemChange(ctx.craftedItemId, { preselectRecipeId: ctx.recipeId });
    } else {
      await handleItemChange(null);
    }
  }, [handleItemChange]);

  const handleBack = useCallback(async () => {
    const { stack, popped } = popCraftNavStack();
    setNavStack(stack);
    if (popped) {
      await applyContext(popped);
    }
  }, [applyContext]);

  const handleResetNavigation = useCallback(() => {
    clearCraftNavStack();
    setNavStack([]);
  }, []);

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

    // Build array of source chests per ingredient
    const ingredientChestsArray = recipe.ingredients.map((ingredient) => ({
      ingredientId: ingredient.id,
      chestId: ingredientChests[ingredient.id] || sourceChestId,
    }));

    const result = await onCraft(
      selectedCraftItem,
      selectedRecipe,
      craftQuantity,
      sourceChestId,
      ingredientChestsArray,
      destinationChestId
    );

    if (!result.ok) {
      return;
    }

    await refreshChests([
      sourceChestId,
      destinationChestId,
      ...ingredientChestsArray.map((c) => c.chestId),
    ]);

    if (navStack.length > 0) {
      await handleBack();
      return;
    }

    handleClose();
  };

  // Helper to get available stock of an item in a specific chest
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

  const chestOptions = chests.map((chest) => ({
    value: chest.id,
    label: chest.name,
  }));

  const destinationChestOptions = chests.map((chest) => ({
    value: chest.id,
    label: chest.name,
  }));

  // Validations for craft button
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

  const getCurrentContext = useCallback((): CraftContextV1 => {
    return {
      craftedItemId: selectedCraftItem,
      recipeId: selectedRecipe,
      times: craftQuantity,
      sourceChestId,
      destinationChestId,
      ingredientChests,
    };
  }, [craftQuantity, destinationChestId, ingredientChests, selectedCraftItem, selectedRecipe, sourceChestId]);

  const handleDrillDownToIngredient = useCallback(async (ingredient: CraftRecipeWithIngredients['ingredients'][number], requiredQuantity: number, stockInfo: { stock: number | null; isToday: boolean }) => {
    const ingredientItemId = ingredient.usedItemId;

    const recipes = await loadRecipesForItem(ingredientItemId);
    if (!recipes || recipes.length === 0) {
      notifications.show({
        title: 'Impossible',
        message: 'Aucune recette disponible pour cet ingrédient',
        color: 'yellow',
      });
      return;
    }

    const last = getLastRecipeIdForItem(ingredientItemId);
    const preferred = last && recipes.some((r) => r.id === last) ? last : (recipes[0]?.id ?? null);
    const recipe = recipes.find((r) => r.id === preferred) ?? recipes[0];
    if (!recipe) return;

    const available = stockInfo.isToday && stockInfo.stock != null ? stockInfo.stock : 0;
    const missing = Math.max(0, requiredQuantity - available);
    const yieldPerCraft = Math.max(1, recipe.quantity);
    const timesNeeded = Math.max(1, Math.ceil(missing / yieldPerCraft));

    const nextCtx: CraftContextV1 = {
      craftedItemId: ingredientItemId,
      recipeId: recipe.id,
      times: timesNeeded,
      sourceChestId,
      destinationChestId,
      ingredientChests: {},
    };

    const currentCtx = getCurrentContext();
    const nextStack = pushCraftNavStack(currentCtx);
    setNavStack(nextStack);

    setCraftRecipes(recipes);
    setSelectedCraftItem(ingredientItemId);
    setSelectedRecipe(recipe.id);
    setLastRecipeIdForItem(ingredientItemId, recipe.id);
    setCraftQuantity(timesNeeded);
    setIngredientChests({});
  }, [destinationChestId, getCurrentContext, loadRecipesForItem, sourceChestId]);

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Craft d'objet"
      size="lg"
      yOffset={60}
      scrollAreaComponent={ScrollArea.Autosize}
    >
      <Stack gap="lg">
        <CraftNavigationBar depth={navStack.length} onBack={handleBack} onReset={handleResetNavigation} />
        <Stack gap="sm">
          <Text fw={600} size="xs" c="dimmed" tt="uppercase">
            Coffres
          </Text>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
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
          </SimpleGrid>
        </Stack>

        <Stack gap="sm">
          <Text fw={600} size="xs" c="dimmed" tt="uppercase">
            Objet et recette
          </Text>
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
            onChange={(value) => handleItemChange(value)}
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
                onChange={(value) => {
                  setSelectedRecipe(value);
                  if (selectedCraftItem && value) {
                    setLastRecipeIdForItem(selectedCraftItem, value);
                  }
                }}
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

                <Divider />

                <CraftIngredientsTable
                  rows={selectedRecipeData.ingredients.map((ingredient): CraftIngredientRow => {
                    const requiredQuantity = ingredient.quantity * craftQuantity;
                    const ingredientChestId = ingredientChests[ingredient.id] || sourceChestId;
                    const stockInfo = getItemStockInChest(ingredient.usedItemId, ingredientChestId);
                    const hasEnough = stockInfo.isToday && stockInfo.stock !== null && stockInfo.stock >= requiredQuantity;
                    const isActionableMissing = stockInfo.stock === null || !stockInfo.isToday || !hasEnough;

                    return {
                      id: ingredient.id,
                      usedItemId: ingredient.usedItemId,
                      usedItemName: ingredient.usedItem.name,
                      requiredQuantity,
                      ingredientChestId,
                      stockInfo,
                      hasEnough,
                      isActionableMissing,
                    };
                  })}
                  chestOptions={chestOptions}
                  disabled={!sourceChestId}
                  onChangeIngredientChest={handleIngredientChestChange}
                  onDrillDown={(ingredientId) => {
                    const ingredient = selectedRecipeData.ingredients.find((i) => i.id === ingredientId);
                    if (!ingredient) return;

                    const requiredQuantity = ingredient.quantity * craftQuantity;
                    const ingredientChestId = ingredientChests[ingredient.id] || sourceChestId;
                    const stockInfo = getItemStockInChest(ingredient.usedItemId, ingredientChestId);
                    handleDrillDownToIngredient(ingredient, requiredQuantity, stockInfo);
                  }}
                />
              </>
            )}
          </>
        )}
        </Stack>

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
