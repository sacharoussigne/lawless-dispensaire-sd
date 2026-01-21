'use client';

import { Paper, TextInput, Group, ActionIcon, Text } from '@mantine/core';
import { DataTable } from 'mantine-datatable';
import { IconEdit, IconTrash } from '@tabler/icons-react';
import Link from 'next/link';
import { routes } from '@/types/routes';
import type { LocationWithCompanies } from '@/types/locations';

interface LocationsTableProps {
  locations: LocationWithCompanies[];
  loading: boolean;
  nameFilter: string;
  descriptionFilter: string;
  page: number;
  pageSize: number;
  totalRecords: number;
  onNameFilterChange: (value: string) => void;
  onDescriptionFilterChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onEdit: (location: LocationWithCompanies) => void;
  onDelete: (location: LocationWithCompanies) => void;
}

export function LocationsTable({
  locations,
  loading,
  nameFilter,
  descriptionFilter,
  page,
  pageSize,
  totalRecords,
  onNameFilterChange,
  onDescriptionFilterChange,
  onPageChange,
  onEdit,
  onDelete,
}: LocationsTableProps) {
  return (
    <Paper shadow="sm" p="md" withBorder>
      <DataTable
        records={locations}
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
            render: (location: LocationWithCompanies) => location.description || '-',
            filter: (
              <TextInput
                placeholder="Rechercher une description..."
                value={descriptionFilter}
                onChange={(e) => onDescriptionFilterChange(e.currentTarget.value)}
                style={{ minWidth: 200 }}
              />
            ),
          },
          {
            accessor: 'companies.length',
            title: 'Nombre d\'entreprises',
            render: (location: LocationWithCompanies) =>
              location.companies.length > 0 ? (
                <Link
                  href={`${routes.admin.companies}?locationId=${location.id}`}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <Text
                    component="span"
                    style={{ cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    {location.companies.length}
                  </Text>
                </Link>
              ) : (
                location.companies.length
              ),
          },
          {
            accessor: 'actions',
            title: 'Actions',
            render: (location: LocationWithCompanies) => (
              <Group gap="xs" wrap="nowrap" justify="flex-end">
                <ActionIcon
                  variant="light"
                  color="blue"
                  onClick={() => onEdit(location)}
                >
                  <IconEdit size={16} />
                </ActionIcon>
                <ActionIcon
                  variant="light"
                  color="red"
                  onClick={() => onDelete(location)}
                >
                  <IconTrash size={16} />
                </ActionIcon>
              </Group>
            ),
          },
        ]}
        fetching={loading}
        noRecordsText={
          nameFilter || descriptionFilter
            ? 'Aucun lieu trouvé avec ces filtres'
            : 'Aucun lieu trouvé'
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
          `${from} - ${to} sur ${totalRecords} lieux`
        }
      />
    </Paper>
  );
}

