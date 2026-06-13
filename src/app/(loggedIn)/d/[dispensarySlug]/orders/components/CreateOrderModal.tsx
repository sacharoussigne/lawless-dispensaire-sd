'use client';

import { usePermissions } from '@/app/_contexts/PermissionsContext';
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Modal,
  Select,
  Stack,
  Textarea,
  Button,
  Group,
  Table,
  NumberInput,
  ActionIcon,
  Text,
  Badge,
  Alert,
  SegmentedControl,
} from '@mantine/core';
import { IconTrash, IconAlertTriangle } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import {
  useActiveOrdersForGroup,
  useCreateOrderMutation,
  useOrderFormItems,
} from '../hooks/useOrdersQueries';
import { useCompanyGroupsForOrders } from '@/app/(loggedIn)/d/[dispensarySlug]/management/companygroups/hooks/useCompanyGroupsQueries';
import { getAvailableItemsForOrder } from '@/lib/orders/getAvailableItemsForOrder';
import type { ActiveOrderSummary } from '@/types/orders';
import {
  getIndividualCustomers,
  createIndividualCustomer,
  deleteIndividualCustomerByName,
} from '@/app/_actions/individualCustomers';
import { SuggestionAutocomplete } from '@/app/_components/SuggestionAutocomplete/SuggestionAutocomplete';
import { handleAction } from '@/lib/action';
import {
  calculateOrderPriceFromItems,
  normalizeItemPrice,
} from '@/lib/orders/calculateOrderPriceFromItems';
import { calculateOrderWeightFromItems } from '@/lib/orders/calculateOrderWeightFromItems';
import type { ItemWithRelations } from '@/types/stock';
import { OrderTypeEnum } from '@/types/enum/orderType';
import { orderTypeSelectOptions } from '@/lib/orders/orderSelectOptions';

function orderClientLabel(order: ActiveOrderSummary): string {
  return order.individualCustomer?.name ?? order.company?.name ?? '—';
}

type ClientMode = 'company' | 'individual';

interface CreateOrderModalProps {
  opened: boolean;
  onClose: () => void;
  items?: ItemWithRelations[];
  onOrderCreated?: () => void;
  prefillItemsNeedingRestock?: boolean;
}

interface CreateOrderLineItem {
  itemId: string;
  quantity: number;
  item: ItemWithRelations;
}

const EMPTY_ITEMS: ItemWithRelations[] = [];
const EMPTY_ACTIVE_ORDERS: ActiveOrderSummary[] = [];

export default function CreateOrderModal({
  opened,
  onClose,
  items: itemsProp,
  onOrderCreated,
  prefillItemsNeedingRestock = true,
}: CreateOrderModalProps) {
  const items = itemsProp ?? EMPTY_ITEMS;
  const { dispensarySlug } = usePermissions();
  const createOrderMutation = useCreateOrderMutation();
  const { data: fetchedItems } = useOrderFormItems(null, opened && items.length === 0);
  const { data: allCompanyGroups = [], isFetching: loadingCompanyGroups } =
    useCompanyGroupsForOrders(opened);
  const [selectedCompanyGroupId, setSelectedCompanyGroupId] = useState<string | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [orderType, setOrderType] = useState<OrderTypeEnum>(OrderTypeEnum.INCOMING);
  const [orderDetails, setOrderDetails] = useState('');
  const [orderPrice, setOrderPrice] = useState<number | ''>('');
  const [priceManuallyEdited, setPriceManuallyEdited] = useState(false);
  const [orderItems, setOrderItems] = useState<CreateOrderLineItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const { data: existingOrders } = useActiveOrdersForGroup(selectedCompanyGroupId);
  const activeOrders = existingOrders ?? EMPTY_ACTIVE_ORDERS;
  const [clientMode, setClientMode] = useState<ClientMode>('company');
  const [individualCustomers, setIndividualCustomers] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [selectedIndividualCustomerId, setSelectedIndividualCustomerId] = useState<string | null>(
    null
  );
  const [individualCustomerInput, setIndividualCustomerInput] = useState('');

  // Load individual customers when modal opens
  useEffect(() => {
    if (!opened) return;

    const loadIndividualCustomers = async () => {
      try {
        setLoadingData(true);
        const individualsResult = await getIndividualCustomers(dispensarySlug!);
        const individualsData = handleAction(individualsResult);
        if (individualsData) {
          setIndividualCustomers(individualsData);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Erreur lors du chargement des données';
        notifications.show({
          title: 'Erreur',
          message,
          color: 'danger',
        });
      } finally {
        setLoadingData(false);
      }
    };

    void loadIndividualCustomers();
  }, [opened, dispensarySlug]);

  const itemsToUse = useMemo(() => {
    if (items.length > 0) {
      return items.map((item) => ({
        ...item,
        price: normalizeItemPrice(item.price),
        canBeSold: item.canBeSold ?? false,
      }));
    }
    return fetchedItems ?? EMPTY_ITEMS;
  }, [items, fetchedItems]);

  const individualCustomerNames = useMemo(
    () =>
      [...new Set(individualCustomers.map((c) => c.name))].sort((a, b) =>
        a.localeCompare(b, 'fr', { sensitivity: 'base' })
      ),
    [individualCustomers]
  );

  // Filtrer les groupes d'entreprises selon le type de commande
  const companyGroups = useMemo(() => {
    if (orderType === OrderTypeEnum.OUTGOING) {
      // Pour les commandes sortantes, afficher tous les groupes
      return allCompanyGroups;
    }

    // Pour les commandes entrantes, filtrer selon les items
    const itemsToUseForFiltering = itemsToUse;
    
    if (itemsToUseForFiltering.length === 0) {
      return allCompanyGroups;
    }

    return allCompanyGroups.filter((group) => {
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
            item.stockToday < item.minimalQuantity
        );
      }
      
      return true;
    });
  }, [allCompanyGroups, orderType, itemsToUse, prefillItemsNeedingRestock]);

  // Réinitialiser les sélections quand le type change
  useEffect(() => {
    setSelectedCompanyGroupId(null);
    setSelectedCompanyId(null);
    setSelectedIndividualCustomerId(null);
    setIndividualCustomerInput('');
    setClientMode('company');
    setOrderItems([]);
    setOrderPrice('');
    setPriceManuallyEdited(false);
  }, [orderType]);

  useEffect(() => {
    setSelectedCompanyId(null);
    setSelectedIndividualCustomerId(null);
    setIndividualCustomerInput('');
    if (orderType === OrderTypeEnum.OUTGOING && clientMode === 'individual') {
      setSelectedCompanyGroupId(null);
    }
  }, [clientMode, orderType]);

  // Quand un groupe d'entreprise est sélectionné, initialiser les items qui ont besoin d'être restockés (si prefillItemsNeedingRestock est true)
  useEffect(() => {
    if (orderType === OrderTypeEnum.OUTGOING && clientMode === 'individual') {
      return;
    }

    if (!selectedCompanyGroupId) {
      setOrderItems((prev) => (prev.length > 0 ? [] : prev));
      setSelectedCompanyId((prev) => (prev !== null ? null : prev));
      return;
    }

    // Ne préremplir que pour les commandes entrantes (INCOMING)
    if (orderType === OrderTypeEnum.INCOMING && prefillItemsNeedingRestock && itemsToUse.length > 0) {
      const itemsNeedingRestock = itemsToUse.filter(
        (item) =>
          !item.isCraftable &&
          item.companyGroupId === selectedCompanyGroupId &&
          item.stockToday !== null &&
          item.stockToday < item.minimalQuantity
      );

      const initialOrderItems: CreateOrderLineItem[] = itemsNeedingRestock.map((item) => {
        const quantityNeeded = item.minimalQuantity - (item.stockToday ?? 0);
        return {
          itemId: item.id,
          quantity: quantityNeeded > 0 ? quantityNeeded : 1,
          item,
        };
      });

      setOrderItems((prev) => {
        if (
          prev.length === initialOrderItems.length &&
          prev.every(
            (line, index) =>
              line.itemId === initialOrderItems[index]?.itemId &&
              line.quantity === initialOrderItems[index]?.quantity,
          )
        ) {
          return prev;
        }
        return initialOrderItems;
      });
    } else {
      setOrderItems((prev) => (prev.length > 0 ? [] : prev));
    }

    setSelectedCompanyId((prev) => (prev !== null ? null : prev));
  }, [selectedCompanyGroupId, prefillItemsNeedingRestock, itemsToUse, orderType, clientMode]);

  const suggestedPrice = useMemo(
    () =>
      calculateOrderPriceFromItems(
        orderItems.map((orderItem) => {
          const item =
            itemsToUse.find((i) => i.id === orderItem.itemId) || orderItem.item;
          return {
            quantity: orderItem.quantity,
            price: item.price,
          };
        })
      ),
    [orderItems, itemsToUse]
  );

  const totalWeight = useMemo(
    () =>
      calculateOrderWeightFromItems(
        orderItems.map((orderItem) => {
          const item =
            itemsToUse.find((i) => i.id === orderItem.itemId) || orderItem.item;
          return {
            quantity: orderItem.quantity,
            weight: item.weight,
          };
        })
      ),
    [orderItems, itemsToUse]
  );

  useEffect(() => {
    if (!priceManuallyEdited) {
      const nextPrice = suggestedPrice ?? '';
      setOrderPrice((prev) => (prev === nextPrice ? prev : nextPrice));
    }
  }, [suggestedPrice, priceManuallyEdited]);

  // Réinitialiser le formulaire quand la modal se ferme
  useEffect(() => {
    if (!opened) {
      setSelectedCompanyGroupId(null);
      setSelectedCompanyId(null);
      setSelectedIndividualCustomerId(null);
      setClientMode('company');
      setIndividualCustomerInput('');
      setOrderType(OrderTypeEnum.INCOMING);
      setOrderDetails('');
      setOrderPrice('');
      setPriceManuallyEdited(false);
      setOrderItems([]);
    }
  }, [opened]);

  const getAvailableItemsForGroup = () =>
    getAvailableItemsForOrder({
      orderType,
      allItems: itemsToUse,
      companyGroupId: selectedCompanyGroupId,
    });

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

  const clientSelected =
    orderType === OrderTypeEnum.INCOMING
      ? Boolean(selectedCompanyId)
      : clientMode === 'company'
        ? Boolean(selectedCompanyId)
        : Boolean(selectedIndividualCustomerId);

  const canShowItems = useMemo(() => {
    if (orderType === OrderTypeEnum.INCOMING) {
      return Boolean(selectedCompanyGroupId && selectedCompanyId);
    }
    if (clientMode === 'individual') {
      return Boolean(selectedIndividualCustomerId);
    }
    return Boolean(selectedCompanyGroupId && selectedCompanyId);
  }, [
    orderType,
    clientMode,
    selectedCompanyGroupId,
    selectedCompanyId,
    selectedIndividualCustomerId,
  ]);

  const resolveIndividualCustomerIdFromInput = useCallback(
    (text: string): string | null => {
      const t = text.trim();
      if (!t) return null;
      const lower = t.toLowerCase();
      const match = individualCustomers.find((c) => c.name.trim().toLowerCase() === lower);
      return match?.id ?? null;
    },
    [individualCustomers]
  );

  const handleAddIndividualCustomerSuggestion = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    try {
      const result = await createIndividualCustomer(dispensarySlug!, { name: trimmed });
      const data = handleAction(result);
      if (data) {
        setIndividualCustomers((prev) =>
          [...prev, data].sort((a, b) =>
            a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
          )
        );
        setSelectedIndividualCustomerId(data.id);
        setIndividualCustomerInput(data.name);
        notifications.show({
          title: 'Succès',
          message: 'Particulier créé',
          color: 'moss',
        });
      }
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors de la création',
        color: 'danger',
      });
    }
  };

  const handleDeleteIndividualCustomerSuggestion = async (value: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const trimmed = value.trim();
    if (!trimmed) return;
    const match = individualCustomers.find(
      (c) => c.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    try {
      const result = await deleteIndividualCustomerByName(dispensarySlug!, { name: trimmed });
      handleAction(result);
      setIndividualCustomers((prev) =>
        prev.filter((c) => c.name.trim().toLowerCase() !== trimmed.toLowerCase())
      );
      if (match && selectedIndividualCustomerId === match.id) {
        setSelectedIndividualCustomerId(null);
        setIndividualCustomerInput('');
      }
      notifications.show({
        title: 'Succès',
        message: 'Particulier supprimé',
        color: 'moss',
      });
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors de la suppression',
        color: 'danger',
      });
    }
  };

  // Créer la commande
  const handleCreateOrder = async () => {
    if (orderItems.length === 0) {
      notifications.show({
        title: 'Erreur',
        message: 'Veuillez remplir tous les champs requis',
        color: 'danger',
      });
      return;
    }

    if (orderType === OrderTypeEnum.INCOMING) {
      if (!selectedCompanyGroupId || !selectedCompanyId) {
        notifications.show({
          title: 'Erreur',
          message: 'Veuillez remplir tous les champs requis',
          color: 'danger',
        });
        return;
      }
    } else if (orderType === OrderTypeEnum.OUTGOING) {
      if (clientMode === 'company') {
        if (!selectedCompanyGroupId || !selectedCompanyId) {
          notifications.show({
            title: 'Erreur',
            message: 'Veuillez remplir tous les champs requis',
            color: 'danger',
          });
          return;
        }
      } else if (!selectedIndividualCustomerId) {
        notifications.show({
          title: 'Erreur',
          message: 'Veuillez remplir tous les champs requis',
          color: 'danger',
        });
        return;
      }
    }

    try {
      setLoading(true);
      await createOrderMutation.mutateAsync({
        type: orderType,
        details: orderDetails || undefined,
        price: orderPrice !== '' ? Number(orderPrice) : undefined,
        ...(selectedCompanyGroupId ? { companyGroupId: selectedCompanyGroupId } : {}),
        ...(orderType === OrderTypeEnum.INCOMING || clientMode === 'company'
          ? { companyId: selectedCompanyId! }
          : { individualCustomerId: selectedIndividualCustomerId! }),
        items: orderItems.map((oi) => ({
          itemId: oi.itemId,
          quantity: oi.quantity,
        })),
      });

      onOrderCreated?.();
      onClose();
    } catch {
      // Notification handled by mutation hook
    } finally {
      setLoading(false);
    }
  };

  const availableItems = getAvailableItemsForGroup();
  const orderItemIds = getOrderItemIds();
  const canAddMoreItems = availableItems.some((item) => !orderItemIds.has(item.id));

  // Vérifier si des items de la commande en cours sont déjà dans une commande existante
  const conflictingOrders = useMemo(() => {
    if (orderItems.length === 0 || activeOrders.length === 0) {
      return [];
    }

    const currentItemIds = new Set(orderItems.map((oi) => oi.itemId));

    return activeOrders.filter((order) => {
      return order.items.some((orderItem) => currentItemIds.has(orderItem.itemId));
    });
  }, [orderItems, activeOrders]);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Créer une commande"
      size="xl"
    >
      <Stack gap="md">
        <Select
          label="Type de commande"
          placeholder="Sélectionner un type"
          data={orderTypeSelectOptions}
          value={orderType}
          onChange={(value) => setOrderType(value as OrderTypeEnum)}
          required
          disabled={loadingData}
        />

        {orderType === OrderTypeEnum.OUTGOING && (
          <SegmentedControl
            fullWidth
            value={clientMode}
            onChange={(v) => setClientMode(v as ClientMode)}
            data={[
              { label: 'Entreprise', value: 'company' },
              { label: 'Particulier', value: 'individual' },
            ]}
            disabled={loadingData}
          />
        )}

        {(orderType === OrderTypeEnum.INCOMING ||
          (orderType === OrderTypeEnum.OUTGOING && clientMode === 'company')) && (
          <Group grow>
            <Select
              label="Groupe d'entreprises"
              placeholder="Sélectionner un groupe d'entreprises"
              data={companyGroups.map((g) => ({ value: g.id, label: g.name }))}
              value={selectedCompanyGroupId}
              onChange={(value) => setSelectedCompanyGroupId(value)}
              required
              searchable
              disabled={loadingData || loadingCompanyGroups}
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
              disabled={loadingData || loadingCompanyGroups || !selectedCompanyGroupId}
            />
          </Group>
        )}

        {orderType === OrderTypeEnum.OUTGOING && clientMode === 'individual' && (
          <Stack gap="xs">
            <Text size="sm" fw={500}>
              Particulier
            </Text>
            <SuggestionAutocomplete
              value={individualCustomerInput}
              onChange={(v) => {
                setIndividualCustomerInput(v);
                setSelectedIndividualCustomerId(resolveIndividualCustomerIdFromInput(v));
              }}
              suggestions={individualCustomerNames}
              onAddSuggestion={handleAddIndividualCustomerSuggestion}
              onDeleteSuggestion={handleDeleteIndividualCustomerSuggestion}
              placeholder="Rechercher ou créer un particulier"
              size="sm"
            />
          </Stack>
        )}

        {canShowItems && (
          <>
            {conflictingOrders.length > 0 && (
              <Alert
                icon={<IconAlertTriangle size={16} />}
                title="Commande en cours"
                color="amber"
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
                        • {order.name} ({orderClientLabel(order)}) :{' '}
                        {conflictingItems.map((item) => item.item.name).join(', ')}
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

            <NumberInput
              label="Prix (optionnel)"
              placeholder="Prix de la commande"
              value={orderPrice}
              onChange={(value) => {
                setPriceManuallyEdited(true);
                setOrderPrice(value === '' ? '' : Number(value));
              }}
              min={0}
              decimalScale={2}
              fixedDecimalScale
              prefix="$ "
            />

            {totalWeight != null && (
              <Text size="sm" c="dimmed">
                Poids total :{' '}
                <Text span fw={500} c="inherit">
                  {totalWeight.toFixed(2)} kg
                </Text>
              </Text>
            )}

            <Text fw={500}>Objets de la commande</Text>

            {orderItems.length > 0 ? (
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Objet</Table.Th>
                    {prefillItemsNeedingRestock && items.length > 0 && items[0].stockToday !== null && (
                      <>
                        <Table.Th>Stock actuel</Table.Th>
                        <Table.Th>Quantité minimale</Table.Th>
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
                              <Badge color={stockToday < item.minimalQuantity ? 'red' : 'green'}>
                                {stockToday}
                              </Badge>
                            </Table.Td>
                            <Table.Td>{item.minimalQuantity}</Table.Td>
                            <Table.Td>
                              <Badge color={finalQuantity >= item.minimalQuantity ? 'green' : 'orange'}>
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
                            color="danger"
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

            {clientSelected && (
              <Select
                label="Ajouter un objet"
                placeholder={
                  availableItems.length === 0
                    ? "Aucun objet vendable disponible"
                    : "Sélectionner un objet à ajouter"
                }
                data={availableItems
                  .filter((item) => !orderItemIds.has(item.id))
                  .map((item) => ({ value: item.id, label: item.name }))}
                disabled={availableItems.length === 0 || !canAddMoreItems}
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
              orderItems.length === 0 ||
              (orderType === OrderTypeEnum.INCOMING &&
                (!selectedCompanyGroupId || !selectedCompanyId)) ||
              (orderType === OrderTypeEnum.OUTGOING &&
                (clientMode === 'company'
                  ? !selectedCompanyGroupId || !selectedCompanyId
                  : !selectedIndividualCustomerId))
            }
          >
            Créer la commande
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

