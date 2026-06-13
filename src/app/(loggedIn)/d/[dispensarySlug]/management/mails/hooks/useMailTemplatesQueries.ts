'use client';

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { usePermissions } from '@/app/_contexts/PermissionsContext';
import {
  createMailTemplate,
  deleteMailTemplate,
  getMailTemplates,
  getManagementMailTemplateById,
  updateMailTemplate,
} from '@/app/_actions/mailTemplates';
import {
  createOrderLetterTemplateAssignment,
  deleteOrderLetterTemplateAssignment,
  getOrderLetterTemplateAssignments,
  updateOrderLetterTemplateAssignment,
} from '@/app/_actions/orderLetterTemplateAssignments';
import { handleAction } from '@/lib/action';
import { ParsedZodError } from '@/lib/errors/ParsedZodError';
import { DEFAULT_STALE_TIME_MS } from '@/lib/react-query/QueryProvider';
import { mailTemplatesKeys } from '@/lib/mails/queryKeys';
import { ordersKeys } from '@/lib/orders/queryKeys';
import type { MailTemplate, MailTemplateListItem } from '@/types/mailTemplates';
import type { OrderMailTemplateAssignment, OrderStatus, OrderType } from '@prisma/client';

export type OrderLetterTemplateAssignmentWithTemplate = OrderMailTemplateAssignment & {
  mailTemplate: {
    id: string;
    name: string;
  };
};

function toMailTemplateListItem(template: MailTemplate): MailTemplateListItem {
  return {
    id: template.id,
    name: template.name,
    description: template.description,
    defaultMailName: template.defaultMailName,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
    dispensaryId: template.dispensaryId,
    userId: template.userId,
  };
}

async function fetchManagementMailTemplates(dispensarySlug: string) {
  const result = await getMailTemplates(dispensarySlug);
  return handleAction(result) as MailTemplateListItem[];
}

async function fetchManagementMailTemplateById(dispensarySlug: string, templateId: string) {
  const result = await getManagementMailTemplateById(dispensarySlug, { id: templateId });
  return handleAction(result) as MailTemplate;
}

async function fetchOrderLetterAssignments(dispensarySlug: string) {
  const result = await getOrderLetterTemplateAssignments(dispensarySlug);
  return handleAction(result) as OrderLetterTemplateAssignmentWithTemplate[];
}

export function useManagementMailTemplates(initialData: MailTemplateListItem[]) {
  const { dispensarySlug } = usePermissions();

  return useQuery({
    queryKey: mailTemplatesKeys.management(dispensarySlug!),
    queryFn: () => fetchManagementMailTemplates(dispensarySlug!),
    initialData,
    placeholderData: (previous) => previous,
    enabled: Boolean(dispensarySlug),
    staleTime: DEFAULT_STALE_TIME_MS,
  });
}

export function useManagementMailTemplateDetail(templateId: string | null, enabled: boolean) {
  const { dispensarySlug } = usePermissions();

  return useQuery({
    queryKey: mailTemplatesKeys.detail(dispensarySlug!, templateId!),
    queryFn: () => fetchManagementMailTemplateById(dispensarySlug!, templateId!),
    enabled: Boolean(dispensarySlug && templateId && enabled),
    staleTime: DEFAULT_STALE_TIME_MS,
  });
}

export function useOrderLetterTemplateAssignments(
  initialData: OrderLetterTemplateAssignmentWithTemplate[],
) {
  const { dispensarySlug } = usePermissions();

  return useQuery({
    queryKey: ordersKeys.letterAssignments(dispensarySlug!),
    queryFn: () => fetchOrderLetterAssignments(dispensarySlug!),
    initialData,
    placeholderData: (previous) => previous,
    enabled: Boolean(dispensarySlug),
    staleTime: DEFAULT_STALE_TIME_MS,
  });
}

function useManagementMailTemplatesCache() {
  const queryClient = useQueryClient();
  const { dispensarySlug } = usePermissions();
  const queryKey = mailTemplatesKeys.management(dispensarySlug!);

  const updateCache = (updater: (templates: MailTemplateListItem[]) => MailTemplateListItem[]) => {
    queryClient.setQueryData<MailTemplateListItem[]>(queryKey, (current) => {
      if (!current) return current;
      return updater(current).sort((a, b) =>
        a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }),
      );
    });
  };

  const invalidateManagement = () => {
    void queryClient.invalidateQueries({ queryKey: mailTemplatesKeys.management(dispensarySlug!) });
  };

  const invalidateAssignments = () => {
    void queryClient.invalidateQueries({ queryKey: ordersKeys.letterAssignments(dispensarySlug!) });
  };

  return { updateCache, invalidateManagement, invalidateAssignments };
}

export function useCreateMailTemplateMutation() {
  const { dispensarySlug } = usePermissions();
  const { updateCache } = useManagementMailTemplatesCache();

  return useMutation({
    mutationFn: async (vars: {
      name: string;
      description?: string;
      content: string;
      defaultMailName?: string;
    }) => {
      const result = await createMailTemplate(dispensarySlug!, vars);
      return handleAction(result) as MailTemplate;
    },
    onSuccess: (created) => {
      updateCache((templates) => [...templates, toMailTemplateListItem(created)]);
      notifications.show({
        title: 'Succès',
        message: 'Template créé avec succès',
        color: 'moss',
      });
    },
    onError: (error: Error) => {
      if (error instanceof ParsedZodError) return;
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors de la création',
        color: 'danger',
      });
    },
  });
}

export function useUpdateMailTemplateMutation() {
  const { dispensarySlug } = usePermissions();
  const { updateCache } = useManagementMailTemplatesCache();

  return useMutation({
    mutationFn: async (vars: {
      id: string;
      name: string;
      description?: string;
      content: string;
      defaultMailName?: string;
    }) => {
      const result = await updateMailTemplate(dispensarySlug!, vars);
      return handleAction(result) as MailTemplate;
    },
    onSuccess: (updated) => {
      const listItem = toMailTemplateListItem(updated);
      updateCache((templates) =>
        templates.map((template) => (template.id === listItem.id ? listItem : template)),
      );
      notifications.show({
        title: 'Succès',
        message: 'Template modifié avec succès',
        color: 'moss',
      });
    },
    onError: (error: Error) => {
      if (error instanceof ParsedZodError) return;
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors de la modification',
        color: 'danger',
      });
    },
  });
}

export function useDeleteMailTemplateMutation() {
  const { dispensarySlug } = usePermissions();
  const { updateCache } = useManagementMailTemplatesCache();

  return useMutation({
    mutationFn: async (vars: { id: string }) => {
      const result = await deleteMailTemplate(dispensarySlug!, vars);
      handleAction(result);
      return vars.id;
    },
    onSuccess: (deletedId) => {
      updateCache((templates) => templates.filter((template) => template.id !== deletedId));
      notifications.show({
        title: 'Succès',
        message: 'Template supprimé avec succès',
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

export function useCreateOrderLetterAssignmentMutation() {
  const { dispensarySlug } = usePermissions();
  const { invalidateAssignments } = useManagementMailTemplatesCache();

  return useMutation({
    mutationFn: async (vars: {
      orderType: OrderType;
      orderStatus: OrderStatus;
      mailTemplateId: string;
    }) => {
      const result = await createOrderLetterTemplateAssignment(dispensarySlug!, vars);
      return handleAction(result) as OrderLetterTemplateAssignmentWithTemplate;
    },
    onSuccess: () => {
      invalidateAssignments();
      notifications.show({
        title: 'Succès',
        message: 'Assignation créée avec succès',
        color: 'moss',
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors de la création de l\'assignation',
        color: 'danger',
      });
    },
  });
}

export function useUpdateOrderLetterAssignmentMutation() {
  const { dispensarySlug } = usePermissions();
  const { invalidateAssignments } = useManagementMailTemplatesCache();

  return useMutation({
    mutationFn: async (vars: { id: string; mailTemplateId: string }) => {
      const result = await updateOrderLetterTemplateAssignment(dispensarySlug!, vars);
      return handleAction(result) as OrderLetterTemplateAssignmentWithTemplate;
    },
    onSuccess: () => {
      invalidateAssignments();
      notifications.show({
        title: 'Succès',
        message: 'Assignation modifiée avec succès',
        color: 'moss',
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors de la modification de l\'assignation',
        color: 'danger',
      });
    },
  });
}

export function useDeleteOrderLetterAssignmentMutation() {
  const { dispensarySlug } = usePermissions();
  const { invalidateAssignments } = useManagementMailTemplatesCache();

  return useMutation({
    mutationFn: async (vars: { id: string }) => {
      const result = await deleteOrderLetterTemplateAssignment(dispensarySlug!, vars);
      handleAction(result);
      return vars.id;
    },
    onSuccess: () => {
      invalidateAssignments();
      notifications.show({
        title: 'Succès',
        message: 'Assignation supprimée avec succès',
        color: 'moss',
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors de la suppression de l\'assignation',
        color: 'danger',
      });
    },
  });
}
