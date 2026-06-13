'use client';

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { usePermissions } from '@/app/_contexts/PermissionsContext';
import {
  createChest,
  getChests,
  updateChest,
  deleteChest,
  reorderChests,
} from '@/app/_actions/chests';
import {
  getChestStockCheckForm,
  upsertChestStockCheckConfig,
} from '@/app/_actions/stockChecks';
import { handleAction } from '@/lib/action';
import { ParsedZodError } from '@/lib/errors/ParsedZodError';
import { DEFAULT_STALE_TIME_MS } from '@/lib/react-query/QueryProvider';
import { chestsKeys } from '@/lib/chests/queryKeys';
import { sortChests } from '@/lib/chests/sortChests';
import { stockKeys } from '@/lib/stock/queryKeys';
import type { ChestWithStockHistory } from '@/types/chests';
import type { ChestStockCheckFormResponse } from '@/app/_actions/stockChecks';

async function fetchManagementChests(dispensarySlug: string) {
  const result = await getChests(dispensarySlug);
  return handleAction(result) as ChestWithStockHistory[];
}

async function fetchChestStockCheckForm(dispensarySlug: string, chestId: string) {
  const result = await getChestStockCheckForm(dispensarySlug, chestId);
  return handleAction(result) as ChestStockCheckFormResponse;
}

export function useManagementChests(initialData: ChestWithStockHistory[]) {
  const { dispensarySlug } = usePermissions();

  return useQuery({
    queryKey: chestsKeys.management(dispensarySlug!),
    queryFn: () => fetchManagementChests(dispensarySlug!),
    initialData,
    placeholderData: (previous) => previous,
    enabled: Boolean(dispensarySlug),
    staleTime: DEFAULT_STALE_TIME_MS,
  });
}

export function useChestStockCheckForm(chestId: string | null, opened: boolean) {
  const { dispensarySlug } = usePermissions();

  return useQuery({
    queryKey: chestsKeys.stockCheckForm(dispensarySlug!, chestId!),
    queryFn: () => fetchChestStockCheckForm(dispensarySlug!, chestId!),
    enabled: Boolean(dispensarySlug) && Boolean(chestId) && opened,
    staleTime: DEFAULT_STALE_TIME_MS,
  });
}

function useManagementChestsCache() {
  const queryClient = useQueryClient();
  const { dispensarySlug } = usePermissions();

  const queryKey = chestsKeys.management(dispensarySlug!);

  const updateCache = (updater: (chests: ChestWithStockHistory[]) => ChestWithStockHistory[]) => {
    queryClient.setQueryData<ChestWithStockHistory[]>(queryKey, (current) => {
      if (!current) return current;
      return sortChests(updater(current));
    });
  };

  const invalidateManagement = () => {
    queryClient.invalidateQueries({ queryKey: chestsKeys.management(dispensarySlug!) });
  };

  const invalidateStockChecksSummary = () => {
    queryClient.invalidateQueries({ queryKey: stockKeys.checksSummary(dispensarySlug!) });
  };

  const invalidateStockCheckForm = (chestId: string) => {
    queryClient.invalidateQueries({
      queryKey: chestsKeys.stockCheckForm(dispensarySlug!, chestId),
    });
  };

  return {
    updateCache,
    invalidateManagement,
    invalidateStockChecksSummary,
    invalidateStockCheckForm,
  };
}

export function useCreateChestMutation() {
  const { dispensarySlug } = usePermissions();
  const { updateCache } = useManagementChestsCache();

  return useMutation({
    mutationFn: async (vars: {
      name: string;
      description?: string;
      isEnabled?: boolean;
    }) => {
      const result = await createChest(dispensarySlug!, vars);
      return handleAction(result);
    },
    onSuccess: (created) => {
      if (!created) return;
      updateCache((chests) => [
        ...chests,
        { ...created, stockHistoryCount: 0 } as ChestWithStockHistory,
      ]);
      notifications.show({
        title: 'Succès',
        message: 'Coffre créé avec succès',
        color: 'moss',
      });
    },
    onError: (error: Error) => {
      if (error instanceof ParsedZodError) return;
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors de la sauvegarde',
        color: 'danger',
      });
    },
  });
}

export function useUpdateChestMutation() {
  const { dispensarySlug } = usePermissions();
  const { updateCache } = useManagementChestsCache();

  return useMutation({
    mutationFn: async (vars: {
      id: string;
      name: string;
      description?: string;
      isEnabled?: boolean;
    }) => {
      const result = await updateChest(dispensarySlug!, vars);
      return handleAction(result);
    },
    onSuccess: (updated) => {
      if (!updated) return;
      updateCache((chests) =>
        chests.map((chest) =>
          chest.id === updated.id
            ? { ...chest, ...updated, stockHistoryCount: chest.stockHistoryCount }
            : chest,
        ),
      );
      notifications.show({
        title: 'Succès',
        message: 'Coffre modifié avec succès',
        color: 'moss',
      });
    },
    onError: (error: Error) => {
      if (error instanceof ParsedZodError) return;
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors de la sauvegarde',
        color: 'danger',
      });
    },
  });
}

export function useDeleteChestMutation() {
  const { dispensarySlug } = usePermissions();
  const { invalidateManagement } = useManagementChestsCache();

  return useMutation({
    mutationFn: async (vars: { id: string; targetChestId: string }) => {
      const result = await deleteChest(dispensarySlug!, vars);
      handleAction(result);
      return vars;
    },
    onSuccess: () => {
      invalidateManagement();
      notifications.show({
        title: 'Succès',
        message: 'Coffre supprimé avec succès. Les stocks ont été transférés.',
        color: 'moss',
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors de la suppression',
        color: 'danger',
      });
    },
  });
}

export function useReorderChestsMutation() {
  const { dispensarySlug } = usePermissions();
  const { updateCache } = useManagementChestsCache();

  return useMutation({
    mutationFn: async (vars: { items: { id: string; order: number }[] }) => {
      const result = await reorderChests(dispensarySlug!, vars);
      handleAction(result);
      return vars.items;
    },
    onSuccess: (items) => {
      const orderById = new Map(items.map(({ id, order }) => [id, order]));
      updateCache((chests) =>
        chests.map((chest) => ({
          ...chest,
          order: orderById.get(chest.id) ?? chest.order,
        })),
      );
      notifications.show({
        title: 'Succès',
        message: 'Ordre des coffres mis à jour',
        color: 'moss',
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors de la mise à jour de l\'ordre',
        color: 'danger',
      });
    },
  });
}

export function useUpsertChestStockCheckConfigMutation() {
  const { dispensarySlug } = usePermissions();
  const { invalidateStockChecksSummary, invalidateStockCheckForm } =
    useManagementChestsCache();

  return useMutation({
    mutationFn: async (vars: {
      chestId: string;
      isEnabled: boolean;
      categoryIds: string[];
    }) => {
      const result = await upsertChestStockCheckConfig(dispensarySlug!, vars);
      handleAction(result);
      return vars;
    },
    onSuccess: ({ chestId }) => {
      invalidateStockCheckForm(chestId);
      invalidateStockChecksSummary();
      notifications.show({
        title: 'Succès',
        message: 'Configuration sauvegardée',
        color: 'moss',
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors de la sauvegarde',
        color: 'danger',
      });
    },
  });
}
