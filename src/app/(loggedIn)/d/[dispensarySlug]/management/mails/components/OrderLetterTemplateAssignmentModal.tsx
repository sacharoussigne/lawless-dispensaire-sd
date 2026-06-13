'use client';

import { useEffect } from 'react';
import { useForm } from '@mantine/form';
import { Modal, Stack, Select, Button, Group } from '@mantine/core';
import type { OrderType, OrderStatus } from '@prisma/client';
import type { MailTemplateListItem } from '@/types/mailTemplates';
import {
  orderStatusSelectOptions,
  orderTypeSelectOptions,
} from '@/lib/orders/orderSelectOptions';
import type {
  OrderLetterTemplateAssignmentWithTemplate,
  useCreateOrderLetterAssignmentMutation,
  useUpdateOrderLetterAssignmentMutation,
} from '../hooks/useMailTemplatesQueries';

interface OrderLetterTemplateAssignmentModalProps {
  opened: boolean;
  onClose: () => void;
  editingAssignment: OrderLetterTemplateAssignmentWithTemplate | null;
  mailTemplates: MailTemplateListItem[];
  createMutation: ReturnType<typeof useCreateOrderLetterAssignmentMutation>;
  updateMutation: ReturnType<typeof useUpdateOrderLetterAssignmentMutation>;
}

export function OrderLetterTemplateAssignmentModal({
  opened,
  onClose,
  editingAssignment,
  mailTemplates,
  createMutation,
  updateMutation,
}: OrderLetterTemplateAssignmentModalProps) {
  const form = useForm({
    initialValues: {
      orderType: '' as OrderType | '',
      orderStatus: '' as OrderStatus | '',
      mailTemplateId: '',
    },
    validate: {
      orderType: (value) => (!value ? 'Le type de commande est requis' : null),
      orderStatus: (value) => (!value ? 'Le statut de commande est requis' : null),
      mailTemplateId: (value) => (!value ? 'Le modèle de courrier est requis' : null),
    },
  });

  useEffect(() => {
    if (editingAssignment) {
      form.setValues({
        orderType: editingAssignment.orderType,
        orderStatus: editingAssignment.orderStatus,
        mailTemplateId: editingAssignment.mailTemplateId,
      });
    } else {
      form.reset();
    }
  }, [editingAssignment, opened]);

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = async (values: typeof form.values) => {
    try {
      if (editingAssignment) {
        await updateMutation.mutateAsync({
          id: editingAssignment.id,
          mailTemplateId: values.mailTemplateId,
        });
      } else {
        await createMutation.mutateAsync({
          orderType: values.orderType as OrderType,
          orderStatus: values.orderStatus as OrderStatus,
          mailTemplateId: values.mailTemplateId,
        });
      }
      onClose();
      form.reset();
    } catch {
      // Error notification handled by mutation
    }
  };

  const mailTemplateOptions = mailTemplates.map((template) => ({
    value: template.id,
    label: template.name,
  }));

  return (
    <Modal
      opened={opened}
      onClose={() => {
        onClose();
        form.reset();
      }}
      title={editingAssignment ? 'Modifier l\'assignation' : 'Créer une assignation'}
      size="md"
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <Select
            label="Type de commande"
            placeholder="Sélectionner un type"
            data={orderTypeSelectOptions}
            required
            disabled={!!editingAssignment}
            {...form.getInputProps('orderType')}
          />
          <Select
            label="Statut de commande"
            placeholder="Sélectionner un statut"
            data={orderStatusSelectOptions}
            required
            disabled={!!editingAssignment}
            {...form.getInputProps('orderStatus')}
          />
          <Select
            label="Modèle de courrier"
            placeholder="Sélectionner un modèle"
            data={mailTemplateOptions}
            required
            searchable
            {...form.getInputProps('mailTemplateId')}
          />
          <Group justify="flex-end" mt="md">
            <Button
              variant="subtle"
              color="slate"
              onClick={() => {
                onClose();
                form.reset();
              }}
            >
              Annuler
            </Button>
            <Button type="submit" loading={isPending}>
              {editingAssignment ? 'Modifier' : 'Créer'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
