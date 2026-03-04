'use client';

import { Paper, TextInput, Group, ActionIcon } from '@mantine/core';
import { DataTable } from 'mantine-datatable';
import { IconEdit, IconTrash } from '@tabler/icons-react';
import type { CompanyWithRelations } from '@/types/companies';

interface CompaniesTableProps {
  companies: CompanyWithRelations[];
  loading: boolean;
  nameFilter: string;
  page: number;
  pageSize: number;
  totalRecords: number;
  onNameFilterChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onEdit: (company: CompanyWithRelations) => void;
  onDelete: (company: CompanyWithRelations) => void;
}

export function CompaniesTable({
  companies,
  loading,
  nameFilter,
  page,
  pageSize,
  totalRecords,
  onNameFilterChange,
  onPageChange,
  onEdit,
  onDelete,
}: CompaniesTableProps) {

  return (
    <Paper shadow="sm" p="md" withBorder>
      <DataTable
        records={companies}
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
            accessor: 'actions',
            title: 'Actions',
            render: (company: CompanyWithRelations) => (
              <Group gap="xs" wrap="nowrap" justify="flex-end">
                <ActionIcon
                  variant="light"
                  color="blue"
                  onClick={() => onEdit(company)}
                >
                  <IconEdit size={16} />
                </ActionIcon>
                <ActionIcon
                  variant="light"
                  color="red"
                  onClick={() => onDelete(company)}
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
            ? 'Aucune entreprise trouvée avec ces filtres'
            : 'Aucune entreprise trouvée'
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
          `${from} - ${to} sur ${totalRecords} entreprises`
        }
      />
    </Paper>
  );
}

