'use client';

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { usePermissions } from '@/app/_contexts/PermissionsContext';
import {
  createCompany,
  getCompanies,
  getCompaniesForSelect,
  updateCompany,
  deleteCompany,
} from '@/app/_actions/companies';
import { handleAction } from '@/lib/action';
import { ParsedZodError } from '@/lib/errors/ParsedZodError';
import { DEFAULT_STALE_TIME_MS } from '@/lib/react-query/QueryProvider';
import { companiesKeys } from '@/lib/companies/queryKeys';
import { companyGroupsKeys } from '@/lib/companyGroups/queryKeys';
import { sortCompanies } from '@/lib/companies/sortCompanies';
import type { CompanySelect, CompanyWithRelations } from '@/types/companies';

async function fetchManagementCompanies(dispensarySlug: string) {
  const result = await getCompanies(dispensarySlug);
  return handleAction(result) as CompanyWithRelations[];
}

async function fetchCompaniesForSelect(dispensarySlug: string) {
  const result = await getCompaniesForSelect(dispensarySlug);
  return handleAction(result) as CompanySelect[];
}

export function useManagementCompanies(initialData: CompanyWithRelations[]) {
  const { dispensarySlug } = usePermissions();

  return useQuery({
    queryKey: companiesKeys.management(dispensarySlug!),
    queryFn: () => fetchManagementCompanies(dispensarySlug!),
    initialData,
    placeholderData: (previous) => previous,
    enabled: Boolean(dispensarySlug),
    staleTime: DEFAULT_STALE_TIME_MS,
  });
}

export function useCompaniesForSelect(initialData?: CompanySelect[]) {
  const { dispensarySlug } = usePermissions();

  return useQuery({
    queryKey: companiesKeys.select(dispensarySlug!),
    queryFn: () => fetchCompaniesForSelect(dispensarySlug!),
    initialData,
    placeholderData: (previous) => previous,
    enabled: Boolean(dispensarySlug),
    staleTime: DEFAULT_STALE_TIME_MS,
  });
}

function useManagementCompaniesCache() {
  const queryClient = useQueryClient();
  const { dispensarySlug } = usePermissions();

  const queryKey = companiesKeys.management(dispensarySlug!);

  const updateCache = (updater: (companies: CompanyWithRelations[]) => CompanyWithRelations[]) => {
    queryClient.setQueryData<CompanyWithRelations[]>(queryKey, (current) => {
      if (!current) return current;
      return sortCompanies(updater(current));
    });
  };

  const invalidateSelect = () => {
    queryClient.invalidateQueries({ queryKey: companiesKeys.select(dispensarySlug!) });
  };

  const invalidateCompanyGroups = () => {
    queryClient.invalidateQueries({ queryKey: companyGroupsKeys.management(dispensarySlug!) });
    queryClient.invalidateQueries({ queryKey: companyGroupsKeys.select(dispensarySlug!) });
    queryClient.invalidateQueries({ queryKey: companyGroupsKeys.forOrders(dispensarySlug!) });
  };

  return { updateCache, invalidateSelect, invalidateCompanyGroups };
}

export function useCreateCompanyMutation() {
  const { dispensarySlug } = usePermissions();
  const { updateCache, invalidateSelect, invalidateCompanyGroups } = useManagementCompaniesCache();

  return useMutation({
    mutationFn: async (vars: { name: string; companyGroupIds?: string[] }) => {
      const result = await createCompany(dispensarySlug!, vars);
      return handleAction(result) as CompanyWithRelations;
    },
    onSuccess: (created) => {
      updateCache((companies) => [...companies, created]);
      invalidateSelect();
      invalidateCompanyGroups();
      notifications.show({
        title: 'Succès',
        message: 'Entreprise créée avec succès',
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

export function useUpdateCompanyMutation() {
  const { dispensarySlug } = usePermissions();
  const { updateCache, invalidateSelect, invalidateCompanyGroups } = useManagementCompaniesCache();

  return useMutation({
    mutationFn: async (vars: { id: string; name: string; companyGroupIds?: string[] }) => {
      const result = await updateCompany(dispensarySlug!, vars);
      return handleAction(result) as CompanyWithRelations;
    },
    onSuccess: (updated) => {
      updateCache((companies) =>
        companies.map((company) => (company.id === updated.id ? updated : company)),
      );
      invalidateSelect();
      invalidateCompanyGroups();
      notifications.show({
        title: 'Succès',
        message: 'Entreprise modifiée avec succès',
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

export function useDeleteCompanyMutation() {
  const { dispensarySlug } = usePermissions();
  const { updateCache, invalidateSelect, invalidateCompanyGroups } = useManagementCompaniesCache();

  return useMutation({
    mutationFn: async (vars: { id: string }) => {
      const result = await deleteCompany(dispensarySlug!, vars);
      handleAction(result);
      return vars;
    },
    onSuccess: ({ id }) => {
      updateCache((companies) => companies.filter((company) => company.id !== id));
      invalidateSelect();
      invalidateCompanyGroups();
      notifications.show({
        title: 'Succès',
        message: 'Entreprise supprimée avec succès',
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
