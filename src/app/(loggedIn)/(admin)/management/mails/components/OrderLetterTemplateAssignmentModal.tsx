'use client';

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
import { OrderTypeEnum } from '@/types/enum/orderType';
import { OrderStatusEnum } from '@/types/enum/orderStatus';
import { getOrderTypeLabel } from '@/types/enum/orderType';
import { getOrderStatusLabel } from '@/types/enum/orderStatus';

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
        result = await updateOrderLetterTemplateAssignment({
          id: editingAssignment.id,
          mailTemplateId: values.mailTemplateId,
        });
      } else {
        result = await createOrderLetterTemplateAssignment({
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
          color: 'green',
        });
        onSuccess();
        onClose();
        form.reset();
      }
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors de la sauvegarde de l\'assignation',
        color: 'red',
      });
    }
  };

  const orderTypeOptions = [
    { value: OrderTypeEnum.INCOMING, label: getOrderTypeLabel(OrderTypeEnum.INCOMING) },
    { value: OrderTypeEnum.OUTGOING, label: getOrderTypeLabel(OrderTypeEnum.OUTGOING) },
  ];

  const orderStatusOptions = [
    { value: OrderStatusEnum.DRAFT, label: getOrderStatusLabel(OrderStatusEnum.DRAFT) },
    { value: OrderStatusEnum.LETTER_SENT, label: getOrderStatusLabel(OrderStatusEnum.LETTER_SENT) },
    { value: OrderStatusEnum.PROCESSING, label: getOrderStatusLabel(OrderStatusEnum.PROCESSING) },
    { value: OrderStatusEnum.READY, label: getOrderStatusLabel(OrderStatusEnum.READY) },
    { value: OrderStatusEnum.COMPLETED, label: getOrderStatusLabel(OrderStatusEnum.COMPLETED) },
    { value: OrderStatusEnum.CANCELLED, label: getOrderStatusLabel(OrderStatusEnum.CANCELLED) },
  ];

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
            data={orderTypeOptions}
            required
            disabled={!!editingAssignment}
            {...form.getInputProps('orderType')}
          />
          <Select
            label="Statut de commande"
            placeholder="Sélectionner un statut"
            data={orderStatusOptions}
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
