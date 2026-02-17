'use client';

import { Paper, TextInput, Group, ActionIcon } from '@mantine/core';
import { DataTable } from 'mantine-datatable';
import { IconEdit, IconTrash } from '@tabler/icons-react';
import type { ChestWithStockHistory } from '@/types/chests';

interface ChestsTableProps {
  items: ChestWithStockHistory[];
  loading: boolean;
  nameFilter: string;
  page: number;
  pageSize: number;
  totalRecords: number;
  onNameFilterChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onEdit: (chest: ChestWithStockHistory) => void;
  onDelete: (chest: ChestWithStockHistory) => void;
}

export function ChestsTable({
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
}: ChestsTableProps) {
  return (
    <Paper shadow="sm" p="md" withBorder>
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
            accessor: 'description',
            title: 'Description',
            render: (chest: ChestWithStockHistory) => (
              <span style={{ fontSize: '14px' }}>
                {chest.description || <span style={{ color: '#999' }}>Aucune description</span>}
              </span>
            ),
          },
          {
            accessor: 'stockHistory.length',
            title: "Nombre d'enregistrements de stock",
            render: (chest: ChestWithStockHistory) => chest.stockHistory.length,
          },
          {
            accessor: 'actions',
            title: 'Actions',
            render: (chest: ChestWithStockHistory) => (
              <Group gap="xs" wrap="nowrap" justify="flex-end">
                <ActionIcon
                  variant="light"
                  color="blue"
                  onClick={() => onEdit(chest)}
                >
                  <IconEdit size={16} />
                </ActionIcon>
                <ActionIcon
                  variant="light"
                  color="red"
                  onClick={() => onDelete(chest)}
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
            ? 'Aucun coffre trouvé avec ces filtres'
            : 'Aucun coffre trouvé'
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
          `${from} - ${to} sur ${totalRecords} coffres`
        }
      />
    </Paper>
  );
}
