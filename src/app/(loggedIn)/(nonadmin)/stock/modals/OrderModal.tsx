'use client';

import { useState, useEffect } from 'react';
import {
  Modal,
  Select,
  Stack,
  TextInput,
  Textarea,
  Button,
  Group,
  Table,
  NumberInput,
  ActionIcon,
  Text,
  Badge,
} from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { getCompanyGroups } from '@/app/_actions/companyGroups';
import { createOrder } from '@/app/_actions/orders';
import { handleAction } from '@/lib/action';
import type { ItemWithRelations } from '@/types/stock';

interface OrderModalProps {
  opened: boolean;
  onClose: () => void;
  items: ItemWithRelations[];
  onOrderCreated?: () => void;
}

interface OrderItem {
  itemId: string;
  quantity: number;
  item: ItemWithRelations;
}

interface CompanyGroupWithCompanies {
  id: string;
  name: string;
  companies: Array<{ companyId: string; company: { id: string; name: string } }>;
}

export default function OrderModal({ opened, onClose, items, onOrderCreated }: OrderModalProps) {
  const [companyGroups, setCompanyGroups] = useState<CompanyGroupWithCompanies[]>([]);
  const [selectedCompanyGroupId, setSelectedCompanyGroupId] = useState<string | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [orderDetails, setOrderDetails] = useState('');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  // Charger les groupes d'entreprises et les entreprises
  useEffect(() => {
    if (opened) {
      loadData();
    }
  }, [opened]);

  const loadData = async () => {
    try {
      setLoadingData(true);
      const groupsResult = await getCompanyGroups();
      const groupsData = handleAction(groupsResult);

      if (groupsData) {
        setCompanyGroups(
          groupsData.map((g) => ({
            id: g.id,
            name: g.name,
            companies: g.companies || [],
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
      setLoadingData(false);
    }
  };

  // Quand un groupe d'entreprise est sélectionné, initialiser les items qui ont besoin d'être restockés
  useEffect(() => {
    if (selectedCompanyGroupId) {
      const itemsNeedingRestock = items.filter(
        (item) =>
          !item.isCraftable &&
          item.companyGroupId === selectedCompanyGroupId &&
          item.stockToday !== null &&
          item.stockToday < item.idealQuantity
      );

      const initialOrderItems: OrderItem[] = itemsNeedingRestock.map((item) => {
        const quantityNeeded = item.idealQuantity - (item.stockToday ?? 0);
        return {
          itemId: item.id,
          quantity: quantityNeeded > 0 ? quantityNeeded : 1,
          item,
        };
      });

      setOrderItems(initialOrderItems);
    } else {
      setOrderItems([]);
    }
    // Réinitialiser la sélection d'entreprise quand on change de groupe
    setSelectedCompanyId(null);
  }, [selectedCompanyGroupId, items, companyGroups]);

  // Réinitialiser le formulaire quand la modal se ferme
  useEffect(() => {
    if (!opened) {
      setSelectedCompanyGroupId(null);
      setSelectedCompanyId(null);
      setOrderDetails('');
      setOrderItems([]);
    }
  }, [opened]);

  // Obtenir les items disponibles pour le groupe sélectionné
  const getAvailableItemsForGroup = () => {
    if (!selectedCompanyGroupId) return [];
    return items.filter(
      (item) => !item.isCraftable && item.companyGroupId === selectedCompanyGroupId
    );
  };

  // Obtenir les items déjà dans la commande
  const getOrderItemIds = () => {
    return new Set(orderItems.map((oi) => oi.itemId));
  };

  // Retirer un item de la commande
  const handleRemoveItem = (itemId: string) => {
    setOrderItems(orderItems.filter((oi) => oi.itemId !== itemId));
  };

  // Mettre à jour la quantité d'un item
  const handleQuantityChange = (itemId: string, quantity: number | string) => {
    const numQuantity = typeof quantity === 'number' ? quantity : (quantity === '' ? 1 : Number(quantity) || 1);
    setOrderItems(
      orderItems.map((oi) =>
        oi.itemId === itemId ? { ...oi, quantity: numQuantity } : oi
      )
    );
  };

  // Créer la commande
  const handleCreateOrder = async () => {
    if (!selectedCompanyGroupId || !selectedCompanyId || orderItems.length === 0) {
      notifications.show({
        title: 'Erreur',
        message: 'Veuillez remplir tous les champs requis',
        color: 'red',
      });
      return;
    }

    try {
      setLoading(true);
      const result = await createOrder({
        details: orderDetails || undefined,
        companyId: selectedCompanyId,
        items: orderItems.map((oi) => ({
          itemId: oi.itemId,
          quantity: oi.quantity,
        })),
      });

      handleAction(result);

      notifications.show({
        title: 'Succès',
        message: 'Commande créée avec succès',
        color: 'green',
      });

      if (onOrderCreated) {
        onOrderCreated();
      }
      onClose();
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors de la création de la commande',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const availableItems = getAvailableItemsForGroup();
  const orderItemIds = getOrderItemIds();
  const canAddMoreItems = availableItems.some((item) => !orderItemIds.has(item.id));

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Créer une commande"
      size="xl"
    >
      <Stack gap="md">
        <Group grow>
          <Select
            label="Groupe d'entreprises"
            placeholder="Sélectionner un groupe d'entreprises"
            data={companyGroups.map((g) => ({ value: g.id, label: g.name }))}
            value={selectedCompanyGroupId}
            onChange={(value) => setSelectedCompanyGroupId(value)}
            required
            searchable
            disabled={loadingData}
          />

          <Select
            label="Entreprise"
            placeholder="Sélectionner une entreprise"
            data={
              selectedCompanyGroupId
                ? companyGroups
                    .find((g) => g.id === selectedCompanyGroupId)
                    ?.companies.map((c) => ({
                      value: c.company.id,
                      label: c.company.name,
                    })) || []
                : []
            }
            value={selectedCompanyId}
            onChange={(value) => setSelectedCompanyId(value)}
            required
            searchable
            disabled={loadingData || !selectedCompanyGroupId}
          />
        </Group>

        {selectedCompanyGroupId && (
          <>

            <Textarea
              label="Détails (optionnel)"
              placeholder="Détails de la commande"
              value={orderDetails}
              onChange={(e) => setOrderDetails(e.currentTarget.value)}
              minRows={3}
            />

            <Text fw={500}>Items de la commande</Text>

            {orderItems.length > 0 ? (
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Item</Table.Th>
                    <Table.Th>Stock actuel</Table.Th>
                    <Table.Th>Quantité idéale</Table.Th>
                    <Table.Th>Quantité à commander</Table.Th>
                    <Table.Th>Quantité finale</Table.Th>
                    <Table.Th style={{ width: 50 }}></Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {orderItems.map((orderItem) => {
                    const item = orderItem.item;
                    const stockToday = item.stockToday ?? 0;
                    const quantityNeeded = item.idealQuantity - stockToday;
                    const finalQuantity = stockToday + orderItem.quantity;
                    return (
                      <Table.Tr key={orderItem.itemId}>
                        <Table.Td>{item.name}</Table.Td>
                        <Table.Td>
                          <Badge color={stockToday < item.idealQuantity ? 'red' : 'green'}>
                            {stockToday}
                          </Badge>
                        </Table.Td>
                        <Table.Td>{item.idealQuantity}</Table.Td>
                        <Table.Td>
                          <NumberInput
                            value={orderItem.quantity}
                            onChange={(value) => handleQuantityChange(orderItem.itemId, value)}
                            min={1}
                            style={{ maxWidth: 120 }}
                          />
                        </Table.Td>
                        <Table.Td>
                          <Badge color={finalQuantity >= item.idealQuantity ? 'green' : 'orange'}>
                            {finalQuantity}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <ActionIcon
                            color="red"
                            variant="light"
                            onClick={() => handleRemoveItem(orderItem.itemId)}
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
                Aucun item dans la commande. Utilisez le champ ci-dessous pour ajouter un item.
              </Text>
            )}

            {selectedCompanyGroupId && canAddMoreItems && (
              <Select
                label="Ajouter un item"
                placeholder="Sélectionner un item à ajouter"
                data={availableItems
                  .filter((item) => !orderItemIds.has(item.id))
                  .map((item) => ({ value: item.id, label: item.name }))}
                onChange={(value) => {
                  if (value) {
                    const itemToAdd = availableItems.find((item) => item.id === value);
                    if (itemToAdd) {
                      setOrderItems([
                        ...orderItems,
                        {
                          itemId: itemToAdd.id,
                          quantity: 1,
                          item: itemToAdd,
                        },
                      ]);
                    }
                  }
                }}
                searchable
                clearable
              />
            )}
          </>
        )}

        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={onClose}>
            Annuler
          </Button>
          <Button
            onClick={handleCreateOrder}
            loading={loading}
            disabled={
              !selectedCompanyGroupId ||
              !selectedCompanyId ||
              orderItems.length === 0
            }
          >
            Créer la commande
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

