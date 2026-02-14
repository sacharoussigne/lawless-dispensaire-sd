'use client';

import { useEffect, useState, useMemo } from 'react';
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
  NumberInput,
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
import { checkOrderItemsStockToday, checkOrderItemsStockSufficient } from '@/app/_actions/stock';
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
    allHaveEnoughStock?: boolean;
    items: Array<{ 
      itemId: string; 
      itemName: string; 
      hasStockToday: boolean;
      currentStock?: number;
      requiredQuantity?: number;
      hasEnoughStock?: boolean;
    }>;
  } | null>(null);
  const [checkingStock, setCheckingStock] = useState(false);

  const form = useForm({
    initialValues: {
      name: '',
      status: OrderStatusEnum.DRAFT,
      type: OrderTypeEnum.INCOMING,
      details: '',
      price: '' as number | '',
    },
    validate: {
      name: (value) => (value.length < 1 ? 'Le nom est requis' : null),
    },
  });

  // Calculer le prix total pour les commandes sortantes
  const calculatedPrice = useMemo(() => {
    if (!editingOrder || editingOrder.type !== OrderTypeEnum.OUTGOING) return null;
    
    const total = editingOrder.items.reduce((sum, orderItem) => {
      const itemPrice = orderItem.item.price;
      if (itemPrice != null && itemPrice > 0) {
        return sum + itemPrice * orderItem.quantity;
      }
      return sum;
    }, 0);
    
    return total > 0 ? total : null;
  }, [editingOrder]);

  useEffect(() => {
    if (editingOrder) {
      form.setValues({
        name: editingOrder.name,
        status: editingOrder.status as OrderStatusEnum,
        type: (editingOrder.type || OrderTypeEnum.INCOMING) as OrderTypeEnum,
        details: editingOrder.details || '',
        price: editingOrder.price != null ? editingOrder.price : '',
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
        const orderType = form.values.type || (editingOrder.type as OrderTypeEnum);
        
        // Pour les commandes sortantes, vérifier qu'on a assez de stock
        if (orderType === OrderTypeEnum.OUTGOING) {
          const result = await checkOrderItemsStockSufficient(editingOrder.id);
          const data = handleAction(result);
          if (data) {
            setStockCheckResult(data);
            // Pour les commandes sortantes, on ne peut pas terminer si on n'a pas assez de stock
            setAddToStock(false); // Pas de checkbox pour les commandes sortantes
          }
        } else {
          // Pour les commandes entrantes, vérifier si le stock d'aujourd'hui existe
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
        price: values.type === OrderTypeEnum.INCOMING && values.price !== '' ? Number(values.price) : undefined,
        addToStock:
          values.status === OrderStatusEnum.COMPLETED ? addToStock : undefined,
      });

      handleAction(result);

      let message = 'Commande modifiée avec succès';
      const orderType = values.type || (editingOrder.type as OrderTypeEnum);
      
      if (values.status === OrderStatusEnum.COMPLETED) {
        if (orderType === OrderTypeEnum.OUTGOING) {
          if (stockCheckResult?.allHaveEnoughStock) {
            message += '. Les objets ont été retirés du stock.';
          } else {
            message += ". Les objets n'ont pas pu être retirés du stock (stock insuffisant ou non fait).";
          }
        } else if (addToStock) {
          message += '. Les objets ont été ajoutés au stock.';
        } else if (stockCheckResult?.allHaveStockToday) {
          message += ". Les objets n'ont pas été ajoutés au stock.";
        }
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
                  {(() => {
                    const orderType = form.values.type || (editingOrder?.type as OrderTypeEnum);
                    
                    // Pour les commandes sortantes
                    if (orderType === OrderTypeEnum.OUTGOING) {
                      if (!stockCheckResult.allHaveStockToday) {
                        return (
                          <Text size="sm" c="orange" fw={500}>
                            ⚠️ Le stock d'aujourd'hui n'est pas fait pour certains objets. Les
                            objets ne peuvent pas être retirés du stock.
                          </Text>
                        );
                      }
                      if (!stockCheckResult.allHaveEnoughStock) {
                        const insufficientItems = stockCheckResult.items
                          .filter((item) => !item.hasEnoughStock)
                          .map((item) => `${item.itemName} (stock: ${item.currentStock}, requis: ${item.requiredQuantity})`);
                        return (
                          <>
                            <Text size="sm" c="red" fw={500}>
                              ⚠️ Stock insuffisant pour certains objets. Les objets ne peuvent pas être retirés du stock.
                            </Text>
                            <Text size="xs" c="dimmed" mt="xs">
                              Objets avec stock insuffisant : {insufficientItems.join(', ')}
                            </Text>
                          </>
                        );
                      }
                      return (
                        <Text size="sm" c="green" fw={500}>
                          ✓ Stock suffisant. Les objets seront automatiquement retirés du stock lors de la sauvegarde.
                        </Text>
                      );
                    }
                    
                    // Pour les commandes entrantes
                    if (!stockCheckResult.allHaveStockToday) {
                      return (
                        <Text size="sm" c="orange" fw={500}>
                          ⚠️ Le stock d'aujourd'hui n'est pas fait pour certains objets. Les
                          objets ne peuvent pas être ajoutés automatiquement au stock.
                        </Text>
                      );
                    }
                    return (
                      <Checkbox
                        label="Ajouter automatiquement les objets au stock d'aujourd'hui"
                        checked={addToStock}
                        onChange={(event) =>
                          setAddToStock(event.currentTarget.checked)
                        }
                      />
                    );
                  })()}
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
          {form.values.type === OrderTypeEnum.INCOMING && (
            <NumberInput
              label="Prix (optionnel)"
              placeholder="Prix de la commande"
              {...form.getInputProps('price')}
              min={0}
              decimalScale={2}
              fixedDecimalScale
              prefix="€ "
              disabled={isCompleted}
            />
          )}
          {form.values.type === OrderTypeEnum.OUTGOING && calculatedPrice !== null && (
            <TextInput
              label="Prix total"
              value={`${calculatedPrice.toFixed(2)} €`}
              readOnly
              styles={{ input: { fontWeight: 500 } }}
            />
          )}
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

