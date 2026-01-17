'use client';

import { useEffect, useState } from 'react';
import {
  Container,
  Title,
  Paper,
  TextInput,
  Textarea,
  Button,
  ActionIcon,
  Group,
  Modal,
  Stack,
  Select,
  Badge,
  Text,
  Table,
  Divider,
  Checkbox,
} from '@mantine/core';
import { DataTable } from 'mantine-datatable';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconEdit, IconTrash, IconEye, IconPlus } from '@tabler/icons-react';
import { getOrders, updateOrder, deleteOrder } from '@/app/_actions/orders';
import { handleAction } from '@/lib/action';
import { handleApiZodError } from '@/lib/services/zod';
import { ParsedZodError } from '@/lib/errors/ParsedZodError';
import { getOrderStatusLabel, getOrderStatusColor, OrderStatusEnum } from '@/types/enum/orderStatus';
import OrderModal from '@/app/(loggedIn)/(nonadmin)/stock/modals/OrderModal';
import { checkOrderItemsStockToday } from '@/app/_actions/stock';
import type { Order } from '@prisma/client';
import { defaultStatements, adminAc, userAc } from "better-auth/plugins/admin/access";


console.log(defaultStatements);
console.log(adminAc);
console.log(userAc);

interface OrderItem {
  id: string;
  itemId: string;
  quantity: number;
  item: {
    id: string;
    name: string;
  };
}

interface OrderWithRelations extends Order {
  company: {
    id: string;
    name: string;
  };
  items: OrderItem[];
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpened, setModalOpened] = useState(false);
  const [detailsModalOpened, setDetailsModalOpened] = useState(false);
  const [editingOrder, setEditingOrder] = useState<OrderWithRelations | null>(null);
  const [viewingOrder, setViewingOrder] = useState<OrderWithRelations | null>(null);
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<OrderWithRelations | null>(null);
  const [createModalOpened, setCreateModalOpened] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [nameFilter, setNameFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
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
      details: '',
    },
    validate: {
      name: (value) => (value.length < 1 ? 'Le nom est requis' : null),
    },
  });

  // Fonction pour transformer un texte en slug (comme les noms de commande)
  const toSlug = (text: string): string => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
      .replace(/[^a-z0-9]+/g, '-') // Remplacer tout ce qui n'est pas alphanumérique par un tiret
      .replace(/^-+|-+$/g, ''); // Supprimer les tirets en début et fin
  };

  const loadOrders = async () => {
    try {
      setLoading(true);
      const result = await getOrders();
      const data = handleAction(result);
      if (data) {
        setOrders(data);
      }
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors du chargement des commandes',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleSubmit = async (values: typeof form.values) => {
    if (!editingOrder) return;

    try {
      const result = await updateOrder({
        id: editingOrder.id,
        name: values.name,
        status: values.status,
        details: values.details || undefined,
        addToStock: values.status === OrderStatusEnum.COMPLETED ? addToStock : undefined,
      });

      handleAction(result);
      
      let message = 'Commande modifiée avec succès';
      if (values.status === OrderStatusEnum.COMPLETED && addToStock) {
        message += '. Les items ont été ajoutés au stock.';
      } else if (values.status === OrderStatusEnum.COMPLETED && !addToStock && stockCheckResult?.allHaveStockToday) {
        message += '. Les items n\'ont pas été ajoutés au stock.';
      }
      
      notifications.show({
        title: 'Succès',
        message,
        color: 'green',
      });
      setModalOpened(false);
      form.reset();
      setEditingOrder(null);
      setAddToStock(false);
      setStockCheckResult(null);
      loadOrders();
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

  const handleEdit = (order: OrderWithRelations) => {
    setEditingOrder(order);
    form.setValues({
      name: order.name,
      status: order.status as OrderStatusEnum,
      details: order.details || '',
    });
    setAddToStock(false);
    setStockCheckResult(null);
    setModalOpened(true);
  };

  // Vérifier le stock quand le statut change vers COMPLETED
  const handleStatusChange = async (status: OrderStatusEnum) => {
    form.setFieldValue('status', status);
    
    if (status === OrderStatusEnum.COMPLETED && editingOrder) {
      setCheckingStock(true);
      try {
        const result = await checkOrderItemsStockToday(editingOrder.id);
        const data = handleAction(result);
        if (data) {
          setStockCheckResult(data);
          // Si tous les items ont un stock, proposer d'ajouter automatiquement
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

  const handleViewDetails = (order: OrderWithRelations) => {
    setViewingOrder(order);
    setDetailsModalOpened(true);
  };

  const handleDelete = async () => {
    if (!orderToDelete) return;

    try {
      const result = await deleteOrder({ id: orderToDelete.id });
      handleAction(result);
      notifications.show({
        title: 'Succès',
        message: 'Commande supprimée avec succès',
        color: 'green',
      });
      setDeleteModalOpened(false);
      setOrderToDelete(null);
      loadOrders();
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors de la suppression',
        color: 'red',
      });
    }
  };

  // Filtrer les commandes par statut et nom
  const filteredOrders = orders.filter((order) => {
    const matchesStatus = !statusFilter || order.status === statusFilter;
    // Transformer le nom de la commande et le filtre en slug pour la comparaison
    const orderNameSlug = toSlug(order.name);
    const filterSlug = toSlug(nameFilter);
    const matchesName = !nameFilter || orderNameSlug.includes(filterSlug);
    return matchesStatus && matchesName;
  });

  // Trier par date de création (plus récent en premier)
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Calculer la pagination
  const totalRecords = sortedOrders.length;
  const paginatedOrders = sortedOrders.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  // Réinitialiser la page quand les filtres changent
  useEffect(() => {
    setPage(1);
  }, [statusFilter, nameFilter]);

  const statusOptions: { value: string; label: string }[] = [
    { value: OrderStatusEnum.DRAFT, label: getOrderStatusLabel(OrderStatusEnum.DRAFT) },
    { value: OrderStatusEnum.LETTER_SENT, label: getOrderStatusLabel(OrderStatusEnum.LETTER_SENT) },
    { value: OrderStatusEnum.PROCESSING, label: getOrderStatusLabel(OrderStatusEnum.PROCESSING) },
    { value: OrderStatusEnum.READY, label: getOrderStatusLabel(OrderStatusEnum.READY) },
    { value: OrderStatusEnum.COMPLETED, label: getOrderStatusLabel(OrderStatusEnum.COMPLETED) },
    { value: OrderStatusEnum.CANCELLED, label: getOrderStatusLabel(OrderStatusEnum.CANCELLED) },
  ];

  const filterOptions = [
    { value: '', label: 'Tous les statuts' },
    ...statusOptions,
  ];

  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" mb="xl">
        <Title order={1}>Commandes</Title>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() => setCreateModalOpened(true)}
        >
          Créer une commande
        </Button>
      </Group>

      {/* Tableau des commandes */}
      <Paper shadow="sm" withBorder>
        <DataTable
          records={paginatedOrders}
          columns={[
            {
              accessor: 'status',
              title: 'Statut',
              render: (order: OrderWithRelations) => (
                <Badge color={getOrderStatusColor(order.status)}>
                  {getOrderStatusLabel(order.status)}
                </Badge>
              ),
              filter: (
                <Select
                  placeholder="Tous les statuts"
                  data={filterOptions}
                  value={statusFilter || ''}
                  onChange={(value) => setStatusFilter(value || null)}
                  clearable
                  style={{ minWidth: 200 }}
                />
              ),
            },
            {
              accessor: 'name',
              title: 'Nom',
              sortable: true,
              filter: (
                <TextInput
                  placeholder="Rechercher un nom..."
                  value={nameFilter}
                  onChange={(e) => setNameFilter(e.currentTarget.value)}
                  style={{ minWidth: 200 }}
                />
              ),
            },
            {
              accessor: 'company.name',
              title: 'Entreprise',
              sortable: true,
            },
            {
              accessor: 'items',
              title: "Nombre d'items",
              render: (order: OrderWithRelations) => order.items.length,
            },
            {
              accessor: 'createdAt',
              title: 'Date de création',
              render: (order: OrderWithRelations) =>
                new Date(order.createdAt).toLocaleDateString('fr-FR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                }),
              sortable: true,
            },
            {
              accessor: 'actions',
              title: 'Actions',
              render: (order: OrderWithRelations) => {
                const isCompleted = order.status === OrderStatusEnum.COMPLETED;
                return (
                  <Group gap="xs" wrap="nowrap" justify="flex-end">
                    <ActionIcon
                      variant="light"
                      color="blue"
                      onClick={() => handleViewDetails(order)}
                    >
                      <IconEye size={16} />
                    </ActionIcon>
                    <ActionIcon
                      variant="light"
                      color="gray"
                      onClick={() => handleEdit(order)}
                      disabled={isCompleted}
                      title={isCompleted ? 'Les commandes terminées ne peuvent pas être modifiées' : 'Modifier'}
                    >
                      <IconEdit size={16} />
                    </ActionIcon>
                    <ActionIcon
                      variant="light"
                      color="red"
                      onClick={() => {
                        setOrderToDelete(order);
                        setDeleteModalOpened(true);
                      }}
                      disabled={isCompleted}
                      title={isCompleted ? 'Les commandes terminées ne peuvent pas être supprimées' : 'Supprimer'}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                );
              },
            },
          ]}
          totalRecords={totalRecords}
          recordsPerPage={pageSize}
          page={page}
          onPageChange={setPage}
          fetching={loading}
          noRecordsText="Aucune commande trouvée"
        />
      </Paper>

      {/* Modal d'édition */}
      <Modal
        opened={modalOpened}
        onClose={() => {
          setModalOpened(false);
          form.reset();
          setEditingOrder(null);
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
              disabled={editingOrder?.status === OrderStatusEnum.COMPLETED}
            />
            <Select
              label="Statut"
              data={statusOptions}
              required
              value={form.values.status}
              onChange={(value) => handleStatusChange(value as OrderStatusEnum)}
              disabled={editingOrder?.status === OrderStatusEnum.COMPLETED}
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
                        ⚠️ Le stock d'aujourd'hui n'est pas fait pour certains items. Les items ne peuvent pas être ajoutés automatiquement au stock.
                      </Text>
                    ) : (
                      <Checkbox
                        label="Ajouter automatiquement les items au stock d'aujourd'hui"
                        checked={addToStock}
                        onChange={(event) => setAddToStock(event.currentTarget.checked)}
                      />
                    )}
                    {stockCheckResult.items.some((item) => !item.hasStockToday) && (
                      <Text size="xs" c="dimmed" mt="xs">
                        Items sans stock d'aujourd'hui :{' '}
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
              disabled={editingOrder?.status === OrderStatusEnum.COMPLETED}
            />
            <Group justify="flex-end" mt="md">
              <Button
                variant="subtle"
                onClick={() => {
                  setModalOpened(false);
                  form.reset();
                  setEditingOrder(null);
                }}
              >
                Annuler
              </Button>
              <Button 
                type="submit"
                disabled={editingOrder?.status === OrderStatusEnum.COMPLETED}
              >
                Enregistrer
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Modal de détails */}
      <Modal
        opened={detailsModalOpened}
        onClose={() => {
          setDetailsModalOpened(false);
          setViewingOrder(null);
        }}
        title="Détails de la commande"
        size="lg"
      >
        {viewingOrder && (
          <Stack gap="md">
            <Group>
              <Text fw={500}>Nom :</Text>
              <Text>{viewingOrder.name}</Text>
            </Group>
            <Group>
              <Text fw={500}>Entreprise :</Text>
              <Text>{viewingOrder.company.name}</Text>
            </Group>
            <Group>
              <Text fw={500}>Statut :</Text>
              <Badge color={getOrderStatusColor(viewingOrder.status)}>
                {getOrderStatusLabel(viewingOrder.status)}
              </Badge>
            </Group>
            {viewingOrder.details && (
              <Group>
                <Text fw={500}>Détails :</Text>
                <Text>{viewingOrder.details}</Text>
              </Group>
            )}
            <Group>
              <Text fw={500}>Date de création :</Text>
              <Text>
                {new Date(viewingOrder.createdAt).toLocaleDateString('fr-FR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </Group>
            <Divider />
            <Text fw={500}>Items :</Text>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Item</Table.Th>
                  <Table.Th>Quantité</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {viewingOrder.items.map((orderItem) => (
                  <Table.Tr key={orderItem.id}>
                    <Table.Td>{orderItem.item.name}</Table.Td>
                    <Table.Td>{orderItem.quantity}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Stack>
        )}
      </Modal>

      {/* Modal de suppression */}
      <Modal
        opened={deleteModalOpened}
        onClose={() => {
          setDeleteModalOpened(false);
          setOrderToDelete(null);
        }}
        title="Supprimer la commande"
      >
        <Stack gap="md">
          <Text>
            Êtes-vous sûr de vouloir supprimer la commande{' '}
            <strong>{orderToDelete?.name}</strong> ?
          </Text>
          <Group justify="flex-end" mt="md">
            <Button
              variant="subtle"
              onClick={() => {
                setDeleteModalOpened(false);
                setOrderToDelete(null);
              }}
            >
              Annuler
            </Button>
            <Button color="red" onClick={handleDelete}>
              Supprimer
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Modal de création */}
      <OrderModal
        opened={createModalOpened}
        onClose={() => setCreateModalOpened(false)}
        prefillItemsNeedingRestock={false}
        onOrderCreated={async () => {
          await loadOrders();
        }}
      />
    </Container>
  );
}

