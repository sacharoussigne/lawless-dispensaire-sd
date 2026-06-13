'use client';

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { useRequiredDispensarySlug } from '@/app/_contexts/PermissionsContext';
import {
  createCompanyGroup,
  getCompanyGroups,
  getCompanyGroupsForOrders,
  getCompanyGroupsForSelect,
  updateCompanyGroup,
  deleteCompanyGroup,
} from '@/app/_actions/companyGroups';
import { handleAction } from '@/lib/action';
import { ParsedZodError } from '@/lib/errors/ParsedZodError';
import { DEFAULT_STALE_TIME_MS } from '@/lib/react-query/QueryProvider';
import { companyGroupsKeys } from '@/lib/companyGroups/queryKeys';
import { companiesKeys } from '@/lib/companies/queryKeys';
import { sortCompanyGroups } from '@/lib/companyGroups/sortCompanyGroups';
import type { CompanyGroupForOrders, CompanyGroupWithRelations } from '@/types/companyGroups';
import type { CompanyGroupSelect } from '@/types/items';

async function fetchManagementCompanyGroups(dispensarySlug: string) {
  const result = await getCompanyGroups(dispensarySlug);
  return handleAction(result) as CompanyGroupWithRelations[];
}

async function fetchCompanyGroupsForSelect(dispensarySlug: string) {
  const result = await getCompanyGroupsForSelect(dispensarySlug);
  return handleAction(result) as CompanyGroupSelect[];
}

async function fetchCompanyGroupsForOrders(dispensarySlug: string) {
  const result = await getCompanyGroupsForOrders(dispensarySlug);
  return handleAction(result) as CompanyGroupForOrders[];
}

export function useManagementCompanyGroups(initialData: CompanyGroupWithRelations[]) {
  const dispensarySlug = useRequiredDispensarySlug();

  return useQuery({
    queryKey: companyGroupsKeys.management(dispensarySlug),
    queryFn: () => fetchManagementCompanyGroups(dispensarySlug),
    initialData,
    placeholderData: (previous) => previous,
    enabled: Boolean(dispensarySlug),
    staleTime: DEFAULT_STALE_TIME_MS,
  });
}

export function useCompanyGroupsForSelect(initialData?: CompanyGroupSelect[]) {
  const dispensarySlug = useRequiredDispensarySlug();

  return useQuery({
    queryKey: companyGroupsKeys.select(dispensarySlug),
    queryFn: () => fetchCompanyGroupsForSelect(dispensarySlug),
    initialData,
    placeholderData: (previous) => previous,
    enabled: Boolean(dispensarySlug),
    staleTime: DEFAULT_STALE_TIME_MS,
  });
}

export function useCompanyGroupsForOrders(enabled: boolean) {
  const dispensarySlug = useRequiredDispensarySlug();

  return useQuery({
    queryKey: companyGroupsKeys.forOrders(dispensarySlug),
    queryFn: () => fetchCompanyGroupsForOrders(dispensarySlug),
    enabled: Boolean(dispensarySlug) && enabled,
    staleTime: DEFAULT_STALE_TIME_MS,
  });
}

function useManagementCompanyGroupsCache() {
  const queryClient = useQueryClient();
  const dispensarySlug = useRequiredDispensarySlug();

  const queryKey = companyGroupsKeys.management(dispensarySlug);

  const updateCache = (
    updater: (companyGroups: CompanyGroupWithRelations[]) => CompanyGroupWithRelations[],
  ) => {
    queryClient.setQueryData<CompanyGroupWithRelations[]>(queryKey, (current) => {
      if (!current) return current;
      return sortCompanyGroups(updater(current));
    });
  };

  const invalidateForOrders = () => {
    queryClient.invalidateQueries({ queryKey: companyGroupsKeys.forOrders(dispensarySlug) });
  };

  const invalidateCompaniesManagement = () => {
    queryClient.invalidateQueries({ queryKey: companiesKeys.management(dispensarySlug) });
  };

  const invalidateSelect = () => {
    queryClient.invalidateQueries({ queryKey: companyGroupsKeys.select(dispensarySlug) });
  };

  return { updateCache, invalidateForOrders, invalidateCompaniesManagement, invalidateSelect };
}

export function useCreateCompanyGroupMutation() {
  const dispensarySlug = useRequiredDispensarySlug();
  const { updateCache, invalidateForOrders, invalidateCompaniesManagement, invalidateSelect } =
    useManagementCompanyGroupsCache();

  return useMutation({
    mutationFn: async (vars: {
      name: string;
      description?: string;
      companyIds?: string[];
    }) => {
      const result = await createCompanyGroup(dispensarySlug, vars);
      return handleAction(result) as CompanyGroupWithRelations;
    },
    onSuccess: (created) => {
      updateCache((companyGroups) => [...companyGroups, created]);
      invalidateForOrders();
      invalidateCompaniesManagement();
      invalidateSelect();
      notifications.show({
        title: 'Succès',
        message: 'Groupe d\'entreprises créé avec succès',
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

export function useUpdateCompanyGroupMutation() {
  const dispensarySlug = useRequiredDispensarySlug();
  const { updateCache, invalidateForOrders, invalidateCompaniesManagement } =
    useManagementCompanyGroupsCache();

  return useMutation({
    mutationFn: async (vars: {
      id: string;
      name: string;
      description?: string;
      companyIds?: string[];
    }) => {
      const result = await updateCompanyGroup(dispensarySlug, vars);
      return handleAction(result) as CompanyGroupWithRelations;
    },
    onSuccess: (updated) => {
      updateCache((companyGroups) =>
        companyGroups.map((companyGroup) =>
          companyGroup.id === updated.id ? updated : companyGroup,
        ),
      );
      invalidateForOrders();
      invalidateCompaniesManagement();
      notifications.show({
        title: 'Succès',
        message: 'Groupe d\'entreprises modifié avec succès',
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

export function useDeleteCompanyGroupMutation() {
  const dispensarySlug = useRequiredDispensarySlug();
  const { updateCache, invalidateForOrders, invalidateCompaniesManagement, invalidateSelect } =
    useManagementCompanyGroupsCache();

  return useMutation({
    mutationFn: async (vars: { id: string }) => {
      const result = await deleteCompanyGroup(dispensarySlug, vars);
      handleAction(result);
      return vars;
    },
    onSuccess: ({ id }) => {
      updateCache((companyGroups) => companyGroups.filter((companyGroup) => companyGroup.id !== id));
      invalidateForOrders();
      invalidateCompaniesManagement();
      invalidateSelect();
      notifications.show({
        title: 'Succès',
        message: 'Groupe d\'entreprises supprimé avec succès',
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
