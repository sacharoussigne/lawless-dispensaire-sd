'use client';

import { Paper, TextInput, Group, ActionIcon, Badge, Tooltip } from '@mantine/core';
import { DataTable } from 'mantine-datatable';
import { IconEdit, IconTrash, IconChecklist } from '@tabler/icons-react';
import type { ChestWithStockHistory } from '@/types/chests';

interface ChestsTableProps {
  items: ChestWithStockHistory[];
  loading: boolean;
  nameFilter: string;
  page: number;
  pageSize: number;
  totalRecords: number;
  totalChests: number;
  onNameFilterChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onEdit: (chest: ChestWithStockHistory) => void;
  onDelete: (chest: ChestWithStockHistory) => void;
  onConfigureStockChecks: (chest: ChestWithStockHistory) => void;
}

export function ChestsTable({
  items,
  loading,
  nameFilter,
  page,
  pageSize,
  totalRecords,
  totalChests,
  onNameFilterChange,
  onPageChange,
  onEdit,
  onDelete,
  onConfigureStockChecks,
}: ChestsTableProps) {
  const isLastChest = totalChests <= 1;
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
            accessor: 'isEnabled',
            title: 'État',
            render: (chest: ChestWithStockHistory) => (
              <Badge color={chest.isEnabled ? 'green' : 'red'} variant="light">
                {chest.isEnabled ? 'Activé' : 'Désactivé'}
              </Badge>
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
                <Tooltip label="Vérifications de stock">
                  <ActionIcon
                    variant="light"
                    color="grape"
                    onClick={() => onConfigureStockChecks(chest)}
                  >
                    <IconChecklist size={16} />
                  </ActionIcon>
                </Tooltip>
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
                  disabled={isLastChest}
                  title={isLastChest ? 'Impossible de supprimer le dernier coffre' : 'Supprimer'}
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
