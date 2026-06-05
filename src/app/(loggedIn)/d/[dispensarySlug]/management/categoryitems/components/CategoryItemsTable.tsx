'use client';

import { Paper, TextInput, Group, ActionIcon } from '@mantine/core';
import { DataTable } from 'mantine-datatable';
import { IconEdit, IconTrash } from '@tabler/icons-react';
import type { CategoryItemWithItems } from '@/types/categoryItems';

interface CategoryItemsTableProps {
  items: CategoryItemWithItems[];
  loading: boolean;
  nameFilter: string;
  page: number;
  pageSize: number;
  totalRecords: number;
  onNameFilterChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onEdit: (categoryItem: CategoryItemWithItems) => void;
  onDelete: (categoryItem: CategoryItemWithItems) => void;
}

export function CategoryItemsTable({
  items,
  loading,
  nameFilter,
  page,
  pageSize,
  totalRecords,
  onNameFilterChange,
  onPageChange,
  onEdit,
  onDelete,
}: CategoryItemsTableProps) {
  return (
    <Paper shadow="sm" p="md" withBorder w="100%">
      <DataTable
        records={items}
        columns={[
          {
            accessor: 'name',
            title: 'Nom',
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
            accessor: 'color',
            title: 'Couleur',
            render: (categoryItem: CategoryItemWithItems) => (
              <Group gap="xs">
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 4,
                    backgroundColor: categoryItem.color,
                    border: '1px solid var(--disp-surface-border)',
                  }}
                />
                <span style={{ fontSize: '14px' }}>{categoryItem.color}</span>
              </Group>
            ),
          },
          {
            accessor: 'items.length',
            title: "Nombre d'objets",
            render: (categoryItem: CategoryItemWithItems) => categoryItem.items.length,
          },
          {
            accessor: 'actions',
            title: 'Actions',
            render: (categoryItem: CategoryItemWithItems) => (
              <Group gap="xs" wrap="nowrap" justify="flex-end">
                <ActionIcon
                  variant="light"
                  color="slate"
                  onClick={() => onEdit(categoryItem)}
                  title="Modifier"
                >
                  <IconEdit size={16} />
                </ActionIcon>
                <ActionIcon
                  variant="light"
                  color="danger"
                  onClick={() => onDelete(categoryItem)}
                  title="Supprimer"
                >
                  <IconTrash size={16} />
                </ActionIcon>
              </Group>
            ),
          },
        ]}
        fetching={loading}
        noRecordsText={
          nameFilter
            ? 'Aucune catégorie d\'objet trouvée avec ces filtres'
            : 'Aucune catégorie d\'objet trouvée'
        }
        striped
        highlightOnHover
        minHeight={200}
        totalRecords={totalRecords}
        recordsPerPage={pageSize}
        page={page}
        onPageChange={onPageChange}
        paginationSize="sm"
        paginationText={({ from, to, totalRecords }) =>
          `${from} - ${to} sur ${totalRecords} catégories d'objets`
        }
      />
    </Paper>
  );
}

