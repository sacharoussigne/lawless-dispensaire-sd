'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Container, Text, Stack } from '@mantine/core';
import { getItemsWithStock, updateStock, craftItem } from '@/app/_actions/stock';
import { handleAction } from '@/lib/action';
import { notifications } from '@mantine/notifications';
import CraftModal from './modals/CraftModal';
import TransferModal from './modals/TransferModal';
import type { ItemWithRelations, CategoryWithItems } from '@/types/stock';
import { usePermissions } from '@/app/_contexts/PermissionsContext';
import type { ChestWithStockHistory } from '@/types/chests';
import { StockHeader } from './components/StockHeader';
import { ChestSelectorBar } from './components/ChestSelectorBar';
import { CategorySection } from './components/CategorySection';
import { evaluateDecimalExpression, evaluateIntegerExpression } from '@/lib/stock/expression';
import { normalizeQuantity } from '@/lib/stock/stockEditing';
import { getStockChecksSummary } from '@/app/_actions/stockChecks';
import type { StockChecksSummary } from '@/app/_actions/stockChecks';
import type { StockUiPreferences } from '@/types/stockUiPreferences';

interface StockPageClientProps {
  initialItems: ItemWithRelations[];
  initialChests: ChestWithStockHistory[];
  stockUiPreferences: StockUiPreferences;
}

export default function StockPageClient({ initialItems, initialChests, stockUiPreferences }: StockPageClientProps) {
  const { permissions, dispensarySlug } = usePermissions();
  const [items, setItems] = useState<ItemWithRelations[]>(initialItems);
  const [chests] = useState<ChestWithStockHistory[]>(initialChests);
  const [selectedChestId, setSelectedChestId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [craftModalOpened, setCraftModalOpened] = useState(false);
  const [transferModalOpened, setTransferModalOpened] = useState(false);
  const [editedQuantitiesByItemId, setEditedQuantitiesByItemId] = useState<Record<string, number | null>>({});
  const [skipHistory, setSkipHistory] = useState(false);
  const [stockChecksSummary, setStockChecksSummary] = useState<StockChecksSummary | null>(null);

  const loadStockChecksSummary = async () => {
    try {
      const result = await getStockChecksSummary(dispensarySlug!, );
      const data = handleAction(result);
      if (data) setStockChecksSummary(data);
    } catch {
      setStockChecksSummary(null);
    }
  };

  const loadItems = async () => {
    try {
      setLoading(true);
      const result = await getItemsWithStock(dispensarySlug!, selectedChestId);
      const data = handleAction(result);
      if (data) {
        setItems(data);
      }
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors du chargement des objets',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChestId]);

  useEffect(() => {
    loadStockChecksSummary();
     
  }, []);

  useEffect(() => {
    if (isEditing && items.length > 0) {
      const initialValues: Record<string, number | null> = {};
      items.forEach((item) => {
        initialValues[item.id] = item.stockToday !== null ? item.stockToday : null;
      });
      setEditedQuantitiesByItemId(initialValues);
    }
  }, [isEditing, items]);

  const handleSaveStock = async () => {
    try {
      setSaving(true);

      // Normalize empty inputs to 0 so validation always persists explicit zeros
      const normalizedStockValues: Record<string, number> = Object.fromEntries(
        items.map((item) => [item.id, normalizeQuantity(editedQuantitiesByItemId[item.id])]),
      );

      // If no chest is selected, use "foure tout" chest by default
      // This ensures we always modify a specific chest
      const targetChestId = selectedChestId || null;

      const stockData = Object.entries(normalizedStockValues).map(([itemId, quantity]) => ({
        itemId,
        quantity,
      }));

      if (stockData.length === 0) {
        notifications.show({
          title: 'Avertissement',
          message: 'Aucun stock à sauvegarder',
          color: 'yellow',
        });
        return;
      }

      const result = await updateStock(dispensarySlug!, stockData, targetChestId, { skipHistory });
      handleAction(result);

      const chestName = targetChestId
        ? chests.find(c => c.id === targetChestId)?.name || 'le coffre sélectionné'
        : 'Foure tout';

      notifications.show({
        title: 'Succès',
        message: `Stock mis à jour avec succès pour ${chestName}`,
        color: 'green',
      });

      setIsEditing(false);
      setEditedQuantitiesByItemId({});
      setSkipHistory(false);
      await loadItems();
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors de la sauvegarde du stock',
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedQuantitiesByItemId({});
    setSkipHistory(false);
  };

  // Expression helpers moved to src/lib/stock/expression.ts

  const handleCommitQuantity = useCallback((itemId: string, quantity: number | null) => {
    setEditedQuantitiesByItemId((prev) => ({
      ...prev,
      [itemId]: quantity,
    }));
  }, []);

  const getLuminance = useCallback((hex: string): number => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const [rs, gs, bs] = [r, g, b].map((val) => {
      return val <= 0.03928
        ? val / 12.92
        : Math.pow((val + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }, []);

  const getTextColor = useCallback((backgroundColor: string): string => {
    const luminance = getLuminance(backgroundColor);
    return luminance > 0.5 ? '#000000' : '#ffffff';
  }, [getLuminance]);

  const itemsByCategory = useMemo(() => {
    return items.reduce((acc, item) => {
      if (!item.category) return acc;

      const categoryId = item.category.id;
      if (!acc[categoryId]) {
        acc[categoryId] = {
          category: item.category,
          items: [],
        };
      }
      acc[categoryId].items.push(item);
      return acc;
    }, {} as Record<string, CategoryWithItems>);
  }, [items]);

  const sortedCategories = useMemo(() => {
    const categories = [...Object.values(itemsByCategory)].sort((a, b) => {
      if (a.category.order !== undefined && b.category.order !== undefined) {
        return a.category.order - b.category.order;
      }
      if (a.category.order !== undefined) return -1;
      if (b.category.order !== undefined) return 1;
      return a.category.name.localeCompare(b.category.name, 'fr', { sensitivity: 'base' });
    });

    return categories.map((cat) => ({
      ...cat,
      items: [...cat.items].sort((a, b) => {
        if (a.order !== undefined && b.order !== undefined) {
          return a.order - b.order;
        }
        if (a.order !== undefined) return -1;
        if (b.order !== undefined) return 1;
        return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });
      }),
    }));
  }, [itemsByCategory]);

  const isCategoryCheckEnabled = useCallback((categoryId: string): boolean => {
    if (!stockChecksSummary) return true;

    const isEnabledForChest = (chestId: string): boolean => {
      const cfg = stockChecksSummary.configsByChestId[chestId];
      if (!cfg) return true;
      return cfg.isEnabled;
    };

    const isCategoryEnabledForChest = (chestId: string): boolean => {
      const cfg = stockChecksSummary.configsByChestId[chestId];
      if (!cfg) return true;
      if (!cfg.isEnabled) return false;
      if (cfg.categoryIds.length === 0) return true;
      return cfg.categoryIds.includes(categoryId);
    };

    if (selectedChestId) {
      if (!isEnabledForChest(selectedChestId)) return false;
      return isCategoryEnabledForChest(selectedChestId);
    }

    return stockChecksSummary.enabledChestIds.some((chestId) => isCategoryEnabledForChest(chestId));
  }, [selectedChestId, stockChecksSummary]);

  const { itemsWithStockToday, totalItems, totalWeightToday } = useMemo(() => {
    const withStock = items.filter((item) => item.stockToday !== null).length;

    const totalWeight = items.reduce((sum, item) => {
      if (item.stockToday === null || item.weight == null) {
        return sum;
      }
      return sum + item.stockToday * item.weight;
    }, 0);

    return {
      itemsWithStockToday: withStock,
      totalItems: items.length,
      totalWeightToday: totalWeight,
    };
  }, [items]);

  const chestOptions = useMemo(() => [
    { value: '', label: 'Tous les coffres' },
    ...chests.map((chest) => ({
      value: chest.id,
      label: chest.name,
    })),
  ], [chests]);

  return (
    <Container size="xl" py="xl">
      <StockHeader
        itemsWithStockToday={itemsWithStockToday}
        totalItems={totalItems}
        selectedChestId={selectedChestId}
        isEditing={isEditing}
        saving={saving}
        skipHistory={skipHistory}
        canCraftReadOrWrite={Boolean(permissions?.stock.craftRead || permissions?.stock.craftWrite)}
        canStockUpdate={Boolean(permissions?.stock.update)}
        onOpenCraft={() => setCraftModalOpened(true)}
        onOpenTransfer={() => setTransferModalOpened(true)}
        onStartEdit={() => setIsEditing(true)}
        onCancelEdit={handleCancelEdit}
        onSave={handleSaveStock}
        onSkipHistoryChange={setSkipHistory}
      />

      <ChestSelectorBar
        chestOptions={chestOptions}
        selectedChestId={selectedChestId}
        isEditing={isEditing}
        totalWeightToday={totalWeightToday}
        itemsWithStockToday={itemsWithStockToday}
        totalItems={totalItems}
        onChangeChestId={setSelectedChestId}
      />

      {loading ? (
        <Text>Chargement...</Text>
      ) : sortedCategories.length === 0 ? (
        <Text c="dimmed">Aucun objet trouvé</Text>
      ) : (
        <Stack gap="xl">
          {sortedCategories.map((categoryData) => (
            <CategorySection
              key={categoryData.category.id}
              categoryData={categoryData}
              editedQuantitiesByItemId={editedQuantitiesByItemId}
              isEditing={isEditing}
              canStockUpdate={Boolean(permissions?.stock.update)}
              selectedChestId={selectedChestId}
              isCategoryCheckEnabled={isCategoryCheckEnabled}
              getTextColor={getTextColor}
              stockUiPreferences={stockUiPreferences}
              onCommitQuantity={handleCommitQuantity}
              evaluateIntegerExpression={evaluateIntegerExpression}
              evaluateDecimalExpression={evaluateDecimalExpression}
            />
          ))}
        </Stack>
      )}

      {craftModalOpened && (
        <CraftModal
          opened={craftModalOpened}
          onClose={() => setCraftModalOpened(false)}
          items={items}
          canCraft={permissions?.stock.craftWrite ?? false}
          initialChestId={selectedChestId}
          chests={chests}
          onCraft={async (itemId, recipeId, times, sourceChestId, ingredientChests, destinationChestId) => {
            if (!permissions?.stock.craftWrite) {
              notifications.show({
                title: 'Permission refusée',
                message: 'Vous n\'avez pas la permission d\'effectuer un craft.',
                color: 'red',
              });
              return { ok: false as const };
            }
            try {
              const result = await craftItem(dispensarySlug!, {
                craftedItemId: itemId,
                recipeId,
                times,
                sourceChestId,
                ingredientChests,
                destinationChestId,
              });

              if (result.status === 200 && 'data' in result && result.data && 'quantityProduced' in result.data) {
                notifications.show({
                  title: 'Succès',
                  message: `Craft effectué avec succès ! ${result.data.quantityProduced} objet(s) produit(s).`,
                  color: 'green',
                });
                await loadItems(); // Recharger les items pour mettre à jour les stocks
                return { ok: true as const, quantityProduced: result.data.quantityProduced as number };
              } else {
                const errorMessage = 'error' in result
                  ? (typeof result.error === 'string' ? result.error : 'Erreur lors du craft')
                  : 'Erreur lors du craft';
                notifications.show({
                  title: 'Erreur',
                  message: errorMessage,
                  color: 'red',
                });
                return { ok: false as const };
              }
            } catch (error: any) {
              notifications.show({
                title: 'Erreur',
                message: error.message || 'Erreur lors du craft',
                color: 'red',
              });
              return { ok: false as const };
            }
          }}
        />
      )}

      {transferModalOpened && (
        <TransferModal
          opened={transferModalOpened}
          onClose={() => setTransferModalOpened(false)}
          items={items}
          chests={chests}
          initialSourceChestId={selectedChestId}
          onTransfer={async () => {
            await loadItems(); // Recharger les items pour mettre à jour les stocks
          }}
        />
      )}
    </Container>
  );
}

