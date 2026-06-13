'use client';

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { usePermissions } from '@/app/_contexts/PermissionsContext';
import {
  deleteMail,
  getMailById,
  getMailsPage,
} from '@/app/_actions/mails';
import {
  deleteUserMailTemplate,
  getUserMailTemplateById,
  getUserMailTemplateOptions,
  getUserMailTemplatesPage,
} from '@/app/_actions/mailTemplates';
import { handleAction } from '@/lib/action';
import { DEFAULT_STALE_TIME_MS } from '@/lib/react-query/QueryProvider';
import { mailsKeys, mailTemplatesKeys } from '@/lib/mails/queryKeys';
import type {
  Mail,
  MailTemplate,
  MailTemplateOption,
  MailsPageFilters,
  MailsPageResult,
  MailTemplatesPageFilters,
  MailTemplatesPageResult,
} from '@/types/mails';

export const DEFAULT_MAILS_PAGE_SIZE = 10;

export const defaultMailsPageFilters: MailsPageFilters = {
  page: 1,
  pageSize: DEFAULT_MAILS_PAGE_SIZE,
  nameSearch: '',
  receiverSearch: '',
};

export const defaultMailTemplatesPageFilters: MailTemplatesPageFilters = {
  page: 1,
  pageSize: DEFAULT_MAILS_PAGE_SIZE,
  nameSearch: '',
};

function isDefaultMailsPage(filters: MailsPageFilters): boolean {
  return (
    filters.page === 1 &&
    filters.pageSize === DEFAULT_MAILS_PAGE_SIZE &&
    filters.nameSearch === '' &&
    filters.receiverSearch === ''
  );
}

function isDefaultMailTemplatesPage(filters: MailTemplatesPageFilters): boolean {
  return (
    filters.page === 1 &&
    filters.pageSize === DEFAULT_MAILS_PAGE_SIZE &&
    filters.nameSearch === ''
  );
}

async function fetchMailsPage(dispensarySlug: string, filters: MailsPageFilters) {
  const result = await getMailsPage(dispensarySlug, {
    page: filters.page,
    pageSize: filters.pageSize,
    nameSearch: filters.nameSearch || undefined,
    receiverSearch: filters.receiverSearch || undefined,
  });
  return handleAction(result) as MailsPageResult;
}

async function fetchMailTemplatesPage(
  dispensarySlug: string,
  filters: MailTemplatesPageFilters,
) {
  const result = await getUserMailTemplatesPage(dispensarySlug, {
    page: filters.page,
    pageSize: filters.pageSize,
    nameSearch: filters.nameSearch || undefined,
  });
  return handleAction(result) as MailTemplatesPageResult;
}

async function fetchMailById(dispensarySlug: string, mailId: string) {
  const result = await getMailById(dispensarySlug, { id: mailId });
  return handleAction(result) as Mail;
}

async function fetchUserMailTemplateById(
  dispensarySlug: string,
  templateId: string,
) {
  const result = await getUserMailTemplateById(dispensarySlug, { id: templateId });
  return handleAction(result) as MailTemplate;
}

async function fetchUserMailTemplateOptions(dispensarySlug: string) {
  const result = await getUserMailTemplateOptions(dispensarySlug);
  return handleAction(result) as MailTemplateOption[];
}

export function useMailsPage(
  filters: MailsPageFilters,
  options?: { initialData?: MailsPageResult; enabled?: boolean },
) {
  const { dispensarySlug } = usePermissions();

  return useQuery({
    queryKey: mailsKeys.page(dispensarySlug!, filters),
    queryFn: () => fetchMailsPage(dispensarySlug!, filters),
    initialData:
      options?.initialData && isDefaultMailsPage(filters)
        ? options.initialData
        : undefined,
    placeholderData: (previous) => previous,
    enabled: Boolean(dispensarySlug) && (options?.enabled ?? true),
    staleTime: DEFAULT_STALE_TIME_MS,
  });
}

export function useUserMailTemplatesPage(
  filters: MailTemplatesPageFilters,
  options?: { initialData?: MailTemplatesPageResult; enabled?: boolean },
) {
  const { dispensarySlug } = usePermissions();

  return useQuery({
    queryKey: mailTemplatesKeys.page(dispensarySlug!, filters),
    queryFn: () => fetchMailTemplatesPage(dispensarySlug!, filters),
    initialData:
      options?.initialData && isDefaultMailTemplatesPage(filters)
        ? options.initialData
        : undefined,
    placeholderData: (previous) => previous,
    enabled: Boolean(dispensarySlug) && (options?.enabled ?? true),
    staleTime: DEFAULT_STALE_TIME_MS,
  });
}

export function useMailDetail(mailId: string | null, enabled: boolean) {
  const { dispensarySlug } = usePermissions();

  return useQuery({
    queryKey: mailsKeys.detail(dispensarySlug!, mailId!),
    queryFn: () => fetchMailById(dispensarySlug!, mailId!),
    enabled: Boolean(dispensarySlug && mailId && enabled),
    staleTime: DEFAULT_STALE_TIME_MS,
  });
}

export function useUserMailTemplateDetail(
  templateId: string | null,
  enabled: boolean,
) {
  const { dispensarySlug } = usePermissions();

  return useQuery({
    queryKey: mailTemplatesKeys.detail(dispensarySlug!, templateId!),
    queryFn: () => fetchUserMailTemplateById(dispensarySlug!, templateId!),
    enabled: Boolean(dispensarySlug && templateId && enabled),
    staleTime: DEFAULT_STALE_TIME_MS,
  });
}

export function useUserMailTemplateOptions(
  initialData?: MailTemplateOption[],
) {
  const { dispensarySlug } = usePermissions();

  return useQuery({
    queryKey: mailTemplatesKeys.options(dispensarySlug!),
    queryFn: () => fetchUserMailTemplateOptions(dispensarySlug!),
    initialData,
    enabled: Boolean(dispensarySlug),
    staleTime: DEFAULT_STALE_TIME_MS,
  });
}

export function useInvalidateMails() {
  const queryClient = useQueryClient();
  const { dispensarySlug } = usePermissions();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: mailsKeys.all(dispensarySlug!),
    });
  };
}

export function useInvalidateMailTemplates() {
  const queryClient = useQueryClient();
  const { dispensarySlug } = usePermissions();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: mailTemplatesKeys.all(dispensarySlug!),
    });
  };
}

export function useDeleteMailMutation() {
  const { dispensarySlug } = usePermissions();
  const invalidateMails = useInvalidateMails();

  return useMutation({
    mutationFn: async (vars: { id: string }) => {
      const result = await deleteMail(dispensarySlug!, vars);
      handleAction(result);
      return vars;
    },
    onSuccess: () => {
      invalidateMails();
      notifications.show({
        title: 'Succès',
        message: 'Courrier supprimé avec succès',
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

export function useDeleteUserMailTemplateMutation() {
  const { dispensarySlug } = usePermissions();
  const invalidateMailTemplates = useInvalidateMailTemplates();

  return useMutation({
    mutationFn: async (vars: { id: string }) => {
      const result = await deleteUserMailTemplate(dispensarySlug!, vars);
      handleAction(result);
      return vars;
    },
    onSuccess: () => {
      invalidateMailTemplates();
      notifications.show({
        title: 'Succès',
        message: 'Modèle supprimé avec succès',
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
