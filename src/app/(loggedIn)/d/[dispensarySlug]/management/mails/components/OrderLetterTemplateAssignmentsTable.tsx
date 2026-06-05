'use client';

import { DataTable } from 'mantine-datatable';
import { Paper, ActionIcon, Group } from '@mantine/core';
import { IconEdit, IconTrash } from '@tabler/icons-react';
import type { OrderMailTemplateAssignment } from '@prisma/client';
import { OrderTypeBadge } from '@/app/_components/OrderBadges/OrderTypeBadge';
import { OrderStatusBadge } from '@/app/_components/OrderBadges/OrderStatusBadge';

interface OrderMailTemplateAssignmentWithTemplate extends OrderMailTemplateAssignment {
  mailTemplate: {
    id: string;
    name: string;
  };
}

interface OrderLetterTemplateAssignmentsTableProps {
  assignments: OrderMailTemplateAssignmentWithTemplate[];
  loading: boolean;
  onEdit: (assignment: OrderMailTemplateAssignmentWithTemplate) => void;
  onDelete: (assignment: OrderMailTemplateAssignmentWithTemplate) => void;
}

export function OrderLetterTemplateAssignmentsTable({
  assignments,
  loading,
  onEdit,
  onDelete,
}: OrderLetterTemplateAssignmentsTableProps) {
  return (
    <Paper shadow="sm" p="md" withBorder w="100%">
      <DataTable
        records={assignments}
        columns={[
          {
            accessor: 'orderType',
            title: 'Type de commande',
            render: (assignment: OrderMailTemplateAssignmentWithTemplate) => (
              <OrderTypeBadge type={assignment.orderType} />
            ),
          },
          {
            accessor: 'orderStatus',
            title: 'Statut de commande',
            render: (assignment: OrderMailTemplateAssignmentWithTemplate) => (
              <OrderStatusBadge status={assignment.orderStatus} />
            ),
          },
          {
            accessor: 'mailTemplate.name',
            title: 'Template assigné',
          },
          {
            accessor: 'actions',
            title: 'Actions',
            render: (assignment: OrderMailTemplateAssignmentWithTemplate) => (
              <Group gap="xs" wrap="nowrap" justify="flex-end">
                <ActionIcon
                  variant="light"
                  color="slate"
                  onClick={() => onEdit(assignment)}
                  title="Modifier"
                >
                  <IconEdit size={16} />
                </ActionIcon>
                <ActionIcon
                  variant="light"
                  color="danger"
                  onClick={() => onDelete(assignment)}
                  title="Supprimer"
                >
                  <IconTrash size={16} />
                </ActionIcon>
              </Group>
            ),
          },
        ]}
        fetching={loading}
        noRecordsText="Aucune assignation"
        striped
        highlightOnHover
        minHeight={200}
      />
    </Paper>
  );
}
