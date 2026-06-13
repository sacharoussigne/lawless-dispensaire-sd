'use client';

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { usePermissions } from '@/app/_contexts/PermissionsContext';
import {
  createCategoryItem,
  getManagementCategoryItems,
  updateCategoryItem,
  deleteCategoryItem,
  reorderCategoryItems,
} from '@/app/_actions/categoryItems';
import { handleAction } from '@/lib/action';
import { ParsedZodError } from '@/lib/errors/ParsedZodError';
import { DEFAULT_STALE_TIME_MS } from '@/lib/react-query/QueryProvider';
import { categoryItemsKeys } from '@/lib/categoryItems/queryKeys';
import { sortCategoryItems } from '@/lib/categoryItems/sortCategoryItems';
import type { CategoryItemWithCount } from '@/types/categoryItems';
import type { CategoryItem } from '@prisma/client';

async function fetchManagementCategoryItems(dispensarySlug: string) {
  const result = await getManagementCategoryItems(dispensarySlug);
  return handleAction(result) as CategoryItemWithCount[];
}

export function useManagementCategoryItems(initialData: CategoryItemWithCount[]) {
  const { dispensarySlug } = usePermissions();

  return useQuery({
    queryKey: categoryItemsKeys.management(dispensarySlug!),
    queryFn: () => fetchManagementCategoryItems(dispensarySlug!),
    initialData,
    placeholderData: (previous) => previous,
    enabled: Boolean(dispensarySlug),
    staleTime: DEFAULT_STALE_TIME_MS,
  });
}

function useManagementCategoryItemsCache() {
  const queryClient = useQueryClient();
  const { dispensarySlug } = usePermissions();

  const queryKey = categoryItemsKeys.management(dispensarySlug!);

  const updateCache = (updater: (items: CategoryItemWithCount[]) => CategoryItemWithCount[]) => {
    queryClient.setQueryData<CategoryItemWithCount[]>(queryKey, (current) => {
      if (!current) return current;
      return sortCategoryItems(updater(current));
    });
  };

  return { updateCache };
}

export function useCreateCategoryItemMutation() {
  const { dispensarySlug } = usePermissions();
  const { updateCache } = useManagementCategoryItemsCache();

  return useMutation({
    mutationFn: async (vars: { name: string; color?: string }) => {
      const result = await createCategoryItem(dispensarySlug!, vars);
      return handleAction(result) as CategoryItem;
    },
    onSuccess: (created) => {
      updateCache((items) => [
        ...items,
        { ...created, _count: { items: 0 } },
      ]);
      notifications.show({
        title: 'Succès',
        message: 'Catégorie d\'objet créée avec succès',
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

export function useUpdateCategoryItemMutation() {
  const { dispensarySlug } = usePermissions();
  const { updateCache } = useManagementCategoryItemsCache();

  return useMutation({
    mutationFn: async (vars: { id: string; name: string; color?: string }) => {
      const result = await updateCategoryItem(dispensarySlug!, vars);
      return handleAction(result) as CategoryItem;
    },
    onSuccess: (updated) => {
      updateCache((items) =>
        items.map((item) =>
          item.id === updated.id
            ? { ...item, name: updated.name, color: updated.color }
            : item,
        ),
      );
      notifications.show({
        title: 'Succès',
        message: 'Catégorie d\'objet modifiée avec succès',
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

export function useDeleteCategoryItemMutation() {
  const { dispensarySlug } = usePermissions();
  const { updateCache } = useManagementCategoryItemsCache();

  return useMutation({
    mutationFn: async (vars: { id: string }) => {
      const result = await deleteCategoryItem(dispensarySlug!, vars);
      handleAction(result);
      return vars;
    },
    onSuccess: ({ id }) => {
      updateCache((items) => items.filter((item) => item.id !== id));
      notifications.show({
        title: 'Succès',
        message: 'Catégorie d\'objet supprimée avec succès',
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

export function useReorderCategoryItemsMutation() {
  const { dispensarySlug } = usePermissions();
  const { updateCache } = useManagementCategoryItemsCache();

  return useMutation({
    mutationFn: async (vars: { items: { id: string; order: number }[] }) => {
      const result = await reorderCategoryItems(dispensarySlug!, vars);
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
        message: 'Ordre des catégories mis à jour',
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
