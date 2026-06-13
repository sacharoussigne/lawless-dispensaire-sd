'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  Container,
  Button,
  Paper,
  Stack,
  Text,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { IconPlus, IconPackage } from '@tabler/icons-react';
import { EditOrderModal } from './components/EditOrderModal';
import { DeleteOrderModal } from './components/DeleteOrderModal';
import { OrderDetailsModal } from './components/OrderDetailsModal';
import { OrderLetterPreviewModal } from './components/OrderLetterPreviewModal';
import { ActiveFilters } from '@/app/_components/ActiveFilters/ActiveFilters';
import { OrdersTable } from './components/OrdersTable';
import { PageHeader } from '@/app/_components/PageHeader/PageHeader';
import { usePermissions } from '@/app/_contexts/PermissionsContext';
import type { OrderSummary, OrdersPageResult } from '@/types/orders';
import type { OrderMailTemplateAssignment } from '@prisma/client';
import {
  defaultOrdersPageFilters,
  useOrderLetterAssignments,
  useOrdersPage,
} from './hooks/useOrdersQueries';
import type { OrdersPageFilters } from '@/lib/orders/queryKeys';

const CreateOrderModal = dynamic(() => import('./components/CreateOrderModal'), {
  ssr: false,
});

interface OrdersPageClientProps {
  initialOrdersPage: OrdersPageResult;
  initialAssignments: OrderMailTemplateAssignment[];
}

export default function OrdersPageClient({
  initialOrdersPage,
  initialAssignments,
}: OrdersPageClientProps) {
  const { permissions } = usePermissions();
  const [filters, setFilters] = useState<Omit<OrdersPageFilters, 'search'>>({
    page: defaultOrdersPageFilters.page,
    pageSize: defaultOrdersPageFilters.pageSize,
    status: defaultOrdersPageFilters.status,
  });
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch] = useDebouncedValue(searchInput, 300);

  const queryFilters = useMemo<OrdersPageFilters>(
    () => ({ ...filters, search: debouncedSearch }),
    [filters, debouncedSearch],
  );
  const [modalOpened, setModalOpened] = useState(false);
  const [detailsModalOpened, setDetailsModalOpened] = useState(false);
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [createModalOpened, setCreateModalOpened] = useState(false);
  const [letterPreviewModalOpened, setLetterPreviewModalOpened] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [viewingOrderId, setViewingOrderId] = useState<string | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<OrderSummary | null>(null);
  const [orderForLetterPreviewId, setOrderForLetterPreviewId] = useState<string | null>(
    null,
  );

  const { data: ordersPage, isFetching } = useOrdersPage(queryFilters, initialOrdersPage);
  const { data: assignments = initialAssignments } = useOrderLetterAssignments(
    initialAssignments,
  );

  const orders = ordersPage?.orders ?? [];
  const totalRecords = ordersPage?.totalCount ?? 0;
  const hasActiveFilters = Boolean(filters.status || searchInput.trim());
  const isSearchDebouncing = searchInput !== debouncedSearch;
  const showEmptyCatalog = totalRecords === 0 && !isFetching && !hasActiveFilters;
  const tableLoading = isFetching && !isSearchDebouncing;

  const assignmentKeys = useMemo(() => {
    const keys = new Set<string>();
    assignments.forEach((assignment) => {
      keys.add(`${assignment.orderType}-${assignment.orderStatus}`);
    });
    return keys;
  }, [assignments]);

  const hasLetterTemplateForOrder = useCallback(
    (order: OrderSummary) => {
      const key = `${order.type || 'INCOMING'}-${order.status}`;
      return assignmentKeys.has(key);
    },
    [assignmentKeys],
  );

  useEffect(() => {
    setFilters((current) => ({ ...current, page: 1 }));
  }, [filters.status, debouncedSearch]);

  const handleStatusFilterChange = (value: string | null) => {
    setFilters((current) => ({ ...current, status: value }));
  };

  const handleNameFilterChange = (value: string) => {
    setSearchInput(value);
  };

  const handlePageChange = (page: number) => {
    setFilters((current) => ({ ...current, page }));
  };

  return (
    <Container size="xl" py="xl">
      <PageHeader
        title="Commandes"
        actions={
          permissions?.orders.create ? (
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={() => setCreateModalOpened(true)}
            >
              Créer une commande
            </Button>
          ) : undefined
        }
      />

      {showEmptyCatalog ? (
        <Paper shadow="sm" withBorder>
          <Stack align="center" gap="xs" py="xl">
            <IconPackage size={48} stroke={1.5} style={{ color: 'var(--mantine-color-dimmed)' }} />
            <Text size="sm" c="dimmed" fw={500}>
              Aucune commande trouvée
            </Text>
          </Stack>
        </Paper>
      ) : (
        <>
          <ActiveFilters
            filters={[
              {
                label: 'Nom',
                value: searchInput,
                onRemove: () => setSearchInput(''),
              },
              {
                label: 'Statut',
                value: filters.status,
                onRemove: () => handleStatusFilterChange(null),
              },
            ]}
          />

          <OrdersTable
            orders={orders}
            loading={tableLoading}
            statusFilter={filters.status}
            nameFilter={searchInput}
            page={filters.page}
            pageSize={filters.pageSize}
            totalRecords={totalRecords}
            permissions={permissions}
            onStatusFilterChange={handleStatusFilterChange}
            onNameFilterChange={handleNameFilterChange}
            onPageChange={handlePageChange}
            onView={(order) => {
              setViewingOrderId(order.id);
              setDetailsModalOpened(true);
            }}
            onEdit={(order) => {
              setEditingOrderId(order.id);
              setModalOpened(true);
            }}
            onDelete={(order) => {
              setOrderToDelete(order);
              setDeleteModalOpened(true);
            }}
            onPreviewLetter={(order) => {
              setOrderForLetterPreviewId(order.id);
              setLetterPreviewModalOpened(true);
            }}
            hasLetterTemplateForOrder={hasLetterTemplateForOrder}
          />
        </>
      )}

      <EditOrderModal
        opened={modalOpened}
        onClose={() => {
          setModalOpened(false);
          setEditingOrderId(null);
        }}
        orderId={editingOrderId}
      />

      <OrderDetailsModal
        opened={detailsModalOpened}
        onClose={() => {
          setDetailsModalOpened(false);
          setViewingOrderId(null);
        }}
        orderId={viewingOrderId}
      />

      <DeleteOrderModal
        opened={deleteModalOpened}
        onClose={() => {
          setDeleteModalOpened(false);
          setOrderToDelete(null);
        }}
        orderToDelete={orderToDelete}
      />

      <OrderLetterPreviewModal
        opened={letterPreviewModalOpened}
        onClose={() => {
          setLetterPreviewModalOpened(false);
          setOrderForLetterPreviewId(null);
        }}
        orderId={orderForLetterPreviewId}
      />

      {createModalOpened && (
        <CreateOrderModal
          opened={createModalOpened}
          onClose={() => setCreateModalOpened(false)}
          prefillItemsNeedingRestock={false}
        />
      )}
    </Container>
  );
}
