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
import { checkOrderItemsStockToday, checkOrderItemsStockSufficient } from '@/app/_actions/stock';
import { getChests } from '@/app/_actions/chests';
import type { OrderWithRelations } from '@/types/orders';
import type { ItemWithRelations } from '@/types/stock';
import type { ChestWithStockHistory } from '@/types/chests';

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
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [allItems, setAllItems] = useState<ItemWithRelations[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [chests, setChests] = useState<ChestWithStockHistory[]>([]);
  const [selectedChestId, setSelectedChestId] = useState<string | null>(null);

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
          const [itemsResult, chestsResult] = await Promise.all([
            getItems(),
            getChests(true),
          ]);
          
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
          
          const chestsData = handleAction(chestsResult);
          if (chestsData) {
            setChests(chestsData);
            // Select "Foure tout" chest by default if it exists
            const defaultChest = chestsData.find((c: ChestWithStockHistory) => c.name === 'Foure tout');
            if (defaultChest) {
              setSelectedChestId(defaultChest.id);
            } else if (chestsData.length > 0) {
              setSelectedChestId(chestsData[0].id);
            }
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
      setAddToStock(false);
      setStockCheckResult(null);
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

  const handleStatusChange = async (status: OrderStatusEnum) => {
    form.setFieldValue('status', status);

    if (status === OrderStatusEnum.COMPLETED && editingOrder) {
      setCheckingStock(true);
      try {
        const orderType = form.values.type || (editingOrder.type as OrderTypeEnum);
        const chestIdToCheck =
          chests.length > 1
            ? selectedChestId
            : (chests.length === 1 ? chests[0].id : null);
        
        // For outgoing orders, check if there's enough stock
        if (orderType === OrderTypeEnum.OUTGOING) {
          const result = await checkOrderItemsStockSufficient(editingOrder.id, chestIdToCheck);
          const data = handleAction(result);
          if (data) {
            setStockCheckResult(data);
            // For outgoing orders, cannot complete if there's not enough stock
            setAddToStock(false); // Pas de checkbox pour les commandes sortantes
          }
        } else {
          // For incoming orders, check if today's stock exists
          const result = await checkOrderItemsStockToday(editingOrder.id, chestIdToCheck);
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

  // Re-run verification when changing chest (if transitioning to COMPLETED)
  useEffect(() => {
    if (!opened || !editingOrder) return;
    if (form.values.status !== OrderStatusEnum.COMPLETED) return;
    if (chests.length <= 1) return;
    if (!selectedChestId) return;

    const run = async () => {
      setCheckingStock(true);
      try {
        const orderType = form.values.type || (editingOrder.type as OrderTypeEnum);
        if (orderType === OrderTypeEnum.OUTGOING) {
          const result = await checkOrderItemsStockSufficient(editingOrder.id, selectedChestId);
          const data = handleAction(result);
          if (data) {
            setStockCheckResult(data);
            setAddToStock(false);
          }
        } else {
          const result = await checkOrderItemsStockToday(editingOrder.id, selectedChestId);
          const data = handleAction(result);
          if (data) {
            setStockCheckResult(data);
            setAddToStock(data.allHaveStockToday);
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
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChestId]);

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
        addToStock:
          values.status === OrderStatusEnum.COMPLETED ? addToStock : undefined,
        chestId: values.status === OrderStatusEnum.COMPLETED 
          ? (chests.length > 1 ? selectedChestId : (chests.length === 1 ? chests[0].id : null))
          : undefined,
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
        setAddToStock(false);
        setStockCheckResult(null);
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
                onChange={(value) => handleStatusChange(value as OrderStatusEnum)}
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

          <Stack gap="sm" mt="xs">
            <Text fw={600} size="xs" c="dimmed" tt="uppercase">
              Stock et exécution
            </Text>
            {form.values.status === OrderStatusEnum.COMPLETED && chests.length > 1 && (
              <Select
                label="Coffre"
                placeholder="Sélectionner un coffre"
                description={
                  form.values.type === OrderTypeEnum.INCOMING
                    ? 'Coffre où ajouter les items'
                    : 'Coffre d\'où retirer les items'
                }
                data={chests.map((chest) => ({
                  value: chest.id,
                  label: chest.name,
                }))}
                value={selectedChestId || ''}
                onChange={(value) => setSelectedChestId(value || null)}
                required
                searchable
              />
            )}
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
                      
                      // For outgoing orders
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
                      
                      // For incoming orders
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

