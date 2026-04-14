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
  NumberInput,
  Table,
  ActionIcon,
  Divider,
  SimpleGrid,
} from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { updateOrder } from '@/app/_actions/orders';
import { getItems } from '@/app/_actions/items';
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
import type { OrderWithRelations } from '@/types/orders';
import type { ItemWithRelations } from '@/types/stock';

interface OrderItem {
  itemId: string;
  quantity: number;
  item: {
    id: string;
    name: string;
    price: number | null;
  };
}

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
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [allItems, setAllItems] = useState<ItemWithRelations[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // Utility function to convert price to number
  const normalizePrice = (price: unknown): number | null => {
    if (price == null) return null;
    if (typeof price === 'number') return price;
    const numPrice = Number(price);
    return isNaN(numPrice) ? null : numPrice;
  };

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
    if (opened) {
      const loadItems = async () => {
        try {
          setLoadingItems(true);
          const itemsResult = await getItems();
          const itemsData = handleAction(itemsResult);
          if (itemsData) {
            setAllItems(
              itemsData.map((item: any) => ({
                ...item,
                stockToday: null,
                stockYesterday: null,
                price: normalizePrice(item.price),
                canBeSold: item.canBeSold ?? false,
              }))
            );
          }
        } catch (error: any) {
          notifications.show({
            title: 'Erreur',
            message: error.message || 'Erreur lors du chargement des données',
            color: 'red',
          });
        } finally {
          setLoadingItems(false);
        }
      };
      loadItems();
    }
  }, [opened]);

  useEffect(() => {
    if (editingOrder) {
      setOrderItems(
        editingOrder.items.map((item) => ({
          itemId: item.itemId,
          quantity: item.quantity,
          item: {
            id: item.item.id,
            name: item.item.name,
            price: item.item.price,
          },
        }))
      );
    }
  }, [editingOrder, opened]);

  // Calculate total price for outgoing orders
  const calculatedPrice = useMemo(() => {
    const orderType = form.values.type || (editingOrder?.type as OrderTypeEnum);
    if (orderType !== OrderTypeEnum.OUTGOING) return null;
    
    const total = orderItems.reduce((sum, orderItem) => {
      const itemPrice = orderItem.item.price;
      if (itemPrice != null && itemPrice > 0) {
        return sum + itemPrice * orderItem.quantity;
      }
      return sum;
    }, 0);
    
    return total > 0 ? total : null;
  }, [orderItems, form.values.type, editingOrder]);

  useEffect(() => {
    if (editingOrder) {
      form.setValues({
        name: editingOrder.name,
        status: editingOrder.status as OrderStatusEnum,
        type: (editingOrder.type || OrderTypeEnum.INCOMING) as OrderTypeEnum,
        details: editingOrder.details || '',
        price: editingOrder.price != null ? editingOrder.price : '',
      });
    }
  }, [editingOrder, opened]);

  const getAvailableItems = () => {
    const orderType = form.values.type || (editingOrder?.type as OrderTypeEnum);
    
    if (orderType === OrderTypeEnum.OUTGOING) {
      // For outgoing orders, can choose items that can be sold
      return allItems.filter((item) => {
        const hasCanBeSold = item.canBeSold === true;
        const price = normalizePrice(item.price);
        const hasPrice = price != null && price > 0;
        const isNotCraftableWithPrice = !item.isCraftable && hasPrice;
        
        return hasCanBeSold || isNotCraftableWithPrice;
      });
    }
    
    // For incoming orders, filter by company group
    // Get company group from existing items
    if (orderItems.length > 0) {
      const firstItem = allItems.find((item) => item.id === orderItems[0].itemId);
      const companyGroupId = firstItem?.companyGroupId;
      
      if (companyGroupId) {
        return allItems.filter(
          (item) => !item.isCraftable && item.companyGroupId === companyGroupId
        );
      }
    }
    
    return [];
  };

  const handleRemoveItem = (itemId: string) => {
    setOrderItems(orderItems.filter((oi) => oi.itemId !== itemId));
  };

  const handleQuantityChange = (itemId: string, quantity: number | string) => {
    const numQuantity = typeof quantity === 'number' ? quantity : (quantity === '' ? 1 : Number(quantity) || 1);
    setOrderItems(
      orderItems.map((oi) =>
        oi.itemId === itemId ? { ...oi, quantity: numQuantity } : oi
      )
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
            price: normalizePrice(itemToAdd.price),
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
        color: 'red',
      });
      return;
    }

    try {
      const result = await updateOrder({
        id: editingOrder.id,
        name: values.name,
        status: values.status,
        type: values.type,
        details: values.details || undefined,
        price: values.type === OrderTypeEnum.INCOMING && values.price !== '' ? Number(values.price) : undefined,
        items: orderItems.map((oi) => ({
          itemId: oi.itemId,
          quantity: oi.quantity,
        })),
      });

      handleAction(result);

      notifications.show({
        title: 'Succès',
        message: 'Commande modifiée avec succès',
        color: 'green',
      });
      onClose();
      form.reset();
      setOrderItems([]);
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
        setOrderItems([]);
      }}
      title={editingOrder ? 'Modifier la commande' : 'Créer une commande'}
      size="xl"
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
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
                data={typeOptions}
                required
                value={form.values.type}
                onChange={(value) => form.setFieldValue('type', value as OrderTypeEnum)}
                disabled={isCompleted}
              />
            </SimpleGrid>

            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <Select
                label="Statut"
                data={statusOptions}
                required
                value={form.values.status}
                onChange={(value) =>
                  value && form.setFieldValue('status', value as OrderStatusEnum)
                }
                disabled={isCompleted}
              />
              {form.values.type === OrderTypeEnum.INCOMING ? (
                <NumberInput
                  label="Prix (optionnel)"
                  placeholder="Prix de la commande"
                  {...form.getInputProps('price')}
                  min={0}
                  decimalScale={2}
                  fixedDecimalScale
                  prefix="$ "
                  disabled={isCompleted}
                />
              ) : (
                <TextInput
                  label="Prix total"
                  value={calculatedPrice !== null ? `${calculatedPrice.toFixed(2)} $` : '-'}
                  readOnly
                  styles={{ input: { fontWeight: 500 } }}
                />
              )}
            </SimpleGrid>

            <Textarea
              label="Détails (optionnel)"
              placeholder="Détails de la commande"
              minRows={3}
              {...form.getInputProps('details')}
              disabled={isCompleted}
            />
          </Stack>

          <Divider />

          <Stack gap="sm">
            <Text fw={600} size="xs" c="dimmed" tt="uppercase">
              Objets de la commande
            </Text>
          {orderItems.length > 0 ? (
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Objet</Table.Th>
                  <Table.Th>Quantité</Table.Th>
                  {form.values.type === OrderTypeEnum.OUTGOING && <Table.Th>Prix unitaire</Table.Th>}
                  {form.values.type === OrderTypeEnum.OUTGOING && <Table.Th>Total</Table.Th>}
                  <Table.Th style={{ width: 50 }}></Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {orderItems.map((orderItem) => {
                  const itemPrice = orderItem.item.price || 0;
                  const itemTotal = itemPrice * orderItem.quantity;
                  return (
                    <Table.Tr key={orderItem.itemId}>
                      <Table.Td>{orderItem.item.name}</Table.Td>
                      <Table.Td>
                        <NumberInput
                          value={orderItem.quantity}
                          onChange={(value) => handleQuantityChange(orderItem.itemId, value)}
                          min={1}
                          style={{ maxWidth: 120 }}
                          disabled={isCompleted}
                        />
                      </Table.Td>
                      {form.values.type === OrderTypeEnum.OUTGOING && (
                        <>
                          <Table.Td>{itemPrice > 0 ? `${itemPrice.toFixed(2)} $` : '-'}</Table.Td>
                          <Table.Td>{itemTotal > 0 ? `${itemTotal.toFixed(2)} $` : '-'}</Table.Td>
                        </>
                      )}
                      <Table.Td>
                        <ActionIcon
                          color="red"
                          variant="light"
                          onClick={() => handleRemoveItem(orderItem.itemId)}
                          disabled={isCompleted}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          ) : (
            <Text c="dimmed" ta="center" py="md">
              Aucun objet dans la commande. Utilisez le champ ci-dessous pour ajouter un objet.
            </Text>
          )}

          {!isCompleted && (
            <Select
              label="Ajouter un objet"
              placeholder="Sélectionner un objet à ajouter"
              data={getAvailableItems()
                .filter((item) => !orderItems.some((oi) => oi.itemId === item.id))
                .map((item) => ({ value: item.id, label: item.name }))}
              disabled={loadingItems || getAvailableItems().length === 0}
              onChange={(value) => {
                if (value) {
                  handleAddItem(value);
                }
              }}
              searchable
              clearable
            />
          )}

          </Stack>

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
            <Button type="submit" disabled={isCompleted}>
              Enregistrer
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

