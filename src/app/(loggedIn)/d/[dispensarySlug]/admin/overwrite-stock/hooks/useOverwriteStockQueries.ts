'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRequiredDispensarySlug } from '@/app/_contexts/PermissionsContext';
import { getItemsWithStockForDate, overwriteStockForDate } from '@/app/_actions/stock';
import { handleAction } from '@/lib/action';
import { DEFAULT_STALE_TIME_MS } from '@/lib/react-query/QueryProvider';
import type { ItemWithStock } from '@/types/overwriteStock';
import { notifications } from '@mantine/notifications';
import dayjs from '@/lib/dayjs';

export const overwriteStockKeys = {
  all: (slug: string) => ['overwrite-stock', slug] as const,
  items: (slug: string, date: string, chestId: string | null) =>
    [...overwriteStockKeys.all(slug), 'items', date, chestId] as const,
};

export function useOverwriteStockItems(
  selectedDate: string,
  selectedChestId: string | null,
  initialItems: ItemWithStock[],
  initialDate: string,
) {
  const dispensarySlug = useRequiredDispensarySlug();
  const isInitial =
    selectedDate === initialDate &&
    selectedChestId === null;

  return useQuery({
    queryKey: overwriteStockKeys.items(dispensarySlug, selectedDate, selectedChestId),
    queryFn: async () => {
      const date = dayjs(selectedDate).toDate();
      const result = await getItemsWithStockForDate(dispensarySlug, date, selectedChestId);
      return handleAction(result) as ItemWithStock[];
    },
    initialData: isInitial ? initialItems : undefined,
    enabled: Boolean(dispensarySlug && selectedDate),
    staleTime: DEFAULT_STALE_TIME_MS,
  });
}

export function useOverwriteStockMutation() {
  const dispensarySlug = useRequiredDispensarySlug();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vars: {
      date: string;
      chestId: string;
      stocks: { itemId: string; quantity: number }[];
      chestName: string;
      queryKey: readonly unknown[];
    }) => {
      const result = await overwriteStockForDate(dispensarySlug, {
        date: dayjs(vars.date).toDate(),
        stocks: vars.stocks,
        chestId: vars.chestId,
      });
      handleAction(result);
      return vars;
    },
    onSuccess: (vars) => {
      void queryClient.invalidateQueries({ queryKey: vars.queryKey });
      notifications.show({
        title: 'Succès',
        message: `Stocks écrasés avec succès pour ${vars.chestName}`,
        color: 'moss',
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors de l\'écrasement des stocks',
        color: 'danger',
      });
    },
  });
}
