'use client';

import { useEffect, useState } from 'react';
import {
  Modal,
  Stack,
  TextInput,
  Textarea,
  Select,
  Button,
  Group,
  Text,
  Checkbox,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { updateOrder } from '@/app/_actions/orders';
import { handleAction } from '@/lib/action';
import { handleApiZodError } from '@/lib/services/zod';
import { ParsedZodError } from '@/lib/errors/ParsedZodError';
import {
  getOrderStatusLabel,
  OrderStatusEnum,
} from '@/types/enum/orderStatus';
import {
  getOrderTypeLabel,
  OrderTypeEnum,
} from '@/types/enum/orderType';
import { checkOrderItemsStockToday } from '@/app/_actions/stock';
import type { OrderWithRelations } from '@/types/orders';

interface EditOrderModalProps {
  opened: boolean;
  onClose: () => void;
  editingOrder: OrderWithRelations | null;
  onSuccess: () => void;
}

const statusOptions: { value: string; label: string }[] = [
  { value: OrderStatusEnum.DRAFT, label: getOrderStatusLabel(OrderStatusEnum.DRAFT) },
  {
    value: OrderStatusEnum.LETTER_SENT,
    label: getOrderStatusLabel(OrderStatusEnum.LETTER_SENT),
  },
  {
    value: OrderStatusEnum.PROCESSING,
    label: getOrderStatusLabel(OrderStatusEnum.PROCESSING),
  },
  { value: OrderStatusEnum.READY, label: getOrderStatusLabel(OrderStatusEnum.READY) },
  {
    value: OrderStatusEnum.COMPLETED,
    label: getOrderStatusLabel(OrderStatusEnum.COMPLETED),
  },
  {
    value: OrderStatusEnum.CANCELLED,
    label: getOrderStatusLabel(OrderStatusEnum.CANCELLED),
  },
];

const typeOptions: { value: string; label: string }[] = [
  { value: OrderTypeEnum.INCOMING, label: getOrderTypeLabel(OrderTypeEnum.INCOMING) },
  { value: OrderTypeEnum.OUTGOING, label: getOrderTypeLabel(OrderTypeEnum.OUTGOING) },
];

export function EditOrderModal({
  opened,
  onClose,
  editingOrder,
  onSuccess,
}: EditOrderModalProps) {
  const [addToStock, setAddToStock] = useState(false);
  const [stockCheckResult, setStockCheckResult] = useState<{
    allHaveStockToday: boolean;
    items: Array<{ itemId: string; itemName: string; hasStockToday: boolean }>;
  } | null>(null);
  const [checkingStock, setCheckingStock] = useState(false);

  const form = useForm({
    initialValues: {
      name: '',
      status: OrderStatusEnum.DRAFT,
      type: OrderTypeEnum.INCOMING,
      details: '',
    },
    validate: {
      name: (value) => (value.length < 1 ? 'Le nom est requis' : null),
    },
  });

  useEffect(() => {
    if (editingOrder) {
      form.setValues({
        name: editingOrder.name,
        status: editingOrder.status as OrderStatusEnum,
        type: (editingOrder.type || OrderTypeEnum.INCOMING) as OrderTypeEnum,
        details: editingOrder.details || '',
      });
      setAddToStock(false);
      setStockCheckResult(null);
    }
  }, [editingOrder, opened]);

  const handleStatusChange = async (status: OrderStatusEnum) => {
    form.setFieldValue('status', status);

    if (status === OrderStatusEnum.COMPLETED && editingOrder) {
      setCheckingStock(true);
      try {
        const result = await checkOrderItemsStockToday(editingOrder.id);
        const data = handleAction(result);
        if (data) {
          setStockCheckResult(data);
          if (data.allHaveStockToday) {
            setAddToStock(true);
          } else {
            setAddToStock(false);
          }
        }
      } catch (error: any) {
        notifications.show({
          title: 'Erreur',
          message: error.message || 'Erreur lors de la vérification du stock',
          color: 'red',
        });
      } finally {
        setCheckingStock(false);
      }
    } else {
      setStockCheckResult(null);
      setAddToStock(false);
    }
  };

  const handleSubmit = async (values: typeof form.values) => {
    if (!editingOrder) return;

    try {
      const result = await updateOrder({
        id: editingOrder.id,
        name: values.name,
        status: values.status,
        type: values.type,
        details: values.details || undefined,
        addToStock:
          values.status === OrderStatusEnum.COMPLETED ? addToStock : undefined,
      });

      handleAction(result);

      let message = 'Commande modifiée avec succès';
      if (values.status === OrderStatusEnum.COMPLETED && addToStock) {
        message += '. Les objets ont été ajoutés au stock.';
      } else if (
        values.status === OrderStatusEnum.COMPLETED &&
        !addToStock &&
        stockCheckResult?.allHaveStockToday
      ) {
        message += ". Les objets n'ont pas été ajoutés au stock.";
      }

      notifications.show({
        title: 'Succès',
        message,
        color: 'green',
      });
      onClose();
      form.reset();
      setAddToStock(false);
      setStockCheckResult(null);
      onSuccess();
    } catch (error: any) {
      if (error instanceof ParsedZodError) {
        handleApiZodError(error.error, form);
      } else {
        notifications.show({
          title: 'Erreur',
          message: error.message || 'Erreur lors de la sauvegarde',
          color: 'red',
        });
      }
    }
  };

  const isCompleted = editingOrder?.status === OrderStatusEnum.COMPLETED;

  return (
    <Modal
      opened={opened}
      onClose={() => {
        onClose();
        form.reset();
        setAddToStock(false);
        setStockCheckResult(null);
      }}
      title={editingOrder ? 'Modifier la commande' : 'Créer une commande'}
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <TextInput
            label="Nom"
            placeholder="Nom de la commande"
            required
            {...form.getInputProps('name')}
            disabled={isCompleted}
          />
          <Select
            label="Statut"
            data={statusOptions}
            required
            value={form.values.status}
            onChange={(value) => handleStatusChange(value as OrderStatusEnum)}
            disabled={isCompleted}
          />
          <Select
            label="Type"
            data={typeOptions}
            required
            value={form.values.type}
            onChange={(value) => form.setFieldValue('type', value as OrderTypeEnum)}
            disabled={isCompleted}
          />
          {form.values.status === OrderStatusEnum.COMPLETED && (
            <Stack gap="xs">
              {checkingStock ? (
                <Text size="sm" c="dimmed">
                  Vérification du stock...
                </Text>
              ) : stockCheckResult ? (
                <>
                  {!stockCheckResult.allHaveStockToday ? (
                    <Text size="sm" c="orange" fw={500}>
                      ⚠️ Le stock d'aujourd'hui n'est pas fait pour certains objets. Les
                      objets ne peuvent pas être ajoutés automatiquement au stock.
                    </Text>
                  ) : (
                    <Checkbox
                      label="Ajouter automatiquement les objets au stock d'aujourd'hui"
                      checked={addToStock}
                      onChange={(event) =>
                        setAddToStock(event.currentTarget.checked)
                      }
                    />
                  )}
                  {stockCheckResult.items.some((item) => !item.hasStockToday) && (
                    <Text size="xs" c="dimmed" mt="xs">
                      Objets sans stock d'aujourd'hui :{' '}
                      {stockCheckResult.items
                        .filter((item) => !item.hasStockToday)
                        .map((item) => item.itemName)
                        .join(', ')}
                    </Text>
                  )}
                </>
              ) : null}
            </Stack>
          )}
          <Textarea
            label="Détails (optionnel)"
            placeholder="Détails de la commande"
            minRows={3}
            {...form.getInputProps('details')}
            disabled={isCompleted}
          />
          <Group justify="flex-end" mt="md">
            <Button
              variant="subtle"
              onClick={() => {
                onClose();
                form.reset();
                setAddToStock(false);
                setStockCheckResult(null);
              }}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isCompleted}>
              Enregistrer
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

