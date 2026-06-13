'use client';

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { usePermissions } from '@/app/_contexts/PermissionsContext';
import {
  createItem,
  getItems,
  updateItem,
  deleteItem,
  reorderItems,
} from '@/app/_actions/items';
import {
  createCraftRecipe,
  updateCraftRecipe,
  deleteCraftRecipe,
  getCraftRecipesByItemId,
} from '@/app/_actions/craftRecipes';
import { handleAction } from '@/lib/action';
import { ParsedZodError } from '@/lib/errors/ParsedZodError';
import { DEFAULT_STALE_TIME_MS } from '@/lib/react-query/QueryProvider';
import { itemsKeys } from '@/lib/items/queryKeys';
import { sortItems } from '@/lib/stock/sortItemsByCategory';
import type {
  ItemWithRelations,
  CraftRecipeWithIngredients,
} from '@/types/items';

async function fetchManagementItems(dispensarySlug: string) {
  const result = await getItems(dispensarySlug);
  return handleAction(result) as ItemWithRelations[];
}

export function useManagementItems(initialData: ItemWithRelations[]) {
  const { dispensarySlug } = usePermissions();

  return useQuery({
    queryKey: itemsKeys.management(dispensarySlug!),
    queryFn: () => fetchManagementItems(dispensarySlug!),
    initialData,
    placeholderData: (previous) => previous,
    enabled: Boolean(dispensarySlug),
    staleTime: DEFAULT_STALE_TIME_MS,
  });
}

function useManagementItemsCache() {
  const queryClient = useQueryClient();
  const { dispensarySlug } = usePermissions();

  const queryKey = itemsKeys.management(dispensarySlug!);

  const updateCache = (updater: (items: ItemWithRelations[]) => ItemWithRelations[]) => {
    queryClient.setQueryData<ItemWithRelations[]>(queryKey, (current) => {
      if (!current) return current;
      return sortItems(updater(current));
    });
  };

  return { updateCache, queryKey };
}

export function useCreateItemMutation() {
  const { dispensarySlug } = usePermissions();
  const { updateCache } = useManagementItemsCache();

  return useMutation({
    mutationFn: async (vars: Parameters<typeof createItem>[1]) => {
      const result = await createItem(dispensarySlug!, vars);
      return handleAction(result) as ItemWithRelations;
    },
    onSuccess: (created) => {
      updateCache((items) => [...items, created]);
      notifications.show({
        title: 'Succès',
        message: 'Objet créé avec succès',
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

export function useUpdateItemMutation() {
  const { dispensarySlug } = usePermissions();
  const { updateCache } = useManagementItemsCache();

  return useMutation({
    mutationFn: async (vars: Parameters<typeof updateItem>[1]) => {
      const result = await updateItem(dispensarySlug!, vars);
      return handleAction(result) as ItemWithRelations;
    },
    onSuccess: (updated) => {
      updateCache((items) =>
        items.map((item) => (item.id === updated.id ? updated : item)),
      );
      notifications.show({
        title: 'Succès',
        message: 'Objet modifié avec succès',
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

export function useDeleteItemMutation() {
  const { dispensarySlug } = usePermissions();
  const { updateCache } = useManagementItemsCache();

  return useMutation({
    mutationFn: async (vars: { id: string }) => {
      const result = await deleteItem(dispensarySlug!, vars);
      handleAction(result);
      return vars;
    },
    onSuccess: ({ id }) => {
      updateCache((items) => items.filter((item) => item.id !== id));
      notifications.show({
        title: 'Succès',
        message: 'Objet supprimé avec succès',
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

export function useReorderItemsMutation() {
  const { dispensarySlug } = usePermissions();
  const { updateCache } = useManagementItemsCache();

  return useMutation({
    mutationFn: async (vars: { items: { id: string; order: number }[] }) => {
      const result = await reorderItems(dispensarySlug!, vars);
      handleAction(result);
      return vars;
    },
    onSuccess: ({ items }) => {
      const orderById = new Map(items.map(({ id, order }) => [id, order]));
      updateCache((current) =>
        current.map((item) => ({
          ...item,
          order: orderById.get(item.id) ?? item.order,
        })),
      );
      notifications.show({
        title: 'Succès',
        message: 'Ordre des objets mis à jour',
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

export function useCraftRecipesQuery(itemId: string | null, enabled: boolean) {
  const { dispensarySlug } = usePermissions();

  return useQuery({
    queryKey: itemsKeys.craftRecipes(dispensarySlug!, itemId ?? ''),
    queryFn: async () => {
      const result = await getCraftRecipesByItemId(dispensarySlug!, itemId!);
      return handleAction(result) as CraftRecipeWithIngredients[];
    },
    enabled: Boolean(dispensarySlug && itemId && enabled),
    staleTime: DEFAULT_STALE_TIME_MS,
  });
}

function useCraftRecipesCache(itemId: string) {
  const queryClient = useQueryClient();
  const { dispensarySlug } = usePermissions();

  const queryKey = itemsKeys.craftRecipes(dispensarySlug!, itemId);

  const updateCache = (
    updater: (recipes: CraftRecipeWithIngredients[]) => CraftRecipeWithIngredients[],
  ) => {
    queryClient.setQueryData<CraftRecipeWithIngredients[]>(queryKey, (current) => {
      if (!current) return current;
      return updater(current);
    });
  };

  return { updateCache, queryKey };
}

export function useCreateCraftRecipeMutation(itemId: string) {
  const { dispensarySlug } = usePermissions();
  const { updateCache } = useCraftRecipesCache(itemId);

  return useMutation({
    mutationFn: async (vars: Parameters<typeof createCraftRecipe>[1]) => {
      const result = await createCraftRecipe(dispensarySlug!, vars);
      return handleAction(result) as CraftRecipeWithIngredients;
    },
    onSuccess: (created) => {
      updateCache((recipes) => [created, ...recipes]);
      notifications.show({
        title: 'Succès',
        message: 'Recette de craft créée avec succès',
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

export function useUpdateCraftRecipeMutation(itemId: string) {
  const { dispensarySlug } = usePermissions();
  const { updateCache } = useCraftRecipesCache(itemId);

  return useMutation({
    mutationFn: async (vars: Parameters<typeof updateCraftRecipe>[1]) => {
      const result = await updateCraftRecipe(dispensarySlug!, vars);
      return handleAction(result) as CraftRecipeWithIngredients;
    },
    onSuccess: (updated) => {
      updateCache((recipes) =>
        recipes.map((recipe) => (recipe.id === updated.id ? updated : recipe)),
      );
      notifications.show({
        title: 'Succès',
        message: 'Recette de craft modifiée avec succès',
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

export function useDeleteCraftRecipeMutation(itemId: string) {
  const { dispensarySlug } = usePermissions();
  const { updateCache } = useCraftRecipesCache(itemId);

  return useMutation({
    mutationFn: async (vars: { id: string }) => {
      const result = await deleteCraftRecipe(dispensarySlug!, vars);
      handleAction(result);
      return vars;
    },
    onSuccess: ({ id }) => {
      updateCache((recipes) => recipes.filter((recipe) => recipe.id !== id));
      notifications.show({
        title: 'Succès',
        message: 'Recette de craft supprimée avec succès',
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
