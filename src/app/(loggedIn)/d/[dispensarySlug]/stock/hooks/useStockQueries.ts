'use client';

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { usePermissions } from '@/app/_contexts/PermissionsContext';
import {
  getItemsWithStock,
  updateStock,
  craftItem,
  transferMultipleStock,
} from '@/app/_actions/stock';
import { getStockChecksSummary } from '@/app/_actions/stockChecks';
import { handleAction } from '@/lib/action';
import { stockKeys } from '@/lib/stock/queryKeys';
import { DEFAULT_STALE_TIME_MS } from '@/lib/react-query/QueryProvider';
import { normalizeQuantity } from '@/lib/stock/expression';
import type { ItemWithRelations } from '@/types/stock';
import type { StockChecksSummary } from '@/app/_actions/stockChecks';
import { notifications } from '@mantine/notifications';

async function fetchStockItems(dispensarySlug: string, chestId: string | null) {
  const result = await getItemsWithStock(dispensarySlug, chestId);
  return handleAction(result) as ItemWithRelations[];
}

async function fetchStockChecksSummary(dispensarySlug: string) {
  const result = await getStockChecksSummary(dispensarySlug);
  return handleAction(result) as StockChecksSummary;
}

export function useStockItems(
  chestId: string | null,
  initialData: ItemWithRelations[],
) {
  const { dispensarySlug } = usePermissions();

  return useQuery({
    queryKey: stockKeys.items(dispensarySlug!, chestId),
    queryFn: () => fetchStockItems(dispensarySlug!, chestId),
    initialData: chestId === null ? initialData : undefined,
    placeholderData: (previous) => previous,
    enabled: Boolean(dispensarySlug),
    staleTime: DEFAULT_STALE_TIME_MS,
  });
}

export function useStockChecksSummary(initialData: StockChecksSummary | null) {
  const { dispensarySlug } = usePermissions();

  return useQuery({
    queryKey: stockKeys.checksSummary(dispensarySlug!),
    queryFn: () => fetchStockChecksSummary(dispensarySlug!),
    initialData: initialData ?? undefined,
    enabled: Boolean(dispensarySlug),
    staleTime: DEFAULT_STALE_TIME_MS,
  });
}

export function useInvalidateStockItems() {
  const queryClient = useQueryClient();
  const { dispensarySlug } = usePermissions();

  return (chestIds: Array<string | null>) => {
    const unique = Array.from(new Set(chestIds));
    for (const chestId of unique) {
      void queryClient.invalidateQueries({
        queryKey: stockKeys.items(dispensarySlug!, chestId),
      });
    }
  };
}

export function useUpdateStockMutation() {
  const { dispensarySlug } = usePermissions();
  const invalidateStock = useInvalidateStockItems();

  return useMutation({
    mutationFn: async (vars: {
      stockData: { itemId: string; quantity: number }[];
      targetChestId: string | null;
      skipHistory: boolean;
      chestName: string;
    }) => {
      const result = await updateStock(
        dispensarySlug!,
        vars.stockData,
        vars.targetChestId,
        { skipHistory: vars.skipHistory },
      );
      handleAction(result);
      return vars;
    },
    onSuccess: (vars) => {
      invalidateStock([null, vars.targetChestId]);
      notifications.show({
        title: 'Succès',
        message: `Stock mis à jour avec succès pour ${vars.chestName}`,
        color: 'moss',
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors de la sauvegarde du stock',
        color: 'danger',
      });
    },
  });
}

export function useCraftMutation() {
  const { dispensarySlug } = usePermissions();
  const invalidateStock = useInvalidateStockItems();

  return useMutation({
    mutationFn: async (vars: {
      itemId: string;
      recipeId: string;
      times: number;
      sourceChestId: string | null;
      ingredientChests: { ingredientId: string; chestId: string }[];
      destinationChestId: string | null;
      affectedChestIds: Array<string | null>;
    }) => {
      const result = await craftItem(dispensarySlug!, {
        craftedItemId: vars.itemId,
        recipeId: vars.recipeId,
        times: vars.times,
        sourceChestId: vars.sourceChestId,
        ingredientChests: vars.ingredientChests,
        destinationChestId: vars.destinationChestId,
      });
      if (result.status !== 200) {
        handleAction(result as Parameters<typeof handleAction>[0]);
        throw new Error('Craft failed');
      }
      const quantityProduced =
        'data' in result && result.data && 'quantityProduced' in result.data
          ? result.data.quantityProduced
          : 0;
      return { ...vars, quantityProduced };
    },
    onSuccess: (vars) => {
      invalidateStock([null, ...vars.affectedChestIds]);
    },
  });
}

export function useTransferMutation() {
  const { dispensarySlug } = usePermissions();
  const invalidateStock = useInvalidateStockItems();

  return useMutation({
    mutationFn: async (vars: {
      sourceChestId: string;
      destinationChestId: string;
      items: { itemId: string; quantity: number }[];
    }) => {
      const result = await transferMultipleStock(dispensarySlug!, vars);
      handleAction(result);
      return vars;
    },
    onSuccess: (vars) => {
      invalidateStock([null, vars.sourceChestId, vars.destinationChestId]);
      notifications.show({
        title: 'Succès',
        message: 'Transfert effectué avec succès',
        color: 'moss',
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors du transfert',
        color: 'danger',
      });
    },
  });
}

export function getChangedStockEntries(
  items: ItemWithRelations[],
  editedQuantitiesByItemId: Record<string, number | null>,
): { itemId: string; quantity: number }[] {
  return items
    .map((item) => {
      const edited = editedQuantitiesByItemId[item.id];
      const normalized = normalizeQuantity(edited);
      const previous = item.stockToday ?? null;
      if (previous === normalized) return null;
      return { itemId: item.id, quantity: normalized };
    })
    .filter((entry): entry is { itemId: string; quantity: number } => entry !== null);
}
