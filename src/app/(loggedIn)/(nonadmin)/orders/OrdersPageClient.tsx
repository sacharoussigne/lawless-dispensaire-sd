'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Container,
  Title,
  Group,
  Button,
} from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { getOrders } from '@/app/_actions/orders';
import { handleAction } from '@/lib/action';
import { notifications } from '@mantine/notifications';
import { EditOrderModal } from './components/EditOrderModal';
import { DeleteOrderModal } from './components/DeleteOrderModal';
import { OrderDetailsModal } from './components/OrderDetailsModal';
import { OrderLetterPreviewModal } from './components/OrderLetterPreviewModal';
import { ActiveFilters } from '@/app/_components/ActiveFilters/ActiveFilters';
import { OrdersTable } from './components/OrdersTable';
import OrderModal from '@/app/(loggedIn)/(nonadmin)/stock/modals/OrderModal';
import { usePermissions } from '@/app/_contexts/PermissionsContext';
import type { OrderWithRelations } from '@/types/orders';
import { getOrderLetterTemplateAssignments } from '@/app/_actions/orderLetterTemplateAssignments';
import type { OrderMailTemplateAssignment } from '@prisma/client';

interface OrdersPageClientProps {
  initialOrders: OrderWithRelations[];
}

// Function to transform text into slug (like order names)
const toSlug = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export default function OrdersPageClient({
  initialOrders,
}: OrdersPageClientProps) {
  const { permissions } = usePermissions();
  const [orders, setOrders] = useState<OrderWithRelations[]>(initialOrders);
  const [assignments, setAssignments] = useState<OrderMailTemplateAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [modalOpened, setModalOpened] = useState(false);
  const [detailsModalOpened, setDetailsModalOpened] = useState(false);
  const [editingOrder, setEditingOrder] = useState<OrderWithRelations | null>(null);
  const [viewingOrder, setViewingOrder] = useState<OrderWithRelations | null>(null);
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<OrderWithRelations | null>(null);
  const [createModalOpened, setCreateModalOpened] = useState(false);
  const [letterPreviewModalOpened, setLetterPreviewModalOpened] = useState(false);
  const [orderForLetterPreview, setOrderForLetterPreview] = useState<OrderWithRelations | null>(null);

  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [nameFilter, setNameFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

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

  const loadAssignments = async () => {
    try {
      setAssignmentsLoading(true);
      const result = await getOrderLetterTemplateAssignments();
      const data = handleAction(result);
      if (data) {
        setAssignments(data);
      }
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors du chargement des assignations de modèles de courriers',
        color: 'red',
      });
    } finally {
      setAssignmentsLoading(false);
    }
  };

  const handleEdit = (order: OrderWithRelations) => {
    setEditingOrder(order);
    setModalOpened(true);
  };

  const handleViewDetails = (order: OrderWithRelations) => {
    setViewingOrder(order);
    setDetailsModalOpened(true);
  };

  const handlePreviewLetter = (order: OrderWithRelations) => {
    setOrderForLetterPreview(order);
    setLetterPreviewModalOpened(true);
  };

  // Pre-calculate (type, status) pairs that have a letter template
  const assignmentKeys = useMemo(() => {
    const keys = new Set<string>();
    assignments.forEach((assignment) => {
      keys.add(`${assignment.orderType}-${assignment.orderStatus}`);
    });
    return keys;
  }, [assignments]);

  const hasLetterTemplateForOrder = useCallback(
    (order: OrderWithRelations) => {
      const key = `${order.type || 'INCOMING'}-${order.status}`;
      return assignmentKeys.has(key);
    },
    [assignmentKeys]
  );

  const filteredOrders = orders.filter((order) => {
    const matchesStatus = !statusFilter || order.status === statusFilter;
    const orderNameSlug = toSlug(order.name);
    const filterSlug = toSlug(nameFilter);
    const matchesName = !nameFilter || orderNameSlug.includes(filterSlug);
    return matchesStatus && matchesName;
  });

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const totalRecords = sortedOrders.length;
  const paginatedOrders = sortedOrders.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  useEffect(() => {
    setPage(1);
  }, [statusFilter, nameFilter]);

  useEffect(() => {
    loadAssignments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" mb="xl">
        <Title order={1}>Commandes</Title>
        {permissions?.orders.create && (
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => setCreateModalOpened(true)}
          >
            Créer une commande
          </Button>
        )}
      </Group>

      <ActiveFilters
        filters={[
          {
            label: 'Nom',
            value: nameFilter,
            onRemove: () => setNameFilter(''),
          },
          {
            label: 'Statut',
            value: statusFilter,
            onRemove: () => setStatusFilter(null),
          },
        ]}
      />

      <OrdersTable
        orders={paginatedOrders}
        loading={loading}
        statusFilter={statusFilter}
        nameFilter={nameFilter}
        page={page}
        pageSize={pageSize}
        totalRecords={totalRecords}
        permissions={permissions}
        onStatusFilterChange={(value) => setStatusFilter(value)}
        onNameFilterChange={(value) => setNameFilter(value)}
        onPageChange={(p) => setPage(p)}
        onView={handleViewDetails}
        onEdit={handleEdit}
        onDelete={(order) => {
          setOrderToDelete(order);
          setDeleteModalOpened(true);
        }}
        onPreviewLetter={handlePreviewLetter}
        hasLetterTemplateForOrder={hasLetterTemplateForOrder}
      />

      <EditOrderModal
        opened={modalOpened}
        onClose={() => {
          setModalOpened(false);
          setEditingOrder(null);
        }}
        editingOrder={editingOrder}
        onSuccess={loadOrders}
      />

      <OrderDetailsModal
        opened={detailsModalOpened}
        onClose={() => {
          setDetailsModalOpened(false);
          setViewingOrder(null);
        }}
        viewingOrder={viewingOrder}
      />

      <DeleteOrderModal
        opened={deleteModalOpened}
        onClose={() => {
          setDeleteModalOpened(false);
          setOrderToDelete(null);
        }}
        orderToDelete={orderToDelete}
        onSuccess={loadOrders}
      />

      <OrderLetterPreviewModal
        opened={letterPreviewModalOpened}
        onClose={() => {
          setLetterPreviewModalOpened(false);
          setOrderForLetterPreview(null);
        }}
        order={orderForLetterPreview}
      />

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

