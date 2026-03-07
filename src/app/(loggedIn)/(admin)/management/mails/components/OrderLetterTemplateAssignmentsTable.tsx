'use client';

import { DataTable } from 'mantine-datatable';
import { Paper, ActionIcon, Group, Badge } from '@mantine/core';
import { IconEdit, IconTrash } from '@tabler/icons-react';
import type { OrderMailTemplateAssignment } from '@prisma/client';
import { getOrderTypeLabel } from '@/types/enum/orderType';
import { getOrderStatusLabel } from '@/types/enum/orderStatus';

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
    <Paper shadow="sm" p="md" withBorder>
      <DataTable
        records={assignments}
        columns={[
          {
            accessor: 'orderType',
            title: 'Type de commande',
            render: (assignment: OrderMailTemplateAssignmentWithTemplate) => (
              <Badge color="blue" variant="light">
                {getOrderTypeLabel(assignment.orderType)}
              </Badge>
            ),
          },
          {
            accessor: 'orderStatus',
            title: 'Statut de commande',
            render: (assignment: OrderMailTemplateAssignmentWithTemplate) => (
              <Badge color="grape" variant="light">
                {getOrderStatusLabel(assignment.orderStatus)}
              </Badge>
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
                  color="blue"
                  onClick={() => onEdit(assignment)}
                >
                  <IconEdit size={16} />
                </ActionIcon>
                <ActionIcon
                  variant="light"
                  color="red"
                  onClick={() => onDelete(assignment)}
                >
                  <IconTrash size={16} />
                </ActionIcon>
              </Group>
            ),
          },
        ]}
        fetching={loading}
        noRecordsText="Aucune assignation"
        minHeight={200}
      />
    </Paper>
  );
}
