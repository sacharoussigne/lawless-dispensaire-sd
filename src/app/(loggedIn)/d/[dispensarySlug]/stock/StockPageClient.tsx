'use client';

import { useState, useMemo, useCallback } from 'react';
import { Container, Text, Stack, Center, Loader } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import CraftModal from './modals/CraftModal';
import TransferModal from './modals/TransferModal';
import type { ItemWithRelations } from '@/types/stock';
import { usePermissions } from '@/app/_contexts/PermissionsContext';
import type { ChestListItem } from '@/types/chests';
import { StockHeader } from './components/StockHeader';
import { ChestSelectorBar } from './components/ChestSelectorBar';
import { CategorySection } from './components/CategorySection';
import { groupItemsByCategory } from '@/lib/stock/sortItemsByCategory';
import { getContrastTextColor } from '@/lib/color/contrastTextColor';
import type { StockChecksSummary } from '@/app/_actions/stockChecks';
import type { StockUiPreferences } from '@/types/stockUiPreferences';
import {
  useStockItems,
  useStockChecksSummary,
  useUpdateStockMutation,
  useCraftMutation,
  getChangedStockEntries,
} from './hooks/useStockQueries';

interface StockPageClientProps {
  initialItems: ItemWithRelations[];
  initialChests: ChestListItem[];
  initialStockChecksSummary: StockChecksSummary;
  stockUiPreferences: StockUiPreferences;
}

export default function StockPageClient({
  initialItems,
  initialChests,
  initialStockChecksSummary,
  stockUiPreferences,
}: StockPageClientProps) {
  const { permissions } = usePermissions();
  const chests = initialChests;
  const [selectedChestId, setSelectedChestId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [craftModalOpened, setCraftModalOpened] = useState(false);
  const [transferModalOpened, setTransferModalOpened] = useState(false);
  const [editedQuantitiesByItemId, setEditedQuantitiesByItemId] = useState<Record<string, number | null>>({});
  const [skipHistory, setSkipHistory] = useState(false);

  const { data: items = initialItems, isFetching, isPending } = useStockItems(selectedChestId, initialItems);
  const { data: stockChecksSummary = initialStockChecksSummary } = useStockChecksSummary(initialStockChecksSummary);
  const updateStockMutation = useUpdateStockMutation();
  const craftMutation = useCraftMutation();

  const loading = isPending || isFetching;

  const handleStartEdit = () => {
    const initialValues: Record<string, number | null> = {};
    items.forEach((item) => {
      initialValues[item.id] = item.stockToday !== null ? item.stockToday : null;
    });
    setEditedQuantitiesByItemId(initialValues);
    setIsEditing(true);
  };

  const handleSaveStock = async () => {
    const stockData = getChangedStockEntries(items, editedQuantitiesByItemId);

    if (stockData.length === 0) {
      notifications.show({
        title: 'Avertissement',
        message: 'Aucune modification de stock à sauvegarder',
        color: 'amber',
      });
      return;
    }

    const targetChestId = selectedChestId || null;
    const chestName = targetChestId
      ? chests.find((c) => c.id === targetChestId)?.name || 'le coffre sélectionné'
      : 'Foure tout';

    try {
      await updateStockMutation.mutateAsync({
        stockData,
        targetChestId,
        skipHistory,
        chestName,
      });
      setIsEditing(false);
      setEditedQuantitiesByItemId({});
      setSkipHistory(false);
    } catch {
      // Notification handled in mutation hook
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedQuantitiesByItemId({});
    setSkipHistory(false);
  };

  const handleCommitQuantity = useCallback((itemId: string, quantity: number | null) => {
    setEditedQuantitiesByItemId((prev) => ({
      ...prev,
      [itemId]: quantity,
    }));
  }, []);

  const getTextColor = useCallback(
    (backgroundColor: string) => getContrastTextColor(backgroundColor),
    [],
  );

  const sortedCategories = useMemo(() => groupItemsByCategory(items), [items]);

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

  const chestOptions = useMemo(
    () => [
      { value: '', label: 'Tous les coffres' },
      ...chests.map((chest) => ({
        value: chest.id,
        label: chest.name,
      })),
    ],
    [chests],
  );

  return (
    <Container size="xl" py="xl">
      <StockHeader
        itemsWithStockToday={itemsWithStockToday}
        selectedChestId={selectedChestId}
        isEditing={isEditing}
        saving={updateStockMutation.isPending}
        skipHistory={skipHistory}
        canCraftReadOrWrite={Boolean(permissions?.stock.craftRead || permissions?.stock.craftWrite)}
        canStockUpdate={Boolean(permissions?.stock.update)}
        onOpenCraft={() => setCraftModalOpened(true)}
        onOpenTransfer={() => setTransferModalOpened(true)}
        onStartEdit={handleStartEdit}
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
        <Center py="xl" mih={240}>
          <Stack align="center" gap="md">
            <Loader color="sage" type="dots" size="lg" />
            <Text size="sm" c="dimmed">
              Chargement du stock…
            </Text>
          </Stack>
        </Center>
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
            />
          ))}
        </Stack>
      )}

      {craftModalOpened && (
        <CraftModal
          opened={craftModalOpened}
          onClose={() => setCraftModalOpened(false)}
          canCraft={permissions?.stock.craftWrite ?? false}
          initialChestId={selectedChestId}
          chests={chests}
          onCraft={async (itemId, recipeId, times, sourceChestId, ingredientChests, destinationChestId) => {
            if (!permissions?.stock.craftWrite) {
              notifications.show({
                title: 'Permission refusée',
                message: 'Vous n\'avez pas la permission d\'effectuer un craft.',
                color: 'danger',
              });
              return { ok: false as const };
            }
            try {
              const affectedChestIds = [
                sourceChestId,
                destinationChestId,
                ...ingredientChests.map((ic) => ic.chestId),
              ];
              const result = await craftMutation.mutateAsync({
                itemId,
                recipeId,
                times,
                sourceChestId,
                ingredientChests,
                destinationChestId,
                affectedChestIds,
              });
              notifications.show({
                title: 'Succès',
                message: `Craft effectué avec succès ! ${result.quantityProduced} objet(s) produit(s).`,
                color: 'moss',
              });
              return { ok: true as const, quantityProduced: result.quantityProduced as number };
            } catch (error) {
              notifications.show({
                title: 'Erreur',
                message: error instanceof Error ? error.message : 'Erreur lors du craft',
                color: 'danger',
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
          chests={chests}
          initialSourceChestId={selectedChestId}
        />
      )}
    </Container>
  );
}
