'use client';

import { Paper, TextInput, Select, Group, ActionIcon, Tooltip } from '@mantine/core';
import type { CSSProperties, ReactNode } from 'react';
import { OrderStatusBadge } from '@/app/_components/OrderBadges/OrderStatusBadge';
import { OrderTypeBadge } from '@/app/_components/OrderBadges/OrderTypeBadge';
import { DataTable } from 'mantine-datatable';
import { IconEdit, IconTrash, IconEye, IconMail } from '@tabler/icons-react';
import { orderStatusFilterOptions } from '@/lib/orders/orderSelectOptions';
import { getOrderClientDisplayName, type OrderSummary } from '@/types/orders';
import { OrderStatusEnum } from '@/types/enum/orderStatus';

interface OrdersTableProps {
  orders: OrderSummary[];
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
  onView: (order: OrderSummary) => void;
  onEdit: (order: OrderSummary) => void;
  onDelete: (order: OrderSummary) => void;
  onPreviewLetter?: (order: OrderSummary) => void;
  hasLetterTemplateForOrder?: (order: OrderSummary) => boolean;
}

const disabledActionStyle: CSSProperties = {
  opacity: 0.38,
  cursor: 'not-allowed',
};

function LockedActionIcon({
  label,
  activeLabel,
  locked,
  activeColor,
  onClick,
  children,
}: {
  label: string;
  activeLabel: string;
  locked: boolean;
  activeColor: string;
  onClick: () => void;
  children: ReactNode;
}) {
  const icon = (
    <ActionIcon
      variant={locked ? 'subtle' : 'light'}
      color={locked ? 'slate' : activeColor}
      onClick={locked ? undefined : onClick}
      disabled={locked}
      style={locked ? disabledActionStyle : undefined}
      aria-label={locked ? label : activeLabel}
    >
      {children}
    </ActionIcon>
  );

  if (!locked) {
    return (
      <Tooltip label={activeLabel} withArrow>
        {icon}
      </Tooltip>
    );
  }

  return (
    <Tooltip label={label} withArrow>
      <span style={{ display: 'inline-flex' }}>{icon}</span>
    </Tooltip>
  );
}

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
  onPreviewLetter,
  hasLetterTemplateForOrder,
}: OrdersTableProps) {
  return (
    <Paper shadow="sm" withBorder>
      <DataTable
        records={orders}
        fetching={loading}
        columns={[
          {
            accessor: 'status',
            title: 'Statut',
            render: (order: OrderSummary) => (
              <OrderStatusBadge status={order.status} />
            ),
            filter: (
              <Select
                placeholder="Tous les statuts"
                data={orderStatusFilterOptions}
                value={statusFilter || ''}
                onChange={(value) => onStatusFilterChange(value || null)}
                clearable
                style={{ minWidth: 200 }}
              />
            ),
          },
          {
            accessor: 'type',
            title: 'Type',
            render: (order: OrderSummary) => (
              <OrderTypeBadge type={order.type || 'INCOMING'} />
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
            accessor: 'client',
            title: 'Client',
            render: (order: OrderSummary) => getOrderClientDisplayName(order),
            sortable: false,
          },
          {
            accessor: 'price',
            title: 'Prix',
            render: (order: OrderSummary) =>
              order.price != null ? `${order.price.toFixed(2)} $` : '-',
            sortable: true,
          },
          {
            accessor: 'createdAt',
            title: 'Date de création',
            render: (order: OrderSummary) =>
              new Date(order.createdAt).toLocaleDateString('fr-FR', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              }),
            sortable: true,
          },
          {
            accessor: 'actions',
            title: 'Actions',
            textAlign: 'right',
            render: (order: OrderSummary) => {
              const isCompleted = order.status === OrderStatusEnum.COMPLETED;

              return (
                <Group gap="xs" justify="flex-end" wrap="nowrap">
                  {hasLetterTemplateForOrder?.(order) && onPreviewLetter && (
                    <Tooltip label="Aperçu du courrier" withArrow>
                      <ActionIcon
                        variant="light"
                        color="denim"
                        onClick={() => onPreviewLetter(order)}
                        aria-label="Aperçu du courrier"
                      >
                        <IconMail size={16} />
                      </ActionIcon>
                    </Tooltip>
                  )}
                  <Tooltip label="Voir les détails" withArrow>
                    <ActionIcon
                      variant="light"
                      color="slate"
                      onClick={() => onView(order)}
                      aria-label="Voir les détails"
                    >
                      <IconEye size={16} />
                    </ActionIcon>
                  </Tooltip>
                  {permissions?.orders.update && (
                    <LockedActionIcon
                      locked={isCompleted}
                      label="Commande terminée — modification impossible"
                      activeLabel="Modifier"
                      activeColor="slate"
                      onClick={() => onEdit(order)}
                    >
                      <IconEdit size={16} />
                    </LockedActionIcon>
                  )}
                  {permissions?.orders.delete && (
                    <LockedActionIcon
                      locked={isCompleted}
                      label="Commande terminée — suppression impossible"
                      activeLabel="Supprimer"
                      activeColor="danger"
                      onClick={() => onDelete(order)}
                    >
                      <IconTrash size={16} />
                    </LockedActionIcon>
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
        minHeight={200}
        noRecordsText="Aucune commande trouvée"
      />
    </Paper>
  );
}
