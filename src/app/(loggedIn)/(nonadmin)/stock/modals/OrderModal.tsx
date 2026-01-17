'use client';

import { useState, useEffect, useMemo } from 'react';
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
  Alert,
} from '@mantine/core';
import { IconTrash, IconAlertTriangle } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { getCompanyGroups } from '@/app/_actions/companyGroups';
import { getItems } from '@/app/_actions/items';
import { getOrders, createOrder } from '@/app/_actions/orders';
import { handleAction } from '@/lib/action';
import type { ItemWithRelations } from '@/types/stock';

interface OrderModalProps {
  opened: boolean;
  onClose: () => void;
  items?: ItemWithRelations[]; // Optionnel pour permettre l'utilisation depuis la page orders
  onOrderCreated?: () => void;
  prefillItemsNeedingRestock?: boolean; // Si true, préremplit les items nécessitant un réapprovisionnement
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

interface ExistingOrder {
  id: string;
  name: string;
  status: string;
  company: {
    id: string;
    name: string;
  };
  items: Array<{
    itemId: string;
    quantity: number;
    item: {
      id: string;
      name: string;
    };
  }>;
}

export default function OrderModal({ 
  opened, 
  onClose, 
  items = [], 
  onOrderCreated,
  prefillItemsNeedingRestock = true,
}: OrderModalProps) {
  const [companyGroups, setCompanyGroups] = useState<CompanyGroupWithCompanies[]>([]);
  const [allItems, setAllItems] = useState<ItemWithRelations[]>([]);
  const [selectedCompanyGroupId, setSelectedCompanyGroupId] = useState<string | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [orderDetails, setOrderDetails] = useState('');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [existingOrders, setExistingOrders] = useState<ExistingOrder[]>([]);

  // Charger les groupes d'entreprises et les entreprises
  useEffect(() => {
    if (opened) {
      loadData();
    }
  }, [opened]);

  const loadData = async () => {
    try {
      setLoadingData(true);
      const [groupsResult, itemsResult] = await Promise.all([
        getCompanyGroups(),
        // Si on n'a pas d'items fournis (depuis la page orders), les charger
        items.length === 0 ? getItems() : Promise.resolve({ status: 200, data: [] }),
      ]);

      const groupsData = handleAction(groupsResult);
      
      // Si on n'a pas d'items fournis, charger les items depuis l'API
      if (items.length === 0) {
        const itemsData = handleAction(itemsResult);
        if (itemsData) {
          // Convertir les items en ItemWithRelations (sans stock)
          setAllItems(
            itemsData.map((item) => ({
              ...item,
              stockToday: null,
              stockYesterday: null,
            }))
          );
        }
      } else {
        setAllItems(items);
      }

      // Attendre que les items soient chargés avant de filtrer les groupes
      const itemsToUseForFiltering = items.length > 0 ? items : allItems;
      
      if (groupsData) {
        let filteredGroups = groupsData;
        
        // Filtrer les groupes d'entreprises pour ne garder que ceux qui ont au moins un item non-craftable
        if (itemsToUseForFiltering.length > 0) {
          filteredGroups = groupsData.filter((group) => {
            // Vérifier s'il y a au moins un item non-craftable lié à ce groupe
            const hasItems = itemsToUseForFiltering.some(
              (item) => !item.isCraftable && item.companyGroupId === group.id
            );
            
            if (!hasItems) return false;
            
            // Si prefillItemsNeedingRestock est true, vérifier aussi qu'il y a des items nécessitant un réapprovisionnement
            if (prefillItemsNeedingRestock) {
              return itemsToUseForFiltering.some(
                (item) =>
                  !item.isCraftable &&
                  item.companyGroupId === group.id &&
                  item.stockToday !== null &&
                  item.stockToday < item.idealQuantity
              );
            }
            
            return true;
          });
        } else {
          filteredGroups = groupsData;
        }

        setCompanyGroups(
          filteredGroups.map((g) => ({
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

  // Créer une version stable de itemsToUse avec useMemo
  const itemsToUse = useMemo(() => {
    return items.length > 0 ? items : allItems;
  }, [items, allItems]);

  // Charger les commandes existantes quand un groupe d'entreprise est sélectionné
  useEffect(() => {
    const loadExistingOrders = async () => {
      if (!selectedCompanyGroupId) {
        setExistingOrders([]);
        return;
      }

      try {
        const result = await getOrders();
        const ordersData = handleAction(result);
        
        if (ordersData) {
          // Obtenir les IDs des entreprises du groupe sélectionné
          const selectedGroup = companyGroups.find((g) => g.id === selectedCompanyGroupId);
          const companyIds = selectedGroup?.companies.map((c) => c.company.id) || [];
          
          // Filtrer les commandes : non terminées/annulées et appartenant au groupe
          const activeOrders = ordersData.filter((order: ExistingOrder) => {
            const isActive = order.status !== 'COMPLETED' && order.status !== 'CANCELLED';
            const belongsToGroup = companyIds.includes(order.company.id);
            return isActive && belongsToGroup;
          });
          
          setExistingOrders(activeOrders);
        }
      } catch (error: any) {
        // Silently fail, ce n'est pas critique
        console.error('Erreur lors du chargement des commandes existantes:', error);
      }
    };

    loadExistingOrders();
  }, [selectedCompanyGroupId, companyGroups]);

  // Quand un groupe d'entreprise est sélectionné, initialiser les items qui ont besoin d'être restockés (si prefillItemsNeedingRestock est true)
  useEffect(() => {
    if (!selectedCompanyGroupId) {
      setOrderItems([]);
      setSelectedCompanyId(null);
      return;
    }
    
    if (prefillItemsNeedingRestock && itemsToUse.length > 0) {
      const itemsNeedingRestock = itemsToUse.filter(
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
    } else if (!prefillItemsNeedingRestock) {
      // Si on ne préremplit pas, on laisse la liste vide pour que l'utilisateur ajoute manuellement
      setOrderItems([]);
    }
    
    // Réinitialiser la sélection d'entreprise quand on change de groupe
    setSelectedCompanyId(null);
  }, [selectedCompanyGroupId, prefillItemsNeedingRestock, itemsToUse]);

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
    return itemsToUse.filter(
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

  // Vérifier si des items de la commande en cours sont déjà dans une commande existante
  const conflictingOrders = useMemo(() => {
    if (orderItems.length === 0 || existingOrders.length === 0) {
      return [];
    }

    const currentItemIds = new Set(orderItems.map((oi) => oi.itemId));
    
    return existingOrders.filter((order) => {
      // Vérifier si au moins un item de la commande en cours est dans cette commande existante
      return order.items.some((orderItem) => currentItemIds.has(orderItem.itemId));
    });
  }, [orderItems, existingOrders]);

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
            {conflictingOrders.length > 0 && (
              <Alert
                icon={<IconAlertTriangle size={16} />}
                title="Commande en cours"
                color="yellow"
              >
                <Text size="sm">
                  Une ou plusieurs commandes en cours pour ce groupe d'entreprises contiennent déjà certains articles que vous souhaitez commander :
                </Text>
                <Stack gap="xs" mt="xs">
                  {conflictingOrders.map((order) => {
                    const conflictingItems = order.items.filter((orderItem) =>
                      orderItems.some((oi) => oi.itemId === orderItem.itemId)
                    );
                    return (
                      <Text key={order.id} size="sm" fw={500}>
                        • {order.name} ({order.company.name}) : {conflictingItems.map((item) => item.item.name).join(', ')}
                      </Text>
                    );
                  })}
                </Stack>
                <Text size="sm" mt="xs" c="dimmed">
                  Vérifiez si vous souhaitez vraiment créer une nouvelle commande ou si vous devriez plutôt modifier la commande existante.
                </Text>
              </Alert>
            )}

            <Textarea
              label="Détails (optionnel)"
              placeholder="Détails de la commande"
              value={orderDetails}
              onChange={(e) => setOrderDetails(e.currentTarget.value)}
              minRows={3}
            />

            <Text fw={500}>Objets de la commande</Text>

            {orderItems.length > 0 ? (
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Objet</Table.Th>
                    {prefillItemsNeedingRestock && items.length > 0 && items[0].stockToday !== null && (
                      <>
                        <Table.Th>Stock actuel</Table.Th>
                        <Table.Th>Quantité idéale</Table.Th>
                        <Table.Th>Quantité finale</Table.Th>
                      </>
                    )}
                    <Table.Th>Quantité à commander</Table.Th>
                    <Table.Th style={{ width: 50 }}></Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {orderItems.map((orderItem) => {
                    const item = itemsToUse.find((i) => i.id === orderItem.itemId) || orderItem.item;
                    const stockToday = item.stockToday ?? 0;
                    const finalQuantity = stockToday + orderItem.quantity;
                    const hasStockInfo = item.stockToday !== null && prefillItemsNeedingRestock && items.length > 0;
                    return (
                      <Table.Tr key={orderItem.itemId}>
                        <Table.Td>{item.name}</Table.Td>
                        {hasStockInfo && (
                          <>
                            <Table.Td>
                              <Badge color={stockToday < item.idealQuantity ? 'red' : 'green'}>
                                {stockToday}
                              </Badge>
                            </Table.Td>
                            <Table.Td>{item.idealQuantity}</Table.Td>
                            <Table.Td>
                              <Badge color={finalQuantity >= item.idealQuantity ? 'green' : 'orange'}>
                                {finalQuantity}
                              </Badge>
                            </Table.Td>
                          </>
                        )}
                        <Table.Td>
                          <NumberInput
                            value={orderItem.quantity}
                            onChange={(value) => handleQuantityChange(orderItem.itemId, value)}
                            min={1}
                            style={{ maxWidth: 120 }}
                          />
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
                Aucun objet dans la commande. Utilisez le champ ci-dessous pour ajouter un objet.
              </Text>
            )}

            {selectedCompanyGroupId && canAddMoreItems && (
              <Select
                label="Ajouter un objet"
                placeholder="Sélectionner un objet à ajouter"
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

