'use client';

import { DataTable } from 'mantine-datatable';
import { Paper, ActionIcon, Group, Badge } from '@mantine/core';
import { IconEdit, IconTrash } from '@tabler/icons-react';
import type { OrderLetterTemplateAssignment } from '@prisma/client';
import { getOrderTypeLabel } from '@/types/enum/orderType';
import { getOrderStatusLabel } from '@/types/enum/orderStatus';

interface OrderLetterTemplateAssignmentWithTemplate extends OrderLetterTemplateAssignment {
  letterTemplate: {
    id: string;
    name: string;
  };
}

interface OrderLetterTemplateAssignmentsTableProps {
  assignments: OrderLetterTemplateAssignmentWithTemplate[];
  loading: boolean;
  onEdit: (assignment: OrderLetterTemplateAssignmentWithTemplate) => void;
  onDelete: (assignment: OrderLetterTemplateAssignmentWithTemplate) => void;
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
            render: (assignment: OrderLetterTemplateAssignmentWithTemplate) => (
              <Badge color="blue" variant="light">
                {getOrderTypeLabel(assignment.orderType)}
              </Badge>
            ),
          },
          {
            accessor: 'orderStatus',
            title: 'Statut de commande',
            render: (assignment: OrderLetterTemplateAssignmentWithTemplate) => (
              <Badge color="grape" variant="light">
                {getOrderStatusLabel(assignment.orderStatus)}
              </Badge>
            ),
          },
          {
            accessor: 'letterTemplate.name',
            title: 'Template assigné',
          },
          {
            accessor: 'actions',
            title: 'Actions',
            render: (assignment: OrderLetterTemplateAssignmentWithTemplate) => (
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
