'use client';

import { Paper, TextInput, Select, Group, ActionIcon, Badge } from '@mantine/core';
import { DataTable } from 'mantine-datatable';
import { IconEdit, IconTrash, IconEye } from '@tabler/icons-react';
import {
  getOrderStatusLabel,
  getOrderStatusColor,
  OrderStatusEnum,
} from '@/types/enum/orderStatus';
import type { OrderWithRelations } from '@/types/orders';

interface OrdersTableProps {
  orders: OrderWithRelations[];
  loading: boolean;
  statusFilter: string | null;
  nameFilter: string;
  page: number;
  pageSize: number;
  totalRecords: number;
  permissions: any;
  onStatusFilterChange: (value: string | null) => void;
  onNameFilterChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onView: (order: OrderWithRelations) => void;
  onEdit: (order: OrderWithRelations) => void;
  onDelete: (order: OrderWithRelations) => void;
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

const filterOptions = [
  { value: '', label: 'Tous les statuts' },
  ...statusOptions,
];

export function OrdersTable({
  orders,
  loading,
  statusFilter,
  nameFilter,
  page,
  pageSize,
  totalRecords,
  permissions,
  onStatusFilterChange,
  onNameFilterChange,
  onPageChange,
  onView,
  onEdit,
  onDelete,
}: OrdersTableProps) {
  return (
    <Paper shadow="sm" withBorder>
      <DataTable
        records={orders}
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
                onChange={(value) => onStatusFilterChange(value || null)}
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
                onChange={(e) => onNameFilterChange(e.currentTarget.value)}
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
            title: "Nombre d'objets",
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
                  {permissions?.orders.view && (
                    <ActionIcon
                      variant="light"
                      color="blue"
                      onClick={() => onView(order)}
                    >
                      <IconEye size={16} />
                    </ActionIcon>
                  )}
                  {permissions?.orders.update && (
                    <ActionIcon
                      variant="light"
                      color="gray"
                      onClick={() => onEdit(order)}
                      disabled={isCompleted}
                      title={
                        isCompleted
                          ? 'Les commandes terminées ne peuvent pas être modifiées'
                          : 'Modifier'
                      }
                    >
                      <IconEdit size={16} />
                    </ActionIcon>
                  )}
                  {permissions?.orders.delete && (
                    <ActionIcon
                      variant="light"
                      color="red"
                      onClick={() => onDelete(order)}
                      disabled={isCompleted}
                      title={
                        isCompleted
                          ? 'Les commandes terminées ne peuvent pas être supprimées'
                          : 'Supprimer'
                      }
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  )}
                </Group>
              );
            },
          },
        ]}
        totalRecords={totalRecords}
        recordsPerPage={pageSize}
        page={page}
        onPageChange={onPageChange}
        fetching={loading}
        noRecordsText="Aucune commande trouvée"
      />
    </Paper>
  );
}

