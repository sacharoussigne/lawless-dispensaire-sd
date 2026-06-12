'use client';

import { usePermissions } from '@/app/_contexts/PermissionsContext';
import { useEffect } from 'react';
import { useForm } from '@mantine/form';
import { Modal, Stack, Select, Button, Group } from '@mantine/core';
import {
  createOrderLetterTemplateAssignment,
  updateOrderLetterTemplateAssignment,
} from '@/app/_actions/orderLetterTemplateAssignments';
import { handleAction } from '@/lib/action';
import { notifications } from '@mantine/notifications';
import type { OrderMailTemplateAssignment, OrderType, OrderStatus } from '@prisma/client';
import type { MailTemplate } from '@/types/mailTemplates';
import {
  orderStatusSelectOptions,
  orderTypeSelectOptions,
} from '@/lib/orders/orderSelectOptions';

interface OrderMailTemplateAssignmentWithTemplate extends OrderMailTemplateAssignment {
  mailTemplate: {
    id: string;
    name: string;
  };
}

interface OrderLetterTemplateAssignmentModalProps {
  opened: boolean;
  onClose: () => void;
  editingAssignment: OrderMailTemplateAssignmentWithTemplate | null;
  mailTemplates: MailTemplate[];
  onSuccess: () => void;
}

export function OrderLetterTemplateAssignmentModal({
  opened,
  onClose,
  editingAssignment,
  mailTemplates,
  onSuccess,
}: OrderLetterTemplateAssignmentModalProps) {
  const { dispensarySlug } = usePermissions();
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

  const handleSubmit = async (values: typeof form.values) => {
    try {
      let result;
      if (editingAssignment) {
        result = await updateOrderLetterTemplateAssignment(dispensarySlug!, {
          id: editingAssignment.id,
          mailTemplateId: values.mailTemplateId,
        });
      } else {
        result = await createOrderLetterTemplateAssignment(dispensarySlug!, {
          orderType: values.orderType as OrderType,
          orderStatus: values.orderStatus as OrderStatus,
          mailTemplateId: values.mailTemplateId,
        });
      }

      const data = handleAction(result);
      if (data) {
        notifications.show({
          title: 'Succès',
          message: editingAssignment
            ? 'Assignation modifiée avec succès'
            : 'Assignation créée avec succès',
          color: 'moss',
        });
        onSuccess();
        onClose();
        form.reset();
      }
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors de la sauvegarde de l\'assignation',
        color: 'danger',
      });
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
              onClick={() => {
                onClose();
                form.reset();
              }}
            >
              Annuler
            </Button>
            <Button type="submit">
              {editingAssignment ? 'Modifier' : 'Créer'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
