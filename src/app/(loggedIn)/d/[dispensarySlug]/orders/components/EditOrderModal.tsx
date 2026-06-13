'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Stack,
  TextInput,
  Textarea,
  Select,
  Button,
  Text,
  NumberInput,
  Divider,
  SimpleGrid,
  Loader,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
  orderStatusSelectOptions,
  orderTypeSelectOptions,
} from '@/lib/orders/orderSelectOptions';
import {
  calculateOrderPriceFromItems,
  normalizeItemPrice,
} from '@/lib/orders/calculateOrderPriceFromItems';
import { calculateOrderWeightFromItems } from '@/lib/orders/calculateOrderWeightFromItems';
import { getAvailableItemsForOrder } from '@/lib/orders/getAvailableItemsForOrder';
import { handleApiZodError } from '@/lib/services/zod';
import { ParsedZodError } from '@/lib/errors/ParsedZodError';
import { OrderStatusEnum } from '@/types/enum/orderStatus';
import { OrderTypeEnum } from '@/types/enum/orderType';
import type { OrderItem } from '@/types/orders';
import { AppModal, AppModalFooter } from '@/app/_components/AppModal/AppModal';
import { OrderItemsTable } from './OrderItemsTable';
import {
  useOrderDetail,
  useOrderFormItems,
  useUpdateOrderMutation,
} from '../hooks/useOrdersQueries';

interface EditOrderModalProps {
  opened: boolean;
  onClose: () => void;
  orderId: string | null;
}

export function EditOrderModal({ opened, onClose, orderId }: EditOrderModalProps) {
  const { data: editingOrder, isLoading: loadingOrder } = useOrderDetail(
    orderId,
    opened && Boolean(orderId),
  );
  const companyGroupId = editingOrder?.companyGroupId ?? null;
  const { data: allItems = [], isLoading: loadingItems } = useOrderFormItems(
    companyGroupId,
    opened && Boolean(editingOrder),
  );
  const updateOrderMutation = useUpdateOrderMutation();

  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [priceManuallyEdited, setPriceManuallyEdited] = useState(false);

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

  useEffect(() => {
    if (editingOrder) {
      setOrderItems(
        editingOrder.items.map((item) => ({
          id: item.id,
          itemId: item.itemId,
          quantity: item.quantity,
          item: {
            id: item.item.id,
            name: item.item.name,
            price: item.item.price,
            weight: item.item.weight ?? null,
          },
        })),
      );
      setPriceManuallyEdited(editingOrder.price != null);
      form.setValues({
        name: editingOrder.name,
        status: editingOrder.status as OrderStatusEnum,
        type: (editingOrder.type || OrderTypeEnum.INCOMING) as OrderTypeEnum,
        details: editingOrder.details || '',
        price: editingOrder.price != null ? editingOrder.price : '',
      });
    }
  }, [editingOrder, opened]);

  const suggestedPrice = useMemo(
    () =>
      calculateOrderPriceFromItems(
        orderItems.map((orderItem) => ({
          quantity: orderItem.quantity,
          price: orderItem.item.price,
        })),
      ),
    [orderItems],
  );

  const totalWeight = useMemo(
    () =>
      calculateOrderWeightFromItems(
        orderItems.map((orderItem) => ({
          quantity: orderItem.quantity,
          weight: orderItem.item.weight,
        })),
      ),
    [orderItems],
  );

  useEffect(() => {
    if (!priceManuallyEdited) {
      form.setFieldValue('price', suggestedPrice ?? '');
    }
  }, [suggestedPrice, priceManuallyEdited]);

  const availableItems = useMemo(
    () =>
      getAvailableItemsForOrder({
        orderType: form.values.type,
        allItems,
        companyGroupId,
        firstOrderItemId: orderItems[0]?.itemId ?? null,
      }),
    [form.values.type, allItems, companyGroupId, orderItems],
  );

  const availableItemOptions = useMemo(
    () =>
      availableItems
        .filter((item) => !orderItems.some((oi) => oi.itemId === item.id))
        .map((item) => ({ value: item.id, label: item.name })),
    [availableItems, orderItems],
  );

  const handleRemoveItem = (itemId: string) => {
    setOrderItems(orderItems.filter((oi) => oi.itemId !== itemId));
  };

  const handleQuantityChange = (itemId: string, quantity: number | string) => {
    const numQuantity =
      typeof quantity === 'number'
        ? quantity
        : quantity === ''
          ? 1
          : Number(quantity) || 1;
    setOrderItems(
      orderItems.map((oi) =>
        oi.itemId === itemId ? { ...oi, quantity: numQuantity } : oi,
      ),
    );
  };

  const handleAddItem = (itemId: string) => {
    const itemToAdd = allItems.find((item) => item.id === itemId);
    if (itemToAdd && !orderItems.some((oi) => oi.itemId === itemId)) {
      setOrderItems([
        ...orderItems,
        {
          itemId: itemToAdd.id,
          quantity: 1,
          item: {
            id: itemToAdd.id,
            name: itemToAdd.name,
            price: normalizeItemPrice(itemToAdd.price),
            weight: itemToAdd.weight ?? null,
          },
        },
      ]);
    }
  };

  const handleSubmit = async (values: typeof form.values) => {
    if (!editingOrder) return;

    if (orderItems.length === 0) {
      notifications.show({
        title: 'Erreur',
        message: 'La commande doit contenir au moins un article',
        color: 'danger',
      });
      return;
    }

    try {
      await updateOrderMutation.mutateAsync({
        id: editingOrder.id,
        name: values.name,
        status: values.status,
        type: values.type,
        details: values.details || undefined,
        price: values.price !== '' ? Number(values.price) : null,
        items: orderItems.map((oi) => ({
          itemId: oi.itemId,
          quantity: oi.quantity,
        })),
      });
      onClose();
      form.reset();
      setOrderItems([]);
    } catch (error: unknown) {
      if (error instanceof ParsedZodError) {
        handleApiZodError(error.error, form);
      }
    }
  };

  const isCompleted = editingOrder?.status === OrderStatusEnum.COMPLETED;
  const isLoading = loadingOrder || loadingItems;

  return (
    <AppModal
      opened={opened}
      onClose={() => {
        onClose();
        form.reset();
        setOrderItems([]);
        setPriceManuallyEdited(false);
      }}
      title="Modifier la commande"
      size="xl"
      footer={
        <AppModalFooter>
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
          <Button
            type="submit"
            form="edit-order-form"
            disabled={isCompleted || isLoading}
            loading={updateOrderMutation.isPending}
          >
            Enregistrer
          </Button>
        </AppModalFooter>
      }
    >
      {isLoading && !editingOrder ? (
        <Stack align="center" py="xl">
          <Loader />
        </Stack>
      ) : (
        <form id="edit-order-form" onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <Stack gap="sm">
              <Text fw={600} size="xs" c="dimmed" tt="uppercase">
                Informations générales
              </Text>
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                <TextInput
                  label="Nom"
                  placeholder="Nom de la commande"
                  required
                  {...form.getInputProps('name')}
                  disabled={isCompleted}
                />
                <Select
                  label="Type"
                  data={orderTypeSelectOptions}
                  required
                  value={form.values.type}
                  onChange={(value) => {
                    form.setFieldValue('type', value as OrderTypeEnum);
                    setPriceManuallyEdited(false);
                  }}
                  disabled={isCompleted}
                />
              </SimpleGrid>

              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                <Select
                  label="Statut"
                  data={orderStatusSelectOptions}
                  required
                  value={form.values.status}
                  onChange={(value) =>
                    value && form.setFieldValue('status', value as OrderStatusEnum)
                  }
                  disabled={isCompleted}
                />
                <NumberInput
                  label="Prix (optionnel)"
                  placeholder="Prix de la commande"
                  min={0}
                  decimalScale={2}
                  fixedDecimalScale
                  prefix="$ "
                  value={form.values.price}
                  onChange={(value) => {
                    setPriceManuallyEdited(true);
                    form.setFieldValue('price', value === '' ? '' : Number(value));
                  }}
                  disabled={isCompleted}
                />
              </SimpleGrid>

              <Textarea
                label="Détails (optionnel)"
                placeholder="Détails de la commande"
                minRows={3}
                {...form.getInputProps('details')}
                disabled={isCompleted}
              />

              {totalWeight != null && (
                <Text size="sm" c="dimmed">
                  Poids total :{' '}
                  <Text span fw={500} c="inherit">
                    {totalWeight.toFixed(2)} kg
                  </Text>
                </Text>
              )}
            </Stack>

            <Divider />

            <Stack gap="sm">
              <Text fw={600} size="xs" c="dimmed" tt="uppercase">
                Objets de la commande
              </Text>
              <OrderItemsTable
                orderItems={orderItems}
                disabled={isCompleted}
                loadingItems={loadingItems}
                availableItemOptions={availableItemOptions}
                onQuantityChange={handleQuantityChange}
                onRemoveItem={handleRemoveItem}
                onAddItem={handleAddItem}
              />
            </Stack>
          </Stack>
        </form>
      )}
    </AppModal>
  );
}
